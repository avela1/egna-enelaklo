import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MeController } from '../me/me.controller';
import { MeService } from '../me/me.service';

@Module({
  controllers: [AuthController, MeController],
  providers: [AuthService, MeService],
  exports: [AuthService],
})
export class AuthModule {}
