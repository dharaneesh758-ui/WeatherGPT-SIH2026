import type { ForecastModel } from './types';

export interface ModelErrors {
  ECMWF?: number;
  GFS?: number;
  AI?: number;
}

export interface ModelSkill {
  ECMWF?: number;
  GFS?: number;
  AI?: number;
}

/**
 * Converts forecast error into a skill score.
 *
 * Lower MAE/RMSE = higher skill.
 *
 * skill = 1 / (error + epsilon)
 */
export function calculateSkillScores(
  errors: ModelErrors,
): ModelSkill {
  const epsilon = 0.01;

  const skill: ModelSkill = {};

  for (const model of ['ECMWF', 'GFS', 'AI'] as ForecastModel[]) {
    const error = errors[model];

    if (
      typeof error === 'number' &&
      Number.isFinite(error) &&
      error >= 0
    ) {
      skill[model] = 1 / (error + epsilon);
    }
  }

  return skill;
}

/**
 * Calculates RMSE between forecast and observed values.
 */
export function calculateRMSE(
  forecast: number[],
  observed: number[],
): number {
  const length = Math.min(
    forecast.length,
    observed.length,
  );

  if (length === 0) {
    return 0;
  }

  const squaredError = forecast
    .slice(0, length)
    .reduce((sum, value, index) => {
      const difference =
        value - observed[index];

      return (
        sum +
        difference * difference
      );
    }, 0);

  return Math.sqrt(
    squaredError / length,
  );
}

/**
 * Calculates MAE between forecast and observed values.
 */
export function calculateMAE(
  forecast: number[],
  observed: number[],
): number {
  const length = Math.min(
    forecast.length,
    observed.length,
  );

  if (length === 0) {
    return 0;
  }

  const absoluteError = forecast
    .slice(0, length)
    .reduce((sum, value, index) => {
      return (
        sum +
        Math.abs(
          value - observed[index],
        )
      );
    }, 0);

  return absoluteError / length;
}