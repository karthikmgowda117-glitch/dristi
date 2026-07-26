import { GraphNode, GraphEdge } from "@/components/graph/GraphCanvas";
import { TraceData } from "@/components/ui/ExplainabilityPanel";

export const cases = [
  { id: "KA-WF-2026-0417", category: "Chain Snatching", station: "Whitefield PS", status: "Under Investigation", agingDays: 12, officer: "SI Ramesh K.", sla: "ok" as const },
  { id: "KA-WF-2026-0398", category: "Cyber Fraud", station: "Whitefield PS", status: "Evidence Collection", agingDays: 58, officer: "SI Ramesh K.", sla: "breach" as const },
  { id: "KA-KR-2026-0112", category: "Burglary", station: "K.R. Puram PS", status: "Chargesheet Prep", agingDays: 34, officer: "PSI Deepa N.", sla: "warning" as const },
  { id: "KA-WF-2026-0421", category: "Assault", station: "Whitefield PS", status: "Registered", agingDays: 2, officer: "SI Ramesh K.", sla: "ok" as const },
  { id: "KA-MP-2026-0089", category: "Chain Snatching", station: "Mahadevapura PS", status: "Under Investigation", agingDays: 21, officer: "PSI Arjun T.", sla: "ok" as const },
];

export const alerts = [
  { id: "A-1", unit: "Whitefield PS", category: "Chain Snatching", severity: "critical" as const, ts: "12 min ago", method: "Z-score anomaly, 90-day baseline" },
  { id: "A-2", unit: "K.R. Puram PS", category: "Burglary", severity: "warning" as const, ts: "2 hr ago", method: "Z-score anomaly, 90-day baseline" },
  { id: "A-3", unit: "Mahadevapura PS", category: "Cyber Fraud", severity: "info" as const, ts: "5 hr ago", method: "Trend deviation, 30-day rolling" },
];

export const graphNodes: GraphNode[] = [
  { id: "p1", label: "Suresh M.", type: "ACCUSED" },
  { id: "p2", label: "Naveen R.", type: "ACCUSED" },
  { id: "p3", label: "Anitha K.", type: "VICTIM" },
  { id: "c1", label: "KA-WF-0417", type: "CASE" },
  { id: "c2", label: "KA-KR-0398", type: "CASE" },
  { id: "u1", label: "Whitefield PS", type: "UNIT" },
  { id: "p4", label: "Manjunath S.", type: "ACCUSED" },
];

export const graphEdges: GraphEdge[] = [
  { source: "p1", target: "c1", relation: "FILED_IN" },
  { source: "p2", target: "c1", relation: "CO_ACCUSED_WITH" },
  { source: "p3", target: "c1", relation: "VICTIM_OF" },
  { source: "c1", target: "u1", relation: "FILED_IN" },
  { source: "c1", target: "c2", relation: "SIMILAR_TO", score: 0.82 },
  { source: "p1", target: "p4", relation: "CONTACT_LINKED", sharedField: "contact_number: 98450-XXXXX" },
];

export const sampleTrace: TraceData = {
  methodTag: "Z-score anomaly detection, 90-day rolling baseline for Whitefield PS",
  plainLanguage:
    "Chain-snatching reports at this station this week are 3.4 standard deviations above the 90-day rolling average — a statistically unusual spike, not a prediction about any individual.",
  confidence: 0.87,
  sourceRecords: [
    { id: "r1", label: "Casemaster KA-WF-2026-0417", type: "CASE" },
    { id: "r2", label: "Casemaster KA-WF-2026-0421", type: "CASE" },
    { id: "r3", label: "90-day baseline series", type: "AGGREGATE" },
  ],
};

export const similarityTrace: TraceData = {
  methodTag: "Multilingual narrative embedding + structured-field composite score",
  plainLanguage:
    "Narrative text, crime category, location proximity, and time proximity were combined into one weighted similarity score against your open case.",
  confidence: 0.82,
  sourceRecords: [
    { id: "s1", label: "Casemaster KA-KR-2026-0398", type: "CASE" },
    { id: "s2", label: "FIR narrative embedding", type: "VECTOR" },
  ],
};

export const graphTrace: TraceData = {
  methodTag: "Graph traversal · Neo4j",
  plainLanguage:
    "This link was found by walking from the accused in your case to a shared contact number, then to another accused named in a separate case.",
  confidence: 0.74,
  reasoningPath: [
    "Suresh M. (accused) → shares contact_number →",
    "Manjunath S. (accused, separate case)",
  ],
  sourceRecords: [
    { id: "g1", label: "Person node: Suresh M.", type: "PERSON" },
    { id: "g2", label: "Person node: Manjunath S.", type: "PERSON" },
  ],
};

