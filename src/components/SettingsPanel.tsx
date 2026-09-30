import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Star, Navigation, X } from 'lucide-react';
import type { GeoLocation, SavedLocation, Language } from '@/types';
import { t } from '@/lib/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  currentLocation: GeoLocation | null;
  savedLocations: SavedLocation[];
  onSaveCurrent: () => void;
  onRemove: (id: string) => void;
  onSelect: (loc: SavedLocation) => void;
  onUseGeolocation: () => void;
  geoLoading: boolean;
  lang: Language;
}

export function SettingsPanel({
  open, onClose, currentLocation, savedLocations, onSaveCurrent, onRemove, onSelect, onUseGeolocation, geoLoading, lang,
}: Props) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 z-50 overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">{t('settings', lang)}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Geolocation */}
          <section>
            <h3 className="text-white/50 text-xs uppercase tracking-wide font-semibold mb-3">{t('search', lang)}</h3>
            <button
              onClick={onUseGeolocation}
              disabled={geoLoading}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-cyan-500/15 border border-cyan-400/25 text-cyan-200 hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
            >
              <Navigation size={18} />
              <span className="text-sm font-medium">{geoLoading ? '...' : 'GPS'}</span>
            </button>
          </section>

          {/* Saved locations */}
          <section>
            <h3 className="text-white/50 text-xs uppercase tracking-wide font-semibold mb-3">{t('saved', lang)}</h3>
            {currentLocation && (
              <button
                onClick={onSaveCurrent}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors mb-2"
              >
                <Plus size={18} className="text-white/60" />
                <span className="text-white/80 text-sm">{t('addLocation', lang)}</span>
                <span className="text-white/40 text-xs ml-auto truncate">{currentLocation.name}</span>
              </button>
            )}
            {savedLocations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Star size={24} className="text-white/20" />
                <p className="text-white/40 text-sm">{t('noSavedLocations', lang)}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {savedLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                  >
                    <button onClick={() => onSelect(loc)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <MapPin size={16} className="text-white/40 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{loc.name}</p>
                        <p className="text-white/40 text-xs truncate">{[loc.admin1, loc.country].filter(Boolean).join(', ')}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => onRemove(loc.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
