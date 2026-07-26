import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { RequestUser } from '@drishti/common';

/**
 * JurisdictionGuard — ABAC enforcement.
 *
 * Reads the `unitId` query param or body field from the request and verifies
 * that the authenticated user's unit_id is an ancestor-or-equal of the
 * requested unit. Returns 403 (not a silently filtered result) on violation.
 *
 * Applied per-route via @UseGuards(JurisdictionGuard) or globally.
 * Implements FR-16: jurisdiction scoping.
 */
@Injectable()
export class JurisdictionGuard implements CanActivate {
  private readonly logger = new Logger(JurisdictionGuard.name);

  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user) {
      // Unauthenticated — let JwtAuthGuard handle it
      return true;
    }

    // Policymaker and Admin see state-level (root)
    if (user.role === 'POLICYMAKER' || user.role === 'ADMIN') {
      return true;
    }

    // Extract the target unitId from route param, query, or body
    const targetUnitId: string | undefined =
      request.params?.unitId ||
      request.query?.unitId ||
      request.body?.unitId;

    if (!targetUnitId) {
      // No unit scoping required for this endpoint
      return true;
    }

    const inScope = await this.isUnitInJurisdiction(
      user.unitId,
      targetUnitId,
    );

    if (!inScope) {
      this.logger.warn(
        `JurisdictionGuard BLOCKED: user ${user.userId} (unit ${user.unitId}) ` +
        `attempted to access unit ${targetUnitId}`,
      );
      throw new ForbiddenException(
        'Access denied: requested unit is outside your jurisdiction',
      );
    }

    return true;
  }

  /**
   * Returns true if `targetUnitId` is a descendant-or-equal of `userUnitId`
   * by walking the unit hierarchy.
   */
  private async isUnitInJurisdiction(
    userUnitId: string,
    targetUnitId: string,
  ): Promise<boolean> {
    if (userUnitId === targetUnitId) return true;

    // Walk ancestors of targetUnitId upward — if we hit userUnitId, it's in scope
    const result = await this.dataSource.query<{ unit_id: string; parent_unit_id: string }[]>(
      `WITH RECURSIVE ancestors AS (
         SELECT unit_id, parent_unit_id
         FROM unit
         WHERE unit_id = $1
         UNION ALL
         SELECT u.unit_id, u.parent_unit_id
         FROM unit u
         INNER JOIN ancestors a ON u.unit_id = a.parent_unit_id
       )
       SELECT unit_id FROM ancestors WHERE unit_id = $2`,
      [targetUnitId, userUnitId],
    );

    return result.length > 0;
  }
}
