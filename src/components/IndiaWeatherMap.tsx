import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  Star,
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

/* NEW MAP COMPONENT */

import { useWeather } from '@/hooks/useWeather';
import { getGreeting } from '@/lib/i18n';
import { reverseGeocode } from '@/lib/weatherApi';
import { assessRisk } from '@/lib/riskEngine';

import type {
  GeoLocation,
  Language,
  SavedLocation,
} from '@/types';

/* =========================================================
   CONSTANTS
========================================================= */

const SETTINGS_KEY = 'weathergpt-india-settings';

const MAX_SAVED_LOCATIONS = 10;

/*
 * WeatherGPT is focused on India.
 * Default location: New Delhi.
 */

const DEFAULT_LOCATION: GeoLocation = {
  id: 1273294,
  name: 'New Delhi',
  latitude: 28.6139,
  longitude: 77.2090,
  country: 'India',
  country_code: 'IN',
  timezone: 'Asia/Kolkata',
};

/* =========================================================
   STORAGE
========================================================= */

interface StoredSettings {
  lang?: Language;
  unit?: 'celsius' | 'fahrenheit';
  savedLocations?: SavedLocation[];
}

function loadSettings(): StoredSettings {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(
      SETTINGS_KEY,
    );

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== 'object'
    ) {
      return {};
    }

    return parsed as StoredSettings;
  } catch (error) {
    console.error(
      '[WeatherGPT] Failed to load settings:',
      error,
    );

    return {};
  }
}

function saveSettings(
  settings: StoredSettings,
) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(settings),
    );
  } catch (error) {
    console.error(
      '[WeatherGPT] Failed to save settings:',
      error,
    );
  }
}

/* =========================================================
   LOCATION ID
========================================================= */

function createLocationId(
  latitude: number,
  longitude: number,
) {
  return `${latitude.toFixed(
    4,
  )}-${longitude.toFixed(4)}`;
}

/* =========================================================
   INDIA VALIDATION
========================================================= */

function isIndianLocation(
  location: GeoLocation,
) {
  return (
    location.country_code?.toUpperCase() ===
      'IN' ||
    location.country?.toLowerCase() ===
      'india'
  );
}

/* =========================================================
   APP
========================================================= */

