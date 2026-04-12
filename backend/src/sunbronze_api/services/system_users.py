from __future__ import annotations

import hashlib
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from sunbronze_api.models.entities import Barber, Location, Role, SystemUser, UserRole
from sunbronze_api.schemas.system_users import SystemUserCreate, SystemUserSummary, SystemUserUpdate


def list_system_users(db: Session) -> list[SystemUserSummary]:
    users = db.scalars(
        select(SystemUser)
        .options(joinedload(SystemUser.user_roles).joinedload(UserRole.role))
        .order_by(SystemUser.display_name.asc())
    ).unique().all()
    return [_to_summary(user) for user in users]


def get_system_user(db: Session, user_id: UUID) -> SystemUserSummary:
    return _to_summary(_get_user(db, user_id))


def create_system_user(db: Session, payload: SystemUserCreate) -> SystemUserSummary:
    _ensure_unique_email(db, payload.email)
    _ensure_related_records(db, payload.location_id, payload.barber_id)

    user = SystemUser(
        location_id=payload.location_id,
        barber_id=payload.barber_id,
        email=payload.email.strip().lower(),
        password_hash=_hash_password(payload.password) if payload.password else None,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip() if payload.last_name else None,
        display_name=payload.display_name.strip(),
        phone_e164=payload.phone_e164.strip() if payload.phone_e164 else None,
        is_active=payload.is_active,
    )
    db.add(user)
    db.flush()
    _replace_roles(db, user, payload.roles)
    db.commit()
    db.refresh(user)
    return get_system_user(db, user.id)


def update_system_user(db: Session, user_id: UUID, payload: SystemUserUpdate) -> SystemUserSummary:
    user = _get_user(db, user_id)
    values = payload.model_dump(exclude_unset=True)

    next_location_id = values.get("location_id", user.location_id)
    next_barber_id = values.get("barber_id", user.barber_id)
    _ensure_related_records(db, next_location_id, next_barber_id)

    if "email" in values and payload.email is not None:
        _ensure_unique_email(db, payload.email, ignore_user_id=user.id)
        user.email = payload.email.strip().lower()
    if "password" in values:
        user.password_hash = _hash_password(payload.password) if payload.password else None
    if "first_name" in values and payload.first_name is not None:
        user.first_name = payload.first_name.strip()
    if "last_name" in values:
        user.last_name = payload.last_name.strip() if payload.last_name else None
    if "display_name" in values and payload.display_name is not None:
        user.display_name = payload.display_name.strip()
    if "phone_e164" in values:
        user.phone_e164 = payload.phone_e164.strip() if payload.phone_e164 else None
    if "location_id" in values:
        user.location_id = payload.location_id
    if "barber_id" in values:
        user.barber_id = payload.barber_id
    if "is_active" in values and payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.roles is not None:
        _replace_roles(db, user, payload.roles)

    db.commit()
    return get_system_user(db, user.id)


def deactivate_system_user(db: Session, user_id: UUID) -> SystemUserSummary:
    user = _get_user(db, user_id)
    user.is_active = False
    db.commit()
    return get_system_user(db, user.id)


def _get_user(db: Session, user_id: UUID) -> SystemUser:
    user = db.scalar(
        select(SystemUser)
        .options(joinedload(SystemUser.user_roles).joinedload(UserRole.role))
        .where(SystemUser.id == user_id)
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="System user not found.")
    return user


def _ensure_unique_email(db: Session, email: str, ignore_user_id: UUID | None = None) -> None:
    normalized = email.strip().lower()
    query = select(SystemUser).where(SystemUser.email == normalized)
    if ignore_user_id is not None:
        query = query.where(SystemUser.id != ignore_user_id)
    if db.scalar(query) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="System user email already exists.")


def _ensure_related_records(db: Session, location_id: UUID | None, barber_id: UUID | None) -> None:
    if location_id is not None and db.get(Location, location_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found.")
    if barber_id is not None and db.get(Barber, barber_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found.")


def _replace_roles(db: Session, user: SystemUser, role_codes: list[str]) -> None:
    normalized_codes = sorted({role.strip().lower() for role in role_codes if role.strip()})
    roles = db.scalars(select(Role).where(Role.code.in_(normalized_codes))).all() if normalized_codes else []
    found_codes = {role.code for role in roles}
    missing = sorted(set(normalized_codes) - found_codes)
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Roles not found: {', '.join(missing)}")

    db.execute(delete(UserRole).where(UserRole.user_id == user.id))
    for role in roles:
        db.add(UserRole(user_id=user.id, role_id=role.id))
    db.expire(user, ["user_roles"])


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _to_summary(user: SystemUser) -> SystemUserSummary:
    payload = SystemUserSummary.model_validate(user).model_dump()
    payload["roles"] = [user_role.role.code for user_role in user.user_roles if user_role.role]
    return SystemUserSummary(**payload)
