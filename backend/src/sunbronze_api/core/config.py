from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    app_name: str = "SunBronze API"
    environment: str = Field(default="local", validation_alias="SUNBRONZE_ENV")
    debug: bool = True
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/sunbronze",
        validation_alias=AliasChoices("SUNBRONZE_DATABASE_URL", "DATABASE_URL"),
    )
    whatsapp_meta_verify_token: str | None = None
    whatsapp_meta_app_secret: str | None = None
    whatsapp_meta_access_token: str | None = None
    whatsapp_meta_phone_number_id: str | None = None
    whatsapp_meta_graph_api_version: str = "v23.0"

    model_config = SettingsConfigDict(
        env_prefix="SUNBRONZE_",
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
