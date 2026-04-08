from __future__ import annotations

from conftest import (
    ROOT,
    module_available,
    project_text,
    read_text,
    require_step_ready,
    runtime_api_client,
    runtime_get,
    route_methods,
    route_paths,
    source_contains_all,
)


def test_phase_1_install_backend_dependencies() -> None:
    require_step_ready("Install backend dependencies in the project environment.")

    missing = [
        module_name
        for module_name in ("fastapi", "sqlalchemy", "psycopg", "pydantic_settings", "uvicorn")
        if not module_available(module_name)
    ]
    assert not missing, f"Missing backend dependencies: {', '.join(missing)}"


def test_phase_1_app_boots_successfully() -> None:
    require_step_ready("Run the FastAPI app locally and confirm the app boots successfully.")

    from sunbronze_api.main import create_app

    app = create_app()
    assert app.title == "SunBronze API"
    assert "/api/health" in route_paths(app)
    assert "/api/appointments" in route_paths(app)
    assert "GET" in route_methods(app, "/api/health")


def test_phase_1_database_connectivity_verification() -> None:
    health_source = read_text(ROOT / "backend" / "src" / "sunbronze_api" / "api" / "routes" / "health.py")

    assert source_contains_all(
        health_source,
        'connection.execute(text("SELECT 1"))',
        "HTTP_503_SERVICE_UNAVAILABLE",
        '"database": "unavailable"',
        '"database": "ok"',
    )


def test_phase_1_migration_strategy_is_documented() -> None:
    combined_text = project_text("backend/README.md", "project-brain/decisions.md")

    assert "SQL-first" in combined_text
    assert "DB/" in combined_text
    assert "Alembic" in combined_text


def test_phase_1_runtime_healthcheck_reports_database_status() -> None:
    require_step_ready("Verify `/api/health` returns runtime database status from the live API.")

    with runtime_api_client() as client:
        response = runtime_get(client, "/api/health")

    assert response.status_code in {200, 503}
    payload = response.json()
    assert payload["app"] == "SunBronze API"
    assert payload["database"] in {"ok", "unavailable"}
    assert payload["status"] in {"ok", "degraded"}
