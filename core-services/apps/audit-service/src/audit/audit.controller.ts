import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditReadService } from './audit-read.service';
import { JwtAuthGuard } from '@drishti/auth-guard';
import { CurrentUser, Roles } from '@drishti/common';
import { RequestUser } from '@drishti/common';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('ADMIN', 'SUPERVISOR')
@Controller('admin/audit-log')
export class AuditController {
  constructor(private readonly auditService: AuditReadService) {}

  @Get()
  @ApiOperation({ summary: 'Query the append-only audit log (Admin/Supervisor only)' })
  findAll(
    @Query('actorUserId') actorUserId: string,
    @Query('entityType')  entityType: string,
    @Query('dateFrom')    dateFrom: string,
    @Query('dateTo')      dateTo: string,
    @Query('page')        page = 1,
    @Query('pageSize')    pageSize = 20,
    @CurrentUser()        user: RequestUser,
  ) {
    return this.auditService.findAll({ actorUserId, entityType, dateFrom, dateTo, page: +page, pageSize: +pageSize }, user);
  }
}
