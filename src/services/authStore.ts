export interface PoliceUser {
  id: string;
  name: string;
  rank: "DSP" | "Inspector" | "Sub-Inspector" | "Constable" | "Analyst";
  roleTitle: string;
  station: string;
  status: "active" | "suspended";
  avatar: string;
  forceId: string;
}

export const INITIAL_POLICE_USERS: PoliceUser[] = [
  {
    id: "U-1001",
    name: "DSP Vikram Rathore",
    rank: "DSP",
    roleTitle: "Deputy Superintendent of Police (Head of Range)",
    station: "Bengaluru East Range HQ",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    forceId: "DSP-KA-2026-001",
  },
  {
    id: "U-1002",
    name: "Inspector Vijay Kumar",
    rank: "Inspector",
    roleTitle: "Station House Officer (SHO)",
    station: "Whitefield PS",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    forceId: "INS-KA-2026-042",
  },
  {
    id: "U-1003",
    name: "SI Ramesh K.",
    rank: "Sub-Inspector",
    roleTitle: "Investigating Officer (IO)",
    station: "Whitefield PS",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    forceId: "SI-KA-2026-114",
  },
  {
    id: "U-1004",
    name: "PSI Deepa N.",
    rank: "Sub-Inspector",
    roleTitle: "Investigating Officer (IO)",
    station: "K.R. Puram PS",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    forceId: "PSI-KA-2026-209",
  },
  {
    id: "U-1005",
    name: "PSI Arjun T.",
    rank: "Sub-Inspector",
    roleTitle: "Investigating Officer (IO)",
    station: "Mahadevapura PS",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    forceId: "PSI-KA-2026-312",
  },
  {
    id: "U-1006",
    name: "Constable Suresh B.",
    rank: "Constable",
    roleTitle: "Beat Constable",
    station: "Whitefield PS",
    status: "suspended", // Default suspended for DSP activation demo
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    forceId: "CON-KA-2026-881",
  },
];

const STORAGE_USERS_KEY = "drishti_police_users_v2";
const STORAGE_CURRENT_USER_KEY = "drishti_current_user_v2";

export function getStoredUsers(): PoliceUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_POLICE_USERS;
}

export function saveStoredUsers(users: PoliceUser[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch {}
}

export function getCurrentUser(): PoliceUser {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      // Ensure user is fresh from current list
      const users = getStoredUsers();
      const fresh = users.find((x) => x.id === u.id);
      if (fresh) return fresh;
    }
  } catch {}
  return INITIAL_POLICE_USERS[0]; // Default to DSP
}

export function setCurrentUser(user: PoliceUser): void {
  try {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
  } catch {}
}

export function updateUserStatus(userId: string, newStatus: "active" | "suspended"): PoliceUser[] {
  const users = getStoredUsers();
  const updated = users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
  saveStoredUsers(updated);
  return updated;
}
