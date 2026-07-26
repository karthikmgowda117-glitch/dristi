import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { PeopleService } from './people.service';
import { JwtAuthGuard } from '@drishti/auth-guard';
import { CurrentUser, AuditAction } from '@drishti/common';
import { RequestUser } from '@drishti/common';

class CreateAccusedDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() age?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactNumber?: string;
}

class CreateVictimDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() age?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
}

class CreateComplainantDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() occupationId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() religionId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() casteId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() contactNumber?: string;
}

@ApiTags('People')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  // ─── Accused ─────────────────────────────────────────────────────────────
  @Get('cases/:caseId/accused')
  @AuditAction('ACCUSED_LIST', 'ACCUSED')
  @ApiOperation({ summary: 'List accused for a case' })
  getAccused(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.peopleService.getAccused(caseId, user);
  }

  @Post('cases/:caseId/accused')
  @AuditAction('ACCUSED_CREATE', 'ACCUSED')
  @ApiOperation({ summary: 'Add accused to a case. contactNumber added Round 2 (FR-33)' })
  createAccused(
    @Param('caseId') caseId: string,
    @Body() dto: CreateAccusedDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.peopleService.createAccused(caseId, dto, user);
  }

  // ─── Victims ─────────────────────────────────────────────────────────────
  @Get('cases/:caseId/victims')
  @AuditAction('VICTIM_LIST', 'VICTIM')
  @ApiOperation({ summary: 'List victims for a case' })
  getVictims(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.peopleService.getVictims(caseId, user);
  }

  @Post('cases/:caseId/victims')
  @AuditAction('VICTIM_CREATE', 'VICTIM')
  @ApiOperation({ summary: 'Add victim to a case' })
  createVictim(
    @Param('caseId') caseId: string,
    @Body() dto: CreateVictimDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.peopleService.createVictim(caseId, dto, user);
  }

  // ─── Complainant ─────────────────────────────────────────────────────────
  @Get('cases/:caseId/complainant')
  @AuditAction('COMPLAINANT_VIEW', 'COMPLAINANT')
  @ApiOperation({ summary: 'Get complainant detail (PII masked per role)' })
  getComplainant(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.peopleService.getComplainant(caseId, user);
  }

  @Post('cases/:caseId/complainant')
  @AuditAction('COMPLAINANT_CREATE', 'COMPLAINANT')
  @ApiOperation({ summary: 'Add complainant to a case' })
  createComplainant(
    @Param('caseId') caseId: string,
    @Body() dto: CreateComplainantDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.peopleService.createComplainant(caseId, dto, user);
  }

  // ─── Narrative Entities (FR-34, Round 2) ─────────────────────────────────
  @Get('cases/:caseId/narrative-entities')
  @AuditAction('NARRATIVE_ENTITY_VIEW', 'NARRATIVE_ENTITY')
  @ApiOperation({ summary: 'FR-34: Confidence-gated NLP-extracted entities for a case' })
  getNarrativeEntities(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.peopleService.getNarrativeEntities(caseId, user);
  }
}