/* ---------------- Officer Performance ---------------- */
export const officerStats = [
  { name: "SI Ramesh K.", station: "Whitefield PS", closureRate: 71, openCases: 14, avgAging: 22, workload: "high" as const },
  { name: "PSI Deepa N.", station: "K.R. Puram PS", closureRate: 64, openCases: 9, avgAging: 31, workload: "medium" as const },
  { name: "PSI Arjun T.", station: "Mahadevapura PS", closureRate: 58, openCases: 18, avgAging: 40, workload: "high" as const },
  { name: "SI Fathima S.", station: "Whitefield PS", closureRate: 77, openCases: 6, avgAging: 15, workload: "low" as const },
];

export const workloadSuggestion = {
  from: "PSI Arjun T. (Mahadevapura PS)",
  to: "SI Fathima S. (Whitefield PS)",
  caseCount: 3,
  reason: "Arjun T. carries 3x the average open-case load for the range; Fathima S. has closure headroom.",
};

/* ---------------- Admin: Users & Roles ---------------- */
export const users = [
  { id: "U-2201", name: "Ramesh K.", role: "Investigator", unit: "Whitefield PS", status: "active" as const },
  { id: "U-2202", name: "Deepa N.", role: "SHO", unit: "K.R. Puram PS", status: "active" as const },
  { id: "U-2203", name: "Arjun T.", role: "Investigator", unit: "Mahadevapura PS", status: "active" as const },
  { id: "U-2204", name: "Sunitha R.", role: "Analyst", unit: "Bengaluru East Range", status: "suspended" as const },
  { id: "U-2205", name: "Prakash V.", role: "Supervisor", unit: "Bengaluru East Range", status: "active" as const },
];

/* ---------------- Audit Log ---------------- */
export const auditEntries = [
  { ts: "25 Jul 2026, 14:02", user: "Ramesh K.", action: "READ", entity: "Casemaster KA-WF-2026-0417", jurisdiction: "Whitefield PS" },
  { ts: "25 Jul 2026, 13:47", user: "system (AI)", action: "AI_QUERY", entity: "Similarity search · KA-WF-2026-0417", jurisdiction: "Whitefield PS" },
  { ts: "25 Jul 2026, 13:20", user: "Deepa N.", action: "UPDATE", entity: "Casemaster KA-KR-2026-0112 (status)", jurisdiction: "K.R. Puram PS" },
  { ts: "25 Jul 2026, 12:58", user: "Prakash V.", action: "READ", entity: "Audit Log Viewer (filtered)", jurisdiction: "Bengaluru East Range" },
  { ts: "25 Jul 2026, 11:41", user: "Arjun T.", action: "WRITE", entity: "Evidence upload · KA-MP-2026-0089", jurisdiction: "Mahadevapura PS" },
];

/* ---------------- System Health ---------------- */
export const services = [
  { name: "Case Service", status: "healthy" as const, uptime: "99.98%", p95: "84ms" },
  { name: "NL Query Engine", status: "healthy" as const, uptime: "99.91%", p95: "612ms" },
  { name: "Graph Orchestrator", status: "degraded" as const, uptime: "98.40%", p95: "1.4s" },
  { name: "Evidence Service", status: "healthy" as const, uptime: "99.99%", p95: "120ms" },
  { name: "Explainability Service", status: "healthy" as const, uptime: "99.95%", p95: "95ms" },
];

/* ---------------- Operation Mirror Digest ---------------- */
export const digestItems = [
  { kind: "Alert", title: "Anomaly spike · Whitefield PS chain-snatching", severity: "critical" as const, ts: "Today, 06:00" },
  { kind: "Similarity", title: "New match: KA-KR-2026-0398 ↔ KA-WF-2026-0417", severity: "info" as const, ts: "Today, 06:00" },
  { kind: "Graph", title: "New CONTACT_LINKED edge on Suresh M.", severity: "warning" as const, ts: "Today, 06:00" },
];

/* ---------------- Trend Forecast ---------------- */
export const forecastSeries = Array.from({ length: 30 }).map((_, i) => {
  const day = i + 1;
  const base = 8 + Math.sin(i / 4) * 2 + i * 0.05;
  return {
    day: `D${day}`,
    actual: i < 14 ? Math.round(base + (Math.random() - 0.5)) : null,
    forecast: i >= 12 ? Math.round(base) : null,
    low: i >= 12 ? Math.round(base - 2.2) : null,
    high: i >= 12 ? Math.round(base + 2.2) : null,
  };
});

/* ---------------- Intelligence Search: extension modules (all seed/synthetic at MVP) ---------------- */
export interface SuspectRecord {
  id: string;
  name: string;
  alias: string;
  age: number;
  photo: string;
  caseId: string;
  station: string;
  category: string;
  confidence: number;
  priorsCount: number;
  status: string;
  bioHash: string;
  linkedEntities: string[];
}

