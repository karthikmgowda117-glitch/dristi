import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '@drishti/auth-guard';
import { CurrentUser, AuditAction } from '@drishti/common';
import { RequestUser } from '@drishti/common';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('cases/:caseId/tasks')
  @ApiOperation({ summary: 'FR-39: List tasks for a case' })
  listTasks(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.taskService.listTasks(caseId, user);
  }

  @Post('cases/:caseId/tasks')
  @AuditAction('TASK_CREATE', 'TASK')
  @ApiOperation({ summary: 'FR-39: Create a task for a case' })
  createTask(
    @Param('caseId') caseId: string,
    @Body() dto: { description: string; dueDate?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.taskService.createTask(caseId, dto, user);
  }

  @Patch('tasks/:taskId')
  @AuditAction('TASK_UPDATE', 'TASK')
  @ApiOperation({ summary: 'FR-39: Update task status' })
  updateTask(
    @Param('taskId') taskId: string,
    @Body() dto: { status: 'OPEN' | 'IN_PROGRESS' | 'DONE' },
    @CurrentUser() user: RequestUser,
  ) {
    return this.taskService.updateTask(taskId, dto.status, user);
  }
}
