import { cookies } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { EmptyState, InitialsAvatar, Panel } from "@/components/ui";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { type BarberSummary, type StaffCustomerSummary, fetchApiJson, fetchApiJsonWithToken } from "@/lib/api";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n-server";

function customerName(customer: StaffCustomerSummary, fallback: string): string {
  return customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || fallback;
}

function formatTimestamp(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

async function loadCustomerData(accessToken: string): Promise<{
  customers: StaffCustomerSummary[];
  barbers: BarberSummary[];
}> {
  const [customers, barbers] = await Promise.all([
    fetchApiJsonWithToken<StaffCustomerSummary[]>("/api/staff/customers/lookup", accessToken).catch(() => []),
    fetchApiJson<BarberSummary[]>("/api/barbers?is_active=true&limit=200").catch(() => []),
  ]);

  return { customers, barbers };
}

export default async function CustomersPage() {
  const [{ dictionary: d }, locale] = await Promise.all([getRequestDictionary(), getRequestLocale()]);
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return (
      <AppShell title={d.customers.title} eyebrow={d.customers.eyebrow} activeNav="customers">
        <EmptyState title={d.common.sessionRequiredTitle} body={d.common.signInAgain} />
      </AppShell>
    );
  }

  const { customers, barbers } = await loadCustomerData(sessionToken);
  const barberById = new Map(barbers.map((item) => [item.id, item.display_name]));

  return (
    <AppShell title={d.customers.title} eyebrow={d.customers.eyebrow} activeNav="customers">
      <div className="grid gap-6">
        <Panel title={d.customers.panelTitle} subtitle={d.customers.panelSubtitle}>
          <div className="grid gap-3">
            {customers.map((customer) => (
              <article key={customer.id} className="card-muted">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <InitialsAvatar name={customerName(customer, d.common.customer)} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="headline-sm">{customerName(customer, d.common.customer)}</h3>
                        <span className={`pill ${customer.is_active ? "pill-primary" : "pill-tertiary"}`}>
                          {customer.is_active ? d.common.active : d.common.inactive}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-on-surface-variant)]">{customer.whatsapp_phone_e164}</p>
                      {customer.notes ? <p className="body-muted mt-3 max-w-3xl">{customer.notes}</p> : null}
                    </div>
                  </div>
                  <div className="min-w-48 rounded-[var(--radius-lg)] bg-[var(--color-surface-container-lowest)] px-4 py-3 text-sm">
                    <p className="stat-label">{d.customers.preferred}</p>
                    <p className="mt-2 font-semibold text-[var(--color-on-surface)]">
                      {customer.preferred_barber_id ? barberById.get(customer.preferred_barber_id) || d.common.assignedBarber : d.common.noPreference}
                    </p>
                    <p className="mt-2 text-xs text-[var(--color-outline)]">{d.customers.updated} {formatTimestamp(customer.updated_at, locale)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Panel>
        {customers.length === 0 ? (
          <EmptyState title={d.customers.emptyTitle} body={d.customers.emptyBody} />
        ) : null}
      </div>
    </AppShell>
  );
}
