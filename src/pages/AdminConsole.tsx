import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Badge, Button, AlertBanner } from "@/components/ui/Primitives";
import { adminApi } from "@/services/api";
import { UserPlus, Upload, X, Users, HeartPulse, ShieldAlert, ShieldCheck, UserCheck, Lock } from "lucide-react";
import SystemHealth from "./SystemHealth";
import { getCurrentUser, getStoredUsers, updateUserStatus, PoliceUser } from "@/services/authStore";

import { exportToCSV } from "@/utils/exportHelper";

export default function AdminConsole() {
  const currentUser = getCurrentUser();
  const isDsp = currentUser.rank === "DSP";
  const [section, setSection] = useState<"users" | "health">("users");
  const [users, setUsers] = useState<PoliceUser[]>(getStoredUsers());
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    rank: "Sub-Inspector" as PoliceUser["rank"],
    roleTitle: "Investigating Officer (IO)",
    station: "Whitefield PS",
    forceId: "SI-KA-2026-999",
  });

  function handleBulkExport() {
    exportToCSV(
      `Drishti_Police_Personnel_Roster_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Officer Name", "Rank", "Role Title", "Station", "Force ID", "Account Status"],
      users.map((u) => [u.name, u.rank, u.roleTitle, u.station, u.forceId, u.status])
    );
    setSuccessMsg("Exported Personnel Roster to CSV.");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  useEffect(() => {
    setUsers(getStoredUsers());
  }, []);

  function handleToggleStatus(u: PoliceUser) {
    if (!isDsp) {
      setError("Action Denied: Only the DSP (Head of Range) can activate or suspend police personnel accounts.");
      return;
    }

    const newStatus = u.status === "active" ? "suspended" : "active";
    const updated = updateUserStatus(u.id, newStatus);
    setUsers(updated);
    setSuccessMsg(`Account status for ${u.name} (${u.rank}) changed to ${newStatus.toUpperCase()}.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!isDsp) {
      setError("Action Denied: Only the DSP can provision new police officers.");
      return;
    }
    const newOfficer: PoliceUser = {
      id: `U-${Date.now().toString().slice(-4)}`,
      name: form.name,
      rank: form.rank,
      roleTitle: form.roleTitle,
      station: form.station,
      status: "active",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      forceId: form.forceId,
    };

    const updated = [newOfficer, ...users];
    setUsers(updated);
    localStorage.setItem("drishti_police_users_v2", JSON.stringify(updated));
    setShowForm(false);
    setForm({
      name: "",
      rank: "Sub-Inspector",
      roleTitle: "Investigating Officer (IO)",
      station: "Whitefield PS",
      forceId: "SI-KA-2026-999",
    });
    setSuccessMsg(`Successfully provisioned new ${newOfficer.rank} record for ${newOfficer.name}.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Admin &amp; Personnel Control</h1>
            {isDsp && (
              <Badge tone="accent" className="font-mono">
                DSP HEAD CONTROL ACTIVE
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted">
            Police hierarchy management, account activation &amp; suspension, system health telemetry
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-line bg-white p-1">
          <button
            onClick={() => setSection("users")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              section === "users" ? "bg-primary/10 text-primary" : "text-muted"
            }`}
          >
            <Users size={13} /> Personnel &amp; Accounts
          </button>
          <button
            onClick={() => setSection("health")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              section === "health" ? "bg-primary/10 text-primary" : "text-muted"
            }`}
          >
            <HeartPulse size={13} /> System Health
          </button>
        </div>
      </div>

      {!isDsp && (
        <AlertBanner tone="warning" title="Restricted Oversight Mode">
          You are currently logged in as <strong>{currentUser.name} ({currentUser.rank})</strong>. Account suspension and activation controls are restricted exclusively to the <strong>DSP (Superintendent)</strong>. Switch to the DSP profile to manage accounts.
        </AlertBanner>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-700 font-medium">
          <ShieldCheck size={16} />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger/10 border border-danger/30 p-3 text-xs text-danger font-medium">
          <ShieldAlert size={16} />
          {error}
        </div>
      )}

      {section === "health" ? (
        <SystemHealth embedded />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">
              Police Officers &amp; Staff Directory ({users.length})
            </p>
            {isDsp && (
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={handleBulkExport}>
                  <Upload size={14} /> Export Personnel Roster (.CSV)
                </Button>
                <Button onClick={() => setShowForm(true)}>
                  <UserPlus size={14} /> Provision Officer
                </Button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showForm && isDsp && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <Card>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Provision New Police Officer Account</p>
                    <button onClick={() => setShowForm(false)} className="text-muted hover:text-ink">
                      <X size={16} />
                    </button>
                  </div>
                  <form onSubmit={handleCreateUser} className="grid gap-3 sm:grid-cols-3">
                    <input
                      required
                      placeholder="Officer Full Name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input"
                    />
                    <select
                      value={form.rank}
                      onChange={(e) => setForm({ ...form, rank: e.target.value as any })}
                      className="input"
                    >
                      <option value="Inspector">Inspector (SHO)</option>
                      <option value="Sub-Inspector">Sub-Inspector (IO)</option>
                      <option value="Constable">Constable</option>
                      <option value="Analyst">Analyst</option>
                      <option value="DSP">DSP (Superintendent)</option>
                    </select>
                    <input
                      required
                      placeholder="Force ID (e.g. SI-KA-2026-99)"
                      value={form.forceId}
                      onChange={(e) => setForm({ ...form, forceId: e.target.value })}
                      className="input"
                    />
                    <input
                      required
                      placeholder="Station / Unit"
                      value={form.station}
                      onChange={(e) => setForm({ ...form, station: e.target.value })}
                      className="input sm:col-span-2"
                    />
                    <Button type="submit" className="sm:col-span-1">
                      Provision Account
                    </Button>
                  </form>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-black/[0.015] text-left text-xs text-muted">
                <tr>
                  {["Officer", "Rank", "Station / Unit", "Force ID", "Account Status", "DSP Action Controls"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => {
                  const isSuspended = u.status === "suspended";
                  return (
                    <tr key={u.id} className="hover:bg-primary/[0.02] transition">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2.5">
                          <img src={u.avatar} alt={u.name} className="h-8 w-8 rounded-full object-cover shrink-0 border border-line" />
                          <div>
                            <p className="font-semibold text-ink">{u.name}</p>
                            <p className="text-[11px] text-muted">{u.roleTitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={u.rank === "DSP" ? "accent" : "info"}>{u.rank}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">{u.station}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">{u.forceId}</td>
                      <td className="px-4 py-3">
                        <Badge tone={isSuspended ? "danger" : "success"}>
                          {isSuspended ? "SUSPENDED" : "ACTIVE"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.rank === "DSP" ? (
                          <span className="text-xs text-muted italic">Root Head Account</span>
                        ) : (
                          <Button
                            size="sm"
                            variant={isSuspended ? "primary" : "secondary"}
                            destructive={!isSuspended}
                            disabled={!isDsp}
                            onClick={() => handleToggleStatus(u)}
                          >
                            {isSuspended ? "Reactivate Account" : "Deactivate / Suspend Account"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <style>{`.input{ width:100%; border:1px solid #E5E9F0; background:#fff; border-radius:8px; padding:8px 10px; font-size:13px; outline:none; } .input:focus{ border-color:#2563EB; }`}</style>
    </div>
  );
}
