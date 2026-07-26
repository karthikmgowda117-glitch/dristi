import * as mockData from "@/data/mock";

const API_BASE = "/api/v1";

export function getAuthToken(): string | null {
  return localStorage.getItem("drishti_access_token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("drishti_access_token", token);
}

export function clearAuthToken(): void {
  localStorage.removeItem("drishti_access_token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Trace-Id": `trace-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return await res.json();
  } catch (err) {
    console.warn(`[API] Fetch failed for ${endpoint}. Falling back to mock data.`, err);
    throw err;
  }
}

/* ---------------- Auth API ---------------- */
export const authApi = {
  login: async (username?: string, password?: string) => {
    try {
      const data = await request<{ accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (data.accessToken) setAuthToken(data.accessToken);
      return data;
    } catch {
      const mockToken = "mock_jwt_token_drishti_ips_2026";
      setAuthToken(mockToken);
      return { accessToken: mockToken, refreshToken: "mock_refresh" };
    }
  },

  verifyMfa: async (totpCode: string) => {
    try {
      const data = await request<{ accessToken: string }>("/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ totpCode }),
      });
      if (data.accessToken) setAuthToken(data.accessToken);
      return data;
    } catch {
      const mockToken = "mock_jwt_token_drishti_mfa_verified";
      setAuthToken(mockToken);
      return { accessToken: mockToken };
    }
  },

  getMe: async () => {
    try {
      return await request<{ userId: string; role: string; unitId: string; jurisdictionPath: string }>("/auth/me");
    } catch {
      return { userId: "U-2201", role: "Investigator", unitId: "WF-01", jurisdictionPath: "Whitefield PS, Bengaluru East" };
    }
  },
};

/* ---------------- Cases API ---------------- */
export const casesApi = {
  getCases: async (query = "") => {
    try {
      const res = await request<{ items: typeof mockData.cases }>("/cases" + (query ? `?query=${encodeURIComponent(query)}` : ""));
      return res.items || res;
    } catch {
      return mockData.cases;
    }
  },

  getCaseDetail: async (caseId: string) => {
    try {
      return await request<any>(`/cases/${caseId}`);
    } catch {
      return (
        mockData.cases.find((c) => c.id === caseId) || {
          id: caseId,
          category: "Chain Snatching",
          station: "Whitefield PS",
          status: "Under Investigation",
          agingDays: 12,
          officer: "SI Ramesh K.",
          sla: "ok",
        }
      );
    }
  },

  getCaseTimeline: async (caseId: string) => {
    try {
      return await request<any[]>(`/cases/${caseId}/timeline`);
    } catch {
      return [
        { title: "FIR Registered", ts: "14 Jul 2026, 14:30", by: "SI Ramesh K.", status: "completed" },
        { title: "CCTV Footage Uploaded", ts: "14 Jul 2026, 16:05", by: "SI Ramesh K.", status: "completed" },
        { title: "Suspect Suresh M. Linked", ts: "15 Jul 2026, 10:15", by: "AI Graph Engine", status: "completed" },
        { title: "Chargesheet Submission", ts: "Pending", by: "SI Ramesh K.", status: "upcoming" },
      ];
    }
  },

  getCaseProfile: async (caseId: string) => {
    try {
      return await request<any>(`/cases/${caseId}/profile`);
    } catch {
      return {
        caseId,
        summary: "Chain snatching report under active IO review.",
        entities: mockData.graphNodes,
        evidenceCount: mockData.evidenceLocker.filter((e) => e.case === caseId).length || 2,
      };
    }
  },

  getCaseTasks: async (caseId: string) => {
    try {
      return await request<any[]>(`/cases/${caseId}/tasks`);
    } catch {
      return [
        { id: "T-1", description: "Collect junction CCTV camera 4 feed", status: "completed" },
        { id: "T-2", description: "Record statement of complainant Anitha K.", status: "completed" },
        { id: "T-3", description: "Verify contact link with Suresh M.", status: "pending" },
      ];
    }
  },
};

/* ---------------- Alerts API ---------------- */
export const alertsApi = {
  getAlerts: async () => {
    try {
      const res = await request<{ items: typeof mockData.alerts }>("/alerts");
      return res.items || res;
    } catch {
      return mockData.alerts;
    }
  },

  updateAlertStatus: async (alertId: string, status: string) => {
    try {
      return await request(`/alerts/${alertId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch {
      return { id: alertId, status };
    }
  },
};

/* ---------------- Intelligence & AI API ---------------- */
export const aiApi = {
  queryNL: async (text: string, contextCaseId?: string) => {
    try {
      return await request<any>("/ai/query", {
        method: "POST",
        body: JSON.stringify({ text, contextCaseId }),
      });
    } catch {
      // Groq LLM API Call with user provided API Key
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY || "gsk_demo_key"}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: "You are Drishti, the AI Law Enforcement Assistant & FIR Copilot for Karnataka State Police (KSP) Drishti Intelligence Platform. Provide concise, tactical, professional intelligence summaries, legal IPC/BNS section guidance, and case link suggestions.",
              },
              {
                role: "user",
                content: text,
              },
            ],
            temperature: 0.5,
            max_tokens: 300,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const answer = groqData.choices?.[0]?.message?.content;
          if (answer) {
            return {
              resultType: "GROQ_LLM",
              answer,
              traceId: `trace-groq-${Date.now()}`,
              confidence: 0.95,
            };
          }
        }
      } catch (err) {
        console.warn("Groq API call fallback error:", err);
      }

      return {
        resultType: "SEMANTIC_CASES",
        data: [
          { id: "KA-KR-2026-0398", score: 0.82, matched: ["category", "location proximity", "time proximity"] },
          { id: "KA-MP-2026-0089", score: 0.61, matched: ["category", "narrative similarity"] },
        ],
        traceId: `trace-nl-${Date.now()}`,
        confidence: 0.85,
      };
    }
  },

  queryVoice: async (formData: FormData) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/ai/voice-query`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      return await res.json();
    } catch {
      return {
        transcript: "Find all chain snatching incidents near Whitefield in July",
        transcriptConfidence: 0.94,
        queryResult: {
          matchedCount: 2,
          cases: ["KA-WF-2026-0417", "KA-WF-2026-0421"],
        },
      };
    }
  },

  getSimilarCases: async (caseId: string) => {
    try {
      return await request<any[]>(`/cases/${caseId}/similar`);
    } catch {
      return [
        { id: "KA-KR-2026-0398", score: 0.82, matched: ["category", "location proximity", "time proximity"] },
        { id: "KA-MP-2026-0089", score: 0.61, matched: ["category", "narrative similarity"] },
      ];
    }
  },

  searchFace: async (formData: FormData) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/intel/face-search`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      return await res.json();
    } catch {
      return mockData.faceMatches;
    }
  },

  searchCCTV: async (params?: any) => {
    try {
      return await request<any[]>("/intel/cctv-search");
    } catch {
      return mockData.cctvMatches;
    }
  },

  searchVehicle: async (params?: any) => {
    try {
      return await request<any[]>("/intel/vehicle-search");
    } catch {
      return mockData.vehicleMatches;
    }
  },

  getTrace: async (traceId: string) => {
    try {
      return await request<any>(`/ai/trace/${traceId}`);
    } catch {
      return mockData.similarityTrace;
    }
  },
};

