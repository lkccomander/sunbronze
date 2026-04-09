import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f7f1e7_0%,_#f0dfcc_45%,_#dfc2af_100%)] px-6 py-12 text-ink">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-plum/70">SunBronze Phase 6</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[36px] border border-white/60 bg-white/70 p-8 shadow-panel backdrop-blur">
            <h1 className="font-display text-5xl leading-none md:text-7xl">Receptionist UI is ready to take shape.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/72">
              Next.js, TypeScript, and Tailwind are set up for the staff-facing frontend. The first interface slice focuses on
              appointments, conversations, and customer operations against the stable backend and Railway deployment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand transition hover:bg-plum">
                Open Dashboard
              </Link>
              <Link href="/login" className="rounded-full border border-ink/15 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-sand">
                Staff Login Shell
              </Link>
            </div>
          </section>
          <section className="space-y-4">
            <div className="rounded-[30px] bg-ink p-6 text-sand shadow-panel">
              <p className="text-xs uppercase tracking-[0.35em] text-sand/55">Connected Surfaces</p>
              <ul className="mt-5 space-y-3 text-sm text-sand/80">
                <li>Appointments calendar and queue</li>
                <li>Customer lookup and details</li>
                <li>WhatsApp conversations inbox</li>
                <li>Services and staff management</li>
              </ul>
            </div>
            <div className="rounded-[30px] border border-ink/10 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.35em] text-ember">API Target</p>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                Set <code className="rounded bg-sand px-1.5 py-0.5">NEXT_PUBLIC_API_BASE_URL</code> in
                <code className="ml-1 rounded bg-sand px-1.5 py-0.5">frontend/.env.local</code> to connect this UI to Railway.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
