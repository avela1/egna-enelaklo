import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { pinoLogger } from '../logging/pino-logger';
import type { RequestWithId } from '../middleware/request-id.middleware';

export interface ApiErrorBody {
  code: string;
  details: unknown;
  message: string;
  requestId: string;
}

const DEFAULT_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_FAILED',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
  [HttpStatus.NOT_IMPLEMENTED]: 'NOT_IMPLEMENTED',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

/**
 * Converts every thrown error into the same envelope:
 * `{ code, message, details, requestId }`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithId>();
    const requestId = request.requestId ?? 'unknown';

    const { status, code, message, details } = this.describe(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      pinoLogger.error({ requestId, code, message, exception }, 'request failed');
    } else {
      pinoLogger.warn({ requestId, code, message, status }, 'request rejected');
    }

    const body: ApiErrorBody = { code, message, details: details ?? null, requestId };
    response.status(status).json(body);
  }

  private describe(exception: unknown): {
    code: string;
    details: unknown;
    message: string;
    status: number;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return {
          status,
          code: DEFAULT_CODES[status] ?? 'HTTP_ERROR',
          message: payload,
          details: null,
        };
      }

      const body = payload as Record<string, unknown>;
      const rawMessage = body.message;

      return {
        status,
        code: typeof body.code === 'string' ? body.code : (DEFAULT_CODES[status] ?? 'HTTP_ERROR'),
        message: Array.isArray(rawMessage)
          ? 'Validation failed'
          : String(rawMessage ?? exception.message),
        details: body.details ?? (Array.isArray(rawMessage) ? rawMessage : null),
      };
    }

    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: exception.issues,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: null,
    };
  }
}
