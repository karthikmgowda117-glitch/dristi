# Project Drishti — Comprehensive Feature Walkthrough & System Architecture

> **Karnataka State Police (KSP) Crime Intelligence & Multi-Tier AI Platform**  
> *Official Hackathon Technical Specification & Architecture Document*

---

## 1. Executive Summary

**Project Drishti** is an advanced, production-grade Law Enforcement Crime Intelligence Platform engineered for the Karnataka State Police (KSP). It combines multi-tier Police Role-Based Access Control (RBAC), biometric facial recognition with photo upload, dual-engine voice speech recognition and Text-To-Speech (TTS) synthesis in **English & Kannada (ಕನ್ನಡ)**, graph database link analysis, and predictive anomaly detection into a unified, secure web application.

---

## 2. Core System Architecture & Police Hierarchy

### 2.1 Multi-Tier Police Role-Based Access Control (RBAC)

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

| Police Rank | Officer Role | Station Scope | Permissions & Capabilities |
| :--- | :--- | :--- | :--- |
| **DSP** | Superintendent of Police | Range-Wide (All Stations) | **Root Head Access**: Full oversight across all 5+ stations, complete account activation & suspension control over Inspectors, SIs, and Constables. Range-wide caseload access. |
| **Inspector** | Station House Officer (SHO) | Station Level (e.g. Whitefield PS) | Station administration, station caseload assignment, SHO review approval, team management. |
| **Sub-Inspector** | Investigating Officer (IO) | Assigned Station & Cases | Case investigation, evidence uploading, narrative querying, FIR summary generation. |
| **Constable** | Field / Beat Officer | Assigned Station | Field data entry, beat surveillance reporting, status updates. |

---

## 3. Detailed Feature Breakdown & Functionality

### 3.1 Dual-Language Speech Synthesis & Kannada (ಕನ್ನಡ) Voice Engine
- **Website Language Switcher**: Integrated in the top navigation header (`TopBar.tsx`), allowing 1-click toggling between **English** and **ಕನ್ನಡ (Kannada)** across all navigation menus, badges, headers, and UI widgets.
- **Bilingual Drishti AI Voice Output (TTS)**:
  - Supports dual language SpeechSynthesis output (`en-IN` and `kn-IN`).
  - **Dual Replay Controls**: Every message in the conversation log renders dedicated **[ EN ]** and **[ 🔊 ಕನ್ನಡ (Voice) ]** audio playback buttons.
  - Clicking **[ 🔊 ಕನ್ನಡ (Voice) ]** speaks the exact Kannada translation out loud using `kn-IN` speech synthesis.

---

### 3.2 Biometric Facial Recognition & Suspect Search (`/search` - Face Tab)
- **Photo Upload Engine**: Drag-and-drop or click-to-upload custom suspect photos (JPG, PNG, WEBP).
- **512D Vector Embedding Extraction**: Overlays an animated 68-point facial landmark mesh & bounding box scanner over the uploaded image.
- **Suspect Lineup Index Match**: Compares facial vectors against `suspectDatabase`.
- **Match Results Card**: Displays suspect photo, alias, confidence match score, linked FIR, station, and criminal history.
- **Export Match Report**: 1-click **Export Match Report (.CSV)** button downloads biometric suspect matches directly to the investigator's drive.

---

### 3.3 Drishti AI Voice Command & Mode Switcher (`/jarvis`)
- **Real-Time Microphone Recognition**: Powered by the Web Speech API (`SpeechRecognition`). Captures live microphone audio in English (`en-IN`) and Kannada (`kn-IN`).
- **Interactive Holographic Arc Reactor Core**: Visualizer rings rotate and pulsate in real-time response to voice speech input and audio output.
- **Dynamic Mode Switcher**: Command Center, FIR Copilot Assistant, and Tactical Tools Suite.

---

### 3.4 Universal One-Click Report & File Export Engine
Every page across Project Drishti is equipped with real-time export handlers (`exportHelper.ts`):
- **Cases Directory (`/cases`)**: `Export Caseload Report (.CSV)`
- **Drishti AI (`/jarvis`)**: `Export Formal Legal Summary (.TXT)`
- **Reports Briefings (`/reports`)**: `Export PDF / Text Report (.TXT)`
- **Audit Log Viewer (`/audit`)**: `Export for compliance review (.CSV)`
- **Admin Console (`/admin`)**: `Export Personnel Roster (.CSV)`
- **Evidence Locker (`/evidence`)**: `Export Custody Certificate (.TXT)`
