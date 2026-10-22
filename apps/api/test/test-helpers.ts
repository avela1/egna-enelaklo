import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/common/mail/mail.service';
import { seedCatalogue, seedProhibitedItems, seedRolesAndPermissions } from '../prisma/seed-data';

export const TEST_PASSWORD = 'TestPassword2026';

export interface MailSpy {
  sendPasswordReset: jest.Mock;
  sendStaffInvite: jest.Mock;
  sendVerifyEmail: jest.Mock;
}

export const mailSpy: MailSpy = {
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  sendStaffInvite: jest.fn().mockResolvedValue(undefined),
  sendVerifyEmail: jest.fn().mockResolvedValue(undefined),
};

export const prisma = new PrismaClient();

/** A signed in agent with its own cookie jar. */
export type Agent = request.Agent;

export type TestRole = 'CUSTOMER' | 'TASKER' | 'OPERATIONS' | 'FINANCE' | 'ADMIN';
export type TestStatus = 'ACTIVE' | 'DISABLED' | 'INVITED';

export interface TestUser {
  email: string;
  id: string;
  password: string;
}

export interface TestContext {
  agent: () => Agent;
  app: INestApplication;
  createUser: (options?: {
    email?: string;
    name?: string;
    password?: string;
    role?: TestRole;
    status?: TestStatus;
  }) => Promise<TestUser>;
  csrf: (agent: Agent) => Promise<string>;
}

let counter = 0;

/** A unique email per test, so the suite can run against a real database. */
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@egna.test`;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mailSpy)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  await seedRolesAndPermissions(prisma);
  await seedCatalogue(prisma);
  await seedProhibitedItems(prisma);

  const agent = () => request.agent(app.getHttpServer());

  const csrf = async (client: Agent): Promise<string> => {
    const response = await client.get('/api/v1/auth/csrf');
    return response.body.csrfToken as string;
  };

  const createUser = async (
    userOptions: {
      email?: string;
      name?: string;
      password?: string;
      role?: TestRole;
      status?: TestStatus;
    } = {},
  ): Promise<TestUser> => {
    const email = userOptions.email ?? uniqueEmail('user');
    const password = userOptions.password ?? TEST_PASSWORD;
    const role = userOptions.role ?? 'CUSTOMER';
    const status = userOptions.status ?? 'ACTIVE';

    const user = await prisma.user.create({
      data: {
        email,
        name: userOptions.name ?? 'Test User',
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        status,
        emailVerifiedAt: status === 'ACTIVE' ? new Date() : null,
        roles: { create: { roleName: role, isPrimary: true } },
      },
    });

    return { id: user.id, email, password };
  };

  return { app, agent, csrf, createUser };
}

/** Signs a user in and returns the agent with an active session. */
export async function signIn(
  context: TestContext,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<Agent> {
  const client = context.agent();
  const token = await context.csrf(client);

  await client
    .post('/api/v1/auth/login')
    .set('X-CSRF-Token', token)
    .send({ email, password })
    .expect(200);

  return client;
}
