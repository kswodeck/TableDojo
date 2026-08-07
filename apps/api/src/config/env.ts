import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment is parsed and validated once, at boot. The old app read
 * `process.env` inline all over the place and silently started with an
 * undefined database URL, so a misconfigured deploy failed at the first
 * request instead of at startup.
 */
const csv = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  HOST: z.string().default('0.0.0.0'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters — generate one with crypto.randomBytes(48)'),
  SESSION_COOKIE_NAME: z.string().default('td.sid'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional(),

  CORS_ORIGINS: csv,
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),

  SENTRY_DSN: z.string().default(''),
  SMTP_URL: z.string().default(''),
  MAIL_FROM: z.string().default('Table Dojo <no-reply@tabledojo.com>'),
  CONTACT_TO: z.string().default(''),

  /** Trust proxy hop count; set to 1 behind a single load balancer. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

function loadEnv() {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}\n\nSee .env.example for the full list.`);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export type Env = typeof env;
