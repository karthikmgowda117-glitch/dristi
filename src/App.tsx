import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import CommandDashboard from "@/pages/CommandDashboard";
import CaseList from "@/pages/CaseList";
import CaseDetail from "@/pages/CaseDetail";
import NetworkGraphExplorer from "@/pages/NetworkGraphExplorer";
import AlertsFeed from "@/pages/AlertsFeed";
import Reports from "@/pages/Reports";
import JarvisAI from "@/pages/JarvisAI";
import AdminConsole from "@/pages/AdminConsole";
import AuditLog from "@/pages/AuditLog";
import OperationMirrorDigest from "@/pages/OperationMirrorDigest";
import IntelligenceSearch from "@/pages/IntelligenceSearch";
import EvidenceLocker from "@/pages/EvidenceLocker";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/*"
        element={
          <AppShell>
            <Routes>
              <Route path="dashboard" element={<CommandDashboard />} />
              <Route path="cases" element={<CaseList />} />
              <Route path="cases/:id" element={<CaseDetail />} />
              <Route path="graph" element={<NetworkGraphExplorer />} />
              <Route path="alerts" element={<AlertsFeed />} />
              <Route path="search" element={<IntelligenceSearch />} />
              <Route path="evidence" element={<EvidenceLocker />} />
              <Route path="reports" element={<Reports />} />
              <Route path="jarvis" element={<JarvisAI />} />
              <Route path="performance" element={<Navigate to="/jarvis" replace />} />
              <Route path="admin" element={<AdminConsole />} />
              <Route path="audit" element={<AuditLog />} />
              <Route path="digest" element={<OperationMirrorDigest />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}
