from __future__ import annotations

from datetime import date, datetime, time
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from sunbronze_api.db.base import Base
from sunbronze_api.models.base_mixins import ActiveMixin, TimestampMixin, UUIDPrimaryKeyMixin, pg_enum, uuid_fk
from sunbronze_api.models.enums import (
    AppointmentSource,
    AppointmentStatus,
    ConversationIntent,
    ConversationState,
    MessageDirection,
    MessageKind,
    MessageStatus,
    ReminderStatus,
)


class Location(UUIDPrimaryKeyMixin, ActiveMixin, TimestampMixin, Base):
    __tablename__ = "locations"

    code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone_e164: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    address_line_1: Mapped[str | None] = mapped_column(Text)
    address_line_2: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(Text)
    postal_code: Mapped[str | None] = mapped_column(Text)
    country_code: Mapped[str | None] = mapped_column(String(2))
    time_zone: Mapped[str] = mapped_column(Text, nullable=False, default="America/Costa_Rica")

    barbers: Mapped[list[Barber]] = relationship(back_populates="location")
    resources: Mapped[list[Resource]] = relationship(back_populates="location")
    system_users: Mapped[list[SystemUser]] = relationship(back_populates="location")


class Barber(UUIDPrimaryKeyMixin, ActiveMixin, TimestampMixin, Base):
    __tablename__ = "barbers"

    location_id: Mapped[UUID | None] = uuid_fk("app.locations.id")
    code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    first_name: Mapped[str] = mapped_column(Text, nullable=False)
    last_name: Mapped[str | None] = mapped_column(Text)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str | None] = mapped_column(Text)
    phone_e164: Mapped[str | None] = mapped_column(Text)
    time_zone: Mapped[str] = mapped_column(Text, nullable=False, default="America/Costa_Rica")

    location: Mapped[Location | None] = relationship(back_populates="barbers")
    services: Mapped[list[BarberService]] = relationship(back_populates="barber")
    customers: Mapped[list[Customer]] = relationship(back_populates="preferred_barber")
    appointments: Mapped[list[Appointment]] = relationship(back_populates="barber")
    working_hours: Mapped[list[BarberWorkingHours]] = relationship(back_populates="barber")
    time_off_entries: Mapped[list[BarberTimeOff]] = relationship(back_populates="barber")
    system_user: Mapped[SystemUser | None] = relationship(back_populates="barber")


class SystemUser(UUIDPrimaryKeyMixin, ActiveMixin, TimestampMixin, Base):
    __tablename__ = "system_users"

    location_id: Mapped[UUID | None] = uuid_fk("app.locations.id")
    barber_id: Mapped[UUID | None] = uuid_fk("app.barbers.id", unique=True, ondelete="SET NULL")
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password_hash: Mapped[str | None] = mapped_column(Text)
    first_name: Mapped[str] = mapped_column(Text, nullable=False)
    last_name: Mapped[str | None] = mapped_column(Text)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    phone_e164: Mapped[str | None] = mapped_column(Text)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    location: Mapped[Location | None] = relationship(back_populates="system_users")
    barber: Mapped[Barber | None] = relationship(back_populates="system_user")
    user_roles: Mapped[list[UserRole]] = relationship(back_populates="user")
    assigned_conversations: Mapped[list[Conversation]] = relationship(back_populates="assigned_staff_user")


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "roles"

    code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    user_roles: Mapped[list[UserRole]] = relationship(back_populates="role")


class UserRole(TimestampMixin, Base):
    __tablename__ = "user_roles"

    user_id: Mapped[UUID] = uuid_fk("app.system_users.id", nullable=False, ondelete="CASCADE", unique=False)
    role_id: Mapped[UUID] = uuid_fk("app.roles.id", nullable=False, ondelete="CASCADE", unique=False)

    __mapper_args__ = {"primary_key": [user_id, role_id]}

    user: Mapped[SystemUser] = relationship(back_populates="user_roles")
    role: Mapped[Role] = relationship(back_populates="user_roles")


class Service(UUIDPrimaryKeyMixin, ActiveMixin, TimestampMixin, Base):
    __tablename__ = "services"

    code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    requires_barber: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    requires_resource: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    buffer_before_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    buffer_after_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    price_cents: Mapped[int | None] = mapped_column(Integer)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")

    barber_assignments: Mapped[list[BarberService]] = relationship(back_populates="service")
    appointments: Mapped[list[Appointment]] = relationship(back_populates="service")


