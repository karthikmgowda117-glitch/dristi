import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileBarChart2, Loader2, Download, TrendingUp, Map, Clock3, FileCheck2 } from "lucide-react";
import { Card, Button, Badge, EmptyState, AlertBanner } from "@/components/ui/Primitives";
import TrendForecast from "./TrendForecast";

const REPORT_TYPES = [
  { key: "trend", label: "Trend Briefing", icon: TrendingUp },
  { key: "hotspot", label: "Hotspot Summary", icon: Map },
  { key: "aging", label: "Case Aging / SLA", icon: Clock3 },
  { key: "court", label: "Court Evidence Package", icon: FileCheck2 },
  { key: "forecast", label: "Trend Forecast", icon: FileBarChart2 },
] as const;

type ReportKey = typeof REPORT_TYPES[number]["key"];

import { downloadFile } from "@/utils/exportHelper";

export default function Reports() {
  const [type, setType] = useState<ReportKey | null>("trend");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  function generate() {
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 1400);
  }

  function handleDownloadReport() {
    const reportTitle = REPORT_TYPES.find((r) => r.key === type)?.label || "Report";
    const reportText = `KARNATAKA STATE POLICE — PROJECT DRISHTI OFFICIAL REPORT
Title: ${reportTitle}
Unit Scope: Whitefield PS (Bengaluru East Range)
Generated: ${new Date().toLocaleString()}
Date Range: 25 Jun 2026 – 25 Jul 2026
------------------------------------------------------------------
EXECUTIVE SUMMARY & STATISTICAL AGGREGATES:
- Total Registered Cases: 128
- Case Closure Rate: 68%
- Average Case Aging: 24 Days
- Active Investigation SLA Status: 85% Within Compliance

EXPLAINABILITY & AUDIT APPENDIX:
- AI Vector Embedding Similarity Method: 512D Cosine Distance
- Z-Score Anomaly Baseline: 90-day rolling average
- Hashing Standard: SHA-256 (AES-256 Encrypted in MinIO)

Approved for official KSP internal briefing by Officer In-Charge.`;

    downloadFile(`KSP_Drishti_${reportTitle.replace(/\s+/g, "_")}_2026.txt`, reportText, "text/plain;charset=utf-8;");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted">Generate and export trend briefings, hotspot summaries, aging reports, court packages</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.key}
            onClick={() => { setType(r.key); setGenerated(false); }}
            className={`flex flex-col items-start gap-2 rounded-xl2 border p-3 text-left transition ${
              type === r.key ? "border-primary/40 bg-primary/5" : "border-line bg-white hover:border-primary/20"
            }`}
          >
            <r.icon size={17} className={type === r.key ? "text-primary" : "text-muted"} />
            <span className="text-sm font-medium">{r.label}</span>
          </button>
        ))}
      </div>

      {type === "forecast" ? (
        <TrendForecast />
      ) : !type ? (
        <EmptyState icon={<FileBarChart2 size={28} />} title="Select scope and report type to generate." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <p className="mb-3 text-sm font-medium">Scope</p>
            <div className="space-y-3">
              <Field label="Unit">
                <select className="input"><option>Whitefield PS</option><option>Bengaluru East Range</option></select>
              </Field>
              <Field label="Date range">
                <div className="flex gap-2">
                  <input type="date" className="input" defaultValue="2026-06-25" />
                  <input type="date" className="input" defaultValue="2026-07-25" />
                </div>
              </Field>
              <Button className="w-full" onClick={generate} disabled={generating}>
                {generating ? <><Loader2 size={14} className="animate-spin" /> Compiling…</> : "Generate"}
              </Button>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Preview</p>
              {generated && <Button size="sm" variant="secondary" onClick={handleDownloadReport}><Download size={13} /> Export PDF / Text Report</Button>}
            </div>

            {generating && (
              <div className="flex flex-col items-center gap-2 py-14 text-sm text-muted">
                <Loader2 className="animate-spin text-primary" size={20} />
                Compiling report — large scopes can take several seconds.
              </div>
            )}

            {!generating && !generated && (
              <p className="py-10 text-center text-sm text-muted">Configure scope and click Generate to preview.</p>
            )}

            {!generating && generated && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <AlertBanner tone="warning" title="Partial-data warning">
                  Officer Performance sub-query for Mahadevapura PS timed out and is excluded below — the rest of the
                  report is complete and unaffected.
                </AlertBanner>
                <div className="rounded-xl2 border border-line p-4">
                  <p className="text-sm font-semibold">{REPORT_TYPES.find((r) => r.key === type)?.label} — Whitefield PS</p>
                  <p className="mt-1 text-xs text-muted">25 Jun 2026 – 25 Jul 2026</p>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <Stat label="Cases" value="128" />
                    <Stat label="Closure rate" value="68%" />
                    <Stat label="Avg. aging" value="24d" />
                  </div>
                  <p className="mt-4 text-xs text-muted">Explainability appendix (method tags for every AI-derived figure) attached on export.</p>
                </div>
              </motion.div>
            )}
          </Card>
        </div>
      )}

      <style>{`.input{ width:100%; border:1px solid #E5E9F0; background:#fff; border-radius:8px; padding:8px 10px; font-size:13px; outline:none; } .input:focus{ border-color:#2563EB; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted">{label}</span>{children}</label>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-lg font-semibold">{value}</p><p className="text-[11px] text-muted">{label}</p></div>;
}
