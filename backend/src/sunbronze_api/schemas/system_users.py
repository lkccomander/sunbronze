from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SystemUserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    location_id: UUID | None
    barber_id: UUID | None
    email: str
    first_name: str
    last_name: str | None
    display_name: str
    phone_e164: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    roles: list[str] = []


class SystemUserCreate(BaseModel):
    location_id: UUID | None = None
    barber_id: UUID | None = None
    email: str = Field(min_length=3, max_length=320)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=200)
    last_name: str | None = Field(default=None, max_length=200)
    display_name: str = Field(min_length=1, max_length=240)
    phone_e164: str | None = Field(default=None, max_length=32)
    is_active: bool = True
    roles: list[str] = Field(default_factory=list)


class SystemUserUpdate(BaseModel):
    location_id: UUID | None = None
    barber_id: UUID | None = None
    email: str | None = Field(default=None, min_length=3, max_length=320)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    first_name: str | None = Field(default=None, min_length=1, max_length=200)
    last_name: str | None = Field(default=None, max_length=200)
    display_name: str | None = Field(default=None, min_length=1, max_length=240)
    phone_e164: str | None = Field(default=None, max_length=32)
    is_active: bool | None = None
    roles: list[str] | None = None
