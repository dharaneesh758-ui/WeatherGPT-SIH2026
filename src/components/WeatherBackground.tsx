import { useMemo } from 'react';
import type { CurrentWeather } from '@/types';

export function WeatherBackground({ weather }: { weather: CurrentWeather | null }) {
  const gradient = useMemo(() => {
    if (!weather) return 'from-slate-900 via-slate-800 to-slate-900';
    const code = weather.weatherCode;

    // Clear
    if (code === 0 || code === 1) {
      return weather.isDay
        ? 'from-sky-500 via-blue-600 to-indigo-800'
        : 'from-indigo-950 via-slate-900 to-blue-950';
    }
    // Partly cloudy
    if (code === 2) {
      return weather.isDay
        ? 'from-sky-400 via-blue-500 to-slate-700'
        : 'from-slate-800 via-slate-900 to-indigo-950';
    }
    // Overcast
    if (code === 3) return 'from-gray-600 via-slate-700 to-gray-800';
    // Fog
    if (code === 45 || code === 48) return 'from-gray-500 via-slate-600 to-gray-800';
    // Drizzle
    if (code >= 51 && code <= 57) return 'from-sky-700 via-blue-800 to-slate-900';
    // Rain
    if (code >= 61 && code <= 67 || code >= 80 && code <= 82) return 'from-blue-800 via-slate-800 to-slate-950';
    // Snow
    if (code >= 71 && code <= 77 || code === 85 || code === 86) return 'from-slate-400 via-slate-600 to-slate-800';
    // Thunderstorm
    if (code >= 95) return 'from-purple-900 via-slate-900 to-gray-950';

    return 'from-slate-800 via-slate-900 to-slate-950';
  }, [weather]);

  return (
    <div className={`fixed inset-0 bg-gradient-to-b ${gradient} transition-all duration-1000 ease-in-out -z-10`}>
      {/* Animated stars / particles overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="stars" />
      </div>
      {/* Subtle radial glow */}
      <div className="absolute inset-0 opacity-20" style={{
        background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 50%)',
      }} />
    </div>
  );
}
