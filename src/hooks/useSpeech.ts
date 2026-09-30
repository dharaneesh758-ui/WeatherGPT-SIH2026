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
    ],
    fallback: ['hi'],
    rate: 0.92,
    pitch: 1,
  },

  /*
   * Tanglish is Tamil written using English
   * characters.
   *
   * Most browser TTS engines don't have a
   * dedicated Tanglish voice.
   *
   * Tamil voice can pronounce many Tanglish
   * words poorly, so en-IN is generally a
   * safer fallback.
   */
  tanglish: {
    preferred: [
      'en-IN',
      'en-US',
    ],
    fallback: ['en'],
    rate: 0.92,
    pitch: 1,
  },

  /*
   * Mixed Tamil + English.
   *
   * Browser TTS cannot dynamically switch
   * voices inside one utterance reliably.
   *
   * We therefore use Indian English as the
   * fallback voice.
   */
  mixed: {
    preferred: [
      'en-IN',
      'ta-IN',
    ],
    fallback: ['en', 'ta'],
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

  /*
   * -------------------------------------------------------
   * 1. Exact language match
   * -------------------------------------------------------
   */

  for (const preferred of config.preferred) {
    const exact = voices.find(
      (voice) =>
        voice.lang.toLowerCase() ===
        preferred.toLowerCase()
    );

    if (exact) {
      return exact;
    }
  }

  /*
   * -------------------------------------------------------
   * 2. Language prefix match
   *
   * ta-IN -> ta
   * hi-IN -> hi
   * en-IN -> en
   * -------------------------------------------------------
   */

  for (const preferred of config.preferred) {
    const prefix =
      preferred
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
   * -------------------------------------------------------
   * 3. Fallback language match
   * -------------------------------------------------------
   */

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

  /*
   * -------------------------------------------------------
   * 4. No matching voice
   * -------------------------------------------------------
   */

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
    useState<SpeechSynthesisVoice[]>([]);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const mediaStreamRef =
    useRef<MediaStream | null>(null);

  const audioChunksRef =
    useRef<Blob[]>([]);

  const maxDurationRef =
    useRef<number | null>(null);

  const onAudioRef =
    useRef(options.onAudio);

  const onErrorRef =
    useRef(options.onError);

  /* =======================================================
     KEEP CALLBACKS UPDATED
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
      typeof navigator.mediaDevices
        .getUserMedia ===
        'function' &&
      typeof MediaRecorder !==
        'undefined';

    setSupported(
      isSupported
    );

    return () => {
      try {
        if (
          mediaRecorderRef.current
            ?.state === 'recording'
        ) {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // Safe cleanup
      }

      mediaStreamRef.current
        ?.getTracks()
        .forEach((track) => {
          track.stop();
        });

      if (
        maxDurationRef.current
      ) {
        window.clearTimeout(
          maxDurationRef.current
        );
      }
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
      !('speechSynthesis' in
        window)
    ) {
      return;
    }

    const loadVoices = () => {
      const available =
        window.speechSynthesis
          .getVoices();

      setVoices(available);

      console.log(
        '🔊 Available browser voices:',
        available.map(
          (voice) =>
            `${voice.name} (${voice.lang})`
        )
      );
    };

    /*
     * Chrome loads voices asynchronously.
     */
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
     START MICROPHONE
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
        typeof navigator.mediaDevices
          .getUserMedia !==
          'function'
      ) {
        onErrorRef.current?.(
          'Microphone recording is not supported in this browser.'
        );

        return;
      }

      try {
        /*
         * Request microphone.
         */

        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              audio: {
                echoCancellation:
                  true,

                noiseSuppression:
                  true,

                autoGainControl:
                  true,

                /*
                 * Ask browser for good
                 * speech quality.
                 */
                channelCount: 1,

                sampleRate: 48000,
              },
            });

        mediaStreamRef.current =
          stream;

        audioChunksRef.current =
          [];

        /*
         * Select best recording format.
         */

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

        /* =================================================
           AUDIO DATA
        ================================================= */

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

        /* =================================================
           RECORDING STOP
        ================================================= */

        recorder.onstop = () => {
          const finalMimeType =
            recorder.mimeType ||
            mimeType ||
            'audio/webm';

          const audioBlob =
            new Blob(
              audioChunksRef.current,
              {
                type: finalMimeType,
              }
            );

          audioChunksRef.current =
            [];

          /*
           * Stop microphone tracks.
           */

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

          /*
           * Send audio to ChatPanel.
           */

          if (
            audioBlob.size > 0
          ) {
            onAudioRef.current?.(
              audioBlob
            );
          }
        };

        /* =================================================
           RECORDING ERROR
        ================================================= */

        recorder.onerror = () => {
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

        /* =================================================
           START
        ================================================= */

        recorder.start(
          250
        );

        setListening(true);

        /*
         * Maximum recording time:
         * 20 seconds.
         */

        maxDurationRef.current =
          window.setTimeout(
            () => {
              if (
                mediaRecorderRef
                  .current
                  ?.state ===
                'recording'
              ) {
                mediaRecorderRef.current.stop();

                setListening(
                  false
                );
              }
            },
            20000
          );
      } catch (error) {
        console.error(
          'Microphone error:',
          error
        );

        setListening(false);

        onErrorRef.current?.(
          'Microphone permission was denied or the microphone is unavailable.'
        );
      }
    }, [listening]);

  /* =======================================================
     STOP MICROPHONE
  ======================================================= */

  const stopListening =
    useCallback(() => {
      if (
        maxDurationRef.current
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
        recorder.stop();
      }

      /*
       * Don't immediately destroy the
       * stream before onstop finishes.
       *
       * This avoids cutting the final
       * audio chunk in some browsers.
       */

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

        /*
         * Stop existing speech.
         */

        window.speechSynthesis.cancel();

        /*
         * Get latest voices.
         *
         * Browser can load voices after
         * React component mounted.
         */

        const currentVoices =
          window.speechSynthesis
            .getVoices();

        const availableVoices =
          currentVoices.length
            ? currentVoices
            : voices;

        /*
         * Find language-specific voice.
         */

        const selectedVoice =
          findBestVoice(
            availableVoices,
            language
          );

        /*
         * Create utterance.
         */

        const utterance =
          new SpeechSynthesisUtterance(
            text
          );

        const config =
          LANGUAGE_CONFIG[
            language
          ];

        /*
         * Language code.
         */

        if (
          language === 'ta'
        ) {
          utterance.lang =
            'ta-IN';
        } else if (
          language === 'hi'
        ) {
          utterance.lang =
            'hi-IN';
        } else if (
          language ===
          'tanglish'
        ) {
          utterance.lang =
            'en-IN';
        } else if (
          language === 'mixed'
        ) {
          /*
           * Mixed text is generally
           * safer with Indian English.
           */
          utterance.lang =
            'en-IN';
        } else {
          utterance.lang =
            'en-IN';
        }

        /*
         * Explicitly assign selected voice.
         *
         * THIS is the important fix for
         * Tamil/Hindi speech.
         */

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
            `No matching voice found for ${language}. Browser will use its default voice.`
          );
        }

        /*
         * Natural speech settings.
         */

        utterance.rate =
          config.rate;

        utterance.pitch =
          config.pitch;

        utterance.volume = 1;

        /* =================================================
           SPEECH EVENTS
        ================================================= */

        utterance.onstart =
          () => {
            console.log(
              `🔊 Speaking in: ${language}`
            );

            console.log(
              `🌐 Voice language: ${utterance.lang}`
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
              'Speech synthesis error:',
              event.error
            );
          };

        /*
         * Chrome sometimes fails when speak()
         * is called immediately after cancel().
         *
         * Tiny delay improves reliability.
         */

        window.setTimeout(
          () => {
            window.speechSynthesis.speak(
              utterance
            );
          },
          80
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

        /*
         * Some browsers leave the speech
         * engine paused.
         */

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

    /*
     * Useful for debugging.
     */
    voices,
  };
}