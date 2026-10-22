import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit/audit.service';
import { CsrfService } from './csrf/csrf.service';
import { PasswordService } from './services/password.service';
import { SessionService } from './services/session.service';
import { UsersService } from './services/users.service';

/** Services that are used by the guards, the interceptor and the controllers. */
@Global()
@Module({
  providers: [AuditService, CsrfService, PasswordService, SessionService, UsersService],
  exports: [AuditService, CsrfService, PasswordService, SessionService, UsersService],
})
export class CommonModule {}
