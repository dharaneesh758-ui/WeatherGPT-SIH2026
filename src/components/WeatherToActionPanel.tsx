import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Square,
  Users,
  Volume2,
} from 'lucide-react';

import type {
  Language,
  RiskAssessment,
  WeatherData,
} from '@/types';

import { generateWeatherActions } from '@/lib/weatherToAction';

interface WeatherToActionPanelProps {
  weather?: WeatherData | null;
  risk?: RiskAssessment | null;
  lang: Language;
}

interface PriorityStyle {
  border: string;
  background: string;
  icon: string;
  badge: string;
}

const getText = (
  lang: Language,
  en: string,
  hi: string,
  ta: string
): string => {
  if (lang === 'hi') return hi;
  if (lang === 'ta') return ta;
  return en;
};

const getSpeechLang = (lang: Language): string => {
  if (lang === 'hi') return 'hi-IN';
  if (lang === 'ta') return 'ta-IN';
  return 'en-IN';
};

const PRIORITY_STYLES: Record<string, PriorityStyle> = {
  extreme: {
    border: 'border-red-500/40',
    background: 'bg-red-500/10',
    icon: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300',
  },

  high: {
    border: 'border-orange-500/40',
    background: 'bg-orange-500/10',
    icon: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-300',
  },

  moderate: {
    border: 'border-yellow-500/40',
    background: 'bg-yellow-500/10',
    icon: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-300',
  },

  low: {
    border: 'border-emerald-500/40',
    background: 'bg-emerald-500/10',
    icon: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
  },
};

const getPriorityStyle = (priority: string): PriorityStyle =>
  PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low;

const isSpeechSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'speechSynthesis' in window;

