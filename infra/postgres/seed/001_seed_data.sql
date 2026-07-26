-- ═══════════════════════════════════════════════════════════════════════════
-- Project Drishti — Seed Data
-- Covers: roles, unit hierarchy, crime categories, acts/sections,
--         users (one per role), and sample cases
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Roles ───────────────────────────────────────────────────────────────────
INSERT INTO roles (role_name, permission_set) VALUES
('INVESTIGATOR', '{"case:read":true,"case:write":true,"evidence:upload":true,"evidence:read":true,"ai:query":true}'),
('SHO',          '{"case:read":true,"case:assign":true,"evidence:read":true,"ai:query":true,"alert:read":true,"report:read":true}'),
('ANALYST',      '{"case:read":true,"evidence:read":true,"ai:query":true,"alert:read":true,"report:generate":true,"graph:read":true}'),
('SUPERVISOR',   '{"case:read":true,"evidence:read":true,"ai:query":true,"alert:manage":true,"report:generate":true,"audit:read":true}'),
('POLICYMAKER',  '{"dashboard:read":true,"ai:query":true}'),
('ADMIN',        '{"user:manage":true,"role:manage":true,"audit:read":true,"system:health":true}');

-- ─── Unit Hierarchy: Karnataka ────────────────────────────────────────────────
INSERT INTO unit (unit_id, parent_unit_id, unit_name, unit_type) VALUES
('00000000-0000-0000-0000-000000000001', NULL,                                   'Karnataka State Police',    'STATE'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Bengaluru Urban District',  'DISTRICT'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Mysuru District',           'DISTRICT'),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Mandya District',           'DISTRICT'),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Bengaluru South Sub-Div',   'SUBDIVISION'),
('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Bengaluru North Sub-Div',   'SUBDIVISION'),
('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', 'Mysuru City Sub-Div',       'SUBDIVISION'),
('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000005', 'Koramangala PS',            'STATION'),
('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000005', 'HSR Layout PS',             'STATION'),
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000006', 'Rajajinagar PS',            'STATION'),
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000007', 'Mysuru City PS',            'STATION'),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000004', 'Mandya PS',                 'STATION');

-- ─── Crime Categories ─────────────────────────────────────────────────────────
INSERT INTO crime_major_head (crime_major_head_id, name) VALUES
(1, 'Property Offences'),
(2, 'Offences Against Body'),
(3, 'Economic Offences'),
(4, 'Offences Against Women'),
(5, 'Cyber Crimes'),
(6, 'Offences Against Children');

INSERT INTO crime_minor_head (crime_minor_head_id, crime_major_head_id, name) VALUES
(101, 1, 'Vehicle Theft'),
(102, 1, 'Burglary'),
(103, 1, 'Chain Snatching'),
(104, 1, 'Robbery'),
(201, 2, 'Murder'),
(202, 2, 'Attempt to Murder'),
(203, 2, 'Grievous Hurt'),
(204, 2, 'Assault'),
(301, 3, 'Cheating'),
(302, 3, 'Bank Fraud'),
(401, 4, 'Harassment'),
(402, 4, 'Domestic Violence'),
(501, 5, 'Online Fraud'),
(502, 5, 'Identity Theft'),
(601, 6, 'Child Abuse');

-- ─── Acts and Sections ────────────────────────────────────────────────────────
INSERT INTO act_master (act_id, act_name) VALUES
(1, 'Bharatiya Nyaya Sanhita (BNS) 2023'),
(2, 'Information Technology Act 2000'),
(3, 'Protection of Children from Sexual Offences (POCSO) Act 2012'),
(4, 'Protection of Women from Domestic Violence Act 2005');

