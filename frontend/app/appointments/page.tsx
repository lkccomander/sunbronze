import { cookies } from "next/headers";

import { AppointmentScheduler } from "@/components/appointment-scheduler";
import { AppShell } from "@/components/app-shell";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState } from "@/components/ui";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { businessDateParamToDate, endOfBusinessMonth, endOfBusinessWeek, startOfBusinessMonth, startOfBusinessWeek } from "@/lib/business-time";
import {
  type AppointmentSummary,
  type BarberSummary,
  type BarberTimeOffSummary,
  type CustomerSummary,
  type ResourceSummary,
  type ServiceSummary,
  fetchApiJson,
  fetchApiJsonWithToken,
} from "@/lib/api";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n-server";

type ScheduleViewMode = "day" | "week" | "month";

function viewModeFromParam(value: string | undefined): ScheduleViewMode {
  return value === "week" || value === "month" ? value : "day";
}

async function loadScheduleData(accessToken: string, activeDate: Date): Promise<{
  appointments: AppointmentSummary[];
  barbers: BarberSummary[];
  services: ServiceSummary[];
  customers: CustomerSummary[];
  resources: ResourceSummary[];
  timeOff: BarberTimeOffSummary[];
}> {
  const monthStart = startOfBusinessMonth(activeDate);
  const monthEnd = endOfBusinessMonth(activeDate);
  const rangeStart = startOfBusinessWeek(monthStart).toISOString();
  const rangeEnd = endOfBusinessWeek(monthEnd).toISOString();

  const [appointments, barbers, services, customers, resources] = await Promise.all([
    fetchApiJsonWithToken<AppointmentSummary[]>(`/api/appointments?from=${encodeURIComponent(rangeStart)}&start_to=${encodeURIComponent(rangeEnd)}`, accessToken).catch(() => []),
    fetchApiJson<BarberSummary[]>("/api/barbers?is_active=true&limit=200").catch(() => []),
    fetchApiJson<ServiceSummary[]>("/api/services?is_active=true&limit=200").catch(() => []),
    fetchApiJson<CustomerSummary[]>("/api/customers?is_active=true&limit=200").catch(() => []),
    fetchApiJson<ResourceSummary[]>("/api/resources?is_active=true&limit=200").catch(() => []),
  ]);

  const timeOffLists = await Promise.all(
    barbers.map((barber) =>
      fetchApiJson<BarberTimeOffSummary[]>(
        `/api/barbers/${barber.id}/time-off?from=${encodeURIComponent(rangeStart)}&ends_at=${encodeURIComponent(rangeEnd)}`,
      ).catch(() => []),
    ),
  );

  return { appointments, barbers, services, customers, resources, timeOff: timeOffLists.flat() };
}

export default async function AppointmentsPage({ searchParams }: { searchParams?: Promise<{ date?: string; view?: string }> }) {
  const [{ dictionary: d }, locale] = await Promise.all([getRequestDictionary(), getRequestLocale()]);
  const params = searchParams ? await searchParams : {};
  const activeDate = businessDateParamToDate(params.date) ?? new Date();
  const activeView = viewModeFromParam(params.view);
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return (
      <AppShell title={d.appointments.title} eyebrow={d.appointments.eyebrow} activeNav="appointments">
        <EmptyState title={d.common.sessionRequiredTitle} body={d.common.signInAgain} />
      </AppShell>
    );
  }

  const { appointments, barbers, services, customers, resources, timeOff } = await loadScheduleData(sessionToken, activeDate);

  return (
    <AppShell title={d.appointments.title} eyebrow={d.appointments.eyebrow} activeNav="appointments">
      <AutoRefresh pauseWhenSelector="[data-auto-refresh-pause='true']" />
      <AppointmentScheduler
        initialAppointments={appointments}
        initialTimeOff={timeOff}
        barbers={barbers}
        resources={resources}
        services={services}
        customers={customers}
        initialDate={activeDate.toISOString()}
        initialViewMode={activeView}
        copy={d.appointments}
        common={d.common}
        locale={locale}
      />
    </AppShell>
  );
}
