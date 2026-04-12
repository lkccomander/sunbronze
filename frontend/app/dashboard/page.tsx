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

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday(): Date {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function formatTime(value: string | null, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
}

function customerName(customer: CustomerSummary | undefined, fallback: string): string {
  if (!customer) {
    return fallback;
  }
  return customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.whatsapp_phone_e164;
}

async function loadDashboardData(accessToken: string | null): Promise<{
  appointments: AppointmentSummary[];
  barbers: BarberSummary[];
  customers: CustomerSummary[];
  conversations: StaffConversationSummary[];
  services: ServiceSummary[];
}> {
  const todayStart = startOfToday().toISOString();
  const todayEnd = endOfToday().toISOString();

  const [appointments, barbers, customers, services, conversations] = await Promise.all([
    fetchApiJson<AppointmentSummary[]>(`/api/appointments?from=${encodeURIComponent(todayStart)}&start_to=${encodeURIComponent(todayEnd)}`).catch(() => []),
    fetchApiJson<BarberSummary[]>("/api/barbers?is_active=true&limit=200").catch(() => []),
    fetchApiJson<CustomerSummary[]>("/api/customers?is_active=true&limit=200").catch(() => []),
    fetchApiJson<ServiceSummary[]>("/api/services?is_active=true&limit=200").catch(() => []),
    accessToken
      ? fetchApiJsonWithToken<StaffConversationSummary[]>("/api/staff/conversations", accessToken).catch(() => [])
      : Promise.resolve([]),
  ]);

  return { appointments, barbers, customers, conversations, services };
}

export default async function DashboardPage() {
  const [{ dictionary: d }, locale] = await Promise.all([getRequestDictionary(), getRequestLocale()]);
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value ?? null;
  const { appointments, barbers, customers, conversations, services } = await loadDashboardData(sessionToken);
  const customerById = new Map(customers.map((item) => [item.id, item]));
  const serviceById = new Map(services.map((item) => [item.id, item.name]));
  const pendingConversations = conversations.filter((item) => item.handed_off_to_human || item.assigned_staff_user_id === null);
  const inChair = appointments.filter((item) => item.status === "checked_in").length;

  return (
    <AppShell title={d.dashboard.title} eyebrow={d.dashboard.eyebrow} activeNav="dashboard">
      <div className="grid gap-5 md:grid-cols-4">
        <StatCard label={d.dashboard.stats.appointmentsToday} value={String(appointments.length)} tone="accent" />
        <StatCard label={d.dashboard.stats.inChair} value={String(inChair)} />
        <StatCard label={d.dashboard.stats.pendingChats} value={String(pendingConversations.length)} tone="soft" />
        <StatCard label={d.dashboard.stats.activeSpecialists} value={String(barbers.length)} />
      </div>
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
