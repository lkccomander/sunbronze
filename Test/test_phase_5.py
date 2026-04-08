from __future__ import annotations

from uuid import uuid4

from conftest import find_python_files, read_text, require_step_ready, route_paths, runtime_api_client, runtime_get, runtime_post, source_contains_any


def test_phase_5_whatsapp_webhook_endpoints() -> None:
    require_step_ready("Define webhook endpoints for inbound WhatsApp messages.")

    from sunbronze_api.main import create_app

    app = create_app()
    assert any("whatsapp" in path and "webhook" in path for path in route_paths(app))
    assert "/api/whatsapp/meta/webhook" in route_paths(app)


def test_phase_5_message_persistence() -> None:
    require_step_ready("Persist inbound and outbound messages in `whatsapp_messages`.")

    combined_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api"))
    assert "WhatsappMessage" in combined_text
    assert source_contains_any(combined_text, "direction", "provider_message_id", "body")
    assert source_contains_any(combined_text, "db.add(", "session.add(", "commit()")


def test_phase_5_conversation_state_handling() -> None:
    require_step_ready("Add conversation state handling for booking, rescheduling, cancellation, FAQ, and human handoff.")

    combined_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api"))
    for term in ("booking", "rescheduling", "cancellation", "faq", "handoff"):
        assert term in combined_text.lower()


def test_phase_5_reminder_job_processing() -> None:
    require_step_ready("Add reminder job processing linked to appointments.")

    combined_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api"))
    assert "ReminderJob" in combined_text
    assert source_contains_any(combined_text, "processed_at", "scheduled_for", "attempts")


def test_phase_5_runtime_whatsapp_surfaces_are_exposed() -> None:
    require_step_ready("Verify WhatsApp webhook, message persistence, and reminder flows behave correctly at runtime.")

    with runtime_api_client() as client:
        openapi = runtime_get(client, "/openapi.json")

    assert openapi.status_code == 200
    schema = openapi.json()
    paths = "\n".join(schema.get("paths", {}).keys()).lower()
    components_text = str(schema.get("components", {})).lower()
    assert "whatsapp" in paths
    assert "webhook" in paths
    assert "/api/whatsapp/meta/webhook" in paths
    assert source_contains_any(components_text, "message", "conversation", "reminder")


def test_phase_5_runtime_webhook_persists_messages_and_updates_conversation() -> None:
    require_step_ready("Verify WhatsApp webhook, message persistence, and reminder flows behave correctly at runtime.")

    suffix = uuid4().hex[:12]
    unique_phone = f"+1555{suffix[:7]}"
    unique_chat_id = f"runtime-phase-5-chat-{suffix}"
    provider_message_id = f"runtime-phase-5-message-{suffix}"

    with runtime_api_client() as client:
        response = runtime_post(
            client,
            "/api/whatsapp/webhook",
            json={
                "message": {
                    "chat_id": unique_chat_id,
                    "from_phone_e164": unique_phone,
                    "provider_message_id": provider_message_id,
                    "body": "I want to book a corte",
                }
            },
        )
        assert response.status_code == 200

        conversation = response.json()
        assert conversation["whatsapp_chat_id"] == unique_chat_id
        assert conversation["state"] == "choose_service"
        assert conversation["active_intent"] == "book"

        messages_response = runtime_get(client, "/api/whatsapp/messages")
        assert messages_response.status_code == 200
        messages = messages_response.json()
        assert any(message.get("provider_message_id") == provider_message_id for message in messages)
        assert any(message.get("body") == "Booking flow started. Which service would you like to schedule?" for message in messages)

        conversations_response = runtime_get(client, "/api/whatsapp/conversations")
        assert conversations_response.status_code == 200
        conversations = conversations_response.json()
        assert any(item.get("whatsapp_chat_id") == unique_chat_id and item.get("active_intent") == "book" for item in conversations)
