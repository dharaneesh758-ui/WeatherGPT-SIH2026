import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle, Info, ShieldAlert, CheckCircle2,
  Share2, Volume2, VolumeX, Bell, Copy, Check,
} from 'lucide-react';
import type { WeatherData, Language, WeatherAlert } from '@/types';
import { generateAlerts } from '@/lib/conversation';
import { shareAlertViaWhatsApp, shareAlertViaNative, copyAlertToClipboard } from '@/lib/shareUtils';
import { useAlertSound } from '@/hooks/useAlertSound';
import { t } from '@/lib/i18n';

interface Props {
  weather: WeatherData;
  lang: Language;
}

export function AlertsPanel({ weather, lang }: Props) {
  const alerts: WeatherAlert[] = generateAlerts(weather, lang);
  const [soundOn, setSoundOn] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { playAlertSound, checkAndPlayAlerts, setEnabled, isEnabled, playTestSound } = useAlertSound();
  const weatherKeyRef = useRef('');

  // Initialize sound preference
  useEffect(() => {
    setSoundOn(isEnabled());
  }, [isEnabled]);

  // Auto-play alert sound when new alerts appear
  useEffect(() => {
    const weatherKey = `${weather.location.name}-${weather.current.time}-${weather.current.weatherCode}`;
    if (weatherKey === weatherKeyRef.current) return;
    weatherKeyRef.current = weatherKey;
    checkAndPlayAlerts(alerts, weatherKey);
  }, [alerts, weather, checkAndPlayAlerts]);

  const toggleSound = () => {
    const newState = !soundOn;
    setSoundOn(newState);
    setEnabled(newState);
    if (newState) playTestSound();
  };

  const handleWhatsApp = (alert: WeatherAlert) => {
    shareAlertViaWhatsApp(alert, weather, lang);
  };

  const handleNativeShare = async (alert: WeatherAlert) => {
    const success = await shareAlertViaNative(alert, weather, lang);
    if (!success) {
      // Fallback: copy to clipboard
      await copyAlertToClipboard(alert, weather);
    }
  };

  const handleCopy = async (alert: WeatherAlert, idx: number) => {
    await copyAlertToClipboard(alert, weather);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  if (alerts.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wide">{t('alerts', lang)}</h3>
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title={soundOn ? 'Sound On' : 'Sound Off'}
          >
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 size={24} className="text-green-400 flex-shrink-0" />
          <p className="text-green-300 text-sm">{t('noAlerts', lang)}</p>
        </div>
      </div>
    );
  }

  const styles = {
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Info, iconColor: 'text-blue-400' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertTriangle, iconColor: 'text-amber-400' },
    danger: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: ShieldAlert, iconColor: 'text-red-400' },
  };

  // Determine highest alert level for the alert badge
  const hasDanger = alerts.some(a => a.level === 'danger');
  const hasWarning = alerts.some(a => a.level === 'warning');

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wide">{t('alerts', lang)}</h3>
          {(hasDanger || hasWarning) && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              hasDanger ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <Bell size={9} className="animate-pulse" />
              {alerts.length}
            </span>
          )}
        </div>
        <button
          onClick={toggleSound}
          className={`p-1.5 rounded-lg border transition-colors ${
            soundOn
              ? 'bg-cyan-500/15 border-cyan-400/25 text-cyan-300'
              : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
          }`}
          title={soundOn ? 'Alert Sound On' : 'Alert Sound Off'}
        >
          {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {alerts.map((alert, i) => {
          const style = styles[alert.level];
          return (
            <div key={i} className={`rounded-2xl ${style.bg} border ${style.border} overflow-hidden`}>
              <div className="flex items-start gap-3 p-3">
                <style.icon size={22} className={`${style.iconColor} flex-shrink-0 mt-0.5 ${alert.level === 'danger' ? 'animate-pulse' : ''}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold">{alert.title}</p>
                  <p className="text-white/70 text-xs mt-0.5 leading-relaxed">{alert.message}</p>
                </div>
              </div>
              {/* Share buttons */}
              <div className="flex items-center gap-1 px-3 pb-2.5 pt-0">
                <button
                  onClick={() => handleWhatsApp(alert)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-green-500/15 border border-green-500/25 text-green-300 hover:bg-green-500/25 transition-colors"
                  title="Share via WhatsApp"
                >
                  <Share2 size={10} />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => handleNativeShare(alert)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-white/60 hover:bg-white/15 hover:text-white/80 transition-colors"
                  title={hasNativeShare ? 'Share' : 'Copy to clipboard'}
                >
                  {hasNativeShare ? <Share2 size={10} /> : copiedIdx === i ? <Check size={10} /> : <Copy size={10} />}
                  <span>{hasNativeShare ? (lang === 'hi' ? 'साझा करें' : lang === 'ta' ? 'பகிர்' : 'Share') : (copiedIdx === i ? (lang === 'hi' ? 'कॉपी हुआ' : lang === 'ta' ? 'நகல்' : 'Copied') : (lang === 'hi' ? 'कॉपी' : lang === 'ta' ? 'நகலெடு' : 'Copy'))}</span>
                </button>
                <button
                  onClick={() => playAlertSound(alert.level)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-white/60 hover:bg-white/15 hover:text-white/80 transition-colors ml-auto"
                  title="Play alert sound"
                >
                  <Volume2 size={10} />
                  <span>{lang === 'hi' ? 'ध्वनि' : lang === 'ta' ? 'ஒலி' : 'Sound'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
