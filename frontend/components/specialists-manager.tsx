"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { BarberPayload, BarberSummary, BarberWorkingHoursSummary } from "@/lib/api";

type ServicesCopy = {
  staffTitle: string;
  staffSubtitle: string;
  noContact: string;
  emptyStaffTitle: string;
  emptyStaffBody: string;
  newSpecialist: string;
  editSpecialist: string;
  saveSpecialist: string;
  createSpecialist: string;
  deactivateSpecialist: string;
  addHours: string;
  saveHours: string;
  deleteHours: string;
  saveError: string;
  saveSuccess: string;
  fields: Record<string, string>;
  weekdays: string[];
};

type CommonCopy = {
  active: string;
  inactive: string;
};

type SpecialistForm = {
  id: string | null;
  code: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone_e164: string;
  time_zone: string;
  is_active: boolean;
};

const emptyForm: SpecialistForm = {
  id: null,
  code: "",
  first_name: "",
  last_name: "",
  display_name: "",
  email: "",
  phone_e164: "",
  time_zone: "America/Costa_Rica",
  is_active: true,
};

function toForm(barber: BarberSummary): SpecialistForm {
  return {
    id: barber.id,
    code: barber.code,
    first_name: barber.first_name,
    last_name: barber.last_name || "",
    display_name: barber.display_name,
    email: barber.email || "",
    phone_e164: barber.phone_e164 || "",
    time_zone: barber.time_zone,
    is_active: barber.is_active,
  };
}

function timeLabel(value: string): string {
  return value.slice(0, 5);
}

function weekdayValueFromIndex(index: number): number {
  return (index + 1) % 7;
}

