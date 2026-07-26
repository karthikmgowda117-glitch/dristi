import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '@drishti/auth-guard';
import { CurrentUser, Roles, AuditAction } from '@drishti/common';
import { RequestUser } from '@drishti/common';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @AuditAction('ADMIN_USERS_LIST', 'USER')
  @ApiOperation({ summary: 'List all users (Admin only)' })
  listUsers(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('unitId') unitId?: string,
    @Query('roleId') roleId?: string,
  ) {
    return this.adminService.listUsers({ page: +page, pageSize: +pageSize, unitId, roleId });
  }

  @Post('users')
  @AuditAction('ADMIN_USER_CREATE', 'USER')
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  createUser(@Body() dto: { username: string; unitId: string; roleId: number; languagePref?: string }) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:userId')
  @AuditAction('ADMIN_USER_UPDATE', 'USER')
  @ApiOperation({ summary: 'Update user role, unit, or active status (Admin only)' })
  updateUser(
    @Param('userId') userId: string,
    @Body() dto: { roleId?: number; unitId?: string; isActive?: boolean },
  ) {
    return this.adminService.updateUser(userId, dto);
  }

  @Get('system-health')
  @ApiOperation({ summary: 'System health status (Admin only)' })
  getHealth() {
    return this.adminService.getSystemHealth();
  }
}
