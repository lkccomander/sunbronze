import { AppShell } from "@/components/app-shell";
import { SpecialistsManager } from "@/components/specialists-manager";
import { type BarberSummary, type BarberWorkingHoursSummary, fetchApiJson } from "@/lib/api";
import { getRequestDictionary } from "@/lib/i18n-server";

async function loadSpecialistData(): Promise<{
  barbers: BarberSummary[];
  workingHours: Record<string, BarberWorkingHoursSummary[]>;
}> {
  const barbers = await fetchApiJson<BarberSummary[]>("/api/barbers?limit=200").catch(() => []);
  const hoursLists = await Promise.all(
    barbers.map((barber) => fetchApiJson<BarberWorkingHoursSummary[]>(`/api/barbers/${barber.id}/working-hours`).catch(() => [])),
  );
  const workingHours = barbers.reduce<Record<string, BarberWorkingHoursSummary[]>>((accumulator, barber, index) => {
    accumulator[barber.id] = hoursLists[index] ?? [];
    return accumulator;
  }, {});

  return { barbers, workingHours };
}

export default async function SpecialistsPage() {
  const [{ dictionary: d }, { barbers, workingHours }] = await Promise.all([getRequestDictionary(), loadSpecialistData()]);

  return (
    <AppShell title={d.specialists.title} eyebrow={d.specialists.eyebrow} activeNav="specialists">
      <SpecialistsManager initialBarbers={barbers} initialHours={workingHours} copy={d.services} common={d.common} />
    </AppShell>
  );
}
