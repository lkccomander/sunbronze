import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel } from "@/components/ui";

export default function CustomersPage() {
  return (
    <AppShell title="Customer Search" eyebrow="CRM">
      <div className="grid gap-6">
        <Panel title="Search rail" subtitle="Fast lookup for front-desk staff.">
          <div className="rounded-3xl border border-ink/10 bg-sand/45 p-4">
            <p className="text-sm text-ink/70">Search by name, WhatsApp number, or preferred barber once API wiring is added.</p>
          </div>
        </Panel>
        <EmptyState
          title="Customer profile canvas"
          body="Use this screen for compact customer context: last visit, preferred barber, recent conversations, and upcoming appointment actions."
        />
      </div>
    </AppShell>
  );
}
