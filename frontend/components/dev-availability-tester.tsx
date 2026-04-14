"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import type { AvailabilitySlotSummary, BarberSummary, ServiceSummary } from "@/lib/api";
import { addBusinessDays, businessDateParamToDate, businessInputDateTimeToIso, formatBusinessDate } from "@/lib/business-time";

type DevAvailabilityCopy = {
  availabilityTesterTitle: string;
  availabilityTesterSubtitle: string;
  availabilityService: string;
  availabilityDate: string;
  availabilityBarber: string;
  availabilityAnyBarber: string;
  availabilityRun: string;
  availabilityEmptyTitle: string;
  availabilityEmptyBody: string;
  availabilityError: string;
  availabilityRequest: string;
  headers: {
    start: string;
    end: string;
    barber: string;
    resource: string;
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

export function DevAvailabilityTester({
  services,
  barbers,
  copy,
  common,
  locale,
}: {
  services: ServiceSummary[];
  barbers: BarberSummary[];
  copy: DevAvailabilityCopy;
  common: CommonCopy;
  locale: string;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState(formatBusinessDate(new Date()));
  const [barberId, setBarberId] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlotSummary[] | null>(null);
  const [requestPath, setRequestPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedService = useMemo(() => services.find((service) => service.id === serviceId) ?? null, [serviceId, services]);
  const shouldShowBarber = Boolean(selectedService?.requires_barber);

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
    setSlots(null);

    const date = businessDateParamToDate(selectedDate);
    if (!date || !serviceId) {
      setError(copy.availabilityError);
      return;
    }

    const startsAt = businessInputDateTimeToIso(`${selectedDate}T00:00`);
    const endsAt = addBusinessDays(date, 1).toISOString();
    const params = new URLSearchParams({
      service_id: serviceId,
      starts_at: startsAt,
      ends_at: endsAt,
      limit: "20",
    });
    if (shouldShowBarber && barberId) {
      params.set("barber_id", barberId);
    }
    const path = `/api/appointments/availability?${params.toString()}`;
    setRequestPath(path);

    startTransition(async () => {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        setError(copy.availabilityError);
        return;
      }
      setSlots((await response.json()) as AvailabilitySlotSummary[]);
    });
  }

  return (
    <div className="grid gap-5">
      <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_1fr_auto]" onSubmit={runAvailabilityTest}>
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

      {slots ? (
        slots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.25em] text-ink/45">
                <tr>
                  <th className="px-3 py-3">{copy.headers.start}</th>
                  <th className="px-3 py-3">{copy.headers.end}</th>
                  <th className="px-3 py-3">{copy.headers.barber}</th>
                  <th className="px-3 py-3">{copy.headers.resource}</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={`${slot.start_at}-${slot.barber_id ?? "resource"}-${slot.resource_id ?? "none"}`} className="border-t border-ink/8">
                    <td className="px-3 py-3">{formatSlotTime(slot.start_at, locale)}</td>
                    <td className="px-3 py-3">{formatSlotTime(slot.end_at, locale)}</td>
                    <td className="px-3 py-3">{slot.barber_id || common.none}</td>
                    <td className="px-3 py-3">{slot.resource_id || common.none}</td>
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
