import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { RequestUser } from '../types';

/** Extract the authenticated user from the request */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as RequestUser;
  },
);

/** Metadata key for audit action */
export const AUDIT_ACTION_KEY = 'audit_action';

/**
 * Annotate a controller method with the audit action name.
 * The AuditInterceptor picks this up for the audit log.
 *
 * @example
 * @AuditAction('CASE_VIEW')
 * findOne(...) {}
 */
export const AuditAction = (action: string, entityType?: string) =>
  SetMetadata(AUDIT_ACTION_KEY, { action, entityType });

/** Mark a route as public (skips JWT guard) */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Roles decorator */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
