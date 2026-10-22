import { Injectable } from '@nestjs/common';
import type { TaskPayload } from '@egna-enelaklo/shared';
import type { PrismaService } from '../../common/prisma/prisma.service';

export interface ProhibitedMatch {
  field: string;
  term: string;
}

/**
 * Looks for the items a customer may not ask a tasker to buy or carry.
 *
 * The list is only a warning for the customer and a flag for the staff; it
 * never blocks the request on its own.
 */
@Injectable()
export class ProhibitedService {
  constructor(private readonly prisma: PrismaService) {}

  async check(payload: TaskPayload): Promise<ProhibitedMatch[]> {
    const items = await this.prisma.prohibitedItem.findMany({ where: { active: true } });

    if (items.length === 0) return [];

    const matches: ProhibitedMatch[] = [];

    for (const [key, value] of Object.entries(payload)) {
      if (key === '__meta') continue;

      for (const text of this.collectText(value)) {
        const lowered = text.toLowerCase();

        for (const item of items) {
          if (lowered.includes(item.term.toLowerCase())) {
            matches.push({ field: key, term: item.term });
          }
        }
      }
    }

    return matches;
  }

  private collectText(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap((entry) => this.collectText(entry));

    if (value !== null && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).flatMap((entry) =>
        this.collectText(entry),
      );
    }

    return [];
  }
}
