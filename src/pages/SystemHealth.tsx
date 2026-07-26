import React, { useState, useEffect } from "react";
import { Card, Badge } from "@/components/ui/Primitives";
import { services as initialServices } from "@/data/mock";
import { adminApi } from "@/services/api";
import { Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function SystemHealth({ embedded = false }: { embedded?: boolean }) {
  const [serviceList, setServiceList] = useState<any[]>(initialServices);

  useEffect(() => {
    adminApi.getSystemHealth().then((data) => {
      if (data && data.length) setServiceList(data);
    });
  }, []);
  return (
    <div className="space-y-5">
      {!embedded && (
        <div>
          <h1 className="text-xl font-semibold">System Health</h1>
          <p className="text-sm text-muted">Operational visibility · Admin &amp; KSP IT Cell</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {serviceList.map((s, i) => (
          <motion.div key={s.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{s.name}</p>
                {s.status === "healthy" ? (
                  <Badge tone="success"><CheckCircle2 size={11} /> Healthy</Badge>
                ) : (
                  <Badge tone="warning"><AlertTriangle size={11} /> Degraded</Badge>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-muted">Uptime (30d)</p><p className="font-mono text-sm">{s.uptime}</p></div>
                <div><p className="text-muted">p95 latency</p><p className="font-mono text-sm">{s.p95}</p></div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className={`h-full rounded-full ${s.status === "healthy" ? "bg-success" : "bg-warning"}`}
                  style={{ width: s.status === "healthy" ? "97%" : "68%" }}
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Activity size={15} className="text-primary" />
          <p className="text-sm font-medium">Live request volume (last 60 min)</p>
        </div>
        <div className="flex h-24 items-end gap-1">
          {Array.from({ length: 48 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${20 + Math.abs(Math.sin(i / 3)) * 70}%` }}
              transition={{ delay: i * 0.01 }}
              className="flex-1 rounded-t bg-primary/25"
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
