import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Archive, GitCompare, Share2, GitBranch, MessageSquareText,
  UserSquare2, CheckSquare, Sparkles, Upload, ShieldAlert, CheckCircle2,
} from "lucide-react";
import { Card, Badge, Button, ConfidenceMeter, TraceGlyph, EmptyState, SkeletonBlock, ProvenanceTag, AlertBanner } from "@/components/ui/Primitives";
import { ExplainabilityDrawer } from "@/components/ui/ExplainabilityPanel";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { graphNodes, graphEdges, sampleTrace, similarityTrace, graphTrace } from "@/data/mock";

const TABS = [
  { key: "intake", label: "Intake Assist", icon: Sparkles },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "evidence", label: "Evidence", icon: Archive },
  { key: "similar", label: "Similar Cases", icon: GitCompare },
  { key: "graph", label: "Network Graph", icon: Share2 },
  { key: "explain", label: "Explainability", icon: GitBranch },
  { key: "copilot", label: "Copilot", icon: MessageSquareText },
  { key: "profile", label: "Intelligence Profile", icon: UserSquare2 },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
] as const;

import { casesApi, graphApi, evidenceApi } from "@/services/api";

type TabKey = typeof TABS[number]["key"];

export default function CaseDetail() {
  const { id } = useParams();
  const caseId = id ?? "KA-WF-2026-0417";
  const [caseData, setCaseData] = useState<any>(null);
  const [tab, setTab] = useState<TabKey>("timeline");
  const [traceOpen, setTraceOpen] = useState(false);
  const [activeTrace, setActiveTrace] = useState(sampleTrace);

  useEffect(() => {
    casesApi.getCaseDetail(caseId).then((data) => setCaseData(data));
  }, [caseId]);

  function openTrace(t: typeof sampleTrace) {
    setActiveTrace(t);
    setTraceOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="surface-card rounded-xl2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-lg font-semibold">{id ?? "KA-WF-2026-0417"}</h1>
              <Badge tone="warning">Under Investigation</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">Chain Snatching · Whitefield PS · Filed 13 Jul 2026</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["BNS §304", "BNS §309"].map((s) => (
              <Badge key={s} tone="gold">{s}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl2 border border-line bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.key ? "bg-primary/10 text-primary" : "text-muted hover:bg-black/[0.03] hover:text-ink"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content — each tab loads/fails independently, per Case Detail partial-load philosophy */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {tab === "intake" && <IntakeAssistTab onTrace={() => openTrace(similarityTrace)} />}
          {tab === "timeline" && <TimelineTab />}
          {tab === "evidence" && <EvidenceTab />}
          {tab === "similar" && <SimilarCasesTab onTrace={() => openTrace(similarityTrace)} />}
          {tab === "graph" && <GraphTab onTrace={() => openTrace(graphTrace)} />}
          {tab === "explain" && <ExplainTab onOpen={() => openTrace(sampleTrace)} />}
          {tab === "copilot" && <CopilotTab />}
          {tab === "profile" && <IntelligenceProfileTab />}
          {tab === "tasks" && <TasksTab />}
        </motion.div>
      </AnimatePresence>

      <ExplainabilityDrawer open={traceOpen} onClose={() => setTraceOpen(false)} trace={activeTrace} />
    </div>
  );
}

