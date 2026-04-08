from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from sunbronze_api.db.session import get_db_session
from sunbronze_api.models.enums import AppointmentStatus
from sunbronze_api.schemas.appointments import (
    AppointmentAvailabilityQuery,
    AppointmentCreate,
    AppointmentDetail,
    AppointmentListQuery,
    AppointmentSummary,
    AppointmentUpdate,
    AvailabilitySlot,
)
from sunbronze_api.services.appointments import (
    cancel_appointment,
    create_appointment,
    get_appointment,
    list_appointments,
    list_available_slots,
    update_appointment,
)

router = APIRouter(prefix="/appointments")


@router.get("", response_model=list[AppointmentSummary])
def list_appointments_route(
    customer_id: UUID | None = None,
    barber_id: UUID | None = None,
    status: AppointmentStatus | None = None,
    start_from: datetime | None = Query(default=None, alias="from"),
    start_to: datetime | None = None,
    db: Session = Depends(get_db_session),
) -> list[AppointmentSummary]:
    filters = AppointmentListQuery(
        customer_id=customer_id,
        barber_id=barber_id,
        status=status,
        start_from=start_from,
        start_to=start_to,
    )
    return list_appointments(db, filters)


@router.get("/availability", response_model=list[AvailabilitySlot])
def list_appointment_availability_route(
    service_id: UUID,
    starts_at: datetime,
    ends_at: datetime,
    barber_id: UUID | None = None,
    resource_id: UUID | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db_session),
) -> list[AvailabilitySlot]:
    filters = AppointmentAvailabilityQuery(
        service_id=service_id,
        starts_at=starts_at,
        ends_at=ends_at,
        barber_id=barber_id,
        resource_id=resource_id,
        limit=limit,
    )
    return list_available_slots(db, filters)


@router.get("/{appointment_id}", response_model=AppointmentDetail)
def get_appointment_route(appointment_id: UUID, db: Session = Depends(get_db_session)) -> AppointmentDetail:
    return get_appointment(db, appointment_id)


@router.post("", response_model=AppointmentDetail, status_code=201)
def create_appointment_route(payload: AppointmentCreate, db: Session = Depends(get_db_session)) -> AppointmentDetail:
    return create_appointment(db, payload)


@router.patch("/{appointment_id}", response_model=AppointmentDetail)
def update_appointment_route(
    appointment_id: UUID,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db_session),
) -> AppointmentDetail:
    return update_appointment(db, appointment_id, payload)


@router.post("/{appointment_id}/cancel", response_model=AppointmentDetail)
def cancel_appointment_route(
    appointment_id: UUID,
    cancelled_reason: str | None = None,
    db: Session = Depends(get_db_session),
) -> AppointmentDetail:
    return cancel_appointment(db, appointment_id, cancelled_reason)
