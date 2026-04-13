from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, String, cast, or_, select
from sqlalchemy.orm import Session

from sunbronze_api.models.entities import Barber, BarberTimeOff, BarberWorkingHours, Customer, Location, Resource, Service
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
    ServiceCreate,
    ServiceSummary,
    ServiceUpdate,
)


def list_services(db: Session, params: ReferenceListParams) -> list[ServiceSummary]:
    query: Select[tuple[Service]] = select(Service).order_by(Service.name.asc())
    query = _apply_is_active_filter(query, Service, params)
    query = _apply_search_filter(query, params.search, Service.code, Service.name, Service.description)
    services = db.scalars(_apply_pagination(query, params)).all()
    return _validate_many(ServiceSummary, services)


def get_service(db: Session, service_id: UUID) -> ServiceSummary:
    return ServiceSummary.model_validate(_get_service(db, service_id))


def create_service(db: Session, payload: ServiceCreate) -> ServiceSummary:
    service = Service(
        code=payload.code.strip(),
        name=payload.name.strip(),
        description=_clean_optional_text(payload.description),
        requires_barber=payload.requires_barber,
        requires_resource=payload.requires_resource,
        duration_minutes=payload.duration_minutes,
        buffer_before_minutes=payload.buffer_before_minutes,
        buffer_after_minutes=payload.buffer_after_minutes,
        price_cents=payload.price_cents,
        currency_code=payload.currency_code.strip().upper(),
        is_active=payload.is_active,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return ServiceSummary.model_validate(service)


def update_service(db: Session, service_id: UUID, payload: ServiceUpdate) -> ServiceSummary:
    service = _get_service(db, service_id)
    values = payload.model_dump(exclude_unset=True)

    if payload.code is not None:
        service.code = payload.code.strip()
    if payload.name is not None:
        service.name = payload.name.strip()
    if "description" in values:
        service.description = _clean_optional_text(payload.description)
    if payload.requires_barber is not None:
        service.requires_barber = payload.requires_barber
    if payload.requires_resource is not None:
        service.requires_resource = payload.requires_resource
    if payload.duration_minutes is not None:
        service.duration_minutes = payload.duration_minutes
    if payload.buffer_before_minutes is not None:
        service.buffer_before_minutes = payload.buffer_before_minutes
    if payload.buffer_after_minutes is not None:
        service.buffer_after_minutes = payload.buffer_after_minutes
    if "price_cents" in values:
        service.price_cents = payload.price_cents
    if payload.currency_code is not None:
        service.currency_code = payload.currency_code.strip().upper()
    if payload.is_active is not None:
        service.is_active = payload.is_active

    db.commit()
    db.refresh(service)
    return ServiceSummary.model_validate(service)


def deactivate_service(db: Session, service_id: UUID) -> ServiceSummary:
    service = _get_service(db, service_id)
    service.is_active = False
    db.commit()
    db.refresh(service)
    return ServiceSummary.model_validate(service)


def list_barbers(db: Session, params: ReferenceListParams, location_id: str | None = None) -> list[BarberSummary]:
    query: Select[tuple[Barber]] = select(Barber).order_by(Barber.display_name.asc())
    query = _apply_is_active_filter(query, Barber, params)
    if location_id:
        query = query.where(cast(Barber.location_id, String) == location_id)
    query = _apply_search_filter(query, params.search, Barber.code, Barber.first_name, Barber.last_name, Barber.display_name)
    barbers = db.scalars(_apply_pagination(query, params)).all()
    return _validate_many(BarberSummary, barbers)


def get_barber(db: Session, barber_id: UUID) -> BarberSummary:
    return BarberSummary.model_validate(_get_barber(db, barber_id))


def create_barber(db: Session, payload: BarberCreate) -> BarberSummary:
    _ensure_location_exists(db, payload.location_id)
    barber = Barber(
        location_id=payload.location_id,
        code=payload.code.strip(),
        first_name=payload.first_name.strip(),
        last_name=_clean_optional_text(payload.last_name),
        display_name=_resolve_display_name(payload.first_name, payload.last_name, payload.display_name),
        email=_clean_optional_text(payload.email),
        phone_e164=_clean_optional_text(payload.phone_e164),
        time_zone=payload.time_zone.strip(),
        is_active=payload.is_active,
    )
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return BarberSummary.model_validate(barber)


def update_barber(db: Session, barber_id: UUID, payload: BarberUpdate) -> BarberSummary:
    barber = _get_barber(db, barber_id)
    values = payload.model_dump(exclude_unset=True)

    if "location_id" in values:
        _ensure_location_exists(db, payload.location_id)
        barber.location_id = payload.location_id
    if payload.code is not None:
        barber.code = payload.code.strip()
    if payload.first_name is not None:
        barber.first_name = payload.first_name.strip()
    if "last_name" in values:
        barber.last_name = _clean_optional_text(payload.last_name)
    if payload.display_name is not None:
        barber.display_name = payload.display_name.strip()
    elif payload.first_name is not None or "last_name" in values:
        barber.display_name = _resolve_display_name(barber.first_name, barber.last_name, None)
    if "email" in values:
        barber.email = _clean_optional_text(payload.email)
    if "phone_e164" in values:
        barber.phone_e164 = _clean_optional_text(payload.phone_e164)
    if payload.time_zone is not None:
        barber.time_zone = payload.time_zone.strip()
    if payload.is_active is not None:
        barber.is_active = payload.is_active

    db.commit()
    db.refresh(barber)
    return BarberSummary.model_validate(barber)


def deactivate_barber(db: Session, barber_id: UUID) -> BarberSummary:
    barber = _get_barber(db, barber_id)
    barber.is_active = False
    db.commit()
    db.refresh(barber)
    return BarberSummary.model_validate(barber)


def list_barber_working_hours(db: Session, barber_id: UUID) -> list[BarberWorkingHoursSummary]:
    _get_barber(db, barber_id)
    rows = db.scalars(
        select(BarberWorkingHours)
        .where(BarberWorkingHours.barber_id == barber_id)
        .order_by(BarberWorkingHours.weekday.asc(), BarberWorkingHours.start_time.asc())
    ).all()
    return _validate_many(BarberWorkingHoursSummary, rows)


def create_barber_working_hours(db: Session, barber_id: UUID, payload: BarberWorkingHoursCreate) -> BarberWorkingHoursSummary:
    _get_barber(db, barber_id)
    _ensure_time_range(payload.start_time, payload.end_time)
    row = BarberWorkingHours(
        barber_id=barber_id,
        weekday=payload.weekday,
        start_time=payload.start_time,
        end_time=payload.end_time,
        is_active=payload.is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return BarberWorkingHoursSummary.model_validate(row)


def update_barber_working_hours(
    db: Session,
    barber_id: UUID,
    hours_id: UUID,
    payload: BarberWorkingHoursUpdate,
) -> BarberWorkingHoursSummary:
    row = _get_barber_working_hours(db, barber_id, hours_id)
    next_start = payload.start_time or row.start_time
    next_end = payload.end_time or row.end_time
    _ensure_time_range(next_start, next_end)

    if payload.weekday is not None:
        row.weekday = payload.weekday
    if payload.start_time is not None:
        row.start_time = payload.start_time
    if payload.end_time is not None:
        row.end_time = payload.end_time
    if payload.is_active is not None:
        row.is_active = payload.is_active

    db.commit()
    db.refresh(row)
    return BarberWorkingHoursSummary.model_validate(row)


def delete_barber_working_hours(db: Session, barber_id: UUID, hours_id: UUID) -> None:
    row = _get_barber_working_hours(db, barber_id, hours_id)
    db.delete(row)
    db.commit()


def list_barber_time_off(db: Session, barber_id: UUID, starts_at: datetime | None = None, ends_at: datetime | None = None) -> list[BarberTimeOffSummary]:
    _get_barber(db, barber_id)
    query = select(BarberTimeOff).where(BarberTimeOff.barber_id == barber_id).order_by(BarberTimeOff.starts_at.asc())
    if starts_at is not None:
        query = query.where(BarberTimeOff.ends_at > starts_at)
    if ends_at is not None:
        query = query.where(BarberTimeOff.starts_at < ends_at)
    rows = db.scalars(query).all()
    return _validate_many(BarberTimeOffSummary, rows)


def create_barber_time_off(db: Session, barber_id: UUID, payload: BarberTimeOffCreate) -> BarberTimeOffSummary:
    _get_barber(db, barber_id)
    _ensure_datetime_range(payload.starts_at, payload.ends_at)
    row = BarberTimeOff(
        barber_id=barber_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        reason=_clean_optional_text(payload.reason),
        is_all_day=payload.is_all_day,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return BarberTimeOffSummary.model_validate(row)


def update_barber_time_off(db: Session, barber_id: UUID, time_off_id: UUID, payload: BarberTimeOffUpdate) -> BarberTimeOffSummary:
    row = _get_barber_time_off(db, barber_id, time_off_id)
    next_start = payload.starts_at or row.starts_at
    next_end = payload.ends_at or row.ends_at
    _ensure_datetime_range(next_start, next_end)

    if payload.starts_at is not None:
        row.starts_at = payload.starts_at
    if payload.ends_at is not None:
        row.ends_at = payload.ends_at
    if "reason" in payload.model_fields_set:
        row.reason = _clean_optional_text(payload.reason)
    if payload.is_all_day is not None:
        row.is_all_day = payload.is_all_day

    db.commit()
    db.refresh(row)
    return BarberTimeOffSummary.model_validate(row)


def delete_barber_time_off(db: Session, barber_id: UUID, time_off_id: UUID) -> None:
    row = _get_barber_time_off(db, barber_id, time_off_id)
    db.delete(row)
    db.commit()


def list_resources(db: Session, params: ReferenceListParams, location_id: str | None = None) -> list[ResourceSummary]:
    query: Select[tuple[Resource]] = select(Resource).order_by(Resource.name.asc())
    query = _apply_is_active_filter(query, Resource, params)
    if location_id:
        query = query.where(cast(Resource.location_id, String) == location_id)
    query = _apply_search_filter(query, params.search, Resource.code, Resource.name, Resource.resource_type, Resource.description)
    resources = db.scalars(_apply_pagination(query, params)).all()
    return _validate_many(ResourceSummary, resources)


def list_customers(db: Session, params: ReferenceListParams, preferred_barber_id: str | None = None) -> list[CustomerSummary]:
    query: Select[tuple[Customer]] = select(Customer).order_by(Customer.display_name.asc(), Customer.first_name.asc())
    query = _apply_is_active_filter(query, Customer, params)
    if preferred_barber_id:
        query = query.where(cast(Customer.preferred_barber_id, String) == preferred_barber_id)
    query = _apply_search_filter(
        query,
        params.search,
        Customer.display_name,
        Customer.first_name,
        Customer.last_name,
        Customer.whatsapp_phone_e164,
    )
    customers = db.scalars(_apply_pagination(query, params)).all()
    return _validate_many(CustomerSummary, customers)


def list_locations(db: Session, params: ReferenceListParams) -> list[LocationSummary]:
    query: Select[tuple[Location]] = select(Location).order_by(Location.name.asc())
    query = _apply_is_active_filter(query, Location, params)
    query = _apply_search_filter(query, params.search, Location.code, Location.name, Location.city, Location.state)
    locations = db.scalars(_apply_pagination(query, params)).all()
    return _validate_many(LocationSummary, locations)


def _apply_is_active_filter(query: Select, model, params: ReferenceListParams) -> Select:
    if params.is_active is not None and hasattr(model, "is_active"):
        query = query.where(model.is_active.is_(params.is_active))
    return query


def _apply_search_filter(query: Select, search: str | None, *columns) -> Select:
    if not search:
        return query

    like_term = f"%{search.strip()}%"
    return query.where(or_(*(column.ilike(like_term) for column in columns)))


def _apply_pagination(query: Select, params: ReferenceListParams) -> Select:
    return query.offset(params.offset).limit(params.limit)


def _validate_many(schema, records: Sequence[object]) -> list:
    return [schema.model_validate(record) for record in records]


def _get_barber(db: Session, barber_id: UUID) -> Barber:
    barber = db.get(Barber, barber_id)
    if barber is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found.")
    return barber


def _get_service(db: Session, service_id: UUID) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
    return service


def _get_barber_working_hours(db: Session, barber_id: UUID, hours_id: UUID) -> BarberWorkingHours:
    row = db.get(BarberWorkingHours, hours_id)
    if row is None or row.barber_id != barber_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Working hours entry not found.")
    return row


def _get_barber_time_off(db: Session, barber_id: UUID, time_off_id: UUID) -> BarberTimeOff:
    row = db.get(BarberTimeOff, time_off_id)
    if row is None or row.barber_id != barber_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time off entry not found.")
    return row


def _ensure_location_exists(db: Session, location_id: UUID | None) -> None:
    if location_id is not None and db.get(Location, location_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found.")


def _ensure_time_range(start_time, end_time) -> None:
    if end_time <= start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time must be later than start_time.")


def _ensure_datetime_range(starts_at: datetime, ends_at: datetime) -> None:
    if ends_at <= starts_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ends_at must be later than starts_at.")


def _clean_optional_text(value: str | None) -> str | None:
    cleaned = value.strip() if value else ""
    return cleaned or None


def _resolve_display_name(first_name: str, last_name: str | None, display_name: str | None) -> str:
    cleaned = _clean_optional_text(display_name)
    if cleaned:
        return cleaned
    return " ".join(part for part in [first_name.strip(), _clean_optional_text(last_name)] if part)
