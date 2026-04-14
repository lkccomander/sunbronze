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
const DONUT_COLORS = ["#5b7cfa", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6", "#eab308"];

type DonutItem = {
  label: string;
  value: number;
  displayValue: string;
};

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
    : new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true, minute: "2-digit", timeZone: BUSINESS_TIME_ZONE }).format(date);
}

function customerName(customer: CustomerSummary | undefined, fallback: string): string {
  if (!customer) {
    return fallback;
  }
  return customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.whatsapp_phone_e164;
}

function formatPrice(service: ServiceSummary | undefined, fallback: string): string {
  if (service?.price_cents === null || service?.price_cents === undefined) {
    return `${service?.currency_code || "CRC"} ${fallback}`;
  }
  return `${service.currency_code} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(service.price_cents)}`;
}

function formatCurrencyAmount(value: number, currencyCode = "CRC"): string {
  return `${currencyCode} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;
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

function sortedDonutItems(items: Map<string, DonutItem>): DonutItem[] {
  return [...items.values()].sort((first, second) => second.value - first.value).slice(0, 6);
}

function distributionByService(appointments: AppointmentSummary[], serviceById: Map<string, ServiceSummary>, fallback: string): DonutItem[] {
  const items = new Map<string, DonutItem>();
  for (const appointment of appointments) {
    const service = serviceById.get(appointment.service_id);
    const label = service?.name || fallback;
    const current = items.get(appointment.service_id) || { label, value: 0, displayValue: "" };
    current.value += 1;
    current.displayValue = String(current.value);
    items.set(appointment.service_id, current);
  }
  return sortedDonutItems(items);
}

function distributionBySpecialist(appointments: AppointmentSummary[], barberById: Map<string, string>, fallback: string): DonutItem[] {
  const items = new Map<string, DonutItem>();
  for (const appointment of appointments) {
    const key = appointment.barber_id || "unassigned";
    const label = appointment.barber_id ? barberById.get(appointment.barber_id) || fallback : fallback;
    const current = items.get(key) || { label, value: 0, displayValue: "" };
    current.value += 1;
    current.displayValue = String(current.value);
    items.set(key, current);
  }
  return sortedDonutItems(items);
}

function revenueByService(appointments: AppointmentSummary[], serviceById: Map<string, ServiceSummary>, fallback: string): DonutItem[] {
  const items = new Map<string, DonutItem>();
  for (const appointment of appointments) {
    const service = serviceById.get(appointment.service_id);
    const label = service?.name || fallback;
    const revenue = service?.price_cents || 0;
    const current = items.get(appointment.service_id) || { label, value: 0, displayValue: "" };
    current.value += revenue;
    current.displayValue = formatCurrencyAmount(current.value, service?.currency_code || "CRC");
    items.set(appointment.service_id, current);
  }
  return sortedDonutItems(items);
}

function donutBackground(items: DonutItem[]): string {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) {
    return "conic-gradient(var(--color-surface-container-high) 0deg 360deg)";
  }

  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = cursor;
    const end = cursor + (item.value / total) * 360;
    cursor = end;
    return `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function DonutPanel({
  title,
  subtitle,
  items,
  emptyLabel,
  centerValue,
}: {
  title: string;
  subtitle: string;
  items: DonutItem[];
  emptyLabel: string;
  centerValue?: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const topItem = items[0];
  const topPercentage = topItem && total > 0 ? `${Math.round((topItem.value / total) * 100)}%` : "0%";
  const center = centerValue || topPercentage;

  return (
    <section className="app-panel">
      <div className="app-panel-header">
        <h3 className="app-panel-title">{title}</h3>
        <p className="app-panel-subtitle mt-1">{subtitle}</p>
      </div>
      {total > 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
          <div className="relative mx-auto flex size-44 items-center justify-center rounded-full" style={{ background: donutBackground(items) }} aria-hidden="true">
            <div className="flex size-28 flex-col items-center justify-center rounded-full bg-[var(--color-surface)] text-center shadow-[inset_0_0_0_1px_var(--color-surface-container-high)]">
              <span className="text-2xl font-semibold text-[var(--color-on-surface)]">{center}</span>
              <span className="mt-1 max-w-20 truncate text-xs text-[var(--color-outline)]">{topItem?.label}</span>
            </div>
          </div>
          <div className="grid gap-3">
            {items.map((item, index) => (
              <div key={item.label} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm">
                <span className="size-3 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                <span className="truncate font-medium text-[var(--color-on-surface)]">{item.label}</span>
                <span className="text-xs font-semibold text-[var(--color-outline)]">{item.displayValue}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title={emptyLabel} body="" />
      )}
    </section>
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
  const serviceById = new Map(services.map((item) => [item.id, item]));
  const barberById = new Map(barbers.map((item) => [item.id, item.display_name]));
  const pendingConversations = conversations.filter((item) => item.handed_off_to_human || item.assigned_staff_user_id === null);
  const inChair = appointments.filter((item) => item.status === "checked_in").length;
  const monthlyAppointments = appointmentCountsByMonth(yearlyAppointments);
  const monthlyLabels = monthLabels(locale);
  const highestMonthlyCount = Math.max(...monthlyAppointments, 1);
  const serviceDistribution = distributionByService(yearlyAppointments, serviceById, d.common.service);
  const specialistDistribution = distributionBySpecialist(yearlyAppointments, barberById, d.common.unassignedBarber);
  const serviceRevenue = revenueByService(yearlyAppointments, serviceById, d.common.service);
  const totalServiceRevenue = serviceRevenue.reduce((sum, item) => sum + item.value, 0);

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
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <DonutPanel
          title={d.dashboard.serviceDistributionTitle}
          subtitle={d.dashboard.serviceDistributionSubtitle}
          items={serviceDistribution}
          emptyLabel={d.dashboard.emptyDonutTitle}
        />
        <DonutPanel
          title={d.dashboard.specialistDistributionTitle}
          subtitle={d.dashboard.specialistDistributionSubtitle}
          items={specialistDistribution}
          emptyLabel={d.dashboard.emptyDonutTitle}
        />
        <DonutPanel
          title={d.dashboard.serviceRevenueTitle}
          subtitle={d.dashboard.serviceRevenueSubtitle}
          items={serviceRevenue}
          emptyLabel={d.dashboard.emptyDonutTitle}
          centerValue={formatCurrencyAmount(totalServiceRevenue)}
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title={d.dashboard.appointmentsTitle} subtitle={d.dashboard.appointmentsSubtitle}>
          {appointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="stat-label border-b border-[var(--color-surface-container-high)]">
                  <tr>
                    <th className="py-3 pr-4">{d.dashboard.appointmentsTable.customer}</th>
                    <th className="py-3 pr-4">{d.dashboard.appointmentsTable.service}</th>
                    <th className="py-3 pr-4">{d.dashboard.appointmentsTable.time}</th>
                    <th className="py-3 pr-4">{d.dashboard.appointmentsTable.price}</th>
                    <th className="py-3">{d.dashboard.appointmentsTable.specialist}</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((item) => {
                    const service = serviceById.get(item.service_id);
                    return (
                      <tr key={item.id} className="border-b border-[var(--color-surface-container-high)] last:border-b-0">
                        <td className="py-4 pr-4 font-semibold text-[var(--color-on-surface)]">{customerName(customerById.get(item.customer_id), d.common.customer)}</td>
                        <td className="py-4 pr-4 text-[var(--color-on-surface-variant)]">{service?.name || d.common.service}</td>
                        <td className="py-4 pr-4 text-[var(--color-outline)]">{formatTime(item.scheduled_start_at, locale, d.common.none)}</td>
                        <td className="py-4 pr-4 font-semibold text-emerald-400">{formatPrice(service, "-")}</td>
                        <td className="py-4 text-[var(--color-on-surface-variant)]">{item.barber_id ? barberById.get(item.barber_id) || d.common.assignedBarber : d.common.unassignedBarber}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
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
