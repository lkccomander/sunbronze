import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel, StatCard } from "@/components/ui";
import {
  type ConversationStateSummary,
  type ReminderJobSummary,
  type WhatsAppMessageSummary,
  fetchProtectedApiJson,
} from "@/lib/api";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n-server";

function formatTimestamp(value: string | null, locale: string, emptyLabel: string): string {
  if (!value) {
    return emptyLabel;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale);
}

export default async function DevPage() {
  const [{ dictionary: d }, locale] = await Promise.all([getRequestDictionary(), getRequestLocale()]);
  const [messages, conversations, reminders] = await Promise.all([
    fetchProtectedApiJson<WhatsAppMessageSummary[]>("/api/whatsapp/messages"),
    fetchProtectedApiJson<ConversationStateSummary[]>("/api/whatsapp/conversations"),
    fetchProtectedApiJson<ReminderJobSummary[]>("/api/whatsapp/reminders"),
  ]);

  const totalMessages = messages?.length ?? 0;
  const failedMessages = messages?.filter((item) => item.status === "failed").length ?? 0;
  const humanHandoffs = conversations?.filter((item) => item.handed_off_to_human).length ?? 0;
  const pendingReminders = reminders?.filter((item) => item.status === "pending").length ?? 0;
  const authReady = Boolean(messages && conversations && reminders);

  return (
    <AppShell title={d.dev.title} eyebrow={d.dev.eyebrow} activeNav="dev">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={d.dev.stats.messages} value={String(totalMessages)} tone="accent" />
        <StatCard label={d.dev.stats.failedSends} value={String(failedMessages)} />
        <StatCard label={d.dev.stats.humanHandoffs} value={String(humanHandoffs)} tone="soft" />
        <StatCard label={d.dev.stats.pendingReminders} value={String(pendingReminders)} />
      </div>

      {!authReady ? (
        <div className="mt-6">
          <EmptyState
            title={d.dev.emptyTitle}
            body={d.dev.emptyBody}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6">
        <Panel title={d.dev.messagesTitle} subtitle={d.dev.messagesSubtitle}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.25em] text-ink/45">
                <tr>
                  <th className="px-3 py-3">{d.dev.headers.created}</th>
                  <th className="px-3 py-3">{d.dev.headers.direction}</th>
                  <th className="px-3 py-3">{d.dev.headers.status}</th>
                  <th className="px-3 py-3">{d.dev.headers.kind}</th>
                  <th className="px-3 py-3">{d.dev.headers.provider}</th>
                  <th className="px-3 py-3">{d.dev.headers.body}</th>
                </tr>
              </thead>
              <tbody>
                {(messages ?? []).slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-t border-ink/8">
                    <td className="px-3 py-3">{formatTimestamp(item.created_at, locale, d.common.none)}</td>
                    <td className="px-3 py-3 uppercase">{item.direction}</td>
                    <td className="px-3 py-3 uppercase">{item.status}</td>
                    <td className="px-3 py-3 uppercase">{item.kind}</td>
                    <td className="px-3 py-3">{item.provider_name}</td>
                    <td className="max-w-[28rem] break-words px-3 py-3 text-ink/72">{item.body || d.common.noBody}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={d.dev.conversationsTitle} subtitle={d.dev.conversationsSubtitle}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.25em] text-ink/45">
                <tr>
                  <th className="px-3 py-3">{d.dev.headers.chat}</th>
                  <th className="px-3 py-3">{d.dev.headers.state}</th>
                  <th className="px-3 py-3">{d.dev.headers.intent}</th>
                  <th className="px-3 py-3">{d.dev.headers.human}</th>
                  <th className="px-3 py-3">{d.dev.headers.lastInbound}</th>
                  <th className="px-3 py-3">{d.dev.headers.lastOutbound}</th>
                </tr>
              </thead>
              <tbody>
                {(conversations ?? []).slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-t border-ink/8">
                    <td className="px-3 py-3">{item.whatsapp_chat_id}</td>
                    <td className="px-3 py-3 uppercase">{item.state}</td>
                    <td className="px-3 py-3 uppercase">{item.active_intent}</td>
                    <td className="px-3 py-3">{item.handed_off_to_human ? d.common.yes : d.common.no}</td>
                    <td className="px-3 py-3">{formatTimestamp(item.last_inbound_at, locale, d.common.none)}</td>
                    <td className="px-3 py-3">{formatTimestamp(item.last_outbound_at, locale, d.common.none)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={d.dev.remindersTitle} subtitle={d.dev.remindersSubtitle}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.25em] text-ink/45">
                <tr>
                  <th className="px-3 py-3">{d.dev.headers.scheduled}</th>
                  <th className="px-3 py-3">{d.dev.headers.type}</th>
                  <th className="px-3 py-3">{d.dev.headers.status}</th>
                  <th className="px-3 py-3">{d.dev.headers.attempts}</th>
                  <th className="px-3 py-3">{d.dev.headers.processed}</th>
                  <th className="px-3 py-3">{d.dev.headers.appointment}</th>
                </tr>
              </thead>
              <tbody>
                {(reminders ?? []).slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-t border-ink/8">
                    <td className="px-3 py-3">{formatTimestamp(item.scheduled_for, locale, d.common.none)}</td>
                    <td className="px-3 py-3">{item.reminder_type}</td>
                    <td className="px-3 py-3 uppercase">{item.status}</td>
                    <td className="px-3 py-3">{item.attempts}</td>
                    <td className="px-3 py-3">{formatTimestamp(item.processed_at, locale, d.common.none)}</td>
                    <td className="px-3 py-3">{item.appointment_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
