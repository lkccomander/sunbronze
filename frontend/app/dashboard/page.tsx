import { cookies } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { EmptyState, InitialsAvatar, Panel, StatCard } from "@/components/ui";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import {
  type AppointmentSummary,
  type BarberSummary,
  type CustomerSummary,
  type StaffConversationSummary,
  type ServiceSummary,
  fetchApiJson,
  fetchApiJsonWithToken,
} from "@/lib/api";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n-server";

const BUSINESS_TIME_ZONE = "America/Costa_Rica";

function businessDateParts(value: Date): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const partByType = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(partByType.get("year")),
    month: Number(partByType.get("month")),
    day: Number(partByType.get("day")),
  };
}

function businessDateStartUtc(year: number, month: number, day: number): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcGuess);
  const partByType = new Map(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(partByType.get("year")),
    Number(partByType.get("month")) - 1,
    Number(partByType.get("day")),
    Number(partByType.get("hour")),
    Number(partByType.get("minute")),
    Number(partByType.get("second")),
  );
  return new Date(utcGuess.getTime() - (zonedAsUtc - utcGuess.getTime()));
}

function startOfToday(): Date {
  const today = businessDateParts(new Date());
  return businessDateStartUtc(today.year, today.month, today.day);
}

function endOfToday(): Date {
  const date = startOfToday();
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function startOfBusinessYear(): Date {
  const today = businessDateParts(new Date());
  return businessDateStartUtc(today.year, 1, 1);
}

function startOfNextBusinessYear(): Date {
  const today = businessDateParts(new Date());
  return businessDateStartUtc(today.year + 1, 1, 1);
}

function formatTime(value: string | null, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: BUSINESS_TIME_ZONE }).format(date);
}

function customerName(customer: CustomerSummary | undefined, fallback: string): string {
  if (!customer) {
    return fallback;
  }
  return customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.whatsapp_phone_e164;
}

function appointmentCountsByMonth(appointments: AppointmentSummary[]): number[] {
  const today = businessDateParts(new Date());
  const counts = Array.from({ length: 12 }, () => 0);
  for (const appointment of appointments) {
    const startsAt = new Date(appointment.scheduled_start_at);
    if (Number.isNaN(startsAt.getTime())) {
      continue;
    }
    const parts = businessDateParts(startsAt);
    if (parts.year === today.year) {
      counts[parts.month - 1] += 1;
    }
  }
  return counts;
}

function monthLabels(locale: string): string[] {
  const today = businessDateParts(new Date());
  return Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { month: "short", timeZone: BUSINESS_TIME_ZONE }).format(
      businessDateStartUtc(today.year, index + 1, 1),
    ),
  );
}

async function loadDashboardData(accessToken: string | null): Promise<{
  appointments: AppointmentSummary[];
  yearlyAppointments: AppointmentSummary[];
  barbers: BarberSummary[];
  customers: CustomerSummary[];
  conversations: StaffConversationSummary[];
  services: ServiceSummary[];
}> {
  const todayStart = startOfToday().toISOString();
  const todayEnd = endOfToday().toISOString();
  const yearStart = startOfBusinessYear().toISOString();
  const nextYearStart = startOfNextBusinessYear().toISOString();

  const [appointments, yearlyAppointments, barbers, customers, services, conversations] = await Promise.all([
    fetchApiJson<AppointmentSummary[]>(`/api/appointments?from=${encodeURIComponent(todayStart)}&start_to=${encodeURIComponent(todayEnd)}`).catch(() => []),
    fetchApiJson<AppointmentSummary[]>(`/api/appointments?from=${encodeURIComponent(yearStart)}&start_to=${encodeURIComponent(nextYearStart)}`).catch(() => []),
    fetchApiJson<BarberSummary[]>("/api/barbers?is_active=true&limit=200").catch(() => []),
    fetchApiJson<CustomerSummary[]>("/api/customers?is_active=true&limit=200").catch(() => []),
    fetchApiJson<ServiceSummary[]>("/api/services?is_active=true&limit=200").catch(() => []),
    accessToken
      ? fetchApiJsonWithToken<StaffConversationSummary[]>("/api/staff/conversations", accessToken).catch(() => [])
      : Promise.resolve([]),
  ]);

  return { appointments, yearlyAppointments, barbers, customers, conversations, services };
}

