from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from sunbronze_api.models.entities import SystemUser, UserRole
from sunbronze_api.schemas.auth import AuthToken, AuthenticatedUser

_TOKEN_STORE: dict[str, UUID] = {}


def authenticate_user(db: Session, email: str, password: str) -> AuthToken:
    user = db.scalar(
        select(SystemUser)
        .options(joinedload(SystemUser.user_roles).joinedload(UserRole.role))
        .where(SystemUser.email == email, SystemUser.is_active.is_(True))
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login credentials.")

    if not user.password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login is disabled until a password is configured.")

    expected_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    if user.password_hash != expected_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login credentials.")

    token = secrets.token_urlsafe(32)
    _TOKEN_STORE[token] = user.id
    user.last_login_at = datetime.now(UTC)
    db.commit()

    roles = [user_role.role.code for user_role in user.user_roles if user_role.role]
    return AuthToken(
        access_token=token,
        user_id=user.id,
        display_name=user.display_name,
        roles=roles,
    )


def get_authenticated_user(db: Session, token: str) -> AuthenticatedUser:
    user_id = _TOKEN_STORE.get(token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired bearer token.")

    user = db.scalar(
        select(SystemUser)
        .options(joinedload(SystemUser.user_roles).joinedload(UserRole.role))
        .where(SystemUser.id == user_id, SystemUser.is_active.is_(True))
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated user is unavailable.")

    payload = AuthenticatedUser.model_validate(user).model_dump()
    payload["roles"] = [user_role.role.code for user_role in user.user_roles if user_role.role]
    return AuthenticatedUser(**payload)


def user_has_any_role(user: AuthenticatedUser, *allowed_roles: str) -> bool:
    return any(role in user.roles for role in allowed_roles)
