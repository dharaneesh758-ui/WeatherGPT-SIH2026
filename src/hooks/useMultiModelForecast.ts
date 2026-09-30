import { useCallback, useEffect, useState } from 'react';

import { getMultiModelForecast } from '@/forecasting/forecastSources';
import { calculateHistoricalModelSkill } from '@/forecasting/historicalSkill';

import {
  calculateAdaptiveWeights,
  type AdaptiveWeightContext,
} from '@/forecasting/weightEngine';

import { blendForecasts } from '@/forecasting/blendingEngine';

import type {
  BlendedForecast,
  ModelForecast,
  ModelWeights,
} from '@/forecasting/types';

interface HistoricalMetrics {
  mae: {
    ECMWF: number;
    GFS: number;
  };

  rmse: {
    ECMWF: number;
    GFS: number;
  };

  skill: {
    ECMWF?: number;
    GFS?: number;
    AI?: number;
  };

  sampleCount: number;
}

interface UseMultiModelForecastState {
  forecasts: ModelForecast[];
  blendedForecast: BlendedForecast | null;
  weights: ModelWeights;
  historicalMetrics: HistoricalMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useMultiModelForecast(
  latitude: number | null,
  longitude: number | null,
): UseMultiModelForecastState {
  const [forecasts, setForecasts] =
    useState<ModelForecast[]>([]);

  const [blendedForecast, setBlendedForecast] =
    useState<BlendedForecast | null>(null);

  const [weights, setWeights] =
    useState<ModelWeights>({
      AI: 0,
      ECMWF: 0,
      GFS: 0,
    });

  const [historicalMetrics, setHistoricalMetrics] =
    useState<HistoricalMetrics | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [refreshKey, setRefreshKey] =
    useState(0);

  /*
   * ---------------------------------------------------------
   * REFRESH
   * ---------------------------------------------------------
   */

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD MULTI-MODEL FORECAST
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      latitude === null ||
      longitude === null
    ) {
      setForecasts([]);

      setBlendedForecast(null);

      setWeights({
        AI: 0,
        ECMWF: 0,
        GFS: 0,
      });

      setHistoricalMetrics(null);

      setError(null);

      setLoading(false);

      return;
    }

    const lat: number = latitude;
    const lon: number = longitude;

    let cancelled = false;

    async function loadForecasts() {
      try {
        setLoading(true);
        setError(null);

        /*
         * Fetch:
         *
         * 1. ECMWF + GFS forecasts
         * 2. Historical verification metrics
         *
         * Both operations run in parallel.
         */

        const [
          modelForecasts,
          historicalSkill,
        ] = await Promise.all([
          getMultiModelForecast(
            lat,
            lon,
          ),

          calculateHistoricalModelSkill(
            lat,
            lon,
          ),
        ]);

        if (cancelled) {
          return;
        }

        /*
         * ---------------------------------------------------
         * ADAPTIVE WEIGHT CONTEXT
         * ---------------------------------------------------
         *
         * The weighting engine now considers:
         *
         * - Historical model skill
         * - Forecast lead time
         * - Geographic region
         * - Season
         * - Current weather regime
         */

        const firstForecast =
          modelForecasts[0];

        const firstIndex = 0;

        const adaptiveContext:
          AdaptiveWeightContext = {
            /*
             * Geographic context
             */
            latitude: lat,
            longitude: lon,

            /*
             * Current forecast conditions
             *
             * These are used by the weather-regime
             * adjustment inside weightEngine.ts.
             */

            temperature:
              firstForecast?.temperature[
                firstIndex
              ],

            precipitation:
              firstForecast?.precipitation[
                firstIndex
              ],

            windSpeed:
              firstForecast?.windSpeed[
                firstIndex
              ],

            /*
             * Current MVP evaluates the
             * 24-hour forecast horizon.
             *
             * Later this can become:
             * 6h / 12h / 24h / 48h / 72h
             * with separate model weights.
             */

            leadTimeHours: 24,
          };

        /*
         * ---------------------------------------------------
         * CALCULATE ADAPTIVE MODEL WEIGHTS
         * ---------------------------------------------------
         */

        const adaptiveWeights =
          calculateAdaptiveWeights(
            modelForecasts,

            {
              /*
               * AI remains 0 because the LLM is not
               * being treated as an NWP forecast model.
               */

              AI:
                historicalSkill.skill.AI ??
                0,

              /*
               * Historical ECMWF skill
               */

              ECMWF:
                historicalSkill.skill.ECMWF ??
                0,

              /*
               * Historical GFS skill
               */

              GFS:
                historicalSkill.skill.GFS ??
                0,
            },

            adaptiveContext,
          );

        if (cancelled) {
          return;
        }

        /*
         * ---------------------------------------------------
         * BLEND THE FORECASTS
         * ---------------------------------------------------
         *
         * ECMWF + GFS
         *        ↓
         * Adaptive weights
         *        ↓
         * Blended forecast
         */

        const blended =
          blendForecasts(
            modelForecasts,
            adaptiveWeights,
          );

        if (cancelled) {
          return;
        }

        /*
         * ---------------------------------------------------
         * UPDATE STATE
         * ---------------------------------------------------
         */

        setForecasts(
          modelForecasts,
        );

        setWeights(
          adaptiveWeights,
        );

        setBlendedForecast(
          blended,
        );

        /*
         * Historical verification data
         */

        setHistoricalMetrics({
          mae: historicalSkill.mae,

          rmse: historicalSkill.rmse,

          skill:
            historicalSkill.skill,

          sampleCount:
            historicalSkill.sampleCount,
        });

      } catch (err) {
        if (cancelled) {
          return;
        }

        /*
         * Reset forecast state
         * when an API/calculation fails.
         */

        setForecasts([]);

        setBlendedForecast(null);

        setWeights({
          AI: 0,
          ECMWF: 0,
          GFS: 0,
        });

        setHistoricalMetrics(null);

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load multi-model forecast',
        );

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadForecasts();

    /*
     * Cleanup prevents an old request from
     * updating state after location changes.
     */

    return () => {
      cancelled = true;
    };

  }, [
    latitude,
    longitude,
    refreshKey,
  ]);

  /*
   * ---------------------------------------------------------
   * RETURN HOOK STATE
   * ---------------------------------------------------------
   */

  return {
    forecasts,
    blendedForecast,
    weights,
    historicalMetrics,
    loading,
    error,
    refresh,
  };
}