export default async function DashboardPage() {
  const [{ dictionary: d }, locale] = await Promise.all([getRequestDictionary(), getRequestLocale()]);
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value ?? null;
  const { appointments, yearlyAppointments, barbers, customers, conversations, services } = await loadDashboardData(sessionToken);
  const customerById = new Map(customers.map((item) => [item.id, item]));
  const serviceById = new Map(services.map((item) => [item.id, item.name]));
  const pendingConversations = conversations.filter((item) => item.handed_off_to_human || item.assigned_staff_user_id === null);
  const inChair = appointments.filter((item) => item.status === "checked_in").length;
  const monthlyAppointments = appointmentCountsByMonth(yearlyAppointments);
  const monthlyLabels = monthLabels(locale);
  const highestMonthlyCount = Math.max(...monthlyAppointments, 1);

  return (
    <AppShell title={d.dashboard.title} eyebrow={d.dashboard.eyebrow} activeNav="dashboard">
      <div className="grid gap-5 md:grid-cols-4">
        <StatCard label={d.dashboard.stats.appointmentsToday} value={String(appointments.length)} tone="accent" />
        <StatCard label={d.dashboard.stats.inChair} value={String(inChair)} />
        <StatCard label={d.dashboard.stats.pendingChats} value={String(pendingConversations.length)} tone="soft" />
        <StatCard label={d.dashboard.stats.activeSpecialists} value={String(barbers.length)} />
      </div>
      <section className="app-panel mt-6">
        <div className="app-panel-header">
          <h3 className="app-panel-title">{d.dashboard.monthlyAppointmentsTitle}</h3>
          <p className="app-panel-subtitle mt-1">{d.dashboard.monthlyAppointmentsSubtitle}</p>
        </div>
        <div className="h-72 overflow-x-auto">
          <div className="grid h-full min-w-[760px] grid-cols-[44px_1fr] gap-4">
            <div className="flex flex-col justify-between pb-8 text-xs font-semibold text-[var(--color-outline)]">
              <span>{highestMonthlyCount}</span>
              <span>{Math.round(highestMonthlyCount / 2)}</span>
              <span>0</span>
            </div>
            <div className="grid grid-rows-[1fr_auto]">
              <div className="relative flex items-end justify-between gap-5 border-b border-[var(--color-surface-container-high)] bg-[linear-gradient(to_bottom,var(--color-surface-container-high)_1px,transparent_1px)] pb-0" style={{ backgroundSize: "100% 33.33%" }}>
                {monthlyAppointments.map((count, index) => (
                  <div key={monthlyLabels[index]} className="flex h-full flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-8 rounded-t-[var(--radius-sm)] bg-[var(--color-primary)]"
                      style={{ height: `${Math.max(count === 0 ? 0 : 8, (count / highestMonthlyCount) * 100)}%` }}
                      title={`${monthlyLabels[index]}: ${count}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between gap-5 text-sm font-semibold text-[var(--color-outline)]">
                {monthlyLabels.map((label) => (
                  <span key={label} className="flex-1 text-center">{label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title={d.dashboard.appointmentsTitle} subtitle={d.dashboard.appointmentsSubtitle}>
          <div className="grid gap-4">
            {appointments.map((item) => (
              <article key={item.id} className="flex items-start gap-4 rounded-[var(--radius-lg)] p-4 transition hover:bg-[var(--color-surface-container-low)]">
                <span className="material-symbols-outlined icon-lg text-[var(--color-primary)]" aria-hidden="true">
                  calendar_month
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-on-surface)]">{customerName(customerById.get(item.customer_id), d.common.customer)}</p>
                  <p className="body-muted mt-1">{serviceById.get(item.service_id) || d.common.service}</p>
                </div>
                <p className="shrink-0 text-xs text-[var(--color-outline)]">{formatTime(item.scheduled_start_at, locale, d.common.none)}</p>
              </article>
            ))}
          </div>
          {appointments.length === 0 ? <EmptyState title={d.dashboard.emptyAppointmentsTitle} body={d.dashboard.emptyAppointmentsBody} /> : null}
        </Panel>
        <Panel title={d.dashboard.staffTitle} subtitle={d.dashboard.staffSubtitle}>
          <div className="grid gap-3">
            {barbers.map((barber) => (
              <article key={barber.id} className="flex items-center gap-4 rounded-[var(--radius-lg)] p-3 transition hover:bg-[var(--color-surface-container-low)]">
                <InitialsAvatar name={barber.display_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-on-surface)]">{barber.display_name}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">{barber.email || barber.phone_e164 || barber.time_zone}</p>
                </div>
                <span className="pill pill-primary">{d.common.active}</span>
              </article>
            ))}
          </div>
          {barbers.length === 0 ? <EmptyState title={d.dashboard.emptyStaffTitle} body={d.dashboard.emptyStaffBody} /> : null}
        </Panel>
      </div>
    </AppShell>
  );
}
