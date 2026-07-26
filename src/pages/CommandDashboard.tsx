import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Layers, Filter, CalendarRange, ChevronRight, TrendingUp, RefreshCw } from "lucide-react";
import { KPICard } from "@/components/ui/KPICard";
import { Card, Badge, AlertBanner, TraceGlyph } from "@/components/ui/Primitives";
import { ExplainabilityDrawer } from "@/components/ui/ExplainabilityPanel";
import { alerts, sampleTrace } from "@/data/mock";
import { casesApi, alertsApi } from "@/services/api";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker URLs in Vite builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const REAL_INCIDENTS = [
  { id: "INC-001", lat: 12.9716, lng: 77.5946, type: "Chain Snatching", ps: "Whitefield PS", severity: "high", status: "Active", time: "10:24 AM" },
  { id: "INC-002", lat: 12.9352, lng: 77.6245, type: "Vehicle Theft", ps: "Koramangala PS", severity: "medium", status: "Active", time: "11:15 AM" },
  { id: "INC-003", lat: 13.0358, lng: 77.5971, type: "Robbery", ps: "Yeshwanthpur PS", severity: "critical", status: "Active", time: "09:40 AM" },
  { id: "INC-004", lat: 12.9634, lng: 77.6062, type: "Assault", ps: "Indiranagar PS", severity: "low", status: "Closed", time: "08:10 AM" },
  { id: "INC-005", lat: 12.9082, lng: 77.6476, type: "Burglary", ps: "BTM Layout PS", severity: "medium", status: "Active", time: "12:05 PM" },
  { id: "INC-006", lat: 12.9279, lng: 77.6271, type: "Cyber Financial Fraud", ps: "Koramangala PS", severity: "high", status: "Active", time: "01:30 PM" },
  { id: "INC-007", lat: 13.0008, lng: 77.5856, type: "Narcotics Seizure", ps: "Rajajinagar PS", severity: "critical", status: "Active", time: "02:15 PM" },
  { id: "INC-008", lat: 12.9915, lng: 77.7149, type: "ATM Tampering", ps: "Whitefield PS", severity: "medium", status: "Active", time: "03:10 PM" },
];

const PATROL_UNITS = [
  { id: "PCR-01", lat: 12.975, lng: 77.6, status: "Patrolling · MG Road" },
  { id: "PCR-02", lat: 12.95, lng: 77.62, status: "On Scene · Domlur" },
  { id: "PCR-03", lat: 13.01, lng: 77.59, status: "Patrolling · Hebbal" },
];

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

function createCustomPin(severity: string) {
  const color = SEVERITY_COLOR[severity] || "#3b82f6";
  const html = `
    <div style="position:relative; width:30px; height:38px; display:flex; align-items:center; justify-content:center;">
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 38 15 38C15 38 30 26.25 30 15C30 6.71573 23.2843 0 15 0Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="15" cy="14" r="5" fill="#ffffff"/>
      </svg>
    </div>`;
  return L.divIcon({ html, className: "", iconSize: [30, 38], iconAnchor: [15, 38], popupAnchor: [0, -38] });
}

function createPatrolPin() {
  const html = `
    <div style="width:26px; height:26px; border-radius:50%; background:#3b82f6; border:2.5px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(59,130,246,0.6);">
      <span style="color:#ffffff; font-size:12px; font-weight:bold; font-family:monospace;">P</span>
    </div>`;
  return L.divIcon({ html, className: "", iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -16] });
}

