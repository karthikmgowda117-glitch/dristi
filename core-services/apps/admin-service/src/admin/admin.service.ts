import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private readonly dataSource: DataSource) {}

  async listUsers(query: { page: number; pageSize: number; unitId?: string; roleId?: string }) {
    let sql = `SELECT u.user_id, u.username, u.unit_id, u.role_id, r.role_name,
                      u.language_pref, u.mfa_enabled, u.is_active, u.created_at
               FROM users u JOIN roles r ON r.role_id = u.role_id WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;
    if (query.unitId) { sql += ` AND u.unit_id = $${idx++}`; params.push(query.unitId); }
    if (query.roleId) { sql += ` AND u.role_id = $${idx++}`; params.push(query.roleId); }
    sql += ` ORDER BY u.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const items = await this.dataSource.query(sql, params);
    return { items, page: query.page, pageSize: query.pageSize };
  }

  async createUser(dto: { username: string; unitId: string; roleId: number; languagePref?: string }) {
    const existing = await this.dataSource.query(
      'SELECT user_id FROM users WHERE username = $1', [dto.username],
    );
    if (existing.length) throw new ConflictException('Username already exists');
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('password123', 10); // Default password
    await this.dataSource.query(
      `INSERT INTO users (user_id, unit_id, role_id, username, password_hash, language_pref)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, dto.unitId, dto.roleId, dto.username, passwordHash, dto.languagePref || 'en'],
    );
    return { user_id: userId, username: dto.username, unitId: dto.unitId, roleId: dto.roleId };
  }

  async updateUser(userId: string, dto: { roleId?: number; unitId?: string; isActive?: boolean }) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (dto.roleId !== undefined)   { sets.push(`role_id = $${idx++}`);  vals.push(dto.roleId); }
    if (dto.unitId !== undefined)   { sets.push(`unit_id = $${idx++}`);  vals.push(dto.unitId); }
    if (dto.isActive !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(dto.isActive); }
    if (!sets.length) return { message: 'Nothing to update' };
    vals.push(userId);
    const result = await this.dataSource.query(
      `UPDATE users SET ${sets.join(', ')} WHERE user_id = $${idx} RETURNING user_id`,
      vals,
    );
    if (!result.length) throw new NotFoundException('User not found');
    return { user_id: userId, updated: dto };
  }

  async getSystemHealth() {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'healthy',
        postgres: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          version: '1.0.0',
        },
      };
    } catch {
      return { status: 'degraded', postgres: 'error' };
    }
  }
}
