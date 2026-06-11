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

/**
 * Block until the workflow is observable (status fetch returns 200 with a
 * defined status). Closes the race window where the form completes faster
 * than Camunda creates the user task — without this, /approvals can render
 * the local Mock card before the Camunda lane has populated, and the
 * reviewer ends up approving the wrong card.
 *
 * Returns true when ready, false on timeout. Caller is expected to proceed
 * regardless (the timeout path logs a warning so the redirect doesn't hang
 * forever if Camunda is genuinely slow).
 */
export async function waitUntilWorkflowReady(
  instanceId: string,
  opts: { timeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 5000;
  const pollIntervalMs = opts.pollIntervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const status = await getBenefitRequestStatus(instanceId);
      if (status?.status) return true;
    } catch {
      // 404 / network — keep polling until deadline
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return false;
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
// Eligibility admin (Phase 3 — Admin UI).
// ---------------------------------------------------------------------------

export interface EligibilityRule {
  id: string;
  benefit_key: string;
  scope_type: 'role' | 'position' | 'department' | 'individual' | 'entitlement';
  scope_value: string;
  allow: boolean;
  max_per_month: number | null;
  max_per_year: number | null;
  auto_approve_max: number | null;
  created_by: string;
  effective_from: string;
  effective_to: string | null;
  // SF-aligned fields
  rule_name?: string | null;
  // STA-99: Excel "Rule type (Standard/Special)" — most BA rows are "Special".
  rule_type?: 'standard' | 'special' | null;
  status?: string | null;
  policy_profile: string | null;
  business_unit?: string | null;
  business_group?: string | null;
  company: string | null;
  company_code?: string | null;
  job_code: string | null;
  employee_group: string | null;
  employee_subgroup?: string | null;
  dvt_project?: string | null;
  pg_from: number | null;
  pg_to: number | null;
  plan_effective: string | null;
  waiting_period?: number | null;
  waiting_period_days?: number | null;
  effective_type?: 'hire_date' | 'pass_probation_date' | 'day_from_hire_date' | 'hour_from_hire_date' | null;
  no_of_years_from_hiring: number | null;
  hiring_date_from: string | null;
  hiring_date_to: string | null;
  claim_period?: string | null;
  entitlement_amount: number | null;
  max_per_claim: number | null;
  additional_condition: string | null;
  rule_id?: string | null;
  plan_id?: string | null;
}

export interface EligibilityRuleInput {
  scope_type: EligibilityRule['scope_type'];
  scope_value: string;
  allow: boolean;
  max_per_month?: number | null;
  max_per_year?: number | null;
  auto_approve_max?: number | null;
  created_by: string;
  // SF-aligned fields
  rule_name?: string | null;
  // STA-99: Excel "Rule type (Standard/Special)".
  rule_type?: 'standard' | 'special' | null;
  status?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  policy_profile?: string | null;
  business_unit?: string | null;
  business_group?: string | null;
  company?: string | null;
  company_code?: string | null;
  job_code?: string | null;
  employee_group?: string | null;
  employee_subgroup?: string | null;
  dvt_project?: string | null;
  pg_from?: number | null;
  pg_to?: number | null;
  plan_effective?: string | null;
  waiting_period?: number | null;
  no_of_years_from_hiring?: number | null;
  hiring_date_from?: string | null;
  hiring_date_to?: string | null;
  claim_period?: string | null;
  entitlement_amount?: number | null;
  max_per_claim?: number | null;
  additional_condition?: string | null;
}

export interface BenefitDefinition {
  key: string;
  display_name: string;
  default_policy: 'allow' | 'deny';
  eligibility_enabled: boolean;
}

export const ALL_BENEFIT_KEYS = [
  'medical-reimbursement',
  'training',
  'travel-allowance',
  'fuel-allowance',
] as const;
export type BenefitKey = typeof ALL_BENEFIT_KEYS[number];

export const BENEFIT_PLAN_LABELS: Record<BenefitKey, { th: string; code: string }> = {
  'medical-reimbursement': { th: 'ค่ารักษาพยาบาล', code: 'TH_MAD_001' },
  'training':              { th: 'ค่าฝึกอบรม',      code: 'TH_TRN_001' },
  'travel-allowance':      { th: 'ค่าเดินทาง',      code: 'TH_TRV_001' },
  'fuel-allowance':        { th: 'เบิกค่าน้ำมัน',   code: 'TH_FUL_001' },
};

export async function listAllEligibilityRules(): Promise<EligibilityRule[]> {
  const results = await Promise.all(ALL_BENEFIT_KEYS.map(listEligibilityRules));
  return results.flat();
}

export async function listEligibilityRules(benefitKey: string): Promise<EligibilityRule[]> {
  // UI-mockup-phase fallback: when the workflow gateway is unavailable (no backend
  // in this phase), return the mock seed so /admin/benefits/rules has visible
  // example rows. Real gateway response takes precedence when available.
  //
  // 1500 ms hard cap via AbortController prevents the 75-second per-request
  // connection-timeout that browsers wait for an unreachable host. Without this
  // the page would hang for minutes per benefit key before showing mock data.
  const mockFallback = async () => {
    const mod = await import('@/data/benefits/mock-eligibility-rules');
    return mod.mockEligibilityRulesByKey(benefitKey) as unknown as EligibilityRule[];
  };
  try {
    const headers = await buildAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    let res: Response;
    try {
      res = await fetch(
        `${BASE_URL}/admin/benefits/${encodeURIComponent(benefitKey)}/eligibility`,
        { method: 'GET', headers, signal: controller.signal },
      );
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) return mockFallback();
    const body = (await res.json()) as { benefitKey: string; rules: EligibilityRule[] };
    const rules = Array.isArray(body) ? (body as unknown as EligibilityRule[]) : (body.rules ?? []);
    const base = rules.length > 0 ? rules : await mockFallback();
    const local = _readLocal(benefitKey);
    if (local.length === 0) return base;
    // Merge: local rules override/extend the base set by id
    const baseIds = new Set(base.map((r) => r.id));
    const merged = [...base];
    for (const lr of local) {
      if (baseIds.has(lr.id)) {
        const idx = merged.findIndex((r) => r.id === lr.id);
        merged[idx] = lr;
      } else {
        merged.push(lr);
      }
    }
    return merged;
  } catch {
    // Network error / abort / fetch threw → return mock seed + local
    const base = await mockFallback();
    const local = _readLocal(benefitKey);
    if (local.length === 0) return base;
    const baseIds = new Set(base.map((r) => r.id));
    const merged = [...base];
    for (const lr of local) {
      if (baseIds.has(lr.id)) {
        const idx = merged.findIndex((r) => r.id === lr.id);
        merged[idx] = lr;
      } else {
        merged.push(lr);
      }
    }
    return merged;
  }
}

// ---------------------------------------------------------------------------
// Local-storage fallback store for add/update/delete when gateway unavailable.
// Key: `eligibility_rules_local_${benefitKey}`
// Value: JSON array of EligibilityRule (extra items only — merged with mock seed
//        on read in listEligibilityRules above).
// ---------------------------------------------------------------------------

function _localKey(benefitKey: string): string {
  return `eligibility_rules_local_${benefitKey}`;
}

function _readLocal(benefitKey: string): EligibilityRule[] {
  try {
    const raw = localStorage.getItem(_localKey(benefitKey));
    return raw ? (JSON.parse(raw) as EligibilityRule[]) : [];
  } catch {
    return [];
  }
}

function _writeLocal(benefitKey: string, rules: EligibilityRule[]): void {
  try {
    localStorage.setItem(_localKey(benefitKey), JSON.stringify(rules));
  } catch {
    // storage quota or SSR — ignore
  }
}

export async function addEligibilityRule(
  benefitKey: string,
  rule: EligibilityRuleInput,
): Promise<EligibilityRule> {
  try {
    const headers = await buildAuthHeaders();
    const res = await fetch(
      `${BASE_URL}/admin/benefits/${encodeURIComponent(benefitKey)}/eligibility`,
      { method: 'POST', headers, body: JSON.stringify(rule) },
    );
    if (!res.ok) {
      const text = await readErrorText(res);
      throw new Error(`workflow-api addEligibilityRule failed (${res.status}): ${text}`);
    }
    return res.json() as Promise<EligibilityRule>;
  } catch {
    // Gateway unavailable — persist locally so subsequent listEligibilityRules
    // can surface the new rule without a backend.
    const newRule: EligibilityRule = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      benefit_key: benefitKey,
      scope_type: rule.scope_type,
      scope_value: rule.scope_value,
      allow: rule.allow,
      max_per_month: rule.max_per_month ?? null,
      max_per_year: rule.max_per_year ?? null,
      auto_approve_max: rule.auto_approve_max ?? null,
      created_by: rule.created_by,
      effective_from: rule.effective_from ?? new Date().toISOString().slice(0, 10),
      effective_to: rule.effective_to ?? null,
      rule_id: (rule as unknown as Record<string, unknown>).rule_id as string ?? null,
      rule_name: rule.rule_name ?? null,
      rule_type: rule.rule_type ?? 'special',
      plan_id: (rule as unknown as Record<string, unknown>).plan_id as string ?? null,
      status: rule.status ?? 'active',
      policy_profile: rule.policy_profile ?? null,
      business_unit: rule.business_unit ?? null,
      business_group: rule.business_group ?? null,
      company: rule.company ?? null,
      company_code: rule.company_code ?? null,
      job_code: rule.job_code ?? null,
      employee_group: rule.employee_group ?? null,
      employee_subgroup: rule.employee_subgroup ?? null,
      dvt_project: rule.dvt_project ?? null,
      pg_from: rule.pg_from ?? null,
      pg_to: rule.pg_to ?? null,
      plan_effective: rule.plan_effective ?? null,
      waiting_period_days: (rule as unknown as Record<string, unknown>).waiting_period_days as number ?? null,
      no_of_years_from_hiring: rule.no_of_years_from_hiring ?? null,
      hiring_date_from: rule.hiring_date_from ?? null,
      hiring_date_to: rule.hiring_date_to ?? null,
      claim_period: rule.claim_period ?? null,
      entitlement_amount: rule.entitlement_amount ?? null,
      max_per_claim: rule.max_per_claim ?? null,
      additional_condition: rule.additional_condition ?? null,
      effective_type: (rule as unknown as Record<string, unknown>).effective_type as EligibilityRule['effective_type'] ?? null,
    };
    const existing = _readLocal(benefitKey);
    _writeLocal(benefitKey, [...existing, newRule]);
    return newRule;
  }
}

export async function updateEligibilityRule(
  benefitKey: string,
  ruleId: string,
  input: Partial<EligibilityRuleInput>,
): Promise<EligibilityRule> {
  try {
    const headers = await buildAuthHeaders();
    const res = await fetch(
      `${BASE_URL}/admin/benefits/${encodeURIComponent(benefitKey)}/eligibility/${ruleId}`,
      { method: 'PUT', headers, body: JSON.stringify(input) },
    );
    if (!res.ok) {
      const text = await readErrorText(res);
      throw new Error(`workflow-api updateEligibilityRule failed (${res.status}): ${text}`);
    }
    return res.json() as Promise<EligibilityRule>;
  } catch {
    // Gateway unavailable — apply update to local store.
    const existing = _readLocal(benefitKey);
    const idx = existing.findIndex((r) => r.id === ruleId);
    if (idx === -1) throw new Error(`updateEligibilityRule: rule ${ruleId} not found locally`);
    const updated: EligibilityRule = { ...existing[idx], ...input } as EligibilityRule;
    existing[idx] = updated;
    _writeLocal(benefitKey, existing);
    return updated;
  }
}

export async function getEligibilityRuleHistory(
  benefitKey: string,
  ruleId: string,
): Promise<EligibilityRule[]> {
  // UI-mockup-phase fallback: 1500ms hard cap + mock history seed (current
  // version + one synthetic prior version with effective_to 2025-12-31).
  const mockFallback = async (): Promise<EligibilityRule[]> => {
    const mod = await import('@/data/benefits/mock-eligibility-rules');
    const current = mod.MOCK_ELIGIBILITY_RULES.find(
      (r) => r.id === ruleId && r.benefit_key === benefitKey,
    );
    if (!current) return [];
    const prior = {
      ...current,
      id: `${current.id}-prev`,
      effective_from: '2025-01-01',
      effective_to: '2025-12-31',
      entitlement_amount:
        current.entitlement_amount !== null ? Math.floor(current.entitlement_amount * 0.8) : null,
      max_per_year:
        current.max_per_year !== null ? Math.floor(current.max_per_year * 0.8) : null,
      created_by: 'system-seed',
    };
    return [current, prior] as unknown as EligibilityRule[];
  };
  try {
    const headers = await buildAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    let res: Response;
    try {
      res = await fetch(
        `${BASE_URL}/admin/benefits/${encodeURIComponent(benefitKey)}/eligibility/${ruleId}/history`,
        { method: 'GET', headers, signal: controller.signal },
      );
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) return mockFallback();
    const body = (await res.json()) as { ruleId: string; history: EligibilityRule[] };
    return body.history ?? [];
  } catch {
    return mockFallback();
  }
}

export async function deleteEligibilityRule(benefitKey: string, ruleId: string): Promise<void> {
  try {
    const headers = await buildAuthHeaders();
    const res = await fetch(
      `${BASE_URL}/admin/benefits/${encodeURIComponent(benefitKey)}/eligibility/${ruleId}`,
      { method: 'DELETE', headers },
    );
    if (!res.ok) {
      const text = await readErrorText(res);
      throw new Error(`workflow-api deleteEligibilityRule failed (${res.status}): ${text}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('workflow-api deleteEligibilityRule failed')) {
      throw err;
    }
    // Network unavailable — soft-delete in local store (status=inactive, effective_to=today)
    const local = _readLocal(benefitKey);
    const idx = local.findIndex((r) => r.id === ruleId);
    if (idx !== -1) {
      local[idx] = {
        ...local[idx],
        status: 'inactive',
        effective_to: new Date().toISOString().slice(0, 10),
      };
      _writeLocal(benefitKey, local);
    }
  }
}

export async function getBenefitDefinition(benefitKey: string): Promise<BenefitDefinition> {
  const headers = await buildAuthHeaders();
  const res = await fetch(
    `${BASE_URL}/admin/benefits/${encodeURIComponent(benefitKey)}`,
    { method: 'GET', headers },
  );
  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(`workflow-api getBenefitDefinition failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<BenefitDefinition>;
}

export async function updateBenefitPlan(
  benefitKey: string,
  updates: {
    display_name?: string;
    default_policy?: 'allow' | 'deny';
    // STA-70 plan-config fields carried through the EditPlanModal Identity tab.
    recordType?: string;
    benefitTypeGroup?: string;
  },
): Promise<BenefitDefinition> {
  const headers = await buildAuthHeaders();
  const res = await fetch(
    `${BASE_URL}/admin/benefits/${encodeURIComponent(benefitKey)}`,
    { method: 'PUT', headers, body: JSON.stringify(updates) },
  );
  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(`workflow-api updateBenefitPlan failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<BenefitDefinition>;
}

export interface CreateBenefitPlanInput {
  key: string;
  displayNameTh: string;
  displayNameEn: string;
  category: string;
  recordType: string;
  // STA-70 — benefit type group selected in the CreatePlanModal Identity tab.
  benefitTypeGroup?: string;
  annualLimitThb?: number | null;
  eligibilityRuleId?: string | null;
}

export async function createBenefitPlan(
  input: CreateBenefitPlanInput,
): Promise<{ id: string; key: string }> {
  const headers = await buildAuthHeaders();
  const res = await fetch(`${BASE_URL}/admin/benefits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(`workflow-api createBenefitPlan failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<{ id: string; key: string }>;
}

export async function setEligibilityEnabled(benefitKey: string, enabled: boolean): Promise<void> {
  const headers = await buildAuthHeaders();
  const res = await fetch(
    `${BASE_URL}/admin/benefits/${encodeURIComponent(benefitKey)}/eligibility-enabled`,
    { method: 'PUT', headers, body: JSON.stringify({ enabled }) },
  );
  if (!res.ok) {
    const text = await readErrorText(res);
    throw new Error(`workflow-api setEligibilityEnabled failed (${res.status}): ${text}`);
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
