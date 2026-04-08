from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from sunbronze_api.db.session import get_db_session
from sunbronze_api.schemas.reference_data import (
    BarberSummary,
    CustomerSummary,
    LocationSummary,
    ReferenceListParams,
    ResourceSummary,
    ServiceSummary,
)
from sunbronze_api.services.reference_data import (
    list_barbers,
    list_customers,
    list_locations,
    list_resources,
    list_services,
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
