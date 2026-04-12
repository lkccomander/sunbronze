from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from sunbronze_api.api.deps import get_current_user
from sunbronze_api.db.session import get_db_session
from sunbronze_api.schemas.auth import AuthToken, AuthenticatedUser, LoginRequest
from sunbronze_api.services.auth import authenticate_user

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=AuthToken)
def login_route(payload: LoginRequest, db: Session = Depends(get_db_session)) -> AuthToken:
    return authenticate_user(db, payload.email, payload.password)


@router.get("/me", response_model=AuthenticatedUser)
def me_route(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    return current_user
