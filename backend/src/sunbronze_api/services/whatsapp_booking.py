from __future__ import annotations

import re
import unicodedata
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from sunbronze_api.models.entities import Barber, BarberService, Conversation, Customer, Service
from sunbronze_api.models.enums import AppointmentSource, AppointmentStatus, ConversationIntent, ConversationState
from sunbronze_api.schemas.appointments import AppointmentAvailabilityQuery, AppointmentCreate

BUSINESS_TIME_ZONE = ZoneInfo("America/Costa_Rica")
WEEKDAY_NAMES = ("domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado")
DISPLAY_WEEKDAY_NAMES = ("domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado")
BOOKING_KEYWORDS = ("reserv", "cita", "agend", "corte", "barba", "servicio", "book", "appointment", "hair")
HANDOFF_KEYWORDS = ("human", "agent", "handoff", "asesor", "alguien", "persona", "ayuda", "no entiendo")
ANY_BARBER_KEYWORDS = ("cualquiera", "primer", "disponible", "sin preferencia", "anyone", "any")
CONFIRM_KEYWORDS = ("confirmar", "confirmo", "si", "sí", "ok", "dale", "yes", "confirm")
CHANGE_KEYWORDS = ("cambiar", "otra", "no", "volver")


def advance_whatsapp_booking_flow(db: Session, conversation: Conversation, customer: Customer, message_body: str, now: datetime | None = None) -> str:
    """Advance the first WhatsApp booking flow and return the next bot reply."""
    current_time = now or datetime.now(UTC)
    text = _normalize_text(message_body)
    payload = dict(conversation.state_payload or {})

    if _contains_any(text, HANDOFF_KEYWORDS):
        conversation.handed_off_to_human = True
        conversation.active_intent = ConversationIntent.HUMAN_HELP
        conversation.state = ConversationState.WAITING_HUMAN
        conversation.state_payload = payload
        return "Claro. Te paso con el equipo de SunBronze para que te ayuden directamente."

    if conversation.handed_off_to_human:
        conversation.state = ConversationState.WAITING_HUMAN
        return "Tu conversación ya está con el equipo de SunBronze. Te responderán directamente por aquí."

    if _contains_any(text, ("cancel", "cancelar")):
        conversation.active_intent = ConversationIntent.CANCEL
        conversation.state = ConversationState.CANCEL_LOOKUP
        conversation.state_payload = payload
        return "Puedo ayudarte a cancelar tu cita. Por ahora te paso con recepción para confirmar cuál cita deseas cancelar."

    if _contains_any(text, ("reagendar", "mover", "cambiar mi cita", "change", "reschedule")):
        conversation.active_intent = ConversationIntent.RESCHEDULE
        conversation.state = ConversationState.RESCHEDULE_LOOKUP
        conversation.state_payload = payload
        return "Puedo ayudarte a cambiar tu cita. Por ahora te paso con recepción para revisar tus próximas reservas."

    if conversation.active_intent != ConversationIntent.BOOK and conversation.state not in _booking_states():
        if not _contains_any(text, BOOKING_KEYWORDS):
            conversation.active_intent = ConversationIntent.UNKNOWN
            conversation.state = ConversationState.START
            conversation.state_payload = payload
            return "Hola, soy el asistente de SunBronze. Puedo ayudarte a reservar una cita. ¿Qué servicio quieres?"
        conversation.active_intent = ConversationIntent.BOOK
        conversation.state = ConversationState.CHOOSE_SERVICE
        payload = {}

    if conversation.state in (ConversationState.START, ConversationState.DONE):
        conversation.active_intent = ConversationIntent.BOOK
        conversation.state = ConversationState.CHOOSE_SERVICE

    if conversation.state == ConversationState.CHOOSE_SERVICE:
        return _handle_service_choice(db, conversation, payload, text)

    if conversation.state == ConversationState.CHOOSE_BARBER:
        return _handle_barber_choice(db, conversation, payload, text)

    if conversation.state == ConversationState.CHOOSE_DATE:
        return _handle_date_choice(db, conversation, payload, text, current_time)

    if conversation.state == ConversationState.CHOOSE_TIME:
        return _handle_time_choice(conversation, payload, text)

    if conversation.state == ConversationState.CONFIRM_BOOKING:
        return _handle_booking_confirmation(db, conversation, customer, payload, text, message_body)

    conversation.active_intent = ConversationIntent.BOOK
    conversation.state = ConversationState.CHOOSE_SERVICE
    conversation.state_payload = {}
    return _service_menu_reply(db)


