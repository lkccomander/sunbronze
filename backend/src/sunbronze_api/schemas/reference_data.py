from datetime import datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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


class BarberCreate(BaseModel):
    location_id: UUID | None = None
    code: str = Field(min_length=1, max_length=80)
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    display_name: str | None = Field(default=None, max_length=160)
    email: str | None = Field(default=None, max_length=320)
    phone_e164: str | None = Field(default=None, max_length=32)
    time_zone: str = Field(default="America/Costa_Rica", min_length=1, max_length=80)
    is_active: bool = True


class BarberUpdate(BaseModel):
    location_id: UUID | None = None
    code: str | None = Field(default=None, min_length=1, max_length=80)
    first_name: str | None = Field(default=None, min_length=1, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    display_name: str | None = Field(default=None, min_length=1, max_length=160)
    email: str | None = Field(default=None, max_length=320)
    phone_e164: str | None = Field(default=None, max_length=32)
    time_zone: str | None = Field(default=None, min_length=1, max_length=80)
    is_active: bool | None = None


class BarberWorkingHoursSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    barber_id: UUID
    weekday: int
    start_time: time
    end_time: time
    is_active: bool
    created_at: datetime
    updated_at: datetime


class BarberWorkingHoursCreate(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    is_active: bool = True


class BarberWorkingHoursUpdate(BaseModel):
    weekday: int | None = Field(default=None, ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    is_active: bool | None = None


class BarberTimeOffSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    barber_id: UUID
    starts_at: datetime
    ends_at: datetime
    reason: str | None
    is_all_day: bool
    created_at: datetime
    updated_at: datetime


class BarberTimeOffCreate(BaseModel):
    starts_at: datetime
    ends_at: datetime
    reason: str | None = Field(default=None, max_length=500)
    is_all_day: bool = False


class BarberTimeOffUpdate(BaseModel):
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    reason: str | None = Field(default=None, max_length=500)
    is_all_day: bool | None = None


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
