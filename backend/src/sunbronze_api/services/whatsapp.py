from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from sunbronze_api.models.entities import Appointment, Conversation, Customer, ReminderJob, WhatsappMessage
from sunbronze_api.models.enums import ConversationIntent, ConversationState, MessageDirection, MessageKind, MessageStatus, ReminderStatus
from sunbronze_api.schemas.whatsapp import (
    ConversationStateSummary,
    ReminderJobSummary,
    WhatsAppInboundMessage,
    WhatsAppMessageSummary,
)


def handle_inbound_whatsapp_message(db: Session, message: WhatsAppInboundMessage) -> ConversationStateSummary:
    now = datetime.now(UTC)
    customer = db.scalar(
        select(Customer).where(Customer.whatsapp_phone_e164 == message.from_phone_e164)
    )
    if customer is None:
        customer = Customer(
            whatsapp_phone_e164=message.from_phone_e164,
            display_name=message.from_phone_e164,
            notes="Auto-created from inbound WhatsApp webhook.",
        )
        db.add(customer)
        db.flush()

    conversation = db.scalar(
        select(Conversation).where(Conversation.whatsapp_chat_id == message.chat_id)
    )
    if conversation is None:
        conversation = Conversation(
            customer_id=customer.id,
            whatsapp_chat_id=message.chat_id,
        )
        db.add(conversation)
        db.flush()

    conversation.last_inbound_at = message.received_at or now
    _apply_conversation_state(conversation, message.body)

    inbound = WhatsappMessage(
        conversation_id=conversation.id,
        customer_id=customer.id,
        direction=MessageDirection.INBOUND,
        status=MessageStatus.RECEIVED,
        kind=MessageKind.TEXT,
        provider_message_id=message.provider_message_id,
        body=message.body,
        created_at=message.received_at or now,
    )
    db.add(inbound)

    outbound = WhatsappMessage(
        conversation_id=conversation.id,
        customer_id=customer.id,
        direction=MessageDirection.OUTBOUND,
        status=MessageStatus.QUEUED,
        kind=MessageKind.SYSTEM,
        body=_build_auto_reply(conversation),
        created_at=now,
    )
    db.add(outbound)
    conversation.last_outbound_at = outbound.created_at

    db.commit()
    db.refresh(conversation)
    return ConversationStateSummary.model_validate(conversation)


def list_whatsapp_messages(db: Session) -> list[WhatsAppMessageSummary]:
    return [WhatsAppMessageSummary.model_validate(item) for item in db.scalars(select(WhatsappMessage).order_by(WhatsappMessage.created_at.desc()).limit(100)).all()]


def list_conversation_states(db: Session) -> list[ConversationStateSummary]:
    return [ConversationStateSummary.model_validate(item) for item in db.scalars(select(Conversation).limit(100)).all()]


def process_reminder_jobs(db: Session) -> list[ReminderJobSummary]:
    now = datetime.now(UTC)
    jobs = list(
        db.scalars(
            select(ReminderJob).where(ReminderJob.status == ReminderStatus.PENDING, ReminderJob.scheduled_for <= now)
        ).all()
    )

    processed: list[ReminderJobSummary] = []
    for job in jobs:
        job.status = ReminderStatus.SENT
        job.attempts += 1
        job.processed_at = now
        db.add(
            WhatsappMessage(
                appointment_id=job.appointment_id,
                direction=MessageDirection.OUTBOUND,
                status=MessageStatus.SENT,
                kind=MessageKind.SYSTEM,
                body=f"Reminder: appointment {job.reminder_type}",
                created_at=now,
            )
        )
        processed.append(ReminderJobSummary.model_validate(job))

    db.commit()
    return processed


def enqueue_default_reminder_jobs(db: Session, appointment: Appointment) -> None:
    scheduled_for = appointment.scheduled_start_at - timedelta(hours=2)
    existing = db.scalar(
        select(ReminderJob).where(
            ReminderJob.appointment_id == appointment.id,
            ReminderJob.reminder_type == "booking_confirmation",
        )
    )
    if existing is None:
        db.add(
            ReminderJob(
                appointment_id=appointment.id,
                reminder_type="booking_confirmation",
                scheduled_for=scheduled_for,
                status=ReminderStatus.PENDING,
                attempts=0,
                payload={"source": "whatsapp"},
            )
        )


def _apply_conversation_state(conversation: Conversation, message_body: str) -> None:
    lowered = message_body.lower()

    if "human" in lowered or "agent" in lowered or "handoff" in lowered:
        conversation.handed_off_to_human = True
        conversation.active_intent = ConversationIntent.HUMAN_HELP
        conversation.state = ConversationState.WAITING_HUMAN
        return

    if "faq" in lowered or "hours" in lowered or "service" in lowered:
        conversation.active_intent = ConversationIntent.FAQ
        conversation.state = ConversationState.FAQ
        return

    if "cancel" in lowered or "cancellation" in lowered:
        conversation.active_intent = ConversationIntent.CANCEL
        conversation.state = ConversationState.CANCEL_LOOKUP
        return

    if "reschedule" in lowered or "move" in lowered or "change" in lowered:
        conversation.active_intent = ConversationIntent.RESCHEDULE
        conversation.state = ConversationState.RESCHEDULE_LOOKUP
        return

    if "book" in lowered or "booking" in lowered or "corte" in lowered or "hair" in lowered:
        conversation.active_intent = ConversationIntent.BOOK
        conversation.state = ConversationState.CHOOSE_SERVICE
        return

    conversation.active_intent = ConversationIntent.UNKNOWN
    conversation.state = ConversationState.START


def _build_auto_reply(conversation: Conversation) -> str:
    if conversation.handed_off_to_human:
        return "Human handoff requested. A receptionist will follow up."
    if conversation.state == ConversationState.FAQ:
        return "FAQ flow started. Please choose a topic like hours, services, or location."
    if conversation.state == ConversationState.CANCEL_LOOKUP:
        return "Cancellation flow started. Please share your booking reference."
    if conversation.state == ConversationState.RESCHEDULE_LOOKUP:
        return "Rescheduling flow started. Please share your booking reference."
    if conversation.state == ConversationState.CHOOSE_SERVICE:
        return "Booking flow started. Which service would you like to schedule?"
    return "Message received. How can we help you today?"
