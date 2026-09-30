import type { WeatherData, Language, RiskAssessment, RiskFactor, RiskLevel } from '@/types';

function getCurrentHourIndex(times: string[]): number {
  const now = new Date();
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    if (t.getHours() === now.getHours() && t.getDate() === now.getDate()) return i;
  }
  return 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function scoreFromRange(value: number, thresholds: [number, number, number, number]): number {
  // Returns 0-100 based on where value falls relative to thresholds
  // [safe, low, moderate, high] — anything beyond high is 100
  if (value <= thresholds[0]) return 0;
  if (value <= thresholds[1]) return ((value - thresholds[0]) / (thresholds[1] - thresholds[0])) * 25;
  if (value <= thresholds[2]) return 25 + ((value - thresholds[1]) / (thresholds[2] - thresholds[1])) * 25;
  if (value <= thresholds[3]) return 50 + ((value - thresholds[2]) / (thresholds[3] - thresholds[2])) * 25;
  return 75 + clamp(((value - thresholds[3]) / thresholds[3]) * 25, 0, 25);
}

export function assessRisk(weather: WeatherData): RiskAssessment {
  const c = weather.current;
  const factors: RiskFactor[] = [];

  // Temperature risk
  let tempScore = 0;
  if (c.temperature >= 42) tempScore = 100;
  else if (c.temperature >= 38) tempScore = 75;
  else if (c.temperature >= 35) tempScore = 50;
  else if (c.temperature >= 30) tempScore = 25;
  else if (c.temperature <= -5) tempScore = 100;
  else if (c.temperature <= 0) tempScore = 65;
  else if (c.temperature <= 5) tempScore = 40;
  else if (c.temperature <= 10) tempScore = 20;

  factors.push({
    key: 'temperature',
    label: 'Temperature',
    labelHi: 'तापमान',
    labelTa: 'வெப்பநிலை',
    value: `${Math.round(c.temperature)}°C`,
    score: tempScore,
    weight: 1.2,
    description: tempScore >= 75
      ? 'Dangerous temperature — risk of heatstroke or hypothermia'
      : tempScore >= 50
      ? 'Extreme temperature — limit outdoor exposure'
      : tempScore >= 25
      ? 'Uncomfortable temperature — take precautions'
      : 'Comfortable temperature range',
    descriptionHi: tempScore >= 75
      ? 'खतरनाक तापमान — हीटस्ट्रोक या हाइपोथर्मिया का जोखिम'
      : tempScore >= 50
      ? 'अत्यधिक तापमान — बाहरी गतिविधि सीमित करें'
      : tempScore >= 25
      ? 'असहज तापमान — सावधानी बरतें'
      : 'सुखद तापमान',
    descriptionTa: tempScore >= 75
      ? 'ஆபத்தான வெப்பநிலை — வெப்பஅதிர்ச்சி அபாயம்'
      : tempScore >= 50
      ? 'மிக அதிக வெப்பநிலை — வெளிப்புற செயல்பாடு குறைக்கவும்'
      : tempScore >= 25
      ? 'அசௌகரியமான வெப்பநிலை — முன்னெச்சரிக்கை'
      : 'இதமான வெப்பநிலை',
  });

  // Weather code risk (thunderstorm, heavy rain, snow, etc.)
  const code = c.weatherCode;
  let codeScore = 0;
  if (code >= 95) codeScore = 100;
  else if (code === 82 || code === 86 || code === 65 || code === 67) codeScore = 70;
  else if (code === 75) codeScore = 65;
  else if (code >= 61) codeScore = 45;
  else if (code >= 51) codeScore = 25;
  else if (code >= 71) codeScore = 40;
  else if (code === 45 || code === 48) codeScore = 20;
  else if (code === 3) codeScore = 10;

  const codeLabel = code >= 95 ? 'Thunderstorm' : code >= 61 ? 'Rain' : code >= 51 ? 'Drizzle' : code >= 71 ? 'Snow' : code === 45 || code === 48 ? 'Fog' : code === 3 ? 'Overcast' : 'Clear';

  factors.push({
    key: 'weather',
    label: 'Weather Condition',
    labelHi: 'मौसम स्थिति',
    labelTa: 'வானிலை நிலை',
    value: codeLabel,
    score: codeScore,
    weight: 1.5,
    description: codeScore >= 75
      ? 'Severe weather — avoid outdoor activities'
      : codeScore >= 50
      ? 'Hazardous precipitation — exercise caution'
      : codeScore >= 25
      ? 'Light precipitation — minor inconvenience'
      : 'Favorable weather conditions',
    descriptionHi: codeScore >= 75
      ? 'भारी मौसम — बाहरी गतिविधियां टालें'
      : codeScore >= 50
      ? 'खतरनाक वर्षा — सावधानी रखें'
      : codeScore >= 25
      ? 'हल्की वर्षा — मामूली असुविधा'
      : 'अनुकूल मौसम',
    descriptionTa: codeScore >= 75
      ? 'கடும் வானிலை — வெளிப்புற செயல்பாடு தவிர்க்கவும்'
      : codeScore >= 50
      ? 'ஆபத்தான மழை — கவனம் தேவை'
      : codeScore >= 25
      ? 'மெல்லிய மழை — சிறிய சிரமம்'
      : 'சாதகமான வானிலை',
  });

  // Wind risk — use the higher of sustained wind or gusts (gusts cause more damage)
  const effectiveWind = Math.max(c.windSpeed, c.windGusts ?? 0);
  const windScore = scoreFromRange(effectiveWind, [20, 35, 50, 75]);

  factors.push({
    key: 'wind',
    label: 'Wind & Gusts',
    labelHi: 'हवा और झोंके',
    labelTa: 'காற்று மற்றும் திடீர் காற்று',
    value: `${Math.round(c.windSpeed)} km/h (gusts ${Math.round(c.windGusts ?? 0)})`,
    score: windScore,
    weight: 1.0,
    description: windScore >= 75
      ? 'Destructive winds — structural damage possible'
      : windScore >= 50
      ? 'Strong winds with dangerous gusts — unsafe for outdoor activities'
      : windScore >= 25
      ? 'Moderate winds with gusts — use caution'
      : 'Calm to breezy conditions',
    descriptionHi: windScore >= 75
      ? 'विनाशकारी हवाएं — संरचनात्मक नुकसान संभव'
      : windScore >= 50
      ? 'तेज हवा और खतरनाक झोंके — बाहरी गतिविधि असुरक्षित'
      : windScore >= 25
      ? 'मध्यम हवा और झोंके — सावधानी रखें'
      : 'शांत से हल्की हवा',
    descriptionTa: windScore >= 75
      ? 'அழிவு காற்று — கட்டமைப்பு சேதம் சாத்தியம்'
      : windScore >= 50
      ? 'வலுவான காற்று மற்றும் ஆபத்தான திடீர் காற்று — வெளிப்புற செயல்பாடு பாதுகாப்பற்றது'
      : windScore >= 25
      ? 'மிதமான காற்று மற்றும் திடீர் காற்று — கவனம் தேவை'
      : 'அமைதியான காற்று',
  });

  // UV risk
  let uvScore = 0;
  if (c.uvIndex >= 11) uvScore = 100;
  else if (c.uvIndex >= 8) uvScore = 70;
  else if (c.uvIndex >= 6) uvScore = 50;
  else if (c.uvIndex >= 3) uvScore = 25;
  else uvScore = 0;

  factors.push({
    key: 'uv',
    label: 'UV Index',
    labelHi: 'यूवी सूचकांक',
    labelTa: 'யுவி குறியீடு',
    value: `${c.uvIndex}`,
    score: uvScore,
    weight: 0.8,
    description: uvScore >= 70
      ? 'Extreme UV — sunburn within minutes'
      : uvScore >= 50
      ? 'High UV — sunscreen and shade essential'
      : uvScore >= 25
      ? 'Moderate UV — protection recommended'
      : 'Low UV — minimal risk',
    descriptionHi: uvScore >= 70
      ? 'अत्यधिक यूवी — कुछ मिनटों में धूप में जलन'
      : uvScore >= 50
      ? 'उच्च यूवी — सनस्क्रीन और छाया आवश्यक'
      : uvScore >= 25
      ? 'मध्यम यूवी — सुरक्षा अनुशंसित'
      : 'न्यून यूवी — न्यूनतम जोखिम',
    descriptionTa: uvScore >= 70
      ? 'அதிக யுவி — நிமிடங்களில் சூரிய எரிச்சல்'
      : uvScore >= 50
      ? 'உயர் யுவி — சன்ஸ்கிரீன் மற்றும் நிழல் அவசியம்'
      : uvScore >= 25
      ? 'மிதமான யுவி — பாதுகாப்பு பரிந்துரைக்கப்படுகிறது'
      : 'குறைந்த யுவி — குறைந்த ஆபத்து',
  });

  // Visibility risk
  const visKm = c.visibility / 1000;
  let visScore = 0;
  if (visKm <= 1) visScore = 90;
  else if (visKm <= 2) visScore = 70;
  else if (visKm <= 5) visScore = 40;
  else if (visKm <= 10) visScore = 15;

  factors.push({
    key: 'visibility',
    label: 'Visibility',
    labelHi: 'दृश्यता',
    labelTa: 'பார்வை',
    value: `${visKm.toFixed(1)} km`,
    score: visScore,
    weight: 0.7,
    description: visScore >= 70
      ? 'Very poor visibility — driving hazardous'
      : visScore >= 40
      ? 'Reduced visibility — drive with caution'
      : visScore >= 15
      ? 'Slightly reduced visibility'
      : 'Good visibility',
    descriptionHi: visScore >= 70
      ? 'बहुत खराब दृश्यता — ड्राइविंग खतरनाक'
      : visScore >= 40
      ? 'कम दृश्यता — सावधानी से चलाएं'
      : visScore >= 15
      ? 'थोड़ी कम दृश्यता'
      : 'अच्छी दृश्यता',
    descriptionTa: visScore >= 70
      ? 'மிக மோசமான பார்வை — வாகனம் ஆபத்தானது'
      : visScore >= 40
      ? 'குறைந்த பார்வை — கவனமாக ஓட்டவும்'
      : visScore >= 15
      ? 'சற்று குறைந்த பார்வை'
      : 'நல்ல பார்வை',
  });

  // Air quality risk
  if (weather.airQuality) {
    const idx = getCurrentHourIndex(weather.airQuality.time);
    const aqi = weather.airQuality.usAqi?.[idx] ?? weather.airQuality.europeanAqi?.[idx] ?? 0;
    const aqiScore = clamp((aqi / 300) * 100, 0, 100);

    factors.push({
      key: 'airQuality',
      label: 'Air Quality',
      labelHi: 'वायु गुणवत्ता',
      labelTa: 'காற்று தரம்',
      value: `${Math.round(aqi)} AQI`,
      score: aqiScore,
      weight: 0.9,
      description: aqiScore >= 67
        ? 'Hazardous air — avoid outdoor exertion'
        : aqiScore >= 50
        ? 'Very unhealthy air — wear a mask'
        : aqiScore >= 33
        ? 'Unhealthy air — sensitive groups at risk'
        : aqiScore >= 17
        ? 'Moderate air quality'
        : 'Good air quality',
      descriptionHi: aqiScore >= 67
        ? 'खतरनाक वायु — बाहरी परिश्रम से बचें'
        : aqiScore >= 50
        ? 'बहुत अस्वस्थ वायु — मास्क पहनें'
        : aqiScore >= 33
        ? 'अस्वस्थ वायु — संवेदनशील लोग जोखिम में'
        : aqiScore >= 17
        ? 'मध्यम वायु गुणवत्ता'
        : 'अच्छी वायु गुणवत्ता',
      descriptionTa: aqiScore >= 67
        ? 'ஆபத்தான காற்று — வெளிப்புற உடற்பயிற்சி தவிர்க்கவும்'
        : aqiScore >= 50
        ? 'மிக ஆபத்தான காற்று — முகமூடி அணியவும்'
        : aqiScore >= 33
        ? 'ஆபத்தான காற்று — உணர்திறன் கொண்டவர்களுக்கு ஆபத்து'
        : aqiScore >= 17
        ? 'மிதமான காற்று தரம்'
        : 'நல்ல காற்று தரம்',
    });
  }

  // Humidity risk (extreme high or low)
  let humScore = 0;
  if (c.humidity >= 90) humScore = 40;
  else if (c.humidity >= 80) humScore = 25;
  else if (c.humidity < 20) humScore = 35;

  factors.push({
    key: 'humidity',
    label: 'Humidity',
    labelHi: 'नमी',
    labelTa: 'ஈரப்பதம்',
    value: `${c.humidity}%`,
    score: humScore,
    weight: 0.5,
    description: humScore >= 35
      ? 'Extreme humidity — uncomfortable and oppressive'
      : humScore >= 20
      ? 'High humidity — may feel muggy'
      : 'Comfortable humidity level',
    descriptionHi: humScore >= 35
      ? 'अत्यधिक नमी — असहज और दमघोंऊ'
      : humScore >= 20
      ? 'उच्च नमी — उमसदार महसूस हो सकता है'
      : 'सुखद नमी स्तर',
    descriptionTa: humScore >= 35
      ? 'அதிக ஈரப்பதம் — அசௌகரியம்'
      : humScore >= 20
      ? 'உயர் ஈரப்பதம் — உமிழ்நீர் உணர்வு'
      : 'இதமான ஈரப்பதம்',
  });

  // CAPE-based thunderstorm potential
  // CAPE (Convective Available Potential Energy) is a key NWP parameter for thunderstorm prediction.
  // Values > 1000 indicate moderate instability, > 2500 indicates severe thunderstorm potential.
  const cape = c.cape ?? 0;
  if (cape > 500) {
    let capeScore = 0;
    if (cape >= 2500) capeScore = 85;
    else if (cape >= 1500) capeScore = 65;
    else if (cape >= 1000) capeScore = 45;
    else if (cape >= 500) capeScore = 25;

    factors.push({
      key: 'thunderstormPotential',
      label: 'Storm Potential',
      labelHi: 'तूफान संभावना',
      labelTa: 'புயல் வாய்ப்பு',
      value: `${Math.round(cape)} J/kg`,
      score: capeScore,
      weight: 0.8,
      description: capeScore >= 65
        ? 'High atmospheric instability — thunderstorms likely'
        : capeScore >= 45
        ? 'Moderate instability — thunderstorms possible'
        : 'Slight instability — isolated storms possible',
      descriptionHi: capeScore >= 65
        ? 'वायुमंडल में उच्च अस्थिरता — तूफान संभावित'
        : capeScore >= 45
        ? 'मध्यम अस्थिरता — तूफान संभव'
        : 'हल्की अस्थिरता — पृथक तूफान संभव',
      descriptionTa: capeScore >= 65
        ? 'வளிமண்டலத்தில் அதிக நிலையற்ற தன்மை — புயல் சாத்தியம்'
        : capeScore >= 45
        ? 'மிதமான நிலையற்ற தன்மை — புயல் சாத்தியம்'
        : 'லேசான நிலையற்ற தன்மை — தனித்த புயல் சாத்தியம்',
    });
  }

  // Calculate weighted score
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weightedSum = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const finalScore = Math.round(weightedSum / totalWeight);

  // Determine risk level
  let level: RiskLevel = 'safe';
  if (finalScore >= 75) level = 'extreme';
  else if (finalScore >= 55) level = 'high';
  else if (finalScore >= 35) level = 'moderate';
  else if (finalScore >= 15) level = 'low';

  // Check for any extreme individual factor that bumps the level
  const hasExtremeFactor = factors.some((f) => f.score >= 90);
  if (hasExtremeFactor && level !== 'extreme') {
    level = 'high';
  }

  const outdoorSuitable = level === 'safe' || level === 'low';

  const recommendation = level === 'extreme'
    ? 'Conditions are dangerous. Stay indoors and avoid all outdoor activities. Follow emergency guidance.'
    : level === 'high'
    ? 'Conditions are hazardous. Postpone non-essential outdoor activities. Take protective measures if you must go out.'
    : level === 'moderate'
    ? 'Conditions are challenging. Take precautions for outdoor activities — dress appropriately and stay alert.'
    : level === 'low'
    ? 'Conditions are generally safe with minor concerns. Normal activities are fine with basic awareness.'
    : 'Conditions are favorable. Safe for all outdoor activities and travel.';

  const recommendationHi = level === 'extreme'
    ? 'स्थिति खतरनाक है। घर के अंदर रहें और सभी बाहरी गतिविधियां टालें। आपातकालीन निर्देशों का पालन करें।'
    : level === 'high'
    ? 'स्थिति खतरनाक है। गैर-जरूरी बाहरी गतिविधियां स्थगित करें। बाहर जाना ही पड़े तो सुरक्षा उपाय अपनाएं।'
    : level === 'moderate'
    ? 'स्थिति चुनौतीपूर्ण है। बाहरी गतिविधि के लिए सावधानी बरतें — उचित कपड़े पहनें और सतर्क रहें।'
    : level === 'low'
    ? 'स्थिति सामान्य रूप से सुरक्षित है। बेसिक जागरूकता के साथ सामान्य गतिविधियां ठीक हैं।'
    : 'स्थिति अनुकूल है। सभी बाहरी गतिविधियों के लिए सुरक्षित।';

  const recommendationTa = level === 'extreme'
    ? 'நிலைமை ஆபத்தானது. உள்ளே இருங்கள், எல்லா வெளிப்புற செயல்பாடுகளையும் தவிர்க்கவும்.'
    : level === 'high'
    ? 'நிலைமை ஆபத்தானது. அவசியமற்ற வெளிப்புற செயல்பாடுகளை ஒத்திவைக்கவும். பாதுகாப்பு நடவடிக்கை எடுக்கவும்.'
    : level === 'moderate'
    ? 'நிலைமை சவாலானது. வெளிப்புற செயல்பாடுகளில் கவனமாக இருங்கள்.'
    : level === 'low'
    ? 'நிலைமை பொதுவாக பாதுகாப்பானது. சாதாரண செயல்பாடுகள் பாதுகாப்பானவை.'
    : 'நிலைமை சாதகமானது. அனைத்து வெளிப்புற செயல்பாடுகளுக்கும் பாதுகாப்பானது.';

  return {
    level,
    score: finalScore,
    factors,
    recommendation,
    recommendationHi,
    recommendationTa,
    outdoorSuitable,
  };
}