const WeatherToActionPanel = ({
  weather,
  risk,
  lang,
}: WeatherToActionPanelProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  /*
   * IMPORTANT:
   * Weather data may be undefined during the first render.
   * Never call generateWeatherActions() until valid data exists.
   */
  const actions = useMemo(() => {
    if (!weather || !weather.current || !risk) {
      return [];
    }

    return generateWeatherActions(weather, risk, lang);
  }, [weather, risk, lang]);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (isSpeechSupported()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop old speech when weather/language/actions change
  useEffect(() => {
    if (isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }, [actions, lang]);

  const toggleAlert = useCallback(() => {
    if (!isSpeechSupported()) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = actions
      .flatMap((action) => [
        action.title,
        action.impact,
        ...action.actions,
      ])
      .filter(Boolean)
      .join('. ');

    if (!text) {
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = getSpeechLang(lang);
    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;

    speech.onend = () => {
      setIsSpeaking(false);
    };

    speech.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);

    window.speechSynthesis.speak(speech);
  }, [actions, isSpeaking, lang]);

  /*
   * If weather data is still loading,
   * simply don't render this panel.
   */
  if (!weather || !weather.current || !risk) {
    return null;
  }

  /*
   * If there are no generated actions,
   * don't show an empty panel.
   */
  if (actions.length === 0) {
    return null;
  }

  const listenLabel = getText(
    lang,
    'Listen to Weather Alert',
    'मौसम चेतावनी सुनें',
    'வானிலை எச்சரிக்கையை கேளுங்கள்'
  );

  const stopLabel = getText(
    lang,
    'Stop Listening',
    'सुनना बंद करें',
    'கேட்பதை நிறுத்து'
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl backdrop-blur-md">

      {/* Header */}
      <div className="border-b border-white/10 p-5">
        <div className="flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
            <ShieldAlert
              className="h-6 w-6 text-orange-400"
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">
              {getText(
                lang,
                'Weather-to-Action',
                'मौसम से कार्रवाई',
                'வானிலையிலிருந்து நடவடிக்கை'
              )}
            </h2>

            <p className="mt-1 text-xs text-white/50">
              {getText(
                lang,
                'Understand the impact and what to do now.',
                'प्रभाव और अभी क्या करना है, जानें।',
                'பாதிப்பு மற்றும் இப்போது என்ன செய்ய வேண்டும் என்பதை அறியுங்கள்.'
              )}
            </p>
          </div>

          {/* Risk level */}
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-white/70">
            {risk.level}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4 p-4">

        {actions.map((action, index) => {
          const style = getPriorityStyle(action.priority);

          return (
            <div
              key={`${action.title}-${index}`}
              className={`rounded-xl border p-4 ${style.border} ${style.background}`}
            >
              {/* Title */}
              <div className="flex items-start gap-3">

                <AlertTriangle
                  className={`mt-0.5 h-5 w-5 shrink-0 ${style.icon}`}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">

                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">
                      {action.title}
                    </h3>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${style.badge}`}
                    >
                      {action.priority}
                    </span>
                  </div>

                  {/* Possible Impact */}
                  <div className="mt-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                      {getText(
                        lang,
                        'Possible Impact',
                        'संभावित प्रभाव',
                        'சாத்தியமான பாதிப்பு'
                      )}
                    </p>

                    <p className="text-sm leading-relaxed text-white/80">
                      {action.impact}
                    </p>
                  </div>

                  {/* Affected Groups */}
                  {action.affectedGroups.length > 0 && (
                    <div className="mt-4">

                      <div className="mb-2 flex items-center gap-2">
                        <Users
                          className="h-4 w-4 text-white/50"
                          aria-hidden="true"
                        />

                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                          {getText(
                            lang,
                            'Who May Be Affected',
                            'कौन प्रभावित हो सकता है',
                            'யார் பாதிக்கப்படலாம்'
                          )}
                        </p>
                      </div>

                      <ul className="space-y-1.5">
                        {action.affectedGroups.map(
                          (group, groupIndex) => (
                            <li
                              key={`${group}-${groupIndex}`}
                              className="flex items-start gap-2 text-sm text-white/75"
                            >
                              <span
                                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/50"
                                aria-hidden="true"
                              />

                              <span>{group}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  {action.actions.length > 0 && (
                    <div className="mt-4 rounded-lg bg-black/20 p-3">

                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2
                          className="h-4 w-4 text-emerald-400"
                          aria-hidden="true"
                        />

                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                          {getText(
                            lang,
                            'What To Do Now',
                            'अभी क्या करें',
                            'இப்போது என்ன செய்ய வேண்டும்'
                          )}
                        </p>
                      </div>

                      <ol className="space-y-2">
                        {action.actions.map(
                          (item, actionIndex) => (
                            <li
                              key={`${item}-${actionIndex}`}
                              className="flex items-start gap-2 text-sm text-white/80"
                            >
                              <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-300"
                                aria-hidden="true"
                              >
                                {actionIndex + 1}
                              </span>

                              <span className="leading-relaxed">
                                {item}
                              </span>
                            </li>
                          )
                        )}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Voice Alert */}
        {isSpeechSupported() && (
          <button
            type="button"
            onClick={toggleAlert}
            aria-pressed={isSpeaking}
            aria-label={
              isSpeaking ? stopLabel : listenLabel
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            {isSpeaking ? (
              <Square
                className="h-4 w-4"
                aria-hidden="true"
              />
            ) : (
              <Volume2
                className="h-4 w-4"
                aria-hidden="true"
              />
            )}

            {isSpeaking ? stopLabel : listenLabel}
          </button>
        )}

        {/* Disclaimer */}
        <p className="px-2 text-center text-[10px] leading-relaxed text-white/30">
          {getText(
            lang,
            'AI Weather Risk Assessment. Follow official government warnings during emergencies.',
            'AI मौसम जोखिम आकलन। आपात स्थिति में आधिकारिक सरकारी चेतावनियों का पालन करें।',
            'AI வானிலை ஆபத்து மதிப்பீடு. அவசரநிலைகளில் அதிகாரப்பூர்வ அரசு எச்சரிக்கைகளைப் பின்பற்றவும்.'
          )}
        </p>
      </div>
    </section>
  );
};

export default WeatherToActionPanel;