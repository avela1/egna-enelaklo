import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CancelTaskSchema,
  CreateTaskSchema,
  TaskQuerySchema,
  UpdateTaskSchema,
  type CancelTaskValues,
  type CreateTaskValues,
  type TaskQuery,
  type UpdateTaskValues,
} from '@egna-enelaklo/shared';
import { CurrentUser } from '../../common/auth/decorators';
import type { Principal } from '../../common/auth/principal';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Start a draft task for a service' })
  create(
    @Body(new ZodValidationPipe(CreateTaskSchema)) body: CreateTaskValues,
    @CurrentUser() principal: Principal,
  ) {
    return this.tasks.createDraft(principal.id, body.serviceKey);
  }

  @Get()
  @ApiOperation({ summary: 'The tasks of the signed in customer' })
  @ApiOkResponse({ description: 'A paginated list of tasks' })
  list(
    @Query(new ZodValidationPipe(TaskQuerySchema)) query: TaskQuery,
    @CurrentUser() principal: Principal,
  ) {
    return this.tasks.list(principal.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One task with its template, payload and history' })
  detail(@Param('id') id: string, @CurrentUser() principal: Principal) {
    return this.tasks.detail(principal.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Autosave a draft' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema)) body: UpdateTaskValues,
    @CurrentUser() principal: Principal,
  ) {
    return this.tasks.updateDraft(principal.id, id, body.payload);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate and submit a draft' })
  submit(@Param('id') id: string, @CurrentUser() principal: Principal) {
    return this.tasks.submit(principal.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a draft or a submitted task' })
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CancelTaskSchema)) body: CancelTaskValues,
    @CurrentUser() principal: Principal,
  ) {
    return this.tasks.cancel(principal.id, id, body.reason);
  }
}
