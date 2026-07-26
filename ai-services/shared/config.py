"""Shared configuration using pydantic-settings."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://drishti:drishti_secret@localhost:5432/drishti"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "drishti_neo4j"

    # JWT (mock — no Keycloak)
    jwt_secret: str = "drishti_jwt_super_secret_hackathon_2026"
    jwt_algorithm: str = "HS256"

    # Ollama (self-hosted LLM)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "drishti_minio"
    minio_secret_key: str = "drishti_minio_secret"
    minio_bucket: str = "drishti-evidence"

    # Thresholds
    narrative_confidence_threshold: float = 0.6
    similarity_default_threshold: float = 0.7
    voice_confidence_threshold: float = 0.6
    anomaly_zscore_threshold: float = 2.5
    anomaly_baseline_window_days: int = 90

    # Service
    port: int = 8000
    log_level: str = "INFO"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
