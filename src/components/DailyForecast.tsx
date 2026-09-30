import type { WeatherData, Language } from '@/types';
import { WeatherIcon } from '@/components/WeatherIcon';
import { getWeatherLabel } from '@/lib/weatherCodes';
import { t } from '@/lib/i18n';

interface Props {
  weather: WeatherData;
  lang: Language;
}

const DAY_KEYS: Record<
  number,
  'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

function getDayOfWeek(dateString: string) {
  const [year, month, day] = dateString
    .slice(0, 10)
    .split('-')
    .map(Number);

  // Use UTC only to calculate weekday from the
  // calendar date itself. This avoids browser
  // timezone shifting the date.
  return new Date(
    Date.UTC(year, month - 1, day),
  ).getUTCDay();
}

export function DailyForecast({
  weather,
  lang,
}: Props) {
  const days = weather.daily.time.length;

  const allTemps = [
    ...weather.daily.tempMax,
    ...weather.daily.tempMin,
  ];

  const globalMax = Math.max(...allTemps);
  const globalMin = Math.min(...allTemps);

  const range = globalMax - globalMin || 1;

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-5 shadow-xl">
      <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
        {t('daily', lang)}
      </h3>

      <div className="flex flex-col gap-1">
        {Array.from({ length: days }, (_, i) => {
          const dateString =
            weather.daily.time[i];

          const dayOfWeek =
            getDayOfWeek(dateString);

          const dayLabel =
            i === 0
              ? t('today', lang)
              : i === 1
                ? lang === 'hi'
                  ? 'कल'
                  : lang === 'ta'
                    ? 'நாளை'
                    : 'Tomorrow'
                : t(
                    DAY_KEYS[dayOfWeek],
                    lang,
                  );

          const max = Math.round(
            weather.daily.tempMax[i],
          );

          const min = Math.round(
            weather.daily.tempMin[i],
          );

          const precip =
            weather.daily
              .precipitationProbability[i];

          const code =
            weather.daily.weatherCode[i];

          const label =
            getWeatherLabel(code, lang);

          const leftPct =
            ((min - globalMin) / range) * 100;

          const widthPct =
            ((max - min) / range) * 100;

          return (
            <div
              key={dateString}
              className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="w-16 sm:w-20 flex-shrink-0">
                <span className="text-white text-sm font-medium">
                  {dayLabel}
                </span>
              </div>

              <WeatherIcon
                code={code}
                size={28}
                className="text-white/70 flex-shrink-0 group-hover:text-white transition-colors"
              />

              <div className="hidden sm:block flex-1 min-w-0">
                <span className="text-white/50 text-xs truncate">
                  {label}
                </span>
              </div>

              <div className="flex items-center gap-1 w-10 flex-shrink-0 justify-end">
                <span className="text-blue-300 text-xs">
                  {precip}%
                </span>
              </div>

              <div className="flex items-center gap-2 w-28 sm:w-32 flex-shrink-0">
                <span className="text-white/50 text-sm w-6 text-right">
                  {min}°
                </span>

                <div className="flex-1 h-1.5 bg-white/10 rounded-full relative overflow-hidden">
                  <div
                    className="absolute h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500"
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(
                        widthPct,
                        8,
                      )}%`,
                    }}
                  />
                </div>

                <span className="text-white text-sm w-6 font-semibold">
                  {max}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}