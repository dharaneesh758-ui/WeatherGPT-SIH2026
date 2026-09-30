import {
  BarChart3,
  CloudRain,
  GitMerge,
  MapPin,
  Thermometer,
  Wind,
} from 'lucide-react';

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

interface ModelComparisonProps {
  forecasts: ModelForecast[];
  blendedForecast: BlendedForecast | null;
  weights: ModelWeights;
  historicalMetrics: HistoricalMetrics | null;
  loading?: boolean;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function ModelComparison({
  forecasts,
  blendedForecast,
  weights,
  historicalMetrics,
  loading = false,
}: ModelComparisonProps) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-cyan-400/10" />

          <div>
            <div className="h-5 w-56 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-white/5" />
          </div>
        </div>

        <div className="mt-6 h-32 animate-pulse rounded-xl bg-white/5" />
      </section>
    );
  }

  if (!forecasts.length || !blendedForecast) {
    return null;
  }

  const ecmwfWeight = weights.ECMWF ?? 0;
  const gfsWeight = weights.GFS ?? 0;

  const totalDisplayedWeight =
    ecmwfWeight + gfsWeight;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-cyan-400/10 p-3">
          <GitMerge className="h-6 w-6 text-cyan-400" />
        </div>

        <div>
          <h2 className="text-xl font-semibold">
            Hybrid Multi-Model Forecast
          </h2>

          <p className="text-sm text-white/50">
            Historical skill-based adaptive blending
          </p>
        </div>
      </div>

      {/* MODEL CARDS */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">

        {forecasts.map((forecast) => {
          const weight =
            weights[forecast.model] ?? 0;

          const index = 0;

          return (
            <div
              key={forecast.model}
              className="rounded-xl border border-white/10 bg-slate-950/30 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {forecast.model}
                </h3>

                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                  {formatPercent(weight)} weight
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-4">

                <div>
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Thermometer className="h-4 w-4" />
                    Temp
                  </div>

                  <p className="mt-2 font-semibold">
                    {forecast.temperature[index]?.toFixed(1) ?? '--'}°C
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <CloudRain className="h-4 w-4" />
                    Rain
                  </div>

                  <p className="mt-2 font-semibold">
                    {forecast.precipitation[index]?.toFixed(1) ?? '--'} mm
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Wind className="h-4 w-4" />
                    Wind
                  </div>

                  <p className="mt-2 font-semibold">
                    {forecast.windSpeed[index]?.toFixed(1) ?? '--'} km/h
                  </p>
                </div>

              </div>
            </div>
          );
        })}

      </div>

      {/* ADAPTIVE WEIGHT DRIVERS */}
      <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">

        <div className="flex items-center gap-3">

          <div className="rounded-lg bg-cyan-400/10 p-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
          </div>

          <div>
            <h3 className="font-semibold">
              Adaptive Weight Engine
            </h3>

            <p className="text-sm text-white/50">
              Current MVP weighting driver
            </p>
          </div>

        </div>

        <div className="mt-5">

          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-white/60">
              Historical model skill
            </span>

            <span className="font-semibold text-cyan-400">
              Active
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{
                width: '100%',
              }}
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-white/40">
            Model weights are currently calculated from
            historical temperature verification using MAE-based
            skill scores.
          </p>

        </div>

        {/* FUTURE CONTEXT SIGNALS */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-white/40">
              Forecast Lead Time
            </p>

            <p className="mt-1 text-sm font-medium">
              Ready for integration
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-white/40">
              Region
            </p>

            <p className="mt-1 text-sm font-medium">
              Location-aware
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-white/40">
              Season
            </p>

            <p className="mt-1 text-sm font-medium">
              Context available
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-white/40">
              Weather Regime
            </p>

            <p className="mt-1 text-sm font-medium">
              Risk engine available
            </p>
          </div>

        </div>

      </div>

      {/* HISTORICAL PERFORMANCE */}
      {historicalMetrics && (
        <div className="mt-5 rounded-xl border border-white/10 p-5">

          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-cyan-400" />

            <div>
              <h3 className="font-semibold">
                Historical Model Performance
              </h3>

              <p className="text-sm text-white/40">
                Temperature verification
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">

            <div className="rounded-xl bg-white/5 p-4">

              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  ECMWF
                </span>

                <span className="text-cyan-400">
                  Skill{' '}
                  {historicalMetrics.skill.ECMWF?.toFixed(2) ?? '--'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">

                <div>
                  <p className="text-sm text-white/40">
                    MAE
                  </p>

                  <p className="font-semibold">
                    {historicalMetrics.mae.ECMWF.toFixed(1)}°C
                  </p>
                </div>

                <div>
                  <p className="text-sm text-white/40">
                    RMSE
                  </p>

                  <p className="font-semibold">
                    {historicalMetrics.rmse.ECMWF.toFixed(1)}°C
                  </p>
                </div>

              </div>

            </div>

            <div className="rounded-xl bg-white/5 p-4">

              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  GFS
                </span>

                <span className="text-cyan-400">
                  Skill{' '}
                  {historicalMetrics.skill.GFS?.toFixed(2) ?? '--'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">

                <div>
                  <p className="text-sm text-white/40">
                    MAE
                  </p>

                  <p className="font-semibold">
                    {historicalMetrics.mae.GFS.toFixed(1)}°C
                  </p>
                </div>

                <div>
                  <p className="text-sm text-white/40">
                    RMSE
                  </p>

                  <p className="font-semibold">
                    {historicalMetrics.rmse.GFS.toFixed(1)}°C
                  </p>
                </div>

              </div>

            </div>

          </div>

          <p className="mt-4 text-sm text-white/40">
            Verification samples: {historicalMetrics.sampleCount}
          </p>

        </div>
      )}

      {/* BLENDED FORECAST */}
      <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="font-semibold">
              Blended Forecast
            </h3>

            <p className="text-sm text-white/40">
              Adaptive weighted combination
            </p>
          </div>

          <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-400">
            HYBRID
          </span>

        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-3">

          <div>
            <p className="text-sm text-white/40">
              Temperature
            </p>

            <p className="mt-2 text-xl font-bold">
              {blendedForecast.temperature[0]?.toFixed(1) ?? '--'}°C
            </p>
          </div>

          <div>
            <p className="text-sm text-white/40">
              Rainfall
            </p>

            <p className="mt-2 text-xl font-bold">
              {blendedForecast.precipitation[0]?.toFixed(1) ?? '--'} mm
            </p>
          </div>

          <div>
            <p className="text-sm text-white/40">
              Wind
            </p>

            <p className="mt-2 text-xl font-bold">
              {blendedForecast.windSpeed[0]?.toFixed(1) ?? '--'} km/h
            </p>
          </div>

        </div>

      </div>

      {/* PROCESS FLOW */}
      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-5">

        <h3 className="font-semibold">
          Forecast Blending Workflow
        </h3>

        <div className="mt-4 grid gap-3 md:grid-cols-4">

          <div className="rounded-lg border border-white/10 p-3 text-center">
            <p className="text-xs text-white/40">
              STEP 1
            </p>

            <p className="mt-1 text-sm font-semibold">
              ECMWF + GFS
            </p>
          </div>

          <div className="rounded-lg border border-white/10 p-3 text-center">
            <p className="text-xs text-white/40">
              STEP 2
            </p>

            <p className="mt-1 text-sm font-semibold">
              Historical Skill
            </p>
          </div>

          <div className="rounded-lg border border-white/10 p-3 text-center">
            <p className="text-xs text-white/40">
              STEP 3
            </p>

            <p className="mt-1 text-sm font-semibold">
              Adaptive Weights
            </p>
          </div>

          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 text-center">
            <p className="text-xs text-cyan-400">
              STEP 4
            </p>

            <p className="mt-1 text-sm font-semibold">
              Blended Forecast
            </p>
          </div>

        </div>

      </div>

      {/* WEIGHT SUMMARY */}
      <div className="mt-5 flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">

        <div className="flex items-center gap-2 text-sm text-white/50">
          <MapPin className="h-4 w-4" />
          Current location adaptive blend
        </div>

        <div className="text-sm font-semibold">
          ECMWF {formatPercent(ecmwfWeight)}
          {' · '}
          GFS {formatPercent(gfsWeight)}
        </div>

      </div>

    </section>
  );
}