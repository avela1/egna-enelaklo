import {
  createTestApp,
  mailSpy,
  prisma,
  signIn,
  TEST_PASSWORD,
  type TestContext,
} from './test-helpers';

describe('Phase 1 auth and staff admin (e2e)', () => {
  let context: TestContext;
  const previousRateLimit = process.env['AUTH_RATE_LIMIT'];

  beforeAll(async () => {
    // The rate limit has its own test file, so it never gets in the way here.
    process.env['AUTH_RATE_LIMIT'] = '1000';
    context = await createTestApp();
  });

  afterAll(async () => {
    if (previousRateLimit === undefined) delete process.env['AUTH_RATE_LIMIT'];
    else process.env['AUTH_RATE_LIMIT'] = previousRateLimit;

    await context.app.close();
    await prisma.$disconnect();
  });

  describe('registration', () => {
    it('creates a customer, returns the person without the hash and starts a session', async () => {
      const client = context.agent();
      const token = await context.csrf(client);
      const email = `register-${Date.now()}@egna.test`;

      const response = await client
        .post('/api/v1/auth/register')
        .set('X-CSRF-Token', token)
        .send({
          name: 'Tigist G.',
          email,
          phone: '+251911234567',
          password: 'StrongPassword1',
          locale: 'en',
          termsAccepted: true,
        })
        .expect(201);

      expect(response.body.user).toMatchObject({ email, name: 'Tigist G.', role: 'CUSTOMER' });
      expect(response.body.user.passwordHash).toBeUndefined();
      expect(response.body.user.permissions).toEqual([]);

      const cookies = response.headers['set-cookie'] as unknown as string[];
      const session = cookies.find((cookie) => cookie.startsWith('egna_session='));
      expect(session).toBeDefined();
      expect(session).toContain('HttpOnly');
      expect(session).toContain('SameSite=Lax');
      expect(session).not.toContain('Secure');

      // The verification email was sent.
      expect(mailSpy.sendVerifyEmail).toHaveBeenCalled();
      expect(mailSpy.sendVerifyEmail.mock.calls[0][0]).toBe(email);
    });

    it('rejects a weak password with the shared rules', async () => {
      const client = context.agent();
      const token = await context.csrf(client);

      const response = await client
        .post('/api/v1/auth/register')
        .set('X-CSRF-Token', token)
        .send({
          name: 'Weak',
          email: `weak-${Date.now()}@egna.test`,
          password: 'short',
          locale: 'en',
          termsAccepted: true,
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(JSON.stringify(response.body.details)).toContain('password');
    });
  });

  describe('sign in', () => {
    it('signs a person in and returns the role and the permissions', async () => {
      const user = await context.createUser({ role: 'OPERATIONS' });
      const client = context.agent();
      const token = await context.csrf(client);

      const response = await client
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email: user.email, password: user.password })
        .expect(200);

      expect(response.body.user.role).toBe('OPERATIONS');
      expect(response.body.user.permissions).toContain('tasks.view');
      expect(response.body.user.passwordHash).toBeUndefined();

      const me = await client.get('/api/v1/auth/me').expect(200);
      expect(me.body.user.email).toBe(user.email);
    });

    it('answers a wrong password and an unknown email with the same message', async () => {
      const user = await context.createUser();
      const client = context.agent();
      const token = await context.csrf(client);

      const wrongPassword = await client
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email: user.email, password: 'NotThePassword1' })
        .expect(401);

      const unknownEmail = await client
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email: 'nobody@egna.test', password: 'NotThePassword1' })
        .expect(401);

      expect(wrongPassword.body.message).toBe('Invalid email or password');
      expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
      expect(unknownEmail.body.code).toBe(wrongPassword.body.code);
    });

    it('locks the account after five failures and keeps the message generic', async () => {
      const user = await context.createUser();
      const client = context.agent();
      const token = await context.csrf(client);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await client
          .post('/api/v1/auth/login')
          .set('X-CSRF-Token', token)
          .send({ email: user.email, password: 'NotThePassword1' })
          .expect(401);
      }

      const locked = await client
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(401);

      expect(locked.body.code).toBe('ACCOUNT_LOCKED');
      expect(locked.body.message).toBe('Invalid email or password');
      expect(locked.body.details.retryAfterSeconds).toBeGreaterThan(0);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'auth.locked', targetId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).not.toBeNull();
    });

    it('rejects a state changing request without the CSRF header', async () => {
      const client = context.agent();
      await context.csrf(client);

      const response = await client
        .post('/api/v1/auth/login')
        .send({ email: 'someone@egna.test', password: 'StrongPassword1' })
        .expect(403);

      expect(response.body.code).toBe('CSRF_FAILED');
    });
  });

  describe('password reset', () => {
    it('resets the password with a single use token and revokes the sessions', async () => {
      const user = await context.createUser();
      const client = context.agent();
      const token = await context.csrf(client);

      await signIn(context, user.email, user.password);

      // The forgot answer is the same whether the email exists or not.
      const forgot = await client
        .post('/api/v1/auth/forgot')
        .set('X-CSRF-Token', token)
        .send({ email: user.email })
        .expect(200);
      expect(forgot.body).toEqual({ ok: true });

      const unknown = await client
        .post('/api/v1/auth/forgot')
        .set('X-CSRF-Token', token)
        .send({ email: 'nobody-at-all@egna.test' })
        .expect(200);
      expect(unknown.body).toEqual(forgot.body);

      const resetLink = mailSpy.sendPasswordReset.mock.calls.at(-1)?.[2] as string;
      const resetToken = new URL(resetLink).searchParams.get('token') as string;
      expect(resetToken).toBeTruthy();

      await client
        .post('/api/v1/auth/reset')
        .set('X-CSRF-Token', token)
        .send({ token: resetToken, password: 'BrandNewPassword1' })
        .expect(200);

      // The old session is gone.
      await client.get('/api/v1/auth/me').expect(401);

      // The token only works once.
      await client
        .post('/api/v1/auth/reset')
        .set('X-CSRF-Token', token)
        .send({ token: resetToken, password: 'AnotherPassword1' })
        .expect(400);

      // The new password works.
      const fresh = context.agent();
      const freshToken = await context.csrf(fresh);
      await fresh
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', freshToken)
        .send({ email: user.email, password: 'BrandNewPassword1' })
        .expect(200);
    });

    it('refuses an expired reset token', async () => {
      const user = await context.createUser();
      const client = context.agent();
      const token = await context.csrf(client);

      await client
        .post('/api/v1/auth/forgot')
        .set('X-CSRF-Token', token)
        .send({ email: user.email })
        .expect(200);

      const resetLink = mailSpy.sendPasswordReset.mock.calls.at(-1)?.[2] as string;
      const resetToken = new URL(resetLink).searchParams.get('token') as string;

      await prisma.emailToken.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await client
        .post('/api/v1/auth/reset')
        .set('X-CSRF-Token', token)
        .send({ token: resetToken, password: 'BrandNewPassword1' })
        .expect(400);

      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('permissions', () => {
    it('denies a customer the staff user list with 403 and leaks no data', async () => {
      const customer = await context.createUser({ role: 'CUSTOMER' });
      const client = await signIn(context, customer.email, customer.password);

      const response = await client.get('/api/v1/staff/users').expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
      expect(response.body.items).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('egna.test');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'access.denied', actorId: customer.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).not.toBeNull();
    });

    it('hides the roles screen from an operations user', async () => {
      const ops = await context.createUser({ role: 'OPERATIONS' });
      const client = await signIn(context, ops.email, ops.password);

      await client.get('/api/v1/staff/users').expect(403);
      await client.get('/api/v1/staff/roles').expect(403);
      await client.get('/api/v1/staff/audit').expect(403);
    });

    it('applies a role permission change on the next request', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const adminClient = await signIn(context, admin.email, admin.password);

      const ops = await context.createUser({ role: 'OPERATIONS' });
      const opsClient = await signIn(context, ops.email, ops.password);

      await opsClient.get('/api/v1/staff/users').expect(403);

      const token = await context.csrf(adminClient);
      await adminClient
        .put('/api/v1/staff/roles/OPERATIONS/permissions')
        .set('X-CSRF-Token', token)
        .send({ permissions: ['tasks.view', 'users.manage'] })
        .expect(200);

      // The next request of the operations user is allowed.
      await opsClient.get('/api/v1/staff/users').expect(200);
    });

    it('refuses to edit the permissions of the admin role', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const client = await signIn(context, admin.email, admin.password);
      const token = await context.csrf(client);

      const response = await client
        .put('/api/v1/staff/roles/ADMIN/permissions')
        .set('X-CSRF-Token', token)
        .send({ permissions: ['tasks.view'] })
        .expect(400);

      expect(response.body.code).toBe('ROLE_LOCKED');
    });
  });

  describe('staff user administration', () => {
    it('invites, re-roles, disables and enables a staff user', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const client = await signIn(context, admin.email, admin.password);
      const token = await context.csrf(client);
      const email = `invited-${Date.now()}@egna.test`;

      const invited = await client
        .post('/api/v1/staff/users/invite')
        .set('X-CSRF-Token', token)
        .send({ email, name: 'Invited Person', role: 'OPERATIONS' })
        .expect(201);

      expect(invited.body).toMatchObject({ email, role: 'OPERATIONS', status: 'INVITED' });
      expect(mailSpy.sendStaffInvite).toHaveBeenCalled();

      const userId = invited.body.id as string;

      // An invited account cannot sign in yet.
      const inviteClient = context.agent();
      const inviteToken = await context.csrf(inviteClient);
      await inviteClient
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', inviteToken)
        .send({ email, password: 'AnyPassword123' })
        .expect(401);

      await client
        .patch(`/api/v1/staff/users/${userId}/role`)
        .set('X-CSRF-Token', token)
        .send({ role: 'FINANCE' })
        .expect(200);

      await client
        .post(`/api/v1/staff/users/${userId}/disable`)
        .set('X-CSRF-Token', token)
        .expect(200);
      await client
        .post(`/api/v1/staff/users/${userId}/enable`)
        .set('X-CSRF-Token', token)
        .expect(200);

      const listed = await client.get(`/api/v1/staff/users?search=${encodeURIComponent(email)}`);
      expect(listed.body.items[0]).toMatchObject({ email, role: 'FINANCE', status: 'ACTIVE' });
    });

    it('protects the last active admin', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const client = await signIn(context, admin.email, admin.password);
      const token = await context.csrf(client);

      const disabled = await client
        .post(`/api/v1/staff/users/${admin.id}/disable`)
        .set('X-CSRF-Token', token)
        .expect(400);
      expect(disabled.body.code).toBe('CANNOT_DISABLE_SELF');

      const demoted = await client
        .patch(`/api/v1/staff/users/${admin.id}/role`)
        .set('X-CSRF-Token', token)
        .send({ role: 'OPERATIONS' })
        .expect(400);
      expect(demoted.body.code).toBe('CANNOT_DEMOTE_SELF');
    });

    it('never demotes the last active admin', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const adminClient = await signIn(context, admin.email, admin.password);
      const adminToken = await context.csrf(adminClient);

      const target = await context.createUser({ role: 'ADMIN' });
      const actor = await context.createUser({ role: 'OPERATIONS' });
      const actorClient = await signIn(context, actor.email, actor.password);
      const actorToken = await context.csrf(actorClient);

      // The operations role gets the permission to manage users.
      await adminClient
        .put('/api/v1/staff/roles/OPERATIONS/permissions')
        .set('X-CSRF-Token', adminToken)
        .send({ permissions: ['tasks.view', 'users.manage'] })
        .expect(200);

      // Make the target the only active admin, so the rule can be tested.
      const otherAdmins = await prisma.user.findMany({
        where: { status: 'ACTIVE', id: { not: target.id }, roles: { some: { roleName: 'ADMIN' } } },
        select: { id: true },
      });
      for (const other of otherAdmins) {
        await prisma.user.update({ where: { id: other.id }, data: { status: 'DISABLED' } });
      }

      // Put them back, the test must not change the rest of the database.
      const restore = async () => {
        for (const other of otherAdmins) {
          await prisma.user.update({ where: { id: other.id }, data: { status: 'ACTIVE' } });
        }
      };

      const response = await actorClient
        .patch(`/api/v1/staff/users/${target.id}/role`)
        .set('X-CSRF-Token', actorToken)
        .send({ role: 'OPERATIONS' })
        .expect(400);

      expect(response.body.code).toBe('LAST_ADMIN');

      // Disabling the last admin is protected as well.
      const disabled = await actorClient
        .post(`/api/v1/staff/users/${target.id}/disable`)
        .set('X-CSRF-Token', actorToken)
        .expect(400);
      expect(disabled.body.code).toBe('LAST_ADMIN');

      await restore();
    });
  });

  describe('audit log', () => {
    it('writes a row for every audited action', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const client = await signIn(context, admin.email, admin.password);
      const token = await context.csrf(client);

      const invited = await client
        .post('/api/v1/staff/users/invite')
        .set('X-CSRF-Token', token)
        .send({ email: `audited-${Date.now()}@egna.test`, name: 'Audited', role: 'OPERATIONS' })
        .expect(201);

      const userId = invited.body.id as string;

      await client
        .patch(`/api/v1/staff/users/${userId}/role`)
        .set('X-CSRF-Token', token)
        .send({ role: 'FINANCE' })
        .expect(200);
      await client
        .post(`/api/v1/staff/users/${userId}/disable`)
        .set('X-CSRF-Token', token)
        .expect(200);
      await client
        .post(`/api/v1/staff/users/${userId}/enable`)
        .set('X-CSRF-Token', token)
        .expect(200);
      await client
        .put('/api/v1/staff/roles/OPERATIONS/permissions')
        .set('X-CSRF-Token', token)
        .send({ permissions: ['tasks.view'] })
        .expect(200);
      await client.get('/api/v1/staff/audit/export.csv').set('X-CSRF-Token', token).expect(200);
      // The export comes before the sign out, because signing out everywhere
      // revokes the session this request uses.
      await client.post('/api/v1/auth/logout-all').set('X-CSRF-Token', token).expect(200);

      const actions = (
        await prisma.auditLog.findMany({
          where: { actorId: admin.id },
          select: { action: true },
        })
      ).map((entry) => entry.action);

      for (const action of [
        'auth.login_success',
        'auth.logout_all',
        'user.invited',
        'user.role_changed',
        'user.disabled',
        'user.enabled',
        'role.permissions_changed',
        'audit.exported',
      ]) {
        expect(actions).toContain(action);
      }
    });

    it('never stores a password hash or a token', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const client = await signIn(context, admin.email, admin.password);
      const token = await context.csrf(client);

      await client
        .post('/api/v1/staff/users/invite')
        .set('X-CSRF-Token', token)
        .send({ email: `clean-${Date.now()}@egna.test`, name: 'Clean', role: 'OPERATIONS' })
        .expect(201);

      const rows = await prisma.auditLog.findMany({
        where: { actorId: admin.id },
        select: { after: true, before: true },
      });

      const serialised = JSON.stringify(rows);
      expect(serialised).not.toContain('$argon2');
      expect(serialised).not.toContain(admin.password);
    });

    it('blocks updates and deletes on the audit log', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      await signIn(context, admin.email, admin.password);

      const row = await prisma.auditLog.findFirst({
        where: { actorId: admin.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(row).not.toBeNull();

      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE audit_log SET action = 'tampered' WHERE id = '${row?.id}'`,
        ),
      ).rejects.toThrow();

      await expect(
        prisma.$executeRawUnsafe(`DELETE FROM audit_log WHERE id = '${row?.id}'`),
      ).rejects.toThrow();

      const stillThere = await prisma.auditLog.findUnique({ where: { id: row?.id } });
      expect(stillThere).not.toBeNull();
    });

    it('lists the audit log and exports it as CSV', async () => {
      const admin = await context.createUser({ role: 'ADMIN' });
      const client = await signIn(context, admin.email, admin.password);

      const list = await client.get('/api/v1/staff/audit?pageSize=5').expect(200);
      expect(list.body.items.length).toBeGreaterThan(0);
      expect(list.body.items[0]).toHaveProperty('action');

      const csv = await client.get('/api/v1/staff/audit/export.csv').expect(200);
      expect(csv.headers['content-type']).toContain('text/csv');
      expect(csv.headers['content-disposition']).toContain('attachment');
      expect(csv.text.split('\n')[0]).toContain('time,actor');
    });
  });
});
