import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import type { GeoLocation } from '@/types';
import { searchLocations } from '@/lib/weatherApi';
import { t } from '@/lib/i18n';
import type { Language } from '@/types';

interface Props {
  onSelect: (location: GeoLocation) => void;
  lang: Language;
}

export function SearchBar({ onSelect, lang }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const locs = await searchLocations(query);
        setResults(locs);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (loc: GeoLocation) => {
    onSelect(loc);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={t('searchPlaceholder', lang)}
          className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-full pl-11 pr-10 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-all"
        />
        {loading && <Loader2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 animate-spin" />}
        {!loading && query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.map((loc) => (
            <button
              key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
              onClick={() => handleSelect(loc)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
            >
              <MapPin size={16} className="text-white/40 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{loc.name}</p>
                <p className="text-white/50 text-xs truncate">
                  {[loc.admin1, loc.country].filter(Boolean).join(', ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
