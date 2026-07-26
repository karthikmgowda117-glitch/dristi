import React, { useState, useEffect } from "react";
import { Card, Badge, TraceGlyph, EmptyState } from "@/components/ui/Primitives";
import { ExplainabilityDrawer } from "@/components/ui/ExplainabilityPanel";
import { sampleTrace } from "@/data/mock";
import { alertsApi } from "@/services/api";
import { BellRing } from "lucide-react";

export default function AlertsFeed() {
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [traceOpen, setTraceOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  useEffect(() => {
    alertsApi.getAlerts().then((data) => setAlertsList(data));
  }, []);

  const filtered = alertsList.filter((a) => !severityFilter || a.severity === severityFilter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Alerts</h1>
        <p className="text-sm text-muted">Statistical anomaly alerts, jurisdiction-scoped</p>
      </div>

      <div className="flex gap-2">
        {["critical", "warning", "info"].map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(severityFilter === s ? null : s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
              severityFilter === s ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BellRing size={28} />} title="No active alerts for your jurisdiction." />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card key={a.id} className="trace-seam flex items-center justify-between" aiDerived>
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${a.severity === "critical" ? "bg-danger" : a.severity === "warning" ? "bg-warning" : "bg-primary"}`} />
                <div>
                  <p className="text-sm font-medium">{a.category} · {a.unit}</p>
                  <p className="text-xs text-muted">{a.method}</p>
                  <p className="text-xs text-muted/70">{a.ts}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={a.severity === "critical" ? "danger" : a.severity === "warning" ? "warning" : "accent"}>{a.severity}</Badge>
                <TraceGlyph onClick={() => setTraceOpen(true)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <ExplainabilityDrawer open={traceOpen} onClose={() => setTraceOpen(false)} trace={sampleTrace} />
    </div>
  );
}
