import type { ModelForecast } from './types';

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    wind_speed_10m: number[];
  };
}

async function fetchModel(
  url: string,
  model: 'ECMWF' | 'GFS',
): Promise<ModelForecast> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${model} forecast request failed: ${response.status}`,
    );
  }

  const data =
    (await response.json()) as OpenMeteoResponse;

  return {
    model,
    time: data.hourly.time,
    temperature: data.hourly.temperature_2m,
    precipitation: data.hourly.precipitation,
    windSpeed: data.hourly.wind_speed_10m,
  };
}

export async function getMultiModelForecast(
  latitude: number,
  longitude: number,
): Promise<ModelForecast[]> {
  const common =
    `latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&hourly=temperature_2m,precipitation,wind_speed_10m` +
    `&forecast_days=3` +
    `&timezone=auto`;

  const ecmwfUrl =
    `https://api.open-meteo.com/v1/forecast?${common}` +
    `&models=ecmwf_ifs025`;

  const gfsUrl =
    `https://api.open-meteo.com/v1/forecast?${common}` +
    `&models=gfs_seamless`;

  const [ecmwf, gfs] = await Promise.all([
    fetchModel(ecmwfUrl, 'ECMWF'),
    fetchModel(gfsUrl, 'GFS'),
  ]);

  return [ecmwf, gfs];
}