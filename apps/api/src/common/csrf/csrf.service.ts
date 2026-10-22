import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { isProduction } from '../../config/env';
import { CSRF_COOKIE } from '../http/cookies';

/**
 * Double submit CSRF token.
 *
 * The token is written to a readable cookie and has to be sent back in the
 * `X-CSRF-Token` header. A request from another origin can not read the
 * cookie, so it can not produce a matching header.
 */
@Injectable()
export class CsrfService {
  issue(response: Response): string {
    const token = randomBytes(32).toString('base64url');

    response.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 12 * 60 * 60 * 1000,
    });

    return token;
  }
}
