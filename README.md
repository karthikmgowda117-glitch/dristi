# Project Drishti — Backend & API

**Drishti** is an AI-powered Crime Intelligence Platform built for the Karnataka State Police.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│               NGINX API Gateway  :8080                          │
│        Rate limiting · CORS · Auth proxy · Route dispatch       │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │ NestJS Core Services        │   FastAPI AI Services
          │ (TypeScript, TypeORM)       │   (Python, SQLAlchemy async)
          ├─────────────────────────────┤   ┌─────────────────────────┐
          │ auth-service       :3001    │   │ nl-query-engine   :8001 │
          │ case-service       :3002    │   │ embedding-service :8002 │
          │ people-service     :3003    │   │ anomaly-engine    :8003 │
          │ unit-service       :3004    │   │ graph-orchestrator:8004 │
          │ evidence-service   :3005    │   │ explainability    :8005 │
          │ alert-service      :3006    │   │ face-similarity   :8006 │
          │ audit-service      :3007    │   │ cctv-metadata     :8007 │
          │ task-service       :3008    │   │ vehicle-reid      :8008 │
          │ digest-service     :3009    │   │ voice-stt         :8009 │
          │ admin-service      :3010    │   │ trend-forecast    :8010 │
          │ performance-service:3011    │   │ narrative-extract :8011 │
          │ report-service     :3012    │   │ intake-assist     :8012 │
          └─────────────────────────────┘   │ officer-copilot   :8013 │
                                            └─────────────────────────┘
          ┌──────────────────────────────────────────────────────────┐
          │ Data Layer                                               │
          │  PostgreSQL+PostGIS+pgvector :5432                      │
          │  Neo4j                       :7687                      │
          │  Redis                       :6379                      │
          │  MinIO                       :9000                      │
          │  Ollama (LLM)               :11434                      │
          └──────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Prerequisites
- Docker + Docker Compose
- Node.js 20+ (for local NestJS development)
- Python 3.11+ (for local FastAPI development)

### 2. Environment setup
```bash
cp .env.example .env
# Edit .env as needed — defaults work for local Docker Compose
```

### 3. Start everything
```bash
cd infra
docker compose up -d
```

This starts: PostgreSQL, Neo4j, Redis, MinIO, Ollama, all NestJS services, all FastAPI services, NGINX gateway.

### 4. Pull Ollama model (first time only)
```bash
docker exec -it drishti_ollama ollama pull llama3.2
```

### 5. Test the API
```bash
# Login (mock JWT — no Keycloak needed)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "priya.rao", "password": "password123"}'

# Use returned accessToken in subsequent requests
export TOKEN="<access_token>"

# List cases (jurisdiction-scoped)
curl http://localhost:8080/api/v1/cases?pageSize=5 \
  -H "Authorization: Bearer $TOKEN"

# NL Query
curl -X POST http://localhost:8080/api/v1/ai/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "show theft cases in Koramangala last 30 days"}'
```

---

## Seeded Demo Users

| Username | Password | Role | Unit |
|---|---|---|---|
| `priya.rao` | `password123` | INVESTIGATOR | Koramangala PS |
| `manjunath.k` | `password123` | SHO | Koramangala PS |
| `ananya.shetty` | `password123` | ANALYST | Bengaluru Urban District |
| `ramesh.iyengar` | `password123` | SUPERVISOR | Bengaluru Urban District |
| `addl.dgp` | `password123` | POLICYMAKER | Karnataka State |
| `farha.sheikh` | `password123` | ADMIN | Karnataka State |

---

## API Reference

All APIs are served through NGINX on port **8080**. Swagger UI is available on each service:
- Auth: http://localhost:3001/api/docs
- Case: http://localhost:3002/api/docs

### Core REST Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Login (mock JWT) |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| GET | `/api/v1/auth/me` | Current user + jurisdiction |
| GET | `/api/v1/units/tree` | Jurisdiction tree |
| GET | `/api/v1/cases` | List cases (jurisdiction-scoped) |
| POST | `/api/v1/cases` | Register FIR (SHO/Admin) |
| GET | `/api/v1/cases/:id` | Case detail (PII-stripped for Policymaker) |
| PATCH | `/api/v1/cases/:id` | Update status/officer/narrative |
| GET | `/api/v1/cases/:id/timeline` | Ordered timeline events |
| GET | `/api/v1/cases/:id/intake-assist` | FR-32: Proactive intake assist |
| POST | `/api/v1/cases/:id/evidence` | Upload evidence (max 100MB) |
| GET | `/api/v1/evidence/:id/custody` | Chain-of-custody trail |
| GET | `/api/v1/evidence/:id/verify` | Integrity re-verification |
| GET | `/api/v1/alerts` | Anomaly alerts (jurisdiction-scoped) |
| PATCH | `/api/v1/alerts/:id` | Dismiss/escalate alert |
| GET | `/api/v1/cases/:id/tasks` | FR-39: Task checklist |
| POST | `/api/v1/cases/:id/tasks` | Create task |