class Resource(UUIDPrimaryKeyMixin, ActiveMixin, TimestampMixin, Base):
    __tablename__ = "resources"

    location_id: Mapped[UUID] = uuid_fk("app.locations.id", nullable=False, ondelete="CASCADE")
    code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    resource_type: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    location: Mapped[Location] = relationship(back_populates="resources")
    appointments: Mapped[list[Appointment]] = relationship(back_populates="resource")
    working_hours: Mapped[list[ResourceWorkingHours]] = relationship(back_populates="resource")
    time_off_entries: Mapped[list[ResourceTimeOff]] = relationship(back_populates="resource")


class BarberService(ActiveMixin, TimestampMixin, Base):
    __tablename__ = "barber_services"

    barber_id: Mapped[UUID] = uuid_fk("app.barbers.id", nullable=False, ondelete="CASCADE")
    service_id: Mapped[UUID] = uuid_fk("app.services.id", nullable=False, ondelete="CASCADE")
    custom_duration_minutes: Mapped[int | None] = mapped_column(Integer)
    custom_price_cents: Mapped[int | None] = mapped_column(Integer)

    __mapper_args__ = {"primary_key": [barber_id, service_id]}

    barber: Mapped[Barber] = relationship(back_populates="services")
    service: Mapped[Service] = relationship(back_populates="barber_assignments")


class Customer(UUIDPrimaryKeyMixin, ActiveMixin, TimestampMixin, Base):
    __tablename__ = "customers"

    whatsapp_phone_e164: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    first_name: Mapped[str | None] = mapped_column(Text)
    last_name: Mapped[str | None] = mapped_column(Text)
    display_name: Mapped[str | None] = mapped_column(Text)
    preferred_barber_id: Mapped[UUID | None] = uuid_fk("app.barbers.id")
    notes: Mapped[str | None] = mapped_column(Text)

    preferred_barber: Mapped[Barber | None] = relationship(back_populates="customers")
    conversations: Mapped[list[Conversation]] = relationship(back_populates="customer")
    appointments: Mapped[list[Appointment]] = relationship(back_populates="customer")
    whatsapp_messages: Mapped[list[WhatsappMessage]] = relationship(back_populates="customer")


class BarberWorkingHours(UUIDPrimaryKeyMixin, ActiveMixin, TimestampMixin, Base):
    __tablename__ = "barber_working_hours"

    barber_id: Mapped[UUID] = uuid_fk("app.barbers.id", nullable=False, ondelete="CASCADE")
    weekday: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    start_time: Mapped[time] = mapped_column(nullable=False)
    end_time: Mapped[time] = mapped_column(nullable=False)

    barber: Mapped[Barber] = relationship(back_populates="working_hours")


