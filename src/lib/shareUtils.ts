import type { WeatherAlert, WeatherData, Language } from '@/types';

export function shareAlertViaWhatsApp(alert: WeatherAlert, weather: WeatherData, lang: Language) {
  const locName = weather.location.name;
  const levelText = alert.level === 'danger'
    ? (lang === 'hi' ? '🚨 खतरा' : lang === 'ta' ? '🚨 ஆபத்து' : '🚨 DANGER')
    : alert.level === 'warning'
    ? (lang === 'hi' ? '⚠️ चेतावनी' : lang === 'ta' ? '⚠️ எச்சரிக்கை' : '⚠️ WARNING')
    : (lang === 'hi' ? 'ℹ️ सूचना' : lang === 'ta' ? 'ℹ️ தகவல்' : 'ℹ️ INFO');

  const header = lang === 'hi'
    ? `WeatherGPT — ${locName} मौसम चेतावनी`
    : lang === 'ta'
    ? `WeatherGPT — ${locName} வானிலை எச்சரிக்கை`
    : `WeatherGPT — ${locName} Weather Alert`;

  const text = `${header}\n\n${levelText}: ${alert.title}\n${alert.message}\n\n— WeatherGPT`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function shareAlertViaNative(alert: WeatherAlert, weather: WeatherData, lang: Language): Promise<boolean> {
  if (!navigator.share) return false;
  const locName = weather.location.name;
  const text = lang === 'hi'
    ? `WeatherGPT: ${locName} — ${alert.title}\n${alert.message}`
    : lang === 'ta'
    ? `WeatherGPT: ${locName} — ${alert.title}\n${alert.message}`
    : `WeatherGPT: ${locName} — ${alert.title}\n${alert.message}`;
  try {
    await navigator.share({ title: 'WeatherGPT Alert', text });
    return true;
  } catch {
    return false;
  }
}

export function copyAlertToClipboard(alert: WeatherAlert, weather: WeatherData): Promise<void> {
  const text = `WeatherGPT: ${weather.location.name} — ${alert.title}\n${alert.message}`;
  return navigator.clipboard.writeText(text);
}
