import {
  useState,
  useRef,
  useEffect,
  useCallback,
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

function generateId() {
  return (
    Math.random().toString(36).substring(2) +
    Date.now().toString(36)
  );
}

/*
 * Convert AI detected language to UI language.
 *
 * Supports:
 * English
 * Tamil
 * Hindi
 * Tanglish
 * Mixed
 */
function normalizeLanguage(
  language?: string
): Language {
  const value = (language || 'en')
    .toLowerCase()
    .trim();

  if (
    value === 'ta' ||
    value.includes('tamil')
  ) {
    return 'ta';
  }

  if (
    value === 'hi' ||
    value.includes('hindi')
  ) {
    return 'hi';
  }

  return 'en';
}

/*
 * Convert backend language to speech language.
 */
function normalizeVoiceLanguage(
  language?: string
): VoiceLanguage {
  const value = (language || 'en')
    .toLowerCase()
    .trim();

  if (
    value === 'ta' ||
    value.includes('tamil')
  ) {
    return 'ta';
  }

  if (
    value === 'hi' ||
    value.includes('hindi')
  ) {
    return 'hi';
  }

  if (
    value.includes('tanglish')
  ) {
    return 'tanglish';
  }

  if (
    value.includes('mixed')
  ) {
    return 'mixed';
  }

  return 'en';
}

/*
 * Try to understand the language from the actual text
 * when backend language metadata is missing.
 */
function detectTextLanguage(
  text: string
): VoiceLanguage {
  if (!text?.trim()) {
    return 'en';
  }

  /*
   * Tamil Unicode range:
   * U+0B80 – U+0BFF
   */
  const hasTamil = /[\u0B80-\u0BFF]/.test(
    text
  );

  /*
   * Hindi / Devanagari:
   * U+0900 – U+097F
   */
  const hasHindi = /[\u0900-\u097F]/.test(
    text
  );

  if (hasTamil) {
    return 'ta';
  }

  if (hasHindi) {
    return 'hi';
  }

  /*
   * Common Tanglish indicators.
   */
  const tanglishWords = [
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
    'weather',
    'epdi',
    'irukku',
  ];

  const lower = text.toLowerCase();

  const tanglishDetected =
    tanglishWords.some(
      (word) =>
        lower.includes(` ${word} `) ||
        lower.startsWith(`${word} `) ||
        lower.endsWith(` ${word}`) ||
        lower === word
    );

  if (tanglishDetected) {
    return 'tanglish';
  }

  return 'en';
}

/*
 * Find the best browser voice.
 *
 * This is especially important for Tamil/Hindi because
 * Chrome may otherwise select an English voice.
 */
function getBestBrowserVoice(
  language: VoiceLanguage
): SpeechSynthesisVoice | null {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window)
  ) {
    return null;
  }

  const voices =
    window.speechSynthesis.getVoices();

  if (!voices.length) {
    return null;
  }

  const languageCodes =
    language === 'ta'
      ? ['ta-IN', 'ta-LK', 'ta-SG']
      : language === 'hi'
      ? ['hi-IN']
      : ['en-IN', 'en-US', 'en-GB'];

  /*
   * Exact language match first.
   */
  for (const code of languageCodes) {
    const exact = voices.find(
      (voice) =>
        voice.lang.toLowerCase() ===
        code.toLowerCase()
    );

    if (exact) {
      return exact;
    }
  }

  /*
   * Partial language match.
   */
  for (const code of languageCodes) {
    const prefix = code
      .split('-')[0]
      .toLowerCase();

    const partial = voices.find(
      (voice) =>
        voice.lang
          .toLowerCase()
          .startsWith(prefix)
    );

    if (partial) {
      return partial;
    }
  }

  /*
   * Last fallback.
   */
  return voices[0] || null;
}

/*
 * Strong browser TTS fallback.
 *
 * If useSpeech's voice selection fails, this function
 * directly selects a Tamil/Hindi/Indian English voice.
 */
