"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import logoImage from "@/app/assets/logo.jpg";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, dictionaries, normalizeLocale, type Locale } from "@/lib/i18n";

function getSafeNextPath(): string {
  const nextPath = new URLSearchParams(window.location.search).get("next");

  if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

export default function LoginPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const d = dictionaries[locale];
  const privacyHref = locale === "en" ? "/privacy-en" : "/privacy";
  const termsHref = locale === "en" ? "/terms-of-service-en" : "/terms-of-service";

  useEffect(() => {
    const cookieLocale = document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${LOCALE_COOKIE_NAME}=`))
      ?.split("=")[1];
    setLocale(normalizeLocale(cookieLocale));
  }, []);

  function handleLocaleChange(nextLocale: Locale) {
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    setLocale(nextLocale);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        await response.json().catch(() => null);
        setError(d.login.loginFailed);
        setSubmitting(false);
        return;
      }

      router.push(getSafeNextPath());
      router.refresh();
    } catch {
      setError(d.login.networkError);
      setSubmitting(false);
    }
  }

  return (
    <main id="main" className="min-h-screen bg-[var(--color-background)] px-6 py-12 text-[var(--color-on-surface)]">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="card-muted">
          <div className="flex items-center justify-between gap-4">
            <div className="login-brand">
              <Image className="login-brand-logo" src={logoImage} alt="SunBronze" priority />
              <p className="stat-label">{d.login.eyebrow}</p>
            </div>
            <select
              className="rounded-[var(--radius-md)] bg-[var(--color-surface-container)] px-2 py-1 text-sm text-[var(--color-on-surface)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              value={locale}
              onChange={(event) => handleLocaleChange(event.target.value as Locale)}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <h1 className="page-title mt-4 text-[2.75rem]">{d.login.title}</h1>
          <p className="page-subtitle mt-6 max-w-xl">
            {d.login.body}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <span className="pill pill-primary">{d.login.schedule}</span>
            <span className="pill pill-secondary">{d.login.customers}</span>
            <span className="pill pill-tertiary">{d.login.whatsapp}</span>
          </div>
        </section>
        <section className="card">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="staff-email" className="stat-label">
                {d.login.email}
              </label>
              <input
                id="staff-email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                className="input-field mt-2"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="staff-password" className="stat-label">
                {d.login.password}
              </label>
              <input
                id="staff-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="input-field mt-2"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="pill pill-tertiary w-full justify-center py-3" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? d.login.submitting : d.login.submit}
            </button>
          </form>
          <nav className="login-legal-links" aria-label={d.login.legal}>
            <Link href={privacyHref}>{d.login.privacy}</Link>
            <Link href={termsHref}>{d.login.terms}</Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
