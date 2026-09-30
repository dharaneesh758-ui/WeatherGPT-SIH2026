import type { WeatherData, Language, WeatherAlert } from '@/types';
import { getWeatherLabel, getWindDirection, getAqiLabel, getUvLabel } from '@/lib/weatherCodes';
import { t, getGreeting } from '@/lib/i18n';
import { assessRisk, getRiskLabel, getRiskRecommendation, getRiskFactorLabel, getRiskFactorDescription } from '@/lib/riskEngine';

interface ParsedIntent {
  type: 'current' | 'forecast' | 'hourly' | 'temperature' | 'humidity' | 'wind' | 'rain' | 'uv' | 'aqi' | 'sun' | 'advice' | 'alert' | 'risk' | 'greeting' | 'help' | 'unknown';
  timeframe: 'now' | 'today' | 'tomorrow' | 'week';
  city?: string;
}

const INTENT_KEYWORDS: Record<ParsedIntent['type'], string[]> = {
  current: ['current', 'now', 'right now', 'rightnow', 'this moment', 'what is the weather', "what's the weather", 'how is', "how's", 'वर्तमान', 'अभी', 'ताज़ा', 'தற்போது', 'இப்போது'],
  forecast: ['forecast', 'prediction', 'predict', 'week', 'coming days', 'पूर्वानुमान', 'आने वाले', 'முன்னறிவிப்பு', 'வரும்'],
  hourly: ['hour', 'hourly', 'next few hours', 'today\'s weather', 'घंटे', 'आज का मौसम', 'மணிநேர', 'இன்று'],
  temperature: ['temperature', 'temp', 'how hot', 'how cold', 'how warm', 'how cool', 'degrees', 'तापमान', 'गर्मी', 'ठंड', 'वेप्निलै', 'வெப்பநிலை', 'சூடு', 'குளிரு'],
  humidity: ['humidity', 'humid', 'moisture', 'damp', 'नमी', 'उमस', 'ஈரப்பதம்'],
  wind: ['wind', 'windy', 'breeze', 'gust', 'हवा', 'वायु', 'रफ़्तार', 'காற்று', 'வீசுதல்'],
  rain: ['rain', 'rainy', 'precipitation', 'shower', 'drizzle', 'downpour', 'wet', 'बारिश', 'वर्षा', 'बौछार', 'मिली', 'மழை', 'மழைப்பொழிவு'],
  uv: ['uv', 'ultraviolet', 'sunburn', 'sunscreen', 'यूवी', 'யுவி'],
  aqi: ['air quality', 'aqi', 'pollution', 'polluted', 'air', 'pm2.5', 'pm10', 'वायु गुणवत्ता', 'प्रदूषण', 'காற்று தரம்', 'மாசு'],
  sun: ['sunrise', 'sunset', 'sun', 'dawn', 'dusk', 'sunlight', 'सूर्योदय', 'सूर्यास्त', 'धूप', 'சூரிய உதயம்', 'சூரிய அஸ்தமனம்'],
  advice: ['advice', 'should i', 'recommend', 'tip', 'what to do', 'carry', 'umbrella', 'wear', 'jacket', 'सलाह', 'क्या करूं', 'ஆலோசனை', 'என்ன செய்ய', 'क्या मुझे', 'छाता', 'जैकेट', 'குடை', 'ஜாக்கெட்'],
  alert: ['alert', 'warning', 'danger', 'storm', 'cyclone', 'flood', 'unsafe', 'चेतावनी', 'खतरा', 'எச்சரிக்கை', 'ஆபத்து'],
  risk: ['risk', 'safe', 'safety', 'dangerous', 'hazardous', 'go outside', 'outdoor', 'suitable', 'should i go', 'is it safe', 'जोखिम', 'सुरक्षित', 'बाहर जाएं', 'खतरनाक', 'ஆபத்து', 'பாதுகாப்பான', 'வெளியே செல்ல'],
  greeting: ['hi', 'hello', 'hey', 'namaste', 'namaskar', 'vanakkam', 'good morning', 'good evening', 'नमस्ते', 'हाय', 'வணக்கம்', 'ஹாய்'],
  help: ['help', 'what can you do', 'commands', 'सहायता', 'உதவி'],
  unknown: [],
};

const TIMEFRAME_KEYWORDS: Record<ParsedIntent['timeframe'], string[]> = {
  now: ['now', 'right now', 'currently', 'at the moment', 'अभी', 'இப்போது'],
  today: ['today', 'this evening', 'this afternoon', 'tonight', 'आज', 'இன்று'],
  tomorrow: ['tomorrow', 'कल', 'நாளை'],
  week: ['week', '7 days', 'seven days', 'this week', 'coming days', 'हफ्ता', 'வாரம்'],
};

const CITY_PATTERN = /\b(?:in|at|for|of)\s+([A-Za-z\s]+?)(?:\s+(?:today|tomorrow|now|this week|weather|temperature|forecast|rain|climate|मौसम|वानिला|வானிலை)|$)/i;

export function parseIntent(message: string): ParsedIntent {
  const lower = message.toLowerCase().trim();
  
  let city: string | undefined;
  const cityMatch = lower.match(CITY_PATTERN);
  if (cityMatch) city = cityMatch[1].trim();

  let type: ParsedIntent['type'] = 'unknown';
  for (const [intentType, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intentType === 'unknown') continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        type = intentType as ParsedIntent['type'];
        break;
      }
    }
    if (type !== 'unknown') break;
  }

  if (type === 'unknown' && lower.length > 0) {
    if (lower.length < 30) type = 'current';
  }

  let timeframe: ParsedIntent['timeframe'] = 'now';
  if (type === 'forecast') timeframe = 'week';
  for (const [tf, keywords] of Object.entries(TIMEFRAME_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        timeframe = tf as ParsedIntent['timeframe'];
        break;
      }
    }
    if (timeframe !== 'now') break;
  }

  return { type, timeframe, city };
}

export function generateAlerts(weather: WeatherData, lang: Language): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const c = weather.current;
  const label = getWeatherLabel(c.weatherCode, lang);

  if (c.weatherCode >= 95) {
    alerts.push({
      level: 'danger',
      title: label,
      message: lang === 'hi'
        ? 'भारी गरज और ओले की संभावना है। घर के अंदर रहें, खुले में न जाएं।'
        : lang === 'ta'
        ? 'கடும் இடி மற்றும் ஆலங்கட்டி பதிவாகியுள்ளது. உள்ளே இருக்கவும்.'
        : 'Severe thunderstorm with hail detected. Stay indoors and avoid open areas.',
    });
  }

  if (c.weatherCode === 65 || c.weatherCode === 67 || c.weatherCode === 82) {
    alerts.push({
      level: 'warning',
      title: label,
      message: lang === 'hi'
        ? 'भारी बारिश हो रही है। ड्राइविंग में सावधानी रखें। निम्न क्षेत्रों में जलभराव संभव।'
        : lang === 'ta'
        ? 'கனமழை பெய்து வருகிறது. வாகனம் ஓட்டும்போது கவனமாக இருங்கள்.'
        : 'Heavy rain in progress. Drive carefully and watch for waterlogging in low-lying areas.',
    });
  }

  if (c.windSpeed >= 40) {
    alerts.push({
      level: 'warning',
      title: lang === 'hi' ? 'तेज हवा' : lang === 'ta' ? 'வலுவான காற்று' : 'High Wind',
      message: lang === 'hi'
        ? `हवा की गति ${Math.round(c.windSpeed)} किमी/घंटा है। खुले स्थानों पर सावधानी बरतें।`
        : lang === 'ta'
        ? `காற்று வேகம் ${Math.round(c.windSpeed)} கிமீ/மணி. திறந்த இடங்களில் கவனமாக இருங்கள்.`
        : `Wind speeds of ${Math.round(c.windSpeed)} km/h. Exercise caution in open areas.`,
    });
  }

  if (c.temperature >= 40) {
    alerts.push({
      level: 'danger',
      title: lang === 'hi' ? 'अत्यधिक गर्मी' : lang === 'ta' ? 'அதிக வெப்பம்' : 'Extreme Heat',
      message: lang === 'hi'
        ? `तापमान ${Math.round(c.temperature)}°C है। खुले में जाने से बचें, पानी भरपूर पिएं।`
        : lang === 'ta'
        ? `வெப்பநிலை ${Math.round(c.temperature)}°C. வெயிலில் செல்ல வேண்டாம், தண்ணீர் அதிகம் அருந்தவும்.`
        : `Temperature is ${Math.round(c.temperature)}°C. Avoid going outdoors and stay hydrated.`,
    });
  } else if (c.temperature <= 2) {
    alerts.push({
      level: 'warning',
      title: lang === 'hi' ? 'कड़ाके की ठंड' : lang === 'ta' ? 'கடும் குளிர்' : 'Freezing Cold',
      message: lang === 'hi'
        ? `तापमान ${Math.round(c.temperature)}°C है। गर्म कपड़े पहनें।`
        : lang === 'ta'
        ? `வெப்பநிலை ${Math.round(c.temperature)}°C. வெதுவெதுப்பான ஆடை அணியவும்.`
        : `Temperature is ${Math.round(c.temperature)}°C. Wear warm clothing and dress in layers.`,
    });
  }

  if (c.uvIndex >= 8) {
    alerts.push({
      level: 'warning',
      title: lang === 'hi' ? 'उच्च यूवी सूचकांक' : lang === 'ta' ? 'அதிக யுவி குறியீடு' : 'High UV Index',
      message: lang === 'hi'
        ? `यूवी सूचकांक ${c.uvIndex} है। सनस्क्रीन लगाएं, छाता या टोपी का उपयोग करें।`
        : lang === 'ta'
        ? `யுவி குறியீடு ${c.uvIndex}. சன்ஸ்கிரீன் பயன்படுத்தவும், தொப்பி அணியவும்.`
        : `UV Index is ${c.uvIndex}. Apply sunscreen and use an umbrella or hat.`,
    });
  }

  if (weather.airQuality) {
    const currentAqiIndex = getCurrentHourIndex(weather.airQuality.time);
    const aqi = weather.airQuality.usAqi?.[currentAqiIndex] ?? weather.airQuality.europeanAqi?.[currentAqiIndex];
    if (aqi && aqi > 150) {
      alerts.push({
        level: aqi > 200 ? 'danger' : 'warning',
        title: lang === 'hi' ? 'खराब वायु गुणवत्ता' : lang === 'ta' ? 'மோசமான காற்று தரம்' : 'Poor Air Quality',
        message: lang === 'hi'
          ? `वायु गुणवत्ता सूचकांक ${Math.round(aqi)} है। मास्क पहनें, बाहर कम रहें।`
          : lang === 'ta'
          ? `காற்று தர குறியீடு ${Math.round(aqi)}. முகமூடி அணியவும், வெளியே குறைவாக இருங்கள்.`
          : `Air Quality Index is ${Math.round(aqi)}. Wear a mask and limit outdoor activities.`,
      });
    }
  }

  return alerts;
}

