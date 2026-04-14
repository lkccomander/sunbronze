from pydantic import BaseModel


class DatabaseTableSizeSummary(BaseModel):
    schema_name: str
    table_name: str
    total_bytes: int
    data_bytes: int
    index_bytes: int
    total_label: str
    percentage: float


class DatabaseSizeReport(BaseModel):
    total_bytes: int
    total_label: str
    tables: list[DatabaseTableSizeSummary]
