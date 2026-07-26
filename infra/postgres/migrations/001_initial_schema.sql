-- ═══════════════════════════════════════════════════════════════════════════
-- Project Drishti — Complete PostgreSQL Schema
-- Based on 11_Database_Schema.md + 10_Database_Design.md
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── ENUM types ─────────────────────────────────────────────────────────────

CREATE TYPE unit_type_enum AS ENUM ('STATE','DISTRICT','SUBDIVISION','STATION');
CREATE TYPE case_status_enum AS ENUM ('REGISTERED','UNDER_INVESTIGATION','EVIDENCE_COLLECTION','CHARGESHEET_PREP','CLOSED');
CREATE TYPE role_name_enum AS ENUM ('INVESTIGATOR','SHO','ANALYST','SUPERVISOR','POLICYMAKER','ADMIN');
CREATE TYPE custody_action_enum AS ENUM ('UPLOADED','ACCESSED','TRANSFERRED','EXPORTED');
CREATE TYPE alert_severity_enum AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE alert_status_enum AS ENUM ('OPEN','ESCALATED','DISMISSED');
CREATE TYPE task_status_enum AS ENUM ('OPEN','IN_PROGRESS','DONE');
CREATE TYPE entity_type_enum AS ENUM ('WEAPON','LOCATION','VEHICLE');
CREATE TYPE source_type_enum AS ENUM ('SEED','SYNTHETIC','PRODUCTION');
CREATE TYPE object_type_enum AS ENUM ('PERSON','VEHICLE');
CREATE TYPE change_type_enum AS ENUM ('INSERT','UPDATE','DELETE');
CREATE TYPE language_pref_enum AS ENUM ('en','kn');

-- ─── 1. LOOKUP TABLES ───────────────────────────────────────────────────────

