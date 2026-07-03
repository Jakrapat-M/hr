import { describe, it, expect } from 'vitest';
import {
  CLAIM_STATUS_SORT_RANK,
  claimStatusSortRank,
  sortByClaimStatus,
  filterHumiClaimHistory,
  CLAIM_TYPE_OPTIONS,
  CLAIM_STATUS_BUCKET_OPTIONS,
  benefitClaimStatusToBucket,
  deriveAdminClaimType,
} from '@/lib/claim-history-filter';
import { HUMI_CLAIM_HISTORY, type ClaimStatus } from '@/lib/humi-mock-data';

// STA-194 — ME claim-history status sort mirrors the admin `claimStatusRank`:
//   info (ขอข้อมูลเพิ่ม) → pending (รออนุมัติ) → approved (อนุมัติแล้ว) → rest.
describe('claimStatusSortRank', () => {
  it('ranks info (need-more-info) first, then pending, then approved', () => {
    expect(claimStatusSortRank('info')).toBeLessThan(claimStatusSortRank('pending'));
    expect(claimStatusSortRank('pending')).toBeLessThan(claimStatusSortRank('approved'));
  });

  it('exposes the rank table with the expected order', () => {
    expect(CLAIM_STATUS_SORT_RANK).toEqual({ info: 0, pending: 1, approved: 2 });
  });
});

describe('sortByClaimStatus', () => {
  const row = (status: ClaimStatus, submittedAt: string) => ({ status, submittedAt });

  it('orders by status group, then newest → oldest within a group', () => {
    const input = [
      row('approved', '2026-02-01'),
      row('pending', '2026-04-01'),
      row('info', '2026-01-15'),
      row('approved', '2026-05-20'),
      row('info', '2026-05-25'),
    ];
    const out = sortByClaimStatus(input);
    expect(out.map((r) => r.status)).toEqual(['info', 'info', 'pending', 'approved', 'approved']);
    // newest info first
    expect(out[0].submittedAt).toBe('2026-05-25');
    // oldest approved last
    expect(out[out.length - 1].submittedAt).toBe('2026-02-01');
  });

  it('does not mutate the input array', () => {
    const input = [row('approved', '2026-01-01'), row('info', '2026-02-01')];
    const copy = [...input];
    sortByClaimStatus(input);
    expect(input).toEqual(copy);
  });
});

// STA-194 — 3-filter AND logic (benefit name, claim type, status). Empty = all.
describe('filterHumiClaimHistory', () => {
  it('returns all rows when no filter is set', () => {
    expect(filterHumiClaimHistory(HUMI_CLAIM_HISTORY, {})).toHaveLength(HUMI_CLAIM_HISTORY.length);
  });

  it('filters by benefit name', () => {
    const out = filterHumiClaimHistory(HUMI_CLAIM_HISTORY, { benefit: 'ค่าน้ำมันรถ' });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.type === 'ค่าน้ำมันรถ')).toBe(true);
  });

  it('filters by claim type (toll)', () => {
    const out = filterHumiClaimHistory(HUMI_CLAIM_HISTORY, { claimType: 'toll' });
    expect(out.every((r) => r.claimType === 'toll')).toBe(true);
    expect(out.length).toBe(1);
  });

  it('filters by status', () => {
    const out = filterHumiClaimHistory(HUMI_CLAIM_HISTORY, { status: 'info' });
    expect(out.every((r) => r.status === 'info')).toBe(true);
  });

  it('ANDs the three filters together', () => {
    const out = filterHumiClaimHistory(HUMI_CLAIM_HISTORY, {
      benefit: 'ค่าน้ำมันรถ',
      claimType: 'parking',
      status: 'pending',
    });
    expect(out).toHaveLength(1);
    expect(out[0].claimType).toBe('parking');
    expect(out[0].status).toBe('pending');

    // Conflicting AND (parking is never approved) → empty.
    expect(
      filterHumiClaimHistory(HUMI_CLAIM_HISTORY, { claimType: 'parking', status: 'approved' }),
    ).toHaveLength(0);
  });
});

// STA-194 — the ME mock grows 5 → 7 with a toll(info) and parking(pending) row,
// covering all 3 statuses and all 3 claim types.
describe('HUMI_CLAIM_HISTORY mock', () => {
  it('has 7 rows', () => {
    expect(HUMI_CLAIM_HISTORY).toHaveLength(7);
  });

  it('includes a toll row with info (ขอข้อมูลเพิ่ม) status', () => {
    const toll = HUMI_CLAIM_HISTORY.find((r) => r.claimType === 'toll');
    expect(toll).toBeDefined();
    expect(toll?.status).toBe('info');
  });

  it('includes a parking row with pending (รออนุมัติ) status', () => {
    const parking = HUMI_CLAIM_HISTORY.find((r) => r.claimType === 'parking');
    expect(parking).toBeDefined();
    expect(parking?.status).toBe('pending');
  });

  it('represents all 3 statuses', () => {
    const statuses = new Set(HUMI_CLAIM_HISTORY.map((r) => r.status));
    expect(statuses).toEqual(new Set<ClaimStatus>(['approved', 'pending', 'info']));
  });

  it('represents all 3 claim types', () => {
    const types = new Set(HUMI_CLAIM_HISTORY.map((r) => r.claimType).filter(Boolean));
    expect(types).toEqual(new Set(['gasoline', 'toll', 'parking']));
  });
});

// STA-194 — shared vocabularies + admin status/claim-type derivation.
describe('CLAIM_TYPE_OPTIONS', () => {
  it('exposes exactly Gasoline / Expressway Toll / Car Parking Fee', () => {
    expect(CLAIM_TYPE_OPTIONS.map((o) => o.value)).toEqual(['gasoline', 'toll', 'parking']);
    expect(CLAIM_TYPE_OPTIONS.every((o) => o.labelTh && o.labelEn)).toBe(true);
  });
});

describe('CLAIM_STATUS_BUCKET_OPTIONS', () => {
  it('exposes the 3 ticket buckets with TH + EN labels', () => {
    expect(CLAIM_STATUS_BUCKET_OPTIONS.map((o) => o.value)).toEqual(['info', 'pending', 'approved']);
    expect(CLAIM_STATUS_BUCKET_OPTIONS.every((o) => o.labelTh && o.labelEn)).toBe(true);
  });
});

describe('benefitClaimStatusToBucket', () => {
  it('maps send_back → info', () => {
    expect(benefitClaimStatusToBucket('send_back')).toBe('info');
  });
  it('maps both pending states → pending', () => {
    expect(benefitClaimStatusToBucket('pending_manager_approval')).toBe('pending');
    expect(benefitClaimStatusToBucket('pending_spd')).toBe('pending');
  });
  it('maps approved → approved', () => {
    expect(benefitClaimStatusToBucket('approved')).toBe('approved');
  });
  it('maps rejected / cancelled → null (never matches a bucket)', () => {
    expect(benefitClaimStatusToBucket('rejected')).toBeNull();
    expect(benefitClaimStatusToBucket('cancelled')).toBeNull();
  });
});

describe('deriveAdminClaimType', () => {
  it('maps gasoline benefit → gasoline claim type', () => {
    expect(deriveAdminClaimType('gasoline')).toBe('gasoline');
  });
  it('gives non-fuel benefits no claim type', () => {
    expect(deriveAdminClaimType('medical')).toBeUndefined();
    expect(deriveAdminClaimType('mobile')).toBeUndefined();
  });
});
