import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel } from "@/components/ui";

export default function AppointmentsPage() {
  return (
    <AppShell title="Appointments" eyebrow="Schedule">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Queue" subtitle="Reception-first view of what needs action.">
          <div className="space-y-3">
            {[
              "09:00 Walter - Corte",
              "10:30 Andres - Corte + Barba",
              "13:00 Cabina - Sesion de Bronceado",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-ink/10 px-4 py-3 text-sm text-ink/75">
                {item}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Calendar surface" subtitle="Reserved for the richer calendar/list hybrid.">
          <EmptyState
            title="Calendar layout placeholder"
            body="This page is intentionally ready for the next step: connect real appointment data and swap this placeholder for a receptionist-friendly schedule board."
          />
        </Panel>
      </div>
    </AppShell>
  );
}