function getCurrentHourIndex(times: string[]): number {
  const now = new Date();
  for (let i = 0; i < times.length; i++) {
    const tm = new Date(times[i]);
    if (tm.getHours() === now.getHours() && tm.getDate() === now.getDate()) return i;
  }
  return 0;
}

// ─── Friendly helpers ─────────────────────────────────────────────────────

function rainForecastToday(weather: WeatherData): { willRain: boolean; maxChance: number; rainSum: number; rainHours: string[] } {
  const todayRainProb = weather.daily.precipitationProbability[0] ?? 0;
  const rainSum = weather.daily.precipitationSum[0] ?? 0;
  const currentHour = new Date().getHours();
  const rainHours: string[] = [];
  let maxChance = todayRainProb;

  for (let i = 0; i < weather.hourly.time.length && i < 24; i++) {
    const h = new Date(weather.hourly.time[i]);
    if (h.getDate() === new Date().getDate()) {
      const prob = weather.hourly.precipitationProbability[i] ?? 0;
      if (prob >= 40) {
        const label = h.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        rainHours.push(`${label} (${prob}%)`);
      }
      if (prob > maxChance) maxChance = prob;
    }
  }

  return { willRain: todayRainProb >= 40 || rainSum > 1, maxChance, rainSum, rainHours: rainHours.slice(0, 5) };
}

function tomorrowForecast(weather: WeatherData): { willRain: boolean; rainProb: number; tempMax: number; tempMin: number; code: number; label: string } {
  if (weather.daily.time.length < 2) {
    return { willRain: false, rainProb: 0, tempMax: 0, tempMin: 0, code: 0, label: '' };
  }
  const rainProb = weather.daily.precipitationProbability[1] ?? 0;
  return {
    willRain: rainProb >= 40,
    rainProb,
    tempMax: weather.daily.tempMax[1],
    tempMin: weather.daily.tempMin[1],
    code: weather.daily.weatherCode[1],
    label: '',
  };
}

// ─── Detailed advice generator ────────────────────────────────────────────

