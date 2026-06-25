import { describe, it, expect } from 'vitest';
import {
  validateBenefitRows,
  type BenefitAssignmentRow,
} from '@/components/admin/import/subjects/benefitPlanConfig';
import { BENEFIT_PLAN_REGISTRY } from '@/data/benefits/plan-registry';

// A real plan id + a real-ish employee set for the classifier.
const REAL_PLAN = BENEFIT_PLAN_REGISTRY[0].id; // e.g. BE-MED-001
const KNOWN = new Set(['EMP-0001', 'EMP-0002', 'EMP-0003']);

const base = (over: Partial<BenefitAssignmentRow>): BenefitAssignmentRow => ({
  employee_id: 'EMP-0001',
  employee_name: 'Test',
  action: 'add',
  plan_code: REAL_PLAN,
  plan_name: 'Plan',
  entitle_amount: 10000,
  effective_date: '2026-01-01',
  ...over,
});

describe('STA-115 — validateBenefitRows', () => {
  it('a valid add row is ok', () => {
    const [v] = validateBenefitRows([base({})], KNOWN);
    expect(v.severity).toBe('ok');
  });

  it('an unknown employee_id is an error', () => {
    const [v] = validateBenefitRows([base({ employee_id: 'EMP-9999' })], KNOWN);
    expect(v.severity).toBe('error');
    expect(v.messageEn).toMatch(/Unknown employee/);
  });

  it('an unknown plan_code is an error', () => {
    const [v] = validateBenefitRows([base({ plan_code: 'BE-XXX-000' })], KNOWN);
    expect(v.severity).toBe('error');
    expect(v.messageEn).toMatch(/Unknown plan/);
  });

  it('an invalid action is an error', () => {
    const [v] = validateBenefitRows([base({ action: 'delete' as unknown as 'add' })], KNOWN);
    expect(v.severity).toBe('error');
  });

  it('a negative / NaN amount is an error', () => {
    expect(validateBenefitRows([base({ entitle_amount: -1 })], KNOWN)[0].severity).toBe('error');
    expect(validateBenefitRows([base({ entitle_amount: Number.NaN })], KNOWN)[0].severity).toBe('error');
  });

  it('a malformed effective_date or end<start is an error', () => {
    expect(validateBenefitRows([base({ effective_date: '01/01/2026' })], KNOWN)[0].severity).toBe('error');
    expect(validateBenefitRows([base({ effective_date: '2026-05-01', effective_end_date: '2026-01-01' })], KNOWN)[0].severity).toBe('error');
  });

  it('an adjust row (valid) is a warning (verify holding)', () => {
    const [v] = validateBenefitRows([base({ action: 'adjust' })], KNOWN);
    expect(v.severity).toBe('warning');
    expect(v.messageEn).toMatch(/Adjust/);
  });

  it('a duplicate employee+plan is a warning on the second occurrence', () => {
    const rows = [base({}), base({})]; // same EMP-0001 + same plan
    const res = validateBenefitRows(rows, KNOWN);
    expect(res[0].severity).toBe('ok');
    expect(res[1].severity).toBe('warning');
    expect(res[1].messageEn).toMatch(/Duplicate/);
  });

  it('returns exactly one ValidationItem per row, 1-based', () => {
    const rows = [base({}), base({ employee_id: 'EMP-0002' }), base({ employee_id: 'EMP-0003' })];
    const res = validateBenefitRows(rows, KNOWN);
    expect(res.map((r) => r.row)).toEqual([1, 2, 3]);
  });
});
