import { cookies } from "next/headers";

import { getDictionary, LOCALE_COOKIE_NAME, normalizeLocale, type Dictionary, type Locale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function getRequestDictionary(): Promise<{ locale: Locale; dictionary: Dictionary }> {
  const locale = await getRequestLocale();
  return { locale, dictionary: getDictionary(locale) };
}