function generateDetailedAdvice(weather: WeatherData, lang: Language): string {
  const c = weather.current;
  const locName = weather.location.name;
  const label = getWeatherLabel(c.weatherCode, lang);
  const rain = rainForecastToday(weather);
  const tomorrow = tomorrowForecast(weather);
  const isDay = c.isDay;
  const sections: string[] = [];

  // ── Umbrella ──
  if (rain.willRain || c.precipitation > 0) {
    const rainDetail = c.precipitation > 0
      ? (lang === 'hi' ? `अभी बारिश हो रही है (${c.precipitation}मिमी)।` : lang === 'ta' ? `இப்போது மழை பெய்கிறது (${c.precipitation}மிமீ).` : `It's raining right now (${c.precipitation}mm).`)
      : (lang === 'hi' ? `आज बारिश की संभावना ${rain.maxChance}% है।` : lang === 'ta' ? `இன்று மழை வாய்ப்பு ${rain.maxChance}%.` : `There's a ${rain.maxChance}% chance of rain today.`);

    const rainHoursNote = rain.rainHours.length > 0
      ? (lang === 'hi' ? `\n  बारिश के संभावित समय: ${rain.rainHours.join(', ')}` : lang === 'ta' ? `\n  மழை எதிர்பார்க்கப்படும் நேரம்: ${rain.rainHours.join(', ')}` : `\n  Expected rain hours: ${rain.rainHours.join(', ')}`)
      : '';

    const why = lang === 'hi'
      ? `  क्यों: बिना छाता के आप भीग जाएंगे, जिससे जुकाम या बुखार हो सकता है। आपके कपड़े, फोन और लैपटॉप भी खराब हो सकते हैं।`
      : lang === 'ta'
      ? `  ஏன்: குடை இல்லாமல் நீங்கள் நனைந்து விடுவீர்கள், சளி அல்லது காய்ச்சல் வரலாம். உங்கள் ஆடை, போன், லேப்டாப் கெட்டு போகலாம்.`
      : `  Why: Without an umbrella you'll get soaked, which can lead to cold or fever. Your clothes, phone, and laptop can also get damaged.`;

    const whatHappens = lang === 'hi'
      ? `  बिना छाता के क्या होगा: भीगने से शरीर का तापमान गिर जाएगा, इम्युनिटी कमजोर होगी, और बीमार होने का जोखिम बढ़ जाएगा। अगर आप ड्राइव कर रहे हैं तो दृश्यता भी कम हो जाएगी।`
      : lang === 'ta'
      ? `  குடை இல்லாவிட்டால்: நனைந்தால் உடல் வெப்பநிலை குறையும், நோய் எதிர்ப்பு சக்தி பலவீனமாகும், நோய் பரவ வாய்ப்பு அதிகம். வாகனம் ஓட்டினால் பார்வை குறையும்.`
      : `  What happens without it: Getting wet drops your body temperature, weakens your immune system, and increases the risk of illness. If you're driving, visibility will also be reduced.`;

    sections.push(lang === 'hi' ? `☂️ छाता — हाँ, लेजाएं!\n  ${rainDetail}${rainHoursNote}\n${why}\n${whatHappens}`
      : lang === 'ta' ? `☂️ குடை — ஆம், எடுத்துச் செல்லுங்கள்!\n  ${rainDetail}${rainHoursNote}\n${why}\n${whatHappens}`
      : `☂️ Umbrella — Yes, carry one!\n  ${rainDetail}${rainHoursNote}\n${why}\n${whatHappens}`);
  } else {
    const why = lang === 'hi'
      ? `  क्यों नहीं: आज बारिश की संभावना केवल ${rain.maxChance}% है, यह बहुत कम है। छाता ले जाना अनावश्यक भार होगा।`
      : lang === 'ta'
      ? `  ஏன் வேண்டாம்: இன்று மழை வாய்ப்பு வெறும் ${rain.maxChance}% மட்டுமே, இது மிகக் குறைவு. குடை எடுப்பது தேவையற்றது.`
      : `  Why not: Rain probability today is only ${rain.maxChance}%, which is quite low. Carrying an umbrella would be unnecessary weight.`;
    sections.push(lang === 'hi' ? `☂️ छाता — नहीं, ज़रूरत नहीं।\n${why}` : lang === 'ta' ? `☂️ குடை — இல்லை, தேவையில்லை.\n${why}` : `☂️ Umbrella — No, not needed.\n${why}`);
  }

  // ── Sunscreen / UV ──
  if (c.uvIndex >= 6 && isDay) {
    const why = lang === 'hi'
      ? `  क्यों: यूवी सूचकांक ${c.uvIndex} है, जो उच्च है। सूर्य की पराबैंगनी किरणें आपकी त्वचा को नुकसान पहुंचा सकती हैं।`
      : lang === 'ta'
      ? `  ஏன்: யுவி குறியீடு ${c.uvIndex}, இது அதிகம். சூரியனின் புற ஊதா கதிர்கள் உங்கள் தோலை பாதிக்கலாம்.`
      : `  Why: The UV Index is ${c.uvIndex}, which is high. The sun's ultraviolet rays can damage your skin.`;
    const whatHappens = lang === 'hi'
      ? `  बिना सनस्क्रीन के क्या होगा: त्वचा में जलन, धूम्रपान का खतरा, समय से पहले बुढ़ापा, और लंबे समय में त्वचा कैंसर का जोखिम बढ़ जाता है।`
      : lang === 'ta'
      ? `  சன்ஸ்கிரீன் இல்லாமல்: தோல் எரிச்சல், சூரிய எரிச்சல், முன்கூட்டியே முதுமை, நீண்ட காலத்தில் தோல் புற்றுநோய் ஆபத்து அதிகரிக்கும்.`
      : `  What happens without it: Sunburn, skin irritation, premature aging, and increased risk of skin cancer over time.`;
    sections.push(lang === 'hi' ? `🧴 सनस्क्रीन — हाँ, लगाएं!\n${why}\n${whatHappens}` : lang === 'ta' ? `🧴 சன்ஸ்கிரீன் — ஆம், பயன்படுத்துங்கள்!\n${why}\n${whatHappens}` : `🧴 Sunscreen — Yes, apply it!\n${why}\n${whatHappens}`);
  } else if (c.uvIndex >= 3 && isDay) {
    sections.push(lang === 'hi' ? `🧴 सनस्क्रीन — वैकल्पिक। यूवी सूचकांक ${c.uvIndex} है, मध्यम स्तर। लंबे समय तक बाहर रहें तो लगाएं।`
      : lang === 'ta' ? `🧴 சன்ஸ்கிரீன் — விருப்பம். யுவி ${c.uvIndex}, மிதமானது. நீண்ட நேரம் வெளியே இருந்தால் பயன்படுத்தவும்.`
      : `🧴 Sunscreen — Optional. UV Index is ${c.uvIndex}, moderate level. Use it if you'll be outdoors for a long time.`);
  }

  // ── Jacket / warm clothing ──
  if (c.temperature <= 5) {
    const why = lang === 'hi'
      ? `  क्यों: तापमान ${Math.round(c.temperature)}°C है, जो बहुत ठंड है। हवा की गति ${Math.round(c.windSpeed)} किमी/घंटा है, जिससे और भी ठंड लगेगी।`
      : lang === 'ta'
      ? `  ஏன்: வெப்பநிலை ${Math.round(c.temperature)}°C, மிகவும் குளிர். காற்று வேகம் ${Math.round(c.windSpeed)} கிமீ/மணி, இதனால் மேலும் குளிரும்.`
      : `  Why: Temperature is ${Math.round(c.temperature)}°C, which is very cold. Wind speed is ${Math.round(c.windSpeed)} km/h, making it feel even colder.`;
    const whatHappens = lang === 'hi'
      ? `  बिना गर्म कपड़े के क्या होगा: शरीर का तापमान गिर जाएगा, हाथ-पैर सुन्न हो सकते हैं, हाइपोथर्मिया का जोखिम बढ़ जाता है, और आप बीमार पड़ सकते हैं।`
      : lang === 'ta'
      ? `  வெதுவெதுப்பான ஆடை இல்லாமல்: உடல் வெப்பநிலை குறையும், கை கால் உறையலாம், ஹைபோதெர்மியா ஆபத்து அதிகரிக்கும்.`
      : `  What happens without warm clothes: Your body temperature drops, extremities can go numb, risk of hypothermia increases, and you can fall sick.`;
    sections.push(lang === 'hi' ? `🧥 गर्म कपड़े — हाँ, पहनें!\n${why}\n${whatHappens}` : lang === 'ta' ? `🧥 வெதுவெதுப்பான ஆடை — ஆம், அணியவும்!\n${why}\n${whatHappens}` : `🧥 Warm Jacket — Yes, wear one!\n${why}\n${whatHappens}`);
  } else if (c.temperature <= 12) {
    sections.push(lang === 'hi' ? `🧥 जैकेट — हाँ, हल्की जैकेट पहनें। तापमान ${Math.round(c.temperature)}°C है, ठंड लगेगी।`
      : lang === 'ta' ? `🧥 ஜாக்கெட் — ஆம், மெல்லிய ஜாக்கெட் அணியவும். வெப்பநிலை ${Math.round(c.temperature)}°C, குளிராக இருக்கும்.`
      : `🧥 Light Jacket — Yes, wear one. Temperature is ${Math.round(c.temperature)}°C, it'll be chilly.`);
  } else if (c.temperature >= 35) {
    const why = lang === 'hi'
      ? `  क्यों: तापमान ${Math.round(c.temperature)}°C है, जो बहुत गर्म है। लगन तापमान ${Math.round(c.apparentTemperature)}°C महसूस होता है।`
      : lang === 'ta'
      ? `  ஏன்: வெப்பநிலை ${Math.round(c.temperature)}°C, மிகவும் வெயில். உணர்வு ${Math.round(c.apparentTemperature)}°C.`
      : `  Why: Temperature is ${Math.round(c.temperature)}°C, which is very hot. It feels like ${Math.round(c.apparentTemperature)}°C.`;
    const whatHappens = lang === 'hi'
      ? `  सावधानियां: हल्के और सूती कपड़े पहनें। पानी भरपूर पिएं (हर घंटे एक गिलास)। दोपहर 12-4 बजे तक बाहर न जाएं। बिना पानी पिए गर्मी में रहने से हीटस्ट्रोक, चक्कर, और निर्जलीकरण हो सकता है।`
      : lang === 'ta'
      ? `  முன்னெச்சரிக்கை: மெல்லிய பருத்தி ஆடை அணியவும். தண்ணீர் அதிகம் அருந்தவும் (மணிக்கு ஒரு டம்ளர்). மதியம் 12-4 வரை வெளியே செல்ல வேண்டாம். தண்ணீர் அருந்தாமல் வெயிலில் இருந்தால் வெப்பஅதிர்ச்சி, தலைசுற்றல், நீர்ச்சத்து குறைவு ஏற்படலாம்.`
      : `  Precautions: Wear light, breathable cotton clothing. Drink water frequently (one glass every hour). Avoid going out between 12-4 PM. Staying in the heat without water can cause heatstroke, dizziness, and dehydration.`;
    sections.push(lang === 'hi' ? `👕 हल्के कपड़े + पानी — अनिवार्य!\n${why}\n${whatHappens}` : lang === 'ta' ? `👕 மெல்லிய ஆடை + தண்ணீர் — கட்டாயம்!\n${why}\n${whatHappens}` : `👕 Light Clothes + Water — Essential!\n${why}\n${whatHappens}`);
  }

  // ── Wind caution ──
  if (c.windSpeed >= 35) {
    const why = lang === 'hi'
      ? `  क्यों: हवा की गति ${Math.round(c.windSpeed)} किमी/घंटा है, जो तेज है। ऐसी हवा में चलना मुश्किल होता है, पेड़ों की डालें टूट सकती हैं, और छत की चीज़ें गिर सकती हैं।`
      : lang === 'ta'
      ? `  ஏன்: காற்று வேகம் ${Math.round(c.windSpeed)} கிமீ/மணி, வலுவானது. இத்தகைய காற்றில் நடப்பது கடினம், மரக்கிளைகள் முறியலாம், கூரை பொருட்கள் விழலாம்.`
      : `  Why: Wind speed is ${Math.round(c.windSpeed)} km/h, which is strong. Walking becomes difficult, tree branches can break, and rooftop items can fly off.`;
    const whatHappens = lang === 'hi'
      ? `  बिना सावधानी के क्या होगा: तेज हवा में चलते समय संतुलन खो सकते हैं, आंखों में धूल जा सकती है, और गिरती वस्तुओं से चोट लग सकती है।`
      : lang === 'ta'
      ? `  கவனம் இல்லாமல்: வலுவான காற்றில் நடக்கும்போது சமநிலை இழக்கலாம், கண்களில் தூசி புகலாம், விழும் பொருட்களால் காயம் ஏற்படலாம்.`
      : `  What happens without caution: You can lose balance while walking, dust can enter your eyes, and falling objects can cause injury.`;
    sections.push(lang === 'hi' ? `💨 तेज हवा — सावधानी बरतें!\n${why}\n${whatHappens}` : lang === 'ta' ? `💨 வலுவான காற்று — கவனமாக!\n${why}\n${whatHappens}` : `💨 Strong Wind — Be cautious!\n${why}\n${whatHappens}`);
  }

  // ── Air quality ──
  if (weather.airQuality) {
    const idx = getCurrentHourIndex(weather.airQuality.time);
    const aqi = weather.airQuality.usAqi?.[idx] ?? weather.airQuality.europeanAqi?.[idx] ?? 0;
    if (aqi > 100) {
      const why = lang === 'hi'
        ? `  क्यों: वायु गुणवत्ता सूचकांक ${Math.round(aqi)} है, जो अस्वस्थ स्तर है। हानिकारक कण (PM2.5) आपके फेफड़ों में जा सकते हैं।`
        : lang === 'ta'
        ? `  ஏன்: காற்று தர குறியீடு ${Math.round(aqi)}, ஆரோக்கியமற்ற நிலை. தீங்கு விளைவிக்கும் துகள்கள் (PM2.5) நுரையீரலில் செல்லலாம்.`
        : `  Why: Air Quality Index is ${Math.round(aqi)}, which is unhealthy. Harmful particles (PM2.5) can enter your lungs.`;
      const whatHappens = lang === 'hi'
        ? `  बिना मास्क के क्या होगा: खांसी, आंखों में जलन, सांस लेने में तकलीफ, और अस्थमा/दमा के मरीजों के लिए खास खतरा। लंबे समय में फेफड़ों को नुकसान होता है।`
        : lang === 'ta'
        ? `  முகமூடி இல்லாமல்: இருமல், கண் எரிச்சல், மூச்சு திணறல், ஆஸ்துமா நோயாளிகளுக்கு கடும் ஆபத்து. நீண்ட காலத்தில் நுரையீரல் பாதிப்பு.`
        : `  What happens without a mask: Coughing, eye irritation, breathing difficulty, and special risk for asthma patients. Long-term lung damage is possible.`;
      sections.push(lang === 'hi' ? `😷 मास्क — पहनें!\n${why}\n${whatHappens}` : lang === 'ta' ? `😷 முகமூடி — அணியவும்!\n${why}\n${whatHappens}` : `😷 Mask — Wear one!\n${why}\n${whatHappens}`);
    }
  }

  // ── Visibility / fog ──
  if (c.visibility < 2000) {
    const visKm = (c.visibility / 1000).toFixed(1);
    const why = lang === 'hi'
      ? `  क्यों: दृश्यता केवल ${visKm} किमी है, जो बहुत कम है। धुंध या कोहरे के कारण सड़क पर दूर तक दिखना मुश्किल है।`
      : lang === 'ta'
      ? `  ஏன்: பார்வை வெறும் ${visKm} கிமீ மட்டுமே, மிகக் குறைவு. பனிமூட்டத்தால் சாலையில் தூரம் பார்ப்பது கடினம்.`
      : `  Why: Visibility is only ${visKm} km, which is very low. Fog makes it difficult to see far ahead on the road.`;
    const whatHappens = lang === 'hi'
      ? `  बिना सावधानी के क्या होगा: ड्राइविंग में दुर्घटना का जोखिम बहुत बढ़ जाता है। धीमा चलाएं, हेडलाइट जलाएं, और ट्रैफिक से पर्याप्त दूरी बनाए रखें।`
      : lang === 'ta'
      ? `  கவனம் இல்லாமல்: வாகனம் ஓட்டும்போது விபத்து ஆபத்து அதிகம். மெதுவாக ஓட்டவும், ஹெட்லைட் அணையவும், போக்குவரத்திலிருந்து போதுமான இடைவெளி விடவும்.`
      : `  What happens without caution: Risk of road accidents increases dramatically. Drive slowly, turn on headlights, and maintain adequate distance from traffic.`;
    sections.push(lang === 'hi' ? `🌫️ धुंध — ड्राइविंग में सावधानी!\n${why}\n${whatHappens}` : lang === 'ta' ? `🌫️ பனிமூட்டம் — வாகனம் ஓட்ட கவனம்!\n${why}\n${whatHappens}` : `🌫️ Fog — Drive carefully!\n${why}\n${whatHappens}`);
  }

  // ── Thunderstorm ──
  if (c.weatherCode >= 95) {
    const why = lang === 'hi'
      ? `  क्यों: गरज के साथ बारिश हो रही है। बिजली गिरने का जोखिम, ओले से चोट, और अचानक तेज हवा संभव है।`
      : lang === 'ta'
      ? `  ஏன்: இடியுடன் மழை பெய்கிறது. மின்னல் தாக்குதல், ஆலங்கட்டி காயம், திடீர் காற்று சாத்தியம்.`
      : `  Why: Thunderstorm is active. Risk of lightning strikes, hail injury, and sudden strong gusts.`;
    const whatHappens = lang === 'hi'
      ? `  क्या करें: घर के अंदर रहें। खिड़कियां बंद करें। बिजली के उपकरण अनप्लग करें। पेड़ के नीचे न खड़े रहें। खुले मैदान से दूर रहें।`
      : lang === 'ta'
      ? `  என்ன செய்ய வேண்டும்: உள்ளே இருங்கள். ஜன்னல்களை மூடவும். மின் சாதனங்களை அணைக்கவும். மரத்தடியில் நில்லாதீர்கள். திறந்த இடத்தை தவிர்க்கவும்.`
      : `  What to do: Stay indoors. Close windows. Unplug electrical devices. Don't stand under trees. Avoid open fields.`;
    sections.push(lang === 'hi' ? `⛈️ गरज — घर के अंदर रहें!\n${why}\n${whatHappens}` : lang === 'ta' ? `⛈️ இடி — உள்ளே இருங்கள்!\n${why}\n${whatHappens}` : `⛈️ Thunderstorm — Stay indoors!\n${why}\n${whatHappens}`);
  }

  // ── Tomorrow preview ──
  if (tomorrow.willRain) {
    sections.push(lang === 'hi'
      ? `📅 कल का मौसम: बारिश की संभावना ${tomorrow.rainProb}% है। तापमान ${Math.round(tomorrow.tempMax)}°/${Math.round(tomorrow.tempMin)}°। कल भी छाता रखें!`
      : lang === 'ta'
      ? `📅 நாளை வானிலை: மழை வாய்ப்பு ${tomorrow.rainProb}%. வெப்பநிலை ${Math.round(tomorrow.tempMax)}°/${Math.round(tomorrow.tempMin)}°. நாளையும் குடை எடுக்கவும்!`
      : `📅 Tomorrow's outlook: ${tomorrow.rainProb}% chance of rain. Temperature ${Math.round(tomorrow.tempMax)}°/${Math.round(tomorrow.tempMin)}°. Keep an umbrella handy tomorrow too!`);
  }

  if (sections.length === 0) {
    sections.push(lang === 'hi'
      ? `✨ आज ${locName} में मौसम सुहावना है (${Math.round(c.temperature)}°C, ${label})। कोई विशेष सावधानी की ज़रूरत नहीं। बाहर घूमने का अच्छा समय है!`
      : lang === 'ta'
      ? `✨ இன்று ${locName} இல் வானிலை நன்று (${Math.round(c.temperature)}°C, ${label}). எந்த முன்னெச்சரிக்கையும் தேவையில்லை. வெளியே செல்ல சிறந்த நேரம்!`
      : `✨ Today in ${locName} the weather is pleasant (${Math.round(c.temperature)}°C, ${label}). No special precautions needed. It's a great time to be outdoors!`);
  }

  const header = lang === 'hi'
    ? `नमस्ते! यहाँ ${locName} के लिए विस्तृत सलाह है:\n`
    : lang === 'ta'
    ? `வணக்கம்! இதோ ${locName} க்கான விரிவான ஆலோசனை:\n`
    : `Hey! Here's your detailed advice for ${locName}:\n`;

  return header + sections.join('\n\n');
}

