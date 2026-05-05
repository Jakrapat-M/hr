import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  submitBenefitRequest,
  getBenefitRequestStatus,
  listPendingTasks,
  completeTask,
  getBenefitRequestTimeline,
} from '@/lib/workflow-api';

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

  // -------------------------------------------------------------------------
  // listPendingTasks + completeTask (Humi-styled manager approval page)
  // -------------------------------------------------------------------------

  it('listPendingTasks GETs /workflows/tasks with assignee querystring and parses array result', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('http://localhost:3001/workflows/tasks?assignee=mgr-default');
      expect(init?.method).toBe('GET');
      const headers = init?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-token');
      return new Response(
        JSON.stringify([
          {
            id: 'task-1',
            name: 'Approve benefit request',
            created: '2026-05-04T09:00:00.000Z',
            assignee: 'mgr-default',
            instanceId: 'pi-001',
            processDefinitionKey: 'benefit-request',
            variables: {
              requesterId: 'emp-042',
              managerId: 'mgr-default',
              benefitType: 'medical-reimbursement',
              amount: 3000,
              description: 'Dentist visit',
            },
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const tasks = await listPendingTasks({ assignee: 'mgr-default' });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('task-1');
    expect(tasks[0].variables.amount).toBe(3000);
    expect(tasks[0].processDefinitionKey).toBe('benefit-request');
  });

  it('completeTask POSTs the approval decision and resolves on 204', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('http://localhost:3001/workflows/tasks/task-1/complete');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({
        approved: true,
        reviewerComment: 'LGTM',
      });
      return new Response(null, { status: 204 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      completeTask('task-1', { approved: true, reviewerComment: 'LGTM' }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('completeTask throws when the gateway responds with an error', async () => {
    global.fetch = vi.fn(async () =>
      new Response('task already completed', { status: 409 }),
    ) as unknown as typeof fetch;

    await expect(
      completeTask('task-x', { approved: false }),
    ).rejects.toThrow(/409/);
  });

  it('getBenefitRequestTimeline GETs the timeline URL and returns parsed response', async () => {
    const sampleTimeline = {
      instanceId: 'pi-abc-123',
      status: 'approved',
      submittedAt: '2026-05-01T09:00:00Z',
      completedAt: '2026-05-02T10:30:00Z',
      variables: { requesterId: 'emp-042', amount: 3000 },
      timeline: [
        {
          activityId: 'start_event_submit',
          activityName: 'Submit Request',
          activityType: 'startEvent',
          startTime: '2026-05-01T09:00:00Z',
          endTime: '2026-05-01T09:00:01Z',
          durationMs: 1000,
          taskId: null,
        },
        {
          activityId: 'user_task_manager_review',
          activityName: 'Manager Review',
          activityType: 'userTask',
          startTime: '2026-05-01T09:01:00Z',
          endTime: '2026-05-02T10:30:00Z',
          durationMs: 92340000,
          taskId: 'task-1',
        },
      ],
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('http://localhost:3001/workflows/benefit-request/pi-abc-123/timeline');
      expect(init?.method).toBe('GET');
      const headers = init?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-token');
      return new Response(JSON.stringify(sampleTimeline), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getBenefitRequestTimeline('pi-abc-123');
    expect(result.instanceId).toBe('pi-abc-123');
    expect(result.status).toBe('approved');
    expect(result.timeline).toHaveLength(2);
    expect(result.timeline[0].activityId).toBe('start_event_submit');
    expect(result.timeline[1].taskId).toBe('task-1');
    expect(result.variables).toEqual({ requesterId: 'emp-042', amount: 3000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