export const suspectDatabase: SuspectRecord[] = [
  {
    id: "SUS-801",
    name: "Suresh M.",
    alias: "Snake Suresh",
    age: 31,
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80",
    caseId: "KA-WF-2026-0417",
    station: "Whitefield PS",
    category: "Chain Snatching / Robbery",
    confidence: 0.964,
    priorsCount: 4,
    status: "Wanted · Active FIR",
    bioHash: "FAC-9921-A8F0-3341",
    linkedEntities: ["Naveen R.", "Manjunath S."],
  },
  {
    id: "SUS-802",
    name: "Naveen R.",
    alias: "Blackie Naveen",
    age: 29,
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
    caseId: "KA-KR-2026-0112",
    station: "K.R. Puram PS",
    category: "House Breaking / Theft",
    confidence: 0.841,
    priorsCount: 2,
    status: "Out on Bail",
    bioHash: "FAC-4410-B11C-8822",
    linkedEntities: ["Suresh M."],
  },
  {
    id: "SUS-803",
    name: "Manjunath S.",
    alias: "Manga Manja",
    age: 34,
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80",
    caseId: "KA-MP-2026-0089",
    station: "Mahadevapura PS",
    category: "Vehicle Theft",
    confidence: 0.785,
    priorsCount: 6,
    status: "Habitual Offender Register",
    bioHash: "FAC-1092-C998-4421",
    linkedEntities: ["Suresh M."],
  },
  {
    id: "SUS-804",
    name: "Rohit V.",
    alias: "Blade Rohit",
    age: 27,
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80",
    caseId: "KA-WF-2026-0421",
    station: "Whitefield PS",
    category: "Assault / Extortion",
    confidence: 0.712,
    priorsCount: 3,
    status: "Surveillance Radar",
    bioHash: "FAC-3381-D001-9920",
    linkedEntities: ["Prakash V."],
  },
];

export const faceMatches = [
  { id: "F-101", label: "Unidentified subject, Whitefield PS lineup DB", confidence: 0.91, case: "KA-WF-2026-0417" },
  { id: "F-104", label: "Unidentified subject, K.R. Puram PS lineup DB", confidence: 0.63, case: "KA-KR-2026-0112" },
  { id: "F-109", label: "Unidentified subject, Mahadevapura PS lineup DB", confidence: 0.41, case: "KA-MP-2026-0089" },
];

export const cctvMatches = [
  { id: "C-2201", label: "Junction Cam 4 · 14 Jul 2026, 21:12", confidence: 0.78, meta: "Vehicle silhouette + timestamp match" },
  { id: "C-2214", label: "ATM Cam 1 · 15 Jul 2026, 09:40", confidence: 0.55, meta: "Partial plate match" },
];

export const vehicleMatches = [
  { id: "V-330", label: "KA-01-AB-3321 (2-wheeler)", confidence: 0.88, meta: "Re-ID across 3 camera feeds, 40 min window" },
  { id: "V-341", label: "KA-05-CD-7710 (4-wheeler)", confidence: 0.49, meta: "Single-feed partial match" },
];

/* ---------------- Evidence Locker (standalone) ---------------- */
export const evidenceLocker = [
  {
    id: "EV-8841",
    name: "cctv_junction_cam4.mp4",
    case: "KA-WF-2026-0417",
    hash: "8f21a9…c9a4",
    officer: "SI Ramesh K.",
    status: "verified" as const,
    custody: [
      { step: "Collected & hashed on upload", ts: "14 Jul 2026, 16:05", ok: true },
      { step: "Stored in MinIO, AES-256 server-side encrypted", ts: "14 Jul 2026, 16:06", ok: true },
      { step: "Accessed by SI Ramesh K. — hash re-verified", ts: "16 Jul 2026, 10:22", ok: true },
    ],
  },
  {
    id: "EV-8842",
    name: "witness_statement.pdf",
    case: "KA-WF-2026-0417",
    hash: "0a7741…be",
    officer: "SI Ramesh K.",
    status: "verified" as const,
    custody: [
      { step: "Collected & hashed on upload", ts: "15 Jul 2026, 11:00", ok: true },
      { step: "Stored in MinIO, AES-256 server-side encrypted", ts: "15 Jul 2026, 11:01", ok: true },
    ],
  },
  {
    id: "EV-8850",
    name: "recovered_phone_dump.zip",
    case: "KA-KR-2026-0112",
    hash: "5c02f0…11",
    officer: "PSI Deepa N.",
    status: "mismatch" as const,
    custody: [
      { step: "Collected & hashed on upload", ts: "10 Jul 2026, 09:12", ok: true },
      { step: "Stored in MinIO, AES-256 server-side encrypted", ts: "10 Jul 2026, 09:13", ok: true },
      { step: "Accessed by PSI Deepa N. — hash mismatch detected", ts: "20 Jul 2026, 14:30", ok: false },
    ],
  },
];


