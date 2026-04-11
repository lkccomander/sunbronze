"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error || "Login failed. Please verify your credentials.");
        setSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not complete sign in. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main id="main" className="min-h-screen bg-[linear-gradient(180deg,_#f2e7d8_0%,_#ead8c5_100%)] px-6 py-12 text-ink">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[36px] bg-ink p-8 text-sand shadow-panel">
          <p className="text-xs uppercase tracking-[0.35em] text-sand/60">Staff Access</p>
          <h1 className="mt-4 font-display text-5xl leading-none">Front desk sign in.</h1>
          <p className="mt-6 text-base leading-8 text-sand/75">
            Sign in with your staff credentials to access dashboard, appointments, customer, and conversation pages.
          </p>
        </section>
        <section className="rounded-[36px] border border-white/60 bg-white/75 p-8 shadow-panel backdrop-blur">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="staff-email" className="text-xs uppercase tracking-[0.3em] text-ink/55">
                Email
              </label>
              <input
                id="staff-email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="staff-password" className="text-xs uppercase tracking-[0.3em] text-ink/55">
                Password
              </label>
              <input
                id="staff-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white transition hover:bg-plum disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              {submitting ? "Signing in..." : "Connect Reception Workspace"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
