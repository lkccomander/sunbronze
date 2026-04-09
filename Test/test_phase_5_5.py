from __future__ import annotations

from conftest import ROOT, find_python_files, read_text, require_step_ready, route_paths, runtime_api_client, runtime_get, source_contains_any


def test_phase_5_5_meta_webhook_verification_route_exists() -> None:
    require_step_ready("Add Meta-compatible webhook verification for a public deployment.")

    from sunbronze_api.main import create_app

    app = create_app()
    assert "/api/whatsapp/meta/webhook" in route_paths(app)

    combined_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api"))
    assert source_contains_any(combined_text, "hub.mode", "hub.verify_token", "hub.challenge")


def test_phase_5_5_meta_inbound_payload_parsing_exists() -> None:
    require_step_ready("Add Meta-style inbound payload parsing for real phone messages.")

    combined_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api"))
    assert source_contains_any(combined_text, "WhatsAppMetaWebhookPayload", "MetaWebhookEntry", "MetaWebhookChange")
    assert source_contains_any(combined_text, '"messages"', "change.field != \"messages\"", "message.text.body")


def test_phase_5_5_meta_provider_configuration_exists() -> None:
    require_step_ready("Add provider configuration for verify token, access token, phone number id, and Graph API version.")

    combined_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api"))
    env_example = read_text(ROOT / "backend" / ".env.example")

    assert source_contains_any(combined_text, "whatsapp_meta_verify_token", "whatsapp_meta_access_token")
    assert source_contains_any(combined_text, "whatsapp_meta_phone_number_id", "whatsapp_meta_graph_api_version")
    assert "SUNBRONZE_WHATSAPP_META_VERIFY_TOKEN=" in env_example
    assert "SUNBRONZE_WHATSAPP_META_ACCESS_TOKEN=" in env_example
    assert "SUNBRONZE_WHATSAPP_META_PHONE_NUMBER_ID=" in env_example


def test_phase_5_5_meta_outbound_send_matches_facebook_shape() -> None:
    require_step_ready("Add optional outbound message delivery through the Meta API.")

    combined_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api"))
    notes = read_text(ROOT / "project-brain" / "facebook.md")

    assert "graph.facebook.com" in combined_text
    assert source_contains_any(combined_text, "/messages", "\"messaging_product\": \"whatsapp\"", "\"Authorization\": f\"Bearer")
    assert "graph.facebook.com" in notes
    assert "\"messaging_product\": \"whatsapp\"" in notes


def test_phase_5_5_runtime_meta_webhook_surface_is_exposed() -> None:
    require_step_ready("Prepare Railway environment variables and public webhook deployment steps.")

    with runtime_api_client() as client:
        openapi = runtime_get(client, "/openapi.json")

    assert openapi.status_code == 200
    schema = openapi.json()
    paths = "\n".join(schema.get("paths", {}).keys()).lower()
    assert "/api/whatsapp/meta/webhook" in paths
