from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from sunbronze_api.db.session import get_db_session
from sunbronze_api.schemas.auth import AuthenticatedUser
from sunbronze_api.services.auth import get_authenticated_user, user_has_any_role

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db_session),
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token is required.")

    return get_authenticated_user(db, credentials.credentials)


def require_staff_user(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    if not user_has_any_role(current_user, "owner", "admin", "receptionist", "barber"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role permissions.")
    return current_user
