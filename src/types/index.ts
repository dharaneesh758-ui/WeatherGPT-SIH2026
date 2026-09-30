export interface GeoLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  population?: number;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  pressure: number;
  pressureMsl: number;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  visibility: number;
  uvIndex: number;
  isDay: boolean;
  time: string;
  dewPoint: number;
  cape: number;
}

export interface HourlyForecast {
  time: string[];
  temperature: number[];
  precipitationProbability: number[];
  weatherCode: number[];
  windSpeed: number[];
  windGusts: number[];
  relativeHumidity: number[];
  apparentTemperature: number[];
  uvIndex: number[];
  visibility: number[];
  dewPoint: number[];
  precipitation: number[];
  pressureMsl: number[];
  cape: number[];
}

export interface DailyForecast {
  time: string[];
  weatherCode: number[];
  tempMax: number[];
  tempMin: number[];
  apparentTempMax: number[];
  apparentTempMin: number[];
  precipitationProbability: number[];
  windSpeedMax: number[];
  windGustsMax: number[];
  sunrise: string[];
  sunset: string[];
  precipitationSum: number[];
  rainSum: number[];
  showersSum: number[];
  snowfallSum: number[];
  uvIndexMax: number[];
}

export interface AirQuality {
  time: string[];
  pm10: number[];
  pm2_5: number[];
  carbonMonoxide: number[];
  nitrogenDioxide: number[];
  ozone: number[];
  europeanAqi: number[];
  usAqi: number[];
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast;
  daily: DailyForecast;
  airQuality?: AirQuality;
  location: GeoLocation;
  timezone: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  language?: Language;
}

export type Language = 'en' | 'hi' | 'ta';

export interface WeatherAlert {
  level: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  admin1?: string;
}

export type RiskLevel = 'safe' | 'low' | 'moderate' | 'high' | 'extreme';

export interface RiskFactor {
  key: string;
  label: string;
  labelHi: string;
  labelTa: string;
  value: string;
  score: number;
  weight: number;
  description: string;
  descriptionHi: string;
  descriptionTa: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  factors: RiskFactor[];
  recommendation: string;
  recommendationHi: string;
  recommendationTa: string;
  outdoorSuitable: boolean;
}
