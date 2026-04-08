from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from sunbronze_api.db.session import get_db_session
from sunbronze_api.schemas.whatsapp import (
    ConversationStateSummary,
    ReminderJobSummary,
    WhatsAppMessageSummary,
    WhatsAppMetaWebhookPayload,
    WhatsAppMockWebhookPayload,
    WhatsAppWebhookReceiveAck,
    WhatsAppWebhookVerification,
)
from sunbronze_api.services.whatsapp import (
    handle_inbound_whatsapp_message,
    handle_meta_webhook,
    list_conversation_states,
    list_whatsapp_messages,
    process_reminder_jobs,
    verify_meta_webhook_subscription,
)

router = APIRouter(prefix="/whatsapp")


@router.get("/webhook", response_model=WhatsAppWebhookVerification)
def verify_whatsapp_webhook_route(
    challenge: str = Query(default="verified"),
) -> WhatsAppWebhookVerification:
    return WhatsAppWebhookVerification(challenge=challenge)


@router.post("/webhook", response_model=ConversationStateSummary)
def receive_whatsapp_webhook_route(
    payload: WhatsAppMockWebhookPayload,
    db: Session = Depends(get_db_session),
) -> ConversationStateSummary:
    return handle_inbound_whatsapp_message(db, payload.message)


@router.get("/meta/webhook", response_class=PlainTextResponse)
def verify_meta_whatsapp_webhook_route(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
) -> str:
    return verify_meta_webhook_subscription(hub_mode, hub_verify_token, hub_challenge)


@router.post("/meta/webhook", response_model=WhatsAppWebhookReceiveAck)
def receive_meta_whatsapp_webhook_route(
    payload: WhatsAppMetaWebhookPayload,
    db: Session = Depends(get_db_session),
) -> WhatsAppWebhookReceiveAck:
    return handle_meta_webhook(db, payload)


@router.get("/messages", response_model=list[WhatsAppMessageSummary])
def list_whatsapp_messages_route(db: Session = Depends(get_db_session)) -> list[WhatsAppMessageSummary]:
    return list_whatsapp_messages(db)


@router.get("/conversations", response_model=list[ConversationStateSummary])
def list_whatsapp_conversations_route(db: Session = Depends(get_db_session)) -> list[ConversationStateSummary]:
    return list_conversation_states(db)


@router.post("/reminders/process", response_model=list[ReminderJobSummary])
def process_reminders_route(db: Session = Depends(get_db_session)) -> list[ReminderJobSummary]:
    return process_reminder_jobs(db)
