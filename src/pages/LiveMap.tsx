import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet broken icon path in Vite builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CRIME_MARKERS = [
  { id: "INC-001", lat: 12.9716, lng: 77.5946, type: "Chain Snatching",   ps: "Whitefield PS",   severity: "high",   status: "Active"   },
  { id: "INC-002", lat: 12.9352, lng: 77.6245, type: "Vehicle Theft",     ps: "Koramangala PS",  severity: "medium", status: "Active"   },
  { id: "INC-003", lat: 13.0358, lng: 77.5971, type: "Robbery",           ps: "Yeshwanthpur PS", severity: "critical",status:"Active"   },
  { id: "INC-004", lat: 12.9634, lng: 77.6062, type: "Assault",           ps: "Indiranagar PS",  severity: "low",    status: "Closed"  },
  { id: "INC-005", lat: 12.9082, lng: 77.6476, type: "Burglary",          ps: "BTM Layout PS",   severity: "medium", status: "Active"  },
  { id: "INC-006", lat: 12.9279, lng: 77.6271, type: "Cybercrime",        ps: "Koramangala PS",  severity: "high",   status: "Active"  },
  { id: "INC-007", lat: 13.0008, lng: 77.5856, type: "Drug Trafficking",  ps: "Rajajinagar PS",  severity: "critical",status:"Active"  },
  { id: "INC-008", lat: 12.9915, lng: 77.7149, type: "Chain Snatching",   ps: "Whitefield PS",   severity: "medium", status: "Active"  },
];

const PATROL_UNITS = [
  { id: "PCR-01", lat: 12.9750, lng: 77.6000, status: "Patrolling" },
  { id: "PCR-02", lat: 12.9500, lng: 77.6200, status: "On Scene"   },
  { id: "PCR-03", lat: 13.0100, lng: 77.5900, status: "Patrolling" },
];

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ff1744",
  high:     "#ff6d00",
  medium:   "#ffc107",
  low:      "#00c853",
};

function createIncidentIcon(severity: string) {
  const color = SEVERITY_COLOR[severity] || "#aaa";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10 14 22 14 22s14-12 14-22C28 6.268 21.732 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="14" cy="13" r="5" fill="#fff"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
  });
}

function createPatrolIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="12" fill="#2979ff" stroke="#fff" stroke-width="2.5"/>
      <text x="14" y="19" text-anchor="middle" fill="#fff" font-size="13" font-family="monospace" font-weight="bold">P</text>
    </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] });
}

export default function LiveMap() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<typeof CRIME_MARKERS[0] | null>(null);
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [showPatrol, setShowPatrol] = useState(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
    });
    mapRef.current = map;

    // Dark-style tile layer (CartoDB Dark Matter)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Add incident markers
    CRIME_MARKERS.forEach((inc) => {
      const marker = L.marker([inc.lat, inc.lng], { icon: createIncidentIcon(inc.severity) }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:monospace; min-width:200px;">
          <div style="font-weight:700;color:#ff6d00;margin-bottom:4px;">${inc.id} · ${inc.type}</div>
          <div style="font-size:12px;color:#555;">PS: ${inc.ps}</div>
          <div style="font-size:12px;color:#555;">Severity: <strong style="color:${SEVERITY_COLOR[inc.severity]}">${inc.severity.toUpperCase()}</strong></div>
          <div style="font-size:12px;color:#555;">Status: ${inc.status}</div>
        </div>
      `, { maxWidth: 240 });
    });

    // Add patrol unit markers
    PATROL_UNITS.forEach((unit) => {
      const marker = L.marker([unit.lat, unit.lng], { icon: createPatrolIcon() }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:monospace;min-width:160px;">
          <div style="font-weight:700;color:#2979ff;margin-bottom:4px;">${unit.id}</div>
          <div style="font-size:12px;color:#555;">Status: ${unit.status}</div>
        </div>
      `);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const visibleMarkers = filter === "all" ? CRIME_MARKERS : CRIME_MARKERS.filter(m => m.severity === filter);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] gap-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 px-1 py-2 rounded-xl border border-line bg-white/80 backdrop-blur shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink uppercase tracking-wide">Filter Severity:</span>
          {(["all", "critical", "high", "medium", "low"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                filter === sev
                  ? "bg-primary text-white border-primary shadow"
                  : "bg-white text-muted border-line hover:border-primary hover:text-primary"
              }`}
            >
              {sev.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={showPatrol}
              onChange={e => setShowPatrol(e.target.checked)}
              className="accent-primary w-3.5 h-3.5"
            />
            Show Patrol Units
          </label>
          <span className="text-muted text-xs">|</span>
          <span className="text-xs text-muted">
            {visibleMarkers.length} incident{visibleMarkers.length !== 1 ? "s" : ""} · {PATROL_UNITS.length} units
          </span>
        </div>
      </div>

      {/* Map + Incident Panel */}
      <div className="flex flex-1 gap-4 overflow-hidden rounded-xl">
        {/* Real Leaflet Map */}
        <div className="relative flex-1 rounded-xl overflow-hidden border border-line shadow-elevated">
          <div ref={containerRef} className="w-full h-full" />

          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-[999] rounded-xl border border-white/20 bg-black/70 backdrop-blur p-3 text-xs text-white font-mono">
            <p className="font-bold text-cyan-300 mb-2 tracking-wider">INCIDENT LEGEND</p>
            {Object.entries(SEVERITY_COLOR).map(([sev, color]) => (
              <div key={sev} className="flex items-center gap-2 mb-1">
                <span className="h-3 w-3 rounded-full inline-block" style={{ background: color }} />
                <span className="capitalize">{sev}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2 border-t border-white/20 pt-2">
              <span className="h-3 w-3 rounded-full inline-block bg-blue-500" />
              <span>Patrol Unit</span>
            </div>
          </div>
        </div>

        {/* Incident List Panel */}
        <div className="w-72 shrink-0 flex flex-col rounded-xl border border-line bg-white shadow-elevated overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-white/80">
            <h2 className="text-sm font-semibold text-ink">Active Incidents</h2>
            <p className="text-xs text-muted mt-0.5">Bengaluru East Range · Live</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-line">
            {CRIME_MARKERS.filter(m => filter === "all" || m.severity === filter).map((inc) => (
              <button
                key={inc.id}
                onClick={() => {
                  setSelected(inc);
                  mapRef.current?.flyTo([inc.lat, inc.lng], 15, { duration: 1 });
                }}
                className={`w-full text-left px-4 py-3 hover:bg-black/[0.03] transition-colors ${
                  selected?.id === inc.id ? "bg-primary/5 border-l-2 border-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-mono font-bold text-ink">{inc.id}</span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: SEVERITY_COLOR[inc.severity] + "22", color: SEVERITY_COLOR[inc.severity] }}
                  >
                    {inc.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs font-medium text-ink truncate">{inc.type}</p>
                <p className="text-[11px] text-muted">{inc.ps}</p>
              </button>
            ))}
          </div>

          {/* Selected Details */}
          {selected && (
            <div className="border-t border-line bg-bg/60 px-4 py-3">
              <p className="text-xs font-semibold text-ink mb-1">{selected.id} · {selected.type}</p>
              <p className="text-[11px] text-muted">{selected.ps}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: SEVERITY_COLOR[selected.severity] + "22", color: SEVERITY_COLOR[selected.severity] }}
                >
                  {selected.severity.toUpperCase()}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  selected.status === "Active" ? "bg-success/15 text-success" : "bg-muted/10 text-muted"
                }`}>
                  {selected.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