function App() {

  /* =======================================================
     INITIAL SETTINGS
  ======================================================= */

  const [initialSettings] =
    useState<StoredSettings>(
      () => loadSettings(),
    );

  /* =======================================================
     CORE STATE
  ======================================================= */

  const [location, setLocation] =
    useState<GeoLocation>(
      DEFAULT_LOCATION,
    );

  const [lang, setLang] =
    useState<Language>(
      initialSettings.lang ?? 'en',
    );

  const [unit, setUnit] =
    useState<
      'celsius' | 'fahrenheit'
    >(
      initialSettings.unit ??
        'celsius',
    );

  const [
    savedLocations,
    setSavedLocations,
  ] = useState<SavedLocation[]>(
    initialSettings.savedLocations ??
      [],
  );

  const [view, setView] =
    useState<
      'dashboard' | 'chat'
    >('dashboard');

  const [
    settingsOpen,
    setSettingsOpen,
  ] = useState(false);

  const [
    geoLoading,
    setGeoLoading,
  ] = useState(false);

  const [
    locationMessage,
    setLocationMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    savedMessage,
    setSavedMessage,
  ] = useState<string | null>(
    null,
  );

  /* =======================================================
     WEATHER
  ======================================================= */

  const {
    data: weather,
    loading,
    error,
    refresh,
  } = useWeather(location);

  /* =======================================================
     INDIA RISK ENGINE
  ======================================================= */

  const risk = useMemo(
    () =>
      weather
        ? assessRisk(weather)
        : null,
    [weather],
  );

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  useEffect(() => {
    saveSettings({
      lang,
      unit,
      savedLocations,
    });
  }, [
    lang,
    unit,
    savedLocations,
  ]);

  /* =======================================================
     CLEAR NOTIFICATIONS
  ======================================================= */

  useEffect(() => {
    if (!locationMessage) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setLocationMessage(null);
      }, 4000);

    return () =>
      window.clearTimeout(timer);
  }, [locationMessage]);

  useEffect(() => {
    if (!savedMessage) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setSavedMessage(null);
      }, 3000);

    return () =>
      window.clearTimeout(timer);
  }, [savedMessage]);

  /* =======================================================
     LOCATION SEARCH
  ======================================================= */

  const handleLocationSelect =
    useCallback(
      (newLocation: GeoLocation) => {

        /*
         * India-only protection.
         */

        if (
          !isIndianLocation(
            newLocation,
          )
        ) {
          setLocationMessage(
            'Please select a location within India.',
          );

          return;
        }

        setLocation(newLocation);

        setView('dashboard');

        setLocationMessage(
          `Weather updated for ${newLocation.name}, India`,
        );
      },
      [],
    );

  /* =======================================================
     MAP LOCATION SELECT
  ======================================================= */

  const handleMapLocationSelect =
    useCallback(
      async (
        latitude: number,
        longitude: number,
      ) => {

        try {

          setLocationMessage(
            'Getting weather location...',
          );

          const reverseLocation =
            await reverseGeocode(
              latitude,
              longitude,
            );

          if (!reverseLocation) {
            setLocationMessage(
              'Unable to identify this location.',
            );

            return;
          }

          if (
            !isIndianLocation(
              reverseLocation,
            )
          ) {
            setLocationMessage(
              'Please select a location within India.',
            );

            return;
          }

          setLocation(
            reverseLocation,
          );

          setView('dashboard');

          setLocationMessage(
            `Weather updated for ${reverseLocation.name}, India`,
          );

        } catch (error) {

          console.error(
            '[WeatherGPT] Map location error:',
            error,
          );

          setLocationMessage(
            'Unable to identify the selected map location.',
          );
        }
      },
      [],
    );

  /* =======================================================
     CURRENT LOCATION
  ======================================================= */

  const handleCurrentLocation =
    useCallback(() => {

      if (!navigator.geolocation) {
        setLocationMessage(
          'Geolocation is not supported by your browser.',
        );

        return;
      }

      if (geoLoading) {
        return;
      }

      setGeoLoading(true);

      setLocationMessage(null);

      navigator.geolocation.getCurrentPosition(
        async (position) => {

          try {

            const {
              latitude,
              longitude,
            } = position.coords;

            const reverseLocation =
              await reverseGeocode(
                latitude,
                longitude,
              );

            if (
              !reverseLocation
            ) {
              throw new Error(
                'Unable to identify your current location.',
              );
            }

            /*
             * Only allow Indian locations.
             */

            if (
              !isIndianLocation(
                reverseLocation,
              )
            ) {

              setLocationMessage(
                'Your current location appears to be outside India. WeatherGPT currently supports India only.',
              );

              return;
            }

            setLocation(
              reverseLocation,
            );

            setView('dashboard');

            setLocationMessage(
              `Using your current location: ${reverseLocation.name}, India`,
            );

          } catch (error) {

            console.error(
              '[WeatherGPT] Location error:',
              error,
            );

            setLocationMessage(
              'Could not identify your current location.',
            );

          } finally {

            setGeoLoading(false);
          }
        },

        (geoError) => {

          console.error(
            '[WeatherGPT] Geolocation error:',
            geoError,
          );

          let message =
            'Unable to access your location.';

          switch (
            geoError.code
          ) {

            case geoError.PERMISSION_DENIED:

              message =
                'Location permission was denied. Please enable location permission in your browser.';

              break;

            case geoError.POSITION_UNAVAILABLE:

              message =
                'Your current location is unavailable.';

              break;

            case geoError.TIMEOUT:

              message =
                'Location request timed out. Please try again.';

              break;

            default:

              message =
                'Unable to determine your location.';
          }

          setLocationMessage(
            message,
          );

          setGeoLoading(false);
        },

        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge:
            5 * 60 * 1000,
        },
      );

    }, [geoLoading]);

  /* =======================================================
     SAVE LOCATION
  ======================================================= */

  const handleSaveLocation =
    useCallback(() => {

      if (
        !isIndianLocation(
          location,
        )
      ) {

        setSavedMessage(
          'Only Indian locations can be saved.',
        );

        return;
      }

      const locationId =
        createLocationId(
          location.latitude,
          location.longitude,
        );

      const saved: SavedLocation =
        {
          id: locationId,
          name: location.name,
          country:
            location.country,
          latitude:
            location.latitude,
          longitude:
            location.longitude,
          admin1:
            location.admin1,
        };

      setSavedLocations(
        (previous) => {

          const alreadySaved =
            previous.some(
              (item) =>
                item.id ===
                locationId,
            );

          if (
            alreadySaved
          ) {

            setSavedMessage(
              `${location.name} is already saved.`,
            );

            return previous;
          }

          if (
            previous.length >=
            MAX_SAVED_LOCATIONS
          ) {

            setSavedMessage(
              `You can save up to ${MAX_SAVED_LOCATIONS} Indian locations.`,
            );

            return previous;
          }

          setSavedMessage(
            `${location.name} added to saved locations.`,
          );

          return [
            ...previous,
            saved,
          ];
        },
      );

    }, [location]);

  /* =======================================================
     REMOVE SAVED LOCATION
  ======================================================= */

  const handleRemoveSavedLocation =
    useCallback(
      (id: string) => {

        setSavedLocations(
          (previous) =>
            previous.filter(
              (item) =>
                item.id !== id,
            ),
        );

        setSavedMessage(
          'Location removed.',
        );
      },
      [],
    );

  /* =======================================================
     SELECT SAVED LOCATION
  ======================================================= */

  const handleSavedLocationSelect =
    useCallback(
      (saved: SavedLocation) => {

        const newLocation:
          GeoLocation = {

          id: Date.now(),

          name: saved.name,

          country:
            saved.country,

          latitude:
            saved.latitude,

          longitude:
            saved.longitude,

          admin1:
            saved.admin1,

          country_code:
            'IN',
        };

        setLocation(
          newLocation,
        );

        setView(
          'dashboard',
        );

        setSettingsOpen(
          false,
        );

        setLocationMessage(
          `Weather loaded for ${saved.name}`,
        );
      },
      [],
    );

  /* =======================================================
     CHAT
  ======================================================= */

  const openChat =
    useCallback(() => {

      setView('chat');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

    }, []);

  /* =======================================================
     DASHBOARD
  ======================================================= */

  const openDashboard =
    useCallback(() => {

      setView(
        'dashboard',
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

    }, []);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* WEATHER BACKGROUND */}

      {weather && (
        <WeatherBackground
          weather={
            weather.current
          }
        />
      )}

      <div className="relative z-10">

        {/* HEADER */}

        <Header
          lang={lang}
          onLangChange={setLang}
          unit={unit}
          onUnitChange={setUnit}
          onOpenSettings={() =>
            setSettingsOpen(
              true,
            )
          }
          view={view}
          onViewChange={
            setView
          }
        />

        {/* MAIN */}

        <main
          className="
            mx-auto
            w-full
            max-w-7xl
            px-4
            py-6
            sm:px-6
            lg:px-8
          "
        >

          {/* INDIA BADGE */}

          <div
            className="
              mb-4
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-orange-400/20
              bg-orange-400/10
              px-3
              py-1.5
              text-xs
              text-orange-200
            "
          >
            <span>🇮🇳</span>

            India Weather &
            Disaster Intelligence
          </div>

          {/* SEARCH */}

          <section
            aria-label="India location search"
            className="mb-6"
          >

            <SearchBar
              onSelect={
                handleLocationSelect
              }
              lang={lang}
            />

            <div
              className="
                mt-3
                flex
                flex-wrap
                items-center
                gap-2
              "
            >

              {/* CURRENT LOCATION */}

              <button
                type="button"
                onClick={
                  handleCurrentLocation
                }
                disabled={
                  geoLoading
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-white/10
                  bg-white/5
                  px-3
                  py-2
                  text-sm
                  transition
                  hover:bg-white/10
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >

                {geoLoading ? (
                  <Loader2
                    className="
                      h-4
                      w-4
                      animate-spin
                    "
                  />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}

                {geoLoading
                  ? 'Getting location...'
                  : 'Use my location'}

              </button>

              {/* SAVE */}

              <button
                type="button"
                onClick={
                  handleSaveLocation
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-white/10
                  bg-white/5
                  px-3
                  py-2
                  text-sm
                  transition
                  hover:bg-white/10
                "
              >

                <Star className="h-4 w-4" />

                Save location

              </button>

              {/* REFRESH */}

              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-white/10
                  bg-white/5
                  px-3
                  py-2
                  text-sm
                  transition
                  hover:bg-white/10
                  disabled:opacity-50
                "
              >

                <RefreshCw
                  className={
                    loading
                      ? 'h-4 w-4 animate-spin'
                      : 'h-4 w-4'
                  }
                />

                {loading
                  ? 'Refreshing...'
                  : 'Refresh'}

              </button>

            </div>

            {/* LOCATION MESSAGE */}

            {locationMessage && (
              <div
                role="status"
                className="
                  mt-3
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-white/10
                  bg-white/5
                  px-3
                  py-2
                  text-sm
                  text-white/80
                "
              >

                <CheckCircle2 className="h-4 w-4" />

                {locationMessage}

              </div>
            )}

            {/* SAVE MESSAGE */}

            {savedMessage && (
              <div
                role="status"
                className="
                  mt-2
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-white/10
                  bg-white/5
                  px-3
                  py-2
                  text-sm
                  text-white/80
                "
              >

                <Star className="h-4 w-4" />

                {savedMessage}

              </div>
            )}

          </section>

          {/* =================================================
              INDIA WEATHER MAP
          ================================================= */}

          {weather && (
            <section
              className="mb-6"
            >

            </section>
          )}

          {/* =================================================
              LOADING
          ================================================= */}

          {loading &&
            !weather && (
              <section
                className="
                  flex
                  min-h-[400px]
                  items-center
                  justify-center
                "
              >

                <div
                  className="
                    flex
                    flex-col
                    items-center
                    gap-4
                    text-center
                  "
                >

                  <Loader2
                    className="
                      h-12
                      w-12
                      animate-spin
                    "
                  />

                  <div>

                    <p className="font-medium">
                      Loading WeatherGPT
                    </p>

                    <p className="mt-1 text-sm text-white/50">
                      Fetching Indian weather data...
                    </p>

                  </div>

                </div>

              </section>
            )}

          {/* =================================================
              ERROR
          ================================================= */}

          {error &&
            !weather && (
              <section
                role="alert"
                className="
                  flex
                  min-h-[300px]
                  items-center
                  justify-center
                "
              >

                <div
                  className="
                    w-full
                    max-w-md
                    rounded-2xl
                    border
                    border-red-400/20
                    bg-red-500/10
                    p-6
                    text-center
                  "
                >

                  <AlertCircle
                    className="
                      mx-auto
                      mb-4
                      h-12
                      w-12
                      text-red-400
                    "
                  />

                  <h2 className="text-lg font-semibold">
                    Unable to load weather
                  </h2>

                  <p className="mt-2 text-sm text-white/60">
                    {String(error)}
                  </p>

                  <button
                    type="button"
                    onClick={refresh}
                    className="
                      mt-5
                      inline-flex
                      items-center
                      gap-2
                      rounded-lg
                      bg-white
                      px-4
                      py-2
                      text-sm
                      font-medium
                      text-slate-900
                      transition
                      hover:bg-white/90
                    "
                  >

                    <RefreshCw className="h-4 w-4" />

                    Try again

                  </button>

                </div>

              </section>
            )}

          {/* =================================================
              WEATHER
          ================================================= */}

          {weather && (
            <>

              {/* LOCATION HEADER */}

              <section className="mb-6">

                <p className="text-sm text-white/60">
                  {getGreeting(
                    lang,
                  )}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-3">

                  <h1
                    className="
                      text-2xl
                      font-bold
                      sm:text-3xl
                    "
                  >
                    {location.name}
                  </h1>

                  <span
                    className="
                      inline-flex
                      items-center
                      gap-1
                      rounded-full
                      border
                      border-orange-400/20
                      bg-orange-400/10
                      px-2.5
                      py-1
                      text-xs
                      text-orange-200
                    "
                  >
                    🇮🇳 India
                  </span>

                  {risk && (
                    <span
                      className="
                        inline-flex
                        items-center
                        gap-1
                        rounded-full
                        border
                        border-white/10
                        bg-white/5
                        px-2.5
                        py-1
                        text-xs
                      "
                    >

                      <ShieldAlert className="h-3.5 w-3.5" />

                      Risk Assessment

                    </span>
                  )}

                </div>

                <p className="text-sm text-white/60">

                  {location.admin1
                    ? `${location.admin1}, `
                    : ''}

                  India

                </p>

              </section>

              {/* =================================================
                  DASHBOARD
              ================================================= */}

              {view ===
                'dashboard' && (
                <section
                  className="
                    grid
                    grid-cols-1
                    gap-6
                    xl:grid-cols-3
                  "
                >

                  {/* LEFT */}

                  <div
                    className="
                      space-y-6
                      xl:col-span-2
                    "
                  >

                    <CurrentWeather
                      weather={weather}
                      unit={unit}
                      lang={lang}
                    />

                    <HourlyForecast
                      weather={weather}
                      lang={lang}
                    />

                    <DailyForecast
                      weather={weather}
                      lang={lang}
                    />

                  </div>

                  {/* RIGHT */}

                  <aside className="space-y-6">

                    <RiskPanel
                      weather={weather}
                      lang={lang}
                    />

                    {risk && (
                      <WeatherToActionPanel
                        weather={
                          weather
                        }
                        risk={risk}
                        lang={lang}
                      />
                    )}

                    <AlertsPanel
                      weather={weather}
                      lang={lang}
                    />

                    <SunTimeline
                      weather={weather}
                      lang={lang}
                    />

                    <AirQualityPanel
                      weather={weather}
                      lang={lang}
                    />

                    {/* AI CHAT */}

                    <button
                      type="button"
                      onClick={openChat}
                      className="
                        group
                        w-full
                        rounded-2xl
                        border
                        border-white/10
                        bg-white/5
                        p-5
                        text-left
                        transition
                        hover:border-white/20
                        hover:bg-white/10
                      "
                    >

                      <div className="flex items-center justify-between gap-4">

                        <div className="flex items-start gap-3">

                          <div
                            className="
                              rounded-xl
                              bg-white
                              p-2
                              text-slate-900
                            "
                          >

                            <MessageCircle className="h-5 w-5" />

                          </div>

                          <div>

                            <h3 className="font-semibold">
                              WeatherGPT AI
                            </h3>

                            <p className="mt-1 text-sm text-white/60">
                              Ask about Indian weather,
                              risks and forecasts.
                            </p>

                          </div>

                        </div>

                        <span
                          className="
                            rounded-lg
                            bg-white
                            px-3
                            py-2
                            text-sm
                            font-medium
                            text-slate-900
                            transition
                            group-hover:scale-105
                          "
                        >
                          Chat
                        </span>

                      </div>

                    </button>

                  </aside>

                </section>
              )}

              {/* =================================================
                  AI CHAT
              ================================================= */}

              {view ===
                'chat' && (
                <section
                  className="
                    grid
                    grid-cols-1
                    gap-6
                    xl:grid-cols-3
                  "
                >

                  <div className="xl:col-span-2">

                    <ChatPanel
                      weather={weather}
                      lang={lang}
                    />

                  </div>

                  <aside className="space-y-6">

                    <CurrentWeather
                      weather={weather}
                      unit={unit}
                      lang={lang}
                    />

                    <RiskPanel
                      weather={weather}
                      lang={lang}
                    />

                    {risk && (
                      <WeatherToActionPanel
                        weather={
                          weather
                        }
                        risk={risk}
                        lang={lang}
                      />
                    )}

                    <AlertsPanel
                      weather={weather}
                      lang={lang}
                    />

                    <AirQualityPanel
                      weather={weather}
                      lang={lang}
                    />

                    <button
                      type="button"
                      onClick={
                        openDashboard
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-white/5
                        px-4
                        py-3
                        text-sm
                        transition
                        hover:bg-white/10
                      "
                    >

                      ← Back to dashboard

                    </button>

                  </aside>

                </section>
              )}

            </>
          )}

        </main>

        {/* =================================================
            SETTINGS
        ================================================= */}

        {settingsOpen && (
          <SettingsPanel
            open={settingsOpen}
            onClose={() =>
              setSettingsOpen(
                false,
              )
            }
            currentLocation={
              location
            }
            savedLocations={
              savedLocations
            }
            onSaveCurrent={
              handleSaveLocation
            }
            onRemove={
              handleRemoveSavedLocation
            }
            onSelect={
              handleSavedLocationSelect
            }
            onUseGeolocation={
              handleCurrentLocation
            }
            geoLoading={
              geoLoading
            }
            lang={lang}
          />
        )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer
          className="
            mt-10
            border-t
            border-white/10
            px-4
            py-8
            text-center
            text-xs
            text-white/40
          "
        >

          <p>
            🇮🇳 WeatherGPT • AI-powered
            weather & disaster-management
            assistant for India
          </p>

          <p className="mt-2">
            Live Weather • Forecasts • Alerts •
            Risk Assessment • AI Assistance •
            Interactive India Map
          </p>

        </footer>

      </div>

    </div>
  );
}

export default App;