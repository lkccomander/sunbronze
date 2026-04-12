"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n";

export function LocaleSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <label className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--color-on-surface-variant)]">
      <span>{label}</span>
      <select
        className="rounded-[var(--radius-md)] bg-[var(--color-surface-container)] px-2 py-1 text-sm normal-case text-[var(--color-on-surface)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        value={locale}
        disabled={isPending}
        onChange={(event) => changeLocale(event.target.value as Locale)}
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
