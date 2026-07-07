import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '../route';

const VERCEL_KEYS = ['VERCEL_GIT_COMMIT_SHA', 'VERCEL_GIT_COMMIT_REF', 'VERCEL_ENV'] as const;

describe('GET /api/version', () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const key of VERCEL_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of VERCEL_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('falls back to local/development when Vercel envs are absent', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ sha: 'local', ref: null, env: 'development' });
    expect(typeof body.builtAt).toBe('string');
    expect(Number.isNaN(Date.parse(body.builtAt))).toBe(false);
  });

  it('reports the Vercel build identity when the envs are present', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'a'.repeat(40);
    process.env.VERCEL_GIT_COMMIT_REF = 'master';
    process.env.VERCEL_ENV = 'production';
    const body = await GET().json();
    expect(body.sha).toBe('a'.repeat(40));
    expect(body.ref).toBe('master');
    expect(body.env).toBe('production');
  });

  it('never allows caching of the served SHA', () => {
    expect(GET().headers.get('Cache-Control')).toBe('no-store');
  });
});
