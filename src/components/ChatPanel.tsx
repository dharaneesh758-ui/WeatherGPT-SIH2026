import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Square,
  Sparkles,
} from 'lucide-react';

import type {
  WeatherData,
  Language,
  ChatMessage,
} from '@/types';

import { getQuickPrompts } from '@/lib/conversation';
import { t } from '@/lib/i18n';

import {
  useSpeech,
  type VoiceLanguage,
} from '@/hooks/useSpeech';

interface Props {
  weather: WeatherData;
  lang: Language;
}

/* =========================================================
   HELPERS
========================================================= */

function generateId(): string {
  return (
    Math.random().toString(36).substring(2) +
    Date.now().toString(36)
  );
}

/* =========================================================
   LANGUAGE NORMALIZATION
========================================================= */

function normalizeLanguage(language?: string): Language {
  const value = (language || 'en').toLowerCase().trim();

  if (value === 'ta' || value.includes('tamil')) {
    return 'ta';
  }

  if (value === 'hi' || value.includes('hindi')) {
    return 'hi';
  }

  return 'en';
}

function normalizeVoiceLanguage(language?: string): VoiceLanguage {
  const value = (language || 'en').toLowerCase().trim();

  if (value === 'ta' || value.includes('tamil')) {
    return 'ta';
  }

  if (value === 'hi' || value.includes('hindi')) {
    return 'hi';
  }

  if (value.includes('tanglish')) {
    return 'tanglish';
  }

  if (value.includes('mixed')) {
    return 'mixed';
  }

  return 'en';
}

/* =========================================================
   TEXT LANGUAGE DETECTION
========================================================= */

const TANGLISH_WORDS = [
  'da',
  'dei',
  'bro',
  'machi',
  'enna',
  'epdi',
  'iruku',
  'irukku',
  'venum',
  'pannu',
  'sollu',
  'inga',
  'anga',
  'mazhai',
  'veyil',
  'kaathu',
  'nalla',
  'romba',
  'eppo',
  'varuma',
  'poguma',
  'seri',
  'sari',
  'apdi',
  'ipdi',
];

function detectTextLanguage(text: string): VoiceLanguage {
  if (!text?.trim()) {
    return 'en';
  }

  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta';
  }

  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi';
  }

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (TANGLISH_WORDS.some((word) => words.includes(word))) {
    return 'tanglish';
  }

  return 'en';
}

/* =========================================================
   BROWSER VOICE SELECTION
========================================================= */

function getBestBrowserVoice(
  language: VoiceLanguage
): SpeechSynthesisVoice | null {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window)
  ) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();

  if (!voices.length) {
    return null;
  }

  const languageCodes =
    language === 'ta'
      ? ['ta-IN', 'ta-LK', 'ta-SG']
      : language === 'hi'
      ? ['hi-IN']
      : ['en-IN', 'en-US', 'en-GB'];

  for (const code of languageCodes) {
    const exact = voices.find(
      (voice) => voice.lang.toLowerCase() === code.toLowerCase()
    );

    if (exact) {
      return exact;
    }
  }

  for (const code of languageCodes) {
    const prefix = code.split('-')[0].toLowerCase();

    const partial = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(prefix)
    );

    if (partial) {
      return partial;
    }
  }

  return voices[0] || null;
}

/* =========================================================
   BROWSER SPEECH FALLBACK
========================================================= */

function browserSpeak(text: string, language: VoiceLanguage) {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window)
  ) {
    return;
  }

  if (!text?.trim()) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang =
    language === 'ta'
      ? 'ta-IN'
      : language === 'hi'
      ? 'hi-IN'
      : 'en-IN';

  const voice = getBestBrowserVoice(language);

  if (voice) {
    utterance.voice = voice;
  }

  utterance.rate =
    language === 'ta' ? 0.9 : language === 'hi' ? 0.92 : 0.95;

  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

/* =========================================================
   BLOB → BASE64
========================================================= */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(',')[1];

        if (!base64) {
          reject(new Error('Unable to convert audio to base64.'));
          return;
        }

        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read audio file.'));
    };

    reader.readAsDataURL(blob);
  });
}

/* =========================================================
   CHAT PANEL
========================================================= */

