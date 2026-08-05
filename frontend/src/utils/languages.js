/**
 * Centralized Language Configuration
 * Supports 45+ languages including Indian Regional and Global Foreign Languages.
 */
export const LANGUAGES = [
  // ── Pinned Default ──
  { code: 'en', name: 'English (Default)', flag: '🇬🇧', bcp47: 'en-US' },

  // ── Indian & South Asian Languages ──
  { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳', bcp47: 'hi-IN' },
  { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇮🇳', bcp47: 'bn-IN' },
  { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳', bcp47: 'te-IN' },
  { code: 'mr', name: 'मराठी (Marathi)', flag: '🇮🇳', bcp47: 'mr-IN' },
  { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳', bcp47: 'ta-IN' },
  { code: 'ur', name: 'اردو (Urdu)', flag: '🇮🇳', bcp47: 'ur-PK' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳', bcp47: 'gu-IN' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳', bcp47: 'kn-IN' },
  { code: 'ml', name: 'മലയാളം (Malayalam)', flag: '🇮🇳', bcp47: 'ml-IN' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳', bcp47: 'pa-IN' },
  { code: 'or', name: 'ଓଡ଼ିଆ (Odia)', flag: '🇮🇳', bcp47: 'or-IN' },
  { code: 'as', name: 'অসমীয়া (Assamese)', flag: '🇮🇳', bcp47: 'as-IN' },
  { code: 'sa', name: 'संस्कृतम् (Sanskrit)', flag: '🇮🇳', bcp47: 'sa-IN' },
  { code: 'ne', name: 'नेपाली (Nepali)', flag: '🇳🇵', bcp47: 'ne-NP' },
  { code: 'si', name: 'සිංහල (Sinhala)', flag: '🇱🇰', bcp47: 'si-LK' },

  // ── Major European Languages ──
  { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸', bcp47: 'es-ES' },
  { code: 'fr', name: 'Français (French)', flag: '🇫🇷', bcp47: 'fr-FR' },
  { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪', bcp47: 'de-DE' },
  { code: 'it', name: 'Italiano (Italian)', flag: '🇮🇹', bcp47: 'it-IT' },
  { code: 'pt', name: 'Português (Portuguese)', flag: '🇵🇹', bcp47: 'pt-PT' },
  { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺', bcp47: 'ru-RU' },
  { code: 'nl', name: 'Nederlands (Dutch)', flag: '🇳🇱', bcp47: 'nl-NL' },
  { code: 'pl', name: 'Polski (Polish)', flag: '🇵🇱', bcp47: 'pl-PL' },
  { code: 'uk', name: 'Українська (Ukrainian)', flag: '🇺🇦', bcp47: 'uk-UA' },
  { code: 'sv', name: 'Svenska (Swedish)', flag: '🇸🇪', bcp47: 'sv-SE' },
  { code: 'el', name: 'Ελληνικά (Greek)', flag: '🇬🇷', bcp47: 'el-GR' },
  { code: 'ro', name: 'Română (Romanian)', flag: '🇷🇴', bcp47: 'ro-RO' },
  { code: 'hu', name: 'Magyar (Hungarian)', flag: '🇭🇺', bcp47: 'hu-HU' },
  { code: 'cs', name: 'Čeština (Czech)', flag: '🇨🇿', bcp47: 'cs-CZ' },
  { code: 'da', name: 'Dansk (Danish)', flag: '🇩🇰', bcp47: 'da-DK' },
  { code: 'fi', name: 'Suomi (Finnish)', flag: '🇫🇮', bcp47: 'fi-FI' },
  { code: 'no', name: 'Norsk (Norwegian)', flag: '🇳🇴', bcp47: 'no-NO' },
  { code: 'tr', name: 'Türkçe (Turkish)', flag: '🇹🇷', bcp47: 'tr-TR' },

  // ── East & Southeast Asian Languages ──
  { code: 'zh-CN', name: '中文 (简体) (Chinese)', flag: '🇨🇳', bcp47: 'zh-CN' },
  { code: 'zh-TW', name: '中文 (繁體) (Chinese Trad)', flag: '🇹🇼', bcp47: 'zh-TW' },
  { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵', bcp47: 'ja-JP' },
  { code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷', bcp47: 'ko-KR' },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)', flag: '🇻🇳', bcp47: 'vi-VN' },
  { code: 'th', name: 'ไทย (Thai)', flag: '🇹🇭', bcp47: 'th-TH' },
  { code: 'id', name: 'Bahasa Indonesia (Indonesian)', flag: '🇮🇩', bcp47: 'id-ID' },
  { code: 'ms', name: 'Bahasa Melayu (Malay)', flag: '🇲🇾', bcp47: 'ms-MY' },
  { code: 'tl', name: 'Tagalog (Filipino)', flag: '🇵🇭', bcp47: 'tl-PH' },

  // ── Middle Eastern & African Languages ──
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦', bcp47: 'ar-SA' },
  { code: 'fa', name: 'فارسی (Persian)', flag: '🇮🇷', bcp47: 'fa-IR' },
  { code: 'he', name: 'עברית (Hebrew)', flag: '🇮🇱', bcp47: 'he-IL' },
  { code: 'sw', name: 'Kiswahili (Swahili)', flag: '🇰🇪', bcp47: 'sw-KE' }
];

export const INCLUDED_LANG_CODES = LANGUAGES.map(l => l.code).join(',');

export const getBcp47Locale = (code) => {
  const found = LANGUAGES.find(l => l.code.toLowerCase() === (code || '').toLowerCase());
  return found ? found.bcp47 : 'en-US';
};
