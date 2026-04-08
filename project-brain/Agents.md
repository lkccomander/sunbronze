WhatsApp Receptionist Agents

Purpose
- Define the logical agents or system roles in the product.
- These are product-level agents, not LLM-first agents.

Agent 1: Conversation Orchestrator
- Owns the deterministic conversation state machine
- Receives inbound WhatsApp messages
- Identifies the current state
- Decides the next allowed step
- Requests scheduling operations from backend services

Responsibilities
- route the conversation by state
- validate required inputs
- ask next question
- trigger booking, reschedule, or cancellation actions
- detect when a human handoff is needed

Agent 2: Scheduling Engine
- Owns booking truth
- Runs on our custom Postgres-based scheduling logic
- Computes availability and prevents conflicts

Responsibilities
- availability checks
- overlap detection
- buffer enforcement
- appointment creation
- appointment updates
- appointment cancellation
- transactional locking

Agent 3: Messaging Agent
- Owns outbound and inbound WhatsApp integration behavior
- Talks to WhatsApp Business Platform (Cloud API)

Responsibilities
- send outbound messages
- receive webhook events
- track delivery states
- manage templates
- retry safe message sends

Agent 4: Reminder and Jobs Agent
- Owns asynchronous workflows
- Runs scheduled and background tasks

Responsibilities
- appointment reminders
- no-show follow-ups
- reschedule prompts
- retry queues
- cleanup jobs

Agent 5: Admin and Reception Console
- Human-facing operational layer
- Lets staff review and intervene when necessary

Responsibilities
- search clients
- view appointments
- apply manual overrides
- log walk-ins
- block time
- resolve edge cases

Agent 6: Optional AI Helper
- Not part of the critical path in phase 1
- Can be added later under strict boundaries

Allowed responsibilities
- intent classification
- FAQ answering
- parsing messy free-text requests
- rewriting replies in a natural tone

Not allowed responsibilities
- final availability decision
- booking conflict resolution
- booking creation without backend validation
- policy enforcement

Agent interaction model
- WhatsApp message arrives
- Messaging Agent receives webhook
- Conversation Orchestrator reads conversation state
- Scheduling Engine validates or executes booking logic
- Messaging Agent sends response
- Reminder and Jobs Agent handles delayed actions
- Admin and Reception Console supports humans when exceptions happen

Architecture principle
- WhatsApp is the channel.
- The orchestrator controls flow.
- The scheduling engine decides truth.
- Postgres stores truth.
- AI is optional and constrained.
