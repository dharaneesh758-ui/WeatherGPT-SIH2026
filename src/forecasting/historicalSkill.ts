import {
  calculateMAE,
  calculateRMSE,
  calculateSkillScores,
  type ModelErrors,
  type ModelSkill,
} from './skillEngine';

interface HistoricalResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    wind_speed_10m: number[];
  };
}

export interface HistoricalSkillResult {
  errors: ModelErrors;
  skill: ModelSkill;
  mae: {
    ECMWF: number;
    GFS: number;
  };
  rmse: {
    ECMWF: number;
    GFS: number;
  };
  sampleCount: number;
}

async function fetchHistoricalForecast(
  latitude: number,
  longitude: number,
  model: 'ecmwf_ifs025' | 'gfs_global',
  startDate: string,
  endDate: string,
): Promise<HistoricalResponse> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    hourly: 'temperature_2m,precipitation,wind_speed_10m',
    timezone: 'auto',
    models: model,
  });

  const url =
    `https://historical-forecast-api.open-meteo.com/v1/forecast?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${model} historical forecast failed: ${response.status}`,
    );
  }

  return (await response.json()) as HistoricalResponse;
}

async function fetchObservedWeather(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
): Promise<HistoricalResponse> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    hourly: 'temperature_2m,precipitation,wind_speed_10m',
    timezone: 'auto',
  });

  const url =
    `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Historical observation request failed: ${response.status}`,
    );
  }

  return (await response.json()) as HistoricalResponse;
}

export async function calculateHistoricalModelSkill(
  latitude: number,
  longitude: number,
): Promise<HistoricalSkillResult> {
  /*
   * Use a small recent historical window.
   *
   * This is an MVP skill calculation for the hackathon.
   * It is not intended to represent a production verification system.
   */
  const end = new Date();

  end.setUTCDate(end.getUTCDate() - 3);

  const start = new Date(end);

  start.setUTCDate(start.getUTCDate() - 3);

  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const [ecmwf, gfs, observed] = await Promise.all([
    fetchHistoricalForecast(
      latitude,
      longitude,
      'ecmwf_ifs025',
      startDate,
      endDate,
    ),

    fetchHistoricalForecast(
      latitude,
      longitude,
      'gfs_global',
      startDate,
      endDate,
    ),

    fetchObservedWeather(
      latitude,
      longitude,
      startDate,
      endDate,
    ),
  ]);

  const observedTemperature =
    observed.hourly.temperature_2m;

  const ecmwfTemperature =
    ecmwf.hourly.temperature_2m;

  const gfsTemperature =
    gfs.hourly.temperature_2m;

  const ecmwfMAE = calculateMAE(
    ecmwfTemperature,
    observedTemperature,
  );

  const gfsMAE = calculateMAE(
    gfsTemperature,
    observedTemperature,
  );

  const ecmwfRMSE = calculateRMSE(
    ecmwfTemperature,
    observedTemperature,
  );

  const gfsRMSE = calculateRMSE(
    gfsTemperature,
    observedTemperature,
  );

  const errors: ModelErrors = {
    ECMWF: ecmwfMAE,
    GFS: gfsMAE,
  };

  const skill = calculateSkillScores(errors);

  return {
    errors,
    skill,

    mae: {
      ECMWF: Number(ecmwfMAE.toFixed(2)),
      GFS: Number(gfsMAE.toFixed(2)),
    },

    rmse: {
      ECMWF: Number(ecmwfRMSE.toFixed(2)),
      GFS: Number(gfsRMSE.toFixed(2)),
    },

    sampleCount: Math.min(
      ecmwfTemperature.length,
      gfsTemperature.length,
      observedTemperature.length,
    ),
  };
}