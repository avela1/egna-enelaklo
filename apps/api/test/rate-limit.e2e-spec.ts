import { createTestApp, prisma, type TestContext } from './test-helpers';

/**
 * The rate limit on the auth routes. It runs in its own file with the real
 * throttler, so the counters of one test never affect another test.
 */
describe('Rate limiting (e2e)', () => {
  let context: TestContext;
  const previousRateLimit = process.env['AUTH_RATE_LIMIT'];

  beforeAll(async () => {
    // Three attempts a minute, so the test does not have to send hundreds.
    process.env['AUTH_RATE_LIMIT'] = '3';
    context = await createTestApp();
  });

  afterAll(async () => {
    if (previousRateLimit === undefined) delete process.env['AUTH_RATE_LIMIT'];
    else process.env['AUTH_RATE_LIMIT'] = previousRateLimit;

    await context.app.close();
    await prisma.$disconnect();
  });

  it('answers with 429 after too many sign in attempts in a minute', async () => {
    const client = context.agent();
    const token = await context.csrf(client);

    const attempts: number[] = [];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await client
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email: 'nobody@egna.test', password: 'WrongPassword1' });

      attempts.push(response.status);
    }

    expect(attempts).toContain(429);
    expect(attempts.filter((status) => status === 401).length).toBeGreaterThan(0);
  });
});
