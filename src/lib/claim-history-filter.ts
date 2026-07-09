// STA-194 — shared pure logic for the two claim-history surfaces
// (ESS "Me" /benefits-hub and HR admin /admin/employees/[id]).
//
// The two surfaces have different data shapes and render primitives, so only
// pure helpers live here. Admin keeps its own `sortClaimHistory` (already
// correct for the store's `BenefitClaimStatus`); this module covers the ME
// `ClaimStatus` sort plus the shared filter vocabularies (claim type + the
// 3 status buckets) used by both filter UIs.

import type { ClaimStatus } from '@/lib/humi-mock-data';
import type { BenefitClaimStatus } from '@/stores/benefit-claims';

// ────────────────────────────────────────────────────────────────────────────
// ME status sort — mirror of admin `claimStatusRank`:
//   info (ขอข้อมูลเพิ่ม) → pending (รออนุมัติ) → approved (อนุมัติแล้ว) → rest.
// ────────────────────────────────────────────────────────────────────────────

export const CLAIM_STATUS_SORT_RANK: Record<ClaimStatus, number> = {
  info: 0,
  pending: 1,
  approved: 2,
  // STA-234 — terminal state sorts last (after the 3 active buckets).
  cancelled: 3,
};

export function claimStatusSortRank(status: ClaimStatus): number {
  return CLAIM_STATUS_SORT_RANK[status] ?? Number.MAX_SAFE_INTEGER;
}

// ────────────────────────────────────────────────────────────────────────────
// STA-234 — pure gating for the hub claim-detail modal action footer.
//   Cancel claim: allowed while info (ขอข้อมูลเพิ่ม) or pending (รออนุมัติ).
//   Edit:         allowed only while info (ขอข้อมูลเพิ่ม).
//   approved / cancelled → neither.
// ────────────────────────────────────────────────────────────────────────────

export function benefitClaimRowActions(status: ClaimStatus): {
  canCancel: boolean;
  canEdit: boolean;
} {
  return {
    canCancel: status === 'info' || status === 'pending',
    canEdit: status === 'info',
  };
}

/**
 * Stable sort of ME claim rows by status group (info → pending → approved →
 * rest), then newest → oldest within each group. Does not mutate the input.
 */
export function sortByClaimStatus<T extends { status: ClaimStatus; submittedAt: string }>(
  rows: readonly T[],
): T[] {
  return [...rows].sort((a, b) => {
    const rankDiff = claimStatusSortRank(a.status) - claimStatusSortRank(b.status);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });
}

/** ME claim-history filter state — empty string means "no filter" (show all). */
export interface HumiClaimFilterState {
  benefit?: string;
  claimType?: string;
  status?: string;
  /** ISO `YYYY-MM-DD` inclusive lower bound on `submittedAt`; empty = open. */
  dateFrom?: string;
  /** ISO `YYYY-MM-DD` inclusive upper bound on `submittedAt`; empty = open. */
  dateTo?: string;
}

/**
 * AND the ME claim-history filters (benefit name, claim type, status, date
 * range). Benefit name is a case-insensitive substring match; claim type and
 * status are exact. Date range is inclusive on the ISO `submittedAt` date, with
 * either bound open when empty. An empty/omitted value for any dimension
 * matches every row.
 */
export function filterHumiClaimHistory<
  T extends {
    type: string;
    desc?: string;
    claimType?: string;
    status: ClaimStatus;
    submittedAt: string;
  },
