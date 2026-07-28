# Project Drishti — Official Prototype Brief

> **Karnataka State Police (KSP) Crime Intelligence & Multi-Tier AI Platform**  
> *Official Technical Brief for Hackathon Evaluation & Deployment Review*

---

## 1. Executive Summary

**Project Drishti** is a next-generation Law Enforcement Crime Intelligence Platform engineered specifically for the **Karnataka State Police (KSP)**. Built to solve data fragmentation, multi-lingual operational barriers, and delayed biometric identification, Drishti unifies multi-tier Police Role-Based Access Control (RBAC), biometric facial recognition, dual-engine voice speech synthesis in **English and Kannada (ಕನ್ನಡ)**, automated FIR filing governance, graph database link analysis, and predictive anomaly detection into a high-performance web application.

---

## 2. Core Operational Capabilities & Features

### 2.1 Multi-Tier Police Role-Based Access Control (RBAC)
Enforces a strict 4-tier rank security hierarchy:
- **DSP (Superintendent of Police)**: Range-Wide Root Access. Complete oversight across all stations (Whitefield, K.R. Puram, Mahadevapura), range caseload access, and instant control over account **Activation and Suspension** for Inspectors, SIs, and Constables.
- **Inspector (SHO - Station House Officer)**: Station-level governance, caseload assignment, FIR review approvals, and team administration.
- **Sub-Inspector (IO - Investigating Officer)**: Assigned caseload management, digital evidence uploads, FIR filing, and narrative intelligence queries.
- **Constable (Beat Officer)**: Field surveillance data entry and beat reporting. **Restricted from filing formal FIRs** under CrPC Sec 154 / BNS Sec 173.

---

### 2.2 Biometric Facial Recognition Engine (`/search`)
- **Real Image Upload**: Supports uploading suspect mugshots or CCTV screen captures (`.jpg`, `.png`, `.webp`).
- **512D Vector Embedding Mesh**: Overlays a live 68-point facial landmark mesh scanner over uploaded images.
- **Lineup Matching**: Computes cosine similarity scores against `suspectDatabase`.
- **Dossier Generation**: Displays suspect criminal alias (e.g., *"Snake Suresh"*), match percentage (e.g. **96.4% Match**), linked active FIRs, station jurisdiction, and criminal history.
- **One-Click Export**: `Export Match Report (.CSV)` for court evidentiary files.

---

### 2.3 Drishti AI Voice Copilot & Bilingual Kannada (ಕನ್ನಡ) Speech Synthesis (`/jarvis`)
- **Bilingual Interface**: 1-click header switcher toggles website UI and Drishti AI between **English** and **ಕನ್ನಡ (Kannada)**.
- **Voice Recognition (STT)**: Microphone listening in English (`en-IN`) and Kannada (`kn-IN`).
- **Voice Output (TTS)**: Dual audio replay buttons **[ EN ]** and **[ 🔊 ಕನ್ನಡ (Voice) ]** on every response.
- **Smart Voice Fallback**: Asynchronous voice loading with native `kn-IN` SpeechSynthesis and automatic Indian phonetic fallback so audio speaks loudly out loud on 100% of devices after deployment.

---

### 2.4 FIR Filing Governance & Inspector Dispatch
- **Filing Rules**:
  - **Constables**: Attempting to file an FIR triggers `ACTION DENIED: Constables are not authorized to file formal FIRs`. Incident draft notes are automatically routed to the Inspector.
  - **Sub-Inspectors / Inspectors / DSPs**: Registered FIR generates a unique ID (e.g., `KA-WF-2026-0428`) and dispatches full case details to **Station Inspector Vijay Kumar (SHO)** for review.

---

### 2.5 Universal One-Click File Export Engine
Export buttons configured across all modules:
- **Cases Directory (`/cases`)**: Export Caseload Report (`.CSV`)
- **Drishti AI (`/jarvis`)**: Export Formal Legal Summary (`.TXT`)
- **Reports Briefings (`/reports`)**: Export PDF / Text Report (`.TXT`)
- **Audit Log Viewer (`/audit`)**: Export Compliance Review (`.CSV`)
- **Admin Console (`/admin`)**: Export Personnel Roster (`.CSV`)
- **Evidence Locker (`/evidence`)**: Export Custody Certificate (`.TXT`)

---

## 3. Technology Stack Specification

| Component Layer | Technology Adopted |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript 5, Vite 5 |
| **Styling & HUD Aesthetics** | TailwindCSS 3, Glassmorphism, Custom Cyberpunk HUD Palette |
| **Animations & Visualizers** | Framer Motion 11, Three.js, React Three Fiber (Arc Reactor Hologram) |
| **AI & LLM Services** | Groq API (`llama-3.3-70b-versatile`), Custom Off-line AI Buffer |
| **Voice & Speech** | Web Speech API (`SpeechRecognition`), SpeechSynthesis (TTS - `en-IN` & `kn-IN`) |
| **Localization** | Custom Bilingual `useLanguage` Translation Store (English <-> ಕನ್ನಡ) |
| **Deployment Target** | Catalyst Platform / Vercel (`build`: `vite build`, `dist/`) |

---

## 4. Page Endpoint Directory

- `/login` — Secure Multi-Tier Police Login & Passcode Authentication (Demo PIN: `1234`)
- `/dashboard` — Range Intelligence Command Center & KPI Telemetry
- `/jarvis` — Drishti AI Voice Copilot, FIR Legal Assistant & Tactical Utility Suite
- `/cases` — Station Caseload Directory with CSV Exporter
- `/search` — Biometric Facial Recognition Upload & Suspect Lineup Index
- `/graph` — Network Link Analysis & Suspect Co-Accused Graph
- `/admin` — DSP Superintendent Console & Account Activation/Suspension Panel
- `/evidence` — SHA-256 Chain-of-Custody Evidence Locker
- `/audit` — Immutable Compliance & Access Audit Logger
