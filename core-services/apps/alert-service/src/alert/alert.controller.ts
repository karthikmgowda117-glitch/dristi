import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AlertService } from './alert.service';
import { JwtAuthGuard } from '@drishti/auth-guard';
import { CurrentUser, AuditAction, Roles } from '@drishti/common';
import { RequestUser } from '@drishti/common';

class UpdateAlertDto {
  @IsEnum(['OPEN','ESCALATED','DISMISSED']) status: string;
  @IsOptional() @IsString() dismissReason?: string;
}

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get()
  @AuditAction('ALERT_LIST', 'ALERT')
  @ApiOperation({ summary: 'List alerts for caller jurisdiction (severity/status filters)' })
  findAll(
    @Query('unitId') unitId: string,
    @Query('severity') severity: string,
    @Query('status') status: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @CurrentUser() user: RequestUser,
  ) {
    return this.alertService.findAll({ unitId, severity, status, page: +page, pageSize: +pageSize }, user);
  }

  @Get(':alertId')
  @AuditAction('ALERT_VIEW', 'ALERT')
  @ApiOperation({ summary: 'Get alert detail + traceId for explainability' })
  findOne(@Param('alertId') alertId: string, @CurrentUser() user: RequestUser) {
    return this.alertService.findOne(alertId, user);
  }

  @Patch(':alertId')
  @Roles('ANALYST', 'SUPERVISOR', 'ADMIN')
  @AuditAction('ALERT_UPDATE', 'ALERT')
  @ApiOperation({ summary: 'Dismiss or escalate alert (requires dismissReason if dismissing)' })
  update(
    @Param('alertId') alertId: string,
    @Body() dto: UpdateAlertDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.alertService.update(alertId, dto, user);
  }
}
