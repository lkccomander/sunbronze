from datetime import datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, exists, select
from sqlalchemy.orm import Session, joinedload

from sunbronze_api.models.entities import (
    Appointment,
    AppointmentEvent,
    Barber,
    BarberService,
    BarberTimeOff,
    BarberWorkingHours,
    Conversation,
    Customer,
    Resource,
    ResourceTimeOff,
    ResourceWorkingHours,
    Service,
)
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
from sunbronze_api.services.whatsapp import enqueue_default_reminder_jobs


def list_appointments(db: Session, filters: AppointmentListQuery) -> list[AppointmentSummary]:
    query: Select[tuple[Appointment]] = (
        select(Appointment)
        .options(
            joinedload(Appointment.customer),
            joinedload(Appointment.barber),
            joinedload(Appointment.service),
            joinedload(Appointment.resource),
        )
        .order_by(Appointment.scheduled_start_at.asc())
    )

    if filters.customer_id:
        query = query.where(Appointment.customer_id == filters.customer_id)
    if filters.barber_id:
        query = query.where(Appointment.barber_id == filters.barber_id)
    if filters.status:
        query = query.where(Appointment.status == filters.status)
    if filters.start_from:
        query = query.where(Appointment.scheduled_start_at >= filters.start_from)
    if filters.start_to:
        query = query.where(Appointment.scheduled_start_at <= filters.start_to)

    appointments = db.scalars(query).all()
    return [AppointmentSummary.model_validate(appointment) for appointment in appointments]


def get_appointment(db: Session, appointment_id: UUID) -> AppointmentDetail:
    appointment = db.scalar(
        select(Appointment)
        .options(
            joinedload(Appointment.customer),
            joinedload(Appointment.barber),
            joinedload(Appointment.service),
            joinedload(Appointment.resource),
        )
        .where(Appointment.id == appointment_id)
    )
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    return _to_detail(appointment)


def create_appointment(db: Session, payload: AppointmentCreate) -> AppointmentDetail:
    customer, service, barber, resource, conversation = _load_related_records(
        db,
        customer_id=payload.customer_id,
        service_id=payload.service_id,
        barber_id=payload.barber_id,
        resource_id=payload.resource_id,
        conversation_id=payload.conversation_id,
    )
    timing = _build_appointment_timing(
        db,
        service=service,
        barber_id=payload.barber_id,
        scheduled_start_at=payload.scheduled_start_at,
        scheduled_end_at=payload.scheduled_end_at,
    )
    _validate_service_assignments(service, payload.barber_id, payload.resource_id)
    _ensure_requested_time_is_schedulable(
        db,
        service=service,
        barber_id=payload.barber_id,
        resource_id=payload.resource_id,
        scheduled_start_at=payload.scheduled_start_at,
        scheduled_end_at=timing["scheduled_end_at"],
        reserved_start_at=timing["reserved_start_at"],
        reserved_end_at=timing["reserved_end_at"],
    )
    _ensure_no_reservation_conflicts(
        db,
        barber_id=payload.barber_id,
        resource_id=payload.resource_id,
        reserved_start_at=timing["reserved_start_at"],
        reserved_end_at=timing["reserved_end_at"],
    )

    appointment = Appointment(
        customer_id=payload.customer_id,
        barber_id=payload.barber_id,
        resource_id=payload.resource_id,
        service_id=payload.service_id,
        conversation_id=payload.conversation_id,
        source=payload.source,
        status=payload.status,
        scheduled_start_at=payload.scheduled_start_at,
        scheduled_end_at=timing["scheduled_end_at"],
        buffer_before_minutes=timing["buffer_before_minutes"],
        buffer_after_minutes=timing["buffer_after_minutes"],
        reserved_start_at=timing["reserved_start_at"],
        reserved_end_at=timing["reserved_end_at"],
        notes=payload.notes,
        internal_notes=payload.internal_notes,
    )
    db.add(appointment)
    db.flush()
    enqueue_default_reminder_jobs(db, appointment)
    db.commit()
    db.refresh(appointment)

    appointment.customer = customer
    appointment.service = service
    appointment.barber = barber
    appointment.resource = resource
    appointment.conversation = conversation
    return _to_detail(appointment)


