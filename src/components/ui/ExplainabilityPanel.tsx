import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, GitBranch, FileText, Layers } from "lucide-react";
import { ConfidenceMeter, SkeletonBlock, ProvenanceTag } from "./Primitives";

export interface TraceData {
  methodTag: string;
  plainLanguage: string;
  confidence: number;
  sourceRecords: { id: string; label: string; type: string }[];
  provenance?: "SEED" | "SYNTHETIC" | "NLP_EXTRACTED";
  reasoningPath?: string[]; // ordered edge labels, for graph-derived outputs (FR-38)
  failed?: boolean;
}

export function ExplainabilityDrawer({
  open,
  onClose,
  trace,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  trace?: TraceData;
  loading?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/10 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="glass-panel fixed right-4 top-4 bottom-4 z-50 w-[400px] overflow-y-auto rounded-xl2 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <GitBranch size={14} />
                </span>
                <h3 className="text-sm font-semibold">Explainability trace</h3>
              </div>
              <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-black/5 hover:text-ink" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {loading && (
              <div className="space-y-3">
                <SkeletonBlock className="h-4 w-3/4" />
                <SkeletonBlock className="h-16 w-full" />
                <SkeletonBlock className="h-4 w-1/2" />
              </div>
            )}

            {!loading && trace?.failed && (
              <div className="rounded-xl2 border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
                Explainability trace unavailable. This output is flagged low-trust until its trace can be reconstructed —
                treat it as unverified and do not act on it directly.
              </div>
            )}

            {!loading && trace && !trace.failed && (
              <div className="space-y-5">
                {trace.provenance && <ProvenanceTag kind={trace.provenance} />}

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Method</p>
                  <p className="rounded-lg bg-accent/8 px-3 py-2 text-sm font-medium text-ink">{trace.methodTag}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">How this works</p>
                  <p className="text-sm leading-relaxed text-ink/80">{trace.plainLanguage}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Confidence</p>
                  <ConfidenceMeter value={trace.confidence} />
                </div>

                {trace.reasoningPath && trace.reasoningPath.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                      <Layers size={12} /> Reasoning path
                    </p>
                    <ol className="space-y-1.5">
                      {trace.reasoningPath.map((step, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1.5 text-xs text-ink"
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                            {i + 1}
                          </span>
                          {step}
                        </motion.li>
                      ))}
                    </ol>
                  </div>
                )}

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                    <FileText size={12} /> Source records
                  </p>
                  <div className="space-y-1.5">
                    {trace.sourceRecords.map((s) => (
                      <button
                        key={s.id}
                        className="flex w-full items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-left text-xs hover:border-primary/40"
                      >
                        <span className="font-medium text-ink">{s.label}</span>
                        <span className="font-mono text-muted">{s.type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full rounded-lg border border-line py-2 text-xs font-medium text-muted hover:bg-black/[0.03]"
                >
                  Mark reviewed
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
