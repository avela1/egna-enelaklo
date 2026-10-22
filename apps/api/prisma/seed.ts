/**
 * Development seed.
 *
 * Creates the roles, the permissions, the default permission mapping, the
 * service catalogue with its three live templates, the example prohibited
 * list, the addresses of the seeded customer and four sample tasks.
 *
 * The password comes from the SEED_PASSWORD environment variable and is never
 * written down in the source. The seed refuses to run in production.
 */
import { PrismaClient, type RoleName } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  buildZodSchema,
  canTransition,
  extractMappedValues,
  TaskStatus,
  toWirePayload,
  type TaskPayload,
  type TemplateDefinition,
} from '@egna-enelaklo/shared';
import { seedCatalogue, seedProhibitedItems, seedRolesAndPermissions } from './seed-data';
import { SEED_SERVICES } from './seed-templates';

const prisma = new PrismaClient();

const SEED_USERS: { email: string; name: string; role: RoleName }[] = [
  { email: 'admin@egna.test', name: 'Admin Test', role: 'ADMIN' },
  { email: 'ops@egna.test', name: 'Operations Test', role: 'OPERATIONS' },
  { email: 'finance@egna.test', name: 'Finance Test', role: 'FINANCE' },
  { email: 'tasker@egna.test', name: 'Tasker Test', role: 'TASKER' },
  { email: 'customer@egna.test', name: 'Customer Test', role: 'CUSTOMER' },
];

const SEED_ADDRESSES = [
  {
    contactName: 'Customer Test',
    contactPhone: '+251911000001',
    directions: 'The blue gate next to the coffee place',
    isDefault: true,
    label: 'Home',
    landmark: 'Bole Road, near Friendship',
    subCity: 'BOLE' as const,
    woreda: 'Bole',
  },
  {
    contactName: 'Customer Test',
    contactPhone: '+251911000001',
    directions: 'Third floor, the reception desk',
    isDefault: false,
    label: 'Office',
    landmark: 'Kirkos, close to the hospital',
    subCity: 'KIRKOS' as const,
    woreda: 'Kirkos',
  },
];

async function seedUsers(password: string): Promise<Record<string, string>> {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const ids: Record<string, string> = {};

  for (const seed of SEED_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: seed.email } });

    if (!existing) {
      const created = await prisma.user.create({
        data: {
          email: seed.email,
          name: seed.name,
          passwordHash,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          roles: { create: { roleName: seed.role, isPrimary: true } },
        },
      });

      ids[seed.email] = created.id;
      continue;
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: seed.name,
        passwordHash,
        status: 'ACTIVE',
        // The seeded account is always usable, even after a lockout.
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    await prisma.userRole.deleteMany({ where: { userId: existing.id } });
    await prisma.userRole.create({
      data: { userId: existing.id, roleName: seed.role, isPrimary: true },
    });

    ids[seed.email] = existing.id;
  }

  return ids;
}

async function seedAddresses(customerId: string): Promise<string[]> {
  const ids: string[] = [];

  for (const address of SEED_ADDRESSES) {
    const existing = await prisma.address.findFirst({
      where: { userId: customerId, label: address.label, deletedAt: null },
    });

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const created = await prisma.address.create({ data: { userId: customerId, ...address } });
    ids.push(created.id);
  }

  return ids;
}

/**
 * Creates the sample tasks. The status changes go through the same rules the
 * TaskStateMachine uses, and every change leaves a history row.
 */
