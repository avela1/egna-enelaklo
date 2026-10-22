import { Module } from '@nestjs/common';
import { StaffAuditController } from './audit/staff-audit.controller';
import { StaffAuditService } from './audit/staff-audit.service';
import { StaffRolesController } from './roles/staff-roles.controller';
import { StaffRolesService } from './roles/staff-roles.service';
import { StaffTasksController } from './staff-tasks.controller';
import { StaffUsersController } from './users/staff-users.controller';
import { StaffUsersService } from './users/staff-users.service';

@Module({
  controllers: [
    StaffUsersController,
    StaffRolesController,
    StaffAuditController,
    StaffTasksController,
  ],
  providers: [StaffUsersService, StaffRolesService, StaffAuditService],
})
export class StaffModule {}
