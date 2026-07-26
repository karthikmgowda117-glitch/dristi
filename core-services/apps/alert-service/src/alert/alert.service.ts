import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RequestUser } from '@drishti/common';

@Injectable()
export class AlertService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(query: { unitId?: string; severity?: string; status?: string; page: number; pageSize: number }, user: RequestUser) {
    const allowedUnits = await this.getDescendantUnits(user.unitId);
    let sql = `SELECT a.alert_id, a.unit_id, a.crime_minor_head_id, a.severity, a.z_score,
                      a.baseline_window_days, a.triggered_at, a.status, a.dismiss_reason
               FROM alert a WHERE a.unit_id = ANY($1)`;
    const params: unknown[] = [allowedUnits];
    let idx = 2;
    if (query.severity) { sql += ` AND a.severity = $${idx++}`; params.push(query.severity); }
    if (query.status)   { sql += ` AND a.status = $${idx++}`;   params.push(query.status); }
    if (query.unitId)   { sql += ` AND a.unit_id = $${idx++}`;  params.push(query.unitId); }
    sql += ` ORDER BY a.triggered_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const items = await this.dataSource.query(sql, params);
    return { items, page: query.page, pageSize: query.pageSize };
  }

  async findOne(alertId: string, user: RequestUser) {
    const result = await this.dataSource.query(
      `SELECT a.*, et.trace_id, et.method_tag, et.confidence_score, et.source_record_refs
       FROM alert a
       LEFT JOIN explainability_trace et ON et.output_type = 'ANOMALY_ALERT' AND et.source_record_refs::text LIKE $2
       WHERE a.alert_id = $1`,
      [alertId, `%${alertId}%`],
    );
    if (!result.length) throw new NotFoundException('Alert not found');
    return result[0];
  }

  async update(alertId: string, dto: { status: string; dismissReason?: string }, user: RequestUser) {
    if (dto.status === 'DISMISSED' && !dto.dismissReason) {
      throw new BadRequestException('dismissReason is required when dismissing an alert');
    }
    await this.dataSource.query(
      `UPDATE alert SET status = $1, dismiss_reason = $2 WHERE alert_id = $3`,
      [dto.status, dto.dismissReason ?? null, alertId],
    );
    return { alertId, ...dto };
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
