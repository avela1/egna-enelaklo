import { Body, Controller, Get, Param, Put, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolePermissionsSchema, type RolePermissionsValues } from '@egna-enelaklo/shared';
import { CurrentUser, RequirePermission } from '../../../common/auth/decorators';
import type { AuthenticatedRequest, Principal } from '../../../common/auth/principal';
import { requestMeta } from '../../../common/http/request-meta';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { StaffRolesService } from './staff-roles.service';

@ApiTags('staff roles')
@Controller('staff/roles')
@RequirePermission('roles.manage')
export class StaffRolesController {
  constructor(private readonly roles: StaffRolesService) {}

  @Get()
  @ApiOperation({ summary: 'Every role with its permission keys' })
  @ApiOkResponse({ description: 'The roles and the full list of permission keys' })
  list() {
    return this.roles.list();
  }

  @Put(':role/permissions')
  @ApiOperation({ summary: 'Replace the permissions of a role' })
  updatePermissions(
    @Param('role') role: string,
    @Body(new ZodValidationPipe(RolePermissionsSchema)) body: RolePermissionsValues,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.roles.updatePermissions(role, body, principal, requestMeta(request));
  }
}