>(
  rows: readonly T[],
  { benefit, claimType, status, dateFrom, dateTo }: HumiClaimFilterState,
): T[] {
  return rows.filter((row) => {
    // Free-text search covers the benefit NAME + description + claim-type label
    // (TH/EN), so typing a benefit name OR a claim-type term (e.g. "ทางด่วน")
    // both match — the fuel rows all share the name "ค่าน้ำมันรถ" and differ
    // only by claim type/description.
    const okBenefit = benefit
      ? claimRowSearchText(row).includes(benefit.trim().toLowerCase())
      : true;
    const okClaimType = claimType ? row.claimType === claimType : true;
    const okStatus = status ? row.status === status : true;
    const iso = row.submittedAt.slice(0, 10);
    const okFrom = dateFrom ? iso >= dateFrom : true;
    const okTo = dateTo ? iso <= dateTo : true;
    return okBenefit && okClaimType && okStatus && okFrom && okTo;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Date display — uppercase DD-MMM-YYYY (e.g. 2026-06-26 → 26-JUN-2026). Pure &
// deterministic: the month array is built literally so no locale API varies.
// ────────────────────────────────────────────────────────────────────────────

const CLAIM_DATE_MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

/** Format an ISO `YYYY-MM-DD` (or ISO timestamp) as uppercase `DD-MMM-YYYY`. */
export function formatClaimDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  const monthLabel = CLAIM_DATE_MONTHS[Number(month) - 1] ?? '';
  return `${day.padStart(2, '0')}-${monthLabel}-${year}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Claim Type — fixed sub-type vocabulary under the "ค่าน้ำมันรถ" benefit.
// ────────────────────────────────────────────────────────────────────────────

export interface ClaimHistoryOption {
  value: string;
  labelTh: string;
  labelEn: string;
}

export const CLAIM_TYPE_OPTIONS: ClaimHistoryOption[] = [
  { value: 'gasoline', labelTh: 'ค่าน้ำมัน', labelEn: 'Gasoline' },
  { value: 'toll', labelTh: 'ค่าทางด่วน', labelEn: 'Expressway Toll' },
  { value: 'parking', labelTh: 'ค่าที่จอดรถ', labelEn: 'Car Parking Fee' },
];

/** Lowercased "TH EN" label for a claim-type value (empty if unknown/undefined). */
export function claimTypeSearchText(claimType?: string): string {
  if (!claimType) return '';
  const opt = CLAIM_TYPE_OPTIONS.find((o) => o.value === claimType);
  return opt ? `${opt.labelTh} ${opt.labelEn}`.toLowerCase() : '';
}

/**
 * The lowercased free-text haystack for a claim row: benefit name + description
 * + claim-type label. Used by the benefit-name search box so it matches the
 * benefit name AND the claim type / detail, not only one field.
 */
export function claimRowSearchText(row: {
  type: string;
  desc?: string;
  claimType?: string;
}): string {
  return `${row.type} ${row.desc ?? ''} ${claimTypeSearchText(row.claimType)}`.toLowerCase();
}

// ────────────────────────────────────────────────────────────────────────────
// Status buckets — the 3 ticket buckets exposed by the Status filter on both
// surfaces. ME `ClaimStatus` maps 1:1; admin `BenefitClaimStatus` collapses
// into the same 3 buckets (rejected/cancelled → none, i.e. never matched).
// ────────────────────────────────────────────────────────────────────────────

export type ClaimStatusBucket = 'info' | 'pending' | 'approved';

export const CLAIM_STATUS_BUCKET_OPTIONS: {
  value: ClaimStatusBucket;
  labelTh: string;
  labelEn: string;
}[] = [
  { value: 'info', labelTh: 'ขอข้อมูลเพิ่ม', labelEn: 'Need more info' },
  { value: 'pending', labelTh: 'รออนุมัติ', labelEn: 'Pending approval' },
  { value: 'approved', labelTh: 'อนุมัติแล้ว', labelEn: 'Approved' },
];

/**
 * Admin `BenefitClaimStatus` → the 3 ticket buckets.
 *   send_back → info; pending_manager_approval|pending_spd → pending;
 *   approved → approved; rejected|cancelled → null (never matches a bucket).
 */
export function benefitClaimStatusToBucket(status: BenefitClaimStatus): ClaimStatusBucket | null {
  switch (status) {
    case 'send_back':
      return 'info';
    case 'pending_manager_approval':
    case 'pending_spd':
      return 'pending';
    case 'approved':
      return 'approved';
    default:
      return null;
  }
}

/**
 * Derive the admin Claim-Type value from a claim's benefit type. Only fuel
 * (gasoline) claims map into the claim-type vocabulary; every other benefit
 * has no claim type and therefore never matches a Claim-Type selection.
 */
export function deriveAdminClaimType(benefitType: string): string | undefined {
  return benefitType === 'gasoline' ? 'gasoline' : undefined;
}
