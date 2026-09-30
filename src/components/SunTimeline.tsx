import { Sun, Sunrise, Sunset, SunDim } from 'lucide-react';
import type { WeatherData, Language } from '@/types';
import { t } from '@/lib/i18n';

interface Props {
  weather: WeatherData;
  lang: Language;
}

export function SunTimeline({ weather, lang }: Props) {
  const sunrise = new Date(weather.daily.sunrise[0]);
  const sunset = new Date(weather.daily.sunset[0]);
  const now = new Date();

  const dayLength = sunset.getTime() - sunrise.getTime();
  const elapsed = now.getTime() - sunrise.getTime();
  const progress = Math.max(0, Math.min(1, elapsed / dayLength));

  const srLabel = sunrise.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  const ssLabel = sunset.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  const arcRadius = 80;
  const arcWidth = 200;
  const arcHeight = 90;
  const sunX = 20 + progress * (arcWidth - 40);
  const sunY = arcHeight - Math.sin(progress * Math.PI) * arcRadius * 0.7;

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Sun size={16} className="text-amber-400" />
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">{t('sunrise', lang)} / {t('sunset', lang)}</h3>
      </div>
      <div className="relative flex flex-col items-center">
        <svg width={arcWidth} height={arcHeight} className="overflow-visible">
          <path
            d={`M 20 ${arcHeight - 10} Q ${arcWidth / 2} ${-arcRadius * 0.5} ${arcWidth - 20} ${arcHeight - 10}`}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <line x1="10" y1={arcHeight - 10} x2={arcWidth - 10} y2={arcHeight - 10} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <circle cx={sunX} cy={sunY} r="8" fill="#fbbf24" className="drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <circle cx={sunX} cy={sunY} r="4" fill="#fde68a" />
        </svg>
        <div className="flex items-center justify-between w-full mt-2">
          <div className="flex items-center gap-1.5">
            <Sunrise size={16} className="text-amber-400" />
            <div>
              <p className="text-white/50 text-[10px] uppercase">{t('sunrise', lang)}</p>
              <p className="text-white text-sm font-semibold">{srLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="text-right">
              <p className="text-white/50 text-[10px] uppercase">{t('sunset', lang)}</p>
              <p className="text-white text-sm font-semibold">{ssLabel}</p>
            </div>
            <Sunset size={16} className="text-orange-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
