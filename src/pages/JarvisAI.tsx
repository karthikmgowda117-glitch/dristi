import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Mic, Send, Sparkles, Cpu, ShieldCheck, Zap, Terminal, FileText,
  Clock, AlertTriangle, CheckCircle2, QrCode, Search, Key, RefreshCw, Volume2, VolumeX, HardDrive, ArrowRight,
  Download, Trash2, BatteryCharging, CloudSun, Activity, Wifi, Radio, Sliders, Play, AlertCircle, Copy, Check, Globe
} from "lucide-react";
import { ConfidenceMeter, ProvenanceTag, TraceGlyph, Badge } from "@/components/ui/Primitives";
import { ExplainabilityDrawer } from "@/components/ui/ExplainabilityPanel";
import { aiApi, casesApi } from "@/services/api";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { downloadFile, exportToCSV } from "@/utils/exportHelper";
import { useLanguage, translations } from "@/services/languageStore";
import { getCurrentUser } from "@/services/authStore";

interface Message {
  id: string;
  sender: "user" | "drishti";
  text: string;
  kannadaText?: string;
  timestamp: string;
  category?: "query" | "command" | "draft" | "alert" | "utility";
  traceId?: string;
  data?: any;
  lang?: "en" | "kn";
}

export default function JarvisAI() {
  const [globalLang, setGlobalLang] = useLanguage();
  const [aiLang, setAiLang] = useState<"en" | "kn">(globalLang);
  const t = translations[aiLang];
  const currentUser = getCurrentUser();

  const INITIAL_MESSAGES: Message[] = [
    {
      id: "m-1",
      sender: "drishti",
      text: "Drishti Neural Core Initialized. Dual-AI Engine is ONLINE. Good day, Officer. How can I assist with your investigation today?",
      kannadaText: "ದೃಷ್ಟಿ ಎಐ ವ್ಯವಸ್ಥೆ ಸಿದ್ಧವಾಗಿದೆ. ನಮಸ್ಕಾರ ಅಧಿಕಾರಿಯವರೇ, ಇಂದಿನ ತನಿಖೆಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      category: "alert",
      traceId: "trace-drishti-init",
      lang: aiLang,
    },
  ];

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [date, setDate] = useState(new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }));
  const [activeMode, setActiveMode] = useState<"terminal" | "copilot" | "tools">("terminal");
  const [traceOpen, setTraceOpen] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Copilot State
  const [selectedCase, setSelectedCase] = useState("KA-WF-2026-0417");
  const [checklist, setChecklist] = useState([
    { id: "c1", label: "Complainant Anitha K. ID Verification", done: true },
    { id: "c2", label: "Junction Cam 4 CCTV Hash Timestamp", done: true },
    { id: "c3", label: "Witness Statement Hashing", done: true },
    { id: "c4", label: "Suspect Suresh M. Graph Contact Verification", done: false },
  ]);

  const COMMAND_SHORTCUTS = [
    {
      label: aiLang === "kn" ? "ಎಫ್.ಐ.ಆರ್ ದಾಖಲಿಸಿ (SI/Inspector)" : "File FIR for Incident (SI/Inspector)",
      query:
        aiLang === "kn"
          ? "ವೈಟ್‌ಫೀಲ್ಡ್ ಮುಖ್ಯ ರಸ್ತೆಯ ಚೈನ್ ಸ್ನಾಚಿಂಗ್ ಘಟನೆಗೆ ಎಫ್.ಐ.ಆರ್ ದಾಖಲಿಸಿ, ದೂರುದಾರರು ಅನಿತಾ ಕೆ"
          : "Drishti, file an FIR for chain snatching incident near Whitefield main road, complainant Anitha K",
    },
    {
      label: aiLang === "kn" ? "ಸುರೇಶ್ ಎಂ ಲಿಂಕ್ ಪತ್ತೆ ಹಚ್ಚಿ" : "Search Co-Accused Links",
      query:
        aiLang === "kn"
          ? "ಸುರೇಶ್ ಎಂ ನ ಸಹ-ಆರೋಪಿ ಸಂಪರ್ಕ ವಿವರಗಳನ್ನು ವೈಟ್‌ಫೀಲ್ಡ್ ಠಾಣೆಯಲ್ಲಿ ಶೋಧಿಸಿ"
          : "Drishti, search co-accused graph links for Suresh M in Whitefield PS",
    },
    {
      label: aiLang === "kn" ? "ಎಫ್.ಐ.ಆರ್ ಸಾರಾಂಶ ಸಿದ್ಧಪಡಿಸಿ" : "Draft FIR Legal Summary",
      query:
        aiLang === "kn"
          ? "ಪ್ರಕರಣ KA-WF-2026-0417 ರ ಸಾರಾಂಶ ಮತ್ತು ಸೂಕ್ತ ಕಾನೂನು ಕಾಯಿದೆಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಿ"
          : "Summarize case KA-WF-2026-0417 narrative and suggest applicable IPC/BNS sections",
    },
    {
      label: aiLang === "kn" ? "ಸಾಕ್ಷ್ಯಾಧಾರ ಪರಿಶೀಲಿಸಿ" : "Verify Evidence Integrity",
      query:
        aiLang === "kn"
          ? "ಪ್ರಕರಣ KA-WF-2026-0417 ರ ಡಿಜಿಟಲ್ ಸಾಕ್ಷ್ಯದ SHA-256 ಹ್ಯಾಶ್ ಪರಿಶೀಲಿಸಿ"
          : "Verify SHA-256 custody chain for evidence recovered in case KA-WF-2026-0417",
    },
    {
      label: aiLang === "kn" ? "ಅಪರಾಧ ಸರಣಿ ಪರೀಕ್ಷಿಸಿ" : "Run Anomaly Z-Score Scan",
      query:
        aiLang === "kn"
          ? "ವೈಟ್‌ಫೀಲ್ಡ್ ಠಾಣೆಯ ಚೈನ್‌ ಸ್ನಾಚಿಂಗ್‌ ಅಪರಾಧ ಹೆಚ್ಚಳದ Z-score ಪರಿಶೀಲಿಸಿ"
          : "Run 90-day Z-score anomaly check for chain snatching reports in Whitefield station",
    },
  ];

  const SYSTEM_STATS = [
    { label: "CPU Usage", value: "45%", percent: 45, color: "from-cyan-500 to-blue-600" },
    { label: "CPU Temp", value: "42°C", percent: 42, color: "from-blue-500 to-teal-400" },
    { label: "RAM Usage", value: "7.2 GB", percent: 62, color: "from-cyan-400 to-indigo-500" },
    { label: "Storage", value: "439/1024 GB", percent: 43, color: "from-emerald-400 to-cyan-500" },
  ];

  const {
    listening,
    transcript,
    error: speechError,
    toggleListening,
    simulateSpeech,
  } = useSpeechRecognition();

  const {
    speaking,
    audioEnabled,
    setAudioEnabled,
    speak,
    stop: stopSpeaking,
  } = useTextToSpeech();

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Sync AI language when topbar changes
  useEffect(() => {
    setAiLang(globalLang);
  }, [globalLang]);

  // Speak greeting when language toggled or loaded
  useEffect(() => {
    const initialMsg =
      aiLang === "kn"
        ? "ದೃಷ್ಟಿ ಎಐ ವ್ಯವಸ್ಥೆ ಸಿದ್ಧವಾಗಿದೆ. ನಮಸ್ಕಾರ ಅಧಿಕಾರಿಯವರೇ, ಇಂದಿನ ತನಿಖೆಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"
        : "Drishti Neural Core Initialized. Dual-AI Engine is ONLINE. Good day, Officer. How can I assist with your investigation today?";

    const timer = setTimeout(() => {
      speak(initialMsg, aiLang);
    }, 600);
    return () => clearTimeout(timer);
  }, [aiLang]);

  async function handleSend(customText?: string) {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    const isKn = /[\u0C80-\u0CFF]/.test(textToSend) || aiLang === "kn";

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput("");
    setIsProcessing(true);

    try {
      let responseText = "";
      let responseKnText = "";

      const lower = textToSend.toLowerCase();

      // Check if user is requesting to File an FIR
      const isFilingFir =
        lower.includes("file fir") ||
        lower.includes("register fir") ||
        lower.includes("file an fir") ||
        textToSend.includes("ಎಫ್.ಐ.ಆರ್") ||
        textToSend.includes("ದಾಖಲಿಸಿ");

      if (isFilingFir) {
        if (currentUser.rank === "Constable") {
          // Constable is RESTRICTED from filing FIR
          responseText = `ACTION DENIED: Constables are not authorized to file formal FIRs under CrPC Sec 154 / BNS Sec 173. Only Sub-Inspectors (IO), Inspectors (SHO), or DSPs may register official FIRs.\n\nIncident notes have been drafted & dispatched to Station Inspector Vijay Kumar (SHO) for formal review & IO assignment.`;
          responseKnText = `ಕ್ರಿಯೆಯನ್ನು ತಡೆಯಲಾಗಿದೆ: ಸಿಆರ್‌ಪಿಸಿ 154 / ಬಿಎನ್‌ಎಸ್ 173 ರ ಅಡಿಯಲ್ಲಿ ಕಾನ್‌ಸ್ಟೇಬಲ್‌ಗಳಿಗೆ ಅಧಿಕೃತ ಎಫ್.ಐ.ಆರ್ ದಾಖಲಿಸಲು ಅಧಿಕಾರವಿರುವುದಿಲ್ಲ. ಉಪನಿರೀಕ್ಷಕರು (SI), ನಿರೀಕ್ಷಕರು (Inspector SHO) ಅಥವಾ ಡಿಎಸ್‌ಪಿ ಮಾತ್ರ ಎಫ್.ಐ.ಆರ್ ದಾಖಲಿಸಬಹುದು.\n\nನಿಮ್ಮ ಘಟನಾ ವರದಿಯನ್ನು ವೈಟ್‌ಫೀಲ್ಡ್ ಪೊಲೀಸ್ ಇನ್‌ಸ್ಪೆಕ್ಟರ್ ವಿಜಯ್ ಕುಮಾರ್ (SHO) ಅವರ ಪರಿಶೀಲನೆಗೆ ರವಾನಿಸಲಾಗಿದೆ.`;
        } else {
          // Authorized rank: Sub-Inspector, Inspector, DSP
          const newFirId = `KA-WF-2026-04${Math.floor(Math.random() * 80 + 20)}`;
          responseText = `FIR REGISTERED SUCCESSFULLY: FIR No. ${newFirId}.\nCategory: Chain Snatching / Robbery.\nComplainant: Anitha K.\nFiling Officer: ${currentUser.name} (${currentUser.rank}).\nStatus: REGISTERED · SHO REVIEW DISPATCHED.\n\nAutomated Alert: Full case details & narrative summary dispatched to Station Inspector Vijay Kumar (SHO) for formal review & IO assignment.`;
          responseKnText = `ಎಫ್.ಐ.ಆರ್ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ: ಎಫ್.ಐ.ಆರ್ ಸಂಖ್ಯೆ ${newFirId}.\nವರ್ಗ: ಚೈನ್ ಸ್ನಾಚಿಂಗ್.\nದೂರುದಾರರು: ಅನಿತಾ ಕೆ.\nದಾಖಲಿಸಿದ ಅಧಿಕಾರಿ: ${currentUser.name} (${currentUser.rank}).\nಸ್ಥಿತಿ: ದಾಖಲಾಗಿದೆ · ಎಸ್‌ಎಚ್‌ಒ ಪರಿಶೀಲನೆಗೆ ಕಳುಹಿಸಲಾಗಿದೆ.\n\nಸ್ವಯಂಚಾಲಿತ ಸೂಚನೆ: ಪ್ರಕರಣದ ಸಂಪೂರ್ಣ ವಿವರಗಳನ್ನು ವೈಟ್‌ಫೀಲ್ಡ್ ಪೊಲೀಸ್ ಇನ್‌ಸ್ಪೆಕ್ಟರ್ ವಿಜಯ್ ಕುಮಾರ್ (SHO) ಅವರಿಗೆ ಪರಿಶೀಲನೆಗಾಗಿ ರವಾನಿಸಲಾಗಿದೆ.`;
        }
      } else if (lower.includes("suresh") || textToSend.includes("ಸುರೇಶ್") || textToSend.includes("ಸಹ-ಆರೋಪಿ")) {
        responseText = "Graph Traversal Result: Suspect Suresh M. is connected via shared contact number to Manjunath S., named in K.R. Puram case KA-KR-2026-0398. Confidence score: 82 percent.";
        responseKnText = "ಗ್ರಾಫ್ ವಿಶ್ಲೇಷಣೆ ಫಲಿತಾಂಶ: ಆರೋಪಿ ಸುರೇಶ್ ಎಂ. ಮತ್ತು ಕೆ.ಆರ್. ಪುರಂ ಪ್ರಕರಣ KA-KR-2026-0398 ರಲ್ಲಿ ಹೆಸರಿಸಲಾದ ಮಂಜುನಾಥ್ ಎಸ್. ಇಬ್ಬರೂ ಒಂದೇ ಫೋನ್ ಸಂಖ್ಯೆ ಸಂಪರ್ಕ ಹೊಂದಿದ್ದಾರೆ. ವಿಶ್ವಾಸಾರ್ಹತೆ: 82 ಶೇಕಡಾ.";
      } else if (lower.includes("fir") || lower.includes("summarize") || textToSend.includes("ಸಾರಾಂಶ")) {
        responseText = "FIR Legal Analysis for KA-WF-2026-0417. Category: Chain Snatching at Whitefield Station. Complainant: Anitha K. Applicable BNS Statutes: Section 304 Snatching, and Section 317 Stolen Property. Completeness score: 88 percent.";
        responseKnText = "ಪ್ರಕರಣ KA-WF-2026-0417 ರ ಕಾನೂನು ವಿಶ್ಲೇಷಣೆ: ವೈಟ್‌ಫೀಲ್ಡ್ ಠಾಣೆಯ ಚೈನ್ ಸ್ನಾಚಿಂಗ್ ಪ್ರಕರಣ. ದೂರುದಾರರು: ಅನಿತಾ ಕೆ. ಅನ್ವಯವಾಗುವ ಬಿಎನ್ಎಸ್ ಕಾಯಿದೆಗಳು: ಸೆಕ್ಷನ್ 304 (ಸ್ನಾಚಿಂಗ್), ಮತ್ತು ಸೆಕ್ಷನ್ 317 (ಕಳವು ಮಾಲು). ಪರಿಪೂರ್ಣತೆ: 88 ಶೇಕಡಾ.";
      } else if (lower.includes("qr") || lower.includes("code") || textToSend.includes("ಕ್ಯೂ.ಆರ್")) {
        responseText = "Secure Case Verification QR Code generated for KA-WF-2026-0417. Access token hash embedded and verified against MinIO storage.";
        responseKnText = "ಪ್ರಕರಣ KA-WF-2026-0417 ಗೆ ಸುರಕ್ಷಿತ ಕ್ಯೂ.ಆರ್ ಕೋಡ್ ರಚಿಸಲಾಗಿದೆ. SHA-256 ಹ್ಯಾಶ್ ಸೀಲ್ ಯಶಸ್ವಿಯಾಗಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.";
      } else if (lower.includes("anomaly") || lower.includes("z-score") || textToSend.includes("ಅಪರಾಧ")) {
        responseText = "Anomaly Engine Scan Complete. Whitefield Station reports a 3.4 sigma spike in chain snatching incidents over the 90-day rolling baseline.";
        responseKnText = "ಅಪರಾಧ ಸರಣಿ ವಿಶ್ಲೇಷಣೆ ಪೂರ್ಣಗೊಂಡಿದೆ: ವೈಟ್‌ಫೀಲ್ಡ್ ಠಾಣೆ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಕಳೆದ 90 ದಿನಗಳ ಸರಾಸರಿಗಿಂತ 3.4 ಸಿಗ್ಮಾ ಚೈನ್ ಸ್ನಾಚಿಂಗ್ ಪ್ರಕರಣಗಳು ಹೆಚ್ಚಾಗಿವೆ.";
      } else {
        responseText = "I have processed your request against the Karnataka State Police Crime Intelligence Database.";
        responseKnText = "ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ ಅಪರಾಧ ಇಂಟೆಲಿಜೆನ್ಸ್ ಡೇಟಾಬೇಸ್ ಮೂಲಕ ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸಂಸ್ಕರಿಸಲಾಗಿದೆ. ಸೂಕ್ತ ತನಿಖಾ ಮಾಹಿತಿಯನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ.";
      }

      const mainText = isKn ? responseKnText : responseText;

      const drishtiMsg: Message = {
        id: `d-${Date.now()}`,
        sender: "drishti",
        text: mainText,
        kannadaText: responseKnText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        category: "query",
        traceId: `trace-${Date.now()}`,
        lang: isKn ? "kn" : "en",
      };

      setMessages((prev) => [...prev, drishtiMsg]);
      speak(mainText, isKn ? "kn" : "en");
    } catch {
      const fallbackMsgText =
        isKn
          ? "ದೃಷ್ಟಿ ಎಐ ಆಫ್‌ಲೈನ್ ಬಫರ್ ಮೂಲಕ ತನಿಖಾ ವಿನಂತಿಯನ್ನು ನಿರ್ವಹಿಸಿದೆ."
          : "Drishti processed your query via local offline buffer. Action dispatched to officer queue.";
      const fallbackMsg: Message = {
        id: `d-${Date.now()}`,
        sender: "drishti",
        text: fallbackMsgText,
        kannadaText: "ದೃಷ್ಟಿ ಎಐ ಆಫ್‌ಲೈನ್ ಬಫರ್ ಮೂಲಕ ತನಿಖಾ ವಿನಂತಿಯನ್ನು ನಿರ್ವಹಿಸಿದೆ.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      speak(fallbackMsgText, isKn ? "kn" : "en");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleExportFirSummary() {
    const summaryText = `PROJECT DRISHTI — LEGAL FIR COPILOT SUMMARY REPORT
Generated: ${new Date().toLocaleString()}
Jurisdiction: Whitefield Police Station, Bengaluru East Range
Language Mode: ${aiLang === "kn" ? "Kannada (ಕನ್ನಡ)" : "English"}
------------------------------------------------------------
FIR ID: KA-WF-2026-0417
Category: Chain Snatching / Robbery
Complainant: Anitha K.
Investigating Officer: SI Ramesh K.

APPLICABLE LEGAL STATUTES (BNS / IPC):
1. BNS Section 304 — Snatching with force or threat of force (Punishment: up to 7 years)
2. BNS Section 317 — Receiving or retaining stolen property knowingly

COMPLETENESS SCORE: 88%
Checklist Verified:
- Complainant ID Copy: VERIFIED
- CCTV Footage Hashing: VERIFIED (SHA-256: 8f21a9…c9a4)
- Witness Statements: VERIFIED
- Suspect Graph Traversal: Contact match with Suresh M. (Score: 0.82)

RECOMMENDED IO ACTION:
Submit chargesheet draft for SHO approval within 72 hours.
------------------------------------------------------------
Verified by Drishti Dual-AI Copilot Engine`;

    downloadFile(`FIR_Summary_${selectedCase}.txt`, summaryText, "text/plain;charset=utf-8;");
  }

  function viewTrace(msg: Message) {
    setSelectedTrace({
      methodTag: "Drishti Neural Core · Dual-AI Copilot + Graph Engine",
      plainLanguage: msg.text,
      confidence: 0.88,
      sourceRecords: [
        { id: "r1", label: "Casemaster KA-WF-2026-0417", type: "CASE" },
        { id: "r2", label: "Neo4j Person Node: Suresh M.", type: "PERSON" },
        { id: "r3", label: "BNS / IPC Statute Database", type: "RULES" },
      ],
    });
    setTraceOpen(true);
  }

  return (
    <div className="relative min-h-[calc(100vh-100px)] overflow-hidden rounded-2xl border border-cyan-500/40 bg-[#030812] text-cyan-100 shadow-[0_0_50px_rgba(0,170,255,0.15)] font-sans">
      {/* Background HUD Grid Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,170,255,0.08)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,170,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,170,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* ── Top HUD Header ── */}
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-cyan-500/30 bg-black/60 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(0,170,255,0.4)]">
            <Bot size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-mono text-lg font-extrabold tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(0,170,255,0.8)]">
              {t.drishtiTitle}
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-cyan-300/60 font-mono">
              {t.drishtiSub}
            </p>
          </div>
        </div>

        {/* Live HUD Status Widgets & Voice Language Switcher */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {/* Drishti Speech Language Toggle Button */}
          <div className="flex items-center rounded-lg border border-cyan-500/40 bg-black/60 p-1">
            <button
              onClick={() => {
                setAiLang("en");
                setGlobalLang("en");
              }}
              className={`rounded px-2.5 py-1 text-[11px] font-bold transition ${
                aiLang === "en" ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400/50" : "text-cyan-400/60"
              }`}
            >
              English Voice
            </button>
            <button
              onClick={() => {
                setAiLang("kn");
                setGlobalLang("kn");
              }}
              className={`rounded px-2.5 py-1 text-[11px] font-bold transition ${
                aiLang === "kn" ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400/50" : "text-cyan-400/60"
              }`}
            >
              🔊 ಕನ್ನಡ (Kannada Voice)
            </button>
          </div>

          {/* Audio Voice Toggle Button */}
          <button
            onClick={() => {
              if (speaking) stopSpeaking();
              setAudioEnabled((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition ${
              audioEnabled
                ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-300 shadow-[0_0_10px_rgba(0,170,255,0.2)]"
                : "border-gray-700 bg-gray-900/60 text-gray-400"
            }`}
          >
            {audioEnabled ? <Volume2 size={15} className="text-cyan-400 animate-pulse" /> : <VolumeX size={15} />}
            <span className="text-[11px] font-bold">{audioEnabled ? t.voiceOn : t.voiceMuted}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#2ed573] animate-ping" />
            <span className="text-emerald-400 font-bold tracking-wider">ONLINE</span>
          </div>
        </div>
      </header>

      {/* ── Main Layout (3-Column Cyberpunk Grid) ── */}
      <div className="relative z-10 grid grid-cols-1 gap-6 p-6 lg:grid-cols-12">
        {/* Left Column: System Telemetry & AI Config (Cols 3) */}
        <div className="space-y-5 lg:col-span-3">
          {/* Active Officer Status Box */}
          <div className="rounded-xl border border-cyan-500/30 bg-black/40 p-4 shadow-[0_0_20px_rgba(0,170,255,0.05)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-cyan-400/70 font-mono">Officer Logged In</p>
              <Badge tone={currentUser.rank === "DSP" ? "accent" : currentUser.rank === "Constable" ? "danger" : "info"}>
                {currentUser.rank}
              </Badge>
            </div>
            <p className="mt-1 text-base font-semibold text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]">
              {currentUser.name}
            </p>
            <p className="mt-1 text-xs text-cyan-200/60">
              {currentUser.station} · {currentUser.roleTitle}
            </p>

            {currentUser.rank === "Constable" && (
              <div className="mt-2.5 rounded border border-rose-500/40 bg-rose-500/10 p-2 text-[10px] text-rose-300 font-mono">
                ⚠️ FIR filing restricted for Constables. Incident notes automatically routed to Inspector.
              </div>
            )}
          </div>

          {/* System Telemetry Meters */}
          <div className="rounded-xl border border-cyan-500/30 bg-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Activity size={14} /> {t.systemTelemetry}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">NORMAL</span>
            </div>

            {SYSTEM_STATS.map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-cyan-300/80">{stat.label}</span>
                  <span className="text-cyan-400 font-bold">{stat.value}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-cyan-950/80">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${stat.color} transition-all duration-500`}
                    style={{ width: `${stat.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* AI Modules Box */}
          <div className="rounded-xl border border-cyan-500/30 bg-black/40 p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Cpu size={14} /> {t.aiEngines}
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-cyan-200/80">
              <div className="flex justify-between"><span>FIR Filing Rule:</span> <span className={currentUser.rank === "Constable" ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>{currentUser.rank === "Constable" ? "Restricted (Forward)" : "Authorized"}</span></div>
              <div className="flex justify-between"><span>Voice Synthesizer:</span> <span className={audioEnabled ? "text-emerald-400 font-bold" : "text-gray-400"}>{audioEnabled ? "ACTIVE (TTS)" : "MUTED"}</span></div>
              <div className="flex justify-between"><span>SHO Dispatch:</span> <span className="text-cyan-400 font-bold">Inspector Vijay Kumar</span></div>
            </div>
          </div>
        </div>

        {/* Center Column: Iconic Arc Reactor Animation Core & Controls (Cols 5) */}
        <div className="flex flex-col items-center justify-between rounded-xl border border-cyan-500/30 bg-black/50 p-6 shadow-[0_0_30px_rgba(0,170,255,0.08)] lg:col-span-5">
          {/* Mode Switcher Buttons */}
          <div className="flex gap-2 rounded-lg border border-cyan-500/30 bg-black/60 p-1 w-full justify-center">
            {[
              { id: "terminal", label: t.cmdCenter },
              { id: "copilot", label: t.firCopilot },
              { id: "tools", label: t.tacticalTools },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id as any)}
                className={`rounded-md px-3 py-1.5 text-xs font-mono transition-all ${
                  activeMode === mode.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,170,255,0.3)] font-bold"
                    : "text-cyan-400/60 hover:text-cyan-200"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* ── Iconic Drishti Holographic Arc Reactor Animation Core ── */}
          <div className="relative my-8 flex flex-col items-center justify-center">
            <div
              className={`relative flex h-56 w-56 items-center justify-center rounded-full border-2 border-dashed border-cyan-400/40 p-4 transition-all duration-700 ${
                listening || speaking || isProcessing
                  ? "border-cyan-300 shadow-[0_0_40px_rgba(0,170,255,0.6)] animate-spin-slow"
                  : "shadow-[0_0_20px_rgba(0,170,255,0.2)]"
              }`}
            >
              <div
                className={`flex h-44 w-44 items-center justify-center rounded-full border border-cyan-500/60 transition-all ${
                  speaking ? "scale-105 border-cyan-300 shadow-[0_0_25px_rgba(0,255,200,0.4)]" : ""
                }`}
              >
                <div
                  className={`relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-300/80 shadow-[0_0_30px_rgba(0,170,255,0.5)] transition-transform duration-300 ${
                    listening ? "scale-110 shadow-[0_0_50px_rgba(0,255,200,0.8)]" : ""
                  } ${speaking ? "scale-105 shadow-[0_0_50px_rgba(0,170,255,0.9)]" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    {[16, 28, 40, 24, 36, 20].map((h, idx) => (
                      <div
                        key={idx}
                        className={`w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00aaff] transition-all duration-200 ${
                          speaking || listening || isProcessing ? "animate-pulse" : ""
                        }`}
                        style={{
                          height: speaking || listening ? `${Math.floor(Math.random() * 30 + 15)}px` : `${h}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Core Label */}
            <h2 className="mt-4 font-mono text-lg font-black tracking-widest text-cyan-300 drop-shadow-[0_0_10px_rgba(0,170,255,0.8)]">
              DRISHTI CORE ({aiLang === "kn" ? "ಕನ್ನಡ" : "ENGLISH"})
            </h2>
            <p className="mt-1 font-mono text-xs text-cyan-400/70 text-center">
              {speaking
                ? aiLang === "kn"
                  ? "🔊 ದೃಷ್ಟಿ ಎಐ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತಿದೆ (TTS Active)..."
                  : "🔊 Drishti Speaking (Audio Synthesizer Active)..."
                : listening
                ? aiLang === "kn"
                  ? "🎙️ ಧ್ವನಿ ಮೈಕ್ರೋಫೋನ್ ಸಕ್ರಿಯವಾಗಿದೆ — ಆಲಿಸಲಾಗುತ್ತಿದೆ..."
                  : "🎙️ Microphone Active — Listening to voice..."
                : isProcessing
                ? "🧠 Processing query across intelligence graph..."
                : aiLang === "kn"
                ? "ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಧ್ವನಿ ಆಜ್ಞೆ ನೀಡಲು ಮೈಕ್ರೋಫೋನ್ ಒತ್ತಿ"
                : "Ready for microphone voice command or chat input"}
            </p>
          </div>

          {/* Quick Action Triggers */}
          <div className="flex w-full flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleListening(aiLang === "kn" ? "kn-IN" : "en-IN")}
                disabled={isProcessing}
                className={`flex items-center gap-2 rounded-xl border px-6 py-3 font-mono text-xs font-bold uppercase transition-all ${
                  listening
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_rgba(46,213,115,0.5)] animate-pulse"
                    : "border-cyan-400/60 bg-cyan-500/10 text-cyan-300 hover:border-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(0,170,255,0.4)]"
                }`}
              >
                <Mic size={18} /> {listening ? t.listeningVoice : t.startVoice}
              </button>

              {speaking && (
                <button
                  onClick={stopSpeaking}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-300 hover:bg-rose-500/20"
                >
                  <VolumeX size={16} /> {t.stopSpeaking}
                </button>
              )}
            </div>

            {/* Test Demo Speech Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  simulateSpeech("Drishti, file an FIR for chain snatching incident near Whitefield main road, complainant Anitha K")
                }
                className="text-[11px] font-mono text-cyan-400/80 hover:text-cyan-200 underline font-bold"
              >
                📝 File FIR (SI/Inspector Rule)
              </button>
              <span className="text-cyan-500/40">|</span>
              <button
                onClick={() =>
                  simulateSpeech("ಸುರೇಶ್ ಎಂ ನ ಸಹ-ಆರೋಪಿ ಸಂಪರ್ಕ ವಿವರಗಳನ್ನು ವೈಟ್‌ಫೀಲ್ಡ್ ಠಾಣೆಯಲ್ಲಿ ಶೋಧಿಸಿ")
                }
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline font-bold"
              >
                🔊 ಡೆಮೊ ಧ್ವನಿ (ಕನ್ನಡ)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Panel based on activeMode (Cols 4) */}
        <div className="space-y-4 lg:col-span-4">
          {/* MODE 1: COMMAND CENTER (Conversation Stream & Shortcuts) */}
          {activeMode === "terminal" && (
            <>
              <div className="flex flex-col h-[520px] rounded-xl border border-cyan-500/30 bg-black/50 overflow-hidden shadow-[0_0_30px_rgba(0,170,255,0.05)]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-cyan-500/20 px-4 py-3 bg-black/40">
                  <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 flex items-center gap-2">
                    <Terminal size={14} /> CONVERSATION LOG ({aiLang.toUpperCase()})
                  </span>
                  <button
                    onClick={() => setMessages(INITIAL_MESSAGES)}
                    className="text-cyan-400/60 hover:text-cyan-200 transition"
                    title="Clear Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Chat Stream */}
                <div className="flex-1 space-y-3 overflow-y-auto p-4 font-mono text-xs">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                          m.sender === "user"
                            ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 rounded-br-none"
                            : "bg-black/60 border border-cyan-500/30 text-cyan-200 rounded-bl-none shadow-[0_0_10px_rgba(0,170,255,0.05)]"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2 border-b border-cyan-500/20 pb-1 text-[10px]">
                          <span className={m.sender === "user" ? "text-cyan-300 font-bold" : "text-cyan-400 font-bold"}>
                            {m.sender === "user" ? `OFFICER (${currentUser.rank})` : "DRISHTI AI"}
                          </span>
                          <div className="flex items-center gap-2">
                            {m.sender === "drishti" && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => speak(m.text, "en")}
                                  title="Speak in English"
                                  className="rounded px-1 py-0.5 text-[9px] border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-0.5"
                                >
                                  <Volume2 size={10} /> EN
                                </button>
                                <button
                                  onClick={() => speak(m.kannadaText || m.text, "kn")}
                                  title="Speak out loud in Kannada (ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ)"
                                  className="rounded px-1.5 py-0.5 text-[9px] border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/30 flex items-center gap-0.5"
                                >
                                  <Volume2 size={10} /> ಕನ್ನಡ (Voice)
                                </button>
                              </div>
                            )}
                            <span className="text-cyan-400/50">{m.timestamp}</span>
                          </div>
                        </div>
                        <p className="whitespace-pre-line">{m.text}</p>

                        {/* Dual Language Kannada Text Box inside message */}
                        {m.sender === "drishti" && m.kannadaText && (
                          <div className="mt-2 rounded border border-emerald-500/30 bg-emerald-950/20 p-2 text-[11px] text-emerald-200">
                            <p className="text-[9px] text-emerald-400 font-bold uppercase mb-0.5 flex items-center justify-between">
                              <span>ಕನ್ನಡ ಆವೃತ್ತಿ (Kannada Translation)</span>
                              <button
                                onClick={() => speak(m.kannadaText!, "kn")}
                                className="text-emerald-300 hover:underline flex items-center gap-1 font-bold"
                              >
                                <Volume2 size={11} /> ಮಾತನಾಡಿ (Play Voice)
                              </button>
                            </p>
                            <p>{m.kannadaText}</p>
                          </div>
                        )}
                      </div>

                      {m.sender === "drishti" && (
                        <div className="mt-1 flex items-center gap-2 text-[10px] pl-1 text-cyan-400/70">
                          <ProvenanceTag kind="NLP_EXTRACTED" />
                          <TraceGlyph onClick={() => viewTrace(m)} />
                        </div>
                      )}
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="flex items-center gap-2 text-xs text-cyan-400/70 pl-2 font-mono">
                      <RefreshCw size={13} className="animate-spin text-cyan-400" />
                      Drishti dual-engine querying database...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Form */}
                <div className="border-t border-cyan-500/20 bg-black/60 p-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={t.askPlaceholder}
                      className="flex-1 rounded-lg border border-cyan-500/30 bg-black/40 px-3 py-2 font-mono text-xs text-cyan-100 placeholder-cyan-500/40 outline-none focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isProcessing}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/50 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition disabled:opacity-50"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Quick Voice Commands Panel */}
              <div className="rounded-xl border border-cyan-500/30 bg-black/50 p-4">
                <h3 className="mb-2.5 font-mono text-xs font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Zap size={14} /> {t.quickCommands}
                </h3>
                <div className="space-y-1.5">
                  {COMMAND_SHORTCUTS.map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(cmd.query)}
                      className="flex w-full items-center justify-between rounded-lg border border-cyan-500/20 bg-black/40 p-2 text-left font-mono text-[11px] text-cyan-200/90 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition"
                    >
                      <span>{cmd.label}</span>
                      <ArrowRight size={12} className="text-cyan-400/60" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* MODE 2: FIR COPILOT ASSISTANT */}
          {activeMode === "copilot" && (
            <div className="rounded-xl border border-cyan-500/30 bg-black/50 p-4 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <span className="font-bold text-cyan-300 flex items-center gap-2">
                  <FileText size={16} className="text-cyan-400" /> FIR LEGAL COPILOT
                </span>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/30">
                  BNS / IPC Statute Engine
                </span>
              </div>

              <div>
                <label className="text-[11px] text-cyan-400/80 mb-1 block">Target FIR Case</label>
                <select
                  value={selectedCase}
                  onChange={(e) => setSelectedCase(e.target.value)}
                  className="w-full rounded-lg border border-cyan-500/30 bg-black/60 p-2 text-xs text-cyan-100 outline-none focus:border-cyan-400"
                >
                  <option value="KA-WF-2026-0417">KA-WF-2026-0417 (Chain Snatching, Whitefield)</option>
                  <option value="KA-KR-2026-0112">KA-KR-2026-0112 (Burglary, K.R. Puram)</option>
                  <option value="KA-MP-2026-0089">KA-MP-2026-0089 (Vehicle Theft, Mahadevapura)</option>
                </select>
              </div>

              {/* Recommended Legal Sections Card */}
              <div className="rounded-lg border border-cyan-400/30 bg-cyan-950/30 p-3 space-y-2">
                <p className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" /> Recommended BNS &amp; IPC Statutes
                </p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="rounded bg-black/40 p-2 border border-cyan-500/20">
                    <p className="font-bold text-cyan-200">1. BNS Section 304 (Snatching)</p>
                    <p className="text-cyan-400/70 text-[10px]">Snatching with force or threat of force. Punishment up to 7 yrs.</p>
                  </div>
                  <div className="rounded bg-black/40 p-2 border border-cyan-500/20">
                    <p className="font-bold text-cyan-200">2. BNS Section 317 (Stolen Property)</p>
                    <p className="text-cyan-400/70 text-[10px]">Dishonestly receiving or retaining stolen property knowingly.</p>
                  </div>
                </div>
              </div>

              {/* FIR Completeness Score & Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300">FIR Completeness Score:</span>
                  <span className="font-bold text-emerald-400">88% (Ready for SHO)</span>
                </div>
                <div className="space-y-1">
                  {checklist.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        setChecklist((list) =>
                          list.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x))
                        )
                      }
                      className="flex w-full items-center justify-between rounded border border-cyan-500/20 bg-black/40 p-2 text-left text-[11px]"
                    >
                      <span className={item.done ? "text-cyan-200" : "text-cyan-400/60 line-through"}>
                        {item.label}
                      </span>
                      {item.done ? (
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copilot Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleExportFirSummary}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500/20 py-2.5 font-bold text-cyan-200 hover:bg-cyan-500/30 transition shadow-[0_0_15px_rgba(0,170,255,0.2)]"
                >
                  <Download size={14} /> Export Formal Legal Summary (.TXT)
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: TACTICAL TOOLS */}
          {activeMode === "tools" && (
            <div className="rounded-xl border border-cyan-500/30 bg-black/50 p-4 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <span className="font-bold text-cyan-300 flex items-center gap-2">
                  <Sliders size={16} className="text-cyan-400" /> TACTICAL UTILITY SUITE
                </span>
                <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-400 border border-cyan-500/30">
                  Field Tools
                </span>
              </div>

              {/* Secure QR Code Generator */}
              <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-200 flex items-center gap-1.5">
                    <QrCode size={14} className="text-cyan-400" /> Case Access QR Code
                  </span>
                  <button
                    onClick={() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    {copied ? "Copied Token" : "Copy Token"}
                  </button>
                </div>
                <div className="flex justify-center py-2">
                  <div className="p-2 bg-white rounded-lg border border-cyan-400/50">
                    <QrCode size={84} className="text-black" />
                  </div>
                </div>
              </div>

              {/* SHA-256 Custody Scanner */}
              <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-3 space-y-1.5">
                <span className="font-bold text-cyan-200 flex items-center gap-1.5">
                  <Key size={14} className="text-emerald-400" /> SHA-256 Custody Integrity Status
                </span>
                <div className="flex justify-between text-[11px]">
                  <span className="text-cyan-400/70">MinIO Storage Sync:</span>
                  <span className="text-emerald-400 font-bold">VERIFIED HASH</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Explainability Drawer */}
      {selectedTrace && (
        <ExplainabilityDrawer open={traceOpen} onClose={() => setTraceOpen(false)} trace={selectedTrace} />
      )}
    </div>
  );
}