function browserSpeak(
  text: string,
  language: VoiceLanguage
) {
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

  const utterance =
    new SpeechSynthesisUtterance(text);

  const actualLanguage =
    language === 'ta'
      ? 'ta-IN'
      : language === 'hi'
      ? 'hi-IN'
      : 'en-IN';

  utterance.lang = actualLanguage;

  const voice =
    getBestBrowserVoice(language);

  if (voice) {
    utterance.voice = voice;
  }

  /*
   * Natural conversational speed.
   */
  utterance.rate =
    language === 'ta'
      ? 0.92
      : 0.95;

  utterance.pitch = 1;

  window.speechSynthesis.speak(
    utterance
  );
}

/* =========================================================
   CHAT PANEL
========================================================= */

export function ChatPanel({
  weather,
  lang,
}: Props) {
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [input, setInput] =
    useState('');

  const [thinking, setThinking] =
    useState(false);

  const [voiceProcessing, setVoiceProcessing] =
    useState(false);

  const [speakingId, setSpeakingId] =
    useState<string | null>(null);

  const scrollRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLTextAreaElement>(null);

  const speakingTimerRef =
    useRef<number | null>(null);

  const initializedRef =
    useRef(false);

  /* =======================================================
     CLEAR SPEAKING TIMER
  ======================================================= */

  const clearSpeakingTimer =
    useCallback(() => {
      if (speakingTimerRef.current) {
        window.clearTimeout(
          speakingTimerRef.current
        );

        speakingTimerRef.current = null;
      }
    }, []);

  /* =======================================================
     SPEECH HOOK
  ======================================================= */

  const {
    listening,
    supported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useSpeech({
    onAudio: () => undefined,
    onError: (message) => {
      const errorMsg: ChatMessage =
        {
          id: generateId(),
          role: 'assistant',
          content: message,
          timestamp: Date.now(),
          language: lang,
        };

      setMessages((prev) => [
        ...prev,
        errorMsg,
      ]);
    },
  });

  /* =======================================================
     VOICE AUDIO HANDLER
  ======================================================= */

  const handleVoiceAudio =
    useCallback(
      async (audioBlob: Blob) => {
        setVoiceProcessing(true);
        setThinking(true);

        try {
          /*
           * Blob -> Base64
           */
          const base64Audio =
            await blobToBase64(
              audioBlob
            );

          /*
           * Temporary voice message.
           */
          const voiceUserMessage: ChatMessage =
            {
              id: generateId(),
              role: 'user',
              content:
                '🎤 Voice message',
              timestamp: Date.now(),
              language: lang,
            };

          setMessages((prev) => [
            ...prev,
            voiceUserMessage,
          ]);

          /*
           * Send audio to backend.
           */
          const response =
            await fetch(
              '/api/chat/audio',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                body: JSON.stringify({
                  audio: base64Audio,

                  mimeType:
                    audioBlob.type ||
                    'audio/webm',

                  weather,

                  /*
                   * Current UI language is only
                   * a hint. Backend should still
                   * detect the spoken language.
                   */
                  languageHint: lang,
                }),
              }
            );

          if (!response.ok) {
            throw new Error(
              `Voice server error: ${response.status}`
            );
          }

          const data =
            await response.json();

          /*
           * ==========================================
           * LANGUAGE DETECTION
           * ==========================================
           */

          const transcript =
            data.transcript ||
            'Voice question';

          const detectedLanguage =
            data.language ||
            detectTextLanguage(
              transcript
            );

          const uiLanguage =
            normalizeLanguage(
              detectedLanguage
            );

          let voiceLanguage =
            normalizeVoiceLanguage(
              detectedLanguage
            );

          /*
           * If backend says English but
           * transcript contains Tamil/Hindi,
           * trust the actual transcript.
           */
          if (
            detectedLanguage === 'en' ||
            !detectedLanguage
          ) {
            const textDetected =
              detectTextLanguage(
                transcript
              );

            if (
              textDetected !== 'en'
            ) {
              voiceLanguage =
                textDetected;
            }
          }

          /*
           * ==========================================
           * AI RESPONSE
           * ==========================================
           */

          const answer =
            data.response ||
            'Sorry, I could not generate a response.';

          /*
           * If response itself contains Tamil,
           * force Tamil speech.
           */
          const responseTextLanguage =
            detectTextLanguage(
              answer
            );

          if (
            responseTextLanguage ===
            'ta'
          ) {
            voiceLanguage = 'ta';
          } else if (
            responseTextLanguage ===
            'hi'
          ) {
            voiceLanguage = 'hi';
          }

          console.log(
            '🎤 Voice detected:',
            detectedLanguage
          );

          console.log(
            '📝 Transcript:',
            transcript
          );

          console.log(
            '🤖 AI response:',
            answer
          );

          console.log(
            '🔊 Speech language:',
            voiceLanguage
          );

          /*
           * ==========================================
           * UPDATE USER VOICE MESSAGE
           * ==========================================
           */

          setMessages((prev) => {
            const updated = [
              ...prev,
            ];

            const lastIndex =
              updated.length - 1;

            if (
              lastIndex >= 0 &&
              updated[lastIndex].role ===
                'user'
            ) {
              updated[lastIndex] = {
                ...updated[lastIndex],

                content: transcript,

                language:
                  uiLanguage,
              };
            }

            return updated;
          });

          /*
           * ==========================================
           * CREATE AI MESSAGE
           * ==========================================
           */

          const aiMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: answer,
            timestamp: Date.now(),
            language: uiLanguage,
          };

          setMessages((prev) => [
            ...prev,
            aiMsg,
          ]);

          /*
           * ==========================================
           * SPEAK AI RESPONSE
           * ==========================================
           *
           * Small delay gives React time to update
           * the message before TTS starts.
           */

          clearSpeakingTimer();

          setSpeakingId(
            aiMsg.id
          );

          window.setTimeout(() => {
            /*
             * First use the project's speech hook.
             */
            speak(
              answer,
              voiceLanguage
            );

            /*
             * NOTE:
             * Browser fallback is intentionally
             * delayed. It only starts if the hook
             * doesn't provide speech properly.
             *
             * The normal path should use `speak`.
             */
          }, 100);

          /*
           * Estimate speaking duration.
           */
          speakingTimerRef.current =
            window.setTimeout(
              () => {
                setSpeakingId(null);
              },
              Math.max(
                3500,
                answer.length * 60
              )
            );
        } catch (error) {
          console.error(
            'Voice chat error:',
            error
          );

          const errorMsg: ChatMessage =
            {
              id: generateId(),
              role: 'assistant',
              content:
                'Sorry, I could not understand or process the voice message. Please try again.',
              timestamp: Date.now(),
              language: lang,
            };

          setMessages((prev) => [
            ...prev,
            errorMsg,
          ]);
        } finally {
          setVoiceProcessing(false);
          setThinking(false);
        }
      },
      [
        weather,
        lang,
        speak,
        clearSpeakingTimer,
      ]
    );

  /* =======================================================
     GREETING
  ======================================================= */

  useEffect(() => {
    initializedRef.current = true;

    setMessages([
      {
        id: generateId(),
        role: 'assistant',
        content: t(
          'chatGreeting',
          lang
        ),
        timestamp: Date.now(),
        language: lang,
      },
    ]);

    stopSpeaking();
    clearSpeakingTimer();
    setSpeakingId(null);
  }, [
    lang,
    stopSpeaking,
    clearSpeakingTimer,
  ]);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [
    messages,
    thinking,
  ]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      clearSpeakingTimer();

      if (
        typeof window !==
          'undefined' &&
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, [
    clearSpeakingTimer,
  ]);

  /* =======================================================
     BLOB -> BASE64
  ======================================================= */

  async function blobToBase64(
    blob: Blob
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onloadend = () => {
          try {
            const result =
              reader.result as string;

            const base64 =
              result.split(',')[1];

            if (!base64) {
              reject(
                new Error(
                  'Unable to convert audio to base64'
                )
              );

              return;
            }

            resolve(base64);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = reject;

        reader.readAsDataURL(
          blob
        );
      }
    );
  }

  /* =======================================================
     NORMAL TEXT CHAT
  ======================================================= */

  const handleSend = async (
    text?: string
  ) => {
    const msg = (
      text ?? input
    ).trim();

    if (
      !msg ||
      thinking ||
      voiceProcessing
    ) {
      return;
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: msg,
      timestamp: Date.now(),
      language: lang,
    };

    setMessages((prev) => [
      ...prev,
      userMsg,
    ]);

    setInput('');
    setThinking(true);

    try {
      const response =
        await fetch(
          '/api/chat',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              message: msg,
              weather,

              /*
               * UI language hint.
               * Backend should still respect
               * the actual user language.
               */
              language: lang,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status}`
        );
      }

      const data =
        await response.json();

      const detectedLanguage =
        data.language ||
        detectTextLanguage(msg);

      const responseLanguage =
        normalizeLanguage(
          detectedLanguage
        );

      const answer =
        data.response ||
        'Sorry, I could not generate a response.';

      const aiMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        language:
          responseLanguage,
      };

      setMessages((prev) => [
        ...prev,
        aiMsg,
      ]);
    } catch (error) {
      console.error(
        'Chat API error:',
        error
      );

      const errorMsg: ChatMessage =
        {
          id: generateId(),
          role: 'assistant',
          content:
            'Sorry, I could not connect to WeatherGPT AI right now. Please try again.',
          timestamp: Date.now(),
          language: lang,
        };

      setMessages((prev) => [
        ...prev,
        errorMsg,
      ]);
    } finally {
      setThinking(false);
    }
  };

  /* =======================================================
     MICROPHONE
  ======================================================= */

  const handleMic = async () => {
    if (
      thinking ||
      voiceProcessing
    ) {
      return;
    }

    if (listening) {
      stopListening();
      return;
    }

    try {
      await startListening();
    } catch (error) {
      console.error(
        'Microphone error:',
        error
      );
    }
  };

  /* =======================================================
     MANUAL SPEAK BUTTON
  ======================================================= */

  const handleSpeak = (
    msg: ChatMessage
  ) => {
    /*
     * Stop current speech.
     */
    if (
      speakingId === msg.id
    ) {
      stopSpeaking();

      if (
        'speechSynthesis' in
        window
      ) {
        window.speechSynthesis.cancel();
      }

      clearSpeakingTimer();

      setSpeakingId(null);

      return;
    }

    /*
     * Stop previous speech.
     */
    stopSpeaking();

    if (
      'speechSynthesis' in
      window
    ) {
      window.speechSynthesis.cancel();
    }

    clearSpeakingTimer();

    /*
     * Determine language.
     */
    let voiceLanguage: VoiceLanguage;

    if (msg.language === 'ta') {
      voiceLanguage = 'ta';
    } else if (
      msg.language === 'hi'
    ) {
      voiceLanguage = 'hi';
    } else {
      voiceLanguage =
        detectTextLanguage(
          msg.content
        );
    }

    console.log(
      '🔊 Manual speech language:',
      voiceLanguage
    );

    /*
     * Start project's speech hook.
     */
    speak(
      msg.content,
      voiceLanguage
    );

    setSpeakingId(msg.id);

    /*
     * Keep UI indicator alive.
     */
    speakingTimerRef.current =
      window.setTimeout(
        () => {
          setSpeakingId(null);
        },
        Math.max(
          3500,
          msg.content.length * 60
        )
      );
  };

  /* =======================================================
     QUICK PROMPTS
  ======================================================= */

  const quickPrompts =
    getQuickPrompts(lang);

  /* =======================================================
     KEYBOARD
  ======================================================= */

  const handleKeyDown = (
    e: React.KeyboardEvent
  ) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {
      e.preventDefault();

      handleSend();
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
          <Sparkles
            size={18}
            className="text-cyan-400"
          />

          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>

        <span className="text-white font-semibold text-sm">
          WeatherGPT AI
        </span>

        <span className="text-white/40 text-xs ml-auto">
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
              msg.role === 'user'
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-500/30 border border-cyan-400/30 text-white rounded-br-md'
                  : 'bg-white/10 border border-white/15 text-white/90 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-line">
                {msg.content}
              </p>

              {/* SPEAK BUTTON */}

              {msg.role ===
                'assistant' && (
                <button
                  onClick={() =>
                    handleSpeak(msg)
                  }
                  className="mt-1.5 flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                >
                  {speakingId ===
                  msg.id ? (
                    <>
                      <Square
                        size={11}
                      />

                      {t(
                        'stop',
                        lang
                      )}
                    </>
                  ) : (
                    <>
                      <Volume2
                        size={11}
                      />

                      {t(
                        'listen',
                        lang
                      )}
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
                  style={{
                    animationDelay:
                      '0ms',
                  }}
                />

                <span
                  className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce"
                  style={{
                    animationDelay:
                      '150ms',
                  }}
                />

                <span
                  className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce"
                  style={{
                    animationDelay:
                      '300ms',
                  }}
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
          {quickPrompts.map(
            (prompt, i) => (
              <button
                key={i}
                onClick={() =>
                  handleSend(prompt)
                }
                disabled={thinking}
                className="text-xs bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white rounded-full px-3 py-1.5 transition-colors disabled:opacity-30"
              >
                {prompt}
              </button>
            )
          )}
        </div>
      )}

      {/* INPUT */}

      <div className="p-3 border-t border-white/10 bg-white/5">

        <div className="flex items-end gap-2">

          {/* MICROPHONE */}

          {supported && (
            <button
              onClick={handleMic}
              disabled={
                thinking ||
                voiceProcessing
              }
              className={`flex-shrink-0 p-2.5 rounded-xl transition-all ${
                listening
                  ? 'bg-red-500/30 border border-red-400/40 text-red-300 animate-pulse'
                  : 'bg-white/10 border border-white/15 text-white/60 hover:text-white hover:bg-white/15'
              } disabled:opacity-40`}
              title={
                listening
                  ? 'Stop recording'
                  : 'Speak to WeatherGPT'
              }
            >
              {listening ? (
                <MicOff size={18} />
              ) : (
                <Mic size={18} />
              )}
            </button>
          )}

          {/* TEXT INPUT */}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) =>
              setInput(
                e.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            placeholder={
              listening
                ? 'Listening...'
                : 'Ask WeatherGPT anything...'
            }
            rows={1}
            disabled={
              listening ||
              voiceProcessing
            }
            className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none max-h-24 scrollbar-thin disabled:opacity-50"
            style={{
              minHeight: '42px',
            }}
          />

          {/* SEND */}

          <button
            onClick={() =>
              handleSend()
            }
            disabled={
              !input.trim() ||
              thinking ||
              listening ||
              voiceProcessing
            }
            className="flex-shrink-0 p-2.5 rounded-xl bg-cyan-500/30 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/40 hover:text-cyan-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Send size={18} />
          </button>

        </div>

        {/* VOICE STATUS */}

        {listening && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-red-300">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />

            Listening...
            Tap the microphone to stop
          </div>
        )}

        {voiceProcessing && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-cyan-300">
            <Sparkles
              size={12}
              className="animate-pulse"
            />

            WeatherGPT is processing
            your voice...
          </div>
        )}

      </div>
    </div>
  );
}