class BarberTimeOff(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "barber_time_off"

    barber_id: Mapped[UUID] = uuid_fk("app.barbers.id", nullable=False, ondelete="CASCADE")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    is_all_day: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    barber: Mapped[Barber] = relationship(back_populates="time_off_entries")


class ResourceWorkingHours(UUIDPrimaryKeyMixin, ActiveMixin, TimestampMixin, Base):
    __tablename__ = "resource_working_hours"

    resource_id: Mapped[UUID] = uuid_fk("app.resources.id", nullable=False, ondelete="CASCADE")
    weekday: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    start_time: Mapped[time] = mapped_column(nullable=False)
    end_time: Mapped[time] = mapped_column(nullable=False)

    resource: Mapped[Resource] = relationship(back_populates="working_hours")


class ResourceTimeOff(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "resource_time_off"

    resource_id: Mapped[UUID] = uuid_fk("app.resources.id", nullable=False, ondelete="CASCADE")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    is_all_day: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    resource: Mapped[Resource] = relationship(back_populates="time_off_entries")


class Conversation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "conversations"

    customer_id: Mapped[UUID] = uuid_fk("app.customers.id", nullable=False, ondelete="CASCADE")
    whatsapp_chat_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    state: Mapped[ConversationState] = mapped_column(pg_enum(ConversationState, name="conversation_state"), nullable=False, default=ConversationState.START)
    active_intent: Mapped[ConversationIntent] = mapped_column(
        pg_enum(ConversationIntent, name="conversation_intent"),
        nullable=False,
        default=ConversationIntent.UNKNOWN,
    )
    state_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    handed_off_to_human: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    assigned_staff_user_id: Mapped[UUID | None] = uuid_fk("app.system_users.id", ondelete="SET NULL")
    last_inbound_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_outbound_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    customer: Mapped[Customer] = relationship(back_populates="conversations")
    assigned_staff_user: Mapped[SystemUser | None] = relationship(back_populates="assigned_conversations")
    appointments: Mapped[list[Appointment]] = relationship(back_populates="conversation")
    whatsapp_messages: Mapped[list[WhatsappMessage]] = relationship(back_populates="conversation")


class Appointment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "appointments"

    customer_id: Mapped[UUID] = uuid_fk("app.customers.id", nullable=False)
    barber_id: Mapped[UUID | None] = uuid_fk("app.barbers.id")
    resource_id: Mapped[UUID | None] = uuid_fk("app.resources.id")
    service_id: Mapped[UUID] = uuid_fk("app.services.id", nullable=False)
    conversation_id: Mapped[UUID | None] = uuid_fk("app.conversations.id")
    source: Mapped[AppointmentSource] = mapped_column(pg_enum(AppointmentSource, name="appointment_source"), nullable=False, default=AppointmentSource.WHATSAPP)
    status: Mapped[AppointmentStatus] = mapped_column(pg_enum(AppointmentStatus, name="appointment_status"), nullable=False, default=AppointmentStatus.PENDING)
    scheduled_start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scheduled_end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    buffer_before_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    buffer_after_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reserved_start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reserved_end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    internal_notes: Mapped[str | None] = mapped_column(Text)
    cancelled_reason: Mapped[str | None] = mapped_column(Text)

    customer: Mapped[Customer] = relationship(back_populates="appointments")
    barber: Mapped[Barber | None] = relationship(back_populates="appointments")
    resource: Mapped[Resource | None] = relationship(back_populates="appointments")
    service: Mapped[Service] = relationship(back_populates="appointments")
    conversation: Mapped[Conversation | None] = relationship(back_populates="appointments")
    events: Mapped[list[AppointmentEvent]] = relationship(back_populates="appointment")
    whatsapp_messages: Mapped[list[WhatsappMessage]] = relationship(back_populates="appointment")
    reminder_jobs: Mapped[list[ReminderJob]] = relationship(back_populates="appointment")


class AppointmentEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "appointment_events"

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    appointment_id: Mapped[UUID] = uuid_fk("app.appointments.id", nullable=False, ondelete="CASCADE")
    event_name: Mapped[str] = mapped_column(Text, nullable=False)
    actor_type: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[str | None] = mapped_column(Text)
    actor_user_id: Mapped[UUID | None] = uuid_fk("app.system_users.id", ondelete="SET NULL")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)

    appointment: Mapped[Appointment] = relationship(back_populates="events")


class WhatsappMessage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "whatsapp_messages"

    conversation_id: Mapped[UUID | None] = uuid_fk("app.conversations.id", ondelete="SET NULL")
    customer_id: Mapped[UUID | None] = uuid_fk("app.customers.id", ondelete="SET NULL")
    appointment_id: Mapped[UUID | None] = uuid_fk("app.appointments.id", ondelete="SET NULL")
    direction: Mapped[MessageDirection] = mapped_column(pg_enum(MessageDirection, name="message_direction"), nullable=False)
    status: Mapped[MessageStatus] = mapped_column(pg_enum(MessageStatus, name="message_status"), nullable=False, default=MessageStatus.RECEIVED)
    kind: Mapped[MessageKind] = mapped_column(pg_enum(MessageKind, name="message_kind"), nullable=False, default=MessageKind.TEXT)
    provider_name: Mapped[str] = mapped_column(Text, nullable=False, default="meta_cloud_api")
    provider_message_id: Mapped[str | None] = mapped_column(Text, unique=True)
    template_name: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    conversation: Mapped[Conversation | None] = relationship(back_populates="whatsapp_messages")
    customer: Mapped[Customer | None] = relationship(back_populates="whatsapp_messages")
    appointment: Mapped[Appointment | None] = relationship(back_populates="whatsapp_messages")
    reminder_jobs: Mapped[list[ReminderJob]] = relationship(back_populates="sent_message")


class ReminderJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reminder_jobs"

    appointment_id: Mapped[UUID] = uuid_fk("app.appointments.id", nullable=False, ondelete="CASCADE")
    reminder_type: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[ReminderStatus] = mapped_column(pg_enum(ReminderStatus, name="reminder_status"), nullable=False, default=ReminderStatus.PENDING)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    sent_message_id: Mapped[UUID | None] = uuid_fk("app.whatsapp_messages.id")
    last_error: Mapped[str | None] = mapped_column(Text)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    appointment: Mapped[Appointment] = relationship(back_populates="reminder_jobs")
    sent_message: Mapped[WhatsappMessage | None] = relationship(back_populates="reminder_jobs")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[UUID | None] = mapped_column(nullable=True)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    actor_type: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[str | None] = mapped_column(Text)
    actor_user_id: Mapped[UUID | None] = uuid_fk("app.system_users.id", ondelete="SET NULL")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