def update_appointment(db: Session, appointment_id: UUID, payload: AppointmentUpdate) -> AppointmentDetail:
    appointment = _get_appointment_for_write(db, appointment_id)

    next_barber_id = payload.barber_id if payload.barber_id is not None else appointment.barber_id
    next_resource_id = payload.resource_id if payload.resource_id is not None else appointment.resource_id
    next_start_at = payload.scheduled_start_at or appointment.scheduled_start_at
    next_end_at = payload.scheduled_end_at or appointment.scheduled_end_at

    _, service, barber, resource, _ = _load_related_records(
        db,
        customer_id=appointment.customer_id,
        service_id=appointment.service_id,
        barber_id=next_barber_id,
        resource_id=next_resource_id,
        conversation_id=appointment.conversation_id,
    )
    _validate_service_assignments(service, next_barber_id, next_resource_id)
    timing = _build_appointment_timing(
        db,
        service=service,
        barber_id=next_barber_id,
        scheduled_start_at=next_start_at,
        scheduled_end_at=next_end_at,
    )
    _ensure_requested_time_is_schedulable(
        db,
        service=service,
        barber_id=next_barber_id,
        resource_id=next_resource_id,
        scheduled_start_at=next_start_at,
        scheduled_end_at=timing["scheduled_end_at"],
        reserved_start_at=timing["reserved_start_at"],
        reserved_end_at=timing["reserved_end_at"],
        exclude_appointment_id=appointment.id,
    )
    _ensure_no_reservation_conflicts(
        db,
        barber_id=next_barber_id,
        resource_id=next_resource_id,
        reserved_start_at=timing["reserved_start_at"],
        reserved_end_at=timing["reserved_end_at"],
        exclude_appointment_id=appointment.id,
    )

    appointment.barber_id = next_barber_id
    appointment.resource_id = next_resource_id
    appointment.scheduled_start_at = next_start_at
    appointment.scheduled_end_at = timing["scheduled_end_at"]
    appointment.buffer_before_minutes = timing["buffer_before_minutes"]
    appointment.buffer_after_minutes = timing["buffer_after_minutes"]
    appointment.reserved_start_at = timing["reserved_start_at"]
    appointment.reserved_end_at = timing["reserved_end_at"]
    if payload.status is not None:
        appointment.status = payload.status
    if payload.notes is not None:
        appointment.notes = payload.notes
    if payload.internal_notes is not None:
        appointment.internal_notes = payload.internal_notes
    if payload.cancelled_reason is not None:
        appointment.cancelled_reason = payload.cancelled_reason

    db.add(
        AppointmentEvent(
            appointment_id=appointment.id,
            event_name="rescheduled" if payload.scheduled_start_at or payload.scheduled_end_at else "updated",
            actor_type="system",
            metadata_json={"barber_id": str(next_barber_id) if next_barber_id else None},
        )
    )
    db.commit()
    db.refresh(appointment)
    appointment.service = service
    appointment.barber = barber
    appointment.resource = resource
    return get_appointment(db, appointment.id)


def cancel_appointment(db: Session, appointment_id: UUID, cancelled_reason: str | None = None) -> AppointmentDetail:
    appointment = _get_appointment_for_write(db, appointment_id)
    appointment.status = AppointmentStatus.CANCELLED
    appointment.cancelled_reason = cancelled_reason or appointment.cancelled_reason or "Cancelled"

    db.add(
        AppointmentEvent(
            appointment_id=appointment.id,
            event_name="cancelled",
            actor_type="system",
            metadata_json={"cancelled_reason": appointment.cancelled_reason},
        )
    )
    db.commit()
    db.refresh(appointment)
    return get_appointment(db, appointment.id)


