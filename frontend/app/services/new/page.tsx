import { AppShell } from "@/components/app-shell";
import { ServiceForm } from "@/components/service-form";
import { Panel } from "@/components/ui";
import { getRequestDictionary } from "@/lib/i18n-server";

export default async function NewServicePage() {
  const { dictionary: d } = await getRequestDictionary();

  return (
    <AppShell title={d.services.newService} eyebrow={d.services.eyebrow} activeNav="services">
      <Panel title={d.services.createService} subtitle={d.services.serviceMapSubtitle}>
        <ServiceForm initialService={null} copy={d.services} common={d.common} />
      </Panel>
    </AppShell>
  );
}
