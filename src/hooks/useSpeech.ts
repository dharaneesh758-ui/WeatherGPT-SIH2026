import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';

export type VoiceLanguage =
  | 'en'
  | 'ta'
  | 'hi'
  | 'tanglish'
  | 'mixed';

interface UseSpeechOptions {
  onAudio?: (audio: Blob) => void;
  onError?: (message: string) => void;
}

/* =========================================================
   LANGUAGE CONFIGURATION
========================================================= */

const LANGUAGE_CONFIG: Record<
  VoiceLanguage,
  {
    preferred: string[];
    fallback: string[];
    rate: number;
    pitch: number;
  }
> = {
  en: {
    preferred: [
      'en-IN',
      'en-US',
      'en-GB',
    ],
    fallback: ['en'],
    rate: 0.95,
    pitch: 1,
  },

  ta: {
    preferred: [
      'ta-IN',
      'ta-LK',
      'ta-SG',
    ],
    fallback: ['ta'],
    rate: 0.88,
    pitch: 1,
  },

  hi: {
    preferred: [
      'hi-IN',
      'hi',
    ],
    fallback: ['hi'],
    rate: 0.92,
    pitch: 1,
  },

  tanglish: {
    preferred: [
      'en-IN',
      'en-US',
    ],
    fallback: ['en'],
    rate: 0.92,
    pitch: 1,
  },

  mixed: {
    preferred: [
      'en-IN',
      'ta-IN',
    ],
    fallback: [
      'en',
      'ta',
    ],
    rate: 0.92,
    pitch: 1,
  },
};

/* =========================================================
   FIND BEST VOICE
========================================================= */

function findBestVoice(
  voices: SpeechSynthesisVoice[],
  language: VoiceLanguage
): SpeechSynthesisVoice | null {
  if (!voices.length) {
    return null;
  }

  const config =
    LANGUAGE_CONFIG[language];

  /* -------------------------------------------------------
     1. Exact match
  ------------------------------------------------------- */

  for (const preferred of config.preferred) {
    const exact =
      voices.find(
        (voice) =>
          voice.lang.toLowerCase() ===
          preferred.toLowerCase()
      );

    if (exact) {
      return exact;
    }
  }

  /* -------------------------------------------------------
     2. Prefix match
  ------------------------------------------------------- */

  for (const preferred of config.preferred) {
    const prefix =
      preferred
        .split('-')[0]
        .toLowerCase();

    const partial =
      voices.find(
        (voice) =>
          voice.lang
            .toLowerCase()
            .startsWith(prefix)
      );

    if (partial) {
      return partial;
    }
  }

  /* -------------------------------------------------------
     3. Fallback
  ------------------------------------------------------- */

  for (const fallback of config.fallback) {
    const prefix =
      fallback
        .split('-')[0]
        .toLowerCase();

    const fallbackVoice =
      voices.find(
        (voice) =>
          voice.lang
            .toLowerCase()
            .startsWith(prefix)
      );

    if (fallbackVoice) {
      return fallbackVoice;
    }
  }

  return null;
}

/* =========================================================
   HOOK
========================================================= */

