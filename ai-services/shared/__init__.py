"""
Shared configuration, database clients, auth middleware
used by all FastAPI AI services.
"""
from .config import Settings, get_settings
from .db import get_db_session, get_neo4j_driver, get_redis_client
from .auth import JWTBearer, get_current_user, UserContext
from .schemas import ErrorResponse, PaginatedResponse

__all__ = [
    "Settings", "get_settings",
    "get_db_session", "get_neo4j_driver", "get_redis_client",
    "JWTBearer", "get_current_user", "UserContext",
    "ErrorResponse", "PaginatedResponse",
]
