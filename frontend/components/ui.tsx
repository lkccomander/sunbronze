import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "soft";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-ink text-sand"
      : tone === "soft"
        ? "bg-sage/20 text-ink"
        : "bg-white text-ink";

  return (
    <div className={`rounded-[24px] border border-ink/10 p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.3em] opacity-70">{label}</p>
      <p className="mt-4 font-display text-4xl leading-none">{value}</p>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-ink/10 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-display text-2xl">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-ink/65">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-ink/15 bg-sand/50 p-6">
      <p className="font-display text-2xl">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">{body}</p>
    </div>
  );
}
