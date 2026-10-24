import type { PrismaClient } from '@prisma/client';
import { type RoleName } from '@prisma/client';
import {
  PERMISSION_DESCRIPTIONS,
  PERMISSION_KEYS,
  ROLE_PERMISSION_DEFAULTS,
} from '@egna-enelaklo/shared';
import { SEED_PROHIBITED_ITEMS, SEED_SERVICES } from './seed-templates';

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  CUSTOMER: 'Customers book and track their own errands',
  TASKER: 'Taskers run the errands they are assigned',
  OPERATIONS: 'Operations staff review tasks, quote them and assign taskers',
  FINANCE: 'Finance staff handle payments, refunds and reconciliation',
  ADMIN: 'Administrators manage users, roles and the platform settings',
};

/** Creates or updates the roles, the permissions and the default mapping. */
export async function seedRolesAndPermissions(prisma: PrismaClient): Promise<void> {
  for (const [name, description] of Object.entries(ROLE_DESCRIPTIONS)) {
    await prisma.role.upsert({
      where: { name: name as RoleName },
      update: { description },
      create: { name: name as RoleName, description },
    });
  }

  for (const key of PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      update: { description: PERMISSION_DESCRIPTIONS[key] },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] },
    });
  }

  for (const [role, permissions] of Object.entries(ROLE_PERMISSION_DEFAULTS)) {
    const wanted = [...permissions];

    // Remove the permissions that are not part of the default any more, keep
    // the ones an administrator changed on purpose.
    await prisma.rolePermission.deleteMany({
      where: {
        roleName: role as RoleName,
        ...(wanted.length > 0 ? { permissionKey: { notIn: wanted } } : {}),
      },
    });

    if (wanted.length > 0) {
      await prisma.rolePermission.createMany({
        data: wanted.map((permissionKey) => ({ roleName: role as RoleName, permissionKey })),
        skipDuplicates: true,
      });
    }
  }
}

/** Sorts object keys recursively so two JSON shapes compare equal. */
function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJson);

  if (value !== null && typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      output[key] = sortedJson((value as Record<string, unknown>)[key]);
    }

    return output;
  }

  return value;
}

/** Creates the catalogue: the services and their live first version. */
export async function seedCatalogue(prisma: PrismaClient): Promise<void> {
  for (const service of SEED_SERVICES) {
    const saved = await prisma.service.upsert({
      where: { key: service.key },
      update: {
        name: service.name as never,
        description: service.description as never,
        icon: service.icon,
        sortOrder: service.sortOrder,
        status: 'LIVE',
      },
      create: {
        key: service.key,
        name: service.name as never,
        description: service.description as never,
        icon: service.icon,
        sortOrder: service.sortOrder,
        status: 'LIVE',
      },
    });

    const live = await prisma.serviceTemplate.findFirst({
      where: { serviceId: saved.id, status: 'LIVE' },
    });

    if (live) {
      const unchanged =
        JSON.stringify(sortedJson(live.definition)) ===
        JSON.stringify(sortedJson(service.template));

      if (unchanged) {
        // The live version is never overwritten: a task keeps its version.
        await prisma.serviceTemplate.updateMany({
          where: { serviceId: saved.id, status: 'DRAFT' },
          data: { status: 'ARCHIVED' },
        });

        continue;
      }

      // The definition changed: archive the old live version and publish a
      // new one. Existing tasks keep pointing at their own version.
      const highest = await prisma.serviceTemplate.aggregate({
        where: { serviceId: saved.id },
        _max: { version: true },
      });

      await prisma.serviceTemplate.updateMany({
        where: { serviceId: saved.id, status: 'LIVE' },
        data: { status: 'ARCHIVED' },
      });

      await prisma.serviceTemplate.create({
        data: {
          serviceId: saved.id,
          version: (highest._max.version ?? 0) + 1,
          status: 'LIVE',
          definition: service.template as never,
          publishedAt: new Date(),
        },
      });

      continue;
    }

    await prisma.serviceTemplate.create({
      data: {
        serviceId: saved.id,
        version: 1,
        status: 'LIVE',
        definition: service.template as never,
        publishedAt: new Date(),
      },
    });
  }
}

/** The example prohibited list. PENDING LEGAL REVIEW. */
export async function seedProhibitedItems(prisma: PrismaClient): Promise<void> {
  for (const item of SEED_PROHIBITED_ITEMS) {
    await prisma.prohibitedItem.upsert({
      where: { term: item.term },
      update: { note: item.note, active: true },
      create: { term: item.term, note: item.note, active: true },
    });
  }
}
