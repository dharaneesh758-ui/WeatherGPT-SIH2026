import type { Language } from '@/types';
import { t } from '@/lib/i18n';

export interface WeatherCodeInfo {
  en: string;
  hi: string;
  ta: string;
  icon: string;
  gradient: string;
  isDangerous?: boolean;
}

const W: Record<number, WeatherCodeInfo> = {
  0:  { en: 'Clear sky',          hi: 'साफ आसमान',           ta: 'தெளிவான வானம்',       icon: 'sun',       gradient: 'from-amber-400 to-orange-500' },
  1:  { en: 'Mostly clear',       hi: 'लगभग साफ',            ta: 'பெரும்பாலும் தெளிவு',  icon: 'sun-cloud', gradient: 'from-amber-300 to-orange-400' },
  2:  { en: 'Partly cloudy',      hi: 'आंशिक बादल',          ta: 'ஓரளவு மேகம்',         icon: 'cloud-sun', gradient: 'from-sky-300 to-blue-400' },
  3:  { en: 'Overcast',           hi: 'बादल छाए हुए',         ta: 'மேகமூட்டம்',          icon: 'cloud',     gradient: 'from-gray-400 to-gray-600' },
  45: { en: 'Foggy',              hi: 'कोहरा',                ta: 'பனிமூட்டம்',          icon: 'fog',       gradient: 'from-gray-300 to-gray-500' },
  48: { en: 'Rime fog',           hi: 'कोहरा और नन्ही बर्फ',  ta: 'உறைபனிமூட்டம்',      icon: 'fog',       gradient: 'from-gray-300 to-slate-500' },
  51: { en: 'Light drizzle',      hi: 'हल्की बूंदाबांदी',     ta: 'மெல்லிய தூறல்',       icon: 'drizzle',   gradient: 'from-sky-300 to-cyan-500' },
  53: { en: 'Drizzle',            hi: 'बूंदाबांदी',            ta: 'தூறல்',                icon: 'drizzle',   gradient: 'from-sky-400 to-cyan-500' },
  55: { en: 'Dense drizzle',      hi: 'घनी बूंदाबांदी',       ta: 'அடர் தூறல்',          icon: 'drizzle',   gradient: 'from-sky-500 to-cyan-600' },
  56: { en: 'Freezing drizzle',   hi: 'जमती बूंदाबांदी',      ta: 'உறையும் தூறல்',       icon: 'drizzle',   gradient: 'from-cyan-400 to-blue-600' },
  57: { en: 'Dense freezing drizzle', hi: 'घनी जमती बूंदाबांदी', ta: 'அடர் உறையும் தூறல்', icon: 'drizzle', gradient: 'from-cyan-500 to-blue-700' },
  61: { en: 'Light rain',         hi: 'हल्की बारिश',          ta: 'மெல்லிய மழை',         icon: 'rain',      gradient: 'from-blue-400 to-blue-600' },
  63: { en: 'Rain',               hi: 'बारिश',                 ta: 'மழை',                  icon: 'rain',      gradient: 'from-blue-500 to-blue-700' },
  65: { en: 'Heavy rain',         hi: 'भारी बारिश',           ta: 'கனமழை',               icon: 'rain',      gradient: 'from-blue-600 to-indigo-800', isDangerous: true },
  66: { en: 'Freezing rain',      hi: 'जमती बारिश',           ta: 'உறையும் மழை',         icon: 'rain',      gradient: 'from-cyan-500 to-blue-700' },
  67: { en: 'Heavy freezing rain', hi: 'भारी जमती बारिश',     ta: 'கன உறையும் மழை',     icon: 'rain',      gradient: 'from-cyan-600 to-blue-800', isDangerous: true },
  71: { en: 'Light snow',         hi: 'हल्की बर्फबारी',       ta: 'மெல்லிய பனிப்பொழிவு', icon: 'snow',      gradient: 'from-slate-200 to-blue-300' },
  73: { en: 'Snow',               hi: 'बर्फबारी',              ta: 'பனிப்பொழிவு',         icon: 'snow',      gradient: 'from-slate-300 to-blue-400' },
  75: { en: 'Heavy snow',         hi: 'भारी बर्फबारी',        ta: 'கன பனிப்பொழிவு',     icon: 'snow',      gradient: 'from-slate-400 to-blue-500', isDangerous: true },
  77: { en: 'Snow grains',        hi: 'बर्फ के दाने',         ta: 'பனி துகள்கள்',        icon: 'snow',      gradient: 'from-slate-200 to-slate-400' },
  80: { en: 'Light showers',      hi: 'हल्की बौछार',          ta: 'மெல்லிய மழை புழுதி',  icon: 'rain',      gradient: 'from-blue-400 to-cyan-600' },
  81: { en: 'Showers',            hi: 'बौछार',                 ta: 'மழை புழுதி',          icon: 'rain',      gradient: 'from-blue-500 to-cyan-700' },
  82: { en: 'Violent showers',    hi: 'तेज बौछार',            ta: 'வன்மையான மழை',       icon: 'rain',      gradient: 'from-blue-700 to-indigo-900', isDangerous: true },
  85: { en: 'Snow showers',       hi: 'बर्फ की बौछार',        ta: 'பனி மழை',             icon: 'snow',      gradient: 'from-slate-300 to-blue-400' },
  86: { en: 'Heavy snow showers', hi: 'भारी बर्फ की बौछार',   ta: 'கன பனி மழை',         icon: 'snow',      gradient: 'from-slate-400 to-blue-500', isDangerous: true },
  95: { en: 'Thunderstorm',       hi: 'गरज के साथ बारिश',     ta: 'இடியுடன் மழை',       icon: 'thunder',   gradient: 'from-purple-600 to-gray-900', isDangerous: true },
  96: { en: 'Thunderstorm + hail', hi: 'ओले के साथ गरज',      ta: 'ஆலங்கட்டி இடியுடன்',  icon: 'thunder',   gradient: 'from-purple-700 to-gray-900', isDangerous: true },
  99: { en: 'Severe thunderstorm + hail', hi: 'तेज ओले के साथ गरज', ta: 'கடும் ஆலங்கட்டி இடியுடன்', icon: 'thunder', gradient: 'from-purple-800 to-gray-950', isDangerous: true },
};

