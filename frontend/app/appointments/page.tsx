import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import {
  type AppointmentSummary,
  type BarberSummary,
  type CustomerSummary,
  type ServiceSummary,
  fetchApiJson,
  fetchApiJsonWithToken,
} from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n-server";

type AppointmentColumn = {
  id: string;
  label: string;
};

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 20;
const MINUTES_PER_HOUR = 60;
const HOUR_HEIGHT_PX = 76;

function formatDayTitle(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(value);
}

function formatTimeRange(start: Date, end: Date, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatTime(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function minuteOffsetFromDayStart(value: Date): number {
  return (value.getHours() - DAY_START_HOUR) * MINUTES_PER_HOUR + value.getMinutes();
}

function appointmentCardClasses(status: string): string {
  if (status === "cancelled") {
    return "border-[var(--color-tertiary-container)] bg-[rgba(247,197,197,0.45)]";
  }
  if (status === "confirmed") {
    return "border-[var(--color-primary-container)] bg-[var(--color-primary-container)]";
  }
  if (status === "pending") {
    return "border-[var(--color-secondary-container)] bg-[var(--color-secondary-container)]";
  }
  return "border-[var(--color-surface-container-high)] bg-[var(--color-surface-container-lowest)]";
}

async function loadScheduleData(accessToken: string): Promise<{
  appointments: AppointmentSummary[];
  barbers: BarberSummary[];
  services: ServiceSummary[];
  customers: CustomerSummary[];
}> {
  const [appointments, barbers, services, customers] = await Promise.all([
    fetchApiJsonWithToken<AppointmentSummary[]>("/api/staff/appointments", accessToken).catch(() => []),
    fetchApiJson<BarberSummary[]>("/api/barbers?is_active=true&limit=200").catch(() => []),
    fetchApiJson<ServiceSummary[]>("/api/services?is_active=true&limit=200").catch(() => []),
    fetchApiJson<CustomerSummary[]>("/api/customers?is_active=true&limit=200").catch(() => []),
  ]);

  return { appointments, barbers, services, customers };
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

  const today = new Date();
  const { appointments, barbers, services, customers } = await loadScheduleData(sessionToken);
  const serviceById = new Map(services.map((item) => [item.id, item.name]));
  const customerById = new Map(
    customers.map((item) => [item.id, item.display_name || [item.first_name, item.last_name].filter(Boolean).join(" ") || d.common.customer])
  );
  const barberById = new Map(barbers.map((item) => [item.id, item.display_name]));

  const dayAppointments = appointments
    .filter((item) => isSameDay(new Date(item.scheduled_start_at), today))
    .sort((left, right) => new Date(left.scheduled_start_at).getTime() - new Date(right.scheduled_start_at).getTime());

  const columns: AppointmentColumn[] = [
    ...barbers.map((item) => ({ id: item.id, label: item.display_name })),
    ...(dayAppointments.some((item) => !item.barber_id) ? [{ id: "unassigned", label: d.common.unassigned }] : []),
  ];
  const resolvedColumns = columns.length > 0 ? columns : [{ id: "open", label: d.appointments.openSchedule }];

  const dayMinutes = (DAY_END_HOUR - DAY_START_HOUR) * MINUTES_PER_HOUR;
  const boardHeight = dayMinutes * (HOUR_HEIGHT_PX / MINUTES_PER_HOUR);
  const hourMarkers = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => DAY_START_HOUR + index);

  return (
    <AppShell title={d.appointments.title} eyebrow={d.appointments.eyebrow} activeNav="appointments">
      <div className="app-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-surface-container-high)] pb-5">
          <div>
            <p className="stat-label">{d.appointments.dailyView}</p>
            <h3 className="mt-2 font-display text-3xl leading-none">{formatDayTitle(today, locale)}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary btn-sm">{d.common.blockTime}</button>
            <button className="btn btn-primary btn-sm">{d.common.newAppointment}</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div
              className="grid border-b border-[var(--color-surface-container-high)] bg-[var(--color-surface-container-low)]"
              style={{ gridTemplateColumns: `88px repeat(${resolvedColumns.length}, minmax(210px, 1fr))` }}
            >
              <div className="stat-label border-r border-[var(--color-surface-container-high)] px-3 py-4">{d.appointments.time}</div>
              {resolvedColumns.map((column) => (
                <div key={column.id} className="border-r border-[var(--color-surface-container-high)] px-4 py-4 last:border-r-0">
                  <p className="truncate text-base font-semibold text-[var(--color-on-surface)]">{column.label}</p>
                </div>
              ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: `88px repeat(${resolvedColumns.length}, minmax(210px, 1fr))` }}>
              <div className="relative border-r border-[var(--color-surface-container-high)] bg-[var(--color-surface-container-lowest)]" style={{ height: boardHeight }}>
                {hourMarkers.map((hour) => {
                  const top = (hour - DAY_START_HOUR) * HOUR_HEIGHT_PX;
                  return (
                    <div key={hour} className="absolute left-0 right-0" style={{ top }}>
                      <div className="px-3 text-xs font-semibold text-[var(--color-outline)]">
                        {new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {resolvedColumns.map((column) => (
                <div key={column.id} className="relative border-r border-[var(--color-surface-container-high)] last:border-r-0" style={{ height: boardHeight }}>
                  {hourMarkers.map((hour) => {
                    const top = (hour - DAY_START_HOUR) * HOUR_HEIGHT_PX;
                    return <div key={hour} className="absolute left-0 right-0 border-t border-dashed border-[var(--color-surface-container-high)]" style={{ top }} />;
                  })}

                  {dayAppointments
                    .filter((item) => (item.barber_id ? item.barber_id === column.id : column.id === "unassigned"))
                    .map((item) => {
                      const start = new Date(item.scheduled_start_at);
                      const end = new Date(item.scheduled_end_at);
                      const clampedStartMinutes = Math.max(0, minuteOffsetFromDayStart(start));
                      const clampedEndMinutes = Math.max(0, Math.min(dayMinutes, minuteOffsetFromDayStart(end)));
                      if (clampedEndMinutes <= 0 || clampedStartMinutes >= dayMinutes || clampedEndMinutes <= clampedStartMinutes) {
                        return null;
                      }
                      const top = clampedStartMinutes * (HOUR_HEIGHT_PX / MINUTES_PER_HOUR);
                      const height = Math.max(44, (clampedEndMinutes - clampedStartMinutes) * (HOUR_HEIGHT_PX / MINUTES_PER_HOUR));

                      return (
                        <article
                          key={item.id}
                          className={`absolute left-2 right-2 rounded-[var(--radius-lg)] border p-3 shadow-sm ${appointmentCardClasses(item.status.toLowerCase())}`}
                          style={{ top, height }}
                        >
                          <p className="truncate text-sm font-semibold text-[var(--color-on-surface)]">{customerById.get(item.customer_id) || d.common.customer}</p>
                          <p className="stat-label mt-1 truncate">{serviceById.get(item.service_id) || d.common.service}</p>
                          <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">{formatTimeRange(start, end, locale)}</p>
                          <p className="mt-1 text-xs text-[var(--color-outline)]">
                            {item.barber_id ? barberById.get(item.barber_id) || d.common.assignedBarber : d.common.unassignedBarber}
                          </p>
                        </article>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {dayAppointments.length === 0 ? (
          <div className="border-t border-ink/10 p-6">
              <EmptyState
              title={d.appointments.emptyTitle}
              body={d.appointments.emptyBody
                .replace("{start}", formatTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), DAY_START_HOUR), locale))
                .replace("{end}", formatTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), DAY_END_HOUR), locale))}
            />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
