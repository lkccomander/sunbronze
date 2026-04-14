"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AppointmentSummary, BarberSummary, BarberTimeOffSummary, CustomerSummary, ResourceSummary, ServiceSummary } from "@/lib/api";
import {
  BUSINESS_TIME_ZONE,
  addBusinessDays,
  addBusinessMonths,
  businessDateTimeParts,
  businessDateTimeUtc,
  businessInputDateTimeToIso,
  endOfBusinessMonth,
  endOfBusinessWeek,
  formatBusinessDate,
  formatBusinessInputDateTime,
  startOfBusinessDay,
  startOfBusinessMonth,
  startOfBusinessWeek,
} from "@/lib/business-time";

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
  previousPeriod: string;
  nextPeriod: string;
  fields: Record<string, string>;
  saveAppointment: string;
  updateAppointment: string;
  editAppointment: string;
  cancelAppointment: string;
  cancelSuccess: string;
  cancelError: string;
  confirmCancel: string;
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
  none: string;
  service: string;
  unassignedBarber: string;
};

type ViewMode = "day" | "week" | "month";
type ScheduleColumn = { id: string; label: string; kind: "barber" | "resource" | "open" };

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 20;
const MINUTES_PER_HOUR = 60;
const HOUR_HEIGHT_PX = 76;

function startOfDay(value: Date): Date {
  return startOfBusinessDay(value);
}

function startOfWeek(value: Date): Date {
  return startOfBusinessWeek(value);
}

function endOfWeek(value: Date): Date {
  return endOfBusinessWeek(value);
}

function startOfMonth(value: Date): Date {
  return startOfBusinessMonth(value);
}

function endOfMonth(value: Date): Date {
  return endOfBusinessMonth(value);
}

function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", timeZone: BUSINESS_TIME_ZONE }).format(value);
}

function formatDayTitle(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS_TIME_ZONE }).format(value);
}

function formatTimeRange(start: Date, end: Date, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: BUSINESS_TIME_ZONE });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function isSameDay(left: Date, right: Date): boolean {
  const leftParts = businessDateTimeParts(left);
  const rightParts = businessDateTimeParts(right);
  return leftParts.year === rightParts.year && leftParts.month === rightParts.month && leftParts.day === rightParts.day;
}

function isWithinRange(value: Date, start: Date, end: Date): boolean {
  return value >= start && value < end;
}

function minuteOffsetFromDayStart(value: Date): number {
  const parts = businessDateTimeParts(value);
  return (parts.hour - DAY_START_HOUR) * MINUTES_PER_HOUR + parts.minute;
}

function toInputDateTime(value: Date): string {
  return formatBusinessInputDateTime(value);
}

