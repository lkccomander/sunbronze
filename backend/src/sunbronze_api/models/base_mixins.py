from datetime import datetime
from enum import Enum as PyEnum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ActiveMixin:
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")


class UUIDPrimaryKeyMixin:
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)


def uuid_fk(target: str, *, nullable: bool = True, unique: bool = False, ondelete: str | None = None):
    return mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(target, ondelete=ondelete),
        nullable=nullable,
        unique=unique,
    )


def pg_enum(enum_cls: type[PyEnum], *, name: str, schema: str = "app") -> Enum:
    return Enum(
        enum_cls,
        name=name,
        schema=schema,
        values_callable=lambda members: [member.value for member in members],
    )


def text_column(*, nullable: bool = True) -> Mapped[str | None]:
    return mapped_column(Text, nullable=nullable)


def string_column(length: int | None = None, *, nullable: bool = True, unique: bool = False) -> Mapped[str | None]:
    return mapped_column(String(length), nullable=nullable, unique=unique)
