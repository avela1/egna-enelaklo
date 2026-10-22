import { createTestApp, prisma, signIn, type TestContext } from './test-helpers';
import { checkUploadedFile, MAX_UPLOAD_BYTES } from '../src/modules/uploads/uploads.service';

const FUTURE_DATE = '2099-01-01';

describe('Phase 2 attachments (e2e)', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await context.app.close();
    await prisma.$disconnect();
  });

  it('accepts a file that follows the rules', () => {
    const result = checkUploadedFile(
      { contentType: 'application/pdf', sizeBytes: 1200 },
      { contentType: 'application/pdf', sizeBytes: 1200 },
    );

    expect(result.ok).toBe(true);
  });

  it('rejects a file that is too big', () => {
    const result = checkUploadedFile(
      { contentType: 'application/pdf', sizeBytes: MAX_UPLOAD_BYTES + 1 },
      { contentType: 'application/pdf', sizeBytes: MAX_UPLOAD_BYTES + 1 },
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('size');
  });

  it('rejects a file with a type that is not allowed', () => {
    const result = checkUploadedFile(
      { contentType: 'application/x-msdownload', sizeBytes: 1200 },
      { contentType: 'application/x-msdownload', sizeBytes: 1200 },
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('contentType');
  });

  it('rejects a file that is not the one that was declared', () => {
    const result = checkUploadedFile(
      { contentType: 'image/png', sizeBytes: 1200 },
      { contentType: 'application/pdf', sizeBytes: 1200 },
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('contentType');
  });

  it('rejects a file that never arrived', () => {
    const result = checkUploadedFile({}, { contentType: 'application/pdf', sizeBytes: 1200 });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('missing');
  });

  it('refuses a file type and a size that are not allowed', async () => {
    const customer = await context.createUser({ role: 'CUSTOMER' });
    const client = await signIn(context, customer.email);
    const csrf = await context.csrf(client);

    const badType = await client
      .post('/api/v1/uploads/sign')
      .set('X-CSRF-Token', csrf)
      .send({
        contentType: 'application/x-msdownload',
        fileName: 'virus.exe',
        kind: 'OTHER',
        sizeBytes: 1000,
      })
      .expect(400);

    expect(badType.body.code).toBe('VALIDATION_FAILED');

    const tooBig = await client
      .post('/api/v1/uploads/sign')
      .set('X-CSRF-Token', csrf)
      .send({
        contentType: 'image/png',
        fileName: 'big.png',
        kind: 'OTHER',
        sizeBytes: MAX_UPLOAD_BYTES + 1,
      })
      .expect(400);

    expect(tooBig.body.code).toBe('VALIDATION_FAILED');
  });

  it('never lets a customer touch the file of somebody else', async () => {
    const owner = await context.createUser({ role: 'CUSTOMER' });
    const ownerClient = await signIn(context, owner.email);
    const ownerCsrf = await context.csrf(ownerClient);

    const signed = await ownerClient
      .post('/api/v1/uploads/sign')
      .set('X-CSRF-Token', ownerCsrf)
      .send({
        contentType: 'image/png',
        fileName: 'letter.png',
        kind: 'AUTHORIZATION_LETTER',
        sizeBytes: 1024,
      })
      .expect(201);

    const attachmentId = signed.body.attachmentId as string;

    const other = await context.createUser({ role: 'CUSTOMER' });
    const otherClient = await signIn(context, other.email);
    const otherCsrf = await context.csrf(otherClient);

    await otherClient.get(`/api/v1/attachments/${attachmentId}/url`).expect(404);
    await otherClient
      .post(`/api/v1/attachments/${attachmentId}/confirm`)
      .set('X-CSRF-Token', otherCsrf)
      .expect(404);
    await otherClient
      .delete(`/api/v1/attachments/${attachmentId}`)
      .set('X-CSRF-Token', otherCsrf)
      .expect(404);
    await otherClient
      .post(`/api/v1/attachments/${attachmentId}/link`)
      .set('X-CSRF-Token', otherCsrf)
      .send({ taskId: '11111111-1111-4111-8111-111111111111' })
      .expect(404);
  });

  it('refuses a request with a file that was never checked', async () => {
    const customer = await context.createUser({ role: 'CUSTOMER' });
    const client = await signIn(context, customer.email);
    const csrf = await context.csrf(client);

    const service = await prisma.service.findFirst({
      where: { key: 'queue_and_paperwork' },
      include: { templates: { where: { status: 'LIVE' } } },
    });

    const template = service?.templates[0];
    expect(template).toBeDefined();

    const task = await prisma.task.create({
      data: {
        customerId: customer.id,
        serviceId: service!.id,
        templateId: template!.id,
        status: 'DRAFT',
        payload: {},
      },
    });

    const attachment = await prisma.attachment.create({
      data: {
        ownerId: customer.id,
        taskId: task.id,
        kind: 'AUTHORIZATION_LETTER',
        storageKey: `uploads/${customer.id}/letter.png`,
        fileName: 'letter.png',
        contentType: 'image/png',
        sizeBytes: 1024,
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: {
        payload: {
          officeType: 'KEBELE',
          officeName: 'Kirkos office',
          procedure: 'Collect the licence receipt',
          authorizationNeeded: 'YES',
          authorizationLetter: attachment.id,
          contactPhone: '+251911234567',
          preferredDate: FUTURE_DATE,
          notes: '',
        },
      },
    });

    const refused = await client
      .post(`/api/v1/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', csrf)
      .expect(400);

    expect(refused.body.code).toBe('VALIDATION_FAILED');

    const paths = (refused.body.details ?? []).map((detail: { path: string }) => detail.path);
    expect(paths).toContain('authorizationLetter');

    const messages = (refused.body.details ?? []).map(
      (detail: { message: string }) => detail.message,
    );
    expect(messages).toContain('validation.fileNotVerified');
  });

  it('accepts a file that was verified', async () => {
    const customer = await context.createUser({ role: 'CUSTOMER' });
    const client = await signIn(context, customer.email);
    const csrf = await context.csrf(client);

    const service = await prisma.service.findFirst({
      where: { key: 'queue_and_paperwork' },
      include: { templates: { where: { status: 'LIVE' } } },
    });

    const template = service?.templates[0];
    expect(template).toBeDefined();

    const task = await prisma.task.create({
      data: {
        customerId: customer.id,
        serviceId: service!.id,
        templateId: template!.id,
        status: 'DRAFT',
        payload: {},
      },
    });

    const attachment = await prisma.attachment.create({
      data: {
        ownerId: customer.id,
        taskId: task.id,
        kind: 'AUTHORIZATION_LETTER',
        storageKey: `uploads/${customer.id}/letter.png`,
        fileName: 'letter.png',
        contentType: 'image/png',
        sizeBytes: 1024,
        verifiedAt: new Date(),
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: {
        payload: {
          officeType: 'KEBELE',
          officeName: 'Kirkos office',
          procedure: 'Collect the licence receipt',
          authorizationNeeded: 'YES',
          authorizationLetter: attachment.id,
          contactPhone: '+251911234567',
          preferredDate: FUTURE_DATE,
          notes: '',
        },
      },
    });

    const submitted = await client
      .post(`/api/v1/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', csrf)
      .expect(200);

    expect(submitted.body.status).toBe('SUBMITTED');
  });
});
