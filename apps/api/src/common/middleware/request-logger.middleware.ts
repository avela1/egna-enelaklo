import type { NextFunction, Response } from 'express';
import { pinoLogger } from '../logging/pino-logger';
import type { RequestWithId } from './request-id.middleware';

/** Logs one structured line per request with method, path, status and duration. */
export function requestLoggerMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
): void {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    pinoLogger.info(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      },
      'request completed',
    );
  });

  next();
}