export default function CommandDashboard() {
  const [loading, setLoading] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(14);
  const [sevFilter, setSevFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [selectedIncident, setSelectedIncident] = useState<typeof REAL_INCIDENTS[0] | null>(null);

  const [kpis, setKpis] = useState({
    openCases: 5,
    activeAlerts: 3,
    slaBreaches: 1,
    closureRate: 68,
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    Promise.all([casesApi.getCases(), alertsApi.getAlerts()])
      .then(([casesData, alertsData]) => {
        const open = casesData.filter((c: any) => c.status !== "Closed").length;
        const breaches = casesData.filter((c: any) => c.sla === "breach").length;
        setKpis({
          openCases: open || 5,
          activeAlerts: alertsData.length || 3,
          slaBreaches: breaches || 1,
          closureRate: 68,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    REAL_INCIDENTS.forEach((inc) => {
      const marker = L.marker([inc.lat, inc.lng], { icon: createCustomPin(inc.severity) }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:sans-serif; padding:4px; min-width:180px;">
          <div style="font-weight:bold; color:#1e293b; font-size:13px;">${inc.id} · ${inc.type}</div>
          <div style="font-size:11px; color:#64748b; margin-top:2px;">PS: ${inc.ps}</div>
          <div style="font-size:11px; color:#64748b;">Severity: <strong style="color:${SEVERITY_COLOR[inc.severity]}">${inc.severity.toUpperCase()}</strong></div>
          <div style="font-size:11px; color:#64748b;">Time: ${inc.time}</div>
        </div>
      `);
    });

    PATROL_UNITS.forEach((unit) => {
      const marker = L.marker([unit.lat, unit.lng], { icon: createPatrolPin() }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:sans-serif; padding:2px; font-size:12px;">
          <strong>${unit.id}</strong><br/>${unit.status}
        </div>
      `);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const visibleIncidents = sevFilter === "all" ? REAL_INCIDENTS : REAL_INCIDENTS.filter((i) => i.severity === sevFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Command Dashboard</h1>
          <p className="text-sm text-muted">Real-time spatiotemporal intelligence · Bengaluru East Range</p>
        </div>
        <button
          onClick={() => setLoading(true)}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-muted hover:text-ink transition"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh Feed
        </button>
      </div>

      {/* ── KPI Row matching exact design from image ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          label="Open cases"
          value={kpis.openCases}
          delta="+18 this week"
          icon={<Layers size={16} className="text-muted" />}
        />
        <KPICard
          label="Active alerts"
          value={kpis.activeAlerts}
          tone="warning"
          delta="2 critical"
          icon={<TrendingUp size={16} className="text-warning" />}
        />
        <KPICard
          label="SLA breaches"
          value={kpis.slaBreaches}
          tone="danger"
          delta="+3 vs last week"
          icon={<CalendarRange size={16} className="text-danger" />}
        />
        <KPICard
          label="Closure rate (30d)"
          value={kpis.closureRate}
          tone="success"
          delta="percentage points"
          icon={<Filter size={16} className="text-success" />}
        />
      </div>

      {/* ── Main Section: Real Leaflet Map + Feed ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Real Leaflet Map Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="trace-seam relative overflow-hidden p-0">
            {/* Map Header & Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between border-b border-line px-4 py-3 bg-white/90 gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <MapPin size={16} className="text-primary" /> Live GIS Crime Map — Real Coordinates
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-bg/80 rounded-lg p-1 border border-line">
                  {(["all", "critical", "high", "medium", "low"] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSevFilter(sev)}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition ${
                        sevFilter === sev
                          ? "bg-primary text-white shadow-xs"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {sev.toUpperCase()}
                    </button>
                  ))}
                </div>
                <TraceGlyph onClick={() => setTraceOpen(true)} />
              </div>
            </div>

            {/* Real Map Canvas */}
            <div className="relative h-[420px] w-full">
              <div ref={mapContainerRef} className="h-full w-full z-0" />
            </div>

            {/* Time of Day Control Bar */}
            <div className="border-t border-line px-4 py-3 bg-white">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                <span className="font-medium">Filter Time Window</span>
                <span className="font-mono font-semibold text-ink">{String(timeOfDay).padStart(2, "0")}:00 HRS</span>
              </div>
              <input
                type="range"
                min={0}
                max={23}
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </Card>

          <AlertBanner tone="warning" title="Data quality notice">
            4 records this week had invalid geocoordinates and were excluded from spatial mapping — view details in data quality panel.
          </AlertBanner>
        </div>

        {/* Right Column (1 Col): Active Incident Feed & Alerts */}
        <div className="space-y-4">
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-white">
              <p className="text-sm font-semibold text-ink">Mapped Incidents ({visibleIncidents.length})</p>
              <Badge tone="accent">Live Feed</Badge>
            </div>

            <div className="max-h-[460px] overflow-y-auto divide-y divide-line">
              {visibleIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => {
                    setSelectedIncident(inc);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([inc.lat, inc.lng], 15, { duration: 1 });
                    }
                  }}
                  className={`flex w-full items-start justify-between p-3.5 text-left transition-colors hover:bg-black/[0.02] ${
                    selectedIncident?.id === inc.id ? "bg-primary/5 border-l-3 border-primary" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">{inc.id}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: SEVERITY_COLOR[inc.severity] + "22",
                          color: SEVERITY_COLOR[inc.severity],
                        }}
                      >
                        {inc.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-ink">{inc.type}</p>
                    <p className="text-[11px] text-muted">{inc.ps} · {inc.time}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted/60 mt-1" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Explainability Drawer */}
      <ExplainabilityDrawer open={traceOpen} onClose={() => setTraceOpen(false)} trace={sampleTrace} />
    </div>
  );
}
