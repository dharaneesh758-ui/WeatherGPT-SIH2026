import type { GeoLocation, WeatherData, CurrentWeather, HourlyForecast, DailyForecast, AirQuality } from '@/types';

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

// Find the index in a time array closest to the current time
function findCurrentHourIndex(times: string[]): number {
  const now = new Date();
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    if (t.getHours() === now.getHours() && t.getDate() === now.getDate() && t.getMonth() === now.getMonth()) {
      return i;
    }
  }
  // Fallback: closest timestamp
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - now.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    name: query,
    count: '8',
    language: 'en',
    format: 'json',
  });
  const res = await fetch(`${GEO_URL}?${params}`);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data.results) return [];
  return data.results.map((r: any, i: number): GeoLocation => ({
    id: r.id ?? i,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country ?? '',
    country_code: r.country_code,
    admin1: r.admin1,
    timezone: r.timezone,
    population: r.population,
  }));
}

export async function getWeather(lat: number, lon: number, location: GeoLocation): Promise<WeatherData> {
  // Use the best available NWP model ensemble from Open-Meteo.
  // Open-Meteo automatically blends multiple models (ICON, GFS, ECMWF, etc.)
  // but we request the full parameter set for maximum accuracy.
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),

    // ── Current conditions ──
    current: [
      'temperature_2m',
      'apparent_temperature',
      'is_day',
      'relative_humidity_2m',
      'precipitation',
      'rain',
      'showers',
      'snowfall',
      'weather_code',
      'cloud_cover',
      'cloud_cover_low',
      'cloud_cover_mid',
      'cloud_cover_high',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),

    // ── Hourly forecast (next 7 days) ──
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_gusts_10m',
      'visibility',
      'uv_index',
      'dew_point_2m',
      'pressure_msl',
      'cape',
    ].join(','),

    // ── Daily forecast ──
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'precipitation_sum',
      'rain_sum',
      'showers_sum',
      'snowfall_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'uv_index_max',
      'sunrise',
      'sunset',
    ].join(','),

    timezone: 'auto',
    forecast_days: '7',
    past_days: '1',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
  });

  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error('Weather fetch failed');
  const data = await res.json();

  // ── Align current hour for UV, visibility, dew point ──
  const currentHourIdx = data.hourly?.time ? findCurrentHourIndex(data.hourly.time) : 0;

  const current: CurrentWeather = {
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    precipitation: data.current.precipitation,
    rain: data.current.rain,
    showers: data.current.showers,
    snowfall: data.current.snowfall,
    weatherCode: data.current.weather_code,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    windGusts: data.current.wind_gusts_10m,
    pressure: data.current.surface_pressure,
    pressureMsl: data.current.pressure_msl,
    cloudCover: data.current.cloud_cover,
    cloudCoverLow: data.current.cloud_cover_low,
    cloudCoverMid: data.current.cloud_cover_mid,
    cloudCoverHigh: data.current.cloud_cover_high,
    visibility: data.hourly?.visibility?.[currentHourIdx] ?? 10000,
    uvIndex: data.hourly?.uv_index?.[currentHourIdx] ?? 0,
    dewPoint: data.hourly?.dew_point_2m?.[currentHourIdx] ?? 0,
    cape: data.hourly?.cape?.[currentHourIdx] ?? 0,
    isDay: data.current.is_day === 1,
    time: data.current.time,
  };

  const hourly: HourlyForecast = {
    time: data.hourly.time,
    temperature: data.hourly.temperature_2m,
    precipitationProbability: data.hourly.precipitation_probability,
    weatherCode: data.hourly.weather_code,
    windSpeed: data.hourly.wind_speed_10m,
    windGusts: data.hourly.wind_gusts_10m,
    relativeHumidity: data.hourly.relative_humidity_2m,
    apparentTemperature: data.hourly.apparent_temperature,
    uvIndex: data.hourly.uv_index,
    visibility: data.hourly.visibility,
    dewPoint: data.hourly.dew_point_2m,
    precipitation: data.hourly.precipitation,
    pressureMsl: data.hourly.pressure_msl,
    cape: data.hourly.cape,
  };

  const daily: DailyForecast = {
    time: data.daily.time,
    weatherCode: data.daily.weather_code,
    tempMax: data.daily.temperature_2m_max,
    tempMin: data.daily.temperature_2m_min,
    apparentTempMax: data.daily.apparent_temperature_max,
    apparentTempMin: data.daily.apparent_temperature_min,
    precipitationProbability: data.daily.precipitation_probability_max,
    windSpeedMax: data.daily.wind_speed_10m_max,
    windGustsMax: data.daily.wind_gusts_10m_max,
    sunrise: data.daily.sunrise,
    sunset: data.daily.sunset,
    precipitationSum: data.daily.precipitation_sum,
    rainSum: data.daily.rain_sum,
    showersSum: data.daily.showers_sum,
    snowfallSum: data.daily.snowfall_sum,
    uvIndexMax: data.daily.uv_index_max,
  };

  // ── Fetch air quality ──
  let airQuality: AirQuality | undefined;
  try {
    airQuality = await getAirQuality(lat, lon);
  } catch {
    // Air quality may not be available for all locations
  }

  return {
    current,
    hourly,
    daily,
    airQuality,
    location,
    timezone: data.timezone,
  };
}

export async function getAirQuality(lat: number, lon: number): Promise<AirQuality> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: ['pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide', 'ozone', 'european_aqi', 'us_aqi'].join(','),
    timezone: 'auto',
    forecast_days: '1',
  });
  const res = await fetch(`${AIR_URL}?${params}`);
  if (!res.ok) throw new Error('Air quality fetch failed');
  const data = await res.json();
  return {
    time: data.hourly.time,
    pm10: data.hourly.pm10,
    pm2_5: data.hourly.pm2_5,
    carbonMonoxide: data.hourly.carbon_monoxide,
    nitrogenDioxide: data.hourly.nitrogen_dioxide,
    ozone: data.hourly.ozone,
    europeanAqi: data.hourly.european_aqi,
    usAqi: data.hourly.us_aqi,
  };
}

// BigDataCloud free reverse geocoding API — more reliable than Open-Meteo for this purpose
export async function reverseGeocode(lat: number, lon: number): Promise<GeoLocation> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return {
        id: 0,
        name: data.city || data.locality || data.principalSubdivision || 'My Location',
        latitude: lat,
        longitude: lon,
        country: data.countryName || '',
        country_code: data.countryCode,
        admin1: data.principalSubdivision,
      };
    }
  } catch {
    // Fall through to fallback
  }
  return {
    id: 0,
    name: 'My Location',
    latitude: lat,
    longitude: lon,
    country: '',
  };
}
