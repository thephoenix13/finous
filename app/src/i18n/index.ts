import { createInstance, type i18n as I18n } from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { hi } from "./locales/hi";

export const LANGUAGES = ["en", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "en";

/** Each language's own name, shown in the switcher. Never translated: you find your language by its own script. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: "English", hi: "हिन्दी" };

/** A display preference only, nothing financial. Safe to keep in localStorage. */
export const STORAGE_KEY = "finous.lang";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // private mode or blocked storage
  }
}

/** The saved choice wins, then the browser's language preferences in order, then English. */
export function detectLanguage(): Language {
  const stored = readStored();
  if (isLanguage(stored)) return stored;

  const preferred = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split("-")[0];
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

/** Keeps <html lang> in step, so screen readers pick the right voice and the browser the right font. */
function syncHtmlLang(lng: string) {
  if (typeof document !== "undefined") document.documentElement.lang = lng;
}

/**
 * A fresh, fully loaded instance. Catalogs are bundled (and so precached by the service worker),
 * which means translations work offline and there is no loading state to design for.
 */
export function createI18n(lng: Language = detectLanguage()): I18n {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    resources: { en: { translation: en }, hi: { translation: hi } },
    lng,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES,
    load: "languageOnly",
    defaultNS: "translation",
    interpolation: { escapeValue: false }, // React already escapes
    initAsync: false,
    react: { useSuspense: false },
  });
  syncHtmlLang(lng);
  instance.on("languageChanged", syncHtmlLang);
  return instance;
}

/** Switches the UI language and remembers it for next time. */
export async function setLanguage(instance: I18n, lng: Language): Promise<void> {
  await instance.changeLanguage(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* the switch still applies for this session */
  }
}
