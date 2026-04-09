import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";

const serviceRows = [
  { service: "Corte", duration: "45 min", assigned: "Walter, Andres" },
  { service: "Barba", duration: "30 min", assigned: "Walter, Andres" },
  { service: "Sesion de Bronceado", duration: "30 min", assigned: "Cabina de Bronceado 1" },
];

export default function ServicesPage() {
  return (
    <AppShell title="Services & Staff" eyebrow="Management">
      <Panel title="Service map" subtitle="Starter management view for services and assignments.">
        <div className="overflow-hidden rounded-[28px] border border-ink/10">
          <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
            <thead className="bg-sand/70">
              <tr>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 bg-white">
              {serviceRows.map((row) => (
                <tr key={row.service}>
                  <td className="px-4 py-3">{row.service}</td>
                  <td className="px-4 py-3 text-ink/70">{row.duration}</td>
                  <td className="px-4 py-3 text-ink/70">{row.assigned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
