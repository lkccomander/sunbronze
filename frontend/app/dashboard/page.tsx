import { AppShell } from "@/components/app-shell";
import { Panel, StatCard } from "@/components/ui";
import { getRequestDictionary } from "@/lib/i18n-server";

export default async function DashboardPage() {
  const { dictionary: d } = await getRequestDictionary();

  return (
    <AppShell title={d.dashboard.title} eyebrow={d.dashboard.eyebrow} activeNav="dashboard">
      <div className="grid gap-5 md:grid-cols-4">
        <StatCard label={d.dashboard.stats.revenue} value="$12.4k" tone="accent" />
        <StatCard label={d.dashboard.stats.appointments} value="27" />
        <StatCard label={d.dashboard.stats.inChair} value="06" tone="soft" />
        <StatCard label={d.dashboard.stats.pendingChats} value="12" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title={d.dashboard.activityTitle} subtitle={d.dashboard.activitySubtitle}>
          <div className="grid gap-4">
            {d.dashboard.activities.map(([icon, title, body, time]) => (
              <article key={title} className="flex items-start gap-4 rounded-[var(--radius-lg)] p-4 transition hover:bg-[var(--color-surface-container-low)]">
                <span className="material-symbols-outlined icon-lg text-[var(--color-primary)]" aria-hidden="true">
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-on-surface)]">{title}</p>
                  <p className="body-muted mt-1">{body}</p>
                </div>
                <p className="shrink-0 text-xs text-[var(--color-outline)]">{time}</p>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title={d.dashboard.staffTitle} subtitle={d.dashboard.staffSubtitle}>
          <div className="grid gap-3">
            {d.dashboard.staff.map(([initials, name, role, status]) => (
              <article key={name} className="flex items-center gap-4 rounded-[var(--radius-lg)] p-3 transition hover:bg-[var(--color-surface-container-low)]">
                <div className="avatar avatar-sm">{initials}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-on-surface)]">{name}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">{role}</p>
                </div>
                <span className={`pill ${status === d.dashboard.status.break ? "pill-tertiary" : status === d.dashboard.status.available ? "pill-secondary" : "pill-primary"}`}>{status}</span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
