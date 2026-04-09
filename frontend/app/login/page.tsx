import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f2e7d8_0%,_#ead8c5_100%)] px-6 py-12 text-ink">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[36px] bg-ink p-8 text-sand shadow-panel">
          <p className="text-xs uppercase tracking-[0.35em] text-sand/60">Staff Access</p>
          <h1 className="mt-4 font-display text-5xl leading-none">Front desk signin shell.</h1>
          <p className="mt-6 text-base leading-8 text-sand/75">
            This page is ready for the next step: wiring the staff login flow against the Railway API and protecting the receptionist interface with real session handling.
          </p>
        </section>
        <section className="rounded-[36px] border border-white/60 bg-white/75 p-8 shadow-panel backdrop-blur">
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-ink/55">Email</label>
              <input className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3 outline-none" placeholder="admin@sunbronze.local" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-ink/55">Password</label>
              <input className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3 outline-none" placeholder="phase4-runtime" type="password" />
            </div>
            <button className="w-full rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white transition hover:bg-plum">
              Connect Reception Workspace
            </button>
            <p className="text-sm text-ink/60">
              Next integration step: submit to <code className="rounded bg-sand px-1.5 py-0.5">/api/auth/login</code> and persist a secure staff session.
            </p>
            <Link href="/dashboard" className="inline-flex text-sm font-semibold text-plum underline-offset-4 hover:underline">
              Continue to the dashboard shell
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
