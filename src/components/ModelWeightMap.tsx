import { MapPinned, Satellite, Wind } from 'lucide-react';

import type { ModelWeights } from '@/forecasting/types';

interface ModelWeightMapProps {
  latitude: number;
  longitude: number;
  weights: ModelWeights;
}

function getRegion(latitude: number) {
  if (latitude < 16) return 'South India';
  if (latitude < 20) return 'Central India';
  if (latitude < 25) return 'North-Central India';
  return 'North India';
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function ModelWeightMap({
  latitude,
  longitude,
  weights,
}: ModelWeightMapProps) {
  const region = getRegion(latitude);

  const ecmwf = weights.ECMWF ?? 0;
  const gfs = weights.GFS ?? 0;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-6">

      <div className="flex items-center gap-3">

        <div className="rounded-xl bg-cyan-400/10 p-3">
          <MapPinned className="h-6 w-6 text-cyan-400" />
        </div>

        <div>
          <h2 className="text-xl font-semibold">
            Model Weight Map
          </h2>

          <p className="text-sm text-white/50">
            Regional model reliability for the current location
          </p>
        </div>

      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">

        {/* INDIA VISUAL */}
        <div className="relative min-h-[300px] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800/80 to-slate-950">

          {/* Decorative India silhouette */}
          <div className="absolute left-1/2 top-1/2 h-[230px] w-[170px] -translate-x-1/2 -translate-y-1/2">

            <div
              className="absolute inset-0"
              style={{
                clipPath:
                  'polygon(42% 0%, 62% 7%, 58% 18%, 72% 28%, 67% 39%, 82% 49%, 73% 61%, 67% 76%, 57% 100%, 45% 88%, 36% 72%, 28% 62%, 20% 48%, 27% 37%, 18% 25%, 30% 16%, 28% 7%)',
                background:
                  'linear-gradient(145deg, rgba(34,211,238,0.28), rgba(15,23,42,0.95))',
                border:
                  '1px solid rgba(34,211,238,0.35)',
              }}
            />

            {/* Location marker */}
            <div
              className="absolute"
              style={{
                left: '48%',
                top: '70%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="relative">

                <div className="absolute -inset-3 animate-ping rounded-full bg-cyan-400/20" />

                <div className="relative h-4 w-4 rounded-full border-2 border-white bg-cyan-400 shadow-lg shadow-cyan-400/40" />

              </div>
            </div>

          </div>

          <div className="absolute left-4 top-4">
            <span className="rounded-full bg-black/30 px-3 py-1 text-xs text-white/60 backdrop-blur">
              INDIA
            </span>
          </div>

          <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 backdrop-blur">

            <div className="flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-cyan-400" />

              <span className="text-sm font-medium">
                {region}
              </span>
            </div>

            <p className="mt-1 text-xs text-white/40">
              {latitude.toFixed(2)}°N, {longitude.toFixed(2)}°E
            </p>

          </div>

        </div>

        {/* WEIGHTS */}
        <div className="space-y-4">

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">

            <div className="flex items-center justify-between">

              <div>
                <p className="font-semibold">
                  ECMWF
                </p>

                <p className="text-xs text-white/40">
                  European forecast model
                </p>
              </div>

              <span className="text-lg font-bold text-cyan-400">
                {percent(ecmwf)}
              </span>

            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">

              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                style={{
                  width: `${ecmwf * 100}%`,
                }}
              />

            </div>

          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">

            <div className="flex items-center justify-between">

              <div>
                <p className="font-semibold">
                  GFS
                </p>

                <p className="text-xs text-white/40">
                  Global Forecast System
                </p>
              </div>

              <span className="text-lg font-bold text-blue-300">
                {percent(gfs)}
              </span>

            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">

              <div
                className="h-full rounded-full bg-blue-300 transition-all duration-700"
                style={{
                  width: `${gfs * 100}%`,
                }}
              />

            </div>

          </div>

          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">

            <div className="flex items-center gap-3">

              <Satellite className="h-5 w-5 text-cyan-400" />

              <div>
                <p className="font-semibold">
                  Adaptive Regional Weighting
                </p>

                <p className="text-xs text-white/50">
                  Weights generated for the selected location
                </p>
              </div>

            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">

              <div>
                <p className="text-xs text-white/40">
                  Region
                </p>

                <p className="mt-1 text-sm font-medium">
                  {region}
                </p>
              </div>

              <div>
                <p className="text-xs text-white/40">
                  Lead Time
                </p>

                <p className="mt-1 text-sm font-medium">
                  24 hours
                </p>
              </div>

            </div>

          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">

            <div className="flex items-center gap-3">

              <Wind className="h-5 w-5 text-white/50" />

              <p className="text-xs leading-5 text-white/40">
                The displayed weights are produced by the
                adaptive weighting engine using historical
                skill and contextual adjustments.
              </p>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}