INSERT INTO section_master (section_id, act_id, section_number, description) VALUES
(1,  1, '103',  'Murder — Punishment for murder'),
(2,  1, '109',  'Attempt to commit murder'),
(3,  1, '118',  'Voluntarily causing grievous hurt'),
(4,  1, '303',  'Theft'),
(5,  1, '305',  'Robbery'),
(6,  1, '309',  'Extortion'),
(7,  1, '316',  'Criminal breach of trust'),
(8,  1, '318',  'Cheating'),
(9,  2, '66C',  'Identity theft'),
(10, 2, '66D',  'Cheating by personation'),
(11, 3, '4',    'Punishment for penetrative sexual assault'),
(12, 4, '3',    'Domestic violence — definition and penalty');

-- ─── Lookup masters ───────────────────────────────────────────────────────────
INSERT INTO occupation_master (occupation_id, name) VALUES
(1,'Business'),(2,'Service'),(3,'Agriculture'),(4,'Student'),(5,'Daily Wage'),(6,'Unemployed'),(7,'Other');

INSERT INTO religion_master (religion_id, name) VALUES
(1,'Hindu'),(2,'Muslim'),(3,'Christian'),(4,'Sikh'),(5,'Buddhist'),(6,'Jain'),(7,'Other');

INSERT INTO caste_master (caste_id, name) VALUES
(1,'General'),(2,'OBC'),(3,'SC'),(4,'ST'),(5,'Other');

-- ─── Users (one per role) ────────────────────────────────────────────────────
-- password_hash for 'password123' using bcrypt rounds=10 placeholder
INSERT INTO users (user_id, unit_id, role_id, username, password_hash, language_pref, mfa_enabled) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008', 1, 'priya.rao',     '$2b$10$dummyhashforinvestigator', 'en', false),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', 2, 'manjunath.k',   '$2b$10$dummyhashforsho',          'kn', false),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 3, 'ananya.shetty', '$2b$10$dummyhashforanalyst',      'en', false),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 4, 'ramesh.iyengar','$2b$10$dummyhashforsupervisor',   'en', true),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 5, 'addl.dgp',      '$2b$10$dummyhashforpolicymaker',  'en', true),
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 6, 'farha.sheikh',  '$2b$10$dummyhashforadmin',       'en', true);

-- ─── Sample Cases ─────────────────────────────────────────────────────────────
INSERT INTO casemaster (case_master_id, unit_id, crime_major_head_id, crime_minor_head_id, fir_number,
    latitude, longitude, incident_from_date, status, assigned_officer_id, narrative) VALUES
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008', 1, 101, 'FIR/2024/KOR/001',
    12.9352, 77.6245, '2024-01-15', 'UNDER_INVESTIGATION', '10000000-0000-0000-0000-000000000001',
    'Complainant reports motorcycle stolen from parking lot near Forum Mall. CCTV footage shows two suspects.'),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000009', 1, 103, 'FIR/2024/HSR/001',
    12.9116, 77.6389, '2024-01-20', 'UNDER_INVESTIGATION', '10000000-0000-0000-0000-000000000001',
    'Victim reports gold chain snatched near HSR BDA complex. Two suspects on motorcycle fled towards Koramangala.'),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000011', 1, 101, 'FIR/2024/MYS/001',
    12.2958, 76.6394, '2024-02-01', 'REGISTERED', NULL,
    'Vehicle theft reported near Mysuru Palace area. Similar MO to Bengaluru cases — two suspects on motorcycle.'),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 2, 203, 'FIR/2024/RAJ/001',
    12.9941, 77.5550, '2024-02-10', 'EVIDENCE_COLLECTION', '10000000-0000-0000-0000-000000000001',
    'Grievous hurt caused during robbery attempt. Victim admitted to Victoria Hospital with fractures.'),
('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000008', 5, 501, 'FIR/2024/KOR/002',
    12.9352, 77.6245, '2024-02-15', 'REGISTERED', NULL,
    'Online fraud — victim transferred 2.5 lakhs to fake bank official claiming KYC update required.');

-- Sample accused linked across cases (FR-33: contact_number cross-linkage demo)
INSERT INTO accused (accused_id, case_master_id, name, age, gender, contact_number) VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Raju Kumar',   24, 'Male',   '+919876543210'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Raju K.',      24, 'Male',   '+919876543210'),  -- same contact → FR-33 edge
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Unknown Male', 25, 'Male',   NULL);

