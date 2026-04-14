"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import type { AppointmentSummary, AvailabilitySlotSummary, BarberSummary, ResourceSummary, ServiceSummary } from "@/lib/api";
import { addBusinessDays, businessDateParamToDate, businessInputDateTimeToIso, formatBusinessDate } from "@/lib/business-time";

type AvailabilityMode = "available" | "occupied" | "all";

type DevAvailabilityCopy = {
  availabilityTesterTitle: string;
  availabilityTesterSubtitle: string;
  availabilityService: string;
  availabilityDate: string;
  availabilityBarber: string;
  availabilityAnyBarber: string;
  availabilityMode: string;
  availabilityModeAvailable: string;
  availabilityModeOccupied: string;
  availabilityModeAll: string;
  availabilityRun: string;
  availabilityEmptyTitle: string;
  availabilityEmptyBody: string;
  availabilityError: string;
  availabilityRequest: string;
  availabilityStatusAvailable: string;
  availabilityStatusOccupied: string;
  availabilityAssignmentEmpty: string;
  headers: {
    status: string;
    start: string;
    end: string;
    service: string;
    barber: string;
    resource: string;
    assignment: string;
  };
};

type CommonCopy = {
  none: string;
};

function formatSlotTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Costa_Rica",
  }).format(new Date(value));
}

function tagClassName(tone: "available" | "occupied" | "barber" | "resource" | "empty"): string {
  const base = "inline-flex min-h-7 items-center rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-semibold";
  const tones = {
    available: "bg-emerald-500/14 text-emerald-200 ring-1 ring-emerald-400/25",
    occupied: "bg-amber-500/16 text-amber-200 ring-1 ring-amber-400/30",
    barber: "bg-sky-500/16 text-sky-200 ring-1 ring-sky-400/30",
    resource: "bg-teal-500/16 text-teal-200 ring-1 ring-teal-400/30",
    empty: "bg-[var(--color-surface-container-lowest)] text-[var(--color-outline)] ring-1 ring-[var(--color-surface-container-high)]",
  };
  return `${base} ${tones[tone]}`;
}

type ResultRow = {
  id: string;
  kind: "available" | "occupied";
  serviceName: string;
  startAt: string;
  endAt: string;
  barberId: string | null;
  resourceId: string | null;
  appointmentStatus?: string;
};

