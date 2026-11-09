// UI + answer strings. English / हिन्दी.
export const CAT = {
  en: ['Low – below Cat 1', 'Cat 1 – Caution', 'Cat 2 – Elevated', 'Cat 3 – High', 'Cat 4 – Very high', 'Cat 5 – Extreme'],
  hi: ['कम – श्रेणी 1 से नीचे', 'श्रेणी 1 – सावधानी', 'श्रेणी 2 – बढ़ा हुआ', 'श्रेणी 3 – अधिक', 'श्रेणी 4 – बहुत अधिक', 'श्रेणी 5 – अत्यधिक'],
};
export const IMD = {
  en: ['No IMD heat-wave criterion met', 'IMD heat-wave criterion met', 'IMD SEVERE heat-wave criterion met'],
  hi: ['IMD लू (हीट वेव) मानदंड पूरा नहीं', 'IMD लू (हीट वेव) मानदंड पूरा', 'IMD गंभीर लू मानदंड पूरा'],
};
export const WORKLOAD = {
  en: { easy: 'light work', moderate: 'moderate work', hard: 'heavy work' },
  hi: { easy: 'हल्का काम', moderate: 'मध्यम काम', hard: 'भारी काम' },
};
export const REGION = {
  en: { plains: 'plains', coastal: 'coastal', hills: 'hills' },
  hi: { plains: 'मैदानी', coastal: 'तटीय', hills: 'पहाड़ी' },
};

