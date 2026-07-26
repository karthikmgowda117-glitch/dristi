import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RequestUser } from '@drishti/common';

@Injectable()
export class PeopleService {
  constructor(private readonly dataSource: DataSource) {}

  // ─── Accused ─────────────────────────────────────────────────────────────
  async getAccused(caseId: string, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    const rows = await this.dataSource.query(
      `SELECT accused_id, case_master_id, name, age, gender, address, created_at
       FROM accused WHERE case_master_id = $1 ORDER BY created_at`,
      [caseId],
    );
    // contact_number intentionally excluded from list (available only with Supervisor+ role)
    if (['SUPERVISOR', 'ADMIN', 'ANALYST'].includes(user.role)) {
      return this.dataSource.query(
        `SELECT accused_id, case_master_id, name, age, gender, address, contact_number, created_at
         FROM accused WHERE case_master_id = $1 ORDER BY created_at`,
        [caseId],
      );
    }
    return rows;
  }

  async createAccused(caseId: string, dto: Record<string, unknown>, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    const id = uuidv4();
    await this.dataSource.query(
      `INSERT INTO accused (accused_id, case_master_id, name, age, gender, address, contact_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, caseId, dto.name, dto.age ?? null, dto.gender ?? null, dto.address ?? null, dto.contactNumber ?? null],
    );
    return { accused_id: id, case_master_id: caseId, ...dto };
  }

  // ─── Victims ─────────────────────────────────────────────────────────────
  async getVictims(caseId: string, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    return this.dataSource.query(
      `SELECT victim_id, case_master_id, name, age, gender, created_at
       FROM victim WHERE case_master_id = $1 ORDER BY created_at`,
      [caseId],
    );
  }

  async createVictim(caseId: string, dto: Record<string, unknown>, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    const id = uuidv4();
    await this.dataSource.query(
      `INSERT INTO victim (victim_id, case_master_id, name, age, gender) VALUES ($1, $2, $3, $4, $5)`,
      [id, caseId, dto.name, dto.age ?? null, dto.gender ?? null],
    );
    return { victim_id: id, case_master_id: caseId, ...dto };
  }

  // ─── Complainant ─────────────────────────────────────────────────────────
  async getComplainant(caseId: string, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    const rows = await this.dataSource.query(
      `SELECT cd.complainant_id, cd.case_master_id, cd.name,
              cd.occupation_id, cd.religion_id, cd.caste_id, cd.contact_number
       FROM complainant_details cd WHERE cd.case_master_id = $1`,
      [caseId],
    );
    if (user.role === 'POLICYMAKER') {
      // Strip all PII — return only non-identifying fields
      return rows.map((r: Record<string, unknown>) => ({
        complainant_id: r.complainant_id,
        case_master_id: r.case_master_id,
        // name, contact_number, religion_id, caste_id are masked
      }));
    }
    return rows;
  }

  async createComplainant(caseId: string, dto: Record<string, unknown>, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    const id = uuidv4();
    await this.dataSource.query(
      `INSERT INTO complainant_details (complainant_id, case_master_id, name, occupation_id, religion_id, caste_id, contact_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, caseId, dto.name, dto.occupationId ?? null, dto.religionId ?? null, dto.casteId ?? null, dto.contactNumber ?? null],
    );
    return { complainant_id: id, case_master_id: caseId, ...dto };
  }

  // ─── Narrative Entities (FR-34) ───────────────────────────────────────────
  async getNarrativeEntities(caseId: string, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    return this.dataSource.query(
      `SELECT entity_id, case_master_id, entity_type, extracted_text,
              confidence_score, provenance, extracted_at
       FROM narrative_extracted_entity
       WHERE case_master_id = $1 AND confidence_score >= 0.6
       ORDER BY confidence_score DESC`,
      [caseId],
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private async assertCaseJurisdiction(caseId: string, user: RequestUser) {
    if (user.role === 'POLICYMAKER' || user.role === 'ADMIN') return;
    const result = await this.dataSource.query<{ unit_id: string }[]>(
      'SELECT unit_id FROM casemaster WHERE case_master_id = $1',
      [caseId],
    );
    if (!result.length) throw new NotFoundException('Case not found');
    const caseUnitId = result[0].unit_id;
    const allowed = await this.getDescendantUnits(user.unitId);
    if (!allowed.includes(caseUnitId)) throw new ForbiddenException('Case outside jurisdiction');
  }

  private async getDescendantUnits(rootUnitId: string): Promise<string[]> {
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
