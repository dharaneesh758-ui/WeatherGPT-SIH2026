import { useCallback, useRef, useEffect } from 'react';
import type { WeatherAlert } from '@/types';

type AlertLevel = WeatherAlert['level'];

export function useAlertSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playedRef = useRef<Set<string>>(new Set());
  const enabledRef = useRef(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('weathergpt-alert-sound');
      enabledRef.current = stored !== 'false';
    } catch { /* noop */ }
  }, []);

  const getCtx = (): AudioContext | null => {
    if (!enabledRef.current) return null;
    if (!audioCtxRef.current) {
      try {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctor) audioCtxRef.current = new Ctor();
      } catch { /* noop */ }
    }
    return audioCtxRef.current;
  };

  const playTone = (frequency: number, duration: number, startTime: number, type: OscillatorType = 'sine', volume = 0.3) => {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const playAlertSound = useCallback((level: AlertLevel) => {
    const ctx = getCtx();
    if (!ctx) return;
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    if (level === 'danger') {
      // Urgent 3-tone siren: high-low-high, repeated
      for (let cycle = 0; cycle < 2; cycle++) {
        const base = now + cycle * 1.2;
        playTone(880, 0.25, base, 'square', 0.25);
        playTone(660, 0.25, base + 0.3, 'square', 0.25);
        playTone(880, 0.25, base + 0.6, 'square', 0.25);
        playTone(440, 0.35, base + 0.9, 'square', 0.2);
      }
    } else if (level === 'warning') {
      // Two-tone beep
      for (let cycle = 0; cycle < 2; cycle++) {
        const base = now + cycle * 0.7;
        playTone(600, 0.15, base, 'sine', 0.3);
        playTone(800, 0.15, base + 0.2, 'sine', 0.3);
      }
    } else {
      // Single gentle notification
      playTone(523, 0.2, now, 'sine', 0.2);
      playTone(659, 0.3, now + 0.15, 'sine', 0.2);
    }
  }, []);

  const playTestSound = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    playTone(523, 0.15, ctx.currentTime, 'sine', 0.2);
    playTone(659, 0.15, ctx.currentTime + 0.1, 'sine', 0.2);
    playTone(784, 0.2, ctx.currentTime + 0.2, 'sine', 0.2);
  }, []);

  // Auto-play sound when new alerts appear
  const checkAndPlayAlerts = useCallback((alerts: WeatherAlert[], weatherKey: string) => {
    if (!enabledRef.current) return;
    if (alerts.length === 0) return;
    // Only play if we haven't already played for this weather state
    if (playedRef.current.has(weatherKey)) return;
    playedRef.current.add(weatherKey);

    // Determine highest alert level
    const hasDanger = alerts.some(a => a.level === 'danger');
    const hasWarning = alerts.some(a => a.level === 'warning');
    const level: AlertLevel = hasDanger ? 'danger' : hasWarning ? 'warning' : 'info';

    // Small delay so the UI renders first
    setTimeout(() => playAlertSound(level), 300);
  }, [playAlertSound]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    try { localStorage.setItem('weathergpt-alert-sound', String(enabled)); } catch { /* noop */ }
  }, []);

  const isEnabled = useCallback(() => enabledRef.current, []);

  return { playAlertSound, playTestSound, checkAndPlayAlerts, setEnabled, isEnabled };
}
