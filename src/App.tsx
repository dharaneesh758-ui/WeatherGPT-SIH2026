import { useEffect, useMemo, useState } from 'react';

import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { WeatherBackground } from '@/components/WeatherBackground';
import { CurrentWeather } from '@/components/CurrentWeather';
import { HourlyForecast } from '@/components/HourlyForecast';
import { DailyForecast } from '@/components/DailyForecast';
import { AlertsPanel } from '@/components/AlertsPanel';
import { AirQualityPanel } from '@/components/AirQualityPanel';
import { SunTimeline } from '@/components/SunTimeline';
import { ChatPanel } from '@/components/ChatPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { RiskPanel } from '@/components/RiskPanel';
import WeatherToActionPanel from '@/components/WeatherToActionPanel';
import { ModelComparison } from '@/components/ModelComparison';

import { useWeather } from '@/hooks/useWeather';
import { useMultiModelForecast } from '@/hooks/useMultiModelForecast';

import { assessRisk } from '@/lib/riskEngine';

import type {
  GeoLocation,
  Language,
  SavedLocation,
} from '@/types';

/* =========================================================
   CONSTANTS
   ========================================================= */

const SETTINGS_KEY = 'weathergpt-settings';
const SAVED_LOCATIONS_KEY = 'weathergpt-saved-locations';
const MAX_SAVED_LOCATIONS = 5;

const DEFAULT_LOCATION: GeoLocation = {
  id: 1264527,
  name: 'New Delhi',
  latitude: 28.6139,
  longitude: 77.209,
  country: 'India',
  country_code: 'IN',
  admin1: 'Delhi',
  timezone: 'Asia/Kolkata',
};

/* =========================================================
   GREETING
   ========================================================= */

function getGreeting(language: Language = 'en') {
  const hour = new Date().getHours();

  if (hour < 12) {
    if (language === 'hi') return 'शुभ प्रभात';
    if (language === 'ta') return 'காலை வணக்கம்';
    return 'Good morning';
  }

  if (hour < 18) {
    if (language === 'hi') return 'नमस्कार';
    if (language === 'ta') return 'மதிய வணக்கம்';
    return 'Good afternoon';
  }

  if (language === 'hi') return 'शुभ संध्या';
  if (language === 'ta') return 'மாலை வணக்கம்';

  return 'Good evening';
}

/* =========================================================
   REVERSE GEOCODING
   ========================================================= */

async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeoLocation | null> {
  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'json',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const address = data?.address ?? {};

    return {
      id: Date.now(),
      name:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        'Current Location',

      latitude,
      longitude,

      country: address.country || 'India',

      country_code:
        typeof address.country_code === 'string'
          ? address.country_code.toUpperCase()
          : 'IN',

      admin1: address.state,

      /*
       * India-focused application.
       * Open-Meteo will use this timezone when
       * fetching weather data.
       */
      timezone: 'Asia/Kolkata',
    };
  } catch {
    return null;
  }
}

/* =========================================================
   VIEW
   ========================================================= */

type View = 'dashboard' | 'chat';

/* =========================================================
   SETTINGS
   ========================================================= */

interface SettingsState {
  notifications: boolean;
  sound: boolean;
  autoRefresh: boolean;
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  /* -------------------------------------------------------
     LOCATION
     ------------------------------------------------------- */

  const [location, setLocation] =
    useState<GeoLocation>(DEFAULT_LOCATION);

  /* -------------------------------------------------------
     LANGUAGE
     ------------------------------------------------------- */

  const [language, setLanguage] =
    useState<Language>('en');

  /* -------------------------------------------------------
     UNIT
     ------------------------------------------------------- */

  const [unit, setUnit] =
    useState<'celsius' | 'fahrenheit'>('celsius');

  /* -------------------------------------------------------
     SAVED LOCATIONS
     ------------------------------------------------------- */

  const [savedLocations, setSavedLocations] =
    useState<SavedLocation[]>([]);

  /* -------------------------------------------------------
     VIEW
     ------------------------------------------------------- */

  const [view, setView] =
    useState<View>('dashboard');

  /* -------------------------------------------------------
     SETTINGS
     ------------------------------------------------------- */

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  /* -------------------------------------------------------
     GEOLOCATION
     ------------------------------------------------------- */

