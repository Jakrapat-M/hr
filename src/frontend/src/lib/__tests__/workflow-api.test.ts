import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitBenefitRequest, getBenefitRequestStatus } from '@/lib/workflow-api';

// next-auth/react is imported transitively via _request.ts; stub getSession
// so the helper does not try to hit /api/auth/session in jsdom.
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(async () => ({ accessToken: 'test-token' })),
}));

describe('workflow-api', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_WORKFLOW_API_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('POSTs to /workflows/benefit-request/start with the correct body and returns parsed JSON', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('http://localhost:3001/workflows/benefit-request/start');
      expect(init?.method).toBe('POST');
      const headers = init?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer test-token');
      expect(JSON.parse(init?.body as string)).toEqual({
        requesterId: 'EMP001',
        managerId: 'mgr-default',
        benefitType: 'medical-reimbursement',
        amount: 1500,
        description: 'OPD claim',
      });
      return new Response(
        JSON.stringify({
          id: 'pi-abc-123',
          definitionId: 'benefit-request:1:9',
          businessKey: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await submitBenefitRequest({
      requesterId: 'EMP001',
      managerId: 'mgr-default',
      benefitType: 'medical-reimbursement',
      amount: 1500,
      description: 'OPD claim',
    });

    expect(res).toEqual({
      id: 'pi-abc-123',
      definitionId: 'benefit-request:1:9',
      businessKey: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws an Error containing the response body when the gateway returns 4xx', async () => {
    global.fetch = vi.fn(async () =>
      new Response('validation: managerId required', { status: 400 }),
    ) as unknown as typeof fetch;

    await expect(
      submitBenefitRequest({
        requesterId: 'EMP001',
        managerId: '',
        benefitType: 'training',
        amount: 0,
        description: '',
      }),
    ).rejects.toThrow(/400/);
  });

  it('getBenefitRequestStatus GETs the per-instance status URL with auth header', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('http://localhost:3001/workflows/benefit-request/pi-abc-123/status');
      expect(init?.method).toBe('GET');
      const headers = init?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer test-token');
      return new Response(
        JSON.stringify({ status: 'approved', lastUpdate: '2026-05-04T01:23:45Z' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await getBenefitRequestStatus('pi-abc-123');
    expect(res.status).toBe('approved');
    expect(res.lastUpdate).toBe('2026-05-04T01:23:45Z');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('getBenefitRequestStatus throws an Error containing the status when server returns 404', async () => {
    global.fetch = vi.fn(async () =>
      new Response('instance not found', { status: 404 }),
    ) as unknown as typeof fetch;

    await expect(getBenefitRequestStatus('pi-unknown')).rejects.toThrow(/404/);
  });
});
