import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitService } from './unit.service';
import { JwtAuthGuard } from '@drishti/auth-guard';
import { CurrentUser, Roles, AuditAction } from '@drishti/common';
import { RequestUser } from '@drishti/common';

class CreateUnitDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentUnitId?: string;
  @ApiProperty() @IsString() unitName: string;
  @ApiProperty() @IsEnum(['STATE','DISTRICT','SUBDIVISION','STATION']) unitType: string;
}

class UpdateUnitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() unitName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(['STATE','DISTRICT','SUBDIVISION','STATION']) unitType?: string;
}

@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  /** GET /api/v1/units/tree */
  @Get('tree')
  @ApiOperation({ summary: 'Get jurisdiction tree scoped to caller — FR-01 drill-down' })
  getTree(@Query('rootUnitId') rootUnitId: string, @CurrentUser() user: RequestUser) {
    return this.unitService.getTree(rootUnitId, user);
  }

  /** GET /api/v1/units/:unitId */
  @Get(':unitId')
  @AuditAction('UNIT_VIEW', 'UNIT')
  @ApiOperation({ summary: 'Get unit detail' })
  findOne(@Param('unitId') unitId: string, @CurrentUser() user: RequestUser) {
    return this.unitService.findOne(unitId, user);
  }

  /** POST /api/v1/units */
  @Post()
  @Roles('ADMIN')
  @AuditAction('UNIT_CREATE', 'UNIT')
  @ApiOperation({ summary: 'Create a new unit (Admin only)' })
  create(@Body() dto: CreateUnitDto, @CurrentUser() user: RequestUser) {
    return this.unitService.create(dto, user);
  }

  /** PATCH /api/v1/units/:unitId */
  @Patch(':unitId')
  @Roles('ADMIN')
  @AuditAction('UNIT_UPDATE', 'UNIT')
  @ApiOperation({ summary: 'Update unit fields (Admin only)' })
  update(@Param('unitId') unitId: string, @Body() dto: UpdateUnitDto) {
    return this.unitService.update(unitId, dto);
  }
}
