import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Search, Bell, Globe, ChevronDown, User, ShieldCheck, Languages } from "lucide-react";
import { GlassPanel, Badge } from "../ui/Primitives";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { getCurrentUser, setCurrentUser, getStoredUsers, PoliceUser } from "@/services/authStore";
import { useLanguage, translations } from "@/services/languageStore";

export function TopBar() {
  const [lang, setLang] = useLanguage();
  const t = translations[lang];
  const [focused, setFocused] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [currentUser, setCurrUser] = React.useState<PoliceUser>(getCurrentUser());
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const users = getStoredUsers();

  const { listening, transcript, toggleListening } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript]);

  function switchUser(u: PoliceUser) {
    setCurrentUser(u);
    setCurrUser(u);
    setUserDropdownOpen(false);
    // Reload page to reflect user role scope
    window.location.reload();
  }

  return (
    <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-line/60 bg-bg/80 px-6 py-3 backdrop-blur-premium">
      {/* Global NL/Voice query bar */}
      <GlassPanel className={`flex flex-1 max-w-xl items-center gap-2 px-4 py-2.5 transition-shadow ${focused ? "shadow-elevated" : ""}`}>
        <Search size={16} className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={
            listening
              ? lang === "kn"
                ? "ಆಲಿಸಲಾಗುತ್ತಿದೆ... ಈಗ ಮಾತನಾಡಿ..."
                : "Listening... speak now..."
              : lang === "kn"
              ? "ದೃಷ್ಟಿ ಎಐ ಗೆ ಶೋಧಿಸಿ — ಉದಾ: 'ಸುರೇಶ್ ಎಂ ನ ಸಹ-ಆರೋಪಿ ವಿವರ'"
              : "Ask Drishti — e.g. “show co-accused links for FIR 2026/0417”"
          }
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
        />
        <button
          onClick={() => toggleListening(lang === "kn" ? "kn-IN" : "en-IN")}
          aria-label="Voice query"
          title={listening ? "Click to stop listening" : "Click to speak"}
          className={`relative flex h-7 w-7 items-center justify-center rounded-full transition ${
            listening ? "bg-danger/15 text-danger" : "text-muted hover:bg-black/[0.04]"
          }`}
        >
          <Mic size={14} />
          {listening && (
            <motion.span
              className="absolute h-7 w-7 rounded-full border border-danger/40"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
          )}
        </button>
      </GlassPanel>

      <div className="ml-auto flex items-center gap-3">
        {/* Active Police User Selector & Rank Badge */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-primary/40 transition shadow-xs"
          >
            <img src={currentUser.avatar} alt={currentUser.name} className="h-5 w-5 rounded-full object-cover shrink-0" />
            <span>{currentUser.name}</span>
            <Badge tone={currentUser.rank === "DSP" ? "accent" : "info"}>{currentUser.rank}</Badge>
            <ChevronDown size={12} className="text-muted" />
          </button>

          <AnimatePresence>
            {userDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-72 z-50"
              >
                <GlassPanel className="p-2 space-y-1 shadow-elevated">
                  <div className="px-3 py-2 border-b border-line">
                    <p className="text-xs font-bold text-ink flex items-center gap-1">
                      <ShieldCheck size={14} className="text-primary" /> {t.activeOfficer}
                    </p>
                    <p className="text-[11px] text-muted truncate">{currentUser.roleTitle}</p>
                    <p className="text-[10px] text-primary font-mono mt-0.5">{currentUser.station}</p>
                  </div>

                  <p className="px-3 py-1 text-[10px] font-semibold text-muted uppercase tracking-wider">
                    {t.switchOfficer}
                  </p>

                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => switchUser(u)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                        currentUser.id === u.id ? "bg-primary/10 font-bold text-primary" : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <img src={u.avatar} alt={u.name} className="h-7 w-7 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-medium">{u.name}</p>
                          <Badge tone={u.rank === "DSP" ? "accent" : u.status === "suspended" ? "danger" : "neutral"}>
                            {u.rank}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted truncate">{u.station}</p>
                      </div>
                    </button>
                  ))}
                </GlassPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic English <-> Kannada Language Switcher */}
        <div className="flex items-center rounded-full border border-line bg-white p-0.5 shadow-xs">
          <button
            onClick={() => setLang("en")}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              lang === "en" ? "bg-primary text-white shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang("kn")}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              lang === "kn" ? "bg-primary text-white shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            ಕನ್ನಡ
          </button>
        </div>

        {/* Notification bell */}
        <NotificationBell />
      </div>
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const items = [
    { title: "Anomaly alert · Whitefield PS", meta: "Z-score 3.4 · 12 min ago", tone: "critical" },
    { title: "Similarity match found", meta: "FIR 2026/0417 · 41 min ago", tone: "info" },
    { title: "SLA breach warning", meta: "Case aging 58 days · 2 hr ago", tone: "warning" },
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-muted hover:text-ink"
        aria-label="Notifications"
      >
        <Bell size={16} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <GlassPanel className="absolute right-0 mt-2 w-80 p-2">
              <p className="px-2 py-1.5 text-xs font-semibold text-muted">Notifications</p>
              {items.map((it, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-black/[0.03]">
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      it.tone === "critical" ? "bg-danger" : it.tone === "warning" ? "bg-warning" : "bg-primary"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-medium text-ink">{it.title}</p>
                    <p className="text-[11px] text-muted">{it.meta}</p>
                  </div>
                </div>
              ))}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