def _handle_service_choice(db: Session, conversation: Conversation, payload: dict[str, Any], text: str) -> str:
    services = _active_services(db)
    service = _match_service(services, text)
    if service is None:
        conversation.state_payload = payload
        return _service_menu_reply(db)

    payload = {
        "service_id": str(service.id),
        "service_name": service.name,
        "service_duration_minutes": service.duration_minutes,
        "service_buffer_after_minutes": service.buffer_after_minutes,
    }
    conversation.active_intent = ConversationIntent.BOOK
    conversation.state = ConversationState.CHOOSE_BARBER if service.requires_barber else ConversationState.CHOOSE_DATE
    conversation.state_payload = payload

    if service.requires_barber:
        return (
            f"Perfecto, {service.name}. ¿Tienes algún especialista preferido o buscas el primer horario disponible?\n"
            'Puedes responder con el nombre del especialista o "cualquiera".'
        )
    return f"Perfecto, {service.name}. ¿Para qué día te gustaría reservar?"


def _handle_barber_choice(db: Session, conversation: Conversation, payload: dict[str, Any], text: str) -> str:
    service_id = _payload_uuid(payload, "service_id")
    if service_id is None:
        conversation.state = ConversationState.CHOOSE_SERVICE
        conversation.state_payload = {}
        return _service_menu_reply(db)

    if _contains_any(text, ANY_BARBER_KEYWORDS):
        payload["barber_id"] = None
        payload["barber_name"] = "cualquier especialista disponible"
        payload["any_barber"] = True
        conversation.state = ConversationState.CHOOSE_DATE
        conversation.state_payload = payload
        return "Listo. ¿Para qué día te gustaría reservar? Puedes escribir hoy, mañana, viernes o 15 de abril."

    barber = _match_barber_for_service(db, service_id, text)
    if barber is None:
        barbers = _barbers_for_service(db, service_id)
        barber_names = ", ".join(barber.display_name for barber in barbers) or "nuestro equipo"
        conversation.state_payload = payload
        return f"No encontré ese especialista para este servicio. Puedes elegir {barber_names} o responder \"cualquiera\"."

    payload["barber_id"] = str(barber.id)
    payload["barber_name"] = barber.display_name
    payload["any_barber"] = False
    conversation.state = ConversationState.CHOOSE_DATE
    conversation.state_payload = payload
    return f"Perfecto. ¿Para qué día quieres reservar con {barber.display_name}?"


def _handle_date_choice(db: Session, conversation: Conversation, payload: dict[str, Any], text: str, now: datetime) -> str:
    service_id = _payload_uuid(payload, "service_id")
    if service_id is None:
        conversation.state = ConversationState.CHOOSE_SERVICE
        conversation.state_payload = {}
        return _service_menu_reply(db)

    target_date = _parse_requested_date(text, now)
    if target_date is None:
        conversation.state_payload = payload
        return "No pude entender el día. Puedes escribir algo como hoy, mañana, viernes o 15 de abril."

    service = db.get(Service, service_id)
    if service is None:
        conversation.state = ConversationState.CHOOSE_SERVICE
        conversation.state_payload = {}
        return _service_menu_reply(db)

    barber_id = _payload_uuid(payload, "barber_id")
    slots = _available_slots_for_date(db, service_id, target_date, barber_id)
    if not slots:
        day_name = DISPLAY_WEEKDAY_NAMES[_business_weekday(target_date)]
        conversation.state_payload = {**payload, "requested_date": target_date.isoformat()}
        return f"No encontré horarios disponibles para {service.name} el {day_name}. ¿Quieres probar otro día?"

    barber_names = _barber_names_for_slots(db, slots)
    slot_options = []
    lines = []
    for index, slot in enumerate(slots[:3], start=1):
        barber_name = barber_names.get(str(slot.barber_id)) if slot.barber_id else None
        label = _format_local_time(slot.start_at)
        suffix = f" con {barber_name}" if barber_name and payload.get("any_barber") else ""
        lines.append(f"{index}. {label}{suffix}")
        slot_options.append(
            {
                "index": index,
                "start_at": slot.start_at.isoformat(),
                "end_at": slot.end_at.isoformat(),
                "barber_id": str(slot.barber_id) if slot.barber_id else None,
                "barber_name": barber_name,
                "resource_id": str(slot.resource_id) if slot.resource_id else None,
            }
        )

    payload["requested_date"] = target_date.isoformat()
    payload["slot_options"] = slot_options
    conversation.state = ConversationState.CHOOSE_TIME
    conversation.state_payload = payload
    day_name = DISPLAY_WEEKDAY_NAMES[_business_weekday(target_date)]
    return f"Estos son los horarios disponibles para {service.name} el {day_name}:\n" + "\n".join(lines) + "\n\n¿Cuál prefieres?"


