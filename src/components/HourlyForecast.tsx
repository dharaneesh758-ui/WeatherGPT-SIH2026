import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WeatherData, Language } from '@/types';
import { WeatherIcon } from '@/components/WeatherIcon';
import { t } from '@/lib/i18n';

interface Props {
  weather: WeatherData;
  lang: Language;
}

function getLocationTimeParts(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
  };
}

function getForecastDate(time: string) {
  return time.slice(0, 10);
}

function getForecastHour(time: string) {
  return Number(time.slice(11, 13));
}

export function HourlyForecast({ weather, lang }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const timezone = weather.timezone || 'UTC';

  const now = getLocationTimeParts(timezone);

  let startIdx = 0;

  for (let i = 0; i < weather.hourly.time.length; i++) {
    const forecastTime = weather.hourly.time[i];

    const forecastDate = getForecastDate(forecastTime);
    const forecastHour = getForecastHour(forecastTime);

    if (
      forecastDate === now.date &&
      forecastHour >= now.hour
    ) {
      startIdx = i;
      break;
    }
  }

  const hours = 24;

  const data = Array.from(
    {
      length: Math.min(
        hours,
        weather.hourly.time.length - startIdx,
      ),
    },
    (_, i) => {
      const idx = startIdx + i;
      const rawTime = weather.hourly.time[idx];

      return {
        idx,
        rawTime,
        temp: Math.round(
          weather.hourly.temperature[idx],
        ),
        code: weather.hourly.weatherCode[idx],
        precip:
          weather.hourly.precipitationProbability[idx],
        wind: Math.round(
          weather.hourly.windSpeed[idx],
        ),
      };
    },
  );

  const scroll = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir * 200,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
          {t('hourly', lang)}
        </h3>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft
              size={18}
              className="text-white/60"
            />
          </button>

          <button
            type="button"
            onClick={() => scroll(1)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronRight
              size={18}
              className="text-white/60"
            />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-1"
      >
        {data.map((h, i) => {
          const hour = getForecastHour(h.rawTime);

          const timeLabel =
            i === 0
              ? t('now', lang)
              : new Intl.DateTimeFormat(
                  lang === 'hi'
                    ? 'hi-IN'
                    : lang === 'ta'
                      ? 'ta-IN'
                      : 'en-IN',
                  {
                    timeZone: timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  },
                ).format(
                  new Date(
                    `${h.rawTime}:00Z`,
                  ),
                );

          return (
            <div
              key={h.idx}
              className="flex-shrink-0 w-[72px] flex flex-col items-center gap-1.5 py-2 px-1 rounded-2xl hover:bg-white/10 transition-colors"
            >
              <span className="text-[11px] text-white/50 font-medium">
                {timeLabel}
              </span>

              <WeatherIcon
                code={h.code}
                size={28}
                className="text-white/80"
              />

              <span className="text-white text-sm font-semibold">
                {h.temp}°
              </span>

              <div className="flex items-center gap-0.5">
                <span className="text-[10px] text-blue-300 font-medium">
                  {h.precip}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}