export function getWeatherInfo(code: number): WeatherCodeInfo {
  return W[code] ?? W[0];
}

export function getWeatherLabel(code: number, lang: Language): string {
  const info = getWeatherInfo(code);
  return info[lang] ?? info.en;
}

export function getWindDirection(degrees: number, lang: Language): string {
  const directions: Record<Language, string[]> = {
    en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    hi: ['उ', 'उ-पू', 'पू', 'द-पू', 'द', 'द-प', 'प', 'उ-प'],
    ta: ['வ', 'வ-கி', 'கி', 'தெ-கி', 'தெ', 'தெ-மே', 'மே', 'வ-மே'],
  };
  const dirs = directions[lang] ?? directions.en;
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

export function getAqiLabel(aqi: number, lang: Language): { label: string; color: string } {
  if (aqi <= 50) return { label: t('aqiGood', lang), color: 'text-green-400' };
  if (aqi <= 100) return { label: t('aqiModerate', lang), color: 'text-yellow-400' };
  if (aqi <= 150) return { label: t('aqiUnhealthy', lang), color: 'text-orange-400' };
  if (aqi <= 200) return { label: t('aqiUnhealthy', lang), color: 'text-red-400' };
  if (aqi <= 300) return { label: t('aqiVeryUnhealthy', lang), color: 'text-purple-400' };
  return { label: t('aqiHazardous', lang), color: 'text-rose-500' };
}

export function getUvLabel(uv: number): { label: string; color: string } {
  if (uv < 3) return { label: 'Low', color: 'text-green-400' };
  if (uv < 6) return { label: 'Moderate', color: 'text-yellow-400' };
  if (uv < 8) return { label: 'High', color: 'text-orange-400' };
  if (uv < 11) return { label: 'Very High', color: 'text-red-400' };
  return { label: 'Extreme', color: 'text-purple-400' };
}
