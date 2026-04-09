import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel, StatCard } from "@/components/ui";
import {
  type ConversationStateSummary,
  type ReminderJobSummary,
  type WhatsAppMessageSummary,
  fetchProtectedApiJson,
} from "@/lib/api";

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "None";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default async function DevPage() {
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
    <AppShell title="Developer Reports" eyebrow="Dev tools">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Messages" value={String(totalMessages)} tone="accent" />
        <StatCard label="Failed Sends" value={String(failedMessages)} />
        <StatCard label="Human Handoffs" value={String(humanHandoffs)} tone="soft" />
        <StatCard label="Pending Reminders" value={String(pendingReminders)} />
      </div>

      {!authReady ? (
        <div className="mt-6">
          <EmptyState
            title="Dev auth or API data not available"
            body="This report page logs in with SUNBRONZE_DEV_EMAIL and SUNBRONZE_DEV_PASSWORD on the server, then reads the protected WhatsApp endpoints. Add those values in frontend/.env.local if the defaults are not valid for your environment."
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6">
        <Panel title="app.whatsapp_messages" subtitle="Latest inbound and outbound traffic captured by the platform.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.25em] text-ink/45">
                <tr>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Direction</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Kind</th>
                  <th className="px-3 py-3">Provider</th>
                  <th className="px-3 py-3">Body</th>
                </tr>
              </thead>
              <tbody>
                {(messages ?? []).slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-t border-ink/8">
                    <td className="px-3 py-3">{formatTimestamp(item.created_at)}</td>
                    <td className="px-3 py-3 uppercase">{item.direction}</td>
                    <td className="px-3 py-3 uppercase">{item.status}</td>
                    <td className="px-3 py-3 uppercase">{item.kind}</td>
                    <td className="px-3 py-3">{item.provider_name}</td>
                    <td className="max-w-[28rem] px-3 py-3 text-ink/72">{item.body || "No body"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="app.conversations" subtitle="Conversation states and intent transitions for WhatsApp interactions.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.25em] text-ink/45">
                <tr>
                  <th className="px-3 py-3">Chat</th>
                  <th className="px-3 py-3">State</th>
                  <th className="px-3 py-3">Intent</th>
                  <th className="px-3 py-3">Human</th>
                  <th className="px-3 py-3">Last inbound</th>
                  <th className="px-3 py-3">Last outbound</th>
                </tr>
              </thead>
              <tbody>
                {(conversations ?? []).slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-t border-ink/8">
                    <td className="px-3 py-3">{item.whatsapp_chat_id}</td>
                    <td className="px-3 py-3 uppercase">{item.state}</td>
                    <td className="px-3 py-3 uppercase">{item.active_intent}</td>
                    <td className="px-3 py-3">{item.handed_off_to_human ? "Yes" : "No"}</td>
                    <td className="px-3 py-3">{formatTimestamp(item.last_inbound_at)}</td>
                    <td className="px-3 py-3">{formatTimestamp(item.last_outbound_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="app.reminder_jobs" subtitle="Reminder queue visibility for WhatsApp-linked appointment notifications.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.25em] text-ink/45">
                <tr>
                  <th className="px-3 py-3">Scheduled</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Attempts</th>
                  <th className="px-3 py-3">Processed</th>
                  <th className="px-3 py-3">Appointment</th>
                </tr>
              </thead>
              <tbody>
                {(reminders ?? []).slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-t border-ink/8">
                    <td className="px-3 py-3">{formatTimestamp(item.scheduled_for)}</td>
                    <td className="px-3 py-3">{item.reminder_type}</td>
                    <td className="px-3 py-3 uppercase">{item.status}</td>
                    <td className="px-3 py-3">{item.attempts}</td>
                    <td className="px-3 py-3">{formatTimestamp(item.processed_at)}</td>
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
