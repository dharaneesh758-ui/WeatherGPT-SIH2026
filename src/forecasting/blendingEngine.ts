import type {
  ModelForecast,
  ModelWeights,
  BlendedForecast,
} from './types';

export function blendForecasts(
  forecasts: ModelForecast[],
  weights: ModelWeights,
): BlendedForecast {
  if (forecasts.length === 0) {
    throw new Error(
      'No forecast models available.',
    );
  }

  const reference =
    forecasts[0];

  const temperature =
    reference.temperature.map(
      (_, index) => {
        let value = 0;

        const ecmwf =
          forecasts.find(
            (f) => f.model === 'ECMWF',
          );

        const gfs =
          forecasts.find(
            (f) => f.model === 'GFS',
          );

        if (ecmwf) {
          value +=
            ecmwf.temperature[index] *
            weights.ECMWF;
        }

        if (gfs) {
          value +=
            gfs.temperature[index] *
            weights.GFS;
        }

        return Number(
          value.toFixed(2),
        );
      },
    );

  const precipitation =
    reference.precipitation.map(
      (_, index) => {
        let value = 0;

        const ecmwf =
          forecasts.find(
            (f) => f.model === 'ECMWF',
          );

        const gfs =
          forecasts.find(
            (f) => f.model === 'GFS',
          );

        if (ecmwf) {
          value +=
            ecmwf.precipitation[index] *
            weights.ECMWF;
        }

        if (gfs) {
          value +=
            gfs.precipitation[index] *
            weights.GFS;
        }

        return Number(
          value.toFixed(2),
        );
      },
    );

  const windSpeed =
    reference.windSpeed.map(
      (_, index) => {
        let value = 0;

        const ecmwf =
          forecasts.find(
            (f) => f.model === 'ECMWF',
          );

        const gfs =
          forecasts.find(
            (f) => f.model === 'GFS',
          );

        if (ecmwf) {
          value +=
            ecmwf.windSpeed[index] *
            weights.ECMWF;
        }

        if (gfs) {
          value +=
            gfs.windSpeed[index] *
            weights.GFS;
        }

        return Number(
          value.toFixed(2),
        );
      },
    );

  return {
    time: reference.time,
    temperature,
    precipitation,
    windSpeed,
    weights,
  };
}