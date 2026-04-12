from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from sunbronze_api.api.deps import require_staff_user
from sunbronze_api.db.session import get_db_session
from sunbronze_api.schemas.auth import AuthenticatedUser
from sunbronze_api.schemas.system_users import SystemUserCreate, SystemUserSummary, SystemUserUpdate
from sunbronze_api.services.system_users import create_system_user, deactivate_system_user, get_system_user, list_system_users, update_system_user

router = APIRouter(prefix="/system-users")


@router.get("", response_model=list[SystemUserSummary])
def list_system_users_route(
    _: AuthenticatedUser = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> list[SystemUserSummary]:
    return list_system_users(db)


@router.post("", response_model=SystemUserSummary, status_code=201)
def create_system_user_route(
    payload: SystemUserCreate,
    _: AuthenticatedUser = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> SystemUserSummary:
    return create_system_user(db, payload)


@router.get("/{user_id}", response_model=SystemUserSummary)
def get_system_user_route(
    user_id: UUID,
    _: AuthenticatedUser = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> SystemUserSummary:
    return get_system_user(db, user_id)


@router.patch("/{user_id}", response_model=SystemUserSummary)
def update_system_user_route(
    user_id: UUID,
    payload: SystemUserUpdate,
    _: AuthenticatedUser = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> SystemUserSummary:
    return update_system_user(db, user_id, payload)


@router.delete("/{user_id}", response_model=SystemUserSummary)
def deactivate_system_user_route(
    user_id: UUID,
    _: AuthenticatedUser = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> SystemUserSummary:
    return deactivate_system_user(db, user_id)