  const [geoLoading, setGeoLoading] =
    useState(false);

  const [locationMessage, setLocationMessage] =
    useState<string | null>(null);

  const [savedMessage, setSavedMessage] =
    useState<string | null>(null);

  /* -------------------------------------------------------
     SETTINGS STATE
     ------------------------------------------------------- */

  const [settings, setSettings] =
    useState<SettingsState>({
      notifications: true,
      sound: true,
      autoRefresh: true,
    });

  /* =======================================================
     WEATHER
     ======================================================= */

  const {
    data: weather,
    loading: weatherLoading,
    error: weatherError,
    refresh: refreshWeather,
    lastUpdated,
  } = useWeather(location);

  /* =======================================================
     RISK
     ======================================================= */

  const risk = useMemo(() => {
    if (!weather) {
      return null;
    }

    return assessRisk(weather);
  }, [weather]);

  /* =======================================================
     HYBRID MULTI-MODEL FORECAST
     ======================================================= */

  const {
    forecasts: modelForecasts,
    blendedForecast,
    weights: modelWeights,
    historicalMetrics,
    loading: modelLoading,
    error: modelError,
    refresh: refreshModels,
  } = useMultiModelForecast(
    location.latitude,
    location.longitude,
  );

  /* =======================================================
     LOAD SETTINGS
     ======================================================= */

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(SETTINGS_KEY);

      if (!stored) {
        return;
      }

      const parsed =
        JSON.parse(stored) as Partial<SettingsState>;

