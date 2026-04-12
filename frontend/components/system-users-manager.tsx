"use client";

import { FormEvent, useState, useTransition } from "react";

import type { Dictionary } from "@/lib/i18n";
import type { SystemUserPayload, SystemUserSummary } from "@/lib/api";

const ROLE_CODES = ["owner", "admin", "receptionist", "barber"] as const;

type RoleCode = (typeof ROLE_CODES)[number];

type SystemUsersCopy = Dictionary["systemUsers"];
type CommonCopy = Dictionary["common"];

type FormState = {
  id: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone_e164: string;
  password: string;
  is_active: boolean;
  roles: RoleCode[];
};

const EMPTY_FORM: FormState = {
  id: null,
  first_name: "",
  last_name: "",
  display_name: "",
  email: "",
  phone_e164: "",
  password: "",
  is_active: true,
  roles: ["receptionist"],
};

export function SystemUsersManager({
  initialUsers,
  copy,
  common,
}: {
  initialUsers: SystemUserSummary[];
  copy: SystemUsersCopy;
  common: CommonCopy;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(form.id);

  function editUser(user: SystemUserSummary) {
    setForm({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name ?? "",
      display_name: user.display_name,
      email: user.email,
      phone_e164: user.phone_e164 ?? "",
      password: "",
      is_active: user.is_active,
      roles: user.roles.filter((role): role is RoleCode => ROLE_CODES.includes(role as RoleCode)),
    });
    setError(null);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  function updateField(field: keyof FormState, value: string | boolean | RoleCode[]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleRole(role: RoleCode) {
    setForm((current) => {
      const roles = current.roles.includes(role)
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role];
      return { ...current, roles };
    });
  }

  async function refreshUsers() {
    const response = await fetch("/api/system-users", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(copy.loadError);
    }
    setUsers((await response.json()) as SystemUserSummary[]);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload: SystemUserPayload = {
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      display_name: form.display_name.trim(),
      phone_e164: form.phone_e164.trim() || null,
      is_active: form.is_active,
      roles: form.roles,
    };
    if (form.password.trim()) {
      payload.password = form.password;
    }

    startTransition(async () => {
      const response = await fetch(form.id ? `/api/system-users/${form.id}` : "/api/system-users", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(copy.saveError);
        return;
      }

      resetForm();
      await refreshUsers().catch(() => setError(copy.loadError));
    });
  }

  function changeUserStatus(user: SystemUserSummary, isActive: boolean) {
    const message = isActive ? copy.confirmReactivate : copy.confirmDeactivate;
    if (!window.confirm(message)) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/system-users/${user.id}`, {
        method: isActive ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: isActive ? JSON.stringify({ is_active: true }) : undefined,
      });

      if (!response.ok) {
        setError(copy.deactivateError);
        return;
      }

      await refreshUsers().catch(() => setError(copy.loadError));
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="app-panel">
        <div className="app-panel-header flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="app-panel-title">{copy.panelTitle}</h2>
            <p className="app-panel-subtitle mt-1">{copy.panelSubtitle}</p>
          </div>
          <button className="btn btn-primary btn-sm" type="button" onClick={resetForm}>
            <span className="material-symbols-outlined icon-sm" aria-hidden="true">person_add</span>
            {copy.newUser}
          </button>
        </div>

        {error ? <p className="pill pill-tertiary mb-4">{error}</p> : null}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{copy.fields.displayName}</th>
                <th>{copy.fields.email}</th>
                <th>{copy.fields.roles}</th>
                <th>{copy.fields.status}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <p className="font-semibold text-[var(--color-on-surface)]">{user.display_name}</p>
                    <p className="text-xs text-[var(--color-outline)]">{copy.updated} {new Date(user.updated_at).toLocaleDateString()}</p>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <span className="pill pill-secondary" key={role}>{copy.roles[role as RoleCode] ?? role}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${user.is_active ? "pill-primary" : "pill-tertiary"}`}>
                      {user.is_active ? common.active : common.inactive}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => editUser(user)}>
                        {copy.editUser}
                      </button>
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => changeUserStatus(user, !user.is_active)}>
                        {user.is_active ? copy.deactivate : copy.reactivate}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 ? (
          <div className="empty-state mt-4">
            <p className="empty-state-title">{copy.emptyTitle}</p>
            <p className="empty-state-body">{copy.emptyBody}</p>
          </div>
        ) : null}
      </section>

      <section className="app-panel">
        <div className="app-panel-header">
          <h2 className="app-panel-title">{isEditing ? copy.editUser : copy.createUser}</h2>
          <p className="app-panel-subtitle mt-1">{copy.passwordHelp}</p>
        </div>

        <form className="grid gap-4" onSubmit={submitForm}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.firstName}</span>
              <input className="input-field" value={form.first_name} onChange={(event) => updateField("first_name", event.target.value)} required />
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.lastName}</span>
              <input className="input-field" value={form.last_name} onChange={(event) => updateField("last_name", event.target.value)} />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.displayName}</span>
            <input className="input-field" value={form.display_name} onChange={(event) => updateField("display_name", event.target.value)} required />
          </label>

          <label className="grid gap-2">
            <span className="stat-label">{copy.fields.email}</span>
            <input className="input-field" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.phone}</span>
              <input className="input-field" value={form.phone_e164} onChange={(event) => updateField("phone_e164", event.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="stat-label">{copy.fields.password}</span>
              <input className="input-field" type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} required={!isEditing} minLength={8} />
            </label>
          </div>

          <fieldset className="grid gap-3">
            <legend className="stat-label">{copy.fields.roles}</legend>
            <div className="flex flex-wrap gap-2">
              {ROLE_CODES.map((role) => (
                <label className={`pill ${form.roles.includes(role) ? "pill-primary" : "pill-secondary"} cursor-pointer`} key={role}>
                  <input className="sr-only" type="checkbox" checked={form.roles.includes(role)} onChange={() => toggleRole(role)} />
                  {copy.roles[role]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.is_active} onChange={(event) => updateField("is_active", event.target.checked)} />
            <span className="stat-label">{copy.fields.status}: {form.is_active ? common.active : common.inactive}</span>
          </label>

          <div className="flex flex-wrap justify-end gap-3">
            <button className="btn btn-ghost" type="button" onClick={resetForm}>
              {copy.cancel}
            </button>
            <button className="btn btn-primary" type="submit" disabled={isPending}>
              {isEditing ? copy.saveUser : copy.createUser}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
