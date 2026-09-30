import { useState, useCallback, useRef, useEffect } from 'react';
import type { WeatherData, GeoLocation } from '@/types';
import { getWeather } from '@/lib/weatherApi';

interface UseWeatherState {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useWeather(location: GeoLocation | null): UseWeatherState {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const locationRef = useRef(location);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!location) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getWeather(location.latitude, location.longitude, location)
      .then((w) => {
        if (!cancelled) {
          setData(w);
          setLoading(false);
          setLastUpdated(new Date());
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch weather');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [location, refreshKey]);

  // Auto-refresh every 10 minutes to keep data current
  useEffect(() => {
    if (!location) return;
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [location]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { data, loading, error, refresh, lastUpdated };
}
