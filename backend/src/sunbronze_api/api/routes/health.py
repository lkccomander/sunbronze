from fastapi import APIRouter, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from sunbronze_api.core.config import get_settings
from sunbronze_api.db.session import engine

router = APIRouter()


@router.get("/health")
def healthcheck(response: Response) -> dict[str, str]:
    settings = get_settings()
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "degraded",
            "app": settings.app_name,
            "environment": settings.environment,
            "database": "unavailable",
        }

    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "database": "ok",
    }
