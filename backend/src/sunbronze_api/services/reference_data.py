from collections.abc import Sequence

from sqlalchemy import Select, String, cast, or_, select
from sqlalchemy.orm import Session

from sunbronze_api.models.entities import Barber, Customer, Location, Resource, Service
from sunbronze_api.schemas.reference_data import (
    BarberSummary,
    CustomerSummary,
    LocationSummary,
    ReferenceListParams,
    ResourceSummary,
    ServiceSummary,
)


def list_services(db: Session, params: ReferenceListParams) -> list[ServiceSummary]:
    query: Select[tuple[Service]] = select(Service).order_by(Service.name.asc())
    query = _apply_is_active_filter(query, Service, params)
    query = _apply_search_filter(query, params.search, Service.code, Service.name, Service.description)
    services = db.scalars(_apply_pagination(query, params)).all()
    return _validate_many(ServiceSummary, services)


def list_barbers(db: Session, params: ReferenceListParams, location_id: str | None = None) -> list[BarberSummary]:
    query: Select[tuple[Barber]] = select(Barber).order_by(Barber.display_name.asc())
    query = _apply_is_active_filter(query, Barber, params)
    if location_id:
        query = query.where(cast(Barber.location_id, String) == location_id)
    query = _apply_search_filter(query, params.search, Barber.code, Barber.first_name, Barber.last_name, Barber.display_name)
    barbers = db.scalars(_apply_pagination(query, params)).all()
    return _validate_many(BarberSummary, barbers)


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
