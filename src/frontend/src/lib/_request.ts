import { getSession } from 'next-auth/react';

// Shared header construction for `lib/api.ts` (HRMS API) and
// `lib/workflow-api.ts` (hr-workflow Fastify gateway). Kept tiny and local —
// no retry/network policy here.

export async function buildAuthHeaders(): Promise<HeadersInit> {
  const session = await getSession();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  return headers;
}
