WhatsApp Receptionist Skills

Purpose
- Define the core system capabilities we need to build.
- Keep these skills aligned with the chosen architecture in llms.txt.

Core booking skills
- Book appointment
  - collect service, barber preference, date, and time
  - check availability
  - create booking
  - confirm booking
- Reschedule appointment
  - identify existing booking
  - show alternative availability
  - move booking safely
  - confirm update
- Cancel appointment
  - identify booking
  - cancel it
  - confirm cancellation
- Reminder handling
  - send reminder messages
  - process replies such as confirm, reschedule, cancel

Conversation skills
- Deterministic conversation state management
  - track exactly where the user is in the flow
  - only allow valid next actions
- Intent detection
  - booking
  - reschedule
  - cancel
  - hours
  - services
  - location
  - human help
- Input normalization
  - parse dates
  - parse times
  - map natural language service names to internal services
  - map barber names and preferences
- Fallback handling
  - ask clarifying questions when input is ambiguous
  - route to human when needed

Scheduling skills
- Availability calculation
  - consider working hours
  - service duration
  - buffers
  - breaks
  - days off
- Conflict prevention
  - prevent overlapping bookings
  - use booking locks and transactional writes
- Barber-specific rules
  - preferred barber
  - service eligibility per barber
  - recurring client preferences
- Walk-in support
  - allow front-desk insertion when needed
- Rule overrides
  - admin blocks
  - sick days
  - lunch blocks
  - special schedules

Customer support skills
- FAQ replies
  - opening hours
  - address
  - services
  - pricing guidance
  - booking instructions
- Human handoff
  - escalate when the flow cannot continue safely
  - preserve context for staff review

Operational skills
- Webhook handling
  - receive WhatsApp inbound events
  - process delivery and status callbacks
- Message sending
  - send confirmations
  - send reminders
  - send reschedule and cancellation messages
- Template management
  - use approved templates outside the service window
- Retry and recovery
  - handle transient messaging failures
  - retry safe outbound messages
- Audit logging
  - record booking decisions
  - record message outcomes
  - record state transitions

Future AI-assisted skills
- Free-text intent classification
- FAQ generation
- Message rewriting for tone
- Extraction of structured booking intent from messy text

AI boundary
- AI may help interpret.
- AI may not decide booking truth.
- Final scheduling decisions belong to backend rules and Postgres data.