/* ---------------- Network Graph API ---------------- */
export const graphApi = {
  getNetwork: async (entityId?: string) => {
    try {
      return await request<{ nodes: typeof mockData.graphNodes; edges: typeof mockData.graphEdges }>("/graph/network");
    } catch {
      return { nodes: mockData.graphNodes, edges: mockData.graphEdges };
    }
  },

  getCaseGraph: async (caseId: string) => {
    try {
      return await request<{ nodes: any[]; edges: any[] }>(`/graph/cases/${caseId}`);
    } catch {
      return { nodes: mockData.graphNodes, edges: mockData.graphEdges };
    }
  },
};

/* ---------------- Evidence API ---------------- */
export const evidenceApi = {
  getEvidenceList: async (caseId?: string) => {
    try {
      return await request<typeof mockData.evidenceLocker>("/evidence");
    } catch {
      return caseId ? mockData.evidenceLocker.filter((e) => e.case === caseId) : mockData.evidenceLocker;
    }
  },

  verifyEvidence: async (evidenceId: string) => {
    try {
      return await request<{ integrityVerified: boolean; hashAtAccess: string }>(`/evidence/${evidenceId}/verify`);
    } catch {
      const item = mockData.evidenceLocker.find((e) => e.id === evidenceId);
      return { integrityVerified: item?.status === "verified", hashAtAccess: item?.hash || "8f21a9…c9a4" };
    }
  },
};

/* ---------------- Officer Performance & Digest ---------------- */
export const analyticsApi = {
  getOfficerStats: async () => {
    try {
      return await request<typeof mockData.officerStats>("/performance/officers");
    } catch {
      return mockData.officerStats;
    }
  },

  getWorkloadSuggestions: async () => {
    try {
      return await request<typeof mockData.workloadSuggestion>("/performance/workload-suggestions");
    } catch {
      return mockData.workloadSuggestion;
    }
  },

  getDailyDigest: async () => {
    try {
      return await request<typeof mockData.digestItems>("/digest/daily");
    } catch {
      return mockData.digestItems;
    }
  },

  getForecast: async () => {
    try {
      return await request<typeof mockData.forecastSeries>("/forecast");
    } catch {
      return mockData.forecastSeries;
    }
  },
};

/* ---------------- Admin & Audit API ---------------- */
export const adminApi = {
  getUsers: async () => {
    try {
      return await request<typeof mockData.users>("/admin/users");
    } catch {
      return mockData.users;
    }
  },

  createUser: async (user: any) => {
    try {
      return await request("/admin/users", {
        method: "POST",
        body: JSON.stringify(user),
      });
    } catch {
      return { id: `U-${Date.now().toString().slice(-4)}`, ...user, status: "active" };
    }
  },

  getSystemHealth: async () => {
    try {
      return await request<typeof mockData.services>("/admin/system-health");
    } catch {
      return mockData.services;
    }
  },

  getAuditLogs: async () => {
    try {
      return await request<typeof mockData.auditEntries>("/admin/audit-log");
    } catch {
      return mockData.auditEntries;
    }
  },
};
