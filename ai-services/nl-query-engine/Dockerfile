FROM python:3.11-slim

WORKDIR /app

# Install system deps for numpy/scipy/prophet
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev ffmpeg && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-dev --no-interaction 2>/dev/null || \
    pip install --no-cache-dir fastapi uvicorn[standard] pydantic pydantic-settings \
        asyncpg sqlalchemy[asyncio] redis neo4j httpx python-jose[cryptography] \
        python-multipart aiofiles minio sentence-transformers numpy scikit-learn

COPY shared/ ./shared/
COPY nl-query-engine/ ./nl-query-engine/

EXPOSE 8001
WORKDIR /app/nl-query-engine
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
