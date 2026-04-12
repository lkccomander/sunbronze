from __future__ import annotations

from datetime import UTC, date, datetime, time

from sunbronze_api.services.whatsapp_booking import _normalize_text, _parse_requested_date, _parse_time_text


def test_phase_9_booking_parser_handles_spanish_relative_dates() -> None:
    now = datetime(2026, 4, 12, 15, 0, tzinfo=UTC)

    assert _parse_requested_date(_normalize_text("mañana"), now) == date(2026, 4, 13)
    assert _parse_requested_date(_normalize_text("viernes"), now) == date(2026, 4, 17)
    assert _parse_requested_date(_normalize_text("15 de abril"), now) == date(2026, 4, 15)


def test_phase_9_booking_parser_handles_chat_times() -> None:
    assert _parse_time_text(_normalize_text("10:30")) == time(10, 30)
    assert _parse_time_text(_normalize_text("2 pm")) == time(14, 0)
    assert _parse_time_text(_normalize_text("12 a. m.")) == time(0, 0)
