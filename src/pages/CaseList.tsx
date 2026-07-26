import { useState, useEffect } from "react";
import { Search, Download, ChevronRight, ShieldCheck, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Button, EmptyState } from "@/components/ui/Primitives";
import { casesApi } from "@/services/api";
import { getCurrentUser } from "@/services/authStore";
import { exportToCSV } from "@/utils/exportHelper";

const SLA_TONE = { ok: "success", warning: "warning", breach: "danger" } as const;

export default function CaseList() {
  const currentUser = getCurrentUser();
  const isDsp = currentUser.rank === "DSP";
  const [caseList, setCaseList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "breach" | "my_station">("all");

  useEffect(() => {
    casesApi.getCases().then((data) => {
      setCaseList(data);
      setLoading(false);
    });
  }, []);

  const filtered = caseList.filter((c) => {
    const matchesSearch =
      (c.id || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.officer || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.station || "").toLowerCase().includes(query.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "breach" && c.sla !== "breach") return false;

    // Hierarchy Caseload Scope Filtering:
    // DSP sees ALL cases by default.
    // Inspectors/Sub-Inspectors default to their station or officer name if "my_station" selected.
    if (filter === "my_station") {
      return (
        c.station.toLowerCase().includes(currentUser.station.toLowerCase()) ||
        c.officer.toLowerCase().includes(currentUser.name.toLowerCase())
      );
    }

    return true;
  });

  function handleExport() {
    exportToCSV(
      `Drishti_Caseload_${currentUser.rank}_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Case ID", "Category", "Police Station", "Status", "Aging (Days)", "Assigned Officer", "SLA Status"],
      filtered.map((c) => [c.id, c.category, c.station, c.status, c.agingDays, c.officer, c.sla])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Cases Directory</h1>
            <Badge tone={isDsp ? "accent" : "info"}>
              {isDsp ? "DSP RANGE OVERVIEW (ALL STATIONS)" : `${currentUser.station} Scope`}
            </Badge>
          </div>
          <p className="text-sm text-muted">
            {isDsp
              ? `Logged in as ${currentUser.name} (DSP Head) · Range-Wide Caseload Supervision`
              : `Logged in as ${currentUser.name} (${currentUser.rank}) · ${currentUser.station}`}
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <Download size={14} /> Export Caseload Report (.CSV)
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
          <Search size={14} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Case ID, Category, Station, or Officer…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            filter === "all" ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted hover:text-ink"
          }`}
        >
          All Cases ({caseList.length})
        </button>

        <button
          onClick={() => setFilter("my_station")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            filter === "my_station" ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted hover:text-ink"
          }`}
        >
          {currentUser.station} Only
        </button>

        <button
          onClick={() => setFilter("breach")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            filter === "breach" ? "border-danger/40 bg-danger/10 text-danger" : "border-line text-muted hover:text-ink"
          }`}
        >
          SLA Breaches
        </button>
      </div>

      <div className="surface-card overflow-hidden rounded-xl2">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-black/[0.015] text-left text-xs text-muted">
            <tr>
              {["Case ID", "Category", "Police Station", "Status", "Aging / SLA", "Assigned Officer", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((c) => (
              <tr key={c.id} className="group hover:bg-primary/[0.02] transition">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">{c.id}</td>
                <td className="px-4 py-3 font-medium">{c.category}</td>
                <td className="px-4 py-3 text-muted">{c.station}</td>
                <td className="px-4 py-3">
                  <Badge>{c.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={SLA_TONE[c.sla as keyof typeof SLA_TONE] || "info"}>{c.agingDays}d aging</Badge>
                </td>
                <td className="px-4 py-3 font-medium text-ink">{c.officer}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/cases/${c.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-90 transition group-hover:opacity-100"
                  >
                    View Details <ChevronRight size={13} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="No cases match these filters"
              hint="Try clearing your search term or selecting All Cases."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Reset Filters
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