### AI Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/ai/query` | NL Query → Intent → Execute |
| POST | `/api/v1/ai/voice-query` | Voice → STT → NL Query |
| GET | `/api/v1/ai/trace/:traceId` | Explainability trace |
| GET | `/api/v1/cases/:id/similar` | FR-29: Similar case search |
| GET | `/api/v1/graph/network` | FR-33: Cross-case network graph |
| POST | `/api/v1/forecast` | FR-37: Aggregate crime forecast |
| POST | `/api/v1/intel/face/match` | FR-30: Face similarity search |
| GET | `/api/v1/intel/cctv/detections` | CCTV detection events |
| GET | `/api/v1/intel/vehicle/sightings` | Vehicle sighting cross-reference |
| POST | `/api/v1/copilot/assist` | FR-38: Officer copilot |

---

## Security Design

| Mechanism | Implementation |
|---|---|
| Authentication | Mock JWT (no Keycloak) — same payload format, drop-in replaceable |
| RBAC | `RolesGuard` via `@Roles()` decorator |
| ABAC / Jurisdiction | `JurisdictionGuard` with recursive CTE unit traversal |
| PII masking | Service-layer role check (Policymaker gets PII-stripped responses) |
| Audit log | `AuditInterceptor` — 100% coverage, append-only table |
| Chain of custody | Append-only `chain_of_custody` table, hash re-verified on access |
| Explainability | Every AI output writes to `explainability_trace` before returning |
| LLM guardrails | Constrained grammar parser rejects any intent not in allowlist |
| Jurisdiction scope | Applied POST-LLM-parse (before execution) — cannot be prompt-injected |

---

## NL Query Pipeline

```
User Text → RAG Context Builder → Ollama LLM (llama3.2)
         → Constrained Grammar Parser (allowlist validation)
         → Jurisdiction Scope Injector (post-parse, pre-exec)
         → Intent Executor (parameterized queries only, no raw SQL)
         → Explainability Trace Writer
         → Response with trace_id
```

---

## Running Individual Services Locally

```bash
# NestJS auth-service
cd core-services
npm install
npm run start:auth

# FastAPI nl-query-engine
cd ai-services
pip install poetry
poetry install
cd nl-query-engine
uvicorn main:app --reload --port 8001
```

---

## Project Structure

```
drishti-backend/
├── infra/
│   ├── docker-compose.yml          # All services
│   ├── postgres/
│   │   ├── migrations/001_initial_schema.sql
│   │   └── seed/001_seed_data.sql
│   └── .env.example
├── gateway/
│   └── nginx.conf                  # API gateway with rate limiting
├── core-services/                  # NestJS monorepo
│   ├── apps/
│   │   ├── auth-service/           # JWT mock auth
│   │   ├── case-service/           # FIR/case CRUD
│   │   ├── people-service/         # Accused/victim/complainant
│   │   ├── unit-service/           # Jurisdiction hierarchy
│   │   ├── evidence-service/       # MinIO upload + custody
│   │   ├── alert-service/          # Anomaly alert management
│   │   ├── audit-service/          # Append-only audit log
│   │   ├── task-service/           # FR-39 task checklist
│   │   ├── digest-service/         # Daily brief generation
│   │   ├── admin-service/          # User management
│   │   ├── performance-service/    # Officer metrics
│   │   └── report-service/         # Court-ready reports
│   └── libs/
│       ├── common/                 # DTOs, filters, interceptors, decorators
│       ├── auth-guard/             # JWT, Jurisdiction, Roles guards
│       ├── db/                     # Shared TypeORM config
│       └── event-bus/              # Redis Streams publisher
└── ai-services/                    # FastAPI Python services
    ├── shared/                     # Config, DB clients, auth, schemas
    ├── nl-query-engine/            # NL → Intent → Execute pipeline
    ├── embedding-service/          # Case embeddings + similarity
    ├── anomaly-engine/             # Z-score anomaly detection
    ├── graph-orchestrator/         # Cross-case network graph
    ├── face-similarity-service/    # Face match + CCTV/vehicle
    ├── voice-stt-service/          # Whisper STT
    ├── trend-forecast-service/     # Prophet crime forecasting
    ├── narrative-extraction-service/ # FIR NER extraction
    ├── intake-assist-service/      # FR-32 proactive intake
    └── officer-copilot-service/    # FR-38 AI guidance
```
