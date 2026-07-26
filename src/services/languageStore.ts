import { useState, useEffect } from "react";

export type Language = "en" | "kn";

let currentLang: Language = (localStorage.getItem("drishti_lang") as Language) || "en";
const listeners = new Set<(lang: Language) => void>();

export function getLanguage(): Language {
  return currentLang;
}

export function setLanguage(lang: Language) {
  currentLang = lang;
  localStorage.setItem("drishti_lang", lang);
  listeners.forEach((fn) => fn(lang));
}

export function useLanguage(): [Language, (lang: Language) => void] {
  const [lang, setLangState] = useState<Language>(currentLang);

  useEffect(() => {
    const handler = (newLang: Language) => setLangState(newLang);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return [lang, setLanguage];
}

// Comprehensive Dictionary for Website Translation
export const translations: Record<Language, Record<string, string>> = {
  en: {
    // TopBar & Header
    platformTitle: "Drishti Police Intelligence",
    subTitle: "Karnataka State Police · Crime Intelligence Platform",
    langEn: "English",
    langKn: "ಕನ್ನಡ",
    activeOfficer: "Active Officer:",
    switchOfficer: "Switch Role",

    // Sidebar Nav
    navDigest: "Operation Mirror",
    navDashboard: "Command Dashboard",
    navCases: "Cases",
    navGraph: "Network Graph",
    navSearch: "Intelligence Search",
    navAlerts: "Alerts",
    navEvidence: "Evidence Locker",
    navReports: "Reports",
    navAi: "Drishti AI",
    navAdmin: "Admin Console",
    navAudit: "Audit Log",
    logout: "Log Out",

    // Dashboard
    dashTitle: "Command & Anomaly Dashboard",
    dashSub: "Real-time crime spike detection, station SLA telemetry, and active alerts",
    activeCases: "Active Cases",
    openInvestigations: "Open Investigations",
    slaCompliance: "SLA Compliance",
    crimeAnomalies: "Crime Anomalies Detected",
    highPriorityAlerts: "High Priority Alerts",

    // Drishti AI Page
    drishtiTitle: "DRISHTI AI",
    drishtiSub: "Dual-Engine Police Intelligence Assistant",
    greeting: "Drishti Neural Core Initialized. Dual-AI Engine is ONLINE. Good day, Officer. How can I assist with your investigation today?",
    startVoice: "Start Voice Input",
    listeningVoice: "Listening... (Tap to Stop)",
    stopSpeaking: "Stop Speaking",
    testDemoVoice: "Test Demo Voice Input",
    voiceOn: "VOICE ON",
    voiceMuted: "MUTED",
    cmdCenter: "Command Center",
    firCopilot: "FIR Copilot",
    tacticalTools: "Tactical Tools",
    askPlaceholder: "Ask Drishti — e.g. 'search co-accused for Suresh M'...",
    quickCommands: "QUICK COMMANDS",
    systemTelemetry: "SYSTEM TELEMETRY",
    aiEngines: "AI ENGINES",

    // Search Page
    searchTitle: "Intelligence Search",
    caseSim: "Case Similarity",
    faceSim: "Face Similarity",
    uploadPhoto: "Upload Suspect Photo",
    extractEmbeddings: "Extracting Embeddings...",
    runScan: "Run Biometric Face Scan",

    // Cases Page
    casesTitle: "Cases Directory",
    exportCaseload: "Export Caseload Report (.CSV)",
  },
  kn: {
    // TopBar & Header
    platformTitle: "ದೃಷ್ಟಿ ಪೊಲೀಸ್ ಇಂಟೆಲಿಜೆನ್ಸ್",
    subTitle: "ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ · ಅಪರಾಧ ತನಿಖಾ ವೇದಿಕೆ",
    langEn: "English",
    langKn: "ಕನ್ನಡ",
    activeOfficer: "ಸಕ್ರಿಯ ಅಧಿಕಾರಿ:",
    switchOfficer: "ಪಾತ್ರ ಬದಲಾಯಿಸಿ",

    // Sidebar Nav
    navDigest: "ಆಪರೇಷನ್ ಮಿರರ್",
    navDashboard: "ಕಮಾಂಡ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    navCases: "ಪ್ರಕರಣಗಳು (Cases)",
    navGraph: "ನೆಟ್‌ವರ್ಕ್ ಗ್ರಾಫ್",
    navSearch: "ಇಂಟೆಲಿಜೆನ್ಸ್ ಶೋಧನೆ",
    navAlerts: "ಎಚ್ಚರಿಕೆಗಳು (Alerts)",
    navEvidence: "ಸಾಕ್ಷ್ಯ ಗೋದಾಮು (Evidence)",
    navReports: "ವರದಿಗಳು (Reports)",
    navAi: "ದೃಷ್ಟಿ ಎಐ (Drishti AI)",
    navAdmin: "ಅಡ್ಮಿನ್ ಕನ್ಸೋಲ್",
    navAudit: "ಆಡಿಟ್ ಲಾಗ್",
    logout: "ನಿರ್ಗಮಿಸಿ (Logout)",

    // Dashboard
    dashTitle: "ಕಮಾಂಡ್ ಮತ್ತು ಅಪರಾಧ ವಿಶ್ಲೇಷಣೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    dashSub: "ನೈಜ ಸಮಯದಲ್ಲಿ ಅಪರಾಧ ಹೆಚ್ಚಳ ಪತ್ತೆ ಮತ್ತು ಠಾಣೆಗಳ ತನಿಖಾ ಪ್ರಗತಿ ವಿಶ್ಲೇಷಣೆ",
    activeCases: "ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳು",
    openInvestigations: "ಪ್ರಗತಿಯಲ್ಲಿರುವ ತನಿಖೆಗಳು",
    slaCompliance: "ಸಮಯಪಾಲನೆ ಶೇಕಡಾವಾರು",
    crimeAnomalies: "ಪತ್ತೆಯಾದ ಅಪರಾಧ ಸರಣಿಗಳು",
    highPriorityAlerts: "ತುರ್ತು ಎಚ್ಚರಿಕೆಗಳು",

    // Drishti AI Page
    drishtiTitle: "ದೃಷ್ಟಿ ಎಐ (DRISHTI AI)",
    drishtiSub: "ಕರ್ನಾಟಕ ಪೊಲೀಸ್ ದ್ವಿಭಾಷಾ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಸಹಾಯಕ",
    greeting: "ದೃಷ್ಟಿ ಎಐ ವ್ಯವಸ್ಥೆ ಸಿದ್ಧವಾಗಿದೆ. ನಮಸ್ಕಾರ ಅಧಿಕಾರಿಯವರೇ, ಇಂದಿನ ತನಿಖೆಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    startVoice: "ಧ್ವನಿ ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ",
    listeningVoice: "ಆಲಿಸಲಾಗುತ್ತಿದೆ... (ನಿಲ್ಲಿಸಲು ಒತ್ತಿ)",
    stopSpeaking: "ಮಾತನಾಡುವುದನ್ನು ನಿಲ್ಲಿಸಿ",
    testDemoVoice: "ಡೆಮೊ ಧ್ವನಿ ಪರೀಕ್ಷಿಸಿ",
    voiceOn: "ಧ್ವನಿ ಸಕ್ರಿಯ",
    voiceMuted: "ಮೌನ (Muted)",
    cmdCenter: "ಕಮಾಂಡ್ ಸೆಂಟರ್",
    firCopilot: "ಎಫ್.ಐ.ಆರ್ ಕಾಪಿಲಟ್",
    tacticalTools: "ತಾಂತ್ರಿಕ ಉಪಕರಣಗಳು",
    askPlaceholder: "ದೃಷ್ಟಿ ಎಐ ಗೆ ಕೇಳಿ — ಉದಾ: 'ಸುರೇಶ್ ಎಂ ನ ಸಹ-ಆರೋಪಿ ವಿವರ ನೀಡಿ'...",
    quickCommands: "ತ್ವರಿತ ಆಜ್ಞೆಗಳು (Quick Commands)",
    systemTelemetry: "ಸಿಸ್ಟಮ್ ಪ್ರಗತಿ",
    aiEngines: "ಎಐ ಎಂಜಿನ್‌ಗಳು",

    // Search Page
    searchTitle: "ಇಂಟೆಲಿಜೆನ್ಸ್ ಶೋಧನೆ",
    caseSim: "ಪ್ರಕರಣ ಸಾಮ್ಯತೆ",
    faceSim: "ಮುಖ ಚಹರೆ ಹೋಲಿಕೆ (Face Recognition)",
    uploadPhoto: "ಆರೋಪಿಯ ಭಾವಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    extractEmbeddings: "ಮುಖದ ಚಹರೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
    runScan: "ಚಹರೆ ಹೋಲಿಕೆ ಪರೀಕ್ಷಿಸಿ",

    // Cases Page
    casesTitle: "ಪ್ರಕರಣಗಳ ಪಟ್ಟಿ (Cases Directory)",
    exportCaseload: "ವರದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ (.CSV)",
  },
};
