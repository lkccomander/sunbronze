from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sunbronze_api.models.entities import ResourceWorkingHours
from sunbronze_api.services.appointments import BUSINESS_TIME_ZONE, _next_slot_cursor, _within_working_hours


class _UnexpectedDbCall:
    def scalar(self, _query):
        raise AssertionError("Cross-midnight availability should be rejected before querying schedules.")


def test_within_working_hours_rejects_slots_that_cross_local_midnight() -> None:
    start_at = datetime(2026, 4, 14, 23, 30, tzinfo=BUSINESS_TIME_ZONE)
    end_at = datetime(2026, 4, 15, 0, 20, tzinfo=BUSINESS_TIME_ZONE)

    result = _within_working_hours(
        _UnexpectedDbCall(),
        ResourceWorkingHours,
        ResourceWorkingHours.resource_id,
        uuid4(),
        start_at,
        end_at,
    )

    assert result is False


def test_next_slot_cursor_uses_service_duration_and_rounds_to_next_half_hour() -> None:
    start_at = datetime(2026, 4, 15, 9, 0, tzinfo=BUSINESS_TIME_ZONE)

    assert _next_slot_cursor(start_at, 50) == datetime(2026, 4, 15, 10, 0, tzinfo=BUSINESS_TIME_ZONE)
    assert _next_slot_cursor(start_at, 45) == datetime(2026, 4, 15, 10, 0, tzinfo=BUSINESS_TIME_ZONE)
    assert _next_slot_cursor(start_at, 30) == datetime(2026, 4, 15, 9, 30, tzinfo=BUSINESS_TIME_ZONE)