      setSettings((current) => ({
        ...current,
        ...parsed,
      }));
    } catch {
      // Ignore invalid settings.
    }
  }, []);

  /* =======================================================
     SAVE SETTINGS
     ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [settings]);

  /* =======================================================
     LOAD SAVED LOCATIONS
     ======================================================= */

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(
          SAVED_LOCATIONS_KEY,
        );

      if (!stored) {
        return;
      }

      const parsed =
        JSON.parse(stored) as SavedLocation[];

      if (Array.isArray(parsed)) {
        setSavedLocations(parsed);
      }
    } catch {
      // Ignore invalid saved locations.
    }
  }, []);

  /* =======================================================
     SAVE LOCATIONS
     ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        SAVED_LOCATIONS_KEY,
        JSON.stringify(savedLocations),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [savedLocations]);

  /* =======================================================
     LOCATION SELECT
     ======================================================= */

  const handleLocationSelect = (
    selectedLocation: GeoLocation,
  ) => {
    setLocation(selectedLocation);
    setLocationMessage(null);
    setView('dashboard');
  };

  /* =======================================================
     CURRENT LOCATION
     ======================================================= */

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(
        'Geolocation is not supported by this browser.',
      );
      return;
    }

    setGeoLoading(true);
    setLocationMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          const result =
            await reverseGeocode(
              latitude,
              longitude,
            );

          if (result) {
            setLocation(result);
          } else {
            setLocation({
              ...DEFAULT_LOCATION,
              id: Date.now(),
              name: 'Current Location',
              latitude,
              longitude,
            });
          }

          setView('dashboard');
        } catch {
          setLocationMessage(
            'Unable to identify your current location.',
          );
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);

        setLocationMessage(
          'Unable to access your location.',
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  };

  /* =======================================================
     SAVE LOCATION
     ======================================================= */

  const handleSaveLocation = () => {
    const alreadySaved =
      savedLocations.some(
        (item) =>
          item.latitude === location.latitude &&
          item.longitude === location.longitude,
      );

    if (alreadySaved) {
      setSavedMessage(
        'Location is already saved.',
      );

      setTimeout(
        () => setSavedMessage(null),
        2500,
      );

      return;
    }

    if (
      savedLocations.length >=
      MAX_SAVED_LOCATIONS
    ) {
      setSavedMessage(
        `You can save up to ${MAX_SAVED_LOCATIONS} locations.`,
      );

      setTimeout(
        () => setSavedMessage(null),
        2500,
      );

      return;
    }

    const saved = {
      ...location,
    } as unknown as SavedLocation;

    setSavedLocations((current) => [
      ...current,
      saved,
    ]);

    setSavedMessage(
      `${location.name} saved.`,
    );

    setTimeout(
      () => setSavedMessage(null),
      2500,
    );
  };

  /* =======================================================
     REMOVE SAVED LOCATION
     ======================================================= */

  const handleRemoveLocation = (
    saved: SavedLocation,
  ) => {
    setSavedLocations((current) =>
      current.filter(
        (item) =>
          !(
            item.latitude === saved.latitude &&
            item.longitude === saved.longitude
          ),
      ),
    );
  };

  /* =======================================================
     SELECT SAVED LOCATION
     ======================================================= */

  const handleSelectSavedLocation = (
    saved: SavedLocation,
  ) => {
    setLocation({
      ...saved,
      id:
        typeof saved.id === 'string'
          ? Number(saved.id)
          : saved.id,
    });

    setView('dashboard');
    setSettingsOpen(false);
  };

  /* =======================================================
     REFRESH
     ======================================================= */

  const handleRefresh = () => {
    refreshWeather();
    refreshModels();
  };

  /* =======================================================
     OPEN CHAT
     ======================================================= */

  const handleOpenChat = () => {
    setView('chat');
  };

  /* =======================================================
     OPEN DASHBOARD
     ======================================================= */

  const handleOpenDashboard = () => {
    setView('dashboard');
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white">

      {/* WEATHER BACKGROUND */}

      <WeatherBackground
        weather={
          weather as unknown as
            import('@/types').CurrentWeather | null
        }
      />

      <div className="relative z-10">

        {/* HEADER */}

        <Header
          view={view}
          onViewChange={setView}
          lang={language}
          onLangChange={setLanguage}
          unit={unit}
          onUnitChange={setUnit}
          onOpenSettings={() =>
            setSettingsOpen(true)
          }
        />

        {/* MAIN */}

        <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">

          {/* SEARCH */}

          <div className="mb-6">
            <SearchBar
              onSelect={handleLocationSelect}
              lang={language}
            />
          </div>

          {/* LOCATION HEADER */}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <MapPin className="h-5 w-5 text-cyan-400" />

              <div>
                <h1 className="text-xl font-bold">
                  {location.name}
                </h1>

                <p className="text-sm text-white/50">
                  {location.admin1
                    ? `${location.admin1}, `
                    : ''}
                  {location.country}
                </p>
              </div>

            </div>

            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={handleSaveLocation}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                Save Location
              </button>

              <button
                type="button"
                onClick={handleOpenChat}
                className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                <MessageCircle className="h-4 w-4" />
                AI Weather Chat
              </button>

            </div>

          </div>

          {/* MESSAGES */}

          {savedMessage && (
            <div className="mb-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
              {savedMessage}
            </div>
          )}

          {locationMessage && (
            <div className="mb-4 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
              {locationMessage}
            </div>
          )}

          {/* WEATHER ERROR */}

          {weatherError && (
            <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">

              <div className="font-semibold text-red-200">
                Weather data unavailable
              </div>

              <div className="mt-1 text-sm text-red-200/70">
                {weatherError}
              </div>

            </div>
          )}

          {/* MODEL ERROR */}

          {modelError && (
            <div className="mb-6 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4">

              <div className="font-semibold text-orange-200">
                Hybrid forecast temporarily unavailable
              </div>

              <div className="mt-1 text-sm text-orange-200/70">
                {modelError}
              </div>

            </div>
          )}

          {/* DASHBOARD */}

          {view === 'dashboard' && (
            <>

              {/* GREETING */}

              <div className="mb-6">

                <p className="text-sm text-white/50">
                  {getGreeting(language)}
                </p>

                <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                  Weather Intelligence Dashboard
                </h2>

                <p className="mt-2 max-w-2xl text-sm text-white/50">
                  Real-time weather, risk assessment,
                  multi-model forecasting and AI-powered
                  decision support.
                </p>

              </div>

              {/* CURRENT WEATHER */}

              {weather && (
                <section className="mb-6">

                  <CurrentWeather
                    weather={weather}
                    lang={language}
                    unit={unit}
                  />

                </section>
              )}

              {/* HOURLY + DAILY */}

              {weather && (
                <div className="grid gap-6 lg:grid-cols-2">

                  <HourlyForecast
                    weather={weather}
                    lang={language}
                  />

                  <DailyForecast
                    weather={weather}
                    lang={language}
                  />

                </div>
              )}

              {/* HYBRID MULTI-MODEL FORECAST */}

              <section className="mt-6">

                <ModelComparison
                  forecasts={modelForecasts}
                  blendedForecast={
                    blendedForecast
                  }
                  weights={modelWeights}
                  historicalMetrics={
                    historicalMetrics
                  }
                  loading={modelLoading}
                />

              </section>

              {/* RISK + ACTION + ALERTS */}

              {weather && (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">

                  {/* LEFT */}

                  <div className="space-y-6">

                    <RiskPanel
                      weather={weather}
                      lang={language}
                    />

                    <WeatherToActionPanel
                      weather={weather}
                      risk={risk}
                      lang={language}
                    />

                    <AlertsPanel
                      weather={weather}
                      lang={language}
                    />

                  </div>

                  {/* RIGHT */}

                  <div className="space-y-6">

                    <AirQualityPanel
                      weather={weather}
                      lang={language}
                    />

                    <SunTimeline
                      weather={weather}
                      lang={language}
                    />

                  </div>

                </div>
              )}

              {/* AI CHAT BUTTON */}

              <section className="mt-8">

                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="group w-full rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 p-6 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/15"
                >

                  <div className="flex items-center justify-between gap-4">

                    <div className="flex items-center gap-4">

                      <div className="rounded-2xl bg-cyan-400/10 p-3">
                        <Sparkles className="h-6 w-6 text-cyan-400" />
                      </div>

                      <div>

                        <h3 className="text-lg font-semibold">
                          Ask WeatherGPT
                        </h3>

                        <p className="mt-1 text-sm text-white/50">
                          Ask about weather, rainfall,
                          risks, forecasts and recommended
                          actions.
                        </p>

                      </div>

                    </div>

                    <ArrowLeft className="h-5 w-5 rotate-180 text-white/40 transition group-hover:translate-x-1 group-hover:text-cyan-400" />

                  </div>

                </button>

              </section>

            </>
          )}

          {/* CHAT */}

          {view === 'chat' && (
            <>

              <div className="mb-6 flex items-center justify-between">

                <button
                  type="button"
                  onClick={handleOpenDashboard}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </button>

                <div className="flex items-center gap-2">

                  <Sparkles className="h-5 w-5 text-cyan-400" />

                  <span className="font-semibold">
                    WeatherGPT AI
                  </span>

                </div>

              </div>

              {weather && (
                <div className="grid gap-6 lg:grid-cols-3">

                  {/* CHAT */}

                  <div className="lg:col-span-2">

                    <ChatPanel
                      weather={weather}
                      lang={language}
                    />

                  </div>

                  {/* SIDE PANEL */}

                  <div className="space-y-6">

                    <CurrentWeather
                      weather={weather}
                      unit={unit}
                      lang={language}
                    />

                    <RiskPanel
                      weather={weather}
                      lang={language}
                    />

                    <WeatherToActionPanel
                      weather={weather}
                      risk={risk}
                      lang={language}
                    />

                  </div>

                </div>
              )}

            </>
          )}

        </main>

        {/* FOOTER */}

        <footer className="border-t border-white/10 bg-black/10">

          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-center text-sm text-white/40 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:text-left lg:px-8">

            <div>
              WeatherGPT — AI-Powered Weather Intelligence
            </div>

            <div>
              Hybrid AI–NWP Multi-Model Forecasting
            </div>

            <div>
              {location.latitude.toFixed(3)}°,
              {' '}
              {location.longitude.toFixed(3)}°
            </div>

          </div>

        </footer>

      </div>

      {/* SETTINGS */}

      {settingsOpen && (
        <SettingsPanel
          open={settingsOpen}
          onClose={() =>
            setSettingsOpen(false)
          }
          currentLocation={location}
          savedLocations={savedLocations}
          onSaveCurrent={handleSaveLocation}
          onRemove={(id) => {
            const target =
              savedLocations.find(
                (item) => item.id === id,
              );

            if (target) {
              handleRemoveLocation(target);
            }
          }}
          onSelect={handleSelectSavedLocation}
          onUseGeolocation={
            handleUseCurrentLocation
          }
          geoLoading={geoLoading}
          lang={language}
        />
      )}

    </div>
  );
}

export default App;