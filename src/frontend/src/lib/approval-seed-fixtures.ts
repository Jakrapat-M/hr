// approval-seed-fixtures — PR-1b (clickable-HRMS): the SINGLE canonical fixture
// source for the live approval inbox. The 20 rows previously hard-coded in
// `components/quick-approve/mock-requests.ts` (MOCK_PENDING_REQUESTS) now live
// here as the seed authority, partitioned by RequestType so each adapter's
// seed() populates exactly one source store (plan R1 — one fixture source per
// store, orchestrated only by ensureDemoSeed).
//
// The rows are kept verbatim in PendingRequest shape so the derived inbox renders
// the SAME 20 rows. Each store seeds a thin native record that embeds the
// canonical PendingRequest snapshot (queueSnapshot) so toQueueItem can faithfully
// reconstruct the display row while the store's own status enum drives the
// pending/approved/rejected collapse.

import { MOCK_PENDING_REQUESTS } from '@/components/quick-approve/mock-requests';
import type { PendingRequest, RequestType } from '@/lib/quick-approve-api';

/** The 20 canonical queue rows — single source of truth for the live inbox. */
export const APPROVAL_SEED_ROWS: PendingRequest[] = MOCK_PENDING_REQUESTS;

/** Total seeded row count — used by tests/selectors instead of a magic number. */
export const APPROVAL_SEED_COUNT = APPROVAL_SEED_ROWS.length;

/** Canonical rows grouped by RequestType (one bucket → one store). */
export const APPROVAL_SEED_BY_TYPE: Record<RequestType, PendingRequest[]> = {
  leave: APPROVAL_SEED_ROWS.filter((r) => r.type === 'leave'),
  overtime: APPROVAL_SEED_ROWS.filter((r) => r.type === 'overtime'),
  claim: APPROVAL_SEED_ROWS.filter((r) => r.type === 'claim'),
  transfer: APPROVAL_SEED_ROWS.filter((r) => r.type === 'transfer'),
  change_request: APPROVAL_SEED_ROWS.filter((r) => r.type === 'change_request'),
  probation: APPROVAL_SEED_ROWS.filter((r) => r.type === 'probation'),
};
