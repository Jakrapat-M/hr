'use client';

/**
 * benefit-exception-form-store — STA-101 R2 "Benefits Exception"
 *
 * In-session-only persistence for the SuccessFactors-style "Benefits Exception"
 * form (Worker ID / Exception For / Legal Entity / detail rows). Mockup phase —
 * NO backend; this store just captures the last submitted exception per employee
 * so the success banner has something real to echo back.
 *
 * Selector note: `selectExceptionsForEmployee` returns a FRESH array each call —
 * guard it with `useShallow` (or select the raw array + derive via useMemo).
 * Passing a fresh-array selector straight to the hook causes an infinite loop.
 */

import { create } from 'zustand';

// ── Types ───────────────────────────────────────────────────────────────────

export type ExceptionFor = 'claim' | 'entitlement' | 'accumulation';

export interface BenefitExceptionRow {
  id: string;
  benefitPlanId: string; // references BENEFIT_PLAN_REGISTRY[].id
  relevantPeriod: string; // option key
  selectedPeriod: string; // option key
  adjustmentAmount: number; // accepts negative
  details: string;
}

export interface BenefitExceptionRecord {
  id: string;
  employeeId: string;
  workerId: string;
  exceptionFor: ExceptionFor;
  legalEntities: string[];
  creationDate: string; // ISO
  emailNotification: boolean;
  rows: BenefitExceptionRow[];
  createdBy: string;
  createdAt: string; // ISO
}

interface BenefitExceptionFormState {
  records: BenefitExceptionRecord[];
  addException: (
    rec: Omit<BenefitExceptionRecord, 'id' | 'createdAt'> & { createdAt?: string },
  ) => void;
  clear: () => void;
}

// ── Selectors ─────────────────────────────────────────────────────────────────
//
// Returns a FRESH array each call → guard with useShallow / useMemo.

/** Exception records for an employee, newest-first. */
export const selectExceptionsForEmployee =
  (employeeId: string) => (s: BenefitExceptionFormState) =>
    s.records
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// ── Store ─────────────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();
let seq = 0;
const nextId = () => `BEX-${String(++seq).padStart(4, '0')}`;

export const useBenefitExceptionFormStore = create<BenefitExceptionFormState>()(
  (set) => ({
    records: [],
    addException: (rec) =>
      set((s) => ({
        records: [
          ...s.records,
          { ...rec, id: nextId(), createdAt: rec.createdAt ?? nowIso() },
        ],
      })),
    clear: () => set({ records: [] }),
  }),
);