export function SpecialistsManager({
  initialBarbers,
  initialHours,
  copy,
  common,
}: {
  initialBarbers: BarberSummary[];
  initialHours: Record<string, BarberWorkingHoursSummary[]>;
  copy: ServicesCopy;
  common: CommonCopy;
}) {
  const router = useRouter();
  const [form, setForm] = useState<SpecialistForm>(emptyForm);
  const [selectedBarberId, setSelectedBarberId] = useState(initialBarbers[0]?.id || "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateForm<K extends keyof SpecialistForm>(key: K, value: SpecialistForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSpecialist(formData: FormData) {
    setMessage(null);
    setError(null);
    const payload: BarberPayload = {
      code: String(formData.get("code") || ""),
      first_name: String(formData.get("first_name") || ""),
      last_name: String(formData.get("last_name") || "") || null,
      display_name: String(formData.get("display_name") || "") || null,
      email: String(formData.get("email") || "") || null,
      phone_e164: String(formData.get("phone_e164") || "") || null,
      time_zone: String(formData.get("time_zone") || "America/Costa_Rica"),
      is_active: formData.get("is_active") === "on",
    };
    const response = await fetch(form.id ? `/api/barbers/${form.id}` : "/api/barbers", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError(copy.saveError);
      return;
    }

    setForm(emptyForm);
    setMessage(copy.saveSuccess);
    startTransition(() => router.refresh());
  }

  async function deactivateSpecialist(barberId: string) {
    setMessage(null);
    setError(null);
    const response = await fetch(`/api/barbers/${barberId}`, { method: "DELETE" });
    if (!response.ok) {
      setError(copy.saveError);
      return;
    }
    setMessage(copy.saveSuccess);
    startTransition(() => router.refresh());
  }

  async function addHours(formData: FormData) {
    setMessage(null);
    setError(null);
    const barberId = String(formData.get("barber_id") || selectedBarberId);
    const response = await fetch(`/api/barbers/${barberId}/working-hours`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekday: Number(formData.get("weekday")),
        start_time: `${formData.get("start_time")}:00`,
        end_time: `${formData.get("end_time")}:00`,
        is_active: true,
      }),
    });

    if (!response.ok) {
      setError(copy.saveError);
      return;
    }

    setMessage(copy.saveSuccess);
    startTransition(() => router.refresh());
  }

  async function deleteHours(barberId: string, hoursId: string) {
    setMessage(null);
    setError(null);
    const response = await fetch(`/api/barbers/${barberId}/working-hours/${hoursId}`, { method: "DELETE" });
    if (!response.ok) {
      setError(copy.saveError);
      return;
    }
    setMessage(copy.saveSuccess);
    startTransition(() => router.refresh());
  }

  async function updateHours(formData: FormData) {
    setMessage(null);
    setError(null);
    const barberId = String(formData.get("barber_id") || "");
    const hoursId = String(formData.get("hours_id") || "");
    const response = await fetch(`/api/barbers/${barberId}/working-hours/${hoursId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekday: Number(formData.get("weekday")),
        start_time: `${formData.get("start_time")}:00`,
        end_time: `${formData.get("end_time")}:00`,
        is_active: true,
      }),
    });

    if (!response.ok) {
      setError(copy.saveError);
      return;
    }
    setMessage(copy.saveSuccess);
    startTransition(() => router.refresh());
  }

  const selectedHours = initialHours[selectedBarberId] || [];

  return (
    <div className="grid gap-6">
      <section className="app-panel">
        <div className="app-panel-header">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="app-panel-title">{copy.staffTitle}</h3>
              <p className="app-panel-subtitle mt-1">{copy.staffSubtitle}</p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setForm(emptyForm)}>
              {copy.newSpecialist}
            </button>
          </div>
        </div>
        {message ? <p className="pill pill-primary mb-4">{message}</p> : null}
        {error ? <p className="pill pill-tertiary mb-4">{error}</p> : null}

        <form className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" action={saveSpecialist}>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.code}</span>
            <input className="input-field" name="code" value={form.code} onChange={(event) => updateForm("code", event.target.value)} required />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.firstName}</span>
            <input className="input-field" name="first_name" value={form.first_name} onChange={(event) => updateForm("first_name", event.target.value)} required />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.lastName}</span>
            <input className="input-field" name="last_name" value={form.last_name} onChange={(event) => updateForm("last_name", event.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.displayName}</span>
            <input className="input-field" name="display_name" value={form.display_name} onChange={(event) => updateForm("display_name", event.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.email}</span>
            <input className="input-field" name="email" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.phone}</span>
            <input className="input-field" name="phone_e164" value={form.phone_e164} onChange={(event) => updateForm("phone_e164", event.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.timeZone}</span>
            <input className="input-field" name="time_zone" value={form.time_zone} onChange={(event) => updateForm("time_zone", event.target.value)} required />
          </label>
          <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-[var(--color-on-surface-variant)]">
            <input name="is_active" type="checkbox" checked={form.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} />
            {common.active}
          </label>
          <button className="btn btn-primary justify-center md:col-span-2 xl:col-span-4" disabled={isPending}>
            {form.id ? copy.saveSpecialist : copy.createSpecialist}
          </button>
        </form>

        <div className="grid gap-3 md:grid-cols-2">
          {initialBarbers.map((barber) => (
            <article key={barber.id} className="card-muted">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="headline-sm">{barber.display_name}</p>
                  <p className="body-muted mt-2">{barber.email || barber.phone_e164 || copy.noContact}</p>
                  <p className="stat-label mt-3">{barber.code} · {barber.time_zone}</p>
                </div>
                <span className={`pill ${barber.is_active ? "pill-primary" : "pill-tertiary"}`}>{barber.is_active ? common.active : common.inactive}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(toForm(barber))}>{copy.editSpecialist}</button>
                {barber.is_active ? <button type="button" className="btn btn-tertiary btn-sm" onClick={() => deactivateSpecialist(barber.id)}>{copy.deactivateSpecialist}</button> : null}
              </div>
            </article>
          ))}
        </div>
        {initialBarbers.length === 0 ? <p className="empty-state-title">{copy.emptyStaffTitle}</p> : null}
      </section>

      <section className="app-panel">
        <div className="app-panel-header">
          <h3 className="app-panel-title">{copy.fields.workingHours}</h3>
          <p className="app-panel-subtitle mt-1">{copy.emptyStaffBody}</p>
        </div>
        <form className="grid gap-4 md:grid-cols-5" action={addHours}>
          <label className="grid gap-2 md:col-span-2">
            <span className="stat-label">{copy.fields.specialist}</span>
            <select className="input-field" name="barber_id" value={selectedBarberId} onChange={(event) => setSelectedBarberId(event.target.value)} required>
              {initialBarbers.map((barber) => (
                <option key={barber.id} value={barber.id}>{barber.display_name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.weekday}</span>
            <select className="input-field" name="weekday" defaultValue="1">
              {copy.weekdays.map((weekday, index) => (
                <option key={weekday} value={weekdayValueFromIndex(index)}>{weekday}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.start}</span>
            <input className="input-field" name="start_time" type="time" defaultValue="09:00" required />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.end}</span>
            <input className="input-field" name="end_time" type="time" defaultValue="17:00" required />
          </label>
          <button className="btn btn-primary justify-center md:col-span-5" disabled={isPending || !selectedBarberId}>{copy.addHours}</button>
        </form>

        <div className="mt-5 grid gap-3">
          {selectedHours.map((hours) => (
            <form key={hours.id} className="grid gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-container-low)] p-4 md:grid-cols-[1fr_1fr_1fr_auto_auto]" action={updateHours}>
              <input name="barber_id" type="hidden" value={hours.barber_id} />
              <input name="hours_id" type="hidden" value={hours.id} />
              <label className="grid gap-2">
                <span className="stat-label">{copy.fields.weekday}</span>
                <select className="input-field" name="weekday" defaultValue={hours.weekday}>
                  {copy.weekdays.map((weekday, index) => (
                    <option key={weekday} value={weekdayValueFromIndex(index)}>{weekday}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="stat-label">{copy.fields.start}</span>
                <input className="input-field" name="start_time" type="time" defaultValue={timeLabel(hours.start_time)} required />
              </label>
              <label className="grid gap-2">
                <span className="stat-label">{copy.fields.end}</span>
                <input className="input-field" name="end_time" type="time" defaultValue={timeLabel(hours.end_time)} required />
              </label>
              <button className="btn btn-secondary btn-sm self-end justify-center" disabled={isPending}>{copy.saveHours}</button>
              <button type="button" className="btn btn-tertiary btn-sm self-end justify-center" onClick={() => deleteHours(hours.barber_id, hours.id)}>{copy.deleteHours}</button>
            </form>
          ))}
          {selectedHours.length === 0 ? <p className="body-muted">{copy.emptyStaffBody}</p> : null}
        </div>
      </section>
    </div>
  );
}
