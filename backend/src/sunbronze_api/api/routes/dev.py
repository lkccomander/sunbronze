from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from sunbronze_api.api.deps import require_admin_user
from sunbronze_api.db.session import get_db_session
from sunbronze_api.schemas.auth import AuthenticatedUser
from sunbronze_api.schemas.dev import DatabaseSizeReport
from sunbronze_api.services.dev import get_database_size_report

router = APIRouter(prefix="/dev")


@router.get("/database-size", response_model=DatabaseSizeReport)
def database_size_report_route(
    _: AuthenticatedUser = Depends(require_admin_user),
    db: Session = Depends(get_db_session),
) -> DatabaseSizeReport:
    return get_database_size_report(db)
