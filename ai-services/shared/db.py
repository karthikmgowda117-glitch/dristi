"""Shared database clients: asyncpg (Postgres), Neo4j, Redis."""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from neo4j import AsyncGraphDatabase, AsyncDriver
from redis.asyncio import Redis
from .config import get_settings

settings = get_settings()

# ─── PostgreSQL via SQLAlchemy async ─────────────────────────────────────────
_engine = create_async_engine(settings.database_url, pool_size=10, max_overflow=20, echo=False)
_session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# ─── Neo4j ────────────────────────────────────────────────────────────────────
_neo4j_driver: AsyncDriver | None = None

async def get_neo4j_driver() -> AsyncDriver:
    global _neo4j_driver
    if _neo4j_driver is None:
        _neo4j_driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _neo4j_driver

# ─── Redis ────────────────────────────────────────────────────────────────────
_redis_client: Redis | None = None

async def get_redis_client() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client
