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
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RoleName } from '@prisma/client';
import {
  ChangeUserRoleSchema,
  InviteUserSchema,
  StaffUserQuerySchema,
  type InviteUserValues,
  type StaffUserQuery,
} from '@egna-enelaklo/shared';
import { CurrentUser, RequirePermission } from '../../../common/auth/decorators';
import type { AuthenticatedRequest, Principal } from '../../../common/auth/principal';
import { requestMeta } from '../../../common/http/request-meta';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { StaffUsersService } from './staff-users.service';

@ApiTags('staff users')
@Controller('staff/users')
@RequirePermission('users.manage')
export class StaffUsersController {
  constructor(private readonly users: StaffUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List the people who can sign in' })
  @ApiOkResponse({ description: 'A paginated list of users' })
  list(@Query(new ZodValidationPipe(StaffUserQuerySchema)) query: StaffUserQuery) {
    return this.users.list(query);
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a staff user' })
  invite(
    @Body(new ZodValidationPipe(InviteUserSchema)) body: InviteUserValues,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.users.invite(body, principal, requestMeta(request));
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change the role of a staff user' })
  changeRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ChangeUserRoleSchema)) body: { role: RoleName },
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.users.changeRole(id, body.role, principal, requestMeta(request));
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable an account' })
  disable(
    @Param('id') id: string,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.users.disable(id, principal, requestMeta(request));
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable an account' })
  enable(
    @Param('id') id: string,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.users.enable(id, principal, requestMeta(request));
  }
}
