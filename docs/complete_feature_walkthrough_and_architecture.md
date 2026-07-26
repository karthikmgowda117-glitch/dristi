# Project Drishti — Comprehensive Feature Walkthrough & System Architecture

> **Karnataka State Police (KSP) Crime Intelligence & Multi-Tier AI Platform**  
> *Official Hackathon Technical Specification & Architecture Document*

---

## 1. Executive Summary

**Project Drishti** is an advanced, production-grade Law Enforcement Crime Intelligence Platform engineered for the Karnataka State Police (KSP). It combines multi-tier Police Role-Based Access Control (RBAC), biometric facial recognition with photo upload, dual-engine voice speech recognition and Text-To-Speech (TTS) synthesis in **English & Kannada (ಕನ್ನಡ)**, graph database link analysis, and predictive anomaly detection into a unified, secure web application.

---

## 2. Core System Architecture & Police Hierarchy

### 2.1 Multi-Tier Police Role-Based Access Control (RBAC) & FIR Filing Rules

The application enforces a strict hierarchical security model reflecting actual Karnataka State Police ranks:

```
                  ┌─────────────────────────────────────────┐
                  │    DSP (Superintendent of Police)       │
                  │   Range HQ / District Administration    │
                  └────────────────────┬────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
  ┌───────────────────────────┐                 ┌───────────────────────────┐
  │   Inspector (SHO)         │                 │   Sub-Inspector (IO)      │
  │   Station House Officer   │                 │   Investigating Officer   │
  └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │   Constable / Beat Officer│
                         │   Station Field Staff     │
                         └───────────────────────────┘
```

| Police Rank | Officer Role | Station Scope | FIR Filing & System Permissions |
| :--- | :--- | :--- | :--- |
| **DSP** | Superintendent of Police | Range-Wide (All Stations) | **Root Access**: Authorized to file FIRs across all stations. Full oversight across all 5+ stations, complete account activation & suspension control over Inspectors, SIs, and Constables. |
| **Inspector** | Station House Officer (SHO) | Station Level (e.g. Whitefield PS) | **Authorized to file FIRs**. Receives automated case details notification whenever a Sub-Inspector or DSP registers an FIR. Manages station caseload assignments. |
| **Sub-Inspector** | Investigating Officer (IO) | Assigned Station & Cases | **Authorized to file FIRs**. Registering an FIR automatically generates a new FIR number and dispatches full case details to Station Inspector Vijay Kumar (SHO) for formal review. |
| **Constable** | Field / Beat Officer | Assigned Station | **RESTRICTED from filing FIRs**: Asking Drishti AI to file an FIR returns `ACTION DENIED: Constables are not authorized to file formal FIRs under CrPC Sec 154 / BNS Sec 173`. Incident notes are automatically routed to the Inspector. |

---

## 3. Detailed Feature Breakdown & Functionality

### 3.1 FIR Filing & Automated Inspector Dispatch Workflow (`/jarvis`)
- **Rank Permission Verification**: Drishti AI inspects `currentUser.rank` when a prompt contains `"file FIR"` or `"register FIR"`.
- **Authorized Filing (SI / Inspector / DSP)**:
  - Generates a new FIR number (e.g. `KA-WF-2026-0428`).
  - Automatically dispatches full case details (Category, Complainant, Filing Officer, Narrative) to **Station Inspector Vijay Kumar (SHO)** for review.
  - Confirms to the officer in English & Kannada out loud via speech synthesis.
- **Constable Restricted Action**:
  - Displays: `"ACTION DENIED: Constables are not authorized to file formal FIRs under CrPC Sec 154 / BNS Sec 173. Forwarded draft notes to Inspector."`

---

### 3.2 Dual-Language Speech Synthesis & Kannada (ಕನ್ನಡ) Voice Engine
- **Website Language Switcher**: Integrated in the top navigation header (`TopBar.tsx`), allowing 1-click toggling between **English** and **ಕನ್ನಡ (Kannada)** across all navigation menus, badges, headers, and UI widgets.
- **Bilingual Drishti AI Voice Output (TTS)**:
  - Supports dual language SpeechSynthesis output (`en-IN` and `kn-IN`).
  - **Dual Replay Controls**: Every message in the conversation log renders dedicated **[ EN ]** and **[ 🔊 ಕನ್ನಡ (Voice) ]** audio playback buttons.

---

### 3.3 Biometric Facial Recognition & Suspect Search (`/search` - Face Tab)
- **Photo Upload Engine**: Drag-and-drop or click-to-upload custom suspect photos (JPG, PNG, WEBP).
- **512D Vector Embedding Extraction**: Overlays an animated 68-point facial landmark mesh & bounding box scanner over the uploaded image.
- **Match Results Card**: Displays suspect photo, alias, confidence match score, linked FIR, station, and criminal history.

---

### 3.4 Universal One-Click Report & File Export Engine
Every page across Project Drishti is equipped with real-time export handlers (`exportHelper.ts`):
- **Cases Directory (`/cases`)**: `Export Caseload Report (.CSV)`
- **Drishti AI (`/jarvis`)**: `Export Formal Legal Summary (.TXT)`
- **Reports Briefings (`/reports`)**: `Export PDF / Text Report (.TXT)`
- **Audit Log Viewer (`/audit`)**: `Export for compliance review (.CSV)`
- **Admin Console (`/admin`)**: `Export Personnel Roster (.CSV)`
- **Evidence Locker (`/evidence`)**: `Export Custody Certificate (.TXT)`
