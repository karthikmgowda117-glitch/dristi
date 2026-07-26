import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RequestUser } from '@drishti/common';

export interface UnitNode {
  unit_id: string;
  unit_name: string;
  unit_type: string;
  parent_unit_id: string | null;
  children?: UnitNode[];
}

@Injectable()
export class UnitService {
  constructor(private readonly dataSource: DataSource) {}

  // ─── GET /units/tree ─────────────────────────────────────────────────────
  async getTree(rootUnitId: string | undefined, user: RequestUser): Promise<UnitNode[]> {
    const effectiveRoot = rootUnitId || user.unitId;

    // Policymaker/Admin sees state root
    if (user.role === 'POLICYMAKER' || user.role === 'ADMIN') {
      const stateRoot = await this.dataSource.query<UnitNode[]>(
        `SELECT unit_id, unit_name, unit_type, parent_unit_id FROM unit WHERE parent_unit_id IS NULL`,
      );
      return this.buildTree(await this.getAllUnits(), stateRoot[0]?.unit_id);
    }

    // Validate root is within jurisdiction
    const allowed = await this.getDescendantUnits(user.unitId);
    if (!allowed.includes(effectiveRoot)) {
      throw new ForbiddenException('Requested root is outside your jurisdiction');
    }

    const allUnits = await this.getAllUnits();
    return this.buildTree(allUnits, effectiveRoot);
  }

  // ─── GET /units/:unitId ──────────────────────────────────────────────────
  async findOne(unitId: string, user: RequestUser) {
    const allowed = await this.getDescendantUnits(user.unitId);
    if (user.role !== 'POLICYMAKER' && user.role !== 'ADMIN' && !allowed.includes(unitId)) {
      throw new ForbiddenException('Unit outside jurisdiction');
    }
    const result = await this.dataSource.query<UnitNode[]>(
      'SELECT unit_id, unit_name, unit_type, parent_unit_id, created_at FROM unit WHERE unit_id = $1',
      [unitId],
    );
    if (!result.length) throw new NotFoundException('Unit not found');
    return result[0];
  }

  // ─── POST /units ─────────────────────────────────────────────────────────
  async create(dto: { parentUnitId?: string; unitName: string; unitType: string }, user: RequestUser) {
    const id = uuidv4();
    await this.dataSource.query(
      'INSERT INTO unit (unit_id, parent_unit_id, unit_name, unit_type) VALUES ($1, $2, $3, $4)',
      [id, dto.parentUnitId ?? null, dto.unitName, dto.unitType],
    );
    return { unit_id: id, ...dto };
  }

  // ─── PATCH /units/:unitId ────────────────────────────────────────────────
  async update(unitId: string, dto: Partial<{ unitName: string; unitType: string }>) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (dto.unitName) { sets.push(`unit_name = $${idx++}`); vals.push(dto.unitName); }
    if (dto.unitType) { sets.push(`unit_type = $${idx++}`); vals.push(dto.unitType); }
    if (!sets.length) return { message: 'Nothing to update' };
    vals.push(unitId);
    await this.dataSource.query(
      `UPDATE unit SET ${sets.join(', ')} WHERE unit_id = $${idx}`,
      vals,
    );
    return { unit_id: unitId, ...dto };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private async getAllUnits(): Promise<UnitNode[]> {
    return this.dataSource.query<UnitNode[]>(
      'SELECT unit_id, unit_name, unit_type, parent_unit_id FROM unit ORDER BY unit_type, unit_name',
    );
  }

  private buildTree(allUnits: UnitNode[], rootId: string): UnitNode[] {
    const map = new Map<string, UnitNode>();
    allUnits.forEach((u) => map.set(u.unit_id, { ...u, children: [] }));

    const roots: UnitNode[] = [];
    map.forEach((node) => {
      if (node.unit_id === rootId) {
        roots.push(node);
      } else if (node.parent_unit_id && map.has(node.parent_unit_id)) {
        const parent = map.get(node.parent_unit_id)!;
        if (this.isDescendantOf(allUnits, parent.unit_id, rootId)) {
          (parent.children = parent.children || []).push(node);
        }
      }
    });
    return roots;
  }

  private isDescendantOf(units: UnitNode[], unitId: string, ancestorId: string): boolean {
    let current = units.find((u) => u.unit_id === unitId);
    while (current) {
      if (current.unit_id === ancestorId) return true;
      current = units.find((u) => u.unit_id === current!.parent_unit_id);
    }
    return false;
  }

  async getDescendantUnits(rootUnitId: string): Promise<string[]> {
    const result = await this.dataSource.query<{ unit_id: string }[]>(
      `WITH RECURSIVE d AS (
         SELECT unit_id FROM unit WHERE unit_id = $1
         UNION ALL
         SELECT u.unit_id FROM unit u JOIN d ON u.parent_unit_id = d.unit_id
       ) SELECT unit_id FROM d`,
      [rootUnitId],
    );
    return result.map((r) => r.unit_id);
  }
}
