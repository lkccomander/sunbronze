import { cookies } from "next/headers";

import { AppointmentScheduler } from "@/components/appointment-scheduler";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import {
  type AppointmentSummary,
  type BarberSummary,
  type BarberTimeOffSummary,
  type CustomerSummary,
  type ServiceSummary,
  fetchApiJson,
  fetchApiJsonWithToken,
} from "@/lib/api";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n-server";

async function loadScheduleData(accessToken: string): Promise<{
  appointments: AppointmentSummary[];
  barbers: BarberSummary[];
  services: ServiceSummary[];
  customers: CustomerSummary[];
  timeOff: BarberTimeOffSummary[];
}> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const [appointments, barbers, services, customers] = await Promise.all([
    fetchApiJsonWithToken<AppointmentSummary[]>(`/api/appointments?from=${encodeURIComponent(monthStart)}&start_to=${encodeURIComponent(nextMonthStart)}`, accessToken).catch(() => []),
    fetchApiJson<BarberSummary[]>("/api/barbers?is_active=true&limit=200").catch(() => []),
    fetchApiJson<ServiceSummary[]>("/api/services?is_active=true&limit=200").catch(() => []),
    fetchApiJson<CustomerSummary[]>("/api/customers?is_active=true&limit=200").catch(() => []),
  ]);

  const timeOffLists = await Promise.all(
    barbers.map((barber) =>
      fetchApiJson<BarberTimeOffSummary[]>(
        `/api/barbers/${barber.id}/time-off?from=${encodeURIComponent(monthStart)}&ends_at=${encodeURIComponent(nextMonthStart)}`,
      ).catch(() => []),
    ),
  );

  return { appointments, barbers, services, customers, timeOff: timeOffLists.flat() };
}

export default async function AppointmentsPage() {
  const [{ dictionary: d }, locale] = await Promise.all([getRequestDictionary(), getRequestLocale()]);
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return (
      <AppShell title={d.appointments.title} eyebrow={d.appointments.eyebrow} activeNav="appointments">
        <EmptyState title={d.common.sessionRequiredTitle} body={d.common.signInAgain} />
      </AppShell>
    );
  }

  const { appointments, barbers, services, customers, timeOff } = await loadScheduleData(sessionToken);

  return (
    <AppShell title={d.appointments.title} eyebrow={d.appointments.eyebrow} activeNav="appointments">
      <AppointmentScheduler
        initialAppointments={appointments}
        initialTimeOff={timeOff}
        barbers={barbers}
        services={services}
        customers={customers}
        copy={d.appointments}
        common={d.common}
        locale={locale}
      />
    </AppShell>
  );
}
