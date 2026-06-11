'use client';

/**
 * benefit-history-store — STA-102 "History of benefit plan and rule"
 *
 * When a benefit PLAN or RULE is created / inserted / deleted, log a history
 * entry so the change can be shown beside the plan/rule's current info. Each
 * entry records WHEN (timestamp), the ACTION, and WHO (actor name). Newest entry
 * first. Mockup-only persistence — no backend this phase.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ───────────────────────────────────────────────────────────────────

export type BenefitHistoryTargetType = 'plan' | 'rule';
export type BenefitHistoryAction = 'create' | 'insert' | 'delete';

export interface BenefitHistoryEntry {
  id: string;
  targetType: BenefitHistoryTargetType;
  targetId: string;
  targetName: string;
  action: BenefitHistoryAction;
  actorName: string;
  timestamp: string; // ISO
}

interface BenefitHistoryState {
  entries: BenefitHistoryEntry[];
  addEntry: (input: Omit<BenefitHistoryEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
}

// ── Selector ──────────────────────────────────────────────────────────────────
//
// Returns a FRESH array each call → guard with useShallow / useMemo at call site.

/** History entries for a target (plan/rule + id), newest-first. */
export const selectHistoryForTarget =
  (targetType: BenefitHistoryTargetType, targetId: string) =>
  (s: BenefitHistoryState): BenefitHistoryEntry[] =>
    s.entries
      .filter((e) => e.targetType === targetType && e.targetId === targetId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

// ── Seed ─────────────────────────────────────────────────────────────────────
//
// Mix of plan + rule, all three actions, varied dates + actor names so the panel
// is populated on first open. Plan ids are registry-backed (BE-MED-001); rule id
// matches an eligibility-managed benefit key (medical-reimbursement).
const seedEntries: BenefitHistoryEntry[] = [
  {
    id: 'BH-0001',
    targetType: 'plan',
    targetId: 'BE-MED-001',
    targetName: 'ค่ารักษาพยาบาล (OPD/IPD)',
    action: 'create',
    actorName: 'HR Admin',
    timestamp: '2026-01-12T03:20:00.000Z',
  },
  {
    id: 'BH-0002',
    targetType: 'plan',
    targetId: 'BE-MED-001',
    targetName: 'ค่ารักษาพยาบาล (OPD/IPD)',
    action: 'insert',
    actorName: 'สมชาย ใจดี',
    timestamp: '2026-03-04T08:15:00.000Z',
  },
  {
    id: 'BH-0003',
    targetType: 'rule',
    targetId: 'medical-reimbursement',
    targetName: 'Medical entitlement A',
    action: 'create',
    actorName: 'นงลักษณ์ ทรัพย์เจริญ',
    timestamp: '2026-02-18T06:45:00.000Z',
  },
  {
    id: 'BH-0004',
    targetType: 'rule',
    targetId: 'medical-reimbursement',
    targetName: 'Medical entitlement A',
    action: 'insert',
    actorName: 'HR Admin',
    timestamp: '2026-04-22T02:30:00.000Z',
  },
  {
    id: 'BH-0005',
    targetType: 'rule',
    targetId: 'medical-reimbursement',
    targetName: 'Medical entitlement (legacy)',
    action: 'delete',
    actorName: 'สมชาย ใจดี',
    timestamp: '2026-05-09T09:05:00.000Z',
  },
];

// ── Store ─────────────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();
const newId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export const useBenefitHistoryStore = create<BenefitHistoryState>()(
  persist(
    (set) => ({
      entries: seedEntries,
      addEntry: (input) =>
        set((s) => ({
          entries: [
            { ...input, id: newId(), timestamp: nowIso() },
            ...s.entries,
          ],
        })),
      clear: () => set({ entries: seedEntries }),
    }),
    { name: 'humi-benefit-history' },
  ),
);
