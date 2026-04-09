import { AppShell } from "@/components/app-shell";
import { Panel, StatCard } from "@/components/ui";

export default function DashboardPage() {
  return (
    <AppShell title="Front Desk Dashboard" eyebrow="Reception">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending Conversations" value="12" tone="accent" />
        <StatCard label="Today Appointments" value="27" />
        <StatCard label="Available Barbers" value="3" tone="soft" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Today at a glance" subtitle="First pass layout for the receptionist workspace.">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl bg-sand p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-ink/50">Open needs</p>
              <p className="mt-3 text-sm leading-7 text-ink/72">Confirm new WhatsApp bookings, review cancellations, and assign human handoff conversations.</p>
            </div>
            <div className="rounded-3xl bg-ember/10 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-ink/50">Attention</p>
              <p className="mt-3 text-sm leading-7 text-ink/72">Surface failed outbound WhatsApp sends and double-booking conflicts once live data wiring is added.</p>
            </div>
          </div>
        </Panel>
        <Panel title="Launchpad" subtitle="Direct paths into the first Phase 6 screens.">
          <div className="space-y-3 text-sm text-ink/72">
            <p className="rounded-2xl bg-white p-4 shadow-sm">Appointments screen for list + calendar workflow.</p>
            <p className="rounded-2xl bg-white p-4 shadow-sm">Customer search for quick front-desk lookup.</p>
            <p className="rounded-2xl bg-white p-4 shadow-sm">Conversations inbox for WhatsApp-driven triage.</p>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