export const UI = {
  en: {
    title: 'LuSaathi', tagline: 'Heat-safety helper for outdoor workers',
    placeLabel: 'Place (city / town / village)', placeholder: 'e.g. Nagpur or जयपुर', search: 'Check',
    workload: 'Type of work', region: 'IMD region', auto: 'auto',
    ask: 'Ask a question', askPlaceholder: 'Can I work on the roof at 2pm tomorrow in Nagpur?', askBtn: 'Answer',
    share: 'Share advisory on WhatsApp', copy: 'Copy text', copied: 'Copied',
    next72: 'Next 72 hours (work hours 06:00–18:00 highlighted)', days: 'Daily outlook',
    hour: 'Time', temp: 'Air °C', rh: 'RH %', tw: 'Wet-bulb °C', hi: 'Heat index °C', wbgt: 'WBGT °C (higher of 2)', cat: 'Category',
    wr: 'Work/rest per hour', water: 'Water',
    loading: 'Loading forecast…', notFound: 'Place not found in India. Try another spelling.',
    netErr: 'Could not reach the forecast service. Check your connection and try again.',
    tmax: 'Max temp', normal: 'Normal', dep: 'Departure', peak: 'Peak WBGT', dangerous: 'Cat 4–5 work hours',
    none: 'none', noLimit: 'no limit', normalPending: 'normal not loaded (departure test skipped)',
    sources: 'Methods, sources & limitations', disclaimer: 'Estimates from weather-model forecasts, not on-site measurements. Follow official IMD/NDMA/State Heat Action Plan alerts. If someone shows heat-stroke signs (confusion, hot dry skin, collapse) call 108/112 immediately.',
    forecastBy: 'Forecast: Open-Meteo (ECMWF/GFS/ICON blend). Normals: ERA5 1991–2020.',
    replayBanner: 'REPLAY MODE: archived forecast for a past date (2024 heatwave demo), not today’s weather.', replayLink: 'Demo: replay the May 2024 heatwave (Delhi, 28 May 2024)', live: 'Back to live forecast',
    lang: 'हिन्दी',
    wbgtNote: 'WBGT = the higher (more cautious) of two estimates: G = sun/globe model (Dimiceli–Piltz + Stull), B = BoM formula. Category and work/rest use that higher value.',
    hiNote: '* Heat index is outside the range the NWS formula is defined for (humidity below 13 % above 112 °F / 44.4 °C) — treat it as rough. Work/rest uses WBGT, which depends mostly on the wet-bulb temperature.',
  },
  hi: {
    title: 'लू साथी', tagline: 'बाहर काम करने वालों के लिए गर्मी-सुरक्षा साथी',
    placeLabel: 'जगह (शहर / कस्बा / गाँव)', placeholder: 'जैसे नागपुर या Jaipur', search: 'देखें',
    workload: 'काम का प्रकार', region: 'IMD क्षेत्र', auto: 'स्वतः',
    ask: 'सवाल पूछें', askPlaceholder: 'कल दोपहर जयपुर में काम करना सुरक्षित है?', askBtn: 'जवाब',
    share: 'WhatsApp पर सलाह भेजें', copy: 'टेक्स्ट कॉपी करें', copied: 'कॉपी हो गया',
    next72: 'अगले 72 घंटे (काम के घंटे 06:00–18:00 हाइलाइट)', days: 'दैनिक स्थिति',
    hour: 'समय', temp: 'तापमान °C', rh: 'नमी %', tw: 'वेट-बल्ब °C', hi: 'हीट इंडेक्स °C', wbgt: 'WBGT °C (2 में ज़्यादा)', cat: 'श्रेणी',
    wr: 'हर घंटे काम/आराम', water: 'पानी',
    loading: 'पूर्वानुमान लोड हो रहा है…', notFound: 'भारत में यह जगह नहीं मिली। दूसरी वर्तनी आज़माएँ।',
    netErr: 'पूर्वानुमान सेवा से जुड़ नहीं पाए। इंटरनेट जाँचें और फिर कोशिश करें।',
    tmax: 'अधिकतम तापमान', normal: 'सामान्य', dep: 'विचलन', peak: 'अधिकतम WBGT', dangerous: 'श्रेणी 4–5 काम के घंटे',
    none: 'कोई नहीं', noLimit: 'कोई सीमा नहीं', normalPending: 'सामान्य तापमान लोड नहीं (विचलन जाँच नहीं हुई)',
    sources: 'तरीका, स्रोत और सीमाएँ', disclaimer: 'ये मौसम-मॉडल पूर्वानुमान पर आधारित अनुमान हैं, साइट पर मापे गए आँकड़े नहीं। IMD/NDMA/राज्य हीट एक्शन प्लान की आधिकारिक चेतावनी मानें। लू लगने के लक्षण (भ्रम, गर्म सूखी त्वचा, बेहोशी) दिखें तो तुरंत 108/112 पर कॉल करें।',
    forecastBy: 'पूर्वानुमान: Open-Meteo (ECMWF/GFS/ICON)। सामान्य: ERA5 1991–2020।',
    replayBanner: 'रीप्ले मोड: पिछली तारीख का संग्रहित पूर्वानुमान (2024 लू डेमो), आज का मौसम नहीं।', replayLink: 'डेमो: मई 2024 की लू दोबारा देखें (दिल्ली, 28 मई 2024)', live: 'लाइव पूर्वानुमान पर लौटें',
    lang: 'English',
    wbgtNote: 'WBGT = दो अनुमानों में से ज़्यादा (ज़्यादा सतर्क) वाला: G = धूप/ग्लोब मॉडल (Dimiceli–Piltz + Stull), B = BoM सूत्र। श्रेणी और काम/आराम इसी ज़्यादा मान से तय होते हैं।',
    hiNote: '* इतनी कम नमी (13% से कम) और 44.4°C से ज़्यादा तापमान पर हीट इंडेक्स का NWS सूत्र भरोसेमंद नहीं — इसे मोटा अनुमान मानें। काम/आराम WBGT से तय होता है, जो मुख्यतः वेट-बल्ब तापमान पर निर्भर है।',
  },
};

const pad = (n) => String(n).padStart(2, '0');
const DOW = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'] };
const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'] };
export function fmtDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DOW[lang][w]} ${d} ${MON[lang][m - 1]}`;
}
export const fmtHour = (h) => `${pad(h)}:00`;
export const r1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
export const r0 = (x) => String(Math.round(x));

export function workRestText(wr, lang) {
  if (wr.noLimit) return lang === 'hi' ? 'कोई समय-सीमा नहीं' : 'no work-time limit';
  return lang === 'hi' ? `${wr.workMin} मिनट काम / ${wr.restMin} मिनट छाँव में आराम` : `${wr.workMin} min work / ${wr.restMin} min rest in shade`;
}

/** Which WBGT estimate drove the answer (cautious rule: the higher one). */
export const SRC = {
  en: { globe: 'sun/globe model', bom: 'BoM formula' },
  hi: { globe: 'धूप/ग्लोब मॉडल', bom: 'BoM सूत्र' },
};
