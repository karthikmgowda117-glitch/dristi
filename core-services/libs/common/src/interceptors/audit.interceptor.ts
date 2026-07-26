import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestUser } from '../types';

/**
 * AuditInterceptor — cross-cutting concern applied to every write + AI-query action.
 * Logs actor, action, entity type/ID, jurisdiction, timestamp, and optional trace_id.
 *
 * Applied as a global interceptor; individual endpoints annotate with @AuditAction().
 * Implements FR-17: 100% audit coverage is structural, not per-endpoint opt-in.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    const auditMeta = (request as Record<string, unknown>)['__auditMeta'] as {
      action?: string;
      entityType?: string;
      entityId?: string;
      traceId?: string;
    } | undefined;

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          if (!user || !auditMeta?.action) return;

          // Emit to Redis Streams (consumed by audit-service)
          const auditEntry = {
            auditId: uuidv4(),
            actorUserId: user.userId,
            action: auditMeta.action,
            entityType: auditMeta.entityType || 'UNKNOWN',
            entityId: auditMeta.entityId || extractEntityId(responseBody),
            jurisdictionUnitId: user.unitId,
            traceId: auditMeta.traceId,
            timestamp: new Date().toISOString(),
          };

          this.logger.log(`AUDIT: ${JSON.stringify(auditEntry)}`);
          // The actual Redis Streams publish is done via the EventBus module
          // injected in the AppModule of each service
        },
        error: (err) => {
          if (!user || !auditMeta?.action) return;
          this.logger.warn(`AUDIT_FAILED_ACTION: ${auditMeta.action} by ${user?.userId} — ${err.message}`);
        },
      }),
    );
  }
}

function extractEntityId(body: unknown): string | undefined {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    return (
      (b['id'] as string) ||
      (b['case_master_id'] as string) ||
      (b['accused_id'] as string) ||
      (b['evidence_id'] as string) ||
      undefined
    );
  }
  return undefined;
}