/* ---------------- Intake Assist ---------------- */
function IntakeAssistTab({ onTrace }: { onTrace: () => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <p className="mb-2 text-sm font-medium">Completeness checklist</p>
        <ul className="space-y-2 text-sm">
          {[
            ["Complainant details", true],
            ["Accused description", true],
            ["Act/Section provisional entry", true],
            ["Evidence attached", false],
          ].map(([label, done], i) => (
            <li key={i} className="flex items-center gap-2">
              {done ? <CheckCircle2 size={15} className="text-success" /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-line" />}
              <span className={done ? "text-ink" : "text-muted"}>{label as string}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="trace-seam" aiDerived>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Suggested Act/Sections</p>
          <TraceGlyph onClick={onTrace} />
        </div>
        <div className="space-y-2">
          {["BNS §304 — precedent in 14 similar cases", "BNS §309 — precedent in 6 similar cases"].map((s) => (
            <div key={s} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
              <span>{s}</span>
              <Button size="sm" variant="secondary">Accept</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Timeline ---------------- */
function TimelineTab() {
  const events = [
    { title: "FIR registered", meta: "13 Jul 2026 · 09:12", type: "system" },
    { title: "Case assigned to SI Ramesh K.", meta: "13 Jul 2026 · 09:40", type: "system" },
    { title: "Evidence uploaded: CCTV clip", meta: "14 Jul 2026 · 16:05", type: "evidence" },
    { title: "Manual note: witness re-interviewed", meta: "16 Jul 2026 · 11:20", type: "note" },
  ];
  return (
    <Card>
      <div className="relative space-y-6 pl-6">
        <div className="absolute bottom-2 left-[7px] top-2 w-px bg-line" />
        {events.map((e, i) => (
          <div key={i} className="relative">
            <span className="absolute -left-6 top-0.5 h-3 w-3 rounded-full border-2 border-primary bg-white" />
            <p className="text-sm font-medium text-ink">{e.title}</p>
            <p className="text-xs text-muted">{e.meta}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Evidence ---------------- */
function EvidenceTab() {
  const items = [
    { name: "cctv_junction_cam4.mp4", hash: "8f21…c9a4", date: "14 Jul 2026", officer: "SI Ramesh K.", verified: true },
    { name: "witness_statement.pdf", hash: "0a77…41be", date: "15 Jul 2026", officer: "SI Ramesh K.", verified: true },
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button><Upload size={14} /> Upload evidence</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <Card key={it.name}>
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium">{it.name}</p>
              {it.verified ? <Badge tone="success">Hash verified</Badge> : <Badge tone="danger">Mismatch</Badge>}
            </div>
            <p className="mt-1 font-mono text-xs text-muted">SHA-256 {it.hash}</p>
            <p className="mt-2 text-xs text-muted">{it.date} · {it.officer}</p>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <CheckCircle2 size={13} className="text-success" /> Custody entry logged, immutable
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Similar Cases ---------------- */
function SimilarCasesTab({ onTrace }: { onTrace: () => void }) {
  return (
    <Card className="trace-seam" aiDerived>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Ranked similarity results</p>
        <TraceGlyph onClick={onTrace} />
      </div>
      <div className="space-y-2">
        {[
          { id: "KA-KR-2026-0398", score: 0.82, matched: ["category", "location proximity", "time proximity"] },
          { id: "KA-MP-2026-0089", score: 0.61, matched: ["category", "narrative similarity"] },
        ].map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
            <div>
              <p className="font-mono text-sm">{r.id}</p>
              <p className="text-xs text-muted">Matched: {r.matched.join(", ")}</p>
            </div>
            <div className="flex items-center gap-3">
              <ConfidenceMeter value={r.score} />
              <Button size="sm" variant="secondary">Flag as linked</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Network Graph (case-scoped) ---------------- */
function GraphTab({ onTrace }: { onTrace: () => void }) {
  return (
    <Card className="trace-seam p-0" aiDerived>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-medium">Case-scoped network graph</p>
        <div className="flex items-center gap-2">
          <Badge tone="accent">Reasoning path overlay ON</Badge>
          <TraceGlyph onClick={onTrace} />
        </div>
      </div>
      <div className="p-3">
        <GraphCanvas nodes={graphNodes} edges={graphEdges} reasoningPathEdges={[5]} height={380} onEdgeSelect={onTrace} />
      </div>
      <div className="border-t border-line px-4 py-2 text-xs text-muted">
        Dashed edge = <span className="font-medium text-ink">CONTACT_LINKED</span> (shared field, not an asserted relationship) · click any edge for detail
      </div>
    </Card>
  );
}

/* ---------------- Explainability ---------------- */
function ExplainTab({ onOpen }: { onOpen: () => void }) {
  return (
    <Card>
      <p className="mb-3 text-sm text-muted">Every AI-surfaced item on this case links here. Select one to inspect its trace.</p>
      <div className="space-y-2">
        {["Similarity flag: KA-KR-2026-0398", "Anomaly alert: station-level spike", "Graph link: shared contact number"].map((s) => (
          <button key={s} onClick={onOpen} className="trace-seam flex w-full items-center justify-between rounded-lg border border-line px-3 py-2.5 text-left text-sm hover:border-accent/40">
            {s} <TraceGlyph />
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Copilot ---------------- */
function CopilotTab() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "I can suggest applicable Act/Sections and next investigative steps grounded in precedent from similar cases. What would you like to check?" },
  ]);
  const [input, setInput] = useState("");
  function handleSend() {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: "user", text: input }, { role: "assistant", text: "BNS §304 applies in 14 similar prior cases — would you like it inserted into case notes?" }]);
    setInput("");
  }

  return (
    <Card className="flex h-[420px] flex-col p-0">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`trace-seam max-w-[75%] rounded-xl2 px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-white" : "border border-line bg-white"}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-line p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ask about applicable sections, precedent, next steps…"
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Button size="sm" onClick={handleSend}>Send</Button>
      </div>
    </Card>
  );
}

/* ---------------- Intelligence Profile ---------------- */
function IntelligenceProfileTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <p className="mb-2 text-sm font-medium">Mini timeline</p>
        <TimelineTab />
      </Card>
      <div className="space-y-4">
        <Card>
          <p className="mb-1 text-sm font-medium">Evidence summary</p>
          <p className="text-xs text-muted">2 items · both hash-verified</p>
        </Card>
        <Card>
          <p className="mb-1 text-sm font-medium">Copilot suggestions</p>
          <p className="text-xs text-muted">2 pending Act/Section suggestions</p>
        </Card>
        <Button variant="secondary" className="w-full">Export one-page summary</Button>
      </div>
    </div>
  );
}

/* ---------------- Tasks ---------------- */
function TasksTab() {
  const [tasks, setTasks] = useState([
    { text: "Re-interview witness at junction store", done: true },
    { text: "Submit CCTV footage to forensics", done: false },
  ]);
  const [input, setInput] = useState("");
  return (
    <Card>
      <div className="mb-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Button
          size="sm"
          onClick={() => { if (input.trim()) { setTasks((t) => [...t, { text: input, done: false }]); setInput(""); } }}
        >
          Add
        </Button>
      </div>
      {tasks.length === 0 ? (
        <EmptyState title="No tasks yet for this case" />
      ) : (
        <div className="space-y-2">
          {tasks.map((t, i) => (
            <label key={i} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => setTasks((ts) => ts.map((x, xi) => (xi === i ? { ...x, done: !x.done } : x)))}
                className="accent-primary"
              />
              <span className={t.done ? "text-muted line-through" : "text-ink"}>{t.text}</span>
            </label>
          ))}
        </div>
      )}
    </Card>
  );
}
