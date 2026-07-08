import { describe, expect, it, vi } from 'vitest';
import {
  buildTerminationRequestPayload,
  commitApprovedTermination,
  deriveTermination,
  deriveVoluntary,
  normalizeTerminationReason,
} from './termination-request';

vi.mock('@/lib/admin/store/useTimelines', () => ({
  useTimelines: {
    getState: () => ({
      append: appendTimeline,
    }),
  },
}));

vi.mock('@/lib/admin/store/useEmployees', () => ({
  useEmployees: {
    getState: () => ({
      updateEmployee,
    }),
  },
}));

const appendTimeline = vi.fn();
const updateEmployee = vi.fn();

describe('termination-request helpers', () => {
  it('derives termination date from resigned date', () => {
    expect(deriveTermination('2026-06-30')).toEqual({ terminationDate: '2026-07-01' });
  });

  it('derives voluntary value from canonical reason logic', () => {
    expect(deriveVoluntary('TERM_RESIGN')).toBe('voluntary');
    expect(deriveVoluntary('TERM_DISMISS')).toBe('involuntary');
  });

  it('normalizes legacy store reason codes to canonical logic codes', () => {
    expect(normalizeTerminationReason('TERM_RETRIE')).toBe('TERM_RETIRE');
    expect(normalizeTerminationReason('TERM_OTHER')).toBe('TERM_DM');
    expect(normalizeTerminationReason('TERM_RESIGN')).toBe('TERM_RESIGN');
  });

  it('builds one payload shape for ESS and admin forms', () => {
    const payload = buildTerminationRequestPayload(
      {
        employeeId: 'EMP-2001',
        employeeName: 'Mali S.',
        requestedLastDay: '2026-09-30',
        reasonCode: 'TERM_RETRIE',
        reasonForTermination: 'Retirement',
        transferOutTo: 'RIS',
        okToRehire: true,
        additionalInfo: 'Retirement package confirmed',
        personalEmail: 'mali@example.com',
      },
      {
        id: 'HR-1',
        name: 'HR Admin',
        role: 'hr',
        sourceRoute: 'admin',
      },
    );

    expect(payload).toMatchObject({
      employeeId: 'EMP-2001',
      employeeName: 'Mali S.',
      requestedLastDay: '2026-09-30',
      terminationDate: '2026-10-01',
      reasonCode: 'TERM_RETIRE',
      voluntary: 'involuntary',
      reasonForTermination: 'Retirement',
      transferOutTo: 'RIS',
      okToRehire: true,
      additionalInfo: 'Retirement package confirmed',
      personalEmail: 'mali@example.com',
      sourceRoute: 'admin',
      submittedBy: {
        id: 'HR-1',
        name: 'HR Admin',
        role: 'hr',
      },
    });
  });

  it('commits an approved termination to timeline and employee status', () => {
    appendTimeline.mockClear();
    updateEmployee.mockClear();

    commitApprovedTermination({
      id: 'TR-APPROVED',
      employeeId: 'EMP-3001',
      employeeName: 'Arun S.',
      requestedLastDay: '2026-10-31',
      terminationDate: '2026-11-01',
      reasonCode: 'TERM_TRANS',
      reasonForTermination: 'Transfer to BG',
      voluntary: 'involuntary',
      transferOutTo: 'CDS',
      okToRehire: true,
      additionalInfo: 'Move to CDS entity',
    });

    expect(appendTimeline).toHaveBeenCalledWith(
      'EMP-3001',
      expect.objectContaining({
        employeeId: 'EMP-3001',
        kind: 'terminate',
        effectiveDate: '2026-10-31',
        reasonCode: 'TERM_TRANS',
        lastDay: '2026-10-31',
        okToRehire: true,
      }),
    );
    expect(updateEmployee).toHaveBeenCalledWith('EMP-3001', { status: 'terminated' });
  });
});
