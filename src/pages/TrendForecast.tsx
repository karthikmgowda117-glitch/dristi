import React, { useState } from "react";
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import { Card, Badge, TraceGlyph, EmptyState, AlertBanner } from "@/components/ui/Primitives";
import { ExplainabilityDrawer } from "@/components/ui/ExplainabilityPanel";
import { forecastSeries } from "@/data/mock";
import { LineChart as LineIcon } from "lucide-react";

const UNITS = ["Whitefield PS", "K.R. Puram PS", "Mahadevapura PS", "Bengaluru East Range"];
const CATEGORIES = ["Chain Snatching", "Burglary", "Cyber Fraud", "Assault"];

export default function TrendForecast() {
  const [unit, setUnit] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<7 | 14 | 30>(14);
  const [traceOpen, setTraceOpen] = useState(false);

  const ready = unit && category;
  const insufficientData = ready && unit === "Mahadevapura PS"; // demo: low-volume station

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={unit ?? ""}
          onChange={(e) => setUnit(e.target.value || null)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Select jurisdiction / Unit…</option>
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <select
          value={category ?? ""}
          onChange={(e) => setCategory(e.target.value || null)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Select category…</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="ml-auto flex gap-1 rounded-lg border border-line bg-white p-1">
          {[7, 14, 30].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h as 7 | 14 | 30)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${horizon === h ? "bg-primary/10 text-primary" : "text-muted"}`}
            >
              {h}d
            </button>
          ))}
        </div>
      </div>

      {!ready ? (
        <EmptyState icon={<LineIcon size={26} />} title="Select a jurisdiction and category to generate a forecast." />
      ) : insufficientData ? (
        <AlertBanner tone="warning" title="Insufficient historical data for a reliable forecast">
          {unit} has too few recorded incidents in this category over the training window to produce a trustworthy estimate.
          Showing a precise-looking number here would be misleading, so none is generated.
        </AlertBanner>
      ) : (
        <Card className="trace-seam p-0" aiDerived>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-medium">{category} · {unit}</p>
              <p className="text-xs text-muted">Holt-Winters exponential smoothing, 24-month training window</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Fixed, non-dismissible aggregate-only badge — structural guardrail, not a hideable UI element */}
              <Badge tone="accent">Aggregate-only · Unit level</Badge>
              <TraceGlyph onClick={() => setTraceOpen(true)} />
            </div>
          </div>

          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastSeries.slice(0, horizon + 12)}>
                <CartesianGrid stroke="#E5E9F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={{ stroke: "#E5E9F0" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E9F0", fontSize: 12 }} />
                <Area type="monotone" dataKey="high" stroke="none" fill="#06B6D4" fillOpacity={0.12} />
                <Area type="monotone" dataKey="low" stroke="none" fill="#FAFBFC" fillOpacity={1} />
                <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2} dot={false} name="Actual" />
                <Line type="monotone" dataKey="forecast" stroke="#06B6D4" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Forecast" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="border-t border-line px-4 py-2 text-xs text-muted">
            No drill-down below jurisdiction level is available on this screen — forecasting is intentionally
            aggregate-only (PRD FR-37); use Reports → Hotspot Summary for station-level historical detail.
          </div>
        </Card>
      )}

      <ExplainabilityDrawer
        open={traceOpen}
        onClose={() => setTraceOpen(false)}
        trace={{
          methodTag: `Holt-Winters exponential smoothing · ${horizon}-day horizon`,
          plainLanguage: `This forecast blends seasonal and trend components from 24 months of ${category?.toLowerCase()} counts in ${unit}. It never computes or stores a score below the Unit level.`,
          confidence: 0.71,
          sourceRecords: [
            { id: "f1", label: `${unit} · 24-month baseline series`, type: "AGGREGATE" },
          ],
        }}
      />
    </div>
  );
}
