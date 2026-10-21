import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { PinoLogger } from './common/logging/pino-logger';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, expandVariables: true }),
    PrismaModule,
    HealthModule,
  ],
  providers: [PinoLogger],
  exports: [PinoLogger],
})
export class AppModule {}
