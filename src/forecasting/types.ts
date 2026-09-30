export type ForecastModel =
  | 'ECMWF'
  | 'GFS'
  | 'AI';

export interface ModelForecast {
  model: ForecastModel;
  temperature: number[];
  precipitation: number[];
  windSpeed: number[];
  time: string[];
}

export interface ModelWeights {
  ECMWF: number;
  GFS: number;
  AI: number;
}

export interface BlendedForecast {
  time: string[];
  temperature: number[];
  precipitation: number[];
  windSpeed: number[];
  weights: ModelWeights;
}