import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel } from "@/components/ui";
import { ServicesManager } from "@/components/services-manager";
import { type ServiceSummary, fetchApiJson } from "@/lib/api";
import { getRequestDictionary } from "@/lib/i18n-server";

async function loadServiceData(): Promise<{
  services: ServiceSummary[];
}> {
  const services = await fetchApiJson<ServiceSummary[]>("/api/services?is_active=true&limit=200").catch(() => []);
  return { services };
}

export default async function ServicesPage() {
  const { dictionary: d } = await getRequestDictionary();
  const { services } = await loadServiceData();

  return (
    <AppShell title={d.services.title} eyebrow={d.services.eyebrow} activeNav="services">
      <Panel title={d.services.serviceMapTitle} subtitle={d.services.serviceMapSubtitle}>
        <ServicesManager initialServices={services} copy={d.services} common={d.common} />
        {services.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={d.services.emptyServicesTitle} body={d.services.emptyServicesBody} />
          </div>
        ) : null}
      </Panel>
    </AppShell>
  );
}
