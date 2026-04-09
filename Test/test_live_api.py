from __future__ import annotations

from uuid import uuid4

from conftest import live_api_base_url, live_api_get, live_api_post, live_api_staff_headers, source_contains_any


def test_live_api_health_endpoint_is_reachable() -> None:
    response = live_api_get("/api/health")

    assert response.status_code in {200, 503}
    payload = response.json()
    assert payload["app"] == "SunBronze API"
    assert payload["database"] in {"ok", "unavailable"}
    assert payload["status"] in {"ok", "degraded"}


def test_live_api_openapi_exposes_core_surfaces() -> None:
    response = live_api_get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    paths = "\n".join(schema.get("paths", {}).keys()).lower()
    components_text = str(schema.get("components", {})).lower()

    assert "/api/health" in paths
    assert "/api/appointments" in paths
    assert source_contains_any(paths, "/api/services", "/api/barbers", "/api/resources", "/api/customers", "/api/locations")
    assert source_contains_any(paths, "/api/auth/login", "/api/staff", "/api/whatsapp/webhook")
    assert source_contains_any(components_text, "bearer", "securityscheme", "conversation", "message", "appointment")


def test_live_api_reports_target_base_url() -> None:
    assert live_api_base_url().startswith("http")


def test_live_api_whatsapp_webhook_flow_persists_messages() -> None:
    suffix = uuid4().hex[:12]
    chat_id = f"live-phase-5-chat-{suffix}"
    phone = f"+1555{suffix[:7]}"
    provider_message_id = f"live-phase-5-message-{suffix}"

    protected_messages = live_api_get("/api/whatsapp/messages")
    assert protected_messages.status_code == 401
    protected_conversations = live_api_get("/api/whatsapp/conversations")
    assert protected_conversations.status_code == 401

    response = live_api_post(
        "/api/whatsapp/webhook",
        json={
            "message": {
                "chat_id": chat_id,
                "from_phone_e164": phone,
                "provider_message_id": provider_message_id,
                "body": "I want to book a corte",
            }
        },
    )

    assert response.status_code == 200
    conversation = response.json()
    assert conversation["whatsapp_chat_id"] == chat_id
    assert conversation["state"] == "choose_service"
    assert conversation["active_intent"] == "book"

    headers = live_api_staff_headers()

    messages_response = live_api_get("/api/whatsapp/messages", headers=headers)
    assert messages_response.status_code == 200
    messages = messages_response.json()
    assert any(message.get("provider_message_id") == provider_message_id for message in messages)
    assert any(message.get("body") == "Booking flow started. Which service would you like to schedule?" for message in messages)

    conversations_response = live_api_get("/api/whatsapp/conversations", headers=headers)
    assert conversations_response.status_code == 200
    conversations = conversations_response.json()
    assert any(item.get("whatsapp_chat_id") == chat_id and item.get("active_intent") == "book" for item in conversations)
