import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PermissionsGuard } from './common/auth/permissions.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { SessionGuard } from './common/auth/session.guard';
import { CommonModule } from './common/common.module';
import { CsrfGuard } from './common/csrf/csrf.guard';
import { rateLimitFor, RATE_LIMIT_TTL } from './common/http/rate-limit';
import { MailModule } from './common/mail/mail.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.module';
import { StaffModule } from './modules/staff/staff.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PinoLogger } from './common/logging/pino-logger';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, expandVariables: true }),

    // Rate limiting: a strict limit on the /auth routes and a general one
    // for everything else, both per IP and per minute.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: RATE_LIMIT_TTL, limit: (context) => rateLimitFor(context) },
    ]),

    PrismaModule,
    MailModule,
    CommonModule,
    AuthModule,
    StaffModule,
    HealthModule,
    CatalogModule,
    AddressesModule,
    TasksModule,
    UploadsModule,
  ],
  providers: [
    PinoLogger,
    // The order of the guards is the order they run in.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
  exports: [PinoLogger],
})
export class AppModule {}
