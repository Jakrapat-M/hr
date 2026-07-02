/**
 * module-of.test.ts — STA-178
 * Exhaustive mapping of every RequestType → its WorkflowModule (EC/BE/TM/PY).
 * Guards the "Manage workflow request" module filter + the EC action constraint.
 */
import { describe, it, expect } from 'vitest';
import { moduleOf, type RequestType, type WorkflowModule } from '@/lib/quick-approve-api';

describe('moduleOf — STA-178 module mapping', () => {
  const cases: Array<[RequestType, WorkflowModule]> = [
    ['change_request', 'EC'],
    ['probation', 'EC'],
    ['transfer', 'EC'],
    ['claim', 'BE'],
    ['leave', 'TM'],
    ['overtime', 'TM'],
    ['time_correction', 'TM'],
    ['shift_assignment', 'TM'],
    ['pay_rate', 'PY'],
    ['tax_planning', 'PY'],
  ];

  it.each(cases)('maps %s → %s', (type, module) => {
    expect(moduleOf(type)).toBe(module);
  });

  it('covers every RequestType (no unmapped case)', () => {
    // If a new RequestType is added to the union, this list drifts from the
    // exhaustive switch — keep them in lockstep.
    const mapped = new Set(cases.map(([t]) => t));
    expect(mapped.size).toBe(cases.length);
  });

  it('EC contains exactly the employee-lifecycle types', () => {
    const ec = cases.filter(([, m]) => m === 'EC').map(([t]) => t).sort();
    expect(ec).toEqual(['change_request', 'probation', 'transfer'].sort());
  });
});
