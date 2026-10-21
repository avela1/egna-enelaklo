/**
 * Seed script.
 *
 * Phase 0 has no data model yet, so the seed is intentionally empty. Service
 * catalogue rows, roles and templates are inserted from Phase 1 onwards.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seed: nothing to insert yet (Phase 0).');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
