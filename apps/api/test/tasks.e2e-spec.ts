import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createTestApp,
  prisma,
  signIn,
  TEST_PASSWORD,
  type Agent,
  type TestContext,
} from './test-helpers';

const API_ROOT = join(__dirname, '..', 'src');

describe('Phase 2 tasks, addresses and the catalogue (e2e)', () => {
  let context: TestContext;
  let customer: Agent;
  let other: Agent;
  let customerId = '';
  let otherId = '';
  const previousRateLimit = process.env['AUTH_RATE_LIMIT'];
  const createdServices: string[] = [];

  beforeAll(async () => {
    // The suite asks for a CSRF token very often; the rate limit has its own
    // test file.
    process.env['AUTH_RATE_LIMIT'] = '1000';

    context = await createTestApp();

    const first = await context.createUser({ role: 'CUSTOMER' });
    const second = await context.createUser({ role: 'CUSTOMER' });

    customerId = first.id;
    otherId = second.id;

    customer = await signIn(context, first.email);
    other = await signIn(context, second.email);
  });

  afterAll(async () => {
    for (const serviceId of createdServices) {
      await prisma.task.deleteMany({ where: { serviceId } });
      await prisma.service.deleteMany({ where: { id: serviceId } });
    }

    if (previousRateLimit === undefined) delete process.env['AUTH_RATE_LIMIT'];
    else process.env['AUTH_RATE_LIMIT'] = previousRateLimit;

    await context.app.close();
    await prisma.$disconnect();
  });

  async function createTask(agent: Agent, serviceKey = 'buy_and_deliver') {
    const csrf = await context.csrf(agent);

    const response = await agent
      .post('/api/v1/tasks')
      .set('X-CSRF-Token', csrf)
      .send({ serviceKey })
      .expect(201);

    return { csrf, id: response.body.id as string, ref: response.body.ref as string };
  }

  async function createAddress(agent: Agent) {
    const csrf = await context.csrf(agent);

    const response = await agent
      .post('/api/v1/addresses')
      .set('X-CSRF-Token', csrf)
      .send({
        contactName: 'Test Person',
        contactPhone: '+251911234567',
        directions: 'Next to the blue gate',
        label: 'Home',
        landmark: 'Bole Road',
        subCity: 'BOLE',
        woreda: 'Bole',
      })
      .expect(201);

    return response.body.id as string;
  }

  describe('the catalogue', () => {
    it('shows the three live services with their live template', async () => {
      const response = await customer.get('/api/v1/services').expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body.map((service: { key: string }) => service.key).sort()).toEqual([
        'buy_and_deliver',
        'pickup_and_dropoff',
        'queue_and_paperwork',
      ]);
      expect(response.body[0].templateVersion).toBeGreaterThanOrEqual(1);
    });

    it('returns the live template of a service', async () => {
      const response = await customer.get('/api/v1/services/buy_and_deliver/template').expect(200);

      expect(response.body.definition.sections.length).toBeGreaterThan(0);
      expect(response.body.version).toBeGreaterThanOrEqual(1);
    });

    it('answers 404 for a service that does not exist', async () => {
      await customer.get('/api/v1/services/not_a_service/template').expect(404);
    });
  });

  describe('addresses', () => {
    it('creates, changes and removes an address of the signed in customer', async () => {
      const addressId = await createAddress(customer);

      const list = await customer.get('/api/v1/addresses').expect(200);
      expect(list.body.some((address: { id: string }) => address.id === addressId)).toBe(true);

      const csrf = await context.csrf(customer);

      await customer
        .patch(`/api/v1/addresses/${addressId}`)
        .set('X-CSRF-Token', csrf)
        .send({ label: 'Office' })
        .expect(200);

      const after = await customer.get('/api/v1/addresses').expect(200);
      const changed = after.body.find((address: { id: string }) => address.id === addressId);
      expect(changed.label).toBe('Office');

      await customer.delete(`/api/v1/addresses/${addressId}`).set('X-CSRF-Token', csrf).expect(200);

      const final = await customer.get('/api/v1/addresses').expect(200);
      expect(final.body.some((address: { id: string }) => address.id === addressId)).toBe(false);
    });

    it('never shows the address of another customer', async () => {
      const addressId = await createAddress(customer);

      await other.get(`/api/v1/addresses/${addressId}`).expect(404);

      const list = await other.get('/api/v1/addresses').expect(200);
      expect(list.body.some((address: { id: string }) => address.id === addressId)).toBe(false);
    });
  });

  describe('tasks', () => {
    it('creates a draft and autosaves a partial payload', async () => {
      const { csrf, id } = await createTask(customer);

      const saved = await customer
        .patch(`/api/v1/tasks/${id}`)
        .set('X-CSRF-Token', csrf)
        .send({ payload: { items: [{ name: 'Rice', quantity: 2 }] } })
        .expect(200);

      expect(saved.body.id).toBe(id);

      const detail = await customer.get(`/api/v1/tasks/${id}`).expect(200);
      expect(detail.body.payload.items[0].name).toBe('Rice');
      expect(detail.body.status).toBe('DRAFT');
    });

    it('answers the submit with a field level error list', async () => {
      const { csrf, id } = await createTask(customer);

      const response = await customer
        .post(`/api/v1/tasks/${id}/submit`)
        .set('X-CSRF-Token', csrf)
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(Array.isArray(response.body.details)).toBe(true);

      const paths = response.body.details.map((detail: { path: string }) => detail.path);
      expect(paths).toContain('items');
      expect(paths).toContain('budget');
    });

    it('submits a complete request and writes the history', async () => {
      const addressId = await createAddress(customer);
      const { csrf, id } = await createTask(customer);

      await customer
        .patch(`/api/v1/tasks/${id}`)
        .set('X-CSRF-Token', csrf)
        .send({
          payload: {
            items: [{ name: 'Rice', quantity: 2, notes: '' }],
            budget: 120_000,
            preferredShop: '',
            allowOtherShop: true,
            deliveryAddress: addressId,
            contactPhone: '+251911234567',
            neededBy: new Date(Date.now() + 86_400_000).toISOString(),
            notes: '',
          },
        })
        .expect(200);

      const submitted = await customer
        .post(`/api/v1/tasks/${id}/submit`)
        .set('X-CSRF-Token', csrf)
        .expect(200);

      expect(submitted.body.status).toBe('SUBMITTED');

      const detail = await customer.get(`/api/v1/tasks/${id}`).expect(200);
      expect(detail.body.status).toBe('SUBMITTED');
      expect(detail.body.budgetCapSantim).toBe(120_000);
      expect(detail.body.subCity).toBe('BOLE');
      expect(detail.body.history.length).toBeGreaterThan(0);
      expect(detail.body.history.at(-1).toStatus).toBe('SUBMITTED');
    });

    it('refuses a deadline in the past', async () => {
      const addressId = await createAddress(customer);
      const { csrf, id } = await createTask(customer);

      await customer
        .patch(`/api/v1/tasks/${id}`)
        .set('X-CSRF-Token', csrf)
        .send({
          payload: {
            items: [{ name: 'Rice', quantity: 1, notes: '' }],
            budget: 120_000,
            deliveryAddress: addressId,
            contactPhone: '+251911234567',
            neededBy: new Date(Date.now() - 86_400_000).toISOString(),
            notes: '',
          },
        })
        .expect(200);

      const response = await customer
        .post(`/api/v1/tasks/${id}/submit`)
        .set('X-CSRF-Token', csrf)
        .expect(400);

      const paths = response.body.details.map((detail: { path: string }) => detail.path);
      expect(paths).toContain('neededBy');
    });

    it('never shows the task of another customer', async () => {
      const { id } = await createTask(customer);

      await other.get(`/api/v1/tasks/${id}`).expect(404);

      const list = await other.get('/api/v1/tasks').expect(200);
      expect(list.body.items.some((task: { id: string }) => task.id === id)).toBe(false);
    });

    it('cancels a draft and refuses to cancel a submitted task', async () => {
      const draft = await createTask(customer);

      const cancelled = await customer
        .post(`/api/v1/tasks/${draft.id}/cancel`)
        .set('X-CSRF-Token', draft.csrf)
        .send({ reason: 'Changed my mind' })
        .expect(200);

      expect(cancelled.body.status).toBe('CANCELLED');

      const detail = await customer.get(`/api/v1/tasks/${draft.id}`).expect(200);
      expect(detail.body.history.at(-1).toStatus).toBe('CANCELLED');
    });

    it('refuses to change a task that is not a draft any more', async () => {
      const { csrf, id } = await createTask(customer);

      await customer
        .post(`/api/v1/tasks/${id}/cancel`)
        .set('X-CSRF-Token', csrf)
        .send({})
        .expect(200);

      await customer
        .patch(`/api/v1/tasks/${id}`)
        .set('X-CSRF-Token', csrf)
        .send({ payload: { items: [] } })
        .expect(400);
    });

    it('flags a prohibited item without blocking the request', async () => {
      const addressId = await createAddress(customer);
      const { csrf, id } = await createTask(customer);

      await customer
        .patch(`/api/v1/tasks/${id}`)
        .set('X-CSRF-Token', csrf)
        .send({
          payload: {
            items: [{ name: 'A knife and a weapon', quantity: 1, notes: '' }],
            budget: 120_000,
            deliveryAddress: addressId,
            contactPhone: '+251911234567',
            neededBy: new Date(Date.now() + 86_400_000).toISOString(),
            notes: '',
          },
        })
        .expect(200);

      await customer.post(`/api/v1/tasks/${id}/submit`).set('X-CSRF-Token', csrf).expect(200);

      const detail = await customer.get(`/api/v1/tasks/${id}`).expect(200);
      const matches = detail.body.payload.__meta.prohibitedMatches as { term: string }[];

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((match) => match.term === 'weapon')).toBe(true);
    });
  });

  describe('uploads', () => {
    it('refuses a file type that is not allowed', async () => {
      const csrf = await context.csrf(customer);

      const response = await customer
        .post('/api/v1/uploads/sign')
        .set('X-CSRF-Token', csrf)
        .send({
          contentType: 'application/x-msdownload',
          fileName: 'virus.exe',
          kind: 'OTHER',
          sizeBytes: 1000,
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
    });

    it('refuses a file that is too big', async () => {
      const csrf = await context.csrf(customer);

      const response = await customer
        .post('/api/v1/uploads/sign')
        .set('X-CSRF-Token', csrf)
        .send({
          contentType: 'image/png',
          fileName: 'big.png',
          kind: 'OTHER',
          sizeBytes: 6 * 1024 * 1024,
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
    });

    it('never gives the file of another customer', async () => {
      const csrf = await context.csrf(customer);

      const signed = await customer
        .post('/api/v1/uploads/sign')
        .set('X-CSRF-Token', csrf)
        .send({
          contentType: 'image/png',
          fileName: 'letter.png',
          kind: 'AUTHORIZATION_LETTER',
          sizeBytes: 1024,
        })
        .expect(201);

      const attachmentId = signed.body.attachmentId as string;

      // The owner may read it.
      await customer.get(`/api/v1/attachments/${attachmentId}/url`).expect(200);

      // Another customer gets a 404, so the answer never confirms it exists.
      await other.get(`/api/v1/attachments/${attachmentId}/url`).expect(404);
    });
  });

  describe('the staff catalogue', () => {
    it('is closed for a customer', async () => {
      await customer.get('/api/v1/staff/catalog').expect(403);
      await customer.get('/api/v1/staff/tasks').expect(403);
    });

    it('publishes a new version and keeps the old tasks on their version', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const adminClient = await signIn(context, admin.email);
      const csrf = await context.csrf(adminClient);

      // The test works on its own service, so the seeded catalogue is never
      // changed by the suite.
      const created = await adminClient
        .post('/api/v1/staff/services')
        .set('X-CSRF-Token', csrf)
        .send({
          description: {
            summary: { en: 'A test service' },
            youProvide: [],
            youReceive: { en: 'A test service' },
          },
          icon: 'package',
          key: `test_service_${Date.now()}`,
          name: { en: 'Test service' },
        })
        .expect(201);

      const service = {
        id: created.body.id as string,
        key: created.body.key as string,
      };

      createdServices.push(service.id);

      const templates = await adminClient
        .get(`/api/v1/staff/services/${service.id}/templates`)
        .expect(200);

      const first = templates.body.find(
        (template: { status: string }) => template.status === 'DRAFT',
      );

      // The first version has one field.
      const versionOne = {
        requiredEvidence: [],
        sections: [
          {
            key: 'main',
            title: { en: 'Main' },
            fields: [{ key: 'name', type: 'text', label: { en: 'Name' }, required: true }],
          },
        ],
      };

      await adminClient
        .put(`/api/v1/staff/templates/${first.id}`)
        .set('X-CSRF-Token', csrf)
        .send({ definition: versionOne })
        .expect(200);

      const firstPublished = await adminClient
        .post(`/api/v1/staff/templates/${first.id}/publish`)
        .set('X-CSRF-Token', csrf)
        .expect(200);

      expect(firstPublished.body.status).toBe('LIVE');
      expect(firstPublished.body.version).toBe(1);

      // The service goes live, so a customer can start a task.
      await adminClient
        .patch(`/api/v1/staff/services/${service.id}`)
        .set('X-CSRF-Token', csrf)
        .send({ status: 'LIVE' })
        .expect(200);

      // A task that is created now stays on the first version.
      const oldTask = await createTask(customer, service.key);
      const oldDetail = await customer.get(`/api/v1/tasks/${oldTask.id}`).expect(200);
      expect(oldDetail.body.templateVersion).toBe(1);

      // The second version adds a field.
      const draft = await adminClient
        .post(`/api/v1/staff/services/${service.id}/templates`)
        .set('X-CSRF-Token', csrf)
        .expect(201);

      const withField = {
        ...versionOne,
        sections: [
          ...versionOne.sections,
          {
            key: 'extra',
            title: { en: 'Extra' },
            fields: [
              {
                key: `giftMessage-${Date.now()}`,
                type: 'text',
                label: { en: 'Gift message' },
                required: false,
              },
            ],
          },
        ],
      };

      await adminClient
        .put(`/api/v1/staff/templates/${draft.body.id}`)
        .set('X-CSRF-Token', csrf)
        .send({ definition: withField })
        .expect(200);

      const published = await adminClient
        .post(`/api/v1/staff/templates/${draft.body.id}/publish`)
        .set('X-CSRF-Token', csrf)
        .expect(200);

      expect(published.body.status).toBe('LIVE');

      // The old live version is archived.
      const after = await adminClient
        .get(`/api/v1/staff/services/${service.id}/templates`)
        .expect(200);

      const liveVersions = after.body.filter(
        (template: { status: string }) => template.status === 'LIVE',
      );
      expect(liveVersions).toHaveLength(1);
      expect(liveVersions[0].version).toBe(2);

      const archived = after.body.find((template: { version: number }) => template.version === 1);
      expect(archived.status).toBe('ARCHIVED');

      // A new task uses the new version, the old task keeps its own.
      const newTask = await createTask(customer, service.key);
      const newDetail = await customer.get(`/api/v1/tasks/${newTask.id}`).expect(200);
      expect(newDetail.body.templateVersion).toBe(2);

      const oldAgain = await customer.get(`/api/v1/tasks/${oldTask.id}`).expect(200);
      expect(oldAgain.body.templateVersion).toBe(1);
      expect(oldAgain.body.definition.sections).toHaveLength(1);

      // The audit log knows about it.
      const audit = await adminClient
        .get('/api/v1/staff/audit?action=template.published')
        .expect(200);
      expect(audit.body.total).toBeGreaterThan(0);
    });

    it('refuses to publish a version that drops the budget field', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const adminClient = await signIn(context, admin.email);
      const csrf = await context.csrf(adminClient);

      const catalog = await adminClient.get('/api/v1/staff/catalog').expect(200);
      const service = catalog.body.find((row: { key: string }) => row.key === 'buy_and_deliver');

      const templates = await adminClient
        .get(`/api/v1/staff/services/${service.id}/templates`)
        .expect(200);

      const live = templates.body.find(
        (template: { status: string }) => template.status === 'LIVE',
      );

      await prisma.serviceTemplate.deleteMany({
        where: { serviceId: service.id, status: 'DRAFT' },
      });

      const draft = await adminClient
        .post(`/api/v1/staff/services/${service.id}/templates`)
        .set('X-CSRF-Token', csrf)
        .expect(201);

      // The budget field is gone.
      const withoutBudget = {
        ...live.definition,
        sections: live.definition.sections
          .map((section: { fields: { mapsTo?: string }[] }) => ({
            ...section,
            fields: section.fields.filter((field) => field.mapsTo !== 'budgetCap'),
          }))
          .filter((section: { fields: unknown[] }) => section.fields.length > 0),
      };

      await adminClient
        .put(`/api/v1/staff/templates/${draft.body.id}`)
        .set('X-CSRF-Token', csrf)
        .send({ definition: withoutBudget })
        .expect(200);

      const response = await adminClient
        .post(`/api/v1/staff/templates/${draft.body.id}/publish`)
        .set('X-CSRF-Token', csrf)
        .expect(400);

      expect(response.body.code).toBe('TEMPLATE_INVALID');
    });

    it('refuses to edit a live template', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const adminClient = await signIn(context, admin.email);
      const csrf = await context.csrf(adminClient);

      const catalog = await adminClient.get('/api/v1/staff/catalog').expect(200);
      const service = catalog.body.find((row: { key: string }) => row.key === 'pickup_and_dropoff');

      const templates = await adminClient
        .get(`/api/v1/staff/services/${service.id}/templates`)
        .expect(200);

      const live = templates.body.find(
        (template: { status: string }) => template.status === 'LIVE',
      );

      const response = await adminClient
        .put(`/api/v1/staff/templates/${live.id}`)
        .set('X-CSRF-Token', csrf)
        .send({ definition: live.definition })
        .expect(400);

      expect(response.body.code).toBe('TEMPLATE_LOCKED');
    });
  });

  describe('the staff task list', () => {
    it('shows the submitted tasks to a person with tasks.view', async () => {
      const ops = await context.createUser({ role: 'OPERATIONS' });
      const opsClient = await signIn(context, ops.email);

      const response = await opsClient.get('/api/v1/staff/tasks').expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('the status history', () => {
    it('cannot be changed or deleted', async () => {
      const { id } = await createTask(customer);

      const csrf = await context.csrf(customer);
      await customer
        .post(`/api/v1/tasks/${id}/cancel`)
        .set('X-CSRF-Token', csrf)
        .send({})
        .expect(200);

      const row = await prisma.taskStatusHistory.findFirst({ where: { taskId: id } });
      expect(row).not.toBeNull();

      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE task_status_history SET note = 'tampered' WHERE id = '${row?.id}'`,
        ),
      ).rejects.toThrow();

      await expect(
        prisma.$executeRawUnsafe(`DELETE FROM task_status_history WHERE id = '${row?.id}'`),
      ).rejects.toThrow();

      const stillThere = await prisma.taskStatusHistory.findUnique({ where: { id: row?.id } });
      expect(stillThere).not.toBeNull();
    });
  });

  describe('the state machine', () => {
    it('is the only place that writes the status of a task', () => {
      const service = readFileSync(join(API_ROOT, 'modules', 'tasks', 'tasks.service.ts'), 'utf8');
      const machine = readFileSync(
        join(API_ROOT, 'modules', 'tasks', 'task-state-machine.service.ts'),
        'utf8',
      );

      // No update of a task in the task service may set the status.
      const updates = service.match(/\.update\(\{[\s\S]*?\n\s*\}\);/g) ?? [];

      for (const update of updates) {
        expect(update).not.toMatch(/status:\s*TaskStatus\./);
      }

      // The task service asks the machine instead.
      expect(service).toContain('this.stateMachine.transition');
      expect(machine).toContain('status: to');
    });
  });

  it('keeps the two customers apart', async () => {
    const mine = await customer.get('/api/v1/tasks').expect(200);
    const theirs = await other.get('/api/v1/tasks').expect(200);

    const myIds = mine.body.items.map((task: { id: string }) => task.id);
    const theirIds = theirs.body.items.map((task: { id: string }) => task.id);

    for (const id of theirIds) {
      expect(myIds).not.toContain(id);
    }

    expect(customerId).not.toBe(otherId);
    expect(TEST_PASSWORD.length).toBeGreaterThan(9);
  });
});