def _handle_time_choice(conversation: Conversation, payload: dict[str, Any], text: str) -> str:
    slots = payload.get("slot_options") or []
    selected = _select_slot(slots, text)
    if selected is None:
        return "No pude identificar ese horario. Responde con el número de opción o una hora como 10:30."

    payload["selected_slot"] = selected
    payload["barber_id"] = selected.get("barber_id")
    payload["barber_name"] = selected.get("barber_name") or payload.get("barber_name")
    payload["resource_id"] = selected.get("resource_id")
    conversation.state = ConversationState.CONFIRM_BOOKING
    conversation.state_payload = payload

    service_name = payload.get("service_name", "el servicio")
    barber_name = payload.get("barber_name")
    barber_text = f" con {barber_name}" if barber_name else ""
    return (
        f"Excelente. Tengo disponible {service_name} el {_format_local_date(selected['start_at'])} "
        f"a las {_format_local_time(selected['start_at'])}{barber_text}.\n"
        "Me confirmas tu nombre para la cita?"
    )


def _handle_booking_confirmation(db: Session, conversation: Conversation, customer: Customer, payload: dict[str, Any], text: str, raw_body: str) -> str:
    selected = payload.get("selected_slot")
    service_id = _payload_uuid(payload, "service_id")
    if not selected or service_id is None:
        conversation.state = ConversationState.CHOOSE_SERVICE
        conversation.state_payload = {}
        return _service_menu_reply(db)

    if not payload.get("customer_name"):
        name = raw_body.strip()
        if _contains_any(text, CONFIRM_KEYWORDS) or _contains_any(text, CHANGE_KEYWORDS) or len(name) < 2:
            return "Me confirmas tu nombre para la cita?"
        payload["customer_name"] = name
        _apply_customer_name(customer, name)
        conversation.state_payload = payload
        service_name = payload.get("service_name", "Servicio")
        barber_name = payload.get("barber_name") or "primer especialista disponible"
        return (
            "Gracias. Confirmo:\n"
            f"Servicio: {service_name}\n"
            f"Especialista: {barber_name}\n"
            f"Día: {_format_local_date(selected['start_at'])}\n"
            f"Hora: {_format_local_time(selected['start_at'])}\n\n"
            'Responde "confirmar" para crear la cita o "cambiar" para buscar otra hora.'
        )

    if _contains_any(text, CHANGE_KEYWORDS):
        conversation.state = ConversationState.CHOOSE_DATE
        payload.pop("selected_slot", None)
        payload.pop("slot_options", None)
        conversation.state_payload = payload
        return "Claro. ¿Para qué día quieres buscar otro horario?"

    if not _contains_any(text, CONFIRM_KEYWORDS):
        return 'Para crear la cita responde "confirmar" o escribe "cambiar" para buscar otra hora.'

    try:
        from sunbronze_api.services.appointments import create_appointment

        appointment = create_appointment(
            db,
            AppointmentCreate(
                customer_id=customer.id,
                service_id=service_id,
                barber_id=_coerce_uuid(selected.get("barber_id")),
                resource_id=_coerce_uuid(selected.get("resource_id")),
                conversation_id=conversation.id,
                source=AppointmentSource.WHATSAPP,
                status=AppointmentStatus.CONFIRMED,
                scheduled_start_at=datetime.fromisoformat(selected["start_at"]),
                scheduled_end_at=datetime.fromisoformat(selected["end_at"]),
                notes=f"Reservado por WhatsApp para {payload.get('customer_name')}.",
                internal_notes="Cita creada por el chatbot de WhatsApp.",
            ),
        )
    except HTTPException as exc:
        conversation.state = ConversationState.CHOOSE_DATE
        payload.pop("selected_slot", None)
        payload.pop("slot_options", None)
        conversation.state_payload = payload
        return f"Ese horario ya no está disponible: {exc.detail} ¿Quieres buscar otro día u hora?"

    payload["appointment_id"] = str(appointment.id)
    conversation.state = ConversationState.DONE
    conversation.state_payload = payload
    barber_text = f" con {payload['barber_name']}" if payload.get("barber_name") else ""
    return (
        f"Tu cita quedó reservada. Te esperamos en SunBronze el {_format_local_date(selected['start_at'])} "
        f"a las {_format_local_time(selected['start_at'])}{barber_text}. "
        'Si necesitas cambiarla, escribe "cambiar mi cita".'
    )


