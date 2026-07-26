// ─── Shared Types ────────────────────────────────────────────────────────────

export type RoleName =
  | 'INVESTIGATOR'
  | 'SHO'
  | 'ANALYST'
  | 'SUPERVISOR'
  | 'POLICYMAKER'
  | 'ADMIN';

export type UnitType = 'STATE' | 'DISTRICT' | 'SUBDIVISION' | 'STATION';

export type CaseStatus =
  | 'REGISTERED'
  | 'UNDER_INVESTIGATION'
  | 'EVIDENCE_COLLECTION'
  | 'CHARGESHEET_PREP'
  | 'CLOSED';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ESCALATED' | 'DISMISSED';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';
export type CustodyAction = 'UPLOADED' | 'ACCESSED' | 'TRANSFERRED' | 'EXPORTED';
export type SourceType = 'SEED' | 'SYNTHETIC' | 'PRODUCTION';
export type LanguagePref = 'en' | 'kn';

export interface JwtPayload {
  sub: string;         // user_id
  username: string;
  role: RoleName;
  unitId: string;
  jurisdictionPath: string[];  // ordered from root → leaf
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  userId: string;
  username: string;
  role: RoleName;
  unitId: string;
  jurisdictionPath: string[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    traceId?: string;
  };
}

export interface AuditContext {
  actorUserId: string;
  jurisdictionUnitId: string;
  action: string;
  entityType: string;
  entityId?: string;
  traceId?: string;
  payload?: Record<string, unknown>;
}
