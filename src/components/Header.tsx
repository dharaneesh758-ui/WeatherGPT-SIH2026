import { Cloud, LayoutDashboard, MessageSquare, Settings, Globe, Thermometer } from 'lucide-react';
import type { Language } from '@/types';
import { LANGUAGES, t } from '@/lib/i18n';

interface Props {
  view: 'dashboard' | 'chat';
  onViewChange: (view: 'dashboard' | 'chat') => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  unit: 'celsius' | 'fahrenheit';
  onUnitChange: (unit: 'celsius' | 'fahrenheit') => void;
  onOpenSettings: () => void;
}

export function Header({ view, onViewChange, lang, onLangChange, unit, onUnitChange, onOpenSettings }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/50 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <Cloud size={26} className="text-cyan-400" strokeWidth={1.5} />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-white font-bold text-lg leading-none">WeatherGPT</h1>
            <p className="text-white/40 text-[10px] leading-none mt-0.5">{t('tagline', lang)}</p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/10 mx-auto sm:mx-0">
          <button
            onClick={() => onViewChange('dashboard')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              view === 'dashboard'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <LayoutDashboard size={15} />
            <span className="hidden sm:inline">{t('dashboard', lang)}</span>
          </button>
          <button
            onClick={() => onViewChange('chat')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              view === 'chat'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <MessageSquare size={15} />
            <span className="hidden sm:inline">{t('chat', lang)}</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
          {/* Language selector */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm">
              <Globe size={15} />
              <span className="hidden sm:inline">{LANGUAGES[lang].nativeLabel}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {(Object.entries(LANGUAGES) as [Language, typeof LANGUAGES[Language]][]).map(([code, info]) => (
                <button
                  key={code}
                  onClick={() => onLangChange(code)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                    lang === code ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{info.flag}</span>
                  <span>{info.nativeLabel}</span>
                  <span className="text-white/30 text-xs ml-auto">{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Unit toggle */}
          <button
            onClick={() => onUnitChange(unit === 'celsius' ? 'fahrenheit' : 'celsius')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
            title={unit === 'celsius' ? t('celsius', lang) : t('fahrenheit', lang)}
          >
            <Thermometer size={15} />
            <span>°{unit === 'celsius' ? 'C' : 'F'}</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
