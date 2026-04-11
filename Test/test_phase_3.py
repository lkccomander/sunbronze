from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4

from conftest import project_text, require_step_ready, route_methods, route_paths, runtime_api_client, runtime_get, source_contains_any


def test_phase_3_update_and_cancellation_endpoints() -> None:
    require_step_ready("Add appointment update and cancellation endpoints.")

    from sunbronze_api.main import create_app

    app = create_app()
    methods = route_methods(app, "/api/appointments/{appointment_id}")
    assert "PATCH" in methods or "PUT" in methods
    assert source_contains_any(project_text("backend/src/sunbronze_api/api/routes/appointments.py"), "cancel", "cancelled")


def test_phase_3_rescheduling_support() -> None:
    require_step_ready("Add rescheduling support.")

    appointments_text = project_text(
        "backend/src/sunbronze_api/api/routes/appointments.py",
        "backend/src/sunbronze_api/services/appointments.py",
    )
    assert source_contains_any(appointments_text, "reschedule", "rescheduled")


def test_phase_3_conflict_checks_before_insert_and_update() -> None:
    require_step_ready("Add conflict checks before insert and update for barber and resource reservations.")

    appointments_text = project_text("backend/src/sunbronze_api/services/appointments.py")
    assert source_contains_any(appointments_text, "conflict", "overlap", "reserved_start_at", "reserved_end_at")
    assert source_contains_any(appointments_text, "barber_id", "resource_id")


def test_phase_3_availability_search_endpoints() -> None:
    require_step_ready("Add availability search endpoints based on:")

    from sunbronze_api.main import create_app

    app = create_app()
    assert any("availability" in path for path in route_paths(app))

    combined_text = project_text(
        "backend/src/sunbronze_api/api/routes/appointments.py",
        "backend/src/sunbronze_api/services/appointments.py",
        "backend/src/sunbronze_api/models/entities.py",
    )
    assert source_contains_any(combined_text, "working_hours", "time_off", "duration_minutes", "buffer_before_minutes")


def test_phase_3_runtime_booking_routes_are_exposed() -> None:
    require_step_ready("Verify booking update, cancellation, and availability endpoints behave correctly at runtime.")

    with runtime_api_client() as client:
        openapi = runtime_get(client, "/openapi.json")

    assert openapi.status_code == 200
    schema = openapi.json()
    paths = schema.get("paths", {})
    assert "/api/appointments/{appointment_id}" in paths
    methods = paths["/api/appointments/{appointment_id}"]
    assert "patch" in methods or "put" in methods
    assert any("availability" in path for path in paths)


def test_phase_3_runtime_barbertest_booking_rules_and_cancellation() -> None:
    require_step_ready("Verify booking update, cancellation, and availability endpoints behave correctly at runtime.")

    from sunbronze_api.db.session import SessionLocal
    from sunbronze_api.models.entities import Barber, Customer, Service

    with SessionLocal() as db:
        barber = db.query(Barber).filter(Barber.code == "barbertest").one()
        service = db.query(Service).filter(Service.code == "corte").one()

        phone = f"+5068{str(uuid4().int)[:7]}"
        customer = Customer(
            whatsapp_phone_e164=phone,
            first_name="Runtime",
            last_name="Booking",
            display_name="Runtime Booking Test",
            preferred_barber_id=barber.id,
            notes="Created by phase 3 runtime test.",
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        customer_id = customer.id
        barber_id = barber.id
        service_id = service.id

    monday = datetime.now().astimezone().replace(hour=9, minute=0, second=0, microsecond=0)
    monday = monday - timedelta(days=monday.weekday()) + timedelta(days=7)

    def payload_for(start_at: datetime) -> dict:
        return {
            "customer_id": str(customer_id),
            "service_id": str(service_id),
            "barber_id": str(barber_id),
            "scheduled_start_at": start_at.isoformat(),
        }

    with runtime_api_client() as client:
        availability_response = client.get(
            "/api/appointments/availability",
            params={
                "service_id": str(service_id),
                "barber_id": str(barber_id),
                "starts_at": monday.isoformat(),
                "ends_at": (monday + timedelta(days=14)).isoformat(),
                "limit": 1,
            },
        )
        assert availability_response.status_code == 200, availability_response.text
        available_slots = availability_response.json()
        assert available_slots, "Expected at least one available barbertest slot for the corte service."

        within_schedule = datetime.fromisoformat(available_slots[0]["start_at"])
        schedule_day = within_schedule.replace(hour=9, minute=0, second=0, microsecond=0)
        outside_schedule = schedule_day.replace(hour=7, minute=0)
        lunch_time = schedule_day.replace(hour=12, minute=0)

        create_ok = client.post("/api/appointments", json=payload_for(within_schedule))
        assert create_ok.status_code == 201, create_ok.text
        created_payload = create_ok.json()

        create_outside = client.post("/api/appointments", json=payload_for(outside_schedule))
        assert create_outside.status_code == 400, create_outside.text
        assert "working hours" in create_outside.text.lower()

        create_lunch = client.post("/api/appointments", json=payload_for(lunch_time))
        assert create_lunch.status_code == 400, create_lunch.text
        assert "working hours" in create_lunch.text.lower()

        cancel_response = client.post(f"/api/appointments/{created_payload['id']}/cancel", params={"cancelled_reason": "Runtime test"})
        assert cancel_response.status_code == 200, cancel_response.text
        cancelled_payload = cancel_response.json()
        assert cancelled_payload["status"] == "cancelled"
        assert cancelled_payload["cancelled_reason"] == "Runtime test"
