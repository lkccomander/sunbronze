from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from sunbronze_api.api.deps import require_staff_user
from sunbronze_api.db.session import get_db_session
from sunbronze_api.schemas.reference_data import (
    BarberCreate,
    BarberSummary,
    BarberTimeOffCreate,
    BarberTimeOffSummary,
    BarberTimeOffUpdate,
    BarberUpdate,
    BarberWorkingHoursCreate,
    BarberWorkingHoursSummary,
    BarberWorkingHoursUpdate,
    CustomerSummary,
    LocationSummary,
    ReferenceListParams,
    ResourceSummary,
    ServiceSummary,
)
from sunbronze_api.services.reference_data import (
    create_barber,
    create_barber_time_off,
    create_barber_working_hours,
    deactivate_barber,
    delete_barber_time_off,
    delete_barber_working_hours,
    get_barber,
    list_barbers,
    list_barber_time_off,
    list_barber_working_hours,
    list_customers,
    list_locations,
    list_resources,
    list_services,
    update_barber,
    update_barber_time_off,
    update_barber_working_hours,
)

router = APIRouter()


@router.get("/services", response_model=list[ServiceSummary])
def list_services_route(
    is_active: bool | None = None,
    search: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db_session),
) -> list[ServiceSummary]:
    params = ReferenceListParams(is_active=is_active, search=search, limit=limit, offset=offset)
    return list_services(db, params)


@router.get("/barbers", response_model=list[BarberSummary])
def list_barbers_route(
    location_id: str | None = None,
    is_active: bool | None = None,
    search: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db_session),
) -> list[BarberSummary]:
    params = ReferenceListParams(is_active=is_active, search=search, limit=limit, offset=offset)
    return list_barbers(db, params, location_id=location_id)


@router.post("/barbers", response_model=BarberSummary, status_code=201)
def create_barber_route(
    payload: BarberCreate,
    _: object = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> BarberSummary:
    return create_barber(db, payload)


@router.get("/barbers/{barber_id}", response_model=BarberSummary)
def get_barber_route(barber_id: UUID, db: Session = Depends(get_db_session)) -> BarberSummary:
    return get_barber(db, barber_id)


@router.patch("/barbers/{barber_id}", response_model=BarberSummary)
def update_barber_route(
    barber_id: UUID,
    payload: BarberUpdate,
    _: object = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> BarberSummary:
    return update_barber(db, barber_id, payload)


@router.delete("/barbers/{barber_id}", response_model=BarberSummary)
def deactivate_barber_route(
    barber_id: UUID,
    _: object = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> BarberSummary:
    return deactivate_barber(db, barber_id)


@router.get("/barbers/{barber_id}/working-hours", response_model=list[BarberWorkingHoursSummary])
def list_barber_working_hours_route(barber_id: UUID, db: Session = Depends(get_db_session)) -> list[BarberWorkingHoursSummary]:
    return list_barber_working_hours(db, barber_id)


@router.post("/barbers/{barber_id}/working-hours", response_model=BarberWorkingHoursSummary, status_code=201)
def create_barber_working_hours_route(
    barber_id: UUID,
    payload: BarberWorkingHoursCreate,
    _: object = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> BarberWorkingHoursSummary:
    return create_barber_working_hours(db, barber_id, payload)


@router.patch("/barbers/{barber_id}/working-hours/{hours_id}", response_model=BarberWorkingHoursSummary)
def update_barber_working_hours_route(
    barber_id: UUID,
    hours_id: UUID,
    payload: BarberWorkingHoursUpdate,
    _: object = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> BarberWorkingHoursSummary:
    return update_barber_working_hours(db, barber_id, hours_id, payload)


@router.delete("/barbers/{barber_id}/working-hours/{hours_id}", status_code=204)
def delete_barber_working_hours_route(
    barber_id: UUID,
    hours_id: UUID,
    _: object = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> Response:
    delete_barber_working_hours(db, barber_id, hours_id)
    return Response(status_code=204)


@router.get("/barbers/{barber_id}/time-off", response_model=list[BarberTimeOffSummary])
def list_barber_time_off_route(
    barber_id: UUID,
    starts_at: datetime | None = Query(default=None, alias="from"),
    ends_at: datetime | None = None,
    db: Session = Depends(get_db_session),
) -> list[BarberTimeOffSummary]:
    return list_barber_time_off(db, barber_id, starts_at=starts_at, ends_at=ends_at)


@router.post("/barbers/{barber_id}/time-off", response_model=BarberTimeOffSummary, status_code=201)
def create_barber_time_off_route(
    barber_id: UUID,
    payload: BarberTimeOffCreate,
    _: object = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> BarberTimeOffSummary:
    return create_barber_time_off(db, barber_id, payload)


@router.patch("/barbers/{barber_id}/time-off/{time_off_id}", response_model=BarberTimeOffSummary)
def update_barber_time_off_route(
    barber_id: UUID,
    time_off_id: UUID,
    payload: BarberTimeOffUpdate,
    _: object = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> BarberTimeOffSummary:
    return update_barber_time_off(db, barber_id, time_off_id, payload)


@router.delete("/barbers/{barber_id}/time-off/{time_off_id}", status_code=204)
def delete_barber_time_off_route(
    barber_id: UUID,
    time_off_id: UUID,
    _: object = Depends(require_staff_user),
    db: Session = Depends(get_db_session),
) -> Response:
    delete_barber_time_off(db, barber_id, time_off_id)
    return Response(status_code=204)


@router.get("/resources", response_model=list[ResourceSummary])
def list_resources_route(
    location_id: str | None = None,
    is_active: bool | None = None,
    search: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db_session),
) -> list[ResourceSummary]:
    params = ReferenceListParams(is_active=is_active, search=search, limit=limit, offset=offset)
    return list_resources(db, params, location_id=location_id)


@router.get("/customers", response_model=list[CustomerSummary])
def list_customers_route(
    preferred_barber_id: str | None = None,
    is_active: bool | None = None,
    search: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db_session),
) -> list[CustomerSummary]:
    params = ReferenceListParams(is_active=is_active, search=search, limit=limit, offset=offset)
    return list_customers(db, params, preferred_barber_id=preferred_barber_id)


@router.get("/locations", response_model=list[LocationSummary])
def list_locations_route(
    is_active: bool | None = None,
    search: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db_session),
) -> list[LocationSummary]:
    params = ReferenceListParams(is_active=is_active, search=search, limit=limit, offset=offset)
    return list_locations(db, params)
