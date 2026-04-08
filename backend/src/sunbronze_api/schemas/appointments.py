from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from sunbronze_api.models.enums import AppointmentSource, AppointmentStatus


class AppointmentCreate(BaseModel):
    customer_id: UUID
    service_id: UUID
    barber_id: UUID | None = None
    resource_id: UUID | None = None
    conversation_id: UUID | None = None
    source: AppointmentSource = AppointmentSource.WHATSAPP
    status: AppointmentStatus = AppointmentStatus.PENDING
    scheduled_start_at: datetime
    scheduled_end_at: datetime | None = None
    notes: str | None = None
    internal_notes: str | None = None


class AppointmentUpdate(BaseModel):
    barber_id: UUID | None = None
    resource_id: UUID | None = None
    scheduled_start_at: datetime | None = None
    scheduled_end_at: datetime | None = None
    status: AppointmentStatus | None = None
    notes: str | None = None
    internal_notes: str | None = None
    cancelled_reason: str | None = None


class AppointmentListQuery(BaseModel):
    customer_id: UUID | None = None
    barber_id: UUID | None = None
    status: AppointmentStatus | None = None
    start_from: datetime | None = Field(default=None, alias="from")
    start_to: datetime | None = None

    model_config = ConfigDict(populate_by_name=True)


class AppointmentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    customer_id: UUID
    barber_id: UUID | None
    resource_id: UUID | None
    service_id: UUID
    conversation_id: UUID | None
    source: AppointmentSource
    status: AppointmentStatus
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    reserved_start_at: datetime
    reserved_end_at: datetime
    notes: str | None
    internal_notes: str | None
    cancelled_reason: str | None
    created_at: datetime
    updated_at: datetime


class AppointmentDetail(AppointmentSummary):
    customer_name: str | None = None
    barber_name: str | None = None
    service_name: str | None = None
    resource_name: str | None = None


class AppointmentAvailabilityQuery(BaseModel):
    service_id: UUID
    starts_at: datetime
    ends_at: datetime
    barber_id: UUID | None = None
    resource_id: UUID | None = None
    limit: int = 20


class AvailabilitySlot(BaseModel):
    start_at: datetime
    end_at: datetime
    barber_id: UUID | None = None
    resource_id: UUID | None = None
