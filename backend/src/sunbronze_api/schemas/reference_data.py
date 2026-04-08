from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ReferenceListParams(BaseModel):
    is_active: bool | None = None
    search: str | None = None
    limit: int = 50
    offset: int = 0


class LocationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    phone_e164: str | None
    email: str | None
    city: str | None
    state: str | None
    country_code: str | None
    time_zone: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ServiceSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    description: str | None
    requires_barber: bool
    requires_resource: bool
    duration_minutes: int
    buffer_before_minutes: int
    buffer_after_minutes: int
    price_cents: int | None
    currency_code: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class BarberSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    location_id: UUID | None
    code: str
    first_name: str
    last_name: str | None
    display_name: str
    email: str | None
    phone_e164: str | None
    time_zone: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ResourceSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    location_id: UUID
    code: str
    name: str
    resource_type: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CustomerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    whatsapp_phone_e164: str
    first_name: str | None
    last_name: str | None
    display_name: str | None
    preferred_barber_id: UUID | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
