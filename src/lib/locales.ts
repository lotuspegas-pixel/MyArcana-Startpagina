export interface LocaleMeta {
  code: string;
  /** Name in the language itself. */
  native: string;
  /** English name, for the secondary line in the picker. */
  english: string;
  dir: 'ltr' | 'rtl';
  flag: string;
}

/**
 * Dutch (the product's home language) plus the twenty most-spoken languages
 * in the world by total speakers.
 */
export const LOCALES: LocaleMeta[] = [
  { code: 'nl', native: 'Nederlands', english: 'Dutch', dir: 'ltr', flag: '🇳🇱' },
  { code: 'en', native: 'English', english: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'zh', native: '中文', english: 'Chinese (Mandarin)', dir: 'ltr', flag: '🇨🇳' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', dir: 'ltr', flag: '🇮🇳' },
  { code: 'es', native: 'Español', english: 'Spanish', dir: 'ltr', flag: '🇪🇸' },
  { code: 'ar', native: 'العربية', english: 'Arabic', dir: 'rtl', flag: '🇸🇦' },
  { code: 'fr', native: 'Français', english: 'French', dir: 'ltr', flag: '🇫🇷' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', dir: 'ltr', flag: '🇧🇩' },
  { code: 'pt', native: 'Português', english: 'Portuguese', dir: 'ltr', flag: '🇵🇹' },
  { code: 'ru', native: 'Русский', english: 'Russian', dir: 'ltr', flag: '🇷🇺' },
  { code: 'ur', native: 'اردو', english: 'Urdu', dir: 'rtl', flag: '🇵🇰' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian', dir: 'ltr', flag: '🇮🇩' },
  { code: 'de', native: 'Deutsch', english: 'German', dir: 'ltr', flag: '🇩🇪' },
  { code: 'ja', native: '日本語', english: 'Japanese', dir: 'ltr', flag: '🇯🇵' },
  { code: 'mr', native: 'मराठी', english: 'Marathi', dir: 'ltr', flag: '🇮🇳' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu', dir: 'ltr', flag: '🇮🇳' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish', dir: 'ltr', flag: '🇹🇷' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', dir: 'ltr', flag: '🇱🇰' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese', dir: 'ltr', flag: '🇻🇳' },
  { code: 'ko', native: '한국어', english: 'Korean', dir: 'ltr', flag: '🇰🇷' },
  { code: 'it', native: 'Italiano', english: 'Italian', dir: 'ltr', flag: '🇮🇹' },
];

export const LOCALE_CODES = LOCALES.map((l) => l.code);

export const localeMeta = (code: string) =>
  LOCALES.find((l) => l.code === code) ?? LOCALES[0];

/** Maps a browser language tag ("nl-BE", "zh-Hant") onto a supported locale. */
export function resolveLocale(tags: readonly string[]): string {
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    const exact = LOCALE_CODES.find((c) => c === lower);
    if (exact) return exact;
    const base = lower.split('-')[0];
    const match = LOCALE_CODES.find((c) => c === base);
    if (match) return match;
  }
  return 'nl';
}
