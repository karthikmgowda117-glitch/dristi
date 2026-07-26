import { IsString, IsUUID, IsOptional, IsNumber, IsDateString, IsEnum, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export type CaseStatus = 'REGISTERED' | 'UNDER_INVESTIGATION' | 'EVIDENCE_COLLECTION' | 'CHARGESHEET_PREP' | 'CLOSED';

const STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  REGISTERED:          ['UNDER_INVESTIGATION'],
  UNDER_INVESTIGATION: ['EVIDENCE_COLLECTION', 'CLOSED'],
  EVIDENCE_COLLECTION: ['CHARGESHEET_PREP'],
  CHARGESHEET_PREP:    ['CLOSED'],
  CLOSED:              [],
};

export function isValidTransition(from: CaseStatus, to: CaseStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export class CreateCaseDto {
  @ApiProperty()
  @IsUUID()
  unitId: string;

  @ApiProperty()
  @IsNumber()
  crimeMajorHeadId: number;

  @ApiProperty()
  @IsNumber()
  crimeMinorHeadId: number;

  @ApiProperty()
  @IsString()
  firNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @ApiProperty()
  @IsDateString()
  incidentFromDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  incidentToDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narrative?: string;
}

export class UpdateCaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['REGISTERED','UNDER_INVESTIGATION','EVIDENCE_COLLECTION','CHARGESHEET_PREP','CLOSED'])
  status?: CaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedOfficerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narrative?: string;
}

export class CaseQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  crimeMajorHeadId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 20;
}
