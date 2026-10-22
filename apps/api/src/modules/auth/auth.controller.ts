import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  AcceptInviteSchema,
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  type LoginValues,
  type RegisterValues,
  type ResetPasswordInput,
} from '@egna-enelaklo/shared';
import type { CsrfService } from '../../common/csrf/csrf.service';
import { CurrentUser, Public } from '../../common/auth/decorators';
import type { AuthenticatedRequest, Principal } from '../../common/auth/principal';
import { requestMeta } from '../../common/http/request-meta';
import { clearSessionCookie, setSessionCookie } from '../../common/http/session-cookie';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly csrf: CsrfService,
  ) {}

  @Public()
  @Get('csrf')
  @ApiOperation({ summary: 'Issue a CSRF token for state changing requests' })
  @ApiOkResponse({ description: 'The token is also written to the egna_csrf cookie' })
  issueCsrf(@Res({ passthrough: true }) response: Response): { csrfToken: string } {
    return { csrfToken: this.csrf.issue(response) };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer account' })
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: RegisterValues,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(body, requestMeta(request));
    setSessionCookie(response, result.token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    return { user: result.user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in and start a session' })
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginValues,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(body, requestMeta(request), request.sessionId);
    setSessionCookie(response, result.token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out of this device' })
  async logout(
    @CurrentUser() principal: Principal,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(principal);
    clearSessionCookie(response);

    return { ok: true };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out of every device' })
  async logoutAll(
    @CurrentUser() principal: Principal,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const revoked = await this.auth.logoutAll(principal, requestMeta(request));
    clearSessionCookie(response);

    return { ok: true, revokedSessions: revoked };
  }

  @Get('me')
  @ApiOperation({ summary: 'The signed in person' })
  async me(@CurrentUser() principal: Principal) {
    return { user: await this.auth.publicUser(principal.id) };
  }

  @Public()
  @Post('forgot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask for a password reset link' })
  async forgot(@Body(new ZodValidationPipe(ForgotPasswordSchema)) body: { email: string }) {
    await this.auth.forgot(body.email);

    return { ok: true };
  }

  @Public()
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password with a reset token' })
  async reset(
    @Body(new ZodValidationPipe(ResetPasswordSchema)) body: ResetPasswordInput,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.auth.reset(body, requestMeta(request));

    return { ok: true };
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a staff invitation and set the password' })
  async acceptInvite(
    @Body(new ZodValidationPipe(AcceptInviteSchema)) body: { password: string; token: string },
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.acceptInvite(body.token, body.password, requestMeta(request));
    setSessionCookie(response, result.token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    return { user: result.user };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm an email address' })
  async verifyEmail(
    @Body(new ZodValidationPipe(VerifyEmailSchema)) body: { token: string },
    @Req() request: AuthenticatedRequest,
  ) {
    await this.auth.verifyEmail(body.token, requestMeta(request));

    return { ok: true };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send the verification email again' })
  async resendVerification(
    @Body(new ZodValidationPipe(ResendVerificationSchema)) body: { email: string },
  ) {
    await this.auth.resendVerification(body.email);

    return { ok: true };
  }
}
