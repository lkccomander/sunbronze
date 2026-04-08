from __future__ import annotations

from conftest import find_python_files, read_text, require_step_ready, route_paths, runtime_api_client, runtime_get, source_contains_any


def test_phase_4_authentication_for_system_users() -> None:
    require_step_ready("Add authentication for `system_users`.")

    combined_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api"))
    assert source_contains_any(combined_text, "system_users", "SystemUser")
    assert source_contains_any(combined_text, "login", "token", "authenticate", "password")


def test_phase_4_role_aware_authorization() -> None:
    require_step_ready("Add role-aware authorization for owner, admin, receptionist, and barber.")

    combined_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api"))
    for role_name in ("owner", "admin", "receptionist", "barber"):
        assert role_name in combined_text
    assert source_contains_any(combined_text, "authorize", "permission", "role")


def test_phase_4_staff_facing_endpoints() -> None:
    require_step_ready("Add staff-facing endpoints for:")

    from sunbronze_api.main import create_app

    app = create_app()
    paths = route_paths(app)
    assert source_contains_any("\n".join(paths), "conversation", "customer", "appointment")

    combined_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api"))
    assert source_contains_any(combined_text, "assignment", "lookup", "audit")


def test_phase_4_runtime_auth_and_staff_surfaces_are_exposed() -> None:
    require_step_ready("Verify authentication, authorization, and staff endpoints behave correctly at runtime.")

    with runtime_api_client() as client:
        openapi = runtime_get(client, "/openapi.json")

    assert openapi.status_code == 200
    schema = openapi.json()
    paths = "\n".join(schema.get("paths", {}).keys()).lower()
    components_text = str(schema.get("components", {})).lower()
    assert source_contains_any(paths, "auth", "login", "token")
    assert source_contains_any(paths, "conversation", "customer", "appointment")
    assert source_contains_any(components_text, "securityscheme", "bearer", "oauth2", "api_key")


def test_phase_4_runtime_login_and_protected_staff_access() -> None:
    require_step_ready("Verify authentication, authorization, and staff endpoints behave correctly at runtime.")

    with runtime_api_client() as client:
        unauthorized = runtime_get(client, "/api/staff/appointments")
        assert unauthorized.status_code == 401

        login = client.post(
            "/api/auth/login",
            json={"email": "admin@sunbronze.local", "password": "phase4-runtime"},
        )
        assert login.status_code == 200, login.text
        token_payload = login.json()
        assert token_payload["token_type"] == "bearer"
        assert "admin" in token_payload["roles"]

        headers = {"Authorization": f"Bearer {token_payload['access_token']}"}

        appointments = client.get("/api/staff/appointments", headers=headers)
        assert appointments.status_code == 200, appointments.text
        assert isinstance(appointments.json(), list)

        customers = client.get("/api/staff/customers/lookup", params={"search": "Cliente"}, headers=headers)
        assert customers.status_code == 200, customers.text
        assert isinstance(customers.json(), list)

        conversations = client.get("/api/staff/conversations", headers=headers)
        assert conversations.status_code == 200, conversations.text
        assert isinstance(conversations.json(), list)

        audit = client.get("/api/staff/audit", headers=headers)
        assert audit.status_code == 200, audit.text
        assert isinstance(audit.json(), list)