// ─── Main response generator ──────────────────────────────────────────────

export function generateResponse(
  message: string,
  weather: WeatherData,
  lang: Language
): string {
  const intent = parseIntent(message);
  const c = weather.current;
  const locName = weather.location.name;
  const label = getWeatherLabel(c.weatherCode, lang);
  const windDir = getWindDirection(c.windDirection, lang);

  switch (intent.type) {
    case 'greeting': {
      const greeting = getGreeting(lang);
      const rain = rainForecastToday(weather);
      const rainHint = rain.willRain
        ? (lang === 'hi' ? ' आज बारिश की संभावना है, छाता लेना न भूलें!' : lang === 'ta' ? ' இன்று மழை வாய்ப்பு உள்ளது, குடை எடுக்க மறக்காதீர்கள்!' : ' There\'s a chance of rain today — don\'t forget your umbrella!')
        : '';
      return lang === 'hi'
        ? `${greeting}! 😊 ${locName} में अभी ${Math.round(c.temperature)}°C है, ${label}। मौसम के बारे में कुछ पूछना चाहेंगे?${rainHint}`
        : lang === 'ta'
        ? `${greeting}! 😊 ${locName} இல் இப்போது ${Math.round(c.temperature)}°C, ${label}। வானிலை பற்றி ஏதேனும் கேள்க?${rainHint}`
        : `${greeting}! 😊 It's currently ${Math.round(c.temperature)}°C in ${locName} with ${label}. Want to know anything about the weather?${rainHint}`;
    }

    case 'temperature': {
      const feelDiff = Math.abs(c.temperature - c.apparentTemperature);
      const feelNote = feelDiff >= 3
        ? (lang === 'hi' ? ` (लेकिन ${Math.round(c.apparentTemperature)}°C महसूस होता है)` : lang === 'ta' ? ` (ஆனால் ${Math.round(c.apparentTemperature)}°C உணர்கிறது)` : ` (but feels like ${Math.round(c.apparentTemperature)}°C)`)
        : '';
      const tempDesc = c.temperature >= 35 ? (lang === 'hi' ? 'बहुत गर्म' : lang === 'ta' ? 'மிக வெயில்' : 'very hot')
        : c.temperature >= 25 ? (lang === 'hi' ? 'गर्म' : lang === 'ta' ? 'வெயில்' : 'warm')
        : c.temperature >= 15 ? (lang === 'hi' ? 'सहज' : lang === 'ta' ? 'இதமான' : 'mild')
        : c.temperature >= 5 ? (lang === 'hi' ? 'ठंडी' : lang === 'ta' ? 'குளிர்' : 'cool')
        : (lang === 'hi' ? 'बहुत ठंड' : lang === 'ta' ? 'மிகக் குளிர்' : 'very cold');
      return lang === 'hi'
        ? `${locName} में अभी ${Math.round(c.temperature)}°C है — ${tempDesc}${feelNote}। आसमान ${label} है। आर्द्रता ${c.humidity}% है।\n\n${c.temperature >= 35 ? '💡 गर्मी से बचने के लिए पानी भरपूर पिएं और दोपहर में बाहर न जाएं।' : c.temperature <= 5 ? '💡 ठंड से बचने के लिए गर्म कपड़े पहनें।' : ''}`
        : lang === 'ta'
        ? `${locName} இல் இப்போது ${Math.round(c.temperature)}°C — ${tempDesc}${feelNote}। ${label}। ஈரப்பதம் ${c.humidity}%.\n\n${c.temperature >= 35 ? '💡 வெயிலில் இருந்து தப்ப தண்ணீர் அதிகம் அருந்தவும், மதியம் வெளியே செல்ல வேண்டாம்.' : c.temperature <= 5 ? '💡 குளிரில் இருந்து தப்ப வெதுவெதுப்பான ஆடை அணியவும்.' : ''}`
        : `${locName} is currently ${Math.round(c.temperature)}°C — ${tempDesc}${feelNote}. Sky: ${label}. Humidity: ${c.humidity}%.\n\n${c.temperature >= 35 ? '💡 To beat the heat, drink plenty of water and avoid going out in the afternoon.' : c.temperature <= 5 ? '💡 To stay warm, wear layered warm clothing.' : ''}`;
    }

    case 'humidity': {
      const humidDesc = c.humidity > 70 ? (lang === 'hi' ? 'उमसदार और भारी' : lang === 'ta' ? 'ஈரப்பதமான' : 'humid and heavy') : c.humidity < 30 ? (lang === 'hi' ? 'शुष्क' : lang === 'ta' ? 'வறண்ட' : 'dry') : (lang === 'hi' ? 'सहज' : lang === 'ta' ? 'சாதாரண' : 'moderate');
      const effect = c.humidity > 70
        ? (lang === 'hi' ? '\n\n💡 उच्च नमी के कारण पसीना कम वाष्पित होता है, इसलिए गर्मी और अधिक महसूस होती है। अधिक पानी पिएं।'
          : lang === 'ta' ? '\n\n💡 அதிக ஈரப்பதத்தால் வியர்வை ஆவியாவது குறைவு, எனவே வெயில் அதிகம் உணரப்படும். அதிக தண்ணீர் அருந்தவும்.'
          : "\n\n💡 High humidity means sweat evaporates less, so the heat feels more intense. Drink extra water.")
        : c.humidity < 30
        ? (lang === 'hi' ? '\n\n💡 कम नमी से त्वचा और गला सूख सकता है। तरल पदार्थ पिएं और मॉइस्चराइजर लगाएं।'
          : lang === 'ta' ? '\n\n💡 குறைந்த ஈரப்பதத்தால் தோல் மற்றும் தொண்டை வறண்டு போகலாம். திரவங்கள் அருந்தவும், மாய்ஸ்சரைசர் பயன்படுத்தவும்.'
          : "\n\n💡 Low humidity can dry out your skin and throat. Drink fluids and use moisturizer.")
        : '';
      return lang === 'hi'
        ? `${locName} में नमी ${c.humidity}% है — हवा ${humidDesc} है।${effect}`
        : lang === 'ta'
        ? `${locName} இல் ஈரப்பதம் ${c.humidity}% — காற்று ${humidDesc}.${effect}`
        : `Humidity in ${locName} is ${c.humidity}% — the air feels ${humidDesc}.${effect}`;
    }

    case 'wind': {
      const windDesc = c.windSpeed >= 50 ? (lang === 'hi' ? 'बहुत तेज' : lang === 'ta' ? 'மிக வலுவான' : 'very strong')
        : c.windSpeed >= 30 ? (lang === 'hi' ? 'तेज' : lang === 'ta' ? 'வலுவான' : 'strong')
        : c.windSpeed >= 15 ? (lang === 'hi' ? 'मध्यम' : lang === 'ta' ? 'மிதமான' : 'moderate')
        : (lang === 'hi' ? 'हल्की' : lang === 'ta' ? 'மெல்லிய' : 'light');
      const caution = c.windSpeed >= 35
        ? (lang === 'hi' ? '\n\n⚠️ इतनी तेज हवा में खुले स्थानों पर सावधानी बरतें। छतरियाँ उड़ सकती हैं, पेड़ों की डालें टूट सकती हैं।'
          : lang === 'ta' ? '\n\n⚠️ இவ்வளவு வலுவான காற்றில் திறந்த இடங்களில் கவனமாக இருங்கள். குடைகள் பறக்கலாம், மரக்கிளைகள் முறியலாம்.'
          : "\n\n⚠️ Wind this strong requires caution in open areas. Umbrellas can fly away and branches can break.")
        : '';
      return lang === 'hi'
        ? `${locName} में हवा ${windDesc} है — ${Math.round(c.windSpeed)} किमी/घंटा, ${windDir} दिशा से।${caution}`
        : lang === 'ta'
        ? `${locName} இல் காற்று ${windDesc} — ${Math.round(c.windSpeed)} கிமீ/மணி, ${windDir} திசையிலிருந்து.${caution}`
        : `Wind in ${locName} is ${windDesc} — ${Math.round(c.windSpeed)} km/h from the ${windDir}.${caution}`;
    }

    case 'rain': {
      const rain = rainForecastToday(weather);
      const rainSum = weather.daily.precipitationSum[0];
      if (c.precipitation > 0) {
        const rainHoursNote = rain.rainHours.length > 0
          ? (lang === 'hi' ? `\n\nबारिश के समय: ${rain.rainHours.join(', ')}` : lang === 'ta' ? `\n\nமழை நேரம்: ${rain.rainHours.join(', ')}` : `\n\nRain hours: ${rain.rainHours.join(', ')}`)
          : '';
        return lang === 'hi'
          ? `हाँ, ${locName} में अभी बारिश हो रही है! 🌧️\n\nवर्तमान: ${c.precipitation}मिमी\nआज कुल अनुमान: ${rainSum?.toFixed(1)}मिमी\nअधिकतम संभावना: ${rain.maxChance}%${rainHoursNote}\n\n💡 छाता लेजाएं, ड्राइविंग में सावधानी रखें, और निचले इलाकों में जलभराव से बचें।`
          : lang === 'ta'
          ? `ஆம், ${locName} இல் இப்போது மழை பெய்கிறது! 🌧️\n\nதற்போது: ${c.precipitation}மிமீ\nஇன்று மொத்தம்: ${rainSum?.toFixed(1)}மிமீ\nஅதிகபட்ச வாய்ப்பு: ${rain.maxChance}%${rainHoursNote}\n\n💡 குடை எடுத்துச் செல்லுங்கள், வாகனம் ஓட்ட கவனமாக இருங்கள், தாழ்வான பகுதிகளில் நீர்த்தேக்கத்தை தவிர்க்கவும்.`
          : `Yes, it's raining in ${locName} right now! 🌧️\n\nCurrent: ${c.precipitation}mm\nToday's total expected: ${rainSum?.toFixed(1)}mm\nMax probability: ${rain.maxChance}%${rainHoursNote}\n\n💡 Carry an umbrella, drive carefully, and avoid waterlogged low areas.`;
      }
      if (rain.willRain) {
        return lang === 'hi'
          ? `अभी बारिश नहीं हो रही, लेकिन आज बारिश की संभावना ${rain.maxChance}% है। 🌦️\n\n${rain.rainHours.length > 0 ? `बारिश के संभावित समय: ${rain.rainHours.join(', ')}\n\n` : ''}💡 छाता साथ रखें — बिना छाता के भीगने से जुकाम-बुखार हो सकता है, और फोन/लैपटॉप भी खराब हो सकते हैं।`
          : lang === 'ta'
          ? `இப்போது மழை இல்லை, ஆனால் இன்று மழை வாய்ப்பு ${rain.maxChance}%. 🌦️\n\n${rain.rainHours.length > 0 ? `மழை எதிர்பார்க்கப்படும் நேரம்: ${rain.rainHours.join(', ')}\n\n` : ''}💡 குடை எடுத்துச் செல்லுங்கள் — குடை இல்லாமல் நனைந்தால் சளி-காய்ச்சல் வரலாம், போன்/லேப்டாப் கெட்டு போகலாம்.`
          : `No rain right now, but there's a ${rain.maxChance}% chance of rain today. 🌦️\n\n${rain.rainHours.length > 0 ? `Expected rain hours: ${rain.rainHours.join(', ')}\n\n` : ''}💡 Carry an umbrella — getting wet without one can lead to cold/fever, and your phone/laptop can get damaged.`;
      }
      return lang === 'hi'
        ? `${locName} में अभी बारिश नहीं हो रही और आज बारिश की संभावना भी कम (${rain.maxChance}%) है। ☀️\n\n💡 छाता की ज़रूरत नहीं, लेकिन मौसम बदल सकता है — सावधानी अच्छी बात है!`
        : lang === 'ta'
        ? `${locName} இல் இப்போது மழை இல்லை, இன்று மழை வாய்ப்பும் குறைவு (${rain.maxChance}%). ☀️\n\n💡 குடை தேவையில்லை, ஆனால் வானிலை மாறலாம் — எச்சரிக்கை நல்லது!`
        : `No rain in ${locName} right now and rain probability is low (${rain.maxChance}%). ☀️\n\n💡 No umbrella needed, but weather can change — better safe than sorry!`;
    }

    case 'uv': {
      const uvInfo = getUvLabel(c.uvIndex);
      const detail = c.uvIndex >= 8
        ? (lang === 'hi' ? 'अत्यधिक — सूर्य की किरणें 10-15 मिनट में त्वचा को नुकसान पहुंचा सकती हैं।'
          : lang === 'ta' ? 'மிக அதிகம் — 10-15 நிமிடத்தில் தோல் பாதிப்பு ஏற்படலாம்.'
          : 'Extreme — sun rays can damage skin in 10-15 minutes.')
        : c.uvIndex >= 6
        ? (lang === 'hi' ? 'उच्च — 20-30 मिनट में धूम्रपान संभव है।'
          : lang === 'ta' ? 'அதிகம் — 20-30 நிமிடத்தில் சூரிய எரிச்சல் சாத்தியம்.'
          : 'High — sunburn possible in 20-30 minutes.')
        : c.uvIndex >= 3
        ? (lang === 'hi' ? 'मध्यम — लंबे समय तक धूप में रहने से प्रभाव पड़ सकता है।'
          : lang === 'ta' ? 'மிதமான — நீண்ட நேரம் வெயிலில் இருந்தால் பாதிப்பு ஏற்படலாம்.'
          : 'Moderate — prolonged sun exposure can cause damage.')
        : (lang === 'hi' ? 'न्यून — त्वचा को कम जोखिम।'
          : lang === 'ta' ? 'குறைந்த — தோலுக்கு குறைந்த ஆபத்து.'
          : 'Low — minimal risk to skin.');
      const advice = c.uvIndex >= 6 && c.isDay
        ? (lang === 'hi' ? '\n\n💡 क्या करें: SPF 30+ सनस्क्रीन लगाएं, टोपी/धूप का चश्मा पहनें, 10-4 बजे के बीच छाया में रहें। बिना सुरक्षा के त्वचा कैंसर का जोखिम बढ़ता है।'
          : lang === 'ta' ? '\n\n💡 என்ன செய்ய: SPF 30+ சன்ஸ்கிரீன் பயன்படுத்தவும், தொப்பி/கண்ணாடி அணியவும், 10-4 மணிக்குள் நிழலில் இருங்கள். பாதுகாப்பு இல்லாமல் தோல் புற்றுநோய் ஆபத்து அதிகரிக்கும்.'
          : "\n\n💡 What to do: Apply SPF 30+ sunscreen, wear hat/sunglasses, stay in shade between 10-4. Without protection, skin cancer risk increases.")
        : '';
      return lang === 'hi'
        ? `${locName} में यूवी सूचकांक ${c.uvIndex} है (${uvInfo.label})। ${detail}${advice}`
        : lang === 'ta'
        ? `${locName} இல் யுவி குறியீடு ${c.uvIndex} (${uvInfo.label}). ${detail}${advice}`
        : `UV Index in ${locName} is ${c.uvIndex} (${uvInfo.label}). ${detail}${advice}`;
    }

    case 'aqi': {
      if (!weather.airQuality) {
        return lang === 'hi' ? 'इस स्थान के लिए वायु गुणवत्ता डेटा उपलब्ध नहीं है। 😔'
          : lang === 'ta' ? 'இந்த இடத்திற்கான காற்று தர தரவு கிடைக்கவில்லை. 😔'
          : 'Air quality data is not available for this location. 😔';
      }
      const idx = getCurrentHourIndex(weather.airQuality.time);
      const aqi = weather.airQuality.usAqi?.[idx] ?? weather.airQuality.europeanAqi?.[idx];
      const aqiInfo = getAqiLabel(aqi ?? 0, lang);
      const pm25 = weather.airQuality.pm2_5?.[idx];
      const pm10 = weather.airQuality.pm10?.[idx];
      const o3 = weather.airQuality.ozone?.[idx];
      const advice = (aqi ?? 0) > 150
        ? (lang === 'hi' ? '\n\n💡 क्या करें: N95 मास्क पहनें, बाहरी गतिविधि सीमित करें, खिड़कियां बंद रखें। बच्चे, बुजुर्ग और अस्थमा मरीज विशेष रूप से सावधान रहें।'
          : lang === 'ta' ? '\n\n💡 என்ன செய்ய: N95 முகமூடி அணியவும், வெளிப்புற செயல்பாடு குறைக்கவும், ஜன்னல்களை மூடவும். குழந்தைகள், முதியோர், ஆஸ்துமா நோயாளிகள் கவனமாக இருக்கவும்.'
          : "\n\n💡 What to do: Wear an N95 mask, limit outdoor activity, keep windows closed. Children, elderly, and asthma patients should be especially careful.")
        : (aqi ?? 0) > 100
        ? (lang === 'hi' ? '\n\n💡 संवेदनशील लोग मास्क पहनें, भारी व्यायाम से बचें।'
          : lang === 'ta' ? '\n\n💡 உணர்திறன் கொண்டவர்கள் முகமூடி அணியவும், கடும் உடற்பயிற்சி தவிர்க்கவும்.'
          : "\n\n💡 Sensitive individuals should wear a mask and avoid heavy exercise.")
        : '';
      return lang === 'hi'
        ? `${locName} में वायु गुणवत्ता:\n\nसूचकांक: ${Math.round(aqi ?? 0)} (${aqiInfo.label})\nPM2.5: ${pm25?.toFixed(1)} µg/m³\nPM10: ${pm10?.toFixed(1)} µg/m³\nओजोन: ${o3?.toFixed(1)} µg/m³${advice}`
        : lang === 'ta'
        ? `${locName} இல் காற்று தரம்:\n\nகுறியீடு: ${Math.round(aqi ?? 0)} (${aqiInfo.label})\nPM2.5: ${pm25?.toFixed(1)} µg/m³\nPM10: ${pm10?.toFixed(1)} µg/m³\nஓசோன்: ${o3?.toFixed(1)} µg/m³${advice}`
        : `Air Quality in ${locName}:\n\nIndex: ${Math.round(aqi ?? 0)} (${aqiInfo.label})\nPM2.5: ${pm25?.toFixed(1)} µg/m³\nPM10: ${pm10?.toFixed(1)} µg/m³\nOzone: ${o3?.toFixed(1)} µg/m³${advice}`;
    }

    case 'sun': {
      const sunrise = weather.daily.sunrise[0];
      const sunset = weather.daily.sunset[0];
      const sr = new Date(sunrise).toLocaleTimeString(lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
      const ss = new Date(sunset).toLocaleTimeString(lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
      const now = new Date();
      const isAfterSunrise = now.getTime() > new Date(sunrise).getTime();
      const isAfterSunset = now.getTime() > new Date(sunset).getTime();
      let statusNote = '';
      if (!isAfterSunrise) {
        statusNote = lang === 'hi' ? `\n\n🌅 सूर्योदय से पहले — अभी अंधेरा है।` : lang === 'ta' ? `\n\n🌅 சூரிய உதயத்திற்கு முன் — இப்போது இருள்.` : `\n\n🌅 Before sunrise — it's still dark.`;
      } else if (isAfterSunset) {
        statusNote = lang === 'hi' ? `\n\n🌙 सूर्यास्त के बाद — रात हो गई है।` : lang === 'ta' ? `\n\n🌙 சூரிய அஸ்தமனத்திற்கு பிறகு — இரவு.` : `\n\n🌙 After sunset — it's nighttime.`;
      } else {
        const dayLengthMs = new Date(sunset).getTime() - new Date(sunrise).getTime();
        const elapsedMs = now.getTime() - new Date(sunrise).getTime();
        const remainingMin = Math.round((dayLengthMs - elapsedMs) / 60000);
        const remainingHr = Math.floor(remainingMin / 60);
        const remainingMinLeft = remainingMin % 60;
        statusNote = lang === 'hi' ? `\n\n☀️ दिन के ${remainingHr} घंटे ${remainingMinLeft} मिनट की धूप बाकी है।` : lang === 'ta' ? `\n\n☀️ பகலில் ${remainingHr} மணி ${remainingMinLeft} நிமிட சூரிய ஒளி மீதமுள்ளது.` : `\n\n☀️ You have ${remainingHr}h ${remainingMinLeft}m of daylight left.`;
      }
      return lang === 'hi'
        ? `${locName} में:\n\n🌅 सूर्योदय: ${sr}\n🌇 सूर्यास्त: ${ss}${statusNote}`
        : lang === 'ta'
        ? `${locName} இல்:\n\n🌅 சூரிய உதயம்: ${sr}\n🌇 சூரிய அஸ்தமனம்: ${ss}${statusNote}`
        : `In ${locName}:\n\n🌅 Sunrise: ${sr}\n🌇 Sunset: ${ss}${statusNote}`;
    }

    case 'risk': {
      const risk = assessRisk(weather);
      const rLabel = getRiskLabel(risk.level, lang);
      const rRec = getRiskRecommendation(risk, lang);
      const topFactors = [...risk.factors]
        .sort((a, b) => (b.score * b.weight) - (a.score * a.weight))
        .slice(0, 3)
        .filter((f) => f.score >= 25);
      const factorLines = topFactors.map((f) => {
        const fLabel = getRiskFactorLabel(f, lang);
        const fDesc = getRiskFactorDescription(f, lang);
        return `• ${fLabel} (${f.value}): ${fDesc}`;
      });
      const factorSection = factorLines.length > 0
        ? (lang === 'hi' ? `\n\nमुख्य कारक:\n${factorLines.join('\n')}` : lang === 'ta' ? `\n\nமுக்கிய காரணிகள்:\n${factorLines.join('\n')}` : `\n\nKey factors:\n${factorLines.join('\n')}`)
        : '';
      const outdoorLine = risk.outdoorSuitable
        ? (lang === 'hi' ? '\n\n✓ बाहरी गतिविधि के लिए उपयुक्त।' : lang === 'ta' ? '\n\n✓ வெளிப்புற செயல்பாட்டிற்கு ஏற்றது.' : '\n\n✓ Suitable for outdoor activities.')
        : (lang === 'hi' ? '\n\n✗ बाहरी गतिविधि के लिए अनुपयुक्त।' : lang === 'ta' ? '\n\n✗ வெளிப்புற செயல்பாட்டிற்கு பொருத்தமற்றது.' : '\n\n✗ Not suitable for outdoor activities.');
      return lang === 'hi'
        ? `${locName} का जोखिम स्तर: ${rLabel} (${risk.score}/100)\n\n${rRec}${factorSection}${outdoorLine}`
        : lang === 'ta'
        ? `${locName} இன் ஆபத்து நிலை: ${rLabel} (${risk.score}/100)\n\n${rRec}${factorSection}${outdoorLine}`
        : `Risk Level for ${locName}: ${rLabel} (${risk.score}/100)\n\n${rRec}${factorSection}${outdoorLine}`;
    }

    case 'alert': {
      const alerts = generateAlerts(weather, lang);
      if (alerts.length === 0) {
        return lang === 'hi' ? `अच्छी खबर! ${locName} में कोई मौसम चेतावनी नहीं है। ✅ सब कुछ सामान्य है, निश्चिंत रहें!`
          : lang === 'ta' ? `நல்ல செய்தி! ${locName} இல் எந்த எச்சரிக்கையும் இல்லை. ✅ அனைத்தும் சாதாரணம், நிம்மதியாக இருங்கள்!`
          : `Good news! No weather alerts for ${locName}. ✅ Everything is normal — you're all clear!`;
      }
      const lines = alerts.map(a => `${a.level === 'danger' ? '🚨 ' : '⚠️ '} ${a.title}: ${a.message}`);
      return lang === 'hi'
        ? `${locName} में ${alerts.length} सक्रिय चेतावनी हैं:\n\n${lines.join('\n\n')}\n\n💡 कृपया इन चेतावनियों को गंभीरता से लें और उचित कदम उठाएं।`
        : lang === 'ta'
        ? `${locName} இல் ${alerts.length} செயலில் எச்சரிக்கைகள்:\n\n${lines.join('\n\n')}\n\n💡 இந்த எச்சரிக்கைகளை கவனமாக எடுத்துக்கொண்டு பொருத்தமான நடவடிக்கை எடுக்கவும்.`
        : `There are ${alerts.length} active alert(s) for ${locName}:\n\n${lines.join('\n\n')}\n\n💡 Please take these alerts seriously and take appropriate action.`;
    }

    case 'advice': {
      return generateDetailedAdvice(weather, lang);
    }

    case 'forecast': {
      const days = weather.daily.time.length;
      const lines: string[] = [];
      const dayLabels = lang === 'hi' ? ['आज', 'कल'] : lang === 'ta' ? ['இன்று', 'நாளை'] : ['Today', 'Tomorrow'];
      for (let i = 0; i < Math.min(days, 7); i++) {
        const dLabel = i < 2 ? dayLabels[i] : new Date(weather.daily.time[i]).toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US', { weekday: 'short' });
        const dl = getWeatherLabel(weather.daily.weatherCode[i], lang);
        const rainProb = weather.daily.precipitationProbability[i];
        const windMax = Math.round(weather.daily.windSpeedMax[i]);
        const rainIcon = rainProb >= 60 ? '🌧️' : rainProb >= 30 ? '🌦️' : '☀️';
        lines.push(`${rainIcon} ${dLabel}: ${Math.round(weather.daily.tempMax[i])}°/${Math.round(weather.daily.tempMin[i])}° — ${dl}, ${rainProb}% rain, ${windMax} km/h wind`);
      }

      // Find notable days
      const rainyDays = [];
      const hotDays = [];
      for (let i = 0; i < Math.min(days, 7); i++) {
        if (weather.daily.precipitationProbability[i] >= 60) rainyDays.push(i);
        if (weather.daily.tempMax[i] >= 35) hotDays.push(i);
      }

      let notable = '';
      if (rainyDays.length > 0) {
        const dayNames = rainyDays.map(i => i < 2 ? dayLabels[i] : new Date(weather.daily.time[i]).toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US', { weekday: 'short' }));
        notable += lang === 'hi' ? `\n\n🌧️ बारिश वाले दिन: ${dayNames.join(', ')} — छाता रखें!` : lang === 'ta' ? `\n\n🌧️ மழை நாட்கள்: ${dayNames.join(', ')} — குடை எடுக்கவும்!` : `\n\n🌧️ Rainy days: ${dayNames.join(', ')} — bring an umbrella!`;
      }
      if (hotDays.length > 0) {
        const dayNames = hotDays.map(i => i < 2 ? dayLabels[i] : new Date(weather.daily.time[i]).toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US', { weekday: 'short' }));
        notable += lang === 'hi' ? `\n\n🔥 गर्म दिन: ${dayNames.join(', ')} — पानी साथ रखें!` : lang === 'ta' ? `\n\n🔥 வெயில் நாட்கள்: ${dayNames.join(', ')} — தண்ணீர் எடுத்துச் செல்லுங்கள்!` : `\n\n🔥 Hot days: ${dayNames.join(', ')} — carry water!`;
      }

      return lang === 'hi'
        ? `${locName} का 7-दिन पूर्वानुमान:\n\n${lines.join('\n')}${notable}`
        : lang === 'ta'
        ? `${locName} இன் 7-நாள் முன்னறிவிப்பு:\n\n${lines.join('\n')}${notable}`
        : `7-day forecast for ${locName}:\n\n${lines.join('\n')}${notable}`;
    }

    case 'hourly': {
      const currentHour = new Date().getHours();
      const lines: string[] = [];
      let willRainSoon = false;
      let rainTime = '';
      for (let i = 0; i < 6; i++) {
        const hourIdx = currentHour + i < weather.hourly.time.length ? currentHour + i : currentHour + i - 24;
        const time = new Date(weather.hourly.time[hourIdx]);
        const tLabel = i === 0 ? t('now', lang) : time.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        const dl = getWeatherLabel(weather.hourly.weatherCode[hourIdx], lang);
        const prob = weather.hourly.precipitationProbability[hourIdx];
        const rainIcon = prob >= 60 ? '🌧️' : prob >= 30 ? '🌦️' : '☀️';
        if (prob >= 50 && !willRainSoon) {
          willRainSoon = true;
          rainTime = tLabel;
        }
        lines.push(`${rainIcon} ${tLabel}: ${Math.round(weather.hourly.temperature[hourIdx])}° — ${dl}, ${prob}% rain, ${Math.round(weather.hourly.windSpeed[hourIdx])} km/h`);
      }
      const rainAlert = willRainSoon
        ? (lang === 'hi' ? `\n\n💡 नोट: ${rainTime} बजे बारिश की संभावना है — छाता लेजाएं!` : lang === 'ta' ? `\n\n💡 குறிப்பு: ${rainTime} மணிக்கு மழை வாய்ப்பு — குடை எடுத்துச் செல்லுங்கள்!` : `\n\n💡 Heads up: rain expected around ${rainTime} — grab an umbrella!`)
        : '';
      return lang === 'hi'
        ? `${locName} में अगले 6 घंटे:\n\n${lines.join('\n')}${rainAlert}`
        : lang === 'ta'
        ? `${locName} இல் அடுத்த 6 மணிநேரம்:\n\n${lines.join('\n')}${rainAlert}`
        : `Next 6 hours in ${locName}:\n\n${lines.join('\n')}${rainAlert}`;
    }

    case 'help': {
      return lang === 'hi'
        ? `मैं आपकी इन सभी बातों में मदद कर सकता हूं:\n\n🌡️ तापमान, नमी, हवा, दृश्यता पूछें\n🌧️ बारिश की संभावना जानें\n📅 7-दिन पूर्वानुमान देखें\n⏰ घंटे-घंटे मौसम जानें\n☂️ क्या छाता लेना चाहिए? विस्तृत सलाह पाएं\n🧴 सनस्क्रीन, जैकेट, मास्क की सलाह\n🚨 मौसम चेतावनी देखें\n⚠️ जोखिम स्तर जानें\n空气质量 वायु गुणवत्ता जानें\n🌅 सूर्योदय/सूर्यास्त समय\n\nबस कुछ भी पूछें — जैसे "क्या मुझे छाता लेना चाहिए?" या "कल बारिश होगी?"`
        : lang === 'ta'
        ? `நான் உங்களுக்கு இவை அனைத்திலும் உதவ முடியும்:\n\n🌡️ வெப்பநிலை, ஈரப்பதம், காற்று, பார்வை கேளுங்கள்\n🌧️ மழை வாய்ப்பு அறியவும்\n📅 7-நாள் முன்னறிவிப்பு பார்க்கவும்\n⏰ மணிநேர வானிலை அறியவும்\n☂️ குடை எடுக்க வேண்டுமா? விரிவான ஆலோசனை\n🧴 சன்ஸ்கிரீன், ஜாக்கெட், முகமூடி ஆலோசனை\n🚨 வானிலை எச்சரிக்கை பார்க்கவும்\n⚠️ ஆபத்து நிலை அறியவும்\n🌬️ காற்று தரம் அறியவும்\n🌅 சூரிய உதய/அஸ்தமன நேரம்\n\nஎதையும் கேளுங்கள் — "குடை எடுக்க வேண்டுமா?" அல்லது "நாளை மழை பெய்யுமா?" போன்று`
        : `I can help you with all of these:\n\n🌡️ Ask about temperature, humidity, wind, visibility\n🌧️ Check rain probability\n📅 View the 7-day forecast\n⏰ See hour-by-hour weather\n☂️ Get detailed advice on whether to carry an umbrella\n🧴 Sunscreen, jacket, and mask recommendations\n🚨 View weather alerts\n⚠️ Check the risk level\n🌬️ Air quality details\n🌅 Sunrise/sunset times\n\nJust ask anything — like "Should I carry an umbrella?" or "Will it rain tomorrow?"`;
    }

    case 'current':
    case 'unknown':
    default: {
      const extra: string[] = [];
      extra.push(`${t('humidity', lang)}: ${c.humidity}%`);
      extra.push(`${t('wind', lang)}: ${Math.round(c.windSpeed)} km/h ${windDir}`);
      if (c.precipitation > 0) extra.push(`${t('precipitation', lang)}: ${c.precipitation}mm`);
      const extraStr = extra.join(' • ');
      const rain = rainForecastToday(weather);
      const rainTip = rain.willRain
        ? (lang === 'hi' ? '\n\n💡 आज बारिश की संभावना है — छाता लेजाएं! और विस्तृत सलाह के लिए "क्या मुझे छाता लेना चाहिए?" पूछें।'
          : lang === 'ta' ? '\n\n💡 இன்று மழை வாய்ப்பு — குடை எடுத்துச் செல்லுங்கள்! மேலும் விரிவான ஆலோசனைக்கு "குடை எடுக்க வேண்டுமா?" என்று கேளுங்கள்.'
          : "\n\n💡 Rain expected today — grab an umbrella! For detailed advice, ask \"Should I carry an umbrella?\"")
        : '';
      return lang === 'hi'
        ? `${locName} में अभी ${Math.round(c.temperature)}°C है (महसूस ${Math.round(c.apparentTemperature)}°C), ${label}।\n\n${extraStr}${rainTip}`
        : lang === 'ta'
        ? `${locName} இல் இப்போது ${Math.round(c.temperature)}°C (உணர்வு ${Math.round(c.apparentTemperature)}°C), ${label}।\n\n${extraStr}${rainTip}`
        : `Currently in ${locName}: ${Math.round(c.temperature)}°C (feels like ${Math.round(c.apparentTemperature)}°C), ${label}.\n\n${extraStr}${rainTip}`;
    }
  }
}

export function getQuickPrompts(lang: Language): string[] {
  if (lang === 'hi') {
    return [
      'आज का मौसम कैसा है?',
      'क्या मुझे छाता लेना चाहिए?',
      'कल बारिश होगी?',
      'क्या बाहर जाना सुरक्षित है?',
      '7 दिन का पूर्वानुमान दिखाएं',
      'वायु गुणवत्ता कैसी है?',
    ];
  }
  if (lang === 'ta') {
    return [
      'இன்று வானிலை எப்படி?',
      'குடை எடுக்க வேண்டுமா?',
      'நாளை மழை பெய்யுமா?',
      'வெளியே செல்ல பாதுகாப்பானதா?',
      '7 நாள் முன்னறிவிப்பு காட்டு',
      'காற்று தரம் எப்படி?',
    ];
  }
  return [
    "What's the weather right now?",
    'Should I carry an umbrella?',
    'Will it rain tomorrow?',
    'Is it safe to go outside?',
    'Show me the 7-day forecast',
    "How's the air quality?",
  ];
}