export function useSpeech(
  options: UseSpeechOptions = {}
) {
  const [listening, setListening] =
    useState(false);

  const [supported, setSupported] =
    useState(false);

  const [voices, setVoices] =
    useState<
      SpeechSynthesisVoice[]
    >([]);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(
      null
    );

  const mediaStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const audioChunksRef =
    useRef<Blob[]>([]);

  const maxDurationRef =
    useRef<number | null>(null);

  const onAudioRef =
    useRef(options.onAudio);

  const onErrorRef =
    useRef(options.onError);

  /* =======================================================
     CALLBACK REFERENCES
  ======================================================= */

  useEffect(() => {
    onAudioRef.current =
      options.onAudio;

    onErrorRef.current =
      options.onError;
  }, [
    options.onAudio,
    options.onError,
  ]);

  /* =======================================================
     CHECK MICROPHONE SUPPORT
  ======================================================= */

  useEffect(() => {
    const isSupported =
      typeof navigator !==
        'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator
        .mediaDevices
        .getUserMedia ===
        'function' &&
      typeof MediaRecorder !==
        'undefined';

    setSupported(
      isSupported
    );

    return () => {
      if (
        maxDurationRef.current !==
        null
      ) {
        window.clearTimeout(
          maxDurationRef.current
        );

        maxDurationRef.current =
          null;
      }

      try {
        if (
          mediaRecorderRef.current
            ?.state === 'recording'
        ) {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // Safe cleanup.
      }

      mediaStreamRef.current
        ?.getTracks()
        .forEach((track) => {
          track.stop();
        });

      mediaStreamRef.current =
        null;

      mediaRecorderRef.current =
        null;
    };
  }, []);

  /* =======================================================
     LOAD BROWSER VOICES
  ======================================================= */

  useEffect(() => {
    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }

    if (
      !(
        'speechSynthesis' in
        window
      )
    ) {
      return;
    }

    const loadVoices = () => {
      const available =
        window.speechSynthesis
          .getVoices();

      setVoices(available);

      console.log(
        '🔊 Browser voices:',
        available.map(
          (voice) =>
            `${voice.name} (${voice.lang})`
        )
      );
    };

    loadVoices();

    window.speechSynthesis.addEventListener(
      'voiceschanged',
      loadVoices
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        loadVoices
      );
    };
  }, []);

  /* =======================================================
     START LISTENING
  ======================================================= */

  const startListening =
    useCallback(async () => {
      if (listening) {
        return;
      }

      if (
        typeof navigator ===
          'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator
          .mediaDevices
          .getUserMedia !==
          'function'
      ) {
        onErrorRef.current?.(
          'Microphone recording is not supported in this browser.'
        );

        return;
      }

      try {
        /* -------------------------------------------------
           Clear old audio
        ------------------------------------------------- */

        audioChunksRef.current =
          [];

        /* -------------------------------------------------
           Request microphone
        ------------------------------------------------- */

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: {
                echoCancellation:
                  true,

                noiseSuppression:
                  true,

                autoGainControl:
                  true,

                channelCount: 1,
              },
            }
          );

        mediaStreamRef.current =
          stream;

        /* -------------------------------------------------
           Choose supported MIME type
        ------------------------------------------------- */

        let mimeType = '';

        if (
          MediaRecorder.isTypeSupported(
            'audio/webm;codecs=opus'
          )
        ) {
          mimeType =
            'audio/webm;codecs=opus';
        } else if (
          MediaRecorder.isTypeSupported(
            'audio/webm'
          )
        ) {
          mimeType =
            'audio/webm';
        } else if (
          MediaRecorder.isTypeSupported(
            'audio/mp4'
          )
        ) {
          mimeType =
            'audio/mp4';
        }

        console.log(
          '🎙️ Recording MIME type:',
          mimeType ||
            'browser default'
        );

        /* -------------------------------------------------
           Create recorder
        ------------------------------------------------- */

        const recorder =
          mimeType
            ? new MediaRecorder(
                stream,
                {
                  mimeType,
                }
              )
            : new MediaRecorder(
                stream
              );

        mediaRecorderRef.current =
          recorder;

        /* -------------------------------------------------
           Audio chunks
        ------------------------------------------------- */

        recorder.ondataavailable =
          (
            event: BlobEvent
          ) => {
            if (
              event.data &&
              event.data.size > 0
            ) {
              audioChunksRef.current.push(
                event.data
              );
            }
          };

        /* -------------------------------------------------
           Recording stop
        ------------------------------------------------- */

        recorder.onstop = () => {
          const finalMimeType =
            recorder.mimeType ||
            mimeType ||
            'audio/webm';

          const audioBlob =
            new Blob(
              audioChunksRef.current,
              {
                type:
                  finalMimeType,
              }
            );

          console.log(
            '🎤 Final audio:',
            finalMimeType,
            audioBlob.size
          );

          audioChunksRef.current =
            [];

          /* Stop microphone */

          mediaStreamRef.current
            ?.getTracks()
            .forEach(
              (track) => {
                track.stop();
              }
            );

          mediaStreamRef.current =
            null;

          mediaRecorderRef.current =
            null;

          /* Send audio */

          if (
            audioBlob.size > 0
          ) {
            onAudioRef.current?.(
              audioBlob
            );
          } else {
            onErrorRef.current?.(
              'No audio was recorded. Please try again.'
            );
          }
        };

        /* -------------------------------------------------
           Recording error
        ------------------------------------------------- */

        recorder.onerror = () => {
          console.error(
            '❌ MediaRecorder error'
          );

          setListening(false);

          onErrorRef.current?.(
            'There was a problem recording your voice.'
          );

          mediaStreamRef.current
            ?.getTracks()
            .forEach(
              (track) => {
                track.stop();
              }
            );

          mediaStreamRef.current =
            null;

          mediaRecorderRef.current =
            null;
        };

        /* -------------------------------------------------
           Start recording
        ------------------------------------------------- */

        recorder.start(250);

        setListening(true);

        console.log(
          '🎙️ Recording started'
        );

        /* -------------------------------------------------
           Maximum 20 seconds
        ------------------------------------------------- */

        maxDurationRef.current =
          window.setTimeout(
            () => {
              const currentRecorder =
                mediaRecorderRef.current;

              if (
                currentRecorder &&
                currentRecorder.state ===
                  'recording'
              ) {
                console.log(
                  '⏱️ Maximum recording duration reached.'
                );

                currentRecorder.stop();

                setListening(
                  false
                );
              }
            },
            20000
          );
      } catch (error) {
        console.error(
          '❌ Microphone error:',
          error
        );

        setListening(false);

        mediaStreamRef.current
          ?.getTracks()
          .forEach(
            (track) => {
              track.stop();
            }
          );

        mediaStreamRef.current =
          null;

        mediaRecorderRef.current =
          null;

        onErrorRef.current?.(
          'Microphone permission was denied or the microphone is unavailable.'
        );
      }
    }, [listening]);

  /* =======================================================
     STOP LISTENING
  ======================================================= */

  const stopListening =
    useCallback(() => {
      if (
        maxDurationRef.current !==
        null
      ) {
        window.clearTimeout(
          maxDurationRef.current
        );

        maxDurationRef.current =
          null;
      }

      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state ===
          'recording'
      ) {
        console.log(
          '🛑 Stopping recording...'
        );

        recorder.stop();
      }

      setListening(false);
    }, []);

  /* =======================================================
     TEXT TO SPEECH
  ======================================================= */

  const speak =
    useCallback(
      (
        text: string,
        language: VoiceLanguage =
          'en'
      ) => {
        if (
          typeof window ===
            'undefined' ||
          !(
            'speechSynthesis' in
            window
          )
        ) {
          console.warn(
            'Speech synthesis is not supported.'
          );

          return;
        }

        if (
          !text?.trim()
        ) {
          return;
        }

        /* Stop previous speech */

        window.speechSynthesis.cancel();

        /* Get latest voices */

        const currentVoices =
          window.speechSynthesis
            .getVoices();

        const availableVoices =
          currentVoices.length
            ? currentVoices
            : voices;

        /* Find voice */

        const selectedVoice =
          findBestVoice(
            availableVoices,
            language
          );

        /* Create utterance */

        const utterance =
          new SpeechSynthesisUtterance(
            text
          );

        const config =
          LANGUAGE_CONFIG[
            language
          ];

        /* -------------------------------------------------
           Language
        ------------------------------------------------- */

        switch (language) {
          case 'ta':
            utterance.lang =
              'ta-IN';
            break;

          case 'hi':
            utterance.lang =
              'hi-IN';
            break;

          case 'tanglish':
            utterance.lang =
              'en-IN';
            break;

          case 'mixed':
            utterance.lang =
              'en-IN';
            break;

          default:
            utterance.lang =
              'en-IN';
        }

        /* -------------------------------------------------
           Voice
        ------------------------------------------------- */

        if (selectedVoice) {
          utterance.voice =
            selectedVoice;

          console.log(
            '🔊 Selected voice:',
            selectedVoice.name,
            selectedVoice.lang
          );
        } else {
          console.warn(
            `No browser voice found for ${language}.`
          );
        }

        /* -------------------------------------------------
           Speech settings
        ------------------------------------------------- */

        utterance.rate =
          config.rate;

        utterance.pitch =
          config.pitch;

        utterance.volume = 1;

        /* -------------------------------------------------
           Events
        ------------------------------------------------- */

        utterance.onstart =
          () => {
            console.log(
              '🔊 Speech started:',
              language,
              utterance.lang
            );
          };

        utterance.onend =
          () => {
            console.log(
              '🔊 Speech finished.'
            );
          };

        utterance.onerror =
          (event) => {
            console.warn(
              '⚠️ Speech synthesis error:',
              event.error
            );
          };

        /* -------------------------------------------------
           Speak
        ------------------------------------------------- */

        window.setTimeout(
          () => {
            window.speechSynthesis.speak(
              utterance
            );
          },
          100
        );
      },
      [voices]
    );

  /* =======================================================
     STOP SPEAKING
  ======================================================= */

  const stopSpeaking =
    useCallback(() => {
      if (
        typeof window !==
          'undefined' &&
        'speechSynthesis' in
          window
      ) {
        window.speechSynthesis.cancel();

        if (
          window.speechSynthesis
            .paused
        ) {
          window.speechSynthesis.resume();
        }
      }
    }, []);

  /* =======================================================
     RETURN
  ======================================================= */

  return {
    listening,
    supported,

    startListening,
    stopListening,

    speak,
    stopSpeaking,

    voices,
  };
}