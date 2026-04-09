from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Iterable

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from sunbronze_api.core.config import get_settings
from sunbronze_api.models.entities import Appointment, Conversation, Customer, ReminderJob, WhatsappMessage
from sunbronze_api.models.enums import ConversationIntent, ConversationState, MessageDirection, MessageKind, MessageStatus, ReminderStatus
from sunbronze_api.schemas.whatsapp import (
    ConversationStateSummary,
    MetaWebhookChange,
    ReminderJobSummary,
    WhatsAppMetaWebhookPayload,
    WhatsAppInboundMessage,
    WhatsAppMessageSummary,
    WhatsAppWebhookReceiveAck,
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
    _attempt_meta_outbound_send(db, customer.whatsapp_phone_e164, outbound)
    db.refresh(conversation)
    return ConversationStateSummary.model_validate(conversation)


def list_whatsapp_messages(db: Session) -> list[WhatsAppMessageSummary]:
    return [WhatsAppMessageSummary.model_validate(item) for item in db.scalars(select(WhatsappMessage).order_by(WhatsappMessage.created_at.desc()).limit(100)).all()]


def list_conversation_states(db: Session) -> list[ConversationStateSummary]:
    return [ConversationStateSummary.model_validate(item) for item in db.scalars(select(Conversation).limit(100)).all()]


def list_reminder_jobs(db: Session) -> list[ReminderJobSummary]:
    return [
        ReminderJobSummary.model_validate(item)
        for item in db.scalars(select(ReminderJob).order_by(ReminderJob.scheduled_for.desc()).limit(100)).all()
    ]


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


def verify_meta_webhook_subscription(mode: str | None, verify_token: str | None, challenge: str | None) -> str:
    settings = get_settings()
    if mode != "subscribe" or not challenge:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook verification request.")
    if not settings.whatsapp_meta_verify_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Meta webhook verify token is not configured.")
    if verify_token != settings.whatsapp_meta_verify_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Meta webhook verify token does not match.")
    return challenge


def handle_meta_webhook(db: Session, payload: WhatsAppMetaWebhookPayload) -> WhatsAppWebhookReceiveAck:
    processed_messages = 0
    for message in _iter_meta_inbound_messages(payload):
        handle_inbound_whatsapp_message(db, message)
        processed_messages += 1
    return WhatsAppWebhookReceiveAck(provider="meta_cloud_api", processed_messages=processed_messages)


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


def _iter_meta_inbound_messages(payload: WhatsAppMetaWebhookPayload) -> Iterable[WhatsAppInboundMessage]:
    for entry in payload.entry:
        for change in entry.changes:
            yield from _messages_from_meta_change(change)


def _messages_from_meta_change(change: MetaWebhookChange) -> Iterable[WhatsAppInboundMessage]:
    if change.field != "messages":
        return []

    results: list[WhatsAppInboundMessage] = []
    for message in change.value.messages:
        if message.type != "text" or message.text is None:
            continue
        received_at = None
        if message.timestamp and message.timestamp.isdigit():
            received_at = datetime.fromtimestamp(int(message.timestamp), UTC)
        from_phone = _normalize_whatsapp_phone(message.from_phone)
        results.append(
            WhatsAppInboundMessage(
                chat_id=from_phone,
                from_phone_e164=from_phone,
                provider_message_id=message.id,
                body=message.text.body,
                received_at=received_at,
            )
        )
    return results


def _normalize_whatsapp_phone(value: str) -> str:
    digits = value.strip()
    return digits if digits.startswith("+") else f"+{digits}"


def _attempt_meta_outbound_send(db: Session, to_phone: str, outbound: WhatsappMessage) -> None:
    settings = get_settings()
    if not settings.whatsapp_meta_access_token or not settings.whatsapp_meta_phone_number_id:
        return

    url = (
        f"https://graph.facebook.com/{settings.whatsapp_meta_graph_api_version}/"
        f"{settings.whatsapp_meta_phone_number_id}/messages"
    )
    try:
        response = httpx.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.whatsapp_meta_access_token}",
                "Content-Type": "application/json",
            },
            json={
                "messaging_product": "whatsapp",
                "to": to_phone.lstrip("+"),
                "type": "text",
                "text": {"body": outbound.body or ""},
            },
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
        messages = data.get("messages") or []
        outbound.status = MessageStatus.SENT
        outbound.sent_at = datetime.now(UTC)
        if messages and isinstance(messages[0], dict):
            outbound.provider_message_id = messages[0].get("id") or outbound.provider_message_id
        outbound.error_message = None
    except httpx.HTTPError as exc:
        outbound.status = MessageStatus.FAILED
        response = getattr(exc, "response", None)
        if response is not None:
            details = response.text.strip()
            outbound.error_message = details or str(exc)
        else:
            outbound.error_message = str(exc)

    db.add(outbound)
    db.commit()
