"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AppointmentSummary, BarberSummary, BarberTimeOffSummary, CustomerSummary, ServiceSummary } from "@/lib/api";

type SchedulerCopy = {
  dailyView: string;
  weeklyView: string;
  monthlyView: string;
  time: string;
  openSchedule: string;
  emptyTitle: string;
  emptyBody: string;
  newAppointmentTitle: string;
  blockTimeTitle: string;
  allDay: string;
  fields: Record<string, string>;
  saveAppointment: string;
  saveBlock: string;
  saveSuccess: string;
  saveError: string;
  currentDay: string;
  currentWeek: string;
  currentMonth: string;
};

type CommonCopy = {
  assignedBarber: string;
  blockTime: string;
  customer: string;
  newAppointment: string;
  service: string;
  unassignedBarber: string;
};

type ViewMode = "day" | "week" | "month";

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 20;
const MINUTES_PER_HOUR = 60;
const HOUR_HEIGHT_PX = 76;

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeek(value: Date): Date {
  const date = startOfDay(value);
  const dayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOffset);
  return date;
}

function endOfWeek(value: Date): Date {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 7);
  return date;
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth() + 1, 1);
}

function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }).format(value);
}

function formatDayTitle(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(value);
}

function formatTimeRange(start: Date, end: Date, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isWithinRange(value: Date, start: Date, end: Date): boolean {
  return value >= start && value < end;
}

function minuteOffsetFromDayStart(value: Date): number {
  return (value.getHours() - DAY_START_HOUR) * MINUTES_PER_HOUR + value.getMinutes();
}

function toInputDateTime(value: Date): string {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
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

async function errorMessageFromResponse(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  return fallback;
}

export function AppointmentScheduler({
  initialAppointments,
  initialTimeOff,
  barbers,
  services,
  customers,
  copy,
  common,
  locale,
}: {
  initialAppointments: AppointmentSummary[];
  initialTimeOff: BarberTimeOffSummary[];
  barbers: BarberSummary[];
  services: ServiceSummary[];
  customers: CustomerSummary[];
  copy: SchedulerCopy;
  common: CommonCopy;
  locale: string;
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [activeForm, setActiveForm] = useState<"appointment" | "block" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const today = useMemo(() => new Date(), []);

  const serviceById = useMemo(() => new Map(services.map((item) => [item.id, item.name])), [services]);
  const customerById = useMemo(
    () => new Map(customers.map((item) => [item.id, item.display_name || [item.first_name, item.last_name].filter(Boolean).join(" ") || common.customer])),
    [common.customer, customers],
  );
  const barberById = useMemo(() => new Map(barbers.map((item) => [item.id, item.display_name])), [barbers]);

  const visibleAppointments = useMemo(() => {
    const rangeStart = viewMode === "day" ? startOfDay(today) : viewMode === "week" ? startOfWeek(today) : startOfMonth(today);
    const rangeEnd = viewMode === "day" ? new Date(rangeStart.getTime() + 86_400_000) : viewMode === "week" ? endOfWeek(today) : endOfMonth(today);
    return initialAppointments
      .filter((item) => isWithinRange(new Date(item.scheduled_start_at), rangeStart, rangeEnd))
      .sort((left, right) => new Date(left.scheduled_start_at).getTime() - new Date(right.scheduled_start_at).getTime());
  }, [initialAppointments, today, viewMode]);

  const visibleTimeOff = useMemo(() => {
    const rangeStart = viewMode === "day" ? startOfDay(today) : viewMode === "week" ? startOfWeek(today) : startOfMonth(today);
    const rangeEnd = viewMode === "day" ? new Date(rangeStart.getTime() + 86_400_000) : viewMode === "week" ? endOfWeek(today) : endOfMonth(today);
    return initialTimeOff
      .filter((item) => new Date(item.starts_at) < rangeEnd && new Date(item.ends_at) > rangeStart)
      .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime());
  }, [initialTimeOff, today, viewMode]);

  async function submitAppointment(formData: FormData) {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: formData.get("customer_id"),
        service_id: formData.get("service_id"),
        barber_id: formData.get("barber_id") || null,
        source: "admin_console",
        status: "confirmed",
        scheduled_start_at: new Date(String(formData.get("scheduled_start_at"))).toISOString(),
        internal_notes: String(formData.get("internal_notes") || "") || null,
      }),
    });

    if (!response.ok) {
      setError(await errorMessageFromResponse(response, copy.saveError));
      return;
    }

    setMessage(copy.saveSuccess);
    setActiveForm(null);
    startTransition(() => router.refresh());
  }

  async function submitBlock(formData: FormData) {
    setError(null);
    setMessage(null);
    const barberId = String(formData.get("barber_id") || "");
    const response = await fetch(`/api/barbers/${barberId}/time-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        starts_at: new Date(String(formData.get("starts_at"))).toISOString(),
        ends_at: new Date(String(formData.get("ends_at"))).toISOString(),
        reason: String(formData.get("reason") || "") || null,
        is_all_day: formData.get("is_all_day") === "on",
      }),
    });

    if (!response.ok) {
      setError(await errorMessageFromResponse(response, copy.saveError));
      return;
    }

    setMessage(copy.saveSuccess);
    setActiveForm(null);
    startTransition(() => router.refresh());
  }

  const defaultStart = toInputDateTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10));
  const defaultEnd = toInputDateTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11));

  return (
    <div className="grid gap-6">
      <section className="app-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-surface-container-high)] pb-5">
          <div>
            <p className="stat-label">{viewMode === "day" ? copy.currentDay : viewMode === "week" ? copy.currentWeek : copy.currentMonth}</p>
            <h3 className="mt-2 font-display text-3xl leading-none">{formatDayTitle(today, locale)}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["day", "week", "month"] as const).map((mode) => (
              <button key={mode} type="button" className={`btn btn-sm ${viewMode === mode ? "btn-primary" : "btn-ghost"}`} onClick={() => setViewMode(mode)}>
                {mode === "day" ? copy.dailyView : mode === "week" ? copy.weeklyView : copy.monthlyView}
              </button>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveForm(activeForm === "block" ? null : "block")}>
              {common.blockTime}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setActiveForm(activeForm === "appointment" ? null : "appointment")}>
              {common.newAppointment}
            </button>
          </div>
        </div>

        {message ? <p className="pill pill-primary mt-4">{message}</p> : null}
        {error ? <p className="pill pill-tertiary mt-4">{error}</p> : null}

        {activeForm === "appointment" ? (
          <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" action={submitAppointment}>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.customer}</span>
              <select className="input-field" name="customer_id" required>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customerById.get(customer.id)}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.service}</span>
              <select className="input-field" name="service_id" required>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.barber}</span>
              <select className="input-field" name="barber_id" required>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>{barber.display_name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.start}</span>
              <input className="input-field" name="scheduled_start_at" type="datetime-local" defaultValue={defaultStart} required />
            </label>
            <label className="grid gap-2 md:col-span-2 xl:col-span-3">
              <span className="stat-label">{copy.fields.notes}</span>
              <input className="input-field" name="internal_notes" />
            </label>
            <button className="btn btn-primary self-end justify-center" disabled={isPending || customers.length === 0 || services.length === 0 || barbers.length === 0}>
              {copy.saveAppointment}
            </button>
          </form>
        ) : null}

        {activeForm === "block" ? (
          <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5" action={submitBlock}>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.barber}</span>
              <select className="input-field" name="barber_id" required>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>{barber.display_name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.start}</span>
              <input className="input-field" name="starts_at" type="datetime-local" defaultValue={defaultStart} required />
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.end}</span>
              <input className="input-field" name="ends_at" type="datetime-local" defaultValue={defaultEnd} required />
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.reason}</span>
              <input className="input-field" name="reason" />
            </label>
            <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-[var(--color-on-surface-variant)]">
              <input name="is_all_day" type="checkbox" />
              {copy.allDay}
            </label>
            <button className="btn btn-primary self-end justify-center" disabled={isPending || barbers.length === 0}>
              {copy.saveBlock}
            </button>
          </form>
        ) : null}

        {viewMode === "day" ? (
          <DayBoard appointments={visibleAppointments} timeOff={visibleTimeOff} barbers={barbers} serviceById={serviceById} customerById={customerById} barberById={barberById} today={today} locale={locale} common={common} copy={copy} />
        ) : (
          <SummaryBoard appointments={visibleAppointments} timeOff={visibleTimeOff} barbers={barbers} serviceById={serviceById} customerById={customerById} barberById={barberById} today={today} viewMode={viewMode} locale={locale} common={common} />
        )}
      </section>
    </div>
  );
}

function DayBoard({
  appointments,
  timeOff,
  barbers,
  serviceById,
  customerById,
  barberById,
  today,
  locale,
  common,
  copy,
}: {
  appointments: AppointmentSummary[];
  timeOff: BarberTimeOffSummary[];
  barbers: BarberSummary[];
  serviceById: Map<string, string>;
  customerById: Map<string, string>;
  barberById: Map<string, string>;
  today: Date;
  locale: string;
  common: CommonCopy;
  copy: SchedulerCopy;
}) {
  const dayMinutes = (DAY_END_HOUR - DAY_START_HOUR) * MINUTES_PER_HOUR;
  const boardHeight = dayMinutes * (HOUR_HEIGHT_PX / MINUTES_PER_HOUR);
  const hourMarkers = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => DAY_START_HOUR + index);
  const columns = barbers.length > 0 ? barbers.map((item) => ({ id: item.id, label: item.display_name })) : [{ id: "open", label: copy.openSchedule }];

  return (
    <div className="mt-6 overflow-x-auto">
      <div className="min-w-[980px]">
        <div className="grid border-b border-[var(--color-surface-container-high)] bg-[var(--color-surface-container-low)]" style={{ gridTemplateColumns: `88px repeat(${columns.length}, minmax(210px, 1fr))` }}>
          <div className="stat-label border-r border-[var(--color-surface-container-high)] px-3 py-4">{copy.time}</div>
          {columns.map((column) => (
            <div key={column.id} className="border-r border-[var(--color-surface-container-high)] px-4 py-4 last:border-r-0">
              <p className="truncate text-base font-semibold text-[var(--color-on-surface)]">{column.label}</p>
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: `88px repeat(${columns.length}, minmax(210px, 1fr))` }}>
          <div className="relative border-r border-[var(--color-surface-container-high)] bg-[var(--color-surface-container-lowest)]" style={{ height: boardHeight }}>
            {hourMarkers.map((hour) => (
              <div key={hour} className="absolute left-0 right-0" style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT_PX }}>
                <div className="px-3 text-xs font-semibold text-[var(--color-outline)]">
                  {new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour))}
                </div>
              </div>
            ))}
          </div>

          {columns.map((column) => (
            <div key={column.id} className="relative border-r border-[var(--color-surface-container-high)] last:border-r-0" style={{ height: boardHeight }}>
              {hourMarkers.map((hour) => (
                <div key={hour} className="absolute left-0 right-0 border-t border-dashed border-[var(--color-surface-container-high)]" style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT_PX }} />
              ))}
              {appointments
                .filter((item) => (item.barber_id ? item.barber_id === column.id : column.id === "open"))
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
                    <article key={item.id} className={`absolute left-2 right-2 rounded-[var(--radius-lg)] border p-3 shadow-sm ${appointmentCardClasses(item.status.toLowerCase())}`} style={{ top, height }}>
                      <p className="truncate text-sm font-semibold text-[var(--color-on-surface)]">{customerById.get(item.customer_id) || common.customer}</p>
                      <p className="stat-label mt-1 truncate">{serviceById.get(item.service_id) || common.service}</p>
                      <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">{formatTimeRange(start, end, locale)}</p>
                      <p className="mt-1 text-xs text-[var(--color-outline)]">{item.barber_id ? barberById.get(item.barber_id) || common.assignedBarber : common.unassignedBarber}</p>
                    </article>
                  );
                })}
              {timeOff
                .filter((item) => item.barber_id === column.id)
                .map((item) => {
                  const start = new Date(item.starts_at);
                  const end = new Date(item.ends_at);
                  const clampedStartMinutes = Math.max(0, minuteOffsetFromDayStart(start));
                  const clampedEndMinutes = Math.max(0, Math.min(dayMinutes, minuteOffsetFromDayStart(end)));
                  if (clampedEndMinutes <= 0 || clampedStartMinutes >= dayMinutes || clampedEndMinutes <= clampedStartMinutes) {
                    return null;
                  }
                  const top = clampedStartMinutes * (HOUR_HEIGHT_PX / MINUTES_PER_HOUR);
                  const height = Math.max(36, (clampedEndMinutes - clampedStartMinutes) * (HOUR_HEIGHT_PX / MINUTES_PER_HOUR));
                  return (
                    <article key={item.id} className="absolute left-2 right-2 rounded-[var(--radius-lg)] border border-[var(--color-tertiary-container)] bg-[rgba(247,197,197,0.55)] p-3 shadow-sm" style={{ top, height }}>
                      <p className="truncate text-sm font-semibold text-[var(--color-on-tertiary-container)]">{item.reason || common.blockTime}</p>
                      <p className="mt-1 text-xs text-[var(--color-on-tertiary-container)]">{formatTimeRange(start, end, locale)}</p>
                    </article>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
      {appointments.length === 0 ? <div className="border-t border-ink/10 p-6"><p className="empty-state-title">{copy.emptyTitle}</p></div> : null}
    </div>
  );
}

function SummaryBoard({
  appointments,
  timeOff,
  barbers,
  serviceById,
  customerById,
  barberById,
  today,
  viewMode,
  locale,
  common,
}: {
  appointments: AppointmentSummary[];
  timeOff: BarberTimeOffSummary[];
  barbers: BarberSummary[];
  serviceById: Map<string, string>;
  customerById: Map<string, string>;
  barberById: Map<string, string>;
  today: Date;
  viewMode: "week" | "month";
  locale: string;
  common: CommonCopy;
}) {
  const days = useMemo(() => {
    const rangeStart = viewMode === "week" ? startOfWeek(today) : startOfMonth(today);
    const rangeEnd = viewMode === "week" ? endOfWeek(today) : endOfMonth(today);
    const nextDays: Date[] = [];
    for (const cursor = new Date(rangeStart); cursor < rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
      nextDays.push(new Date(cursor));
    }
    return nextDays;
  }, [today, viewMode]);

  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {days.map((day) => {
        const dayAppointments = appointments.filter((item) => isSameDay(new Date(item.scheduled_start_at), day));
        const dayBlocks = timeOff.filter((item) => isSameDay(new Date(item.starts_at), day));
        return (
          <article key={day.toISOString()} className="card-muted min-h-44">
            <div className="flex items-center justify-between gap-3">
              <p className="headline-sm">{formatDate(day, locale)}</p>
              <span className="pill pill-secondary">{dayAppointments.length}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {dayAppointments.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-[var(--radius-md)] bg-[var(--color-surface-container-lowest)] p-3">
                  <p className="truncate text-sm font-semibold text-[var(--color-on-surface)]">{customerById.get(item.customer_id) || common.customer}</p>
                  <p className="stat-label mt-1">{serviceById.get(item.service_id) || common.service}</p>
                  <p className="mt-2 text-xs text-[var(--color-outline)]">{formatTimeRange(new Date(item.scheduled_start_at), new Date(item.scheduled_end_at), locale)} · {item.barber_id ? barberById.get(item.barber_id) || common.assignedBarber : common.unassignedBarber}</p>
                </div>
              ))}
              {dayBlocks.map((item) => (
                <div key={item.id} className="rounded-[var(--radius-md)] bg-[rgba(247,197,197,0.45)] p-3">
                  <p className="text-sm font-semibold text-[var(--color-on-tertiary-container)]">{barberById.get(item.barber_id) || barbers.find((barber) => barber.id === item.barber_id)?.display_name || common.assignedBarber}</p>
                  <p className="mt-1 text-xs text-[var(--color-on-tertiary-container)]">{formatTimeRange(new Date(item.starts_at), new Date(item.ends_at), locale)} · {item.reason || common.blockTime}</p>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
