import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel } from "@/components/ui";
import { type BarberSummary, type ServiceSummary, fetchApiJson } from "@/lib/api";

function formatPrice(service: ServiceSummary): string {
  if (service.price_cents === null) {
    return "Unpriced";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: service.currency_code,
  }).format(service.price_cents / 100);
}

async function loadServiceData(): Promise<{
  services: ServiceSummary[];
  barbers: BarberSummary[];
}> {
  const [services, barbers] = await Promise.all([
    fetchApiJson<ServiceSummary[]>("/api/services?limit=200").catch(() => []),
    fetchApiJson<BarberSummary[]>("/api/barbers?is_active=true&limit=200").catch(() => []),
  ]);

  return { services, barbers };
}

export default async function ServicesPage() {
  const { services, barbers } = await loadServiceData();
  const activeBarbers = barbers.filter((item) => item.is_active);

  return (
    <AppShell title="Services & Staff" eyebrow="Management">
      <div className="grid gap-6">
        <Panel title="Service map" subtitle="Live service catalog and scheduling requirements.">
          <div className="overflow-hidden rounded-[28px] border border-ink/10">
            <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
              <thead className="bg-sand/70">
                <tr>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Needs</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 bg-white">
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{service.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink/45">{service.code}</p>
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {service.duration_minutes} min
                      {service.buffer_before_minutes || service.buffer_after_minutes ? (
                        <span className="block text-xs text-ink/45">
                          Buffer {service.buffer_before_minutes}+{service.buffer_after_minutes}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink/70">{formatPrice(service)}</td>
                    <td className="px-4 py-3 text-ink/70">
                      {[service.requires_barber ? "barber" : null, service.requires_resource ? "resource" : null].filter(Boolean).join(", ") || "none"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/55">
                        {service.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {services.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No services returned" body="The services endpoint is reachable, but no service records were returned." />
            </div>
          ) : null}
        </Panel>
        <Panel title="Staff roster" subtitle="Active barbers available to schedule against services.">
          <div className="grid gap-3 md:grid-cols-2">
            {activeBarbers.map((barber) => (
              <article key={barber.id} className="rounded-2xl border border-ink/10 bg-sand/35 p-4">
                <p className="font-display text-2xl leading-none">{barber.display_name}</p>
                <p className="mt-2 text-sm text-ink/65">{barber.email || barber.phone_e164 || "No contact recorded"}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ink/45">{barber.time_zone}</p>
              </article>
            ))}
          </div>
          {activeBarbers.length === 0 ? <EmptyState title="No active staff returned" body="The barber endpoint did not return active staff records for this environment." /> : null}
        </Panel>
      </div>
    </AppShell>
  );
}
