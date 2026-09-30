import {
  Droplets,
  Wind,
  Gauge,
  Eye,
  Cloud,
  Sun,
  Compass,
  Thermometer,
} from 'lucide-react';

import type {
  WeatherData,
  Language,
} from '@/types';

import { WeatherIcon } from '@/components/WeatherIcon';

import {
  getWeatherLabel,
  getWindDirection,
  getUvLabel,
} from '@/lib/weatherCodes';

import { t } from '@/lib/i18n';

interface Props {
  weather: WeatherData;
  lang: Language;
  unit: 'celsius' | 'fahrenheit';
}

/* =========================================================
   TEMPERATURE CONVERSION
   ========================================================= */

function toFahrenheit(celsius: number) {
  return (celsius * 9) / 5 + 32;
}

/* =========================================================
   CURRENT WEATHER
   ========================================================= */

export function CurrentWeather({
  weather,
  lang,
  unit,
}: Props) {
  const current = weather.current;

  const temperature =
    unit === 'celsius'
      ? Math.round(current.temperature)
      : Math.round(
          toFahrenheit(
            current.temperature,
          ),
        );

  const feelsLike =
    unit === 'celsius'
      ? Math.round(
          current.apparentTemperature,
        )
      : Math.round(
          toFahrenheit(
            current.apparentTemperature,
          ),
        );

  const weatherLabel =
    getWeatherLabel(
      current.weatherCode,
      lang,
    );

  const windDirection =
    getWindDirection(
      current.windDirection,
      lang,
    );

  const uvInfo =
    getUvLabel(current.uvIndex);

  const unitSymbol =
    unit === 'celsius'
      ? '°C'
      : '°F';

  /* =======================================================
     WEATHER STATS
     ======================================================= */

  const stats = [
    {
      icon: Thermometer,
      label: t('feelsLike', lang),
      value: `${feelsLike}${unitSymbol}`,
    },

    {
      icon: Droplets,
      label: t('humidity', lang),
      value: `${current.humidity}%`,
    },

    {
      icon: Wind,
      label: t('wind', lang),
      value: `${Math.round(
        current.windSpeed,
      )} km/h ${windDirection}`,
    },

    {
      icon: Gauge,
      label: t('pressure', lang),
      value: `${Math.round(
        current.pressure,
      )} hPa`,
    },

    {
      icon: Cloud,
      label: t('cloudCover', lang),
      value: `${current.cloudCover}%`,
    },

    {
      icon: Eye,
      label: t('visibility', lang),
      value: `${(
        current.visibility / 1000
      ).toFixed(1)} km`,
    },

    {
      icon: Sun,
      label: t('uvIndex', lang),
      value: `${current.uvIndex} (${uvInfo.label})`,
    },

    {
      icon: Compass,
      label: t('windDirection', lang),
      value: `${current.windDirection}°`,
    },
  ];

  /* =======================================================
     UI
     ======================================================= */

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">

      {/* MAIN WEATHER */}

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">

        {/* WEATHER ICON */}

        <div className="flex-shrink-0">

          <div className="relative">

            <div className="absolute inset-0 scale-150 rounded-full bg-white/10 blur-2xl" />

            <WeatherIcon
              code={current.weatherCode}
              size={96}
              className="relative z-10 text-white"
              animate
            />

          </div>

        </div>

        {/* TEMPERATURE */}

        <div className="flex-1 text-center sm:text-left">

          <div className="flex items-baseline justify-center gap-1 sm:justify-start">

            <span className="text-6xl font-extralight tracking-tight text-white sm:text-7xl">
              {temperature}
            </span>

            <span className="text-3xl font-light text-white/70">
              {unitSymbol}
            </span>

          </div>

          <p className="mt-1 text-lg font-medium text-white/90">
            {weatherLabel}
          </p>

          <p className="mt-1 text-sm text-white/50">
            {t('feelsLike', lang)}{' '}
            {feelsLike}
            {unitSymbol}
          </p>

          {current.precipitation > 0 && (
            <p className="mt-1 text-sm text-blue-300">
              {t('precipitation', lang)}:{' '}
              {current.precipitation} mm
            </p>
          )}

        </div>

      </div>

      {/* WEATHER STATISTICS */}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div
              key={index}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
            >

              <div className="mb-1 flex items-center gap-1.5">

                <Icon
                  size={14}
                  className="text-white/40"
                />

                <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">
                  {stat.label}
                </span>

              </div>

              <p className="text-sm font-semibold text-white">
                {stat.value}
              </p>

            </div>
          );
        })}

      </div>

    </div>
  );
}