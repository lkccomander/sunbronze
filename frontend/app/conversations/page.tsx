import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";

const samples = [
  { name: "Cliente WhatsApp", state: "choose_service", preview: "I want to book a corte" },
  { name: "Cliente FAQ", state: "faq", preview: "What are your business hours?" },
  { name: "Cliente Human", state: "waiting_human", preview: "Need a real person please." },
];

export default function ConversationsPage() {
  return (
    <AppShell title="Conversations Inbox" eyebrow="WhatsApp">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Inbox lanes" subtitle="Conversation triage starts here.">
          <div className="space-y-3">
            {samples.map((item) => (
              <div key={item.name} className="rounded-3xl border border-ink/10 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{item.name}</p>
                  <span className="rounded-full bg-plum/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-plum">{item.state}</span>
                </div>
                <p className="mt-2 text-sm text-ink/68">{item.preview}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Conversation detail" subtitle="Designed for handoff, booking context, and quick replies.">
          <div className="rounded-[28px] bg-ink p-5 text-sand">
            <p className="text-sm leading-7 text-sand/80">
              This pane will host the selected chat transcript, booking suggestions, and staff-assignment controls once Phase 6 wiring begins.
            </p>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
