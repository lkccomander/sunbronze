from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from sunbronze_api.models.entities import Appointment, AuditLog, Conversation, Customer, SystemUser
from sunbronze_api.schemas.staff import AuditLogEntry, StaffConversationSummary, StaffCustomerSummary


def list_staff_appointments(db: Session) -> list[Appointment]:
    return list(
        db.scalars(
            select(Appointment).order_by(Appointment.scheduled_start_at.asc()).limit(100)
        ).all()
    )


def lookup_customers(db: Session, search: str | None) -> list[StaffCustomerSummary]:
    query: Select[tuple[Customer]] = select(Customer).order_by(Customer.display_name.asc(), Customer.first_name.asc())
    if search:
        like = f"%{search.strip()}%"
        query = query.where(
            or_(
                Customer.display_name.ilike(like),
                Customer.first_name.ilike(like),
                Customer.last_name.ilike(like),
                Customer.whatsapp_phone_e164.ilike(like),
            )
        )
    return [StaffCustomerSummary.model_validate(customer) for customer in db.scalars(query.limit(100)).all()]


def list_conversations(db: Session) -> list[StaffConversationSummary]:
    return [StaffConversationSummary.model_validate(item) for item in db.scalars(select(Conversation).limit(100)).all()]


def assign_conversation(db: Session, conversation_id: UUID, assigned_staff_user_id: UUID) -> StaffConversationSummary:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    staff_user = db.get(SystemUser, assigned_staff_user_id)
    if staff_user is None or not staff_user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned staff user not found.")

    conversation.assigned_staff_user_id = assigned_staff_user_id
    db.add(
        AuditLog(
            entity_type="conversation",
            entity_id=conversation.id,
            action="assignment",
            actor_type="system",
            actor_user_id=assigned_staff_user_id,
            metadata_json={"assigned_staff_user_id": str(assigned_staff_user_id)},
        )
    )
    db.commit()
    db.refresh(conversation)
    return StaffConversationSummary.model_validate(conversation)


def list_audit_entries(db: Session) -> list[AuditLogEntry]:
    return [AuditLogEntry.model_validate(item) for item in db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100)).all()]
