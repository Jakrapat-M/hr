import { describe, it, expect, vi } from 'vitest';
import { migrateBenefitClaimsPersist } from '@/stores/benefit-claims';

describe('benefit-claims persist migrate v0 → v1', () => {
  it('back-fills workflowInstanceId=null and workflowStatus=pending on multiple legacy claims', () => {
    const persistedV0 = {
      claims: [
        {
          id: 'BEN-CLM-0001',
          workflowRequestId: 'REQ-BEN-0001',
          employeeId: 'EMP001',
          employeeName: 'จงรักษ์ ทานากะ',
          benefitType: 'medical',
          benefitCode: 'BEN-MED-OPD',
          benefitName: 'ค่ารักษาพยาบาล',
          remainingAmount: 18000,
          currency: 'THB',
          receiptNo: 'RCPT-LEGACY-1',
          receiptDate: '2026-04-15',
          receiptAmount: 4820,
          totalClaimAmount: 4820,
          status: 'pending_spd',
          submittedAt: '2026-04-15T09:20:00.000Z',
          updatedAt: '2026-04-15T09:20:00.000Z',
          attachments: [],
          audit: [],
          version: 1,
          previousVersions: [],
          // intentionally missing workflowInstanceId / workflowStatus
        },
        {
          id: 'BEN-CLM-0002',
          receiptNo: 'RCPT-LEGACY-2',
          receiptDate: '2026-04-20',
          receiptAmount: 1500,
          totalClaimAmount: 1500,
          status: 'approved',
          // also missing workflowInstanceId / workflowStatus
        },
        {
          id: 'BEN-CLM-0003',
          receiptNo: 'RCPT-LEGACY-3',
          receiptDate: '2026-04-25',
          receiptAmount: 800,
          totalClaimAmount: 800,
          status: 'rejected',
          // also missing workflowInstanceId / workflowStatus
        },
      ],
    };

    const migrated = migrateBenefitClaimsPersist(persistedV0, 0) as {
      claims: Array<{ workflowInstanceId: string | null; workflowStatus: string }>;
    };

    expect(migrated.claims).toHaveLength(3);
    for (const claim of migrated.claims) {
      expect(claim.workflowInstanceId).toBeNull();
      expect(claim.workflowStatus).toBe('pending');
    }
  });

  it('preserves existing workflowInstanceId/workflowStatus when already set on v0 claims', () => {
    const persistedV0 = {
      claims: [
        {
          id: 'BEN-CLM-0004',
          workflowInstanceId: 'pi-already-set',
          workflowStatus: 'approved',
        },
      ],
    };
    const migrated = migrateBenefitClaimsPersist(persistedV0, 0) as {
      claims: Array<{ workflowInstanceId: string; workflowStatus: string }>;
    };
    expect(migrated.claims[0].workflowInstanceId).toBe('pi-already-set');
    expect(migrated.claims[0].workflowStatus).toBe('approved');
  });

  it('passes through state unchanged when version is already current', () => {
    const persistedV1 = {
      claims: [
        {
          id: 'X',
          workflowInstanceId: 'pi-abc',
          workflowStatus: 'approved',
        },
      ],
    };
    const migrated = migrateBenefitClaimsPersist(persistedV1, 1) as {
      claims: Array<{ workflowInstanceId: string; workflowStatus: string }>;
    };
    expect(migrated.claims[0].workflowInstanceId).toBe('pi-abc');
    expect(migrated.claims[0].workflowStatus).toBe('approved');
  });

  it('handles empty claims array', () => {
    const migrated = migrateBenefitClaimsPersist({ claims: [] }, 0) as {
      claims: unknown[];
    };
    expect(migrated.claims).toEqual([]);
  });

  it('emits console.warn when persisted version is newer than current', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const futureState = {
      claims: [{ id: 'BEN-CLM-FUTURE', workflowInstanceId: 'pi-future', workflowStatus: 'paid' }],
    };

    const migrated = migrateBenefitClaimsPersist(futureState, 9) as {
      claims: Array<{ workflowInstanceId: string; workflowStatus: string }>;
    };

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toMatch(/version 9 > current 1/);
    // State is returned as-is (not corrupted)
    expect(migrated.claims[0].workflowInstanceId).toBe('pi-future');
    warnSpy.mockRestore();
  });
});
