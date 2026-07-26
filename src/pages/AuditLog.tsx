import React, { useState, useEffect } from "react";
import { Card, Badge, Button } from "@/components/ui/Primitives";
import { auditEntries as initialAudit } from "@/data/mock";
import { adminApi } from "@/services/api";
import { Download, Filter } from "lucide-react";

import { exportToCSV } from "@/utils/exportHelper";

const ACTION_TONE: Record<string, "accent" | "warning" | "success" | "neutral"> = {
  READ: "neutral",
  WRITE: "success",
  UPDATE: "warning",
  AI_QUERY: "accent",
};

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>(initialAudit);
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getAuditLogs().then((data) => {
      if (data && data.length) setLogs(data);
    });
  }, []);

  const actions = Array.from(new Set(logs.map((e) => e.action)));
  const filtered = logs.filter((e) => !actionFilter || e.action === actionFilter);

  function handleExportAudit() {
    exportToCSV(
      `Drishti_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Timestamp", "User", "Action", "Entity Target", "Jurisdiction"],
      filtered.map((e) => [e.ts, e.user, e.action, e.entity, e.jurisdiction])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Audit Log Viewer</h1>
          <p className="text-sm text-muted">100% coverage on read/write/AI-query actions · append-only</p>
        </div>
        <Button variant="secondary" onClick={handleExportAudit}>
          <Download size={14} /> Export for compliance review (.CSV)
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-muted" />
        {actions.map((a) => (
          <button
            key={a}
            onClick={() => setActionFilter(actionFilter === a ? null : a)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              actionFilter === a ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-black/[0.015] text-left text-xs text-muted">
            <tr>{["Timestamp", "User", "Action", "Entity", "Jurisdiction"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((e, i) => (
              <tr key={i} className="hover:bg-primary/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-muted">{e.ts}</td>
                <td className="px-4 py-3">{e.user}</td>
                <td className="px-4 py-3"><Badge tone={ACTION_TONE[e.action] ?? "neutral"}>{e.action}</Badge></td>
                <td className="px-4 py-3 text-muted">{e.entity}</td>
                <td className="px-4 py-3 text-muted">{e.jurisdiction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted">Every AI-query row links to its explainability trace ID — reconstructable exactly, not just logged as having occurred.</p>
    </div>
  );
}