export function ChatPanel({ weather, lang }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* Timers */
  const speakingTimerRef = useRef<number | null>(null);
  const speakDelayTimerRef = useRef<number | null>(null);

  /* Refs that break the circular dependency with useSpeech */
  const handleVoiceAudioRef = useRef<
    ((blob: Blob) => Promise<void>) | null
  >(null);

  const speakRef = useRef<
    ((text: string, language: VoiceLanguage) => unknown) | null
  >(null);

  const stopSpeakingRef = useRef<(() => unknown) | null>(null);

  const langRef = useRef<Language>(lang);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  /* =======================================================
     SPEECH HOOK
     (declared BEFORE anything that uses speak/stopSpeaking)
  ======================================================= */

  const {
    listening,
    supported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useSpeech({
    onAudio: (blob: Blob) => {
      void handleVoiceAudioRef.current?.(blob);
    },

    onError: (message: string) => {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: message,
        timestamp: Date.now(),
        language: langRef.current,
      };

      setMessages((prev) => [...prev, errorMsg]);
    },
  });

  /* Always point refs to the latest hook functions */
  speakRef.current = speak as typeof speakRef.current;
  stopSpeakingRef.current = stopSpeaking as typeof stopSpeakingRef.current;

  /* =======================================================
     STABLE SPEECH HELPERS
  ======================================================= */

  const clearSpeakingTimer = useCallback(() => {
    if (speakingTimerRef.current !== null) {
      window.clearTimeout(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }

    if (speakDelayTimerRef.current !== null) {
      window.clearTimeout(speakDelayTimerRef.current);
      speakDelayTimerRef.current = null;
    }
  }, []);

  const stopAllSpeech = useCallback(() => {
    try {
      stopSpeakingRef.current?.();
    } catch {
      // Ignore errors from the speech hook.
    }

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const safeSpeak = useCallback(
    (text: string, language: VoiceLanguage) => {
      try {
        if (!speakRef.current) {
          throw new Error('Speech hook not ready.');
        }

        speakRef.current(text, language);
      } catch (error) {
        console.warn(
          'Speech hook failed. Using browser TTS.',
          error
        );

        browserSpeak(text, language);
      }
    },
    []
  );

  const scheduleSpeakingReset = useCallback((textLength: number) => {
    if (speakingTimerRef.current !== null) {
      window.clearTimeout(speakingTimerRef.current);
    }

    speakingTimerRef.current = window.setTimeout(() => {
      setSpeakingId(null);
      speakingTimerRef.current = null;
    }, Math.max(3500, textLength * 60));
  }, []);

  /* =======================================================
     VOICE AUDIO HANDLER
  ======================================================= */

  const handleVoiceAudio = useCallback(
    async (audioBlob: Blob) => {
      setVoiceProcessing(true);
      setThinking(true);

      try {
        console.log(
          '🎤 Audio received:',
          audioBlob.type,
          audioBlob.size
        );

        if (audioBlob.size === 0) {
          throw new Error('The recorded audio is empty.');
        }

        const base64Audio = await blobToBase64(audioBlob);

        /* Temporary user message */
        const voiceMessageId = generateId();

        const voiceUserMessage: ChatMessage = {
          id: voiceMessageId,
          role: 'user',
          content: '🎤 Voice message',
          timestamp: Date.now(),
          language: lang,
        };

        setMessages((prev) => [...prev, voiceUserMessage]);

        /* Send audio to backend */
        const response = await fetch('/api/chat-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: base64Audio,
            mimeType: audioBlob.type || 'audio/webm',
            weather,
            languageHint: lang,
          }),
        });

        if (!response.ok) {
          let serverMessage = '';

          try {
            const errorData = await response.json();

            serverMessage =
              errorData?.details || errorData?.error || '';
          } catch {
            // Ignore JSON parsing errors.
          }

          throw new Error(
            serverMessage ||
              `Voice server error: ${response.status}`
          );
        }

        const data = await response.json();

        console.log('🎤 Voice API response:', data);

        /* Transcript */
        const transcript =
          data.transcript?.trim() || 'Voice question';

        /* Detect language */
        let detectedLanguage: string =
          data.language || detectTextLanguage(transcript);

        let voiceLanguage: VoiceLanguage =
          normalizeVoiceLanguage(detectedLanguage);

        const transcriptLanguage = detectTextLanguage(transcript);

        if (transcriptLanguage !== 'en') {
          detectedLanguage = transcriptLanguage;
          voiceLanguage = transcriptLanguage;
        }

        /* AI answer */
        const answer =
          data.response?.trim() ||
          'Sorry, I could not generate a response.';

        const answerLanguage = detectTextLanguage(answer);

        if (answerLanguage === 'ta' || answerLanguage === 'hi') {
          voiceLanguage = answerLanguage;
        }

        const uiLanguage = normalizeLanguage(detectedLanguage);

        console.log('🌐 Detected language:', detectedLanguage);
        console.log('📝 Transcript:', transcript);
        console.log('🤖 AI answer:', answer);
        console.log('🔊 Speech language:', voiceLanguage);

        /* Update user message with the real transcript */
        setMessages((prev) =>
          prev.map((message) =>
            message.id === voiceMessageId
              ? {
                  ...message,
                  content: transcript,
                  language: uiLanguage,
                }
              : message
          )
        );

        /* Add AI message */
        const aiMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: answer,
          timestamp: Date.now(),
          language: uiLanguage,
        };

        setMessages((prev) => [...prev, aiMsg]);

        /* Speak AI answer */
        clearSpeakingTimer();
        stopAllSpeech();
        setSpeakingId(aiMsg.id);

        /* Small delay helps Chrome speech synthesis after API responses. */
        speakDelayTimerRef.current = window.setTimeout(() => {
          speakDelayTimerRef.current = null;
          safeSpeak(answer, voiceLanguage);
        }, 200);

        scheduleSpeakingReset(answer.length);
      } catch (error) {
        console.error('❌ Voice chat error:', error);

        const errorMessage =
          error instanceof Error ? error.message : '';

        const errorMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: errorMessage
            ? `Sorry, I could not process your voice message. ${errorMessage}`
            : 'Sorry, I could not understand or process the voice message. Please try again.',
          timestamp: Date.now(),
          language: lang,
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setVoiceProcessing(false);
        setThinking(false);
      }
    },
    [
      weather,
      lang,
      clearSpeakingTimer,
      stopAllSpeech,
      safeSpeak,
      scheduleSpeakingReset,
    ]
  );

  /* Keep the ref pointing to the latest handler */
  useEffect(() => {
    handleVoiceAudioRef.current = handleVoiceAudio;
  }, [handleVoiceAudio]);

  /* =======================================================
     GREETING (resets only when the language changes)
  ======================================================= */

  useEffect(() => {
    clearSpeakingTimer();
    stopAllSpeech();

    setSpeakingId(null);

    setMessages([
      {
        id: generateId(),
        role: 'assistant',
        content: t('chatGreeting', lang),
        timestamp: Date.now(),
        language: lang,
      },
    ]);

    setInput('');
  }, [lang, clearSpeakingTimer, stopAllSpeech]);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  /* =======================================================
     CLEANUP ON UNMOUNT
  ======================================================= */

  useEffect(() => {
    return () => {
      clearSpeakingTimer();
      stopAllSpeech();
    };
  }, [clearSpeakingTimer, stopAllSpeech]);

  /* =======================================================
     NORMAL TEXT CHAT
  ======================================================= */

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();

    if (!msg || thinking || voiceProcessing || listening) {
      return;
    }

    const userLanguage = detectTextLanguage(msg);

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: msg,
      timestamp: Date.now(),
      language:
        userLanguage === 'ta'
          ? 'ta'
          : userLanguage === 'hi'
          ? 'hi'
          : lang,
    };

    setMessages((prev) => [...prev, userMsg]);

    setInput('');
    setThinking(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: msg,
          weather,
          language:
            userLanguage === 'tanglish'
              ? 'tanglish'
              : userLanguage === 'ta'
              ? 'ta'
              : userLanguage === 'hi'
              ? 'hi'
              : lang,
        }),
      });

      if (!response.ok) {
        let serverMessage = '';

        try {
          const errorData = await response.json();

          serverMessage =
            errorData?.details || errorData?.error || '';
        } catch {
          // Ignore JSON parse errors.
        }

        throw new Error(
          serverMessage || `Server error: ${response.status}`
        );
      }

      const data = await response.json();

      const detectedLanguage: string =
        data.language || userLanguage;

      const answer =
        data.response ||
        'Sorry, I could not generate a response.';

      const aiMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        language: normalizeLanguage(detectedLanguage),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('❌ Chat API error:', error);

      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content:
          'Sorry, I could not connect to WeatherGPT AI right now. Please try again.',
        timestamp: Date.now(),
        language: lang,
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setThinking(false);
    }
  };

  /* =======================================================
     MICROPHONE
  ======================================================= */

  const handleMic = async () => {
    if (thinking || voiceProcessing) {
      return;
    }

    if (listening) {
      stopListening();
      return;
    }

    try {
      await startListening();
    } catch (error) {
      console.error('❌ Microphone error:', error);
    }
  };

  /* =======================================================
     MANUAL SPEAK
  ======================================================= */

  const handleSpeak = (msg: ChatMessage) => {
    /* Toggle off if this message is already speaking */
    if (speakingId === msg.id) {
      stopAllSpeech();
      clearSpeakingTimer();
      setSpeakingId(null);
      return;
    }

    stopAllSpeech();
    clearSpeakingTimer();

    let voiceLanguage: VoiceLanguage;

    if (msg.language === 'ta') {
      voiceLanguage = 'ta';
    } else if (msg.language === 'hi') {
      voiceLanguage = 'hi';
    } else {
      voiceLanguage = detectTextLanguage(msg.content);
    }

    console.log('🔊 Manual speech:', voiceLanguage);

    safeSpeak(msg.content, voiceLanguage);

    setSpeakingId(msg.id);
    scheduleSpeakingReset(msg.content.length);
  };

  /* =======================================================
     QUICK PROMPTS
  ======================================================= */

  const quickPrompts = getQuickPrompts(lang);

  /* =======================================================
     KEYBOARD
  ======================================================= */

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="flex flex-col h-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 shadow-2xl overflow-hidden">
      {/* HEADER */}

      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/5">
        <div className="relative">
          <Sparkles size={18} className="text-cyan-400" />

          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>

        <span className="text-white font-semibold text-sm">
          WeatherGPT AI
        </span>

        <span className="text-white/40 text-xs ml-auto truncate max-w-[45%]">
          {weather.location.name}
        </span>
      </div>

      {/* MESSAGES */}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin min-h-[200px]"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-500/30 border border-cyan-400/30 text-white rounded-br-md'
                  : 'bg-white/10 border border-white/15 text-white/90 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-line">{msg.content}</p>

              {/* SPEAK BUTTON */}

              {msg.role === 'assistant' && (
                <button
                  type="button"
                  onClick={() => handleSpeak(msg)}
                  className="mt-1.5 flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                >
                  {speakingId === msg.id ? (
                    <>
                      <Square size={11} />
                      {t('stop', lang)}
                    </>
                  ) : (
                    <>
                      <Volume2 size={11} />
                      {t('listen', lang)}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* THINKING */}

        {thinking && (
          <div className="flex justify-start">
            <div className="bg-white/10 border border-white/15 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span
                  className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />

                <span
                  className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />

                <span
                  className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>

              {voiceProcessing && (
                <div className="text-[10px] text-white/40 mt-2">
                  Understanding your voice...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUICK PROMPTS */}

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => void handleSend(prompt)}
              disabled={thinking}
              className="text-xs bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white rounded-full px-3 py-1.5 transition-colors disabled:opacity-30"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* INPUT */}

      <div className="p-3 border-t border-white/10 bg-white/5">
        <div className="flex items-end gap-2">
          {/* MICROPHONE */}

          {supported && (
            <button
              type="button"
              onClick={() => void handleMic()}
              disabled={thinking || voiceProcessing}
              className={`flex-shrink-0 p-2.5 rounded-xl transition-all ${
                listening
                  ? 'bg-red-500/30 border border-red-400/40 text-red-300 animate-pulse'
                  : 'bg-white/10 border border-white/15 text-white/60 hover:text-white hover:bg-white/15'
              } disabled:opacity-40`}
              title={listening ? 'Stop recording' : 'Speak to WeatherGPT'}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}

          {/* TEXT INPUT */}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              listening ? 'Listening...' : 'Ask WeatherGPT anything...'
            }
            rows={1}
            disabled={listening || voiceProcessing}
            className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none max-h-24 scrollbar-thin disabled:opacity-50"
            style={{ minHeight: '42px' }}
          />

          {/* SEND */}

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={
              !input.trim() ||
              thinking ||
              listening ||
              voiceProcessing
            }
            className="flex-shrink-0 p-2.5 rounded-xl bg-cyan-500/30 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/40 hover:text-cyan-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Send message"
          >
            <Send size={18} />
          </button>
        </div>

        {/* LISTENING STATUS */}

        {listening && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-red-300">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            Listening... Tap the microphone to stop
          </div>
        )}

        {/* VOICE PROCESSING */}

        {voiceProcessing && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-cyan-300">
            <Sparkles size={12} className="animate-pulse" />
            WeatherGPT is processing your voice...
          </div>
        )}
      </div>
    </div>
  );
}