def _service_menu_reply(db: Session) -> str:
    services = _active_services(db)
    if not services:
        return "Hola, soy el asistente de SunBronze. En este momento no tengo servicios activos para reservar."
    lines = [f"{index}. {service.name}" for index, service in enumerate(services, start=1)]
    return "Hola, soy el asistente de SunBronze. Claro, te ayudo a reservar.\n¿Qué servicio quieres?\n" + "\n".join(lines)


def _active_services(db: Session) -> list[Service]:
    return list(db.scalars(select(Service).where(Service.is_active.is_(True)).order_by(Service.name.asc())).all())


def _match_service(services: list[Service], text: str) -> Service | None:
    if text.isdigit():
        index = int(text)
        if 1 <= index <= len(services):
            return services[index - 1]

    ranked = sorted(services, key=lambda service: len(_normalize_text(f"{service.name} {service.code}")), reverse=True)
    for service in ranked:
        candidates = {_normalize_text(service.name), _normalize_text(service.code)}
        if service.code == "corte-barba":
            candidates.update(("corte y barba", "corte barba", "corte + barba"))
        if any(candidate and candidate in text for candidate in candidates):
            return service
    return None


def _match_barber_for_service(db: Session, service_id: UUID, text: str) -> Barber | None:
    for barber in _barbers_for_service(db, service_id):
        if _normalize_text(barber.display_name) in text or _normalize_text(barber.first_name) in text or _normalize_text(barber.code) in text:
            return barber
    return None


def _barbers_for_service(db: Session, service_id: UUID) -> list[Barber]:
    return list(
        db.scalars(
            select(Barber)
            .join(BarberService, BarberService.barber_id == Barber.id)
            .where(Barber.is_active.is_(True), BarberService.is_active.is_(True), BarberService.service_id == service_id)
            .order_by(Barber.display_name.asc())
        ).all()
    )


def _available_slots_for_date(db: Session, service_id: UUID, target_date: date, barber_id: UUID | None):
    from sunbronze_api.services.appointments import list_available_slots

    starts_at = datetime.combine(target_date, time(0, 0), BUSINESS_TIME_ZONE)
    ends_at = starts_at + timedelta(days=1)
    return list_available_slots(
        db,
        AppointmentAvailabilityQuery(
            service_id=service_id,
            barber_id=barber_id,
            starts_at=starts_at,
            ends_at=ends_at,
            limit=12,
        ),
    )


def _barber_names_for_slots(db: Session, slots) -> dict[str, str]:
    barber_ids = [slot.barber_id for slot in slots if slot.barber_id]
    if not barber_ids:
        return {}
    return {
        str(barber.id): barber.display_name
        for barber in db.scalars(select(Barber).where(Barber.id.in_(barber_ids))).all()
    }


def _parse_requested_date(text: str, now: datetime) -> date | None:
    local_today = now.astimezone(BUSINESS_TIME_ZONE).date()
    if "hoy" in text or "today" in text:
        return local_today
    if "manana" in text or "tomorrow" in text:
        return local_today + timedelta(days=1)

    for index, weekday in enumerate(WEEKDAY_NAMES):
        if weekday in text:
            current_weekday = _business_weekday(local_today)
            days_ahead = (index - current_weekday) % 7
            return local_today + timedelta(days=days_ahead)

    match = re.search(r"\b(\d{1,2})(?:\s+de)?\s+([a-z]+)\b", text)
    if match:
        day = int(match.group(1))
        month = _month_number(match.group(2))
        if month is None:
            return None
        year = local_today.year
        try:
            parsed = date(year, month, day)
        except ValueError:
            return None
        if parsed < local_today:
            parsed = date(year + 1, month, day)
        return parsed

    iso_match = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", text)
    if iso_match:
        try:
            return date(int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3)))
        except ValueError:
            return None

    return None


def _month_number(value: str) -> int | None:
    months = {
        "enero": 1,
        "febrero": 2,
        "marzo": 3,
        "abril": 4,
        "mayo": 5,
        "junio": 6,
        "julio": 7,
        "agosto": 8,
        "septiembre": 9,
        "setiembre": 9,
        "octubre": 10,
        "noviembre": 11,
        "diciembre": 12,
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }
    return months.get(_normalize_text(value))


def _select_slot(slots: list[dict[str, Any]], text: str) -> dict[str, Any] | None:
    number_match = re.fullmatch(r"\D*(\d+)\D*", text)
    if number_match:
        index = int(number_match.group(1))
        for slot in slots:
            if slot.get("index") == index:
                return slot

    requested_time = _parse_time_text(text)
    if requested_time is None:
        return None
    for slot in slots:
        slot_time = datetime.fromisoformat(slot["start_at"]).astimezone(BUSINESS_TIME_ZONE).time().replace(second=0, microsecond=0)
        if slot_time == requested_time:
            return slot
    return None


def _parse_time_text(text: str) -> time | None:
    match = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?\b", text)
    if not match:
        return None
    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    meridian = match.group(3) or ""
    if "p" in meridian and hour < 12:
        hour += 12
    if "a" in meridian and hour == 12:
        hour = 0
    if hour > 23 or minute > 59:
        return None
    return time(hour, minute)


def _apply_customer_name(customer: Customer, name: str) -> None:
    customer.display_name = name
    parts = name.split()
    customer.first_name = parts[0]
    customer.last_name = " ".join(parts[1:]) or customer.last_name


def _booking_states() -> set[ConversationState]:
    return {
        ConversationState.CHOOSE_SERVICE,
        ConversationState.CHOOSE_BARBER,
        ConversationState.CHOOSE_DATE,
        ConversationState.CHOOSE_TIME,
        ConversationState.CONFIRM_BOOKING,
    }


def _payload_uuid(payload: dict[str, Any], key: str) -> UUID | None:
    return _coerce_uuid(payload.get(key))


def _coerce_uuid(value: Any) -> UUID | None:
    if not value:
        return None
    if isinstance(value, UUID):
        return value
    return UUID(str(value))


def _format_local_time(value: str | datetime) -> str:
    parsed = datetime.fromisoformat(value) if isinstance(value, str) else value
    return parsed.astimezone(BUSINESS_TIME_ZONE).strftime("%H:%M")


def _format_local_date(value: str | datetime) -> str:
    parsed = datetime.fromisoformat(value) if isinstance(value, str) else value
    local_date = parsed.astimezone(BUSINESS_TIME_ZONE).date()
    return f"{DISPLAY_WEEKDAY_NAMES[_business_weekday(local_date)]} {local_date.day}/{local_date.month}"


def _business_weekday(value: date) -> int:
    return value.isoweekday() % 7


def _contains_any(text: str, needles: tuple[str, ...]) -> bool:
    return any(needle in text for needle in needles)


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.lower())
    ascii_text = "".join(character for character in normalized if not unicodedata.combining(character))
    return re.sub(r"\s+", " ", ascii_text).strip()
