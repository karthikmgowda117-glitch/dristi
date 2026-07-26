import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  LayoutDashboard, FolderKanban, Share2, Search, BellRing, Archive,
  FileBarChart2, Bot, ShieldCheck, ScrollText, Sparkles, ChevronsLeft, ChevronsRight,
  LogOut,
} from "lucide-react";
import { useLanguage, translations } from "@/services/languageStore";

export function Sidebar() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [lang] = useLanguage();
  const t = translations[lang];
  const navigate = useNavigate();

  const NAV = [
    { to: "/digest", label: t.navDigest, icon: Sparkles, badge: "New" },
    { to: "/dashboard", label: t.navDashboard, icon: LayoutDashboard },
    { to: "/cases", label: t.navCases, icon: FolderKanban },
    { to: "/graph", label: t.navGraph, icon: Share2 },
    { to: "/search", label: t.navSearch, icon: Search },
    { to: "/alerts", label: t.navAlerts, icon: BellRing },
    { to: "/evidence", label: t.navEvidence, icon: Archive },
    { to: "/reports", label: t.navReports, icon: FileBarChart2 },
    { to: "/jarvis", label: t.navAi, icon: Bot, badge: "AI" },
    { to: "/admin", label: t.navAdmin, icon: ShieldCheck },
    { to: "/audit", label: t.navAudit, icon: ScrollText },
  ];

  function handleLogout() {
    localStorage.removeItem("drishti_token");
    localStorage.removeItem("drishti_user");
    sessionStorage.clear();
    navigate("/");
  }

  return (
    <aside
      className={clsx(
        "sticky top-0 flex h-screen flex-col border-r border-line bg-white/70 backdrop-blur-premium transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-[264px]"
      )}
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-sm font-bold text-white">
          D
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-semibold">{lang === "kn" ? "ದೃಷ್ಟಿ ಎಐ" : "Drishti"}</p>
            <p className="text-[11px] text-muted">KSP Intelligence Platform</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive ? "bg-primary/8 font-medium text-primary" : "text-muted hover:bg-black/[0.03] hover:text-ink"
              )
            }
          >
            <item.icon size={18} className="shrink-0" />
            {!collapsed && (
              <span className="flex flex-1 items-center justify-between truncate">
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent ml-1 shrink-0">
                    {item.badge}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mx-2 flex items-center justify-center gap-2 rounded-lg py-2 text-xs text-muted hover:bg-black/[0.03] hover:text-ink"
        aria-label="Collapse sidebar"
      >
        {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> {lang === "kn" ? "ಸಂಗ್ರಹಿಸಿ" : "Collapse"}</>}
      </button>

      {/* Logout button */}
      <div className="border-t border-line px-2 py-3">
        <button
          onClick={handleLogout}
          className={clsx(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600",
            collapsed ? "justify-center" : ""
          )}
          title="Log out"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>{t.logout}</span>}
        </button>
      </div>
    </aside>
  );
}
