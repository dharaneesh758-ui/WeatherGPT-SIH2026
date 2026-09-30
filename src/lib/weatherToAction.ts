import type { Language, RiskAssessment, WeatherData } from '@/types';

export interface WeatherAction {
  title: string;
  impact: string;
  affectedGroups: string[];
  actions: string[];
  priority: 'low' | 'moderate' | 'high' | 'extreme';
}

export function generateWeatherActions(
  weather: WeatherData,
  risk: RiskAssessment,
  lang: Language = 'en'
): WeatherAction[] {
  const actions: WeatherAction[] = [];
  const c = weather.current;

  // --------------------------------------------------
  // THUNDERSTORM / LIGHTNING
  // --------------------------------------------------
  if (c.weatherCode >= 95 || c.cape >= 1000) {
    actions.push({
      title:
        lang === 'ta'
          ? '⚡ இடியுடன் கூடிய மழை அபாயம்'
          : lang === 'hi'
          ? '⚡ आंधी-तूफान का जोखिम'
          : '⚡ Thunderstorm Risk',

      impact:
        lang === 'ta'
          ? 'இடி மற்றும் மின்னல் வெளிப்புற செயல்பாடுகள் மற்றும் பயணங்களுக்கு ஆபத்தை ஏற்படுத்தலாம்.'
          : lang === 'hi'
          ? 'आंधी और बिजली बाहरी गतिविधियों और यात्रा के लिए जोखिम पैदा कर सकती है।'
          : 'Thunderstorms and lightning may create risks for outdoor activities and travel.',

      affectedGroups:
        lang === 'ta'
          ? ['வெளிப்புற பணியாளர்கள்', 'மாணவர்கள்', 'பயணிகள்', 'விவசாயிகள்']
          : lang === 'hi'
          ? ['बाहरी कर्मचारी', 'छात्र', 'यात्री', 'किसान']
          : ['Outdoor workers', 'Students', 'Travelers', 'Farmers'],

      actions:
        lang === 'ta'
          ? [
              'முடிந்தவரை வீட்டிற்குள் செல்லவும்',
              'மரங்கள் மற்றும் தனிமையான உயரமான பொருட்களைத் தவிர்க்கவும்',
              'இடி நேரத்தில் வெளிப்புற நடவடிக்கைகளை நிறுத்தவும்',
            ]
          : lang === 'hi'
          ? [
              'जहां संभव हो घर के अंदर रहें',
              'पेड़ों और अलग-अलग ऊंची वस्तुओं से दूर रहें',
              'आंधी के दौरान बाहरी गतिविधियां रोक दें',
            ]
          : [
              'Move indoors when possible',
              'Stay away from isolated trees and tall objects',
              'Stop outdoor activities during thunderstorms',
            ],

      priority: 'high',
    });
  }

  // --------------------------------------------------
  // HEAVY RAIN
  // --------------------------------------------------
  if (
    c.weatherCode === 65 ||
    c.weatherCode === 67 ||
    c.weatherCode === 82 ||
    c.precipitation >= 10
  ) {
    actions.push({
      title:
        lang === 'ta'
          ? '🌧️ கனமழை தாக்கம்'
          : lang === 'hi'
          ? '🌧️ भारी बारिश का प्रभाव'
          : '🌧️ Heavy Rain Impact',

      impact:
        lang === 'ta'
          ? 'கனமழை தாழ்வான பகுதிகளில் நீர்த்தேக்கம் மற்றும் சாலைப் பயணத்தில் சிரமத்தை ஏற்படுத்தலாம்.'
          : lang === 'hi'
          ? 'भारी बारिश से निचले इलाकों में जलभराव और सड़क यात्रा में परेशानी हो सकती है।'
          : 'Heavy rainfall may cause waterlogging in low-lying areas and difficult road conditions.',

      affectedGroups:
        lang === 'ta'
          ? ['தாழ்வான பகுதிகளில் வசிப்பவர்கள்', 'சாலை பயணிகள்', 'பாதசாரிகள்', 'வெளிப்புற பணியாளர்கள்']
          : lang === 'hi'
          ? ['निचले इलाकों के निवासी', 'सड़क यात्री', 'पैदल यात्री', 'बाहरी कर्मचारी']
          : ['Low-lying area residents', 'Road commuters', 'Pedestrians', 'Outdoor workers'],

      actions:
        lang === 'ta'
          ? [
              'நீர்த்தேக்கம் உள்ள சாலைகளைத் தவிர்க்கவும்',
              'தேவையற்ற பயணத்தைத் தாமதப்படுத்தவும்',
              'மழை தீவிரமாக இருக்கும்போது பாதுகாப்பான இடத்தில் இருக்கவும்',
            ]
          : lang === 'hi'
          ? [
              'जलभराव वाली सड़कों से बचें',
              'अनावश्यक यात्रा को टालें',
              'बारिश तेज होने पर सुरक्षित स्थान पर रहें',
            ]
          : [
              'Avoid waterlogged roads',
              'Delay unnecessary travel',
              'Stay in a safe place during intense rainfall',
            ],

      priority: 'high',
    });
  }

  // --------------------------------------------------
  // HIGH WIND
  // --------------------------------------------------
  if (Math.max(c.windSpeed, c.windGusts) >= 50) {
    actions.push({
      title:
        lang === 'ta'
          ? '💨 வலுவான காற்று தாக்கம்'
          : lang === 'hi'
          ? '💨 तेज हवा का प्रभाव'
          : '💨 Strong Wind Impact',

      impact:
        lang === 'ta'
          ? 'வலுவான காற்று வெளிப்புற நடவடிக்கைகள் மற்றும் சாலைப் பயணத்தை பாதிக்கலாம்.'
          : lang === 'hi'
          ? 'तेज हवाएं बाहरी गतिविधियों और सड़क यात्रा को प्रभावित कर सकती हैं।'
          : 'Strong winds may affect outdoor activities and road travel.',

      affectedGroups:
        lang === 'ta'
          ? ['இருசக்கர வாகன ஓட்டிகள்', 'பாதசாரிகள்', 'வெளிப்புற பணியாளர்கள்']
          : lang === 'hi'
          ? ['दोपहिया वाहन चालक', 'पैदल यात्री', 'बाहरी कर्मचारी']
          : ['Two-wheeler riders', 'Pedestrians', 'Outdoor workers'],

      actions:
        lang === 'ta'
          ? [
              'திறந்த வெளிப் பகுதிகளில் தேவையற்ற நேரத்தைத் தவிர்க்கவும்',
              'இருசக்கர வாகனங்களில் கூடுதல் கவனம் செலுத்தவும்',
              'தளர்வான பொருட்களிலிருந்து விலகி இருக்கவும்',
            ]
          : lang === 'hi'
          ? [
              'खुले क्षेत्रों में अनावश्यक समय बिताने से बचें',
              'दोपहिया वाहन चलाते समय अतिरिक्त सावधानी रखें',
              'ढीली वस्तुओं से दूर रहें',
            ]
          : [
              'Avoid unnecessary time in exposed areas',
              'Use extra caution on two-wheelers',
              'Stay away from loose objects',
            ],

      priority: 'high',
    });
  }

  // --------------------------------------------------
  // EXTREME HEAT
  // --------------------------------------------------
  if (c.temperature >= 38 || c.apparentTemperature >= 40) {
    actions.push({
      title:
        lang === 'ta'
          ? '🌡️ அதிக வெப்பநிலை தாக்கம்'
          : lang === 'hi'
          ? '🌡️ अत्यधिक गर्मी का प्रभाव'
          : '🌡️ Extreme Heat Impact',

      impact:
        lang === 'ta'
          ? 'அதிக வெப்பநிலை மற்றும் உடல் உணரும் வெப்பம் வெளிப்புற பணிகளில் வெப்ப அழுத்தத்தை ஏற்படுத்தலாம்.'
          : lang === 'hi'
          ? 'अधिक तापमान और महसूस होने वाली गर्मी बाहरी गतिविधियों के दौरान गर्मी का तनाव पैदा कर सकती है।'
          : 'High temperature and apparent heat may increase heat stress during outdoor activities.',

      affectedGroups:
        lang === 'ta'
          ? ['வெளிப்புற பணியாளர்கள்', 'மாணவர்கள்', 'வயதானவர்கள்', 'விளையாட்டு வீரர்கள்']
          : lang === 'hi'
          ? ['बाहरी कर्मचारी', 'छात्र', 'बुजुर्ग', 'खिलाड़ी']
          : ['Outdoor workers', 'Students', 'Older adults', 'Athletes'],

      actions:
        lang === 'ta'
          ? [
              'நீண்ட நேரம் நேரடி வெயிலில் இருப்பதைத் தவிர்க்கவும்',
              'போதுமான தண்ணீர் குடிக்கவும்',
              'முடிந்தால் மதிய நேர வெளிப்புற செயல்பாடுகளை குறைக்கவும்',
            ]
          : lang === 'hi'
          ? [
              'लंबे समय तक सीधे धूप में रहने से बचें',
              'पर्याप्त पानी पिएं',
              'संभव हो तो दोपहर की बाहरी गतिविधियां कम करें',
            ]
          : [
              'Avoid prolonged direct sun exposure',
              'Drink enough water',
              'Reduce afternoon outdoor activities when possible',
            ],

      priority: 'high',
    });
  }

  // --------------------------------------------------
  // UV
  // --------------------------------------------------
  if (c.uvIndex >= 8) {
    actions.push({
      title:
        lang === 'ta'
          ? '☀️ அதிக UV தாக்கம்'
          : lang === 'hi'
          ? '☀️ उच्च UV प्रभाव'
          : '☀️ High UV Exposure',

      impact:
        lang === 'ta'
          ? 'அதிக UV அளவு நீண்ட நேர வெளிப்புற செயல்பாடுகளில் சூரிய கதிர்வீச்சு வெளிப்பாட்டை அதிகரிக்கலாம்.'
          : lang === 'hi'
          ? 'उच्च UV स्तर लंबे समय तक बाहर रहने पर सूर्य के संपर्क को बढ़ा सकता है।'
          : 'High UV levels increase exposure to ultraviolet radiation during prolonged outdoor activity.',

      affectedGroups:
        lang === 'ta'
          ? ['மாணவர்கள்', 'வெளிப்புற பணியாளர்கள்', 'விளையாட்டு வீரர்கள்']
          : lang === 'hi'
          ? ['छात्र', 'बाहरी कर्मचारी', 'खिलाड़ी']
          : ['Students', 'Outdoor workers', 'Athletes'],

      actions:
        lang === 'ta'
          ? [
              'நிழலில் இடைவெளி எடுத்துக்கொள்ளவும்',
              'பாதுகாப்பு ஆடைகளை பயன்படுத்தவும்',
              'நீண்ட நேர நேரடி வெயிலைத் தவிர்க்கவும்',
            ]
          : lang === 'hi'
          ? [
              'छाया में ब्रेक लें',
              'सुरक्षात्मक कपड़े इस्तेमाल करें',
              'लंबे समय तक सीधी धूप से बचें',
            ]
          : [
              'Take breaks in the shade',
              'Use protective clothing',
              'Avoid prolonged direct sunlight',
            ],

      priority: 'moderate',
    });
  }

  // --------------------------------------------------
  // LOW VISIBILITY
  // --------------------------------------------------
  if (c.visibility <= 5000) {
    actions.push({
      title:
        lang === 'ta'
          ? '🌫️ குறைந்த பார்வைத்திறன்'
          : lang === 'hi'
          ? '🌫️ कम दृश्यता'
          : '🌫️ Reduced Visibility',

      impact:
        lang === 'ta'
          ? 'குறைந்த பார்வைத்திறன் சாலைப் பயணத்தின் பாதுகாப்பை பாதிக்கலாம்.'
          : lang === 'hi'
          ? 'कम दृश्यता सड़क यात्रा की सुरक्षा को प्रभावित कर सकती है।'
          : 'Reduced visibility may affect road-travel safety.',

      affectedGroups:
        lang === 'ta'
          ? ['ஓட்டுநர்கள்', 'இருசக்கர வாகன ஓட்டிகள்', 'பாதசாரிகள்']
          : lang === 'hi'
          ? ['ड्राइवर', 'दोपहिया वाहन चालक', 'पैदल यात्री']
          : ['Drivers', 'Two-wheeler riders', 'Pedestrians'],

      actions:
        lang === 'ta'
          ? [
              'வாகன வேகத்தை குறைக்கவும்',
              'பாதுகாப்பான தூரத்தை பராமரிக்கவும்',
              'தேவையற்ற பயணத்தைத் தவிர்க்கவும்',
            ]
          : lang === 'hi'
          ? [
              'वाहन की गति कम करें',
              'सुरक्षित दूरी बनाए रखें',
              'अनावश्यक यात्रा से बचें',
            ]
          : [
              'Reduce vehicle speed',
              'Maintain a safe distance',
              'Avoid unnecessary travel',
            ],

      priority: 'moderate',
    });
  }

  // --------------------------------------------------
  // AIR QUALITY
  // --------------------------------------------------
  if (weather.airQuality) {
    const idx = weather.airQuality.time.findIndex((time) => {
      const d = new Date(time);
      const now = new Date();

      return (
        d.getHours() === now.getHours() &&
        d.getDate() === now.getDate()
      );
    });

    const aqiIndex = idx >= 0 ? idx : 0;

    const aqi =
      weather.airQuality.usAqi?.[aqiIndex] ??
      weather.airQuality.europeanAqi?.[aqiIndex] ??
      0;

    if (aqi >= 100) {
      actions.push({
        title:
          lang === 'ta'
            ? '😷 காற்றுத் தர தாக்கம்'
            : lang === 'hi'
            ? '😷 वायु गुणवत्ता प्रभाव'
            : '😷 Air Quality Impact',

        impact:
          lang === 'ta'
            ? 'காற்றுத் தரம் மோசமாக இருப்பதால் நீண்ட நேர வெளிப்புற செயல்பாடுகள் சிலருக்கு சுவாச அசௌகரியத்தை ஏற்படுத்தலாம்.'
            : lang === 'hi'
            ? 'खराब वायु गुणवत्ता लंबे समय तक बाहर रहने पर कुछ लोगों के लिए सांस संबंधी परेशानी पैदा कर सकती है।'
            : 'Poor air quality may cause breathing discomfort for some people during prolonged outdoor activity.',

        affectedGroups:
          lang === 'ta'
            ? ['ஆஸ்துமா உள்ளவர்கள்', 'குழந்தைகள்', 'வயதானவர்கள்', 'வெளிப்புற பணியாளர்கள்']
            : lang === 'hi'
            ? ['अस्थमा वाले लोग', 'बच्चे', 'बुजुर्ग', 'बाहरी कर्मचारी']
            : ['People with asthma', 'Children', 'Older adults', 'Outdoor workers'],

        actions:
          lang === 'ta'
            ? [
                'நீண்ட நேர வெளிப்புற உடற்பயிற்சியை குறைக்கவும்',
                'காற்றுத் தரம் மோசமாக இருக்கும்போது வெளிப்புற நேரத்தை குறைக்கவும்',
                'உங்களுக்கு சுவாச அசௌகரியம் ஏற்பட்டால் பாதுகாப்பான இடத்திற்குச் செல்லவும்',
              ]
            : lang === 'hi'
            ? [
                'लंबे समय तक बाहरी व्यायाम कम करें',
                'खराब वायु गुणवत्ता के दौरान बाहर बिताया समय कम करें',
                'सांस लेने में परेशानी होने पर सुरक्षित स्थान पर जाएं',
              ]
            : [
                'Reduce prolonged outdoor exercise',
                'Limit time outdoors when air quality is poor',
                'Move to a safer indoor environment if breathing discomfort occurs',
              ],

        priority: 'moderate',
      });
    }
  }

  // --------------------------------------------------
  // FALLBACK
  // --------------------------------------------------
  if (actions.length === 0) {
    actions.push({
      title:
        lang === 'ta'
          ? '✅ தற்போதைய நிலை'
          : lang === 'hi'
          ? '✅ वर्तमान स्थिति'
          : '✅ Current Conditions',

      impact:
        lang === 'ta'
          ? 'தற்போதைய வானிலை நிலைகளில் குறிப்பிடத்தக்க ஆபத்து கண்டறியப்படவில்லை.'
          : lang === 'hi'
          ? 'वर्तमान मौसम स्थितियों में कोई महत्वपूर्ण जोखिम नहीं पाया गया।'
          : 'No significant weather-related impact has been identified from the current conditions.',

      affectedGroups:
        lang === 'ta'
          ? ['பொதுமக்கள்']
          : lang === 'hi'
          ? ['General public']
          : ['General public'],

      actions:
        lang === 'ta'
          ? [
              'வழக்கமான செயல்பாடுகளை தொடரலாம்',
              'வானிலை மாற்றங்களை தொடர்ந்து கவனிக்கவும்',
            ]
          : lang === 'hi'
          ? [
              'सामान्य गतिविधियां जारी रख सकते हैं',
              'मौसम में बदलाव पर नजर रखें',
            ]
          : [
              'Normal activities can continue',
              'Continue monitoring weather changes',
            ],

      priority: risk.level === 'safe' ? 'low' : 'moderate',
    });
  }

  return actions;
}