from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from sunbronze_api.db.session import get_db_session
from sunbronze_api.schemas.auth import AuthToken, LoginRequest
from sunbronze_api.services.auth import authenticate_user

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=AuthToken)
def login_route(payload: LoginRequest, db: Session = Depends(get_db_session)) -> AuthToken:
    return authenticate_user(db, payload.email, payload.password)