-- Sample victims
INSERT INTO victim (case_master_id, name, age, gender) VALUES
('20000000-0000-0000-0000-000000000001', 'Suresh Nair',    35, 'Male'),
('20000000-0000-0000-0000-000000000002', 'Lakshmi Devi',   28, 'Female'),
('20000000-0000-0000-0000-000000000005', 'Mohan Reddy',    45, 'Male');

-- Sample act-section associations
INSERT INTO act_section_association (case_master_id, act_id, section_id) VALUES
('20000000-0000-0000-0000-000000000001', 1, 4),  -- BNS Theft
('20000000-0000-0000-0000-000000000002', 1, 5),  -- BNS Robbery
('20000000-0000-0000-0000-000000000003', 1, 4),  -- BNS Theft
('20000000-0000-0000-0000-000000000004', 1, 3),  -- BNS Grievous Hurt
('20000000-0000-0000-0000-000000000005', 2, 9);  -- IT Act 66C Identity theft

-- Sample alerts
INSERT INTO alert (unit_id, crime_minor_head_id, severity, z_score, baseline_window_days, status) VALUES
('00000000-0000-0000-0000-000000000008', 101, 'HIGH',   3.2, 90, 'OPEN'),
('00000000-0000-0000-0000-000000000009', 103, 'MEDIUM', 2.7, 90, 'OPEN'),
('00000000-0000-0000-0000-000000000002', 101, 'HIGH',   3.5, 90, 'OPEN');

-- CCTV seed data
INSERT INTO cctv_camera (camera_id, unit_id, latitude, longitude, label, source_type) VALUES
('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008', 12.9350, 77.6243, 'Forum Mall CCTV-01', 'SEED'),
('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', 12.9355, 77.6248, 'Forum Mall CCTV-02', 'SEED'),
('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000009', 12.9115, 77.6388, 'HSR BDA Camera-01',  'SEED');

INSERT INTO cctv_detection_event (camera_id, detected_at, object_type, confidence, source_type) VALUES
('40000000-0000-0000-0000-000000000001', '2024-01-15 14:30:00+05:30', 'PERSON',  0.92, 'SEED'),
('40000000-0000-0000-0000-000000000001', '2024-01-15 14:31:00+05:30', 'VEHICLE', 0.88, 'SEED'),
('40000000-0000-0000-0000-000000000003', '2024-01-20 18:45:00+05:30', 'PERSON',  0.85, 'SEED');

INSERT INTO vehicle_sighting (camera_id, plate_number, vehicle_attributes, sighted_at, source_type) VALUES
('40000000-0000-0000-0000-000000000001', 'KA03AB1234', '{"color":"black","type":"motorcycle","make":"Bajaj"}', '2024-01-15 14:31:00+05:30', 'SEED'),
('40000000-0000-0000-0000-000000000003', 'KA03AB1234', '{"color":"black","type":"motorcycle","make":"Bajaj"}', '2024-01-20 18:46:00+05:30', 'SEED');

-- Timeline events
INSERT INTO case_timeline_event (case_master_id, event_type, description, created_by) VALUES
('20000000-0000-0000-0000-000000000001', 'FIR_REGISTERED',     'FIR registered at Koramangala PS',           '10000000-0000-0000-0000-000000000002'),
('20000000-0000-0000-0000-000000000001', 'OFFICER_ASSIGNED',   'Inspector Priya Rao assigned as IO',         '10000000-0000-0000-0000-000000000002'),
('20000000-0000-0000-0000-000000000001', 'CCTV_REVIEW',        'CCTV footage from Forum Mall reviewed',      '10000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000002', 'FIR_REGISTERED',     'FIR registered at HSR Layout PS',            '10000000-0000-0000-0000-000000000002'),
('20000000-0000-0000-0000-000000000002', 'WITNESS_STATEMENT',  'Witness statement recorded',                 '10000000-0000-0000-0000-000000000001');
