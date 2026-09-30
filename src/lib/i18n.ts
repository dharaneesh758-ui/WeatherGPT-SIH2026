import type { Language } from '@/types';

export const LANGUAGES: Record<Language, { label: string; nativeLabel: string; flag: string }> = {
  en: { label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  hi: { label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
  ta: { label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
};

type TranslationKey =
  | 'appName'
  | 'tagline'
  | 'search'
  | 'searchPlaceholder'
  | 'current'
  | 'hourly'
  | 'daily'
  | 'airQuality'
  | 'chat'
  | 'typeMessage'
  | 'send'
  | 'listen'
  | 'stop'
  | 'feelsLike'
  | 'humidity'
  | 'wind'
  | 'pressure'
  | 'cloudCover'
  | 'visibility'
  | 'uvIndex'
  | 'precipitation'
  | 'sunrise'
  | 'sunset'
  | 'today'
  | 'high'
  | 'low'
  | 'dashboard'
  | 'settings'
  | 'language'
  | 'units'
  | 'celsius'
  | 'fahrenheit'
  | 'saved'
  | 'addLocation'
  | 'removeLocation'
  | 'noSavedLocations'
  | 'goodMorning'
  | 'goodAfternoon'
  | 'goodEvening'
  | 'goodNight'
  | 'alerts'
  | 'noAlerts'
  | 'forecast'
  | 'now'
  | 'weather'
  | 'temperature'
  | 'clear'
  | 'mostlyClear'
  | 'partlyCloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavyRain'
  | 'snow'
  | 'thunderstorm'
  | 'loadingWeather'
  | 'errorWeather'
  | 'retry'
  | 'listening'
  | 'speechNotSupported'
  | 'chatGreeting'
  | 'chatPrompt'
  | 'aqiGood'
  | 'aqiModerate'
  | 'aqiUnhealthy'
  | 'aqiVeryUnhealthy'
  | 'aqiHazardous'
  | 'windDirection'
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun';

export const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = {
  en: {
    appName: 'WeatherGPT',
    tagline: 'Your AI weather companion',
    search: 'Search',
    searchPlaceholder: 'Search for a city...',
    current: 'Current',
    hourly: 'Hourly',
    daily: '7-Day',
    airQuality: 'Air Quality',
    chat: 'AI Chat',
    typeMessage: 'Ask about the weather...',
    send: 'Send',
    listen: 'Listen',
    stop: 'Stop',
    feelsLike: 'Feels like',
    humidity: 'Humidity',
    wind: 'Wind',
    pressure: 'Pressure',
    cloudCover: 'Cloud Cover',
    visibility: 'Visibility',
    uvIndex: 'UV Index',
    precipitation: 'Precipitation',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    today: 'Today',
    high: 'High',
    low: 'Low',
    dashboard: 'Dashboard',
    settings: 'Settings',
    language: 'Language',
    units: 'Units',
    celsius: 'Celsius',
    fahrenheit: 'Fahrenheit',
    saved: 'Saved Locations',
    addLocation: 'Add current location',
    removeLocation: 'Remove',
    noSavedLocations: 'No saved locations yet',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    goodNight: 'Good night',
    alerts: 'Weather Alerts',
    noAlerts: 'No active alerts — all clear!',
    forecast: 'Forecast',
    now: 'Now',
    weather: 'Weather',
    temperature: 'Temperature',
    clear: 'Clear sky',
    mostlyClear: 'Mostly clear',
    partlyCloudy: 'Partly cloudy',
    overcast: 'Overcast',
    fog: 'Foggy',
    drizzle: 'Light drizzle',
    rain: 'Rain',
    heavyRain: 'Heavy rain',
    snow: 'Snow',
    thunderstorm: 'Thunderstorm',
    loadingWeather: 'Loading weather data...',
    errorWeather: 'Unable to load weather. Please try again.',
    retry: 'Retry',
    listening: 'Listening...',
    speechNotSupported: 'Voice input is not supported in this browser',
    chatGreeting: "Hi! I'm your AI weather assistant. Ask me about current conditions, forecasts, or weather advice for any location.",
    chatPrompt: 'Ask about the weather...',
    aqiGood: 'Good',
    aqiModerate: 'Moderate',
    aqiUnhealthy: 'Unhealthy',
    aqiVeryUnhealthy: 'Very Unhealthy',
    aqiHazardous: 'Hazardous',
    windDirection: 'Wind Direction',
    mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
  },
  hi: {
    appName: 'वेदरGPT',
    tagline: 'आपका एआई मौसम साथी',
    search: 'खोज',
    searchPlaceholder: 'शहर खोजें...',
    current: 'वर्तमान',
    hourly: 'प्रति घंटा',
    daily: '7-दिन',
    airQuality: 'वायु गुणवत्ता',
    chat: 'एआई चैट',
    typeMessage: 'मौसम के बारे में पूछें...',
    send: 'भेजें',
    listen: 'सुनें',
    stop: 'रोकें',
    feelsLike: 'महसूस होता है',
    humidity: 'नमी',
    wind: 'हवा',
    pressure: 'दबाव',
    cloudCover: 'बादल',
    visibility: 'दृश्यता',
    uvIndex: 'यूवी सूचकांक',
    precipitation: 'वर्षण',
    sunrise: 'सूर्योदय',
    sunset: 'सूर्यास्त',
    today: 'आज',
    high: 'अधिकतम',
    low: 'न्यूनतम',
    dashboard: 'डैशबोर्ड',
    settings: 'सेटिंग्स',
    language: 'भाषा',
    units: 'इकाइयाँ',
    celsius: 'सेल्सियस',
    fahrenheit: 'फ़ारेनहाइट',
    saved: 'सहेजे गए स्थान',
    addLocation: 'वर्तमान स्थान जोड़ें',
    removeLocation: 'हटाएं',
    noSavedLocations: 'अभी कोई सहेजा गया स्थान नहीं',
    goodMorning: 'सुप्रभात',
    goodAfternoon: 'शुभ अपराह्न',
    goodEvening: 'शुभ संध्या',
    goodNight: 'शुभ रात्रि',
    alerts: 'मौसम चेतावनी',
    noAlerts: 'कोई सक्रिय चेतावनी नहीं — सब ठीक है!',
    forecast: 'पूर्वानुमान',
    now: 'अभी',
    weather: 'मौसम',
    temperature: 'तापमान',
    clear: 'साफ आसमान',
    mostlyClear: 'लगभग साफ',
    partlyCloudy: 'आंशिक बादल',
    overcast: 'बादल छाए हुए',
    fog: 'कोहरा',
    drizzle: 'हल्की बूंदाबांदी',
    rain: 'बारिश',
    heavyRain: 'भारी बारिश',
    snow: 'बर्फबारी',
    thunderstorm: 'गरज के साथ बारिश',
    loadingWeather: 'मौसम डेटा लोड हो रहा है...',
    errorWeather: 'मौसम लोड नहीं हो सका। पुनः प्रयास करें।',
    retry: 'पुनः प्रयास करें',
    listening: 'सुन रहा हूं...',
    speechNotSupported: 'इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं है',
    chatGreeting: 'नमस्ते! मैं आपका एआई मौसम सहायक हूं। किसी भी स्थान के मौसम, पूर्वानुमान या सलाह के बारे में पूछें।',
    chatPrompt: 'मौसम के बारे में पूछें...',
    aqiGood: 'अच्छा',
    aqiModerate: 'मध्यम',
    aqiUnhealthy: 'अस्वस्थ',
    aqiVeryUnhealthy: 'बहुत अस्वस्थ',
    aqiHazardous: 'खतरनाक',
    windDirection: 'हवा की दिशा',
    mon: 'सोम', tue: 'मंगल', wed: 'बुध', thu: 'गुरु', fri: 'शुक्र', sat: 'शनि', sun: 'रवि',
  },
  ta: {
    appName: 'வெதர்GPT',
    tagline: 'உங்கள் ஏஐ வானிலை துணை',
    search: 'தேடல்',
    searchPlaceholder: 'நகரத்தைத் தேடவும்...',
    current: 'தற்போதைய',
    hourly: 'மணிநேர',
    daily: '7-நாட்கள்',
    airQuality: 'காற்று தரம்',
    chat: 'ஏஐ அரட்டை',
    typeMessage: 'வானிலை பற்றி கேளுங்கள்...',
    send: 'அனுப்பு',
    listen: 'கேளு',
    stop: 'நிறுத்து',
    feelsLike: 'உணர்கிறது',
    humidity: 'ஈரப்பதம்',
    wind: 'காற்று',
    pressure: 'அழுத்தம்',
    cloudCover: 'மேகம்',
    visibility: 'பார்வை',
    uvIndex: 'யுவி குறியீடு',
    precipitation: 'மழைப்பொழிவு',
    sunrise: 'சூரிய உதயம்',
    sunset: 'சூரிய அஸ்தமனம்',
    today: 'இன்று',
    high: 'அதிகபட்ச',
    low: 'குறைந்தபட்ச',
    dashboard: 'டாஷ்போர்டு',
    settings: 'அமைப்புகள்',
    language: 'மொழி',
    units: 'அலகுகள்',
    celsius: 'செல்சியஸ்',
    fahrenheit: 'ஃபாரன்ஹீட்',
    saved: 'சேமிக்கப்பட்ட இடங்கள்',
    addLocation: 'தற்போதைய இடத்தைச் சேர்',
    removeLocation: 'அகற்று',
    noSavedLocations: 'இன்னும் சேமிக்கப்பட்ட இடங்கள் இல்லை',
    goodMorning: 'காலை வணக்கம்',
    goodAfternoon: 'நண்பகல் வணக்கம்',
    goodEvening: 'மாலை வணக்கம்',
    goodNight: 'இரவு வணக்கம்',
    alerts: 'வானிலை எச்சரிக்கைகள்',
    noAlerts: 'செயலில் எச்சரிக்கை இல்லை — அனைத்தும் நன்று!',
    forecast: 'முன்னறிவிப்பு',
    now: 'இப்போது',
    weather: 'வானிலை',
    temperature: 'வெப்பநிலை',
    clear: 'தெளிவான வானம்',
    mostlyClear: 'பெரும்பாலும் தெளிவு',
    partlyCloudy: 'ஓரளவு மேகம்',
    overcast: 'மேகமூட்டம்',
    fog: 'பனிமூட்டம்',
    drizzle: 'மெல்லிய தூறல்',
    rain: 'மழை',
    heavyRain: 'கனமழை',
    snow: 'பனிப்பொழிவு',
    thunderstorm: 'இடியுடன் மழை',
    loadingWeather: 'வானிலை தரவு ஏற்றப்படுகிறது...',
    errorWeather: 'வானிலையை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    retry: 'மீண்டும் முயற்சி',
    listening: 'கேட்கிறேன்...',
    speechNotSupported: 'இந்த உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை',
    chatGreeting: 'வணக்கம்! நான் உங்கள் ஏஐ வானிலை உதவியாளர். எந்த இடத்தின் வானிலை, முன்னறிவிப்பு அல்லது ஆலோசனை பற்றி கேளுங்கள்.',
    chatPrompt: 'வானிலை பற்றி கேளுங்கள்...',
    aqiGood: 'நல்லது',
    aqiModerate: 'மிதமானது',
    aqiUnhealthy: 'ஆரோக்கியமற்றது',
    aqiVeryUnhealthy: 'மிக ஆரோக்கியமற்றது',
    aqiHazardous: 'ஆபத்தானது',
    windDirection: 'காற்று திசை',
    mon: 'திங்', tue: 'செவ்', wed: 'புத', thu: 'வியா', fri: 'வெள்', sat: 'சனி', sun: 'ஞாயி',
  },
};

export function t(key: TranslationKey, lang: Language): string {
  return TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key;
}

export function getGreeting(lang: Language): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning', lang);
  if (hour < 17) return t('goodAfternoon', lang);
  if (hour < 21) return t('goodEvening', lang);
  return t('goodNight', lang);
}