def list_available_slots(db: Session, filters: AppointmentAvailabilityQuery) -> list[AvailabilitySlot]:
    service = db.get(Service, filters.service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    target_barber_ids = _candidate_barber_ids(db, service, filters.barber_id)
    target_resource_ids = _candidate_resource_ids(db, service, filters.resource_id)
    duration_minutes = _resolve_duration_minutes(db, service, filters.barber_id)

    slots: list[AvailabilitySlot] = []
    cursor = filters.starts_at
    while cursor < filters.ends_at and len(slots) < filters.limit:
        slot_end = cursor + timedelta(minutes=duration_minutes)

        if service.requires_barber:
            for barber_id in target_barber_ids:
                if _barber_is_available(db, barber_id, cursor, slot_end):
                    resource_id = None
                    if service.requires_resource:
                        resource_id = _first_available_resource(db, target_resource_ids, cursor, slot_end)
                        if resource_id is None:
                            continue
                    slots.append(
                        AvailabilitySlot(
                            start_at=cursor,
                            end_at=slot_end,
                            barber_id=barber_id,
                            resource_id=resource_id,
                        )
                    )
                    if len(slots) >= filters.limit:
                        break
        else:
            resource_id = None
            if service.requires_resource:
                resource_id = _first_available_resource(db, target_resource_ids, cursor, slot_end)
                if resource_id is None:
                    cursor += timedelta(minutes=30)
                    continue
            slots.append(AvailabilitySlot(start_at=cursor, end_at=slot_end, barber_id=None, resource_id=resource_id))

        cursor += timedelta(minutes=30)

    return slots


def _to_detail(appointment: Appointment) -> AppointmentDetail:
    return AppointmentDetail(
        **AppointmentSummary.model_validate(appointment).model_dump(),
        customer_name=appointment.customer.display_name if appointment.customer else None,
        barber_name=appointment.barber.display_name if appointment.barber else None,
        service_name=appointment.service.name if appointment.service else None,
        resource_name=appointment.resource.name if appointment.resource else None,
    )


def _load_related_records(
    db: Session,
    *,
    customer_id: UUID,
    service_id: UUID,
    barber_id: UUID | None,
    resource_id: UUID | None,
    conversation_id: UUID | None,
):
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    barber = None
    if barber_id is not None:
        barber = db.get(Barber, barber_id)
        if barber is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found.")

    resource = None
    if resource_id is not None:
        resource = db.get(Resource, resource_id)
        if resource is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found.")

    conversation = None
    if conversation_id is not None:
        conversation = db.get(Conversation, conversation_id)
        if conversation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    return customer, service, barber, resource, conversation


def _validate_service_assignments(service: Service, barber_id: UUID | None, resource_id: UUID | None) -> None:
    if service.requires_barber and barber_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This service requires a barber.")
    if not service.requires_barber and barber_id is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This service does not use a barber.")
    if service.requires_resource and resource_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This service requires a resource.")


def _resolve_duration_minutes(db: Session, service: Service, barber_id: UUID | None) -> int:
    duration_minutes = service.duration_minutes
    if barber_id is not None:
        assignment = db.scalar(
            select(BarberService).where(
                BarberService.barber_id == barber_id,
                BarberService.service_id == service.id,
                BarberService.is_active.is_(True),
            )
        )
        if assignment and assignment.custom_duration_minutes:
            duration_minutes = assignment.custom_duration_minutes
    return duration_minutes


def _build_appointment_timing(
    db: Session,
    *,
    service: Service,
    barber_id: UUID | None,
    scheduled_start_at: datetime,
    scheduled_end_at: datetime | None,
) -> dict[str, datetime | int]:
    duration_minutes = _resolve_duration_minutes(db, service, barber_id)
    resolved_end_at = scheduled_end_at or (scheduled_start_at + timedelta(minutes=duration_minutes))
    if resolved_end_at <= scheduled_start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scheduled_end_at must be later than scheduled_start_at.",
        )

    buffer_before_minutes = service.buffer_before_minutes
    buffer_after_minutes = service.buffer_after_minutes
    return {
        "scheduled_end_at": resolved_end_at,
        "buffer_before_minutes": buffer_before_minutes,
        "buffer_after_minutes": buffer_after_minutes,
        "reserved_start_at": scheduled_start_at - timedelta(minutes=buffer_before_minutes),
        "reserved_end_at": resolved_end_at + timedelta(minutes=buffer_after_minutes),
    }


def _ensure_no_reservation_conflicts(
    db: Session,
    *,
    barber_id: UUID | None,
    resource_id: UUID | None,
    reserved_start_at: datetime,
    reserved_end_at: datetime,
    exclude_appointment_id: UUID | None = None,
) -> None:
    active_statuses = ("pending", "confirmed", "checked_in")
    base_filters = [
        Appointment.reserved_start_at < reserved_end_at,
        Appointment.reserved_end_at > reserved_start_at,
        Appointment.status.in_(active_statuses),
    ]
    if exclude_appointment_id is not None:
        base_filters.append(Appointment.id != exclude_appointment_id)

    if barber_id is not None:
        barber_conflict = db.scalar(
            select(Appointment.id).where(*base_filters, Appointment.barber_id == barber_id).limit(1)
        )
        if barber_conflict is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reservation conflict for the selected barber.",
            )

    if resource_id is not None:
        resource_conflict = db.scalar(
            select(Appointment.id).where(*base_filters, Appointment.resource_id == resource_id).limit(1)
        )
        if resource_conflict is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reservation conflict for the selected resource.",
            )


