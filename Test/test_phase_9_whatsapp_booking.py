from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from types import SimpleNamespace
from uuid import uuid4

from sunbronze_api.models.enums import ConversationState
from sunbronze_api.services import whatsapp_booking
from sunbronze_api.services.whatsapp_booking import _handle_date_choice, _normalize_text, _parse_requested_date, _parse_time_text


def test_phase_9_booking_parser_handles_spanish_relative_dates() -> None:
    now = datetime(2026, 4, 12, 15, 0, tzinfo=UTC)

    assert _parse_requested_date(_normalize_text("mañana"), now) == date(2026, 4, 13)
    assert _parse_requested_date(_normalize_text("viernes"), now) == date(2026, 4, 17)
    assert _parse_requested_date(_normalize_text("15 de abril"), now) == date(2026, 4, 15)


def test_phase_9_booking_parser_handles_chat_times() -> None:
    assert _parse_time_text(_normalize_text("10:30")) == time(10, 30)
    assert _parse_time_text(_normalize_text("2 pm")) == time(14, 0)
    assert _parse_time_text(_normalize_text("12 a. m.")) == time(0, 0)


def test_phase_9_booking_date_choice_shows_all_returned_slots(monkeypatch) -> None:
    service_id = uuid4()
    start_at = datetime(2026, 4, 13, 9, 0, tzinfo=whatsapp_booking.BUSINESS_TIME_ZONE)
    slots = [
        SimpleNamespace(
            start_at=start_at + timedelta(minutes=30 * index),
            end_at=start_at + timedelta(minutes=30 * (index + 1)),
            barber_id=None,
            resource_id=None,
        )
        for index in range(6)
    ]
    db = SimpleNamespace(get=lambda _model, _id: SimpleNamespace(id=service_id, name="Corte"))
    conversation = SimpleNamespace(state=None, state_payload={})

    monkeypatch.setattr(whatsapp_booking, "_available_slots_for_date", lambda *_args: slots)
    monkeypatch.setattr(whatsapp_booking, "_barber_names_for_slots", lambda *_args: {})

    reply = _handle_date_choice(
        db,
        conversation,
        {"service_id": str(service_id)},
        _normalize_text("manana"),
        datetime(2026, 4, 12, 15, 0, tzinfo=UTC),
    )

    assert conversation.state == ConversationState.CHOOSE_TIME
    assert len(conversation.state_payload["slot_options"]) == 6
    assert "6. 11:30" in reply
