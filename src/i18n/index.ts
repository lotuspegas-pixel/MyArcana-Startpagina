import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LOCALE_CODES, localeMeta, resolveLocale } from '../lib/locales';

// Dutch and English ship in the main bundle: between them they cover most
// first loads, so the page paints without waiting on a second request.
import nl from './locales/nl.json';
import en from './locales/en.json';

const EAGER: Record<string, Record<string, string>> = { nl, en };

/**
 * The remaining nineteen locales load on demand. Vite turns each glob entry
 * into its own chunk, so a Japanese visitor downloads Japanese and nothing
 * else.
 */
const LAZY = import.meta.glob<{ default: Record<string, string> }>([
  './locales/*.json',
  '!./locales/nl.json',
  '!./locales/en.json',
]);

async function loadBundle(code: string): Promise<Record<string, string> | null> {
  if (EAGER[code]) return EAGER[code];
  const loader = LAZY[`./locales/${code}.json`];
  if (!loader) return null;
  try {
    return (await loader()).default;
  } catch {
    return null;
  }
}

/** Reads the language the store persisted, before the store itself loads. */
function storedLanguage(): string | null {
  try {
    const raw = localStorage.getItem('myarcana-store');
    const lang = raw ? JSON.parse(raw)?.state?.settings?.language : null;
    return typeof lang === 'string' && LOCALE_CODES.includes(lang) ? lang : null;
  } catch {
    return null;
  }
}

export const initialLanguage =
  storedLanguage() ?? resolveLocale(navigator.languages ?? [navigator.language]);

export function applyDocumentLanguage(code: string) {
  const meta = localeMeta(code);
  document.documentElement.lang = code;
  document.documentElement.dir = meta.dir;
}

/** Boots i18next with the visitor's language already in place. */
export async function initI18n(): Promise<void> {
  const bundle = (await loadBundle(initialLanguage)) ?? en;

  await i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      [initialLanguage]: { translation: bundle },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    supportedLngs: LOCALE_CODES,
    // Our keys contain dots ("widget.rss.desc"), so nesting must stay off.
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  applyDocumentLanguage(initialLanguage);
}

/** Switches language, fetching its bundle the first time it is picked. */
export async function setLanguage(code: string) {
  if (!i18next.hasResourceBundle(code, 'translation')) {
    const bundle = await loadBundle(code);
    if (bundle) i18next.addResourceBundle(code, 'translation', bundle, true, true);
  }
  await i18next.changeLanguage(code);
  applyDocumentLanguage(code);
}

export default i18next;
