import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel } from "@/components/ui";
import { SpecialistsManager } from "@/components/specialists-manager";
import { type BarberSummary, type BarberWorkingHoursSummary, type ServiceSummary, fetchApiJson } from "@/lib/api";
import { getRequestDictionary } from "@/lib/i18n-server";

function formatPrice(service: ServiceSummary, unpriced: string): string {
  if (service.price_cents === null) {
    return unpriced;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: service.currency_code,
  }).format(service.price_cents / 100);
}

async function loadServiceData(): Promise<{
  services: ServiceSummary[];
  barbers: BarberSummary[];
  workingHours: Record<string, BarberWorkingHoursSummary[]>;
}> {
  const [services, barbers] = await Promise.all([
    fetchApiJson<ServiceSummary[]>("/api/services?limit=200").catch(() => []),
    fetchApiJson<BarberSummary[]>("/api/barbers?limit=200").catch(() => []),
  ]);

  const hoursLists = await Promise.all(
    barbers.map((barber) => fetchApiJson<BarberWorkingHoursSummary[]>(`/api/barbers/${barber.id}/working-hours`).catch(() => [])),
  );
  const workingHours = barbers.reduce<Record<string, BarberWorkingHoursSummary[]>>((accumulator, barber, index) => {
    accumulator[barber.id] = hoursLists[index] ?? [];
    return accumulator;
  }, {});

  return { services, barbers, workingHours };
}

export default async function ServicesPage() {
  const { dictionary: d } = await getRequestDictionary();
  const { services, barbers, workingHours } = await loadServiceData();

  return (
    <AppShell title={d.services.title} eyebrow={d.services.eyebrow} activeNav="services">
      <div className="grid gap-6">
        <Panel title={d.services.serviceMapTitle} subtitle={d.services.serviceMapSubtitle}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{d.services.headers.service}</th>
                  <th>{d.services.headers.duration}</th>
                  <th>{d.services.headers.price}</th>
                  <th>{d.services.headers.needs}</th>
                  <th>{d.services.headers.status}</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <p className="font-semibold text-[var(--color-on-surface)]">{service.name}</p>
                      <p className="stat-label mt-1">{service.code}</p>
                    </td>
                    <td className="text-[var(--color-on-surface-variant)]">
                      {service.duration_minutes} min
                      {service.buffer_before_minutes || service.buffer_after_minutes ? (
                        <span className="block text-xs text-[var(--color-outline)]">
                          {d.common.buffer} {service.buffer_before_minutes}+{service.buffer_after_minutes}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-[var(--color-on-surface-variant)]">{formatPrice(service, d.services.unpriced)}</td>
                    <td className="text-[var(--color-on-surface-variant)]">
                      {[service.requires_barber ? d.services.barber : null, service.requires_resource ? d.services.resource : null].filter(Boolean).join(", ") || d.common.none}
                    </td>
                    <td>
                      <span className={`pill ${service.is_active ? "pill-primary" : "pill-tertiary"}`}>
                        {service.is_active ? d.common.active : d.common.inactive}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {services.length === 0 ? (
            <div className="mt-4">
              <EmptyState title={d.services.emptyServicesTitle} body={d.services.emptyServicesBody} />
            </div>
          ) : null}
        </Panel>
        <SpecialistsManager initialBarbers={barbers} initialHours={workingHours} copy={d.services} common={d.common} />
      </div>
    </AppShell>
  );
}
