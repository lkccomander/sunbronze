from enum import Enum


class ConversationState(str, Enum):
    START = "start"
    CHOOSE_SERVICE = "choose_service"
    CHOOSE_BARBER = "choose_barber"
    CHOOSE_DATE = "choose_date"
    CHOOSE_TIME = "choose_time"
    CONFIRM_BOOKING = "confirm_booking"
    RESCHEDULE_LOOKUP = "reschedule_lookup"
    RESCHEDULE_CHOOSE_TIME = "reschedule_choose_time"
    CONFIRM_RESCHEDULE = "confirm_reschedule"
    CANCEL_LOOKUP = "cancel_lookup"
    CONFIRM_CANCELLATION = "confirm_cancellation"
    FAQ = "faq"
    WAITING_HUMAN = "waiting_human"
    DONE = "done"


class ConversationIntent(str, Enum):
    BOOK = "book"
    RESCHEDULE = "reschedule"
    CANCEL = "cancel"
    FAQ = "faq"
    HOURS = "hours"
    SERVICES = "services"
    LOCATION = "location"
    HUMAN_HELP = "human_help"
    UNKNOWN = "unknown"


class AppointmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class AppointmentSource(str, Enum):
    WHATSAPP = "whatsapp"
    ADMIN_CONSOLE = "admin_console"
    WALK_IN = "walk_in"
    MANUAL = "manual"


class MessageDirection(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class MessageStatus(str, Enum):
    RECEIVED = "received"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class MessageKind(str, Enum):
    TEXT = "text"
    TEMPLATE = "template"
    INTERACTIVE = "interactive"
    IMAGE = "image"
    DOCUMENT = "document"
    SYSTEM = "system"


class ReminderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SENT = "sent"
    CANCELLED = "cancelled"
    FAILED = "failed"

