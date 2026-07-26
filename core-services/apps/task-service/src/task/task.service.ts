import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RequestUser } from '@drishti/common';

@Injectable()
export class TaskService {
  constructor(private readonly dataSource: DataSource) {}

  async listTasks(caseId: string, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    return this.dataSource.query(
      `SELECT task_id, case_master_id, assigned_user_id, description, status, due_date, created_at
       FROM task WHERE case_master_id = $1 ORDER BY created_at`,
      [caseId],
    );
  }

  async createTask(caseId: string, dto: { description: string; dueDate?: string }, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    const id = uuidv4();
    await this.dataSource.query(
      `INSERT INTO task (task_id, case_master_id, assigned_user_id, description, due_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, caseId, user.userId, dto.description, dto.dueDate ?? null],
    );
    return { task_id: id, case_master_id: caseId, assigned_user_id: user.userId, ...dto, status: 'OPEN' };
  }

  async updateTask(taskId: string, status: string, user: RequestUser) {
    const result = await this.dataSource.query(
      `UPDATE task SET status = $1 WHERE task_id = $2 AND assigned_user_id = $3 RETURNING *`,
      [status, taskId, user.userId],
    );
    if (!result.length) throw new NotFoundException('Task not found or not assigned to you');
    return result[0];
  }

  private async assertCaseJurisdiction(caseId: string, user: RequestUser) {
    if (user.role === 'ADMIN') return;
    const result = await this.dataSource.query<{ unit_id: string }[]>(
      'SELECT unit_id FROM casemaster WHERE case_master_id = $1', [caseId],
    );
    if (!result.length) throw new NotFoundException('Case not found');
    const allowed = await this.getDescendantUnits(user.unitId);
    if (!allowed.includes(result[0].unit_id)) throw new ForbiddenException('Case outside jurisdiction');
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
