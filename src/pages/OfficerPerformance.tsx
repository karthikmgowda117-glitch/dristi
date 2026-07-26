import { useState, useEffect } from "react";
import { Card, Badge, Button, AlertBanner } from "@/components/ui/Primitives";
import { officerStats as initialStats, workloadSuggestion as initialSuggestion } from "@/data/mock";
import { analyticsApi } from "@/services/api";
import { ArrowRight, Gauge } from "lucide-react";

const WORKLOAD_TONE = { low: "success", medium: "warning", high: "danger" } as const;

export default function OfficerPerformance() {
  const [stats, setStats] = useState<any[]>(initialStats);
  const [suggestion, setSuggestion] = useState<any>(initialSuggestion);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    analyticsApi.getOfficerStats().then((data) => {
      if (data && data.length) setStats(data);
    });
    analyticsApi.getWorkloadSuggestions().then((data) => {
      if (data) setSuggestion(data);
    });
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Officer Performance Insights</h1>
        <p className="text-sm text-muted">Station-scoped visibility · not shown to peer investigators, by design</p>
      </div>

      <AlertBanner tone="info" title="Visibility note">
        This view is restricted to SHO (station) and Supervisor (district/range) roles — it is explicitly not exposed
        to peer investigators, to prevent use as an informal ranking or surveillance tool.
      </AlertBanner>

      <Card className="p-0">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Gauge size={15} className="text-primary" />
          <p className="text-sm font-medium">Officer / station comparison</p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-black/[0.015] text-left text-xs text-muted">
            <tr>{["Officer", "Station", "Closure rate", "Open cases", "Avg. aging", "Workload"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stats.map((o) => (
              <tr key={o.name} className="hover:bg-primary/[0.02]">
                <td className="px-4 py-3 font-medium">{o.name}</td>
                <td className="px-4 py-3 text-muted">{o.station}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-black/[0.06]">
                      <div className="h-full rounded-full bg-success" style={{ width: `${o.closureRate}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-muted">{o.closureRate}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{o.openCases}</td>
                <td className="px-4 py-3 tabular-nums">{o.avgAging}d</td>
                <td className="px-4 py-3"><Badge tone={WORKLOAD_TONE[o.workload as keyof typeof WORKLOAD_TONE] || "info"}>{o.workload}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">Workload-balance suggestion</p>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-line bg-black/[0.015] p-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">{suggestion.from}</span>
            <ArrowRight size={15} className="text-muted" />
            <span className="font-medium">{suggestion.to}</span>
            <Badge tone="accent">{suggestion.caseCount} cases</Badge>
          </div>
          {applied ? (
            <Badge tone="success">Reassignment applied</Badge>
          ) : (
            <Button size="sm" onClick={() => setApplied(true)}>Apply (requires SHO approval)</Button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">{suggestion.reason}</p>
      </Card>
    </div>
  );
}
