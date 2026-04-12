"use client";

import { useEffect, useState, useTransition } from "react";

const THEME_STORAGE_KEY = "sunbronze_theme";

type Theme = "dark" | "dark-green" | "light";

function normalizeTheme(value: string | null): Theme {
  if (value === "light" || value === "dark-green") {
    return value;
  }

  return "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function ThemeToggle({
  darkLabel,
  darkGreenLabel,
  lightLabel,
}: {
  darkLabel: string;
  darkGreenLabel: string;
  lightLabel: string;
}) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const storedTheme = normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
    setTheme(storedTheme);
    document.documentElement.dataset.theme = storedTheme;
  }, []);

  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    startTransition(() => applyTheme(nextTheme));
  }

  return (
    <label className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--color-on-surface-variant)]">
      <span>{theme === "dark" ? darkLabel : theme === "dark-green" ? darkGreenLabel : lightLabel}</span>
      <select
        className="rounded-[var(--radius-md)] bg-[var(--color-surface-container)] px-2 py-1 text-sm normal-case text-[var(--color-on-surface)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        value={theme}
        disabled={isPending}
        onChange={(event) => changeTheme(event.target.value as Theme)}
      >
        <option value="dark">{darkLabel}</option>
        <option value="dark-green">{darkGreenLabel}</option>
        <option value="light">{lightLabel}</option>
      </select>
    </label>
  );
}