async function seedTasks(customerId: string, addressIds: string[]): Promise<void> {
  const existing = await prisma.task.count({ where: { customerId } });
  if (existing > 0) return;

  const home = addressIds[0];
  const office = addressIds[1];

  if (!home || !office) return;

  const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const samples: {
    key: string;
    payload: TaskPayload;
    status: TaskStatus;
  }[] = [
    {
      key: 'buy_and_deliver',
      status: TaskStatus.DRAFT,
      payload: {
        items: [{ name: '2 kg rice', quantity: 1, notes: '' }],
      },
    },
    {
      key: 'buy_and_deliver',
      status: TaskStatus.SUBMITTED,
      payload: {
        items: [
          { name: '2 kg rice', quantity: 1, notes: 'Any brand' },
          { name: '1 L cooking oil', quantity: 2, notes: '' },
        ],
        budget: 1200,
        preferredShop: 'Bole Mall',
        allowOtherShop: true,
        deliveryAddress: home,
        contactPhone: '+251911000001',
        neededBy: inDays(2),
        notes: 'Please call when you arrive.',
      },
    },
    {
      key: 'queue_and_paperwork',
      status: TaskStatus.SUBMITTED,
      payload: {
        officeType: 'KEBELE',
        officeName: 'Kirkos sub city office',
        officeSubCity: 'KIRKOS',
        procedure: 'Collect the trade licence renewal receipt.',
        documents: [{ documentName: 'Trade licence receipt', details: 'From the tax office' }],
        authorizationNeeded: 'NO',
        feesBudget: 500,
        contactPhone: '+251911000001',
        preferredDate: inDays(3).slice(0, 10),
        notes: '',
      },
    },
    {
      key: 'pickup_and_dropoff',
      status: TaskStatus.CANCELLED,
      payload: {
        pickupAddress: home,
        pickupContactName: 'Customer Test',
        pickupContactPhone: '+251911000001',
        dropoffAddress: office,
        dropoffContactName: 'Customer Test',
        dropoffContactPhone: '+251911000001',
        itemType: 'DOCUMENT',
        itemDescription: 'A sealed envelope with a contract.',
        packageSize: 'BAG',
        declaredValue: 500,
        readyBy: inDays(1),
        notes: '',
      },
    },
  ];

  for (const sample of samples) {
    const service = await prisma.service.findUnique({
      where: { key: sample.key },
      include: { templates: { where: { status: 'LIVE' }, orderBy: { version: 'desc' } } },
    });

    const template = service?.templates[0];
    if (!service || !template) continue;

    const definition = template.definition as unknown as TemplateDefinition;
    const answers = { ...sample.payload };

    let budgetCapSantim: number | undefined;
    let deadlineAt: Date | undefined;
    let pickupAddressId: string | undefined;
    let deliveryAddressId: string | undefined;

    if (sample.status !== TaskStatus.DRAFT) {
      // The answers are written the way the form holds them (money in birr)
      // and converted to the wire format before they are validated.
      const wire = toWirePayload(definition, sample.payload);
      const result = buildZodSchema(definition).safeParse(wire);
      if (!result.success) {
        console.warn(
          `  the sample task for ${sample.key} does not validate yet: ${result.error.issues
            .map((issue) => `${issue.path.join('.')} ${issue.message}`)
            .join(', ')}`,
        );
        continue;
      }

      const mapped = extractMappedValues(definition, result.data as TaskPayload);
      budgetCapSantim = mapped.budgetCapSantim;
      deadlineAt = mapped.deadlineAt;
      pickupAddressId = mapped.pickupAddressId;
      deliveryAddressId = mapped.deliveryAddressId;
    }

    const delivery = deliveryAddressId
      ? await prisma.address.findUnique({ where: { id: deliveryAddressId } })
      : null;
    const pickup = pickupAddressId
      ? await prisma.address.findUnique({ where: { id: pickupAddressId } })
      : null;
    const subCity = delivery?.subCity ?? pickup?.subCity;

    const task = await prisma.task.create({
      data: {
        customerId,
        serviceId: service.id,
        templateId: template.id,
        status: TaskStatus.DRAFT,
        payload: answers as never,
        budgetCapSantim: budgetCapSantim ?? null,
        deadlineAt: deadlineAt ?? null,
        pickupAddressId: pickupAddressId ?? null,
        deliveryAddressId: deliveryAddressId ?? null,
        subCity: (subCity as never) ?? null,
      },
    });

    await prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        fromStatus: TaskStatus.DRAFT,
        toStatus: TaskStatus.DRAFT,
        actorId: customerId,
        actorRole: 'customer',
        note: 'Draft created',
      },
    });

    if (sample.status === TaskStatus.DRAFT) continue;

    const transitions: { to: TaskStatus; note: string }[] = [
      { to: TaskStatus.SUBMITTED, note: 'Request submitted' },
    ];

    if (sample.status === TaskStatus.CANCELLED) {
      transitions.push({ to: TaskStatus.CANCELLED, note: 'Cancelled by the customer' });
    }

    let from: TaskStatus = TaskStatus.DRAFT;

    for (const transition of transitions) {
      if (!canTransition(from, transition.to, 'customer')) continue;

      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: transition.to,
          ...(transition.to === TaskStatus.SUBMITTED ? { submittedAt: new Date() } : {}),
          ...(transition.to === TaskStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
        },
      });

      await prisma.taskStatusHistory.create({
        data: {
          taskId: task.id,
          fromStatus: from,
          toStatus: transition.to,
          actorId: customerId,
          actorRole: 'customer',
          note: transition.note,
        },
      });

      from = transition.to;
    }
  }
}

async function main(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('The seed refuses to run when NODE_ENV=production.');
  }

  const password = process.env['SEED_PASSWORD'];
  if (!password || password.length < 10) {
    throw new Error(
      'SEED_PASSWORD is missing. Set it in apps/api/.env to a password of at least 10 characters.',
    );
  }

  await seedRolesAndPermissions(prisma);
  await seedCatalogue(prisma);
  await seedProhibitedItems(prisma);

  const userIds = await seedUsers(password);
  const customerId = userIds['customer@egna.test'];

  if (customerId) {
    const addressIds = await seedAddresses(customerId);
    await seedTasks(customerId, addressIds);
  }

  console.log('Seed complete.');
  for (const seed of SEED_USERS) {
    console.log(`  ${seed.role.padEnd(11)} ${seed.email}`);
  }
  console.log('  The password of every seeded account is the SEED_PASSWORD value.');
  console.log(
    `  ${SEED_SERVICES.length} services with a live template, ${SEED_ADDRESSES.length} addresses, 4 sample tasks.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
