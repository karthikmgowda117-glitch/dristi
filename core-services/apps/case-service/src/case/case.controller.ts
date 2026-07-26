import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseService } from './case.service';
import { CreateCaseDto, UpdateCaseDto, CaseQueryDto } from './dto/case.dto';
import { JwtAuthGuard } from '@drishti/auth-guard';
import { CurrentUser, AuditAction, Roles } from '@drishti/common';
import { RequestUser } from '@drishti/common';

class AddActSectionDto {
  @ApiProperty() actId: number;
  @ApiProperty() sectionId: number;
}

@ApiTags('Cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases')
export class CaseController {
  constructor(private readonly caseService: CaseService) {}

  /** GET /api/v1/cases */
  @Get()
  @AuditAction('CASE_LIST')
  @ApiOperation({ summary: 'List cases filtered by jurisdiction (auto-scoped to caller)' })
  findAll(@Query() query: CaseQueryDto, @CurrentUser() user: RequestUser) {
    return this.caseService.findAll(query, user);
  }

  /** GET /api/v1/cases/:caseId */
  @Get(':caseId')
  @AuditAction('CASE_VIEW', 'CASE')
  @ApiOperation({ summary: 'Get full case detail' })
  @ApiResponse({ status: 403, description: 'Out of jurisdiction' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  findOne(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.caseService.findOne(caseId, user);
  }

  /** POST /api/v1/cases */
  @Post()
  @Roles('SHO', 'ADMIN')
  @AuditAction('CASE_CREATE', 'CASE')
  @ApiOperation({ summary: 'Register a new FIR/Case (SHO or Admin only)' })
  @ApiResponse({ status: 201, description: 'Case created' })
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: RequestUser) {
    return this.caseService.create(dto, user);
  }

  /** PATCH /api/v1/cases/:caseId */
  @Patch(':caseId')
  @AuditAction('CASE_UPDATE', 'CASE')
  @ApiOperation({ summary: 'Update case status, assigned officer, or narrative' })
  @ApiResponse({ status: 409, description: 'Invalid status transition' })
  update(
    @Param('caseId') caseId: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.caseService.update(caseId, dto, user);
  }

  /** GET /api/v1/cases/:caseId/timeline */
  @Get(':caseId/timeline')
  @AuditAction('CASE_TIMELINE_VIEW', 'CASE')
  @ApiOperation({ summary: 'Get ordered case timeline events' })
  getTimeline(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.caseService.getTimeline(caseId, user);
  }

  /** GET /api/v1/cases/:caseId/intake-assist — Round 2 (FR-32) */
  @Get(':caseId/intake-assist')
  @AuditAction('INTAKE_ASSIST_VIEW', 'CASE')
  @ApiOperation({ summary: 'FR-32: Proactive intake assist — similarity + act/section suggestions' })
  @ApiResponse({ status: 202, description: 'Still assembling — poll or await notification' })
  getIntakeAssist(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.caseService.getIntakeAssist(caseId, user);
  }

  /** GET /api/v1/cases/:caseId/profile — Round 2 (FR-36) */
  @Get(':caseId/profile')
  @AuditAction('CASE_PROFILE_VIEW', 'CASE')
  @ApiOperation({ summary: 'FR-36: Person/Case Intelligence Profile — aggregated view' })
  getCaseProfile(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.caseService.getCaseProfile(caseId, user);
  }

  /** GET /api/v1/acts */
  @Get('/acts/list')
  @ApiOperation({ summary: 'List all acts' })
  getActs() {
    return this.caseService.getActs();
  }

  /** GET /api/v1/acts/:actId/sections */
  @Get('/acts/:actId/sections')
  @ApiOperation({ summary: 'List sections for an act' })
  getSections(@Param('actId') actId: string) {
    return this.caseService.getSections(parseInt(actId));
  }

  /** POST /api/v1/cases/:caseId/act-sections */
  @Post(':caseId/act-sections')
  @AuditAction('ACT_SECTION_ADD', 'CASE')
  @ApiOperation({ summary: 'Associate an Act/Section with a case' })
  @ApiResponse({ status: 409, description: 'Section already associated' })
  addActSection(
    @Param('caseId') caseId: string,
    @Body() dto: AddActSectionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.caseService.addActSection(caseId, dto.actId, dto.sectionId, user);
  }
}
