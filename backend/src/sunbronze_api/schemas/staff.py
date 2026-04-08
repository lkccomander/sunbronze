from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StaffConversationAssignmentRequest(BaseModel):
    assigned_staff_user_id: UUID


class StaffConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    customer_id: UUID
    whatsapp_chat_id: str
    state: str
    active_intent: str
    handed_off_to_human: bool
    assigned_staff_user_id: UUID | None = None
    last_inbound_at: datetime | None = None
    last_outbound_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class StaffCustomerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    whatsapp_phone_e164: str
    display_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    preferred_barber_id: UUID | None = None
    notes: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AuditLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_type: str
    entity_id: UUID | None = None
    action: str
    actor_type: str
    actor_id: str | None = None
    actor_user_id: UUID | None = None
    created_at: datetime
