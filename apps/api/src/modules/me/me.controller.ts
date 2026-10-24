import { Body, Controller, HttpCode, HttpStatus, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ChangePasswordSchema,
  UpdateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileValues,
} from '@egna-enelaklo/shared';
import { CurrentUser } from '../../common/auth/decorators';
import type { AuthenticatedRequest, Principal } from '../../common/auth/principal';
import { requestMeta } from '../../common/http/request-meta';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { MeService } from './me.service';
import { AuthService } from '../auth/auth.service';

@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly auth: AuthService,
  ) {}

  @Patch()
  @ApiOperation({ summary: 'Update your name, phone number or language' })
  @ApiOkResponse({ description: 'The updated person' })
  async update(
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfileValues,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.me.updateProfile(principal, body, requestMeta(request));

    return { user: await this.auth.publicUser(principal.id) };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change your password' })
  async changePassword(
    @Body(new ZodValidationPipe(ChangePasswordSchema)) body: ChangePasswordInput,
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
  ) {
    const revoked = await this.me.changePassword(
      principal,
      body.currentPassword,
      body.newPassword,
      requestMeta(request),
    );

    return { ok: true, revokedSessions: revoked };
  }
}
