from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from sunbronze_api.api.deps import require_staff_user
from sunbronze_api.db.session import get_db_session
from sunbronze_api.schemas.appointments import AppointmentSummary
from sunbronze_api.schemas.auth import AuthenticatedUser
from sunbronze_api.schemas.staff import (
    AuditLogEntry,
    StaffConversationAssignmentRequest,
    StaffConversationSummary,
    StaffCustomerSummary,
)
from sunbronze_api.services.staff import assign_conversation, list_audit_entries, list_conversations, list_staff_appointments, lookup_customers

router = APIRouter(prefix="/staff")


@router.get("/appointments", response_model=list[AppointmentSummary])
def list_staff_appointments_route(
    _: AuthenticatedUser = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> list[AppointmentSummary]:
    return [AppointmentSummary.model_validate(item) for item in list_staff_appointments(db)]


@router.get("/customers/lookup", response_model=list[StaffCustomerSummary])
def lookup_customers_route(
    search: str | None = Query(default=None, min_length=1),
    _: AuthenticatedUser = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> list[StaffCustomerSummary]:
    return lookup_customers(db, search)


@router.get("/conversations", response_model=list[StaffConversationSummary])
def list_staff_conversations_route(
    _: AuthenticatedUser = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> list[StaffConversationSummary]:
    return list_conversations(db)


@router.post("/conversations/{conversation_id}/assignment", response_model=StaffConversationSummary)
def assign_conversation_route(
    conversation_id: UUID,
    payload: StaffConversationAssignmentRequest,
    _: AuthenticatedUser = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> StaffConversationSummary:
    return assign_conversation(db, conversation_id, payload.assigned_staff_user_id)


@router.get("/audit", response_model=list[AuditLogEntry])
def list_audit_route(
    _: AuthenticatedUser = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> list[AuditLogEntry]:
    return list_audit_entries(db)
