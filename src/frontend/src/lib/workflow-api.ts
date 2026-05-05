import { buildAuthHeaders } from './_request';

// Client for the hr-workflow Fastify gateway (Camunda 7 BPMN orchestration).
// Pattern follows lib/api.ts but points at a separate base URL — workflow
// runs on its own port (3001 by default).

const BASE_URL = process.env.NEXT_PUBLIC_WORKFLOW_API_URL ?? 'http://localhost:3001';

export type WorkflowBenefitType =
  | 'medical-reimbursement'
  | 'training'
  | 'travel-allowance';

export type WorkflowStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface BenefitRequestInput {
  requesterId: string;
  managerId: string;
  benefitType: WorkflowBenefitType;
  amount: number;
  description: string;
  attachmentUrl?: string;
}

export interface WorkflowStartResponse {
  /** Camunda process-instance id */
  id: string;
  definitionId: string;
  businessKey: string | null;
}

export interface WorkflowStatusResponse {
  status: WorkflowStatus;
  lastUpdate: string;
}

async function readErrorText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return res.statusText;
  }
}

export async function submitBenefitRequest(
  input: BenefitRequestInput,
): Promise<WorkflowStartResponse> {
  const headers = await buildAuthHeaders();
  const res = await fetch(`${BASE_URL}/workflows/benefit-request/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(`workflow-api submitBenefitRequest failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<WorkflowStartResponse>;
}

export async function getBenefitRequestStatus(
  instanceId: string,
): Promise<WorkflowStatusResponse> {
  const headers = await buildAuthHeaders();
  const res = await fetch(
    `${BASE_URL}/workflows/benefit-request/${encodeURIComponent(instanceId)}/status`,
    { method: 'GET', headers },
  );
  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(`workflow-api getBenefitRequestStatus failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<WorkflowStatusResponse>;
}

// ---------------------------------------------------------------------------
// Manager task list (Humi-styled approval page; replaces Camunda Tasklist).
// ---------------------------------------------------------------------------

export interface PendingTaskSummary {
  id: string;
  name: string;
  created: string;
  assignee: string | null;
  instanceId: string;
  processDefinitionKey: string;
  variables: {
    requesterId: string;
    managerId: string;
    benefitType: string;
    amount: number;
    description: string;
  };
}

export interface PendingTaskFilter {
  assignee?: string;
  candidateGroups?: string;
}

export async function listPendingTasks(
  filter: PendingTaskFilter,
): Promise<PendingTaskSummary[]> {
  const headers = await buildAuthHeaders();
  const params = new URLSearchParams();
  if (filter.assignee) params.set('assignee', filter.assignee);
  if (filter.candidateGroups) params.set('candidateGroups', filter.candidateGroups);

  const res = await fetch(`${BASE_URL}/workflows/tasks?${params.toString()}`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(`workflow-api listPendingTasks failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<PendingTaskSummary[]>;
}

export async function completeTask(
  taskId: string,
  decision: { approved: boolean; reviewerComment?: string },
): Promise<void> {
  const headers = await buildAuthHeaders();
  const res = await fetch(
    `${BASE_URL}/workflows/tasks/${encodeURIComponent(taskId)}/complete`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(decision),
    },
  );
  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(`workflow-api completeTask failed (${res.status}): ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Benefit-request timeline (detail page).
// ---------------------------------------------------------------------------

export interface TimelineEvent {
  activityId: string;
  activityName: string;
  activityType: 'startEvent' | 'userTask' | 'serviceTask' | 'endEvent' | string;
  startTime: string;
  endTime: string | null;
  durationMs: number | null;
  taskId: string | null;
}

export interface BenefitRequestTimeline {
  instanceId: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  submittedAt: string;
  completedAt: string | null;
  variables: Record<string, unknown>;
  timeline: TimelineEvent[];
}

export async function getBenefitRequestTimeline(
  instanceId: string,
): Promise<BenefitRequestTimeline> {
  const headers = await buildAuthHeaders();
  const res = await fetch(
    `${BASE_URL}/workflows/benefit-request/${encodeURIComponent(instanceId)}/timeline`,
    { method: 'GET', headers },
  );
  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(`workflow-api getBenefitRequestTimeline failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<BenefitRequestTimeline>;
}
