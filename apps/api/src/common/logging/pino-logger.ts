import { Injectable, type LoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';
import { env } from '../../config/env';

/** The application wide pino instance. */
export const pinoLogger: Logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'egna-enelaklo-api', env: env.NODE_ENV },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    censor: '[redacted]',
  },
});

/** Bridges the NestJS logger interface onto pino. */
@Injectable()
export class PinoLogger implements LoggerService {
  private readonly logger = pinoLogger.child({ scope: 'nest' });

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.info(this.serialize(message, optionalParams));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.error(this.serialize(message, optionalParams));
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.warn(this.serialize(message, optionalParams));
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug(this.serialize(message, optionalParams));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.trace(this.serialize(message, optionalParams));
  }

  private serialize(message: unknown, optionalParams: unknown[]): Record<string, unknown> {
    if (optionalParams.length === 0) {
      return { message: message instanceof Error ? message.message : String(message) };
    }

    return {
      message: message instanceof Error ? message.message : String(message),
      context: optionalParams.map((param) =>
        param instanceof Error ? { name: param.name, message: param.message } : param,
      ),
    };
  }
}
