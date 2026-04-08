from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WhatsAppWebhookVerification(BaseModel):
    challenge: str


class WhatsAppInboundMessage(BaseModel):
    chat_id: str
    from_phone_e164: str
    provider_message_id: str | None = None
    body: str
    received_at: datetime | None = None


class WhatsAppMockWebhookPayload(BaseModel):
    message: WhatsAppInboundMessage


class WhatsAppWebhookReceiveAck(BaseModel):
    provider: str
    processed_messages: int


class MetaWebhookTextBody(BaseModel):
    body: str


class MetaWebhookContactProfile(BaseModel):
    name: str | None = None


class MetaWebhookContact(BaseModel):
    wa_id: str | None = None
    profile: MetaWebhookContactProfile | None = None


class MetaWebhookMetadata(BaseModel):
    display_phone_number: str | None = None
    phone_number_id: str | None = None


class MetaWebhookMessage(BaseModel):
    from_phone: str = Field(alias="from")
    id: str | None = None
    timestamp: str | None = None
    type: str | None = None
    text: MetaWebhookTextBody | None = None


class MetaWebhookValue(BaseModel):
    messaging_product: str | None = None
    metadata: MetaWebhookMetadata | None = None
    contacts: list[MetaWebhookContact] = []
    messages: list[MetaWebhookMessage] = []
    statuses: list[dict] = []


class MetaWebhookChange(BaseModel):
    field: str | None = None
    value: MetaWebhookValue


class MetaWebhookEntry(BaseModel):
    id: str | None = None
    changes: list[MetaWebhookChange] = []


class WhatsAppMetaWebhookPayload(BaseModel):
    object: str | None = None
    entry: list[MetaWebhookEntry] = []


class WhatsAppMessageSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID | None = None
    customer_id: UUID | None = None
    appointment_id: UUID | None = None
    direction: str
    status: str
    kind: str
    provider_name: str
    provider_message_id: str | None = None
    body: str | None = None
    created_at: datetime


class ConversationStateSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    customer_id: UUID
    whatsapp_chat_id: str
    state: str
    active_intent: str
    handed_off_to_human: bool
    last_inbound_at: datetime | None = None
    last_outbound_at: datetime | None = None


class ReminderJobSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    appointment_id: UUID
    reminder_type: str
    status: str
    scheduled_for: datetime
    attempts: int
    processed_at: datetime | None = None
