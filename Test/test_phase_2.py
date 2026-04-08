from __future__ import annotations

from conftest import ROOT, find_python_files, read_text, require_step_ready, route_methods, route_paths, runtime_api_client, runtime_get, source_contains_any


def test_phase_2_reference_data_read_endpoints() -> None:
    require_step_ready("Add read endpoints for:")

    from sunbronze_api.main import create_app

    app = create_app()
    paths = route_paths(app)
    for path in (
        "/api/services",
        "/api/barbers",
        "/api/resources",
        "/api/customers",
        "/api/locations",
    ):
        assert path in paths, f"Missing reference-data endpoint: {path}"
        assert "GET" in route_methods(app, path), f"Reference-data endpoint must support GET: {path}"


def test_phase_2_reference_data_routes_use_response_models() -> None:
    require_step_ready("Add response schemas for each resource.")

    route_source = read_text(ROOT / "backend" / "src" / "sunbronze_api" / "api" / "routes" / "reference_data.py")
    for response_model in (
        "response_model=list[ServiceSummary]",
        "response_model=list[BarberSummary]",
        "response_model=list[ResourceSummary]",
        "response_model=list[CustomerSummary]",
        "response_model=list[LocationSummary]",
    ):
        assert response_model in route_source, f"Missing response model declaration: {response_model}"


def test_phase_2_response_schemas_exist() -> None:
    require_step_ready("Add response schemas for each resource.")

    schemas_dir = ROOT / "backend" / "src" / "sunbronze_api" / "schemas"
    assert schemas_dir.exists(), "Schemas directory is missing."

    combined_schema_text = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api/schemas"))
    for schema_name in (
        "Service",
        "Barber",
        "Resource",
        "Customer",
        "Location",
    ):
        assert schema_name in combined_schema_text, f"Missing schema definition for {schema_name}."


def test_phase_2_response_schemas_support_orm_serialization() -> None:
    require_step_ready("Add response schemas for each resource.")

    schema_source = read_text(ROOT / "backend" / "src" / "sunbronze_api" / "schemas" / "reference_data.py")
    assert schema_source.count("ConfigDict(from_attributes=True)") >= 5


def test_phase_2_filtering_and_pagination_support() -> None:
    require_step_ready("Add filtering and pagination where useful.")

    route_sources = "\n".join(read_text(path) for path in find_python_files("backend/src/sunbronze_api/api/routes"))
    assert source_contains_any(route_sources, "limit", "offset", "page", "page_size")
    assert source_contains_any(route_sources, "Query(", "filter", "search")


def test_phase_2_reference_data_routes_expose_query_filters() -> None:
    require_step_ready("Add filtering and pagination where useful.")

    route_source = read_text(ROOT / "backend" / "src" / "sunbronze_api" / "api" / "routes" / "reference_data.py")
    for expected_snippet in (
        "search: str | None = Query(",
        "limit: int = Query(default=50, ge=1, le=200)",
        "offset: int = Query(default=0, ge=0)",
        "location_id: str | None = None",
        "preferred_barber_id: str | None = None",
        "ReferenceListParams(is_active=is_active, search=search, limit=limit, offset=offset)",
    ):
        assert expected_snippet in route_source, f"Missing filtering or pagination support: {expected_snippet}"


def test_phase_2_runtime_reference_endpoints_return_json_lists() -> None:
    require_step_ready("Verify reference-data endpoints return runtime JSON payloads from the live API.")

    with runtime_api_client() as client:
        for path in (
            "/api/services?limit=1",
            "/api/barbers?limit=1",
            "/api/resources?limit=1",
            "/api/customers?limit=1",
            "/api/locations?limit=1",
        ):
            response = runtime_get(client, path)
            assert response.status_code == 200, f"Unexpected status for {path}: {response.status_code}"
            assert isinstance(response.json(), list), f"Expected list response for {path}"
