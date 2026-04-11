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

type AppointmentColumn = {
  id: string;
  label: string;
};

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 20;
const MINUTES_PER_HOUR = 60;
const HOUR_HEIGHT_PX = 76;

function formatDayTitle(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(value);
}

function formatTimeRange(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
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
    return "border-red-200 bg-red-50";
  }
  if (status === "confirmed") {
    return "border-emerald-200 bg-emerald-50";
  }
  if (status === "pending") {
    return "border-sky-200 bg-sky-50";
  }
  return "border-ink/10 bg-white";
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
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return (
      <AppShell title="Appointments" eyebrow="Schedule">
        <EmptyState title="Session required" body="Sign in again to load the appointment board." />
      </AppShell>
    );
  }

  const today = new Date();
  const { appointments, barbers, services, customers } = await loadScheduleData(sessionToken);
  const serviceById = new Map(services.map((item) => [item.id, item.name]));
  const customerById = new Map(
    customers.map((item) => [item.id, item.display_name || [item.first_name, item.last_name].filter(Boolean).join(" ") || "Customer"])
  );
  const barberById = new Map(barbers.map((item) => [item.id, item.display_name]));

  const dayAppointments = appointments
    .filter((item) => isSameDay(new Date(item.scheduled_start_at), today))
    .sort((left, right) => new Date(left.scheduled_start_at).getTime() - new Date(right.scheduled_start_at).getTime());

  const columns: AppointmentColumn[] = [
    ...barbers.map((item) => ({ id: item.id, label: item.display_name })),
    ...(dayAppointments.some((item) => !item.barber_id) ? [{ id: "unassigned", label: "Unassigned" }] : []),
  ];
  const resolvedColumns = columns.length > 0 ? columns : [{ id: "open", label: "Open schedule" }];

  const dayMinutes = (DAY_END_HOUR - DAY_START_HOUR) * MINUTES_PER_HOUR;
  const boardHeight = dayMinutes * (HOUR_HEIGHT_PX / MINUTES_PER_HOUR);
  const hourMarkers = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => DAY_START_HOUR + index);

  return (
    <AppShell title="Appointments" eyebrow="Schedule">
      <div className="rounded-[30px] border border-ink/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 px-5 py-4 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/50">Daily view</p>
            <h3 className="mt-2 font-display text-3xl leading-none">{formatDayTitle(today)}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-xl bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700">Block time</button>
            <button className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-sand">New appointment</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div
              className="grid border-b border-ink/10 bg-sand/45"
              style={{ gridTemplateColumns: `88px repeat(${resolvedColumns.length}, minmax(210px, 1fr))` }}
            >
              <div className="border-r border-ink/10 px-3 py-4 text-xs uppercase tracking-[0.28em] text-ink/45">Time</div>
              {resolvedColumns.map((column) => (
                <div key={column.id} className="border-r border-ink/10 px-4 py-4 last:border-r-0">
                  <p className="truncate text-base font-semibold text-ink">{column.label}</p>
                </div>
              ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: `88px repeat(${resolvedColumns.length}, minmax(210px, 1fr))` }}>
              <div className="relative border-r border-ink/10 bg-white" style={{ height: boardHeight }}>
                {hourMarkers.map((hour) => {
                  const top = (hour - DAY_START_HOUR) * HOUR_HEIGHT_PX;
                  return (
                    <div key={hour} className="absolute left-0 right-0" style={{ top }}>
                      <div className="px-3 text-xs font-semibold text-ink/50">
                        {new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {resolvedColumns.map((column) => (
                <div key={column.id} className="relative border-r border-ink/10 last:border-r-0" style={{ height: boardHeight }}>
                  {hourMarkers.map((hour) => {
                    const top = (hour - DAY_START_HOUR) * HOUR_HEIGHT_PX;
                    return <div key={hour} className="absolute left-0 right-0 border-t border-dashed border-ink/10" style={{ top }} />;
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
                          className={`absolute left-2 right-2 rounded-2xl border p-3 shadow-sm ${appointmentCardClasses(item.status.toLowerCase())}`}
                          style={{ top, height }}
                        >
                          <p className="truncate text-sm font-semibold text-ink">{customerById.get(item.customer_id) || "Customer"}</p>
                          <p className="mt-1 truncate text-xs uppercase tracking-[0.12em] text-ink/55">{serviceById.get(item.service_id) || "Service"}</p>
                          <p className="mt-2 text-xs text-ink/65">{formatTimeRange(start, end)}</p>
                          <p className="mt-1 text-xs text-ink/55">
                            {item.barber_id ? barberById.get(item.barber_id) || "Assigned barber" : "Unassigned barber"}
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
              title="No appointments scheduled today"
              body={`No bookings were found between ${formatTimeRange(
                new Date(today.getFullYear(), today.getMonth(), today.getDate(), DAY_START_HOUR),
                new Date(today.getFullYear(), today.getMonth(), today.getDate(), DAY_END_HOUR)
              )}. Add a new appointment to populate this board.`}
            />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
