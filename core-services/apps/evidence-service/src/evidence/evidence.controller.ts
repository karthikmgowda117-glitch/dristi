import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
  UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { EvidenceService } from './evidence.service';
import { JwtAuthGuard } from '@drishti/auth-guard';
import { CurrentUser, Roles, AuditAction } from '@drishti/common';
import { RequestUser } from '@drishti/common';

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100MB

@ApiTags('Evidence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  /** POST /api/v1/cases/:caseId/evidence */
  @Post('cases/:caseId/evidence')
  @Roles('INVESTIGATOR', 'SHO', 'ADMIN')
  @AuditAction('EVIDENCE_UPLOAD', 'EVIDENCE')
  @ApiOperation({ summary: 'Upload evidence file — rate limited to 10/min' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('caseId') caseId: string,
    @UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_BYTES })] }))
    file: Express.Multer.File,
    @Body('type') evidenceType: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.evidenceService.upload(
      caseId, file.buffer, file.originalname,
      file.mimetype, evidenceType || 'DOCUMENT', user,
    );
  }

  /** GET /api/v1/cases/:caseId/evidence */
  @Get('cases/:caseId/evidence')
  @AuditAction('EVIDENCE_LIST', 'EVIDENCE')
  @ApiOperation({ summary: 'List evidence with latest integrity status' })
  listByCase(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.evidenceService.listByCase(caseId, user);
  }

  /** GET /api/v1/evidence/:evidenceId */
  @Get('evidence/:evidenceId')
  @AuditAction('EVIDENCE_VIEW', 'EVIDENCE')
  @ApiOperation({ summary: 'Get evidence detail + appends ACCESSED custody entry' })
  findOne(@Param('evidenceId') evidenceId: string, @CurrentUser() user: RequestUser) {
    return this.evidenceService.findOne(evidenceId, user);
  }

  /** GET /api/v1/evidence/:evidenceId/custody */
  @Get('evidence/:evidenceId/custody')
  @AuditAction('CUSTODY_VIEW', 'CHAIN_OF_CUSTODY')
  @ApiOperation({ summary: 'Get ordered chain-of-custody trail' })
  getCustody(@Param('evidenceId') evidenceId: string, @CurrentUser() user: RequestUser) {
    return this.evidenceService.getCustody(evidenceId, user);
  }

  /** GET /api/v1/evidence/:evidenceId/verify */
  @Get('evidence/:evidenceId/verify')
  @AuditAction('EVIDENCE_VERIFY', 'EVIDENCE')
  @ApiOperation({ summary: 'Re-verify integrity by re-hashing from storage, appends custody entry' })
  verify(@Param('evidenceId') evidenceId: string, @CurrentUser() user: RequestUser) {
    return this.evidenceService.verify(evidenceId, user);
  }

  /** POST /api/v1/cases/:caseId/court-package */
  @Post('cases/:caseId/court-package')
  @Roles('ANALYST', 'SUPERVISOR', 'ADMIN')
  @AuditAction('COURT_PACKAGE_GENERATE', 'CASE')
  @ApiOperation({ summary: 'Async court evidence package job' })
  generateCourtPackage(
    @Param('caseId') caseId: string,
    @Body() body: { includeExplainability?: boolean },
    @CurrentUser() user: RequestUser,
  ) {
    return this.evidenceService.generateCourtPackage(caseId, body.includeExplainability ?? true, user);
  }
}
