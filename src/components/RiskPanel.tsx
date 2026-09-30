import {
  Shield, ShieldCheck, AlertTriangle, AlertOctagon, Activity,
  Sun, Wind, Eye, Droplets, Thermometer, CloudRain, Gauge,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WeatherData, Language } from '@/types';
import { assessRisk, RISK_META, getRiskLabel, getRiskRecommendation, getRiskFactorDescription, getRiskFactorLabel } from '@/lib/riskEngine';

interface Props {
  weather: WeatherData;
  lang: Language;
}

const FACTOR_ICONS: Record<string, LucideIcon> = {
  temperature: Thermometer,
  weather: CloudRain,
  wind: Wind,
  uv: Sun,
  visibility: Eye,
  airQuality: Gauge,
  humidity: Droplets,
};

const LEVEL_ICONS: Record<string, LucideIcon> = {
  'shield-check': ShieldCheck,
  shield: Shield,
  'alert-triangle': AlertTriangle,
  'alert-octagon': AlertOctagon,
};

export function RiskPanel({ weather, lang }: Props) {
  const risk = assessRisk(weather);
  const meta = RISK_META[risk.level];
  const LevelIcon = LEVEL_ICONS[meta.icon] ?? Shield;
  const recommendation = getRiskRecommendation(risk, lang);
  const riskLabel = getRiskLabel(risk.level, lang);

  return (
    <div className={`backdrop-blur-xl rounded-3xl border p-5 shadow-2xl ${meta.bgColor} ${meta.borderColor}`}>
      {/* Header with overall risk */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg`}>
          <LevelIcon size={24} className="text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Activity size={13} className="text-white/40" />
            <h3 className="text-white/50 text-xs uppercase tracking-wide font-semibold">
              {lang === 'hi' ? 'जोखिम स्तर' : lang === 'ta' ? 'ஆபத்து நிலை' : 'Risk Level'}
            </h3>
          </div>
          <p className={`text-lg font-bold ${meta.color}`}>{riskLabel}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extralight text-white">{risk.score}</span>
          <span className="text-white/40 text-xs">/100</span>
        </div>
      </div>

      {/* Risk gauge bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-white/10 mb-1">
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${meta.gradient} transition-all duration-700 ease-out`}
          style={{ width: `${risk.score}%` }}
        />
        {/* Threshold markers */}
        {[15, 35, 55, 75].map((mark) => (
          <div
            key={mark}
            className="absolute top-0 bottom-0 w-px bg-white/20"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-white/30 mb-4 px-0.5">
        <span>{lang === 'hi' ? 'सुरक्षित' : lang === 'ta' ? 'பாது' : 'Safe'}</span>
        <span>{lang === 'hi' ? 'न्यून' : lang === 'ta' ? 'குறை' : 'Low'}</span>
        <span>{lang === 'hi' ? 'मध्यम' : lang === 'ta' ? 'மித' : 'Mod'}</span>
        <span>{lang === 'hi' ? 'उच्च' : lang === 'ta' ? 'உய' : 'High'}</span>
        <span>{lang === 'hi' ? 'अत्यधिक' : lang === 'ta' ? 'அதி' : 'Extreme'}</span>
      </div>

      {/* Recommendation */}
      <div className={`rounded-2xl p-3 mb-4 border ${meta.borderColor} ${meta.bgColor}`}>
        <p className={`text-sm leading-relaxed ${meta.color}`}>{recommendation}</p>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-2">
        <h4 className="text-white/40 text-[10px] uppercase tracking-wide font-semibold mb-2">
          {lang === 'hi' ? 'जोखिम कारक' : lang === 'ta' ? 'ஆபத்து காரணிகள்' : 'Risk Factors'}
        </h4>
        {risk.factors.map((factor) => {
          const Icon = FACTOR_ICONS[factor.key] ?? Activity;
          const factorLabel = getRiskFactorLabel(factor, lang);
          const factorDesc = getRiskFactorDescription(factor, lang);
          const fColor = factor.score >= 75 ? 'text-red-400'
            : factor.score >= 50 ? 'text-orange-400'
            : factor.score >= 25 ? 'text-amber-400'
            : 'text-green-400';
          const fBg = factor.score >= 75 ? 'bg-red-500/10'
            : factor.score >= 50 ? 'bg-orange-500/10'
            : factor.score >= 25 ? 'bg-amber-500/10'
            : 'bg-green-500/10';

          return (
            <div
              key={factor.key}
              className="group flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${fBg} flex items-center justify-center`}>
                <Icon size={15} className="text-white/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white text-xs font-medium">{factorLabel}</span>
                  <span className="text-white/40 text-xs font-mono">{factor.value}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        factor.score >= 75 ? 'bg-red-500'
                        : factor.score >= 50 ? 'bg-orange-500'
                        : factor.score >= 25 ? 'bg-amber-500'
                        : 'bg-green-500'
                      }`}
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${fColor} w-7 text-right`}>{factor.score}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outdoor suitability badge */}
      <div className={`mt-4 flex items-center gap-2 p-2.5 rounded-xl border ${
        risk.outdoorSuitable
          ? 'bg-green-500/10 border-green-500/20'
          : 'bg-red-500/10 border-red-500/20'
      }`}>
        {risk.outdoorSuitable ? (
          <ShieldCheck size={16} className="text-green-400 flex-shrink-0" />
        ) : (
          <AlertOctagon size={16} className="text-red-400 flex-shrink-0" />
        )}
        <span className={`text-xs font-medium ${risk.outdoorSuitable ? 'text-green-300' : 'text-red-300'}`}>
          {risk.outdoorSuitable
            ? (lang === 'hi' ? 'बाहरी गतिविधि के लिए उपयुक्त' : lang === 'ta' ? 'வெளிப்புற செயல்பாட்டிற்கு ஏற்றது' : 'Suitable for outdoor activities')
            : (lang === 'hi' ? 'बाहरी गतिविधि के लिए अनुपयुक्त' : lang === 'ta' ? 'வெளிப்புற செயல்பாட்டிற்கு பொருத்தமற்றது' : 'Not suitable for outdoor activities')}
        </span>
      </div>
    </div>
  );
}
