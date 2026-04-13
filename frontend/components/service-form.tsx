"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ServicePayload, ServiceSummary } from "@/lib/api";

type ServicesCopy = {
  newService: string;
  editService: string;
  saveService: string;
  createService: string;
  deactivateService: string;
  saveError: string;
  saveSuccess: string;
  fields: Record<string, string>;
};

type CommonCopy = {
  active: string;
};

type ServiceFormState = {
  code: string;
  name: string;
  description: string;
  requires_barber: boolean;
  requires_resource: boolean;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  price: string;
  currency_code: string;
  is_active: boolean;
};

const emptyForm: ServiceFormState = {
  code: "",
  name: "",
  description: "",
  requires_barber: true,
  requires_resource: false,
  duration_minutes: 30,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  price: "",
  currency_code: "CRC",
  is_active: true,
};

function toForm(service: ServiceSummary | null): ServiceFormState {
  if (!service) {
    return emptyForm;
  }

  return {
    code: service.code,
    name: service.name,
    description: service.description || "",
    requires_barber: service.requires_barber,
    requires_resource: service.requires_resource,
    duration_minutes: service.duration_minutes,
    buffer_before_minutes: service.buffer_before_minutes,
    buffer_after_minutes: service.buffer_after_minutes,
    price: service.price_cents === null ? "" : String(service.price_cents / 100),
    currency_code: service.currency_code,
    is_active: service.is_active,
  };
}

function priceToCents(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  return Math.round(Number(value) * 100);
}

export function ServiceForm({
  initialService,
  copy,
  common,
}: {
  initialService: ServiceSummary | null;
  copy: ServicesCopy;
  common: CommonCopy;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ServiceFormState>(() => toForm(initialService));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateForm<K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveService(formData: FormData) {
    setError(null);
    setMessage(null);

    const payload: ServicePayload = {
      code: String(formData.get("code") || "").trim(),
      name: String(formData.get("name") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      duration_minutes: Number(formData.get("duration_minutes")),
      buffer_before_minutes: Number(formData.get("buffer_before_minutes")),
      buffer_after_minutes: Number(formData.get("buffer_after_minutes")),
      price_cents: priceToCents(String(formData.get("price") || "")),
      currency_code: String(formData.get("currency_code") || "CRC").trim().toUpperCase(),
      requires_barber: formData.get("requires_barber") === "on",
      requires_resource: formData.get("requires_resource") === "on",
      is_active: formData.get("is_active") === "on",
    };

    const response = await fetch(initialService ? `/api/services/${initialService.id}` : "/api/services", {
      method: initialService ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError(copy.saveError);
      return;
    }

    setMessage(copy.saveSuccess);
    startTransition(() => {
      router.push("/services");
      router.refresh();
    });
  }

  async function deactivateService() {
    if (!initialService) {
      return;
    }

    setError(null);
    setMessage(null);
    const response = await fetch(`/api/services/${initialService.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError(copy.saveError);
      return;
    }

    setMessage(copy.saveSuccess);
    startTransition(() => {
      router.push("/services");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      {message ? <p className="pill pill-primary">{message}</p> : null}
      {error ? <p className="pill pill-tertiary">{error}</p> : null}

      <form className="service-editor" action={saveService}>
        <div className="service-editor-header">
          <div>
            <p className="stat-label">{initialService ? copy.editService : copy.newService}</p>
            <h3>{initialService ? form.name || copy.editService : copy.createService}</h3>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/services">
            {copy.fields.cancel}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.code}</span>
            <input className="input-field" name="code" value={form.code} onChange={(event) => updateForm("code", event.target.value)} required />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.serviceName}</span>
            <input className="input-field" name="name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.duration}</span>
            <input className="input-field" name="duration_minutes" type="number" min="1" value={form.duration_minutes} onChange={(event) => updateForm("duration_minutes", Number(event.target.value))} required />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.price}</span>
            <input className="input-field" name="price" type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateForm("price", event.target.value)} />
          </label>
          <label className="grid gap-2 xl:col-span-2">
            <span className="stat-label">{copy.fields.description}</span>
            <input className="input-field" name="description" value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.bufferBefore}</span>
            <input className="input-field" name="buffer_before_minutes" type="number" min="0" value={form.buffer_before_minutes} onChange={(event) => updateForm("buffer_before_minutes", Number(event.target.value))} />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.bufferAfter}</span>
            <input className="input-field" name="buffer_after_minutes" type="number" min="0" value={form.buffer_after_minutes} onChange={(event) => updateForm("buffer_after_minutes", Number(event.target.value))} />
          </label>
          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.currency}</span>
            <input className="input-field" name="currency_code" maxLength={3} value={form.currency_code} onChange={(event) => updateForm("currency_code", event.target.value.toUpperCase())} required />
          </label>
          <label className="service-checkbox">
            <input name="requires_barber" type="checkbox" checked={form.requires_barber} onChange={(event) => updateForm("requires_barber", event.target.checked)} />
            {copy.fields.requiresBarber}
          </label>
          <label className="service-checkbox">
            <input name="requires_resource" type="checkbox" checked={form.requires_resource} onChange={(event) => updateForm("requires_resource", event.target.checked)} />
            {copy.fields.requiresResource}
          </label>
          <label className="service-checkbox">
            <input name="is_active" type="checkbox" checked={form.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} />
            {common.active}
          </label>
        </div>

        <button className="btn btn-primary justify-center" disabled={isPending}>
          {initialService ? copy.saveService : copy.createService}
        </button>
      </form>

      {initialService?.is_active ? (
        <button type="button" className="btn btn-tertiary justify-center" onClick={deactivateService} disabled={isPending}>
          {copy.deactivateService}
        </button>
      ) : null}
    </div>
  );
}
