from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from sunbronze_api.schemas.dev import DatabaseSizeReport, DatabaseTableSizeSummary


def format_storage_size(size_bytes: int) -> str:
    units = ("MB", "GB", "TB")
    value = max(float(size_bytes), 0.0) / 1024 / 1024
    unit = units[0]
    for next_unit in units[1:]:
        if value < 1024:
            break
        value /= 1024
        unit = next_unit
    return f"{value:.2f} {unit}"


def get_database_size_report(db: Session) -> DatabaseSizeReport:
    try:
        total_bytes = int(db.execute(text("SELECT pg_database_size(current_database())")).scalar_one())
        table_rows = db.execute(
            text(
                """
                SELECT
                    n.nspname AS schema_name,
                    c.relname AS table_name,
                    pg_total_relation_size(c.oid)::bigint AS total_bytes,
                    pg_relation_size(c.oid)::bigint AS data_bytes,
                    (pg_total_relation_size(c.oid) - pg_relation_size(c.oid))::bigint AS index_bytes
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind IN ('r', 'p')
                    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
                    AND n.nspname NOT LIKE 'pg_toast%'
                ORDER BY total_bytes DESC, schema_name ASC, table_name ASC
                """
            )
        ).mappings()
    except SQLAlchemyError:
        db.rollback()
        return DatabaseSizeReport(total_bytes=0, total_label=format_storage_size(0), tables=[])

    rows = list(table_rows)
    table_total_bytes = sum(int(row["total_bytes"] or 0) for row in rows)
    tables = [
        DatabaseTableSizeSummary(
            schema_name=str(row["schema_name"]),
            table_name=str(row["table_name"]),
            total_bytes=int(row["total_bytes"] or 0),
            data_bytes=int(row["data_bytes"] or 0),
            index_bytes=int(row["index_bytes"] or 0),
            total_label=format_storage_size(int(row["total_bytes"] or 0)),
            percentage=round((int(row["total_bytes"] or 0) / table_total_bytes) * 100, 2) if table_total_bytes else 0,
        )
        for row in rows
    ]

    return DatabaseSizeReport(total_bytes=total_bytes, total_label=format_storage_size(total_bytes), tables=tables)
