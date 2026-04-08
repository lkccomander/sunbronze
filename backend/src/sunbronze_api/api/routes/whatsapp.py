from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from sunbronze_api.db.session import get_db_session
from sunbronze_api.schemas.whatsapp import (
    ConversationStateSummary,
    ReminderJobSummary,
    WhatsAppMessageSummary,
    WhatsAppWebhookPayload,
    WhatsAppWebhookVerification,
)
from sunbronze_api.services.whatsapp import (
    handle_inbound_whatsapp_message,
    list_conversation_states,
    list_whatsapp_messages,
    process_reminder_jobs,
)

router = APIRouter(prefix="/whatsapp")


@router.get("/webhook", response_model=WhatsAppWebhookVerification)
def verify_whatsapp_webhook_route(
    challenge: str = Query(default="verified"),
) -> WhatsAppWebhookVerification:
    return WhatsAppWebhookVerification(challenge=challenge)


@router.post("/webhook", response_model=ConversationStateSummary)
def receive_whatsapp_webhook_route(
    payload: WhatsAppWebhookPayload,
    db: Session = Depends(get_db_session),
) -> ConversationStateSummary:
    return handle_inbound_whatsapp_message(db, payload.message)


@router.get("/messages", response_model=list[WhatsAppMessageSummary])
def list_whatsapp_messages_route(db: Session = Depends(get_db_session)) -> list[WhatsAppMessageSummary]:
    return list_whatsapp_messages(db)


@router.get("/conversations", response_model=list[ConversationStateSummary])
def list_whatsapp_conversations_route(db: Session = Depends(get_db_session)) -> list[ConversationStateSummary]:
    return list_conversation_states(db)


@router.post("/reminders/process", response_model=list[ReminderJobSummary])
def process_reminders_route(db: Session = Depends(get_db_session)) -> list[ReminderJobSummary]:
    return process_reminder_jobs(db)
