import type {
  ModelForecast,
  ModelWeights,
} from './types';

import type {
  ModelSkill,
} from './skillEngine';

export interface AdaptiveWeightContext {
  latitude: number;
  longitude: number;

  /**
   * Optional current conditions.
   * These are used to identify a simple weather regime.
   */
  temperature?: number;
  precipitation?: number;
  windSpeed?: number;

  /**
   * Forecast lead time in hours.
   * If omitted, it is estimated from the first forecast timestamp.
   */
  leadTimeHours?: number;
}

const DEFAULT_SKILL: ModelSkill = {
  ECMWF: 0.75,
  GFS: 0.65,
};

/**
 * Keeps heuristic adjustments small so that
 * historical verification remains the main driver.
 */
function clampFactor(
  value: number,
  min = 0.90,
  max = 1.10,
) {
  return Math.min(
    max,
    Math.max(min, value),
  );
}

/**
 * Forecast lead-time adjustment.
 *
 * MVP heuristic:
 * - Short lead times: both models remain close.
 * - Longer lead times: the adjustment becomes slightly stronger.
 *
 * These values are configurable and should eventually
 * be learned from historical lead-time verification.
 */
function getLeadTimeFactor(
  model: 'ECMWF' | 'GFS',
  leadTimeHours: number,
) {
  const lead =
    Math.max(0, leadTimeHours);

  if (lead <= 24) {
    return 1;
  }

  if (lead <= 72) {
    return model === 'ECMWF'
      ? 1.02
      : 0.99;
  }

  return model === 'ECMWF'
    ? 1.04
    : 0.97;
}

/**
 * Simple regional context.
 *
 * This identifies broad Indian geographic zones using
 * latitude/longitude. It is an MVP feature, not a
 * statistically trained regional skill map.
 */
function getRegionalFactor(
  model: 'ECMWF' | 'GFS',
  latitude: number,
  longitude: number,
) {
  const isIndia =
    latitude >= 8 &&
    latitude <= 37 &&
    longitude >= 68 &&
    longitude <= 98;

  if (!isIndia) {
    return 1;
  }

  const isCoastal =
    longitude < 73 ||
    longitude > 87;

  const isSouthernIndia =
    latitude < 16;

  if (isCoastal && isSouthernIndia) {
    return model === 'ECMWF'
      ? 1.02
      : 0.99;
  }

  if (latitude >= 20) {
    return model === 'GFS'
      ? 1.01
      : 1.00;
  }

  return 1;
}

/**
 * Seasonal context.
 *
 * Uses the current month and applies a small
 * monsoon-season adjustment for the Indian region.
 */
function getSeasonalFactor(
  model: 'ECMWF' | 'GFS',
  latitude: number,
  longitude: number,
) {
  const isIndia =
    latitude >= 8 &&
    latitude <= 37 &&
    longitude >= 68 &&
    longitude <= 98;

  if (!isIndia) {
    return 1;
  }

  const month =
    new Date().getMonth() + 1;

  // Indian southwest monsoon period.
  const monsoon =
    month >= 6 &&
    month <= 9;

  if (monsoon) {
    return model === 'ECMWF'
      ? 1.02
      : 0.99;
  }

  return 1;
}

/**
 * Detect a simple weather regime from current conditions.
 */
function getWeatherRegimeFactor(
  model: 'ECMWF' | 'GFS',
  context: AdaptiveWeightContext,
) {
  const rain =
    context.precipitation ?? 0;

  const wind =
    context.windSpeed ?? 0;

  const temperature =
    context.temperature ?? 0;

  // Wet / rainy regime
  if (rain >= 5) {
    return model === 'ECMWF'
      ? 1.02
      : 0.99;
  }

  // Strong-wind regime
  if (wind >= 30) {
    return model === 'GFS'
      ? 1.02
      : 1.00;
  }

  // High-temperature regime
  if (temperature >= 35) {
    return model === 'ECMWF'
      ? 1.01
      : 1.00;
  }

  return 1;
}

/**
 * Calculate the first forecast lead time.
 */
function estimateLeadTimeHours(
  forecast: ModelForecast,
) {
  if (!forecast.time.length) {
    return 0;
  }

  const firstForecast =
    new Date(forecast.time[0]).getTime();

  if (!Number.isFinite(firstForecast)) {
    return 0;
  }

  const now =
    Date.now();

  return Math.max(
    0,
    (firstForecast - now) /
      (1000 * 60 * 60),
  );
}

/**
 * Adaptive multi-model weighting engine.
 *
 * Main signal:
 *   Historical model skill
 *
 * Context signals:
 *   Lead time
 *   Region
 *   Season
 *   Weather regime
 *
 * Historical skill remains the dominant signal.
 */
export function calculateAdaptiveWeights(
  forecasts: ModelForecast[],
  skill: ModelSkill = DEFAULT_SKILL,
  context?: AdaptiveWeightContext,
): ModelWeights {
  if (!forecasts.length) {
    return {
      ECMWF: 0,
      GFS: 0,
      AI: 0,
    };
  }

  const safeContext: AdaptiveWeightContext =
    context ?? {
      latitude: 0,
      longitude: 0,
    };

  const scores = forecasts.map(
    (forecast) => {
      const model =
        forecast.model;

      const historicalSkill =
        skill[model] ?? 0.01;

      const leadTime =
        safeContext.leadTimeHours ??
        estimateLeadTimeHours(forecast);

      const leadFactor =
        model === 'ECMWF' ||
        model === 'GFS'
          ? getLeadTimeFactor(
              model,
              leadTime,
            )
          : 1;

      const regionalFactor =
        model === 'ECMWF' ||
        model === 'GFS'
          ? getRegionalFactor(
              model,
              safeContext.latitude,
              safeContext.longitude,
            )
          : 1;

      const seasonalFactor =
        model === 'ECMWF' ||
        model === 'GFS'
          ? getSeasonalFactor(
              model,
              safeContext.latitude,
              safeContext.longitude,
            )
          : 1;

      const regimeFactor =
        model === 'ECMWF' ||
        model === 'GFS'
          ? getWeatherRegimeFactor(
              model,
              safeContext,
            )
          : 1;

      const combinedContextFactor =
        clampFactor(
          leadFactor *
            regionalFactor *
            seasonalFactor *
            regimeFactor,
        );

      const finalScore =
        historicalSkill *
        combinedContextFactor;

      return {
        model,
        score: finalScore,
      };
    },
  );

  const total =
    scores.reduce(
      (sum, item) =>
        sum + item.score,
      0,
    );

  if (total <= 0) {
    const equalWeight =
      1 / scores.length;

    return Object.fromEntries(
        scores.map((item) => [
            item.model,
            equalWeight,
        ])
    ) as unknown as ModelWeights;
  }

  const result: ModelWeights = {
    ECMWF: 0,
    GFS: 0,
    AI: 0,
  };

  for (const item of scores) {
    result[item.model] =
      item.score / total;
  }

  return result;
}