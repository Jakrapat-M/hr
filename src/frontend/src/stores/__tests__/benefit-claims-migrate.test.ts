import { describe, it, expect } from 'vitest';
import { migrateBenefitClaimsPersist } from '@/stores/benefit-claims';

describe('benefit-claims persist migrate v0 → v1', () => {
  it('back-fills workflowInstanceId=null and workflowStatus=pending on legacy claims', () => {
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
          receiptNo: 'RCPT-LEGACY',
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
      ],
    };

    const migrated = migrateBenefitClaimsPersist(persistedV0, 0) as {
      claims: Array<{ workflowInstanceId: string | null; workflowStatus: string }>;
    };

    expect(migrated.claims).toHaveLength(1);
    expect(migrated.claims[0].workflowInstanceId).toBeNull();
    expect(migrated.claims[0].workflowStatus).toBe('pending');
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
});
