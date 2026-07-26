"""JWT auth middleware for FastAPI services (mock JWT — no Keycloak)."""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from .config import get_settings

settings = get_settings()
_bearer = HTTPBearer()


class UserContext(BaseModel):
    user_id: str
    username: str
    role: str
    unit_id: str
    jurisdiction_path: list[str]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> UserContext:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": str(exc)}},
        )

    return UserContext(
        user_id=payload.get("sub", ""),
        username=payload.get("username", ""),
        role=payload.get("role", ""),
        unit_id=payload.get("unitId", ""),
        jurisdiction_path=payload.get("jurisdictionPath", []),
    )


# Convenience alias
JWTBearer = Depends(get_current_user)