export const RISK_META: Record<RiskLevel, {
  label: string;
  labelHi: string;
  labelTa: string;
  color: string;
  bgColor: string;
  borderColor: string;
  gradient: string;
  icon: string;
}> = {
  safe: {
    label: 'Safe',
    labelHi: 'सुरक्षित',
    labelTa: 'பாதுகாப்பானது',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/25',
    gradient: 'from-green-400 to-emerald-500',
    icon: 'shield-check',
  },
  low: {
    label: 'Low Risk',
    labelHi: 'न्यून जोखिम',
    labelTa: 'குறைந்த ஆபத்து',
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/10',
    borderColor: 'border-lime-500/25',
    gradient: 'from-lime-400 to-yellow-400',
    icon: 'shield',
  },
  moderate: {
    label: 'Moderate Risk',
    labelHi: 'मध्यम जोखिम',
    labelTa: 'மிதமான ஆபத்து',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/25',
    gradient: 'from-amber-400 to-orange-500',
    icon: 'alert-triangle',
  },
  high: {
    label: 'High Risk',
    labelHi: 'उच्च जोखिम',
    labelTa: 'உயர் ஆபத்து',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/25',
    gradient: 'from-orange-500 to-red-500',
    icon: 'alert-octagon',
  },
  extreme: {
    label: 'Extreme Risk',
    labelHi: 'अत्यधिक जोखिम',
    labelTa: 'மிக அதிக ஆபத்து',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/25',
    gradient: 'from-red-500 to-rose-600',
    icon: 'alert-octagon',
  },
};

export function getRiskLabel(level: RiskLevel, lang: Language): string {
  const meta = RISK_META[level];
  return lang === 'hi' ? meta.labelHi : lang === 'ta' ? meta.labelTa : meta.label;
}

export function getRiskRecommendation(risk: RiskAssessment, lang: Language): string {
  return lang === 'hi' ? risk.recommendationHi : lang === 'ta' ? risk.recommendationTa : risk.recommendation;
}

export function getRiskFactorDescription(factor: RiskFactor, lang: Language): string {
  return lang === 'hi' ? factor.descriptionHi : lang === 'ta' ? factor.descriptionTa : factor.description;
}

export function getRiskFactorLabel(factor: RiskFactor, lang: Language): string {
  return lang === 'hi' ? factor.labelHi : lang === 'ta' ? factor.labelTa : factor.label;
}
