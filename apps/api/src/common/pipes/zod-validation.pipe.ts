import { BadRequestException, type ArgumentMetadata, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { VALIDATION_MESSAGES } from '@egna-enelaklo/shared';

export interface ZodIssue {
  path: string;
  message: string;
  code: string;
}

/**
 * Validates a request body, query or param with a Zod schema.
 *
 * The schemas live in `@egna-enelaklo/shared` so that the web app validates
 * with exactly the same rules. The messages are i18n keys; the API resolves
 * them to English text and the web app translates them.
 */
export class ZodValidationPipe implements PipeTransform<unknown, unknown> {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const details: ZodIssue[] = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: resolveMessage(issue.message),
        code: issue.code,
      }));

      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details,
      });
    }

    return result.data;
  }
}

/** Turns an i18n key into English text, falling back to the raw message. */
function resolveMessage(message: string): string {
  if (message in VALIDATION_MESSAGES) {
    return VALIDATION_MESSAGES[message as keyof typeof VALIDATION_MESSAGES];
  }

  return message;
}