export function DevAvailabilityTester({
  services,
  barbers,
  resources,
  copy,
  common,
  locale,
}: {
  services: ServiceSummary[];
  barbers: BarberSummary[];
  resources: ResourceSummary[];
  copy: DevAvailabilityCopy;
  common: CommonCopy;
  locale: string;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState(formatBusinessDate(new Date()));
  const [barberId, setBarberId] = useState("");
  const [mode, setMode] = useState<AvailabilityMode>("available");
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [requestPath, setRequestPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedService = useMemo(() => services.find((service) => service.id === serviceId) ?? null, [serviceId, services]);
  const shouldShowBarber = Boolean(selectedService?.requires_barber);
  const barberById = useMemo(() => new Map(barbers.map((barber) => [barber.id, barber.display_name])), [barbers]);
  const resourceById = useMemo(() => new Map(resources.map((resource) => [resource.id, resource.name])), [resources]);
  const serviceById = useMemo(() => new Map(services.map((service) => [service.id, service.name])), [services]);

  function updateService(nextServiceId: string) {
    const nextService = services.find((service) => service.id === nextServiceId) ?? null;
    setServiceId(nextServiceId);
    if (!nextService?.requires_barber) {
      setBarberId("");
    }
  }

  function runAvailabilityTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResults(null);

    const date = businessDateParamToDate(selectedDate);
    if (!date || !serviceId || !selectedService) {
      setError(copy.availabilityError);
      return;
    }

    const startsAt = businessInputDateTimeToIso(`${selectedDate}T00:00`);
    const endsAt = addBusinessDays(date, 1).toISOString();
    const availabilityParams = new URLSearchParams({
      service_id: serviceId,
      starts_at: startsAt,
      ends_at: endsAt,
      limit: "96",
    });
    if (shouldShowBarber && barberId) {
      availabilityParams.set("barber_id", barberId);
    }

    const appointmentsParams = new URLSearchParams({
      from: startsAt,
      start_to: endsAt,
    });
    const availabilityPath = `/api/appointments/availability?${availabilityParams.toString()}`;
    const appointmentsPath = `/api/appointments?${appointmentsParams.toString()}`;
    const paths = [
      mode !== "occupied" ? availabilityPath : null,
      mode !== "available" ? appointmentsPath : null,
    ].filter(Boolean);
    setRequestPath(paths.join(" | "));

    startTransition(async () => {
      const [availabilityResponse, appointmentsResponse] = await Promise.all([
        mode !== "occupied" ? fetch(availabilityPath, { cache: "no-store" }) : Promise.resolve(null),
        mode !== "available" ? fetch(appointmentsPath, { cache: "no-store" }) : Promise.resolve(null),
      ]);

      if ((availabilityResponse && !availabilityResponse.ok) || (appointmentsResponse && !appointmentsResponse.ok)) {
        setError(copy.availabilityError);
        return;
      }

      const slots = availabilityResponse ? ((await availabilityResponse.json()) as AvailabilitySlotSummary[]) : [];
      const appointments = appointmentsResponse ? ((await appointmentsResponse.json()) as AppointmentSummary[]) : [];
      const availableRows: ResultRow[] = slots.map((slot) => ({
        id: `available-${slot.start_at}-${slot.barber_id ?? "none"}-${slot.resource_id ?? "none"}`,
        kind: "available",
        serviceName: selectedService.name,
        startAt: slot.start_at,
        endAt: slot.end_at,
        barberId: slot.barber_id,
        resourceId: slot.resource_id,
      }));
      const occupiedRows: ResultRow[] = appointments
        .filter((appointment) => appointment.service_id === serviceId)
        .filter((appointment) => !["cancelled", "no_show"].includes(appointment.status))
        .filter((appointment) => !shouldShowBarber || !barberId || appointment.barber_id === barberId)
        .map((appointment) => ({
          id: `occupied-${appointment.id}`,
          kind: "occupied",
          serviceName: serviceById.get(appointment.service_id) ?? selectedService.name,
          startAt: appointment.scheduled_start_at,
          endAt: appointment.scheduled_end_at,
          barberId: appointment.barber_id,
          resourceId: appointment.resource_id,
          appointmentStatus: appointment.status,
        }));

      setResults([...availableRows, ...occupiedRows].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()));
    });
  }

  return (
    <div className="grid gap-5">
      <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.15fr_0.8fr_0.85fr_1fr_auto]" onSubmit={runAvailabilityTest}>
        <label className="grid gap-2">
          <span className="stat-label">{copy.availabilityService}</span>
          <select className="input-field" value={serviceId} onChange={(event) => updateService(event.target.value)} required>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="stat-label">{copy.availabilityDate}</span>
          <input className="input-field" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} required />
        </label>
        <label className="grid gap-2">
          <span className="stat-label">{copy.availabilityMode}</span>
          <select className="input-field" value={mode} onChange={(event) => setMode(event.target.value as AvailabilityMode)}>
            <option value="available">{copy.availabilityModeAvailable}</option>
            <option value="occupied">{copy.availabilityModeOccupied}</option>
            <option value="all">{copy.availabilityModeAll}</option>
          </select>
        </label>
        {shouldShowBarber ? (
          <label className="grid gap-2">
            <span className="stat-label">{copy.availabilityBarber}</span>
            <select className="input-field" value={barberId} onChange={(event) => setBarberId(event.target.value)}>
              <option value="">{copy.availabilityAnyBarber}</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>{barber.display_name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <button className="btn btn-primary self-end justify-center" type="submit" disabled={isPending || services.length === 0}>
          {copy.availabilityRun}
        </button>
      </form>

      {requestPath ? (
        <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-container-lowest)] px-4 py-3 text-xs text-[var(--color-outline)]">
          <span className="font-semibold text-[var(--color-on-surface-variant)]">{copy.availabilityRequest}: </span>
          <span className="break-all">{requestPath}</span>
        </div>
      ) : null}

      {error ? <p className="pill pill-tertiary">{error}</p> : null}

      {results ? (
        results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.25em] text-ink/45">
                <tr>
                  <th className="px-3 py-3">{copy.headers.status}</th>
                  <th className="px-3 py-3">{copy.headers.start}</th>
                  <th className="px-3 py-3">{copy.headers.end}</th>
                  <th className="px-3 py-3">{copy.headers.service}</th>
                  <th className="px-3 py-3">{copy.headers.assignment}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-t border-ink/8">
                    <td className="px-3 py-3">
                      <span className={tagClassName(result.kind)}>
                        {result.kind === "available" ? copy.availabilityStatusAvailable : copy.availabilityStatusOccupied}
                        {result.appointmentStatus ? ` · ${result.appointmentStatus}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-3">{formatSlotTime(result.startAt, locale)}</td>
                    <td className="px-3 py-3">{formatSlotTime(result.endAt, locale)}</td>
                    <td className="px-3 py-3">{result.serviceName}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {result.barberId ? (
                          <span className={tagClassName("barber")}>{barberById.get(result.barberId) ?? result.barberId}</span>
                        ) : null}
                        {result.resourceId ? (
                          <span className={tagClassName("resource")}>{resourceById.get(result.resourceId) ?? result.resourceId}</span>
                        ) : null}
                        {!result.barberId && !result.resourceId ? (
                          <span className={tagClassName("empty")}>{copy.availabilityAssignmentEmpty || common.none}</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-surface-container-high)] p-5">
            <p className="headline-sm">{copy.availabilityEmptyTitle}</p>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{copy.availabilityEmptyBody}</p>
          </div>
        )
      ) : null}
    </div>
  );
}
