import { cookies } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel } from "@/components/ui";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import {
  type CustomerSummary,
  type StaffConversationSummary,
  type WhatsAppMessageSummary,
  fetchApiJson,
  fetchApiJsonWithToken,
} from "@/lib/api";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n-server";

function formatTimestamp(value: string | null, locale: string, emptyLabel: string): string {
  if (!value) {
    return emptyLabel;
  }

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

function customerName(customer: CustomerSummary | undefined, fallback: string): string {
  if (!customer) {
    return fallback;
  }

  return customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.whatsapp_phone_e164;
}

async function loadConversationData(accessToken: string): Promise<{
  conversations: StaffConversationSummary[];
  messages: WhatsAppMessageSummary[];
  customers: CustomerSummary[];
}> {
  const [conversations, messages, customers] = await Promise.all([
    fetchApiJsonWithToken<StaffConversationSummary[]>("/api/staff/conversations", accessToken).catch(() => []),
    fetchApiJsonWithToken<WhatsAppMessageSummary[]>("/api/whatsapp/messages", accessToken).catch(() => []),
    fetchApiJson<CustomerSummary[]>("/api/customers?limit=200").catch(() => []),
  ]);

  return { conversations, messages, customers };
}

export default async function ConversationsPage() {
  const [{ dictionary: d }, locale] = await Promise.all([getRequestDictionary(), getRequestLocale()]);
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return (
      <AppShell title={d.conversations.title} eyebrow={d.conversations.eyebrow} activeNav="conversations">
        <EmptyState title={d.common.sessionRequiredTitle} body={d.common.signInAgain} />
      </AppShell>
    );
  }

  const { conversations, messages, customers } = await loadConversationData(sessionToken);
  const customerById = new Map(customers.map((item) => [item.id, item]));
  const latestMessagesByConversation = new Map<string, WhatsAppMessageSummary>();

  for (const message of messages) {
    if (!message.conversation_id || latestMessagesByConversation.has(message.conversation_id)) {
      continue;
    }
    latestMessagesByConversation.set(message.conversation_id, message);
  }

  const sortedConversations = [...conversations].sort((left, right) => {
    const leftDate = left.last_inbound_at || left.last_outbound_at || left.updated_at;
    const rightDate = right.last_inbound_at || right.last_outbound_at || right.updated_at;
    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  });
  const selectedConversation = sortedConversations[0];
  const selectedMessages = selectedConversation
    ? messages.filter((message) => message.conversation_id === selectedConversation.id).slice(0, 8)
    : [];

  return (
    <AppShell title={d.conversations.title} eyebrow={d.conversations.eyebrow} activeNav="conversations">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel title={d.conversations.lanesTitle} subtitle={d.conversations.lanesSubtitle}>
          <div className="space-y-3">
            {sortedConversations.map((item) => {
              const latestMessage = latestMessagesByConversation.get(item.id);
              return (
                <div key={item.id} className="rounded-[var(--radius-lg)] bg-[var(--color-surface-container-low)] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--color-on-surface)]">{customerName(customerById.get(item.customer_id), d.common.unknownCustomer)}</p>
                    <span className="pill pill-secondary">{item.state}</span>
                  </div>
                  <p className="body-muted mt-2">{latestMessage?.body || item.whatsapp_chat_id}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-outline)]">
                    <span>{item.active_intent}</span>
                    <span>{item.handed_off_to_human ? d.common.humanHandoff : d.common.botActive}</span>
                    <span>{formatTimestamp(item.last_inbound_at || item.last_outbound_at, locale, d.common.none)}</span>
                  </div>
                </div>
              );
            })}
            {sortedConversations.length === 0 ? (
              <EmptyState title={d.conversations.emptyTitle} body={d.conversations.emptyBody} />
            ) : null}
          </div>
        </Panel>
        <Panel title={d.conversations.threadTitle} subtitle={d.conversations.threadSubtitle}>
          {selectedConversation ? (
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-primary)] p-5 text-[var(--color-on-primary)]">
              <div className="flex flex-col gap-2 border-b border-white/20 pb-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="stat-label text-[var(--color-on-primary)] opacity-80">{d.conversations.selectedCustomer}</p>
                  <h3 className="mt-2 font-display text-3xl leading-none">{customerName(customerById.get(selectedConversation.customer_id), d.common.unknownCustomer)}</h3>
                </div>
                <p className="text-sm opacity-80">{selectedConversation.handed_off_to_human ? d.common.waitingForStaff : d.common.botHandling}</p>
              </div>
              <div className="mt-4 space-y-3">
                {selectedMessages.map((message) => (
                  <article key={message.id} className="rounded-[var(--radius-lg)] bg-white/10 p-4">
                    <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-normal opacity-80">
                      <span>{message.direction}</span>
                      <span>{formatTimestamp(message.created_at, locale, d.common.none)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 opacity-90">{message.body || d.conversations.noMessageBody}</p>
                  </article>
                ))}
                {selectedMessages.length === 0 ? <p className="text-sm leading-6 opacity-80">{d.conversations.noStoredMessages}</p> : null}
              </div>
            </div>
          ) : (
            <EmptyState title={d.conversations.noSelectedTitle} body={d.conversations.noSelectedBody} />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
