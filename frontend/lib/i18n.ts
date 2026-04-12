import en from "@/i18n/en.json";
import es from "@/i18n/es.json";

export const DEFAULT_LOCALE = "es";
export const LOCALE_COOKIE_NAME = "sunbronze_locale";

export const dictionaries = {
  en,
  es,
} as const;

export type Locale = keyof typeof dictionaries;
export type Dictionary = (typeof dictionaries)[Locale];

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : DEFAULT_LOCALE;
}

export function getDictionary(locale: string | null | undefined): Dictionary {
  return dictionaries[normalizeLocale(locale)];
}