CREATE TABLE roles (
    role_id    SERIAL        PRIMARY KEY,
    role_name  role_name_enum NOT NULL UNIQUE,
    permission_set JSONB     NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE crime_major_head (
    crime_major_head_id SERIAL        PRIMARY KEY,
    name                VARCHAR(150)  NOT NULL
);

CREATE TABLE crime_minor_head (
    crime_minor_head_id SERIAL        PRIMARY KEY,
    crime_major_head_id INT           NOT NULL REFERENCES crime_major_head(crime_major_head_id),
    name                VARCHAR(150)  NOT NULL
);
CREATE INDEX idx_crime_minor_head_major ON crime_minor_head(crime_major_head_id);

CREATE TABLE act_master (
    act_id   SERIAL       PRIMARY KEY,
    act_name VARCHAR(150) NOT NULL
);

CREATE TABLE section_master (
    section_id     SERIAL       PRIMARY KEY,
    act_id         INT          NOT NULL REFERENCES act_master(act_id),
    section_number VARCHAR(20)  NOT NULL,
    description    TEXT
);
CREATE INDEX idx_section_master_act ON section_master(act_id);

CREATE TABLE occupation_master (
    occupation_id SERIAL       PRIMARY KEY,
    name          VARCHAR(100) NOT NULL
);

CREATE TABLE religion_master (
    religion_id SERIAL       PRIMARY KEY,
    name        VARCHAR(100) NOT NULL
);

CREATE TABLE caste_master (
    caste_id SERIAL       PRIMARY KEY,
    name     VARCHAR(100) NOT NULL
);

-- ─── 2. UNIT (self-referencing hierarchy) ────────────────────────────────────

CREATE TABLE unit (
    unit_id        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_unit_id UUID          REFERENCES unit(unit_id),
    unit_name      VARCHAR(150)  NOT NULL,
    unit_type      unit_type_enum NOT NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_unit_parent ON unit(parent_unit_id);

-- ─── 3. USERS ────────────────────────────────────────────────────────────────

CREATE TABLE users (
    user_id           UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id           UUID               NOT NULL REFERENCES unit(unit_id),
    role_id           INT                NOT NULL REFERENCES roles(role_id),
    username          VARCHAR(100)       NOT NULL UNIQUE,
    keycloak_subject  VARCHAR(150)       UNIQUE,      -- IdP linkage (nullable for mock JWT)
    password_hash     VARCHAR(256),                   -- used only in mock-auth mode
    language_pref     language_pref_enum NOT NULL DEFAULT 'en',
    mfa_enabled       BOOLEAN            NOT NULL DEFAULT false,
    is_active         BOOLEAN            NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ        NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_unit ON users(unit_id);
CREATE INDEX idx_users_role ON users(role_id);

-- ─── 4. CASEMASTER ───────────────────────────────────────────────────────────

CREATE TABLE casemaster (
    case_master_id       UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id              UUID              NOT NULL REFERENCES unit(unit_id),
    crime_major_head_id  INT               NOT NULL REFERENCES crime_major_head(crime_major_head_id),
    crime_minor_head_id  INT               NOT NULL REFERENCES crime_minor_head(crime_minor_head_id),
    fir_number           VARCHAR(30)       NOT NULL,
    latitude             DECIMAL(9,6)      CHECK (latitude BETWEEN -90 AND 90),
    longitude            DECIMAL(9,6)      CHECK (longitude BETWEEN -180 AND 180),
    incident_from_date   DATE              NOT NULL,
    incident_to_date     DATE,
    status               case_status_enum  NOT NULL DEFAULT 'REGISTERED',
    assigned_officer_id  UUID              REFERENCES users(user_id),
    narrative            TEXT,                        -- FIR free-text narrative
    created_at           TIMESTAMPTZ       NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ       NOT NULL DEFAULT now(),
    UNIQUE (unit_id, fir_number)
);

-- Indexes from 10_Database_Design.md §3
CREATE INDEX idx_casemaster_geo ON casemaster USING GIST(ST_MakePoint(longitude, latitude)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_casemaster_unit_date ON casemaster(unit_id, incident_from_date);
CREATE INDEX idx_casemaster_category ON casemaster(crime_major_head_id, crime_minor_head_id);
CREATE INDEX idx_casemaster_status ON casemaster(status);
CREATE INDEX idx_casemaster_officer ON casemaster(assigned_officer_id);

-- ─── 5. ACCUSED / VICTIM / COMPLAINANT ───────────────────────────────────────

CREATE TABLE accused (
    accused_id      UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_master_id  UUID         NOT NULL REFERENCES casemaster(case_master_id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    age             INT          CHECK (age BETWEEN 0 AND 120),
    gender          VARCHAR(15),
    address         TEXT,
    contact_number  VARCHAR(20),   -- encrypted at rest (app-layer); FR-33 cross-case linkage
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_accused_case ON accused(case_master_id);
CREATE INDEX idx_accused_name ON accused(name, age, gender);
CREATE INDEX idx_accused_contact ON accused(contact_number);   -- FR-33

CREATE TABLE victim (
    victim_id      UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_master_id UUID         NOT NULL REFERENCES casemaster(case_master_id) ON DELETE CASCADE,
    name           VARCHAR(150) NOT NULL,
    age            INT          CHECK (age BETWEEN 0 AND 120),
    gender         VARCHAR(15),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_victim_case ON victim(case_master_id);

CREATE TABLE complainant_details (
    complainant_id UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_master_id UUID         NOT NULL REFERENCES casemaster(case_master_id) ON DELETE CASCADE,
    name           VARCHAR(150) NOT NULL,
    occupation_id  INT          REFERENCES occupation_master(occupation_id),
    religion_id    INT          REFERENCES religion_master(religion_id),
    caste_id       INT          REFERENCES caste_master(caste_id),
    contact_number VARCHAR(20),  -- encrypted at rest (app-layer)
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_complainant_case ON complainant_details(case_master_id);

-- ─── 6. ACT / SECTION ASSOCIATION ────────────────────────────────────────────

CREATE TABLE act_section_association (
    association_id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_master_id UUID NOT NULL REFERENCES casemaster(case_master_id) ON DELETE CASCADE,
    act_id         INT  NOT NULL REFERENCES act_master(act_id),
    section_id     INT  NOT NULL REFERENCES section_master(section_id),
    UNIQUE (case_master_id, section_id)
);
CREATE INDEX idx_act_section_case ON act_section_association(case_master_id);

-- ─── 7. EVIDENCE + CHAIN OF CUSTODY ─────────────────────────────────────────

CREATE TABLE evidence (
    evidence_id    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_master_id UUID         NOT NULL REFERENCES casemaster(case_master_id) ON DELETE CASCADE,
    type           VARCHAR(50)  NOT NULL,                    -- DOCUMENT, PHOTO, PHYSICAL_LOG, etc.
    storage_key    VARCHAR(300) NOT NULL,                    -- MinIO object reference
    hash_sha256    CHAR(64)     NOT NULL UNIQUE,             -- integrity
    uploaded_by    UUID         NOT NULL REFERENCES users(user_id),
    uploaded_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted     BOOLEAN      NOT NULL DEFAULT false        -- soft delete only
);
CREATE INDEX idx_evidence_case ON evidence(case_master_id);
CREATE INDEX idx_evidence_hash ON evidence(hash_sha256);

CREATE TABLE chain_of_custody (
    custody_id       UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id      UUID                  NOT NULL REFERENCES evidence(evidence_id),
    actor_user_id    UUID                  NOT NULL REFERENCES users(user_id),
    action           custody_action_enum   NOT NULL,
    hash_at_access   CHAR(64)              NOT NULL,         -- recomputed on access
    integrity_verified BOOLEAN             NOT NULL,
    timestamp        TIMESTAMPTZ           NOT NULL DEFAULT now()
    -- Append-only: no UPDATE/DELETE grants on this table for any app role
);
CREATE INDEX idx_custody_evidence_ts ON chain_of_custody(evidence_id, timestamp);

-- ─── 8. CASE TIMELINE EVENTS ─────────────────────────────────────────────────

CREATE TABLE case_timeline_event (
    event_id       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_master_id UUID         NOT NULL REFERENCES casemaster(case_master_id) ON DELETE CASCADE,
    event_type     VARCHAR(50)  NOT NULL,
    description    TEXT,
    created_by     UUID         REFERENCES users(user_id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_timeline_case ON case_timeline_event(case_master_id, created_at);

-- ─── 9. ALERTS ───────────────────────────────────────────────────────────────

CREATE TABLE alert (
    alert_id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id               UUID                NOT NULL REFERENCES unit(unit_id),
    crime_minor_head_id   INT                 NOT NULL REFERENCES crime_minor_head(crime_minor_head_id),
    severity              alert_severity_enum  NOT NULL,
    z_score               DECIMAL(6,3)         NOT NULL,
    baseline_window_days  INT                  NOT NULL DEFAULT 90,
    triggered_at          TIMESTAMPTZ          NOT NULL DEFAULT now(),
    status                alert_status_enum    NOT NULL DEFAULT 'OPEN',
    dismiss_reason        TEXT,
    case_master_id        UUID                 REFERENCES casemaster(case_master_id)
);
CREATE INDEX idx_alert_unit ON alert(unit_id);
CREATE INDEX idx_alert_triggered ON alert(triggered_at);

-- ─── 10. EXPLAINABILITY TRACES ────────────────────────────────────────────────

CREATE TABLE explainability_trace (
    trace_id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    output_type        VARCHAR(40)  NOT NULL,   -- ANOMALY_ALERT, SIMILARITY_SCORE, NL_QUERY_RESULT, FACE_MATCH
    method_tag         VARCHAR(150) NOT NULL,
    confidence_score   DECIMAL(5,4) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    source_record_refs JSONB        NOT NULL,   -- [{table, id}]
    generated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── 11. CASE SIMILARITY SCORE ───────────────────────────────────────────────

CREATE TABLE case_similarity_score (
    score_id       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_a_id      UUID         NOT NULL REFERENCES casemaster(case_master_id),
    case_b_id      UUID         NOT NULL REFERENCES casemaster(case_master_id),
    score          DECIMAL(5,4) NOT NULL CHECK (score BETWEEN 0 AND 1),
    matched_fields JSONB        NOT NULL,
    trace_id       UUID         REFERENCES explainability_trace(trace_id),
    computed_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (case_a_id, case_b_id)
);
CREATE INDEX idx_similarity_case_a ON case_similarity_score(case_a_id);
CREATE INDEX idx_similarity_case_b ON case_similarity_score(case_b_id);

-- ─── 12. AUDIT LOG (append-only) ─────────────────────────────────────────────

CREATE TABLE audit_log (
    audit_id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id        UUID         NOT NULL REFERENCES users(user_id),
    action               VARCHAR(50)  NOT NULL,
    entity_type          VARCHAR(50)  NOT NULL,
    entity_id            UUID,
    jurisdiction_unit_id UUID         NOT NULL REFERENCES unit(unit_id),
    trace_id             UUID         REFERENCES explainability_trace(trace_id),
    payload              JSONB,
    timestamp            TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor_ts ON audit_log(actor_user_id, timestamp);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ─── 13. NOTIFICATIONS ───────────────────────────────────────────────────────

CREATE TABLE notification (
    notification_id UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users(user_id),
    type            VARCHAR(30)  NOT NULL,
    payload         JSONB        NOT NULL,
    read_status     BOOLEAN      NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_user ON notification(user_id, created_at);

-- ─── 14. EXTENSION MODULES (seed/synthetic data tables) ───────────────────────

CREATE TABLE cctv_camera (
    camera_id   UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id     UUID              NOT NULL REFERENCES unit(unit_id),
    latitude    DECIMAL(9,6)      NOT NULL,
    longitude   DECIMAL(9,6)      NOT NULL,
    label       VARCHAR(150),
    source_type source_type_enum  NOT NULL DEFAULT 'SEED'
);
CREATE INDEX idx_cctv_camera_geo ON cctv_camera USING GIST(ST_MakePoint(longitude, latitude));

CREATE TABLE cctv_detection_event (
    event_id    UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id   UUID              NOT NULL REFERENCES cctv_camera(camera_id),
    detected_at TIMESTAMPTZ       NOT NULL,
    object_type object_type_enum  NOT NULL,
    confidence  DECIMAL(5,4)      NOT NULL,
    source_type source_type_enum  NOT NULL DEFAULT 'SEED'
);
CREATE INDEX idx_cctv_event_camera_ts ON cctv_detection_event(camera_id, detected_at);

CREATE TABLE vehicle_sighting (
    sighting_id         UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id           UUID              REFERENCES cctv_camera(camera_id),
    plate_number        VARCHAR(20),
    vehicle_attributes  JSONB,
    sighted_at          TIMESTAMPTZ       NOT NULL,
    source_type         source_type_enum  NOT NULL DEFAULT 'SEED'
);
CREATE INDEX idx_vehicle_plate ON vehicle_sighting(plate_number);
CREATE INDEX idx_vehicle_ts ON vehicle_sighting(sighted_at);

CREATE TABLE face_embedding (
    embedding_id     UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_ref       UUID              REFERENCES accused(accused_id),
    embedding_vector VECTOR(512)       NOT NULL,
    source_type      source_type_enum  NOT NULL DEFAULT 'SEED',
    created_at       TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX idx_face_embedding_ivfflat ON face_embedding USING ivfflat(embedding_vector vector_cosine_ops) WITH (lists = 100);

-- ─── 15. VOICE QUERY LOG ─────────────────────────────────────────────────────

CREATE TABLE voice_query_log (
    log_id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users(user_id),
    audio_ref       VARCHAR(300) NOT NULL,
    transcript_text TEXT         NOT NULL,
    language        language_pref_enum NOT NULL,
    confidence      DECIMAL(5,4) NOT NULL,
    linked_trace_id UUID         REFERENCES explainability_trace(trace_id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── 16. ROUND-2 TABLES ───────────────────────────────────────────────────────

-- narrative_extracted_entity (FR-34)
CREATE TABLE narrative_extracted_entity (
    entity_id       UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_master_id  UUID              NOT NULL REFERENCES casemaster(case_master_id) ON DELETE CASCADE,
    entity_type     entity_type_enum  NOT NULL,
    extracted_text  VARCHAR(300)      NOT NULL,
    confidence_score DECIMAL(5,4)     NOT NULL CHECK (confidence_score BETWEEN 0.6 AND 1),
    provenance      VARCHAR(20)       NOT NULL DEFAULT 'NLP_EXTRACTED' CHECK (provenance = 'NLP_EXTRACTED'),
    extracted_at    TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX idx_narrative_case ON narrative_extracted_entity(case_master_id);
CREATE INDEX idx_narrative_confidence ON narrative_extracted_entity(confidence_score);

-- forecast_result (FR-37) — aggregate-only; NO person/location finer than unit_id
CREATE TABLE forecast_result (
    forecast_id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id              UUID         NOT NULL REFERENCES unit(unit_id),
    crime_minor_head_id  INT          NOT NULL REFERENCES crime_minor_head(crime_minor_head_id),
    horizon_days         INT          NOT NULL CHECK (horizon_days IN (7, 14, 30)),
    forecasted_count     DECIMAL(8,2) NOT NULL,
    confidence_lower     DECIMAL(8,2) NOT NULL,
    confidence_upper     DECIMAL(8,2) NOT NULL,
    method_tag           VARCHAR(150) NOT NULL,
    generated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_forecast_unit_cat_ts ON forecast_result(unit_id, crime_minor_head_id, generated_at DESC);

-- task (FR-39, thin-slice Investigation Workspace)
CREATE TABLE task (
    task_id          UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_master_id   UUID             NOT NULL REFERENCES casemaster(case_master_id) ON DELETE CASCADE,
    assigned_user_id UUID             NOT NULL REFERENCES users(user_id),
    description      VARCHAR(500)     NOT NULL,
    status           task_status_enum NOT NULL DEFAULT 'OPEN',
    due_date         DATE,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_case ON task(case_master_id);
CREATE INDEX idx_task_user_status ON task(assigned_user_id, status);

-- case_embedding (for pgvector case similarity)
CREATE TABLE case_embedding (
    embedding_id     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_master_id   UUID         NOT NULL UNIQUE REFERENCES casemaster(case_master_id) ON DELETE CASCADE,
    embedding_vector VECTOR(768)  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_case_embedding_hnsw ON case_embedding USING hnsw(embedding_vector vector_cosine_ops);

-- ─── 17. HISTORY / SHADOW TABLES (trigger-populated) ─────────────────────────

CREATE TABLE casemaster_history (
    history_id     BIGSERIAL    PRIMARY KEY,
    case_master_id UUID         NOT NULL,
    unit_id        UUID,
    fir_number     VARCHAR(30),
    status         case_status_enum,
    assigned_officer_id UUID,
    narrative      TEXT,
    changed_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    changed_by     UUID,
    change_type    change_type_enum NOT NULL
);
CREATE INDEX idx_casemaster_history_case ON casemaster_history(case_master_id, changed_at);

CREATE TABLE evidence_history (
    history_id   BIGSERIAL    PRIMARY KEY,
    evidence_id  UUID         NOT NULL,
    is_deleted   BOOLEAN,
    changed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    changed_by   UUID,
    change_type  change_type_enum NOT NULL
);

-- ─── 18. TRIGGERS ────────────────────────────────────────────────────────────

-- updated_at trigger for casemaster
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_casemaster_updated_at
    BEFORE UPDATE ON casemaster
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- History trigger for casemaster
CREATE OR REPLACE FUNCTION log_casemaster_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO casemaster_history(case_master_id, unit_id, fir_number, status, assigned_officer_id, narrative, change_type)
        VALUES (OLD.case_master_id, OLD.unit_id, OLD.fir_number, OLD.status, OLD.assigned_officer_id, OLD.narrative, 'DELETE');
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO casemaster_history(case_master_id, unit_id, fir_number, status, assigned_officer_id, narrative, change_type)
        VALUES (OLD.case_master_id, OLD.unit_id, OLD.fir_number, OLD.status, OLD.assigned_officer_id, OLD.narrative, 'UPDATE');
        RETURN NEW;
    ELSE
        INSERT INTO casemaster_history(case_master_id, unit_id, fir_number, status, assigned_officer_id, narrative, change_type)
        VALUES (NEW.case_master_id, NEW.unit_id, NEW.fir_number, NEW.status, NEW.assigned_officer_id, NEW.narrative, 'INSERT');
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_casemaster_history
    AFTER INSERT OR UPDATE OR DELETE ON casemaster
    FOR EACH ROW EXECUTE FUNCTION log_casemaster_history();

-- ─── 19. ROW-LEVEL SECURITY — audit_log append-only ──────────────────────────
-- Revoke UPDATE/DELETE on audit_log and chain_of_custody from application role
-- (Run after creating the app user)
-- REVOKE UPDATE, DELETE ON audit_log FROM drishti;
-- REVOKE UPDATE, DELETE ON chain_of_custody FROM drishti;

-- ─── 20. DATABASE VIEWS for policymaker tier (PII-stripped) ──────────────────

CREATE VIEW policymaker_cases AS
SELECT
    c.case_master_id,
    c.unit_id,
    c.crime_major_head_id,
    c.crime_minor_head_id,
    c.status,
    c.incident_from_date,
    c.latitude,
    c.longitude,
    c.created_at
FROM casemaster c;

CREATE VIEW policymaker_unit_stats AS
SELECT
    u.unit_id,
    u.unit_name,
    u.unit_type,
    u.parent_unit_id,
    COUNT(c.case_master_id) AS total_cases,
    COUNT(CASE WHEN c.status = 'CLOSED' THEN 1 END) AS closed_cases,
    COUNT(CASE WHEN c.status != 'CLOSED' THEN 1 END) AS open_cases
FROM unit u
LEFT JOIN casemaster c ON c.unit_id = u.unit_id
GROUP BY u.unit_id, u.unit_name, u.unit_type, u.parent_unit_id;