def _ensure_requested_time_is_schedulable(
    db: Session,
    *,
    service: Service,
    barber_id: UUID | None,
    resource_id: UUID | None,
    scheduled_start_at: datetime,
    scheduled_end_at: datetime,
    reserved_start_at: datetime,
    reserved_end_at: datetime,
    exclude_appointment_id: UUID | None = None,
) -> None:
    if barber_id is not None:
        if not _within_working_hours(db, BarberWorkingHours, BarberWorkingHours.barber_id, barber_id, scheduled_start_at, scheduled_end_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected barber is outside working hours for this time.",
            )
        if _has_time_off(db, BarberTimeOff, BarberTimeOff.barber_id, barber_id, scheduled_start_at, scheduled_end_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected barber is unavailable during this time.",
            )
        if _has_overlap(db, Appointment.barber_id, barber_id, reserved_start_at, reserved_end_at, exclude_appointment_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reservation conflict for the selected barber.",
            )

    if service.requires_resource and resource_id is not None:
        if not _within_working_hours(db, ResourceWorkingHours, ResourceWorkingHours.resource_id, resource_id, scheduled_start_at, scheduled_end_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected resource is outside working hours for this time.",
            )
        if _has_time_off(db, ResourceTimeOff, ResourceTimeOff.resource_id, resource_id, scheduled_start_at, scheduled_end_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected resource is unavailable during this time.",
            )
        if _has_overlap(db, Appointment.resource_id, resource_id, reserved_start_at, reserved_end_at, exclude_appointment_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reservation conflict for the selected resource.",
            )


def _get_appointment_for_write(db: Session, appointment_id: UUID) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    return appointment


def _candidate_barber_ids(db: Session, service: Service, barber_id: UUID | None) -> list[UUID]:
    if not service.requires_barber:
        return []
    if barber_id is not None:
        return [barber_id]
    return list(
        db.scalars(
            select(Barber.id)
            .join(BarberService, BarberService.barber_id == Barber.id)
            .where(Barber.is_active.is_(True), BarberService.is_active.is_(True), BarberService.service_id == service.id)
            .order_by(Barber.display_name.asc())
        ).all()
    )


def _candidate_resource_ids(db: Session, service: Service, resource_id: UUID | None) -> list[UUID]:
    if not service.requires_resource:
        return []
    if resource_id is not None:
        return [resource_id]
    return list(
        db.scalars(select(Resource.id).where(Resource.is_active.is_(True)).order_by(Resource.name.asc())).all()
    )


def _barber_is_available(db: Session, barber_id: UUID, start_at: datetime, end_at: datetime) -> bool:
    return _within_working_hours(db, BarberWorkingHours, BarberWorkingHours.barber_id, barber_id, start_at, end_at) and not _has_time_off(
        db, BarberTimeOff, BarberTimeOff.barber_id, barber_id, start_at, end_at
    ) and not _has_overlap(
        db, Appointment.barber_id, barber_id, start_at, end_at
    )


def _resource_is_available(db: Session, resource_id: UUID, start_at: datetime, end_at: datetime) -> bool:
    return _within_working_hours(db, ResourceWorkingHours, ResourceWorkingHours.resource_id, resource_id, start_at, end_at) and not _has_time_off(
        db, ResourceTimeOff, ResourceTimeOff.resource_id, resource_id, start_at, end_at
    ) and not _has_overlap(
        db, Appointment.resource_id, resource_id, start_at, end_at
    )


def _first_available_resource(db: Session, resource_ids: list[UUID], start_at: datetime, end_at: datetime) -> UUID | None:
    for resource_id in resource_ids:
        if _resource_is_available(db, resource_id, start_at, end_at):
            return resource_id
    return None


def _within_working_hours(db: Session, model, id_column, entity_id: UUID, start_at: datetime, end_at: datetime) -> bool:
    local_weekday = start_at.isoweekday()
    start_time = start_at.timetz().replace(tzinfo=None)
    end_time = end_at.timetz().replace(tzinfo=None)
    return db.scalar(
        select(exists().where(
            id_column == entity_id,
            model.is_active.is_(True),
            model.weekday == local_weekday,
            model.start_time <= start_time,
            model.end_time >= end_time,
        ))
    )


def _has_time_off(db: Session, model, id_column, entity_id: UUID, start_at: datetime, end_at: datetime) -> bool:
    return db.scalar(
        select(exists().where(
            id_column == entity_id,
            model.starts_at < end_at,
            model.ends_at > start_at,
        ))
    )


def _has_overlap(
    db: Session,
    id_column,
    entity_id: UUID,
    start_at: datetime,
    end_at: datetime,
    exclude_appointment_id: UUID | None = None,
) -> bool:
    filters = [
        id_column == entity_id,
        Appointment.status.in_(("pending", "confirmed", "checked_in")),
        Appointment.reserved_start_at < end_at,
        Appointment.reserved_end_at > start_at,
    ]
    if exclude_appointment_id is not None:
        filters.append(Appointment.id != exclude_appointment_id)
    return db.scalar(select(exists().where(*filters)))
