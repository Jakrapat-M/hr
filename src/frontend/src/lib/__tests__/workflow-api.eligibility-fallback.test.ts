import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getEligibilityRuleHistory,
  listAllEligibilityRules,
  listEligibilityRules,
} from '@/lib/workflow-api';
import { MOCK_ELIGIBILITY_RULES } from '@/data/benefits/mock-eligibility-rules';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

describe('workflow-api eligibility fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mock entitlement rules when the workflow gateway is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));

    const rules = await listAllEligibilityRules();

    expect(rules).toHaveLength(MOCK_ELIGIBILITY_RULES.length);
    expect(rules.map((rule) => rule.id)).toContain('rule-med-001');
  });

  it('returns mock rules when the gateway responds with an empty rule set', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ benefitKey: 'medical-reimbursement', rules: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const rules = await listEligibilityRules('medical-reimbursement');

    expect(rules.map((rule) => rule.id)).toEqual(['rule-med-001', 'rule-med-002', 'rule-med-003']);
  });

  it('returns mock history for seeded rules when history endpoint is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));

    const history = await getEligibilityRuleHistory('medical-reimbursement', 'rule-med-001');

    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('rule-med-001');
    expect(history[1].id).toBe('rule-med-001-prev');
  });
});
