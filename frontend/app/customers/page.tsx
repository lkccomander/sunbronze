import { cookies } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel } from "@/components/ui";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { type BarberSummary, type StaffCustomerSummary, fetchApiJson, fetchApiJsonWithToken } from "@/lib/api";

function customerName(customer: StaffCustomerSummary): string {
  return customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer";
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
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
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return (
      <AppShell title="Customer Search" eyebrow="CRM">
        <EmptyState title="Session required" body="Sign in again to load customer lookup." />
      </AppShell>
    );
  }

  const { customers, barbers } = await loadCustomerData(sessionToken);
  const barberById = new Map(barbers.map((item) => [item.id, item.display_name]));

  return (
    <AppShell title="Customer Search" eyebrow="CRM">
      <div className="grid gap-6">
        <Panel title="Customer roster" subtitle="Live staff lookup results from the backend.">
          <div className="grid gap-3">
            {customers.map((customer) => (
              <article key={customer.id} className="rounded-2xl border border-ink/10 bg-sand/35 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl leading-none">{customerName(customer)}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/55">
                        {customer.is_active ? "active" : "inactive"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink/70">{customer.whatsapp_phone_e164}</p>
                    {customer.notes ? <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/68">{customer.notes}</p> : null}
                  </div>
                  <div className="min-w-48 rounded-2xl border border-ink/8 bg-white px-4 py-3 text-sm text-ink/70">
                    <p className="text-xs uppercase tracking-[0.24em] text-ink/45">Preferred</p>
                    <p className="mt-2 font-semibold text-ink">
                      {customer.preferred_barber_id ? barberById.get(customer.preferred_barber_id) || "Assigned barber" : "No preference"}
                    </p>
                    <p className="mt-2 text-xs text-ink/50">Updated {formatTimestamp(customer.updated_at)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Panel>
        {customers.length === 0 ? (
          <EmptyState title="No customers returned" body="The staff lookup endpoint is reachable, but it did not return customer records for this environment." />
        ) : null}
      </div>
    </AppShell>
  );
}
