import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ServiceForm } from "@/components/service-form";
import { Panel } from "@/components/ui";
import { type ServiceSummary, fetchApiJson } from "@/lib/api";
import { getRequestDictionary } from "@/lib/i18n-server";

async function loadService(id: string): Promise<ServiceSummary | null> {
  return fetchApiJson<ServiceSummary>(`/api/services/${id}`).catch(() => null);
}

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ dictionary: d }, service] = await Promise.all([getRequestDictionary(), loadService(id)]);

  if (!service) {
    notFound();
  }

  return (
    <AppShell title={d.services.editService} eyebrow={d.services.eyebrow} activeNav="services">
      <Panel title={service.name} subtitle={d.services.serviceMapSubtitle}>
        <ServiceForm initialService={service} copy={d.services} common={d.common} />
      </Panel>
    </AppShell>
  );
}
