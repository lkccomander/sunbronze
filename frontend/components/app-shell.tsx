import Link from "next/link";
import type { ReactNode } from "react";

import { getApiStatus } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/appointments", label: "Appointments" },
  { href: "/customers", label: "Customers" },
  { href: "/conversations", label: "Conversations" },
  { href: "/services", label: "Services" },
  { href: "/dev", label: "Dev" },
];

export async function AppShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  const apiStatus = await getApiStatus();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(229,93,45,0.18),_transparent_34%),linear-gradient(180deg,_#f7f1e7_0%,_#f3ead9_46%,_#efe3d0_100%)] text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-72 shrink-0 rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-panel backdrop-blur md:block">
          <p className="font-sans text-xs uppercase tracking-[0.4em] text-plum/70">SunBronze</p>
          <h1 className="mt-4 font-display text-3xl leading-none">Reception HQ</h1>
          <p className="mt-4 text-sm text-ink/70">
            Staff workspace for schedules, customers, and WhatsApp-driven front desk operations.
          </p>
          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-ink/78 transition hover:bg-ink hover:text-sand"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 rounded-3xl bg-ink px-5 py-6 text-sand">
            <p className="text-xs uppercase tracking-[0.35em] text-sand/60">Live API</p>
            <p className="mt-3 text-sm leading-6 text-sand/80">
              Connect this UI to Railway with <code className="rounded bg-white/10 px-1.5 py-0.5">NEXT_PUBLIC_API_BASE_URL</code>.
            </p>
          </div>
        </aside>
        <main className="flex-1 rounded-[32px] border border-white/60 bg-white/75 p-5 shadow-panel backdrop-blur md:p-8">
          <div className="flex flex-col gap-3 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-ember">{eyebrow}</p>
              <h2 className="mt-3 font-display text-4xl leading-none md:text-5xl">{title}</h2>
            </div>
            <div className="flex items-center gap-3 self-start rounded-2xl bg-sand px-4 py-3 text-sm text-ink/70 md:self-auto">
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  apiStatus.online ? "bg-green-500 shadow-[0_0_14px_rgba(34,197,94,0.55)]" : "bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.5)]"
                }`}
                aria-hidden="true"
              />
              <span>{apiStatus.label}</span>
            </div>
          </div>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