function endDateTimeForForm(appointment: AppointmentSummary | null, fallback: Date): string {
  return toInputDateTime(appointment ? new Date(appointment.scheduled_end_at) : fallback);
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
  resources,
  services,
  customers,
  initialDate,
  initialViewMode,
  copy,
  common,
  locale,
}: {
  initialAppointments: AppointmentSummary[];
  initialTimeOff: BarberTimeOffSummary[];
  barbers: BarberSummary[];
  resources: ResourceSummary[];
  services: ServiceSummary[];
  customers: CustomerSummary[];
  initialDate: string;
  initialViewMode: ViewMode;
  copy: SchedulerCopy;
  common: CommonCopy;
  locale: string;
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [activeForm, setActiveForm] = useState<"appointment" | "block" | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeDate = useMemo(() => new Date(initialDate), [initialDate]);

  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  const serviceById = useMemo(() => new Map(services.map((item) => [item.id, item.name])), [services]);
  const tanningResources = useMemo(
    () => resources.filter((item) => [item.code, item.name, item.resource_type].some((value) => /bronceado|tanning/i.test(value))),
    [resources],
  );
  const customerById = useMemo(
    () => new Map(customers.map((item) => [item.id, item.display_name || [item.first_name, item.last_name].filter(Boolean).join(" ") || common.customer])),
    [common.customer, customers],
  );
  const barberById = useMemo(() => new Map(barbers.map((item) => [item.id, item.display_name])), [barbers]);
  const resourceById = useMemo(() => new Map(resources.map((item) => [item.id, item.name])), [resources]);
  const editingAppointment = useMemo(
    () => initialAppointments.find((item) => item.id === editingAppointmentId) ?? null,
    [editingAppointmentId, initialAppointments],
  );

  const visibleAppointments = useMemo(() => {
    const rangeStart = viewMode === "day" ? startOfDay(activeDate) : viewMode === "week" ? startOfWeek(activeDate) : startOfMonth(activeDate);
    const rangeEnd = viewMode === "day" ? addBusinessDays(rangeStart, 1) : viewMode === "week" ? endOfWeek(activeDate) : endOfMonth(activeDate);
    return initialAppointments
      .filter((item) => isWithinRange(new Date(item.scheduled_start_at), rangeStart, rangeEnd))
      .sort((left, right) => new Date(left.scheduled_start_at).getTime() - new Date(right.scheduled_start_at).getTime());
  }, [activeDate, initialAppointments, viewMode]);

  const visibleTimeOff = useMemo(() => {
    const rangeStart = viewMode === "day" ? startOfDay(activeDate) : viewMode === "week" ? startOfWeek(activeDate) : startOfMonth(activeDate);
    const rangeEnd = viewMode === "day" ? addBusinessDays(rangeStart, 1) : viewMode === "week" ? endOfWeek(activeDate) : endOfMonth(activeDate);
    return initialTimeOff
      .filter((item) => new Date(item.starts_at) < rangeEnd && new Date(item.ends_at) > rangeStart)
      .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime());
  }, [activeDate, initialTimeOff, viewMode]);

  function setScheduleView(mode: ViewMode) {
    setViewMode(mode);
    startTransition(() => router.push(`/appointments?date=${formatBusinessDate(activeDate)}&view=${mode}`));
  }

  function shiftSchedule(direction: -1 | 1) {
    const nextDate =
      viewMode === "day"
        ? addBusinessDays(activeDate, direction)
        : viewMode === "week"
          ? addBusinessDays(activeDate, direction * 7)
          : addBusinessMonths(activeDate, direction);
    setActiveForm(null);
    setEditingAppointmentId(null);
    startTransition(() => router.push(`/appointments?date=${formatBusinessDate(nextDate)}&view=${viewMode}`));
  }

  async function submitAppointment(formData: FormData) {
    setError(null);
    setMessage(null);
    const isEditing = editingAppointment !== null;
    const startAt = businessInputDateTimeToIso(String(formData.get("scheduled_start_at")));
    const endAt = String(formData.get("scheduled_end_at") || "");
    const response = await fetch(isEditing ? `/api/appointments/${editingAppointment.id}` : "/api/appointments", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEditing
          ? {
              barber_id: formData.get("barber_id") || null,
              resource_id: formData.get("resource_id") || null,
              status: formData.get("status") || null,
              scheduled_start_at: startAt,
              scheduled_end_at: endAt ? businessInputDateTimeToIso(endAt) : null,
              internal_notes: String(formData.get("internal_notes") || "") || null,
            }
          : {
              customer_id: formData.get("customer_id"),
              service_id: formData.get("service_id"),
              barber_id: formData.get("barber_id") || null,
              resource_id: formData.get("resource_id") || null,
              source: "admin_console",
              status: formData.get("status") || "confirmed",
              scheduled_start_at: startAt,
              scheduled_end_at: endAt ? businessInputDateTimeToIso(endAt) : null,
              internal_notes: String(formData.get("internal_notes") || "") || null,
            },
      ),
    });

    if (!response.ok) {
      setError(await errorMessageFromResponse(response, copy.saveError));
      return;
    }

    setMessage(copy.saveSuccess);
    setActiveForm(null);
    setEditingAppointmentId(null);
    startTransition(() => router.refresh());
  }

  async function cancelAppointment(appointmentId: string) {
    if (!window.confirm(copy.confirmCancel)) {
      return;
    }

    setError(null);
    setMessage(null);
    const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST" });

    if (!response.ok) {
      setError(await errorMessageFromResponse(response, copy.cancelError));
      return;
    }

    setMessage(copy.cancelSuccess);
    setActiveForm(null);
    setEditingAppointmentId(null);
    startTransition(() => router.refresh());
  }

  function openAppointmentForm(appointment: AppointmentSummary | null) {
    setEditingAppointmentId(appointment?.id ?? null);
    setActiveForm("appointment");
  }

  async function submitBlock(formData: FormData) {
    setError(null);
    setMessage(null);
    const barberId = String(formData.get("barber_id") || "");
    const response = await fetch(`/api/barbers/${barberId}/time-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        starts_at: businessInputDateTimeToIso(String(formData.get("starts_at"))),
        ends_at: businessInputDateTimeToIso(String(formData.get("ends_at"))),
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

  const todayParts = businessDateTimeParts(activeDate);
  const defaultStart = toInputDateTime(businessDateTimeUtc(todayParts.year, todayParts.month, todayParts.day, 10));
  const defaultEnd = toInputDateTime(businessDateTimeUtc(todayParts.year, todayParts.month, todayParts.day, 11));
  const formStart = editingAppointment ? toInputDateTime(new Date(editingAppointment.scheduled_start_at)) : defaultStart;
  const formEnd = endDateTimeForForm(editingAppointment, businessDateTimeUtc(todayParts.year, todayParts.month, todayParts.day, 11));

  return (
    <div className="grid gap-6">
      <section className="app-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-surface-container-high)] pb-5">
          <div>
            <p className="stat-label">{viewMode === "day" ? copy.currentDay : viewMode === "week" ? copy.currentWeek : copy.currentMonth}</p>
            <h3 className="mt-2 font-display text-3xl leading-none">{formatDayTitle(activeDate, locale)}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => shiftSchedule(-1)} disabled={isPending} aria-label={copy.previousPeriod}>
              &lt;
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => shiftSchedule(1)} disabled={isPending} aria-label={copy.nextPeriod}>
              &gt;
            </button>
            {(["day", "week", "month"] as const).map((mode) => (
              <button key={mode} type="button" className={`btn btn-sm ${viewMode === mode ? "btn-primary" : "btn-ghost"}`} onClick={() => setScheduleView(mode)}>
                {mode === "day" ? copy.dailyView : mode === "week" ? copy.weeklyView : copy.monthlyView}
              </button>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveForm(activeForm === "block" ? null : "block")}>
              {common.blockTime}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => (activeForm === "appointment" && !editingAppointment ? setActiveForm(null) : openAppointmentForm(null))}>
              {common.newAppointment}
            </button>
          </div>
        </div>

        {message ? <p className="pill pill-primary mt-4">{message}</p> : null}
        {error ? <p className="pill pill-tertiary mt-4">{error}</p> : null}

        {activeForm === "appointment" ? (
          <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" action={submitAppointment} data-auto-refresh-pause="true">
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.customer}</span>
              <select className="input-field" name="customer_id" defaultValue={editingAppointment?.customer_id} disabled={Boolean(editingAppointment)} required>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customerById.get(customer.id)}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.service}</span>
              <select className="input-field" name="service_id" defaultValue={editingAppointment?.service_id} disabled={Boolean(editingAppointment)} required>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.barber}</span>
              <select className="input-field" name="barber_id" defaultValue={editingAppointment?.barber_id ?? ""}>
                <option value="">{common.unassignedBarber}</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>{barber.display_name}</option>
                ))}
              </select>
            </label>
            {tanningResources.length > 0 ? (
              <label className="grid gap-2">
                <span className="stat-label">{copy.fields.resource}</span>
                <select className="input-field" name="resource_id" defaultValue={editingAppointment?.resource_id ?? ""}>
                  <option value="">{common.none}</option>
                  {tanningResources.map((resource) => (
                    <option key={resource.id} value={resource.id}>{resource.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.start}</span>
              <input className="input-field" name="scheduled_start_at" type="datetime-local" defaultValue={formStart} required />
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.end}</span>
              <input className="input-field" name="scheduled_end_at" type="datetime-local" defaultValue={formEnd} />
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.status}</span>
              <select className="input-field" name="status" defaultValue={editingAppointment?.status ?? "confirmed"}>
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="checked_in">checked_in</option>
                <option value="completed">completed</option>
                <option value="no_show">no_show</option>
              </select>
            </label>
            <label className="grid gap-2 md:col-span-2 xl:col-span-3">
              <span className="stat-label">{copy.fields.notes}</span>
              <input className="input-field" name="internal_notes" defaultValue={editingAppointment?.internal_notes ?? ""} />
            </label>
            <button className="btn btn-primary self-end justify-center" disabled={isPending || customers.length === 0 || services.length === 0 || (barbers.length === 0 && tanningResources.length === 0)}>
              {editingAppointment ? copy.updateAppointment : copy.saveAppointment}
            </button>
          </form>
        ) : null}

        {activeForm === "block" ? (
          <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5" action={submitBlock} data-auto-refresh-pause="true">
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
          <DayBoard appointments={visibleAppointments} timeOff={visibleTimeOff} barbers={barbers} resources={tanningResources} serviceById={serviceById} customerById={customerById} barberById={barberById} resourceById={resourceById} today={activeDate} locale={locale} common={common} copy={copy} onEditAppointment={openAppointmentForm} onCancelAppointment={cancelAppointment} />
        ) : (
          <SummaryBoard appointments={visibleAppointments} timeOff={visibleTimeOff} barbers={barbers} serviceById={serviceById} customerById={customerById} barberById={barberById} today={activeDate} viewMode={viewMode} locale={locale} common={common} copy={copy} onEditAppointment={openAppointmentForm} onCancelAppointment={cancelAppointment} />
        )}
      </section>
    </div>
  );
}

function DayBoard({
  appointments,
  timeOff,
  barbers,
  resources,
  serviceById,
  customerById,
  barberById,
  resourceById,
  today,
  locale,
  common,
  copy,
  onEditAppointment,
  onCancelAppointment,
}: {
  appointments: AppointmentSummary[];
  timeOff: BarberTimeOffSummary[];
  barbers: BarberSummary[];
  resources: ResourceSummary[];
  serviceById: Map<string, string>;
  customerById: Map<string, string>;
  barberById: Map<string, string>;
  resourceById: Map<string, string>;
  today: Date;
  locale: string;
  common: CommonCopy;
  copy: SchedulerCopy;
  onEditAppointment: (appointment: AppointmentSummary) => void;
  onCancelAppointment: (appointmentId: string) => void;
}) {
  const dayMinutes = (DAY_END_HOUR - DAY_START_HOUR) * MINUTES_PER_HOUR;
  const boardHeight = dayMinutes * (HOUR_HEIGHT_PX / MINUTES_PER_HOUR);
  const hourMarkers = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => DAY_START_HOUR + index);
  const todayParts = businessDateTimeParts(today);
  const columns: ScheduleColumn[] = [
    ...barbers.map((item) => ({ id: item.id, label: item.display_name, kind: "barber" as const })),
    ...resources.map((item) => ({ id: item.id, label: item.name, kind: "resource" as const })),
  ];
  if (columns.length === 0) {
    columns.push({ id: "open", label: copy.openSchedule, kind: "open" });
  }

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
                  {new Intl.DateTimeFormat(locale, { hour: "numeric", timeZone: BUSINESS_TIME_ZONE }).format(
                    businessDateTimeUtc(todayParts.year, todayParts.month, todayParts.day, hour),
                  )}
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
                .filter((item) => {
                  if (column.kind === "barber") {
                    return item.barber_id === column.id;
                  }
                  if (column.kind === "resource") {
                    return item.resource_id === column.id;
                  }
                  return !item.barber_id && !item.resource_id;
                })
                .map((item) => {
                  const start = new Date(item.scheduled_start_at);
                  const end = new Date(item.scheduled_end_at);
                  const clampedStartMinutes = Math.max(0, minuteOffsetFromDayStart(start));
                  const clampedEndMinutes = Math.max(0, Math.min(dayMinutes, minuteOffsetFromDayStart(end)));
                  if (clampedEndMinutes <= 0 || clampedStartMinutes >= dayMinutes || clampedEndMinutes <= clampedStartMinutes) {
                    return null;
                  }
                  const top = clampedStartMinutes * (HOUR_HEIGHT_PX / MINUTES_PER_HOUR);
                  const height = Math.max(42, (clampedEndMinutes - clampedStartMinutes) * (HOUR_HEIGHT_PX / MINUTES_PER_HOUR) - 4);
                  return (
                    <article key={item.id} className={`absolute left-2 right-2 overflow-hidden rounded-[var(--radius-lg)] border p-3 shadow-sm ${appointmentCardClasses(item.status.toLowerCase())}`} style={{ top, height }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-[var(--color-on-surface)]">{customerById.get(item.customer_id) || common.customer}</p>
                        {item.status !== "cancelled" ? (
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEditAppointment(item)}>{copy.editAppointment}</button>
                            <button type="button" className="btn btn-tertiary btn-sm" onClick={() => onCancelAppointment(item.id)}>{copy.cancelAppointment}</button>
                          </div>
                        ) : null}
                      </div>
                      <p className="stat-label mt-1 truncate">{serviceById.get(item.service_id) || common.service}</p>
                      <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">{formatTimeRange(start, end, locale)}</p>
                      <p className="mt-1 text-xs text-[var(--color-outline)]">{item.resource_id ? resourceById.get(item.resource_id) || common.service : item.barber_id ? barberById.get(item.barber_id) || common.assignedBarber : common.unassignedBarber}</p>
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
  copy,
  onEditAppointment,
  onCancelAppointment,
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
  copy: SchedulerCopy;
  onEditAppointment: (appointment: AppointmentSummary) => void;
  onCancelAppointment: (appointmentId: string) => void;
}) {
  const days = useMemo(() => {
    const rangeStart = viewMode === "week" ? startOfWeek(today) : startOfMonth(today);
    const rangeEnd = viewMode === "week" ? endOfWeek(today) : endOfMonth(today);
    const nextDays: Date[] = [];
    for (const cursor = new Date(rangeStart); cursor < rangeEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
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
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-[var(--color-on-surface)]">{customerById.get(item.customer_id) || common.customer}</p>
                    {item.status !== "cancelled" ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEditAppointment(item)}>{copy.editAppointment}</button>
                        <button type="button" className="btn btn-tertiary btn-sm" onClick={() => onCancelAppointment(item.id)}>{copy.cancelAppointment}</button>
                      </div>
                    ) : null}
                  </div>
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
