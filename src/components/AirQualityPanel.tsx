import { Wind, Droplets, Activity } from 'lucide-react';
import type { WeatherData, Language } from '@/types';
import { getAqiLabel } from '@/lib/weatherCodes';
import { t } from '@/lib/i18n';

interface Props {
  weather: WeatherData;
  lang: Language;
}

function getCurrentHourIndex(times: string[]): number {
  const now = new Date();
  for (let i = 0; i < times.length; i++) {
    const tm = new Date(times[i]);
    if (tm.getHours() === now.getHours() && tm.getDate() === now.getDate()) return i;
  }
  return 0;
}

export function AirQualityPanel({ weather, lang }: Props) {
  if (!weather.airQuality) return null;

  const aq = weather.airQuality;
  const idx = getCurrentHourIndex(aq.time);
  const aqi = aq.usAqi?.[idx] ?? aq.europeanAqi?.[idx] ?? 0;
  const aqiInfo = getAqiLabel(aqi, lang);
  const pm25 = aq.pm2_5?.[idx] ?? 0;
  const pm10 = aq.pm10?.[idx] ?? 0;
  const o3 = aq.ozone?.[idx] ?? 0;
  const no2 = aq.nitrogenDioxide?.[idx] ?? 0;

  const pollutants = [
    { label: 'PM2.5', value: pm25, unit: 'µg/m³', max: 50 },
    { label: 'PM10', value: pm10, unit: 'µg/m³', max: 100 },
    { label: 'O₃', value: o3, unit: 'µg/m³', max: 120 },
    { label: 'NO₂', value: no2, unit: 'µg/m³', max: 80 },
  ];

  const aqiPct = Math.min((aqi / 300) * 100, 100);

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">{t('airQuality', lang)}</h3>
        <span className={`text-sm font-bold ${aqiInfo.color}`}>{Math.round(aqi)}</span>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-light text-white">{Math.round(aqi)}</span>
          <span className={`text-sm font-semibold ${aqiInfo.color}`}>{aqiInfo.label}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-500 transition-all duration-500"
            style={{ width: `${aqiPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {pollutants.map((p, i) => {
          const pct = Math.min((p.value / p.max) * 100, 100);
          return (
            <div key={i} className="bg-white/5 rounded-xl p-2.5 border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/60 text-xs font-medium">{p.label}</span>
                <span className="text-white text-xs font-semibold">{p.value.toFixed(1)}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
