import {
  Injectable, NotFoundException, ForbiddenException,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { CasemasterEntity } from '../entities/casemaster.entity';
import { CaseTimelineEventEntity } from '../entities/supporting.entities';
import { CreateCaseDto, UpdateCaseDto, CaseQueryDto, isValidTransition, CaseStatus } from './dto/case.dto';
import { RequestUser } from '@drishti/common';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CaseService {
  constructor(
    @InjectRepository(CasemasterEntity)
    private readonly caseRepo: Repository<CasemasterEntity>,
    @InjectRepository(CaseTimelineEventEntity)
    private readonly timelineRepo: Repository<CaseTimelineEventEntity>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  // ─── List cases (jurisdiction-filtered) ─────────────────────────────────

  async findAll(query: CaseQueryDto, user: RequestUser) {
    const { page = 1, pageSize = 20, unitId, status, crimeMajorHeadId, dateFrom, dateTo } = query;

    // Build unit subtree for jurisdiction filter
    const allowedUnits = await this.getDescendantUnits(user.unitId);

    const qb = this.caseRepo.createQueryBuilder('c');

    // Jurisdiction scope: restrict to user's subtree
    qb.where('c.unit_id = ANY(:units)', { units: allowedUnits });

    if (unitId) {
      if (!allowedUnits.includes(unitId)) throw new ForbiddenException('Unit outside jurisdiction');
      qb.andWhere('c.unit_id = :unitId', { unitId });
    }
    if (status)            qb.andWhere('c.status = :status', { status });
    if (crimeMajorHeadId)  qb.andWhere('c.crime_major_head_id = :crimeMajorHeadId', { crimeMajorHeadId });
    if (dateFrom)          qb.andWhere('c.incident_from_date >= :dateFrom', { dateFrom });
    if (dateTo)            qb.andWhere('c.incident_from_date <= :dateTo', { dateTo });

    // Policymaker PII strip: only return aggregate-safe fields
    if (user.role === 'POLICYMAKER') {
      qb.select([
        'c.case_master_id', 'c.unit_id', 'c.crime_major_head_id',
        'c.crime_minor_head_id', 'c.status', 'c.incident_from_date',
        'c.latitude', 'c.longitude', 'c.created_at',
      ]);
    }

    qb.orderBy('c.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    // Emit intake-assist event on each case for embedding index tracking
    return { items, total, page, pageSize };
  }

  // ─── Get one ─────────────────────────────────────────────────────────────

  async findOne(caseId: string, user: RequestUser) {
    const caseRecord = await this.caseRepo.findOne({ where: { case_master_id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');

    await this.assertJurisdiction(caseRecord.unit_id, user);

    if (user.role === 'POLICYMAKER') {
      // Strip PII for policymaker tier
      const { narrative, assigned_officer_id, ...safe } = caseRecord;
      return safe;
    }
    return caseRecord;
  }

  // ─── Create case ─────────────────────────────────────────────────────────

  async create(dto: CreateCaseDto, user: RequestUser) {
    if (!['SHO', 'ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only SHO or Admin can create cases');
    }

    await this.assertJurisdiction(dto.unitId, user);

    const caseRecord = this.caseRepo.create({
      case_master_id: uuidv4(),
      unit_id: dto.unitId,
      crime_major_head_id: dto.crimeMajorHeadId,
      crime_minor_head_id: dto.crimeMinorHeadId,
      fir_number: dto.firNumber,
      latitude: dto.latitude,
      longitude: dto.longitude,
      incident_from_date: dto.incidentFromDate,
      incident_to_date: dto.incidentToDate,
      narrative: dto.narrative,
      status: 'REGISTERED',
    });

    const saved = await this.caseRepo.save(caseRecord);

    // Emit intake.created event to Redis (consumed by intake-assist-service)
    await this.emitIntakeCreatedEvent(saved.case_master_id);

    // Log timeline event
    await this.timelineRepo.save(
      this.timelineRepo.create({
        event_id: uuidv4(),
        case_master_id: saved.case_master_id,
        event_type: 'FIR_REGISTERED',
        description: `FIR ${dto.firNumber} registered`,
        created_by: user.userId,
      }),
    );

    return saved;
  }

  // ─── Update case ─────────────────────────────────────────────────────────

  async update(caseId: string, dto: UpdateCaseDto, user: RequestUser) {
    const caseRecord = await this.caseRepo.findOne({ where: { case_master_id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');
    await this.assertJurisdiction(caseRecord.unit_id, user);

    if (dto.status && dto.status !== caseRecord.status) {
      if (!isValidTransition(caseRecord.status as CaseStatus, dto.status)) {
        throw new ConflictException(
          `Invalid status transition from '${caseRecord.status}' to '${dto.status}'`,
        );
      }
      // Log status change to timeline
      await this.timelineRepo.save(
        this.timelineRepo.create({
          event_id: uuidv4(),
          case_master_id: caseId,
          event_type: 'STATUS_CHANGE',
          description: `Status changed from ${caseRecord.status} to ${dto.status}`,
          created_by: user.userId,
        }),
      );
    }

    Object.assign(caseRecord, {
      ...(dto.status && { status: dto.status }),
      ...(dto.assignedOfficerId !== undefined && { assigned_officer_id: dto.assignedOfficerId }),
      ...(dto.narrative !== undefined && { narrative: dto.narrative }),
    });

    return this.caseRepo.save(caseRecord);
  }

  // ─── Timeline ────────────────────────────────────────────────────────────

  async getTimeline(caseId: string, user: RequestUser) {
    const caseRecord = await this.caseRepo.findOne({ where: { case_master_id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');
    await this.assertJurisdiction(caseRecord.unit_id, user);

    return this.timelineRepo.find({
      where: { case_master_id: caseId },
      order: { created_at: 'ASC' },
    });
  }

  async addTimelineEvent(caseId: string, eventType: string, description: string, user: RequestUser) {
    const caseRecord = await this.caseRepo.findOne({ where: { case_master_id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');
    await this.assertJurisdiction(caseRecord.unit_id, user);

    return this.timelineRepo.save(
      this.timelineRepo.create({
        event_id: uuidv4(),
        case_master_id: caseId,
        event_type: eventType,
        description,
        created_by: user.userId,
      }),
    );
  }

  // ─── Intake Assist (FR-32) ───────────────────────────────────────────────

  async getIntakeAssist(caseId: string, user: RequestUser) {
    const caseRecord = await this.caseRepo.findOne({ where: { case_master_id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');
    await this.assertJurisdiction(caseRecord.unit_id, user);

    // Proxy to intake-assist-service
    try {
      const intakeServiceUrl = this.config.get('INTAKE_SERVICE_URL', 'http://intake-assist-service:8012');
      const response = await axios.get(`${intakeServiceUrl}/api/v1/intake-assist/${caseId}`, {
        timeout: 10000,
      });
      return response.data;
    } catch {
      return { status: 'pending', message: 'Intake assist is being assembled, retry shortly.' };
    }
  }

  // ─── Case Profile (FR-36) ────────────────────────────────────────────────

  async getCaseProfile(caseId: string, user: RequestUser) {
    const [caseRecord, timeline] = await Promise.all([
      this.findOne(caseId, user),
      this.getTimeline(caseId, user),
    ]);
    return {
      case: caseRecord,
      timeline,
      // Graph and evidence summary are fetched by the frontend from their respective endpoints
      profileType: 'CASE_INTELLIGENCE_PROFILE',
    };
  }

  // ─── Acts/Sections ────────────────────────────────────────────────────────

  async getActs() {
    return this.dataSource.query('SELECT act_id, act_name FROM act_master ORDER BY act_id');
  }

  async getSections(actId: number) {
    return this.dataSource.query(
      'SELECT section_id, section_number, description FROM section_master WHERE act_id = $1 ORDER BY section_id',
      [actId],
    );
  }

  async addActSection(caseId: string, actId: number, sectionId: number, user: RequestUser) {
    const caseRecord = await this.caseRepo.findOne({ where: { case_master_id: caseId } });
    if (!caseRecord) throw new NotFoundException('Case not found');
    await this.assertJurisdiction(caseRecord.unit_id, user);

    try {
      await this.dataSource.query(
        `INSERT INTO act_section_association (case_master_id, act_id, section_id)
         VALUES ($1, $2, $3) ON CONFLICT (case_master_id, section_id) DO NOTHING`,
        [caseId, actId, sectionId],
      );
      return { message: 'Section added', caseId, actId, sectionId };
    } catch {
      throw new ConflictException('Section already associated with this case');
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async assertJurisdiction(unitId: string, user: RequestUser) {
    if (user.role === 'POLICYMAKER' || user.role === 'ADMIN') return;
    const allowed = await this.getDescendantUnits(user.unitId);
    if (!allowed.includes(unitId)) {
      throw new ForbiddenException('Case is outside your jurisdiction');
    }
  }

  private async getDescendantUnits(rootUnitId: string): Promise<string[]> {
    const result = await this.dataSource.query<{ unit_id: string }[]>(
      `WITH RECURSIVE descendants AS (
         SELECT unit_id FROM unit WHERE unit_id = $1
         UNION ALL
         SELECT u.unit_id FROM unit u
         INNER JOIN descendants d ON u.parent_unit_id = d.unit_id
       )
       SELECT unit_id FROM descendants`,
      [rootUnitId],
    );
    return result.map((r) => r.unit_id);
  }

  private async emitIntakeCreatedEvent(caseMasterId: string) {
    // Publish to Redis pub/sub for intake-assist-service
    try {
      const intakeUrl = this.config.get('INTAKE_SERVICE_URL', 'http://intake-assist-service:8012');
      await axios.post(`${intakeUrl}/api/v1/intake-assist/trigger`, { caseMasterId }, { timeout: 3000 });
    } catch {
      // Non-blocking — intake assist is best-effort
    }
  }
}
