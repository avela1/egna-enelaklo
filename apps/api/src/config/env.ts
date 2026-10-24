// Loads `apps/api/.env` before the environment is read. The import must stay
// first: everything below reads process.env at module load time.
import 'dotenv/config';
import { z } from 'zod';

/**
 * Typed environment validation. The API refuses to boot with an invalid
 * environment instead of failing later with a confusing runtime error.
 */
const booleanish = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  API_PREFIX: z.string().min(1).default('api/v1'),

  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://egna:egna@localhost:5432/egna_dev?schema=public'),

  WEB_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  /** Public URL of the web app, used to build the links in the emails. */
  WEB_URL: z.string().min(1).default('http://localhost:5173'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  /** Used in Phase 1 for signed session cookies. Required in production. */
  SESSION_SECRET: z.string().min(32).optional(),
  COOKIE_DOMAIN: z.string().optional(),

  /** Sliding lifetime of a session, and the hard cap. */
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  SESSION_ABSOLUTE_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),

  /** Failed sign in attempts before the account is locked. */
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),

  /** Lifetimes of the single use email tokens, in minutes. */
  VERIFY_EMAIL_TOKEN_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .default(24 * 60),
  RESET_PASSWORD_TOKEN_MINUTES: z.coerce.number().int().min(5).default(60),
  INVITE_TOKEN_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .default(72 * 60),

  /** Password used by the development seed. Never a real credential. */
  SEED_PASSWORD: z.string().min(10).optional(),

  /** Rate limits, per IP and per minute. */
  AUTH_RATE_LIMIT: z.coerce.number().int().min(1).max(1000).default(10),
  RATE_LIMIT: z.coerce.number().int().min(1).max(10_000).default(120),

  /** Mailpit in local development. Prefer 127.0.0.1: `localhost` can hang on Windows. */
  SMTP_HOST: z.string().default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('egna-enelaklo <no-reply@egna-enelaklo.local>'),
  SMTP_SECURE: booleanish.default('false'),

  /** Object storage (MinIO locally) — the bucket is PRIVATE. */
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('egna-private'),
  S3_ACCESS_KEY_ID: z.string().default('egna'),
  S3_SECRET_ACCESS_KEY: z.string().default('egna-secret'),
  S3_FORCE_PATH_STYLE: booleanish.default('true'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}

export const env: Env = loadEnv();

/** Origins allowed to call the API with credentials. */
export function allowedOrigins(): string[] {
  return env.WEB_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export const isProduction = env.NODE_ENV === 'production';
