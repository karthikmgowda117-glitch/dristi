import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, Search, CheckCircle2, XCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { Card, Badge, EmptyState, AlertBanner } from "@/components/ui/Primitives";
import { evidenceLocker as initialLocker } from "@/data/mock";
import { evidenceApi } from "@/services/api";

export default function EvidenceLocker() {
  const [evidenceItems, setEvidenceItems] = useState<any[]>(initialLocker);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    evidenceApi.getEvidenceList().then((data) => {
      if (data && data.length) setEvidenceItems(data);
    });
  }, []);

  const filtered = evidenceItems.filter(
    (e) => (e.name || "").toLowerCase().includes(query.toLowerCase()) || (e.case || "").toLowerCase().includes(query.toLowerCase())
  );

  if (selected) return <EvidenceDetail item={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Evidence Locker</h1>
        <p className="text-sm text-muted">All evidence across your assigned cases · hash-verified chain of custody</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
        <Search size={14} className="text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by filename or case ID…" className="w-full bg-transparent text-sm outline-none" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Archive size={26} />} title="No evidence items match this search." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((e) => (
            <motion.button
              key={e.id}
              whileHover={{ y: -2 }}
              onClick={() => setSelected(e)}
              className="surface-card rounded-xl2 p-4 text-left"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium">{e.name}</p>
                {e.status === "verified" ? (
                  <Badge tone="success"><CheckCircle2 size={11} /> Verified</Badge>
                ) : (
                  <Badge tone="danger"><XCircle size={11} /> Integrity alert</Badge>
                )}
              </div>
              <p className="mt-1 font-mono text-xs text-muted">SHA-256 {e.hash}</p>
              <p className="mt-2 text-xs text-muted">{e.case} · {e.officer}</p>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

import { downloadFile } from "@/utils/exportHelper";

function EvidenceDetail({ item, onBack }: { item: any; onBack: () => void }) {
  function handleDownloadCustodyCert() {
    const certText = `KARNATAKA STATE POLICE — DIGITAL EVIDENCE CUSTODY CERTIFICATE
Evidence Item: ${item.name}
Case ID: ${item.case}
Uploading Officer: ${item.officer}
SHA-256 Hash Seal: ${item.hash}
Integrity Status: ${item.status === "verified" ? "VERIFIED (MATCHED)" : "CRITICAL ALERT (MISMATCH)"}
Generated: ${new Date().toLocaleString()}
------------------------------------------------------------------
CUSTODY CHAIN AUDIT TRAIL:
${(item.custody || [])
  .map((c: any) => `[${c.ts}] ${c.step} -> ${c.ok ? "PASS" : "FAILED / ALERT"}`)
  .join("\n")}
------------------------------------------------------------------
Verified by Drishti Cryptographic Custody Engine`;

    downloadFile(`Custody_Cert_${item.name.replace(/\s+/g, "_")}.txt`, certText, "text/plain;charset=utf-8;");
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Back to Evidence Locker
      </button>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold">{item.name}</p>
            <p className="text-xs text-muted">{item.case} · uploaded by {item.officer}</p>
          </div>
          <div className="flex items-center gap-2">
            {item.status === "verified" ? <Badge tone="success">Hash verified</Badge> : <Badge tone="danger">Hash mismatch</Badge>}
            <button
              onClick={handleDownloadCustodyCert}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-primary/40 transition"
            >
              Export Custody Certificate (.TXT)
            </button>
          </div>
        </div>
        <p className="mt-2 font-mono text-xs text-muted">SHA-256 {item.hash}</p>
      </Card>

      {item.status === "mismatch" && (
        <AlertBanner tone="critical" title="Integrity alert — further access blocked">
          The stored hash no longer matches this object. Access has been hard-blocked pending Admin review, and this
          event has been logged to the audit trail automatically.
        </AlertBanner>
      )}

      <Card>
        <p className="mb-3 text-sm font-medium">Chain of custody</p>
        <div className="relative space-y-6 pl-6">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-line" />
          {(item.custody || []).map((c: any, i: number) => (
            <div key={i} className="relative">
              <span className={`absolute -left-6 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-white ${c.ok ? "border-success" : "border-danger"}`}>
                {c.ok ? <CheckCircle2 size={10} className="text-success" /> : <ShieldAlert size={10} className="text-danger" />}
              </span>
              <p className={`text-sm font-medium ${c.ok ? "text-ink" : "text-danger"}`}>{c.step}</p>
              <p className="text-xs text-muted">{c.ts}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
