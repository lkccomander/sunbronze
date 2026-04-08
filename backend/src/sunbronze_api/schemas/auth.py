from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    display_name: str
    roles: list[str]


class AuthenticatedUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    display_name: str
    first_name: str
    last_name: str | None = None
    location_id: UUID | None = None
    barber_id: UUID | None = None
    last_login_at: datetime | None = None
    roles: list[str] = []
