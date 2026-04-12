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
      ? "stat-card-accent"
      : tone === "soft"
        ? "stat-card-soft"
        : "";

  return (
    <div className={`stat-card ${toneClass}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
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
    <section className="app-panel">
      <div className="app-panel-header">
        <h3 className="app-panel-title">{title}</h3>
        {subtitle ? <p className="app-panel-subtitle mt-1">{subtitle}</p> : null}
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
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-body">{body}</p>
    </div>
  );
}
