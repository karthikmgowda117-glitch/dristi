import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RequestUser } from '@drishti/common';

@Injectable()
export class AuditReadService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(
    query: { actorUserId?: string; entityType?: string; dateFrom?: string; dateTo?: string; page: number; pageSize: number },
    user: RequestUser,
  ) {
    let sql = `SELECT audit_id, actor_user_id, action, entity_type, entity_id,
                      jurisdiction_unit_id, trace_id, payload, timestamp
               FROM audit_log WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;

    if (query.actorUserId) { sql += ` AND actor_user_id = $${idx++}`; params.push(query.actorUserId); }
    if (query.entityType)  { sql += ` AND entity_type = $${idx++}`;   params.push(query.entityType); }
    if (query.dateFrom)    { sql += ` AND timestamp >= $${idx++}`;    params.push(query.dateFrom); }
    if (query.dateTo)      { sql += ` AND timestamp <= $${idx++}`;    params.push(query.dateTo); }

    // Supervisor: restrict to their jurisdiction
    if (user.role === 'SUPERVISOR') {
      const allowed = await this.getDescendantUnits(user.unitId);
      sql += ` AND jurisdiction_unit_id = ANY($${idx++})`;
      params.push(allowed);
    }

    sql += ` ORDER BY timestamp DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(query.pageSize, (query.page - 1) * query.pageSize);

    const items = await this.dataSource.query(sql, params);
    return { items, page: query.page, pageSize: query.pageSize };
  }

  /** Write audit entry — called by AuditInterceptor via event bus */
  async write(entry: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId?: string;
    jurisdictionUnitId: string;
    traceId?: string;
    payload?: Record<string, unknown>;
  }) {
    await this.dataSource.query(
      `INSERT INTO audit_log (audit_id, actor_user_id, action, entity_type, entity_id, jurisdiction_unit_id, trace_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        uuidv4(), entry.actorUserId, entry.action, entry.entityType,
        entry.entityId ?? null, entry.jurisdictionUnitId,
        entry.traceId ?? null, entry.payload ? JSON.stringify(entry.payload) : null,
      ],
    );
  }

  private async getDescendantUnits(rootUnitId: string): Promise<string[]> {
    const result = await this.dataSource.query<{ unit_id: string }[]>(
      `WITH RECURSIVE d AS (SELECT unit_id FROM unit WHERE unit_id = $1
       UNION ALL SELECT u.unit_id FROM unit u JOIN d ON u.parent_unit_id = d.unit_id)
       SELECT unit_id FROM d`,
      [rootUnitId],
    );
    return result.map((r) => r.unit_id);
  }
}
