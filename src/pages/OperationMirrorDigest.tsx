import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, Badge, TraceGlyph, EmptyState } from "@/components/ui/Primitives";
import { ExplainabilityDrawer } from "@/components/ui/ExplainabilityPanel";
import { digestItems as initialItems, sampleTrace } from "@/data/mock";
import { analyticsApi } from "@/services/api";
import { Sparkles, Archive as ArchiveIcon } from "lucide-react";

const SEVERITY_DOT = { critical: "bg-danger", warning: "bg-warning", info: "bg-primary" } as const;

export default function OperationMirrorDigest() {
  const [digest, setDigest] = useState<any[]>(initialItems);
  const [role, setRole] = useState<"Investigator" | "Supervisor">("Investigator");
  const [traceOpen, setTraceOpen] = useState(false);
  const [archived, setArchived] = useState<number[]>([]);
  const hasRun = true;

  useEffect(() => {
    analyticsApi.getDailyDigest().then((data) => {
      if (data && data.length) setDigest(data);
    });
  }, []);

  const visible = digest.filter((_, i) => !archived.includes(i));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Sparkles size={19} className="text-accent" /> Operation Mirror
          </h1>
          <p className="text-sm text-muted">Scheduled, ranked packaging of alerts, similarity flags, and graph findings</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-line bg-white p-1">
          {(["Investigator", "Supervisor"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${role === r ? "bg-primary/10 text-primary" : "text-muted"}`}
            >
              View as {r}
            </button>
          ))}
        </div>
      </div>

      {!hasRun ? (
        <EmptyState title="First digest not yet generated" hint="The scheduled compilation job hasn't run yet on this fresh deployment." />
      ) : visible.length === 0 ? (
        <EmptyState icon={<Sparkles size={26} />} title="No new intelligence since your last digest." />
      ) : role === "Investigator" ? (
        <div className="space-y-3">
          {visible.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="trace-seam flex items-center justify-between" aiDerived>
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 rounded-full ${SEVERITY_DOT[item.severity as keyof typeof SEVERITY_DOT] || "bg-primary"}`} />
                  <div>
                    <Badge tone="neutral">{item.kind}</Badge>
                    <p className="mt-1 text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted">{item.ts}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setArchived((a) => [...a, i])} className="text-muted hover:text-ink" aria-label="Archive">
                    <ArchiveIcon size={15} />
                  </button>
                  <TraceGlyph onClick={() => setTraceOpen(true)} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="trace-seam" aiDerived>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">AI-summarized briefing — Bengaluru East Range</p>
            <TraceGlyph onClick={() => setTraceOpen(true)} />
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            Whitefield PS saw a statistically significant chain-snatching spike overnight, already flagged to the SHO.
            A new similarity match links two open cases across stations, and a fresh shared-contact edge was found on
            an accused already under investigation — reviewed together, these three items suggest a single active
            cluster worth a coordinated follow-up rather than three separate leads.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {visible.map((item, i) => (
              <Badge key={i} tone="neutral">{item.kind}</Badge>
            ))}
          </div>
        </Card>
      )}

      <ExplainabilityDrawer open={traceOpen} onClose={() => setTraceOpen(false)} trace={sampleTrace} />
    </div>
  );
}
