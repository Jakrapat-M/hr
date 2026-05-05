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
