import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RequestUser } from '@drishti/common';

// MinIO client (lazy-imported to avoid startup failure if minio is down)
let minioClient: import('minio').Client | null = null;

async function getMinioClient(config: ConfigService) {
  if (!minioClient) {
    const Minio = await import('minio');
    minioClient = new Minio.Client({
      endPoint: config.get('MINIO_ENDPOINT', 'minio'),
      port: parseInt(config.get('MINIO_PORT', '9000')),
      useSSL: config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: config.get('MINIO_ACCESS_KEY', ''),
      secretKey: config.get('MINIO_SECRET_KEY', ''),
    });
  }
  return minioClient;
}

@Injectable()
export class EvidenceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  // ─── Upload evidence ──────────────────────────────────────────────────────
  async upload(
    caseId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    evidenceType: string,
    user: RequestUser,
  ) {
    await this.assertCaseJurisdiction(caseId, user);

    const hashSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const storageKey = `evidence/${caseId}/${uuidv4()}-${originalName}`;
    const bucket = this.config.get('MINIO_BUCKET', 'drishti-evidence');

    // Upload to MinIO
    const minio = await getMinioClient(this.config);
    try {
      const bucketExists = await minio.bucketExists(bucket);
      if (!bucketExists) await minio.makeBucket(bucket, 'ap-south-1');
      await minio.putObject(bucket, storageKey, fileBuffer, fileBuffer.length, {
        'Content-Type': mimeType,
        'x-case-id': caseId,
      });
    } catch (err) {
      throw new ConflictException(`Storage upload failed: ${err.message}`);
    }

    const evidenceId = uuidv4();
    await this.dataSource.query(
      `INSERT INTO evidence (evidence_id, case_master_id, type, storage_key, hash_sha256, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [evidenceId, caseId, evidenceType, storageKey, hashSha256, user.userId],
    );

    // Create initial chain-of-custody entry
    await this.appendCustodyEntry(evidenceId, user.userId, 'UPLOADED', hashSha256);

    return { evidenceId, hashSha256, storageKey };
  }

  // ─── List evidence ────────────────────────────────────────────────────────
  async listByCase(caseId: string, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    return this.dataSource.query(
      `SELECT e.evidence_id, e.case_master_id, e.type, e.hash_sha256,
              e.uploaded_by, e.uploaded_at, e.is_deleted,
              coc.integrity_verified AS latest_integrity_verified
       FROM evidence e
       LEFT JOIN LATERAL (
         SELECT integrity_verified FROM chain_of_custody
         WHERE evidence_id = e.evidence_id ORDER BY timestamp DESC LIMIT 1
       ) coc ON true
       WHERE e.case_master_id = $1 AND e.is_deleted = false
       ORDER BY e.uploaded_at DESC`,
      [caseId],
    );
  }

  // ─── Get one ─────────────────────────────────────────────────────────────
  async findOne(evidenceId: string, user: RequestUser) {
    const ev = await this.getEvidence(evidenceId);
    await this.assertCaseJurisdiction(ev.case_master_id, user);
    // Append ACCESS custody entry
    await this.appendCustodyEntry(evidenceId, user.userId, 'ACCESSED', ev.hash_sha256);
    return ev;
  }

  // ─── Chain of custody ────────────────────────────────────────────────────
  async getCustody(evidenceId: string, user: RequestUser) {
    const ev = await this.getEvidence(evidenceId);
    await this.assertCaseJurisdiction(ev.case_master_id, user);
    return this.dataSource.query(
      `SELECT custody_id, evidence_id, actor_user_id, action, hash_at_access, integrity_verified, timestamp
       FROM chain_of_custody WHERE evidence_id = $1 ORDER BY timestamp ASC`,
      [evidenceId],
    );
  }

  // ─── Integrity verify ────────────────────────────────────────────────────
  async verify(evidenceId: string, user: RequestUser) {
    const ev = await this.getEvidence(evidenceId);
    await this.assertCaseJurisdiction(ev.case_master_id, user);

    // Re-download from MinIO and compute hash
    let currentHash: string;
    try {
      const minio = await getMinioClient(this.config);
      const bucket = this.config.get('MINIO_BUCKET', 'drishti-evidence');
      const stream = await minio.getObject(bucket, ev.storage_key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      const fileBuffer = Buffer.concat(chunks);
      currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch {
      // MinIO unavailable — mark as unverified
      currentHash = 'UNVERIFIABLE';
    }

    const integrityVerified = currentHash === ev.hash_sha256;
    await this.appendCustodyEntry(evidenceId, user.userId, 'ACCESSED', currentHash, integrityVerified);

    if (!integrityVerified) {
      // Raise integrity alert (non-blocking)
      this.raiseIntegrityAlert(evidenceId, ev.case_master_id, ev.hash_sha256, currentHash);
    }

    return { integrityVerified, hashAtAccess: currentHash, storedHash: ev.hash_sha256 };
  }

  // ─── Court package (async job) ────────────────────────────────────────────
  async generateCourtPackage(caseId: string, includeExplainability: boolean, user: RequestUser) {
    await this.assertCaseJurisdiction(caseId, user);
    const jobId = uuidv4();
    // In production, this would enqueue a job to a queue worker
    // For MVP, we return a job ID immediately
    return { jobId, status: 'QUEUED', message: 'Court package generation started' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private async getEvidence(evidenceId: string) {
    const result = await this.dataSource.query(
      'SELECT * FROM evidence WHERE evidence_id = $1 AND is_deleted = false',
      [evidenceId],
    );
    if (!result.length) throw new NotFoundException('Evidence not found');
    return result[0];
  }

  private async appendCustodyEntry(
    evidenceId: string,
    actorUserId: string,
    action: string,
    hashAtAccess: string,
    integrityVerified = true,
  ) {
    await this.dataSource.query(
      `INSERT INTO chain_of_custody
         (custody_id, evidence_id, actor_user_id, action, hash_at_access, integrity_verified)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), evidenceId, actorUserId, action, hashAtAccess, integrityVerified],
    );
  }

  private async assertCaseJurisdiction(caseId: string, user: RequestUser) {
    if (user.role === 'POLICYMAKER' || user.role === 'ADMIN') return;
    const result = await this.dataSource.query<{ unit_id: string }[]>(
      'SELECT unit_id FROM casemaster WHERE case_master_id = $1',
      [caseId],
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

  private raiseIntegrityAlert(evidenceId: string, caseId: string, stored: string, actual: string) {
    // Non-blocking integrity alert — in production goes to Redis Streams → alert-service
    console.error(`INTEGRITY ALERT: Evidence ${evidenceId} hash mismatch. Stored: ${stored}, Actual: ${actual}`);
  }
}
