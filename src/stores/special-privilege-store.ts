'use client';

/**
 * special-privilege-store — STA-90 (SF BE-03 Special Privilege)
 *
 * Zustand persisted store for HR-Admin per-employee benefit overrides.
 * BE-03 has NO approval flow (unlike benefit-exception-store / BE-04) — records
 * are terminal once created. Mock-only persistence; no backend wired this phase.
 *
 * SF field naming mirrored exactly: specialBenefitGroup, planId, schedulePeriod,
 * benefitEntitlementAmount, maxPerClaim, effectiveStartDate, effectiveEndDate,
 * reason, createdBy, createdAt.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ───────────────────────────────────────────────────────────────────

export type SpecialPrivilegeSchedulePeriod =
  | 'year'
  | 'month'
  | 'quarter'
  | 'one-time'
  | 'lifetime';

export interface SpecialPrivilegeRecord {
  id: string;
  employeeId: string; // e.g. 'EMP-0005'
  specialBenefitGroup: boolean;
  planId: string; // references BENEFIT_PLAN_REGISTRY[].id
  schedulePeriod: SpecialPrivilegeSchedulePeriod;
  benefitEntitlementAmount: number; // วงเงิน, THB
  maxPerClaim: number; // THB
  effectiveStartDate: string; // ISO
  effectiveEndDate: string; // ISO
  reason: string; // required
  createdBy: string;
  createdAt: string; // ISO timestamp
}

interface SpecialPrivilegeState {
  records: SpecialPrivilegeRecord[];
  addPrivilege: (
    rec: Omit<SpecialPrivilegeRecord, 'id' | 'createdAt'> & { createdAt?: string },
  ) => void;
  removePrivilege: (id: string) => void;
  clear: () => void;
}

// ── Shared selector (single join path) ───────────────────────────────────────
//
// Consumed by BOTH the admin detail page (Step 4) and the profile benefits
// panel (Step 5). NOTE: this returns a FRESH `.filter()` array on every call,
// so it is NOT a stable reference. Consumers MUST guard against re-render churn
// — either wrap with `useShallow` (zustand/react/shallow) at the call site, or
// select the raw `records` array and `useMemo` the filter. Do NOT rely on
// referential equality.
export const selectPrivilegesForEmployee =
  (employeeId: string) => (s: SpecialPrivilegeState) =>
    s.records.filter((r) => r.employeeId === employeeId);

// ── Seed ─────────────────────────────────────────────────────────────────────
//
// Realistic demo records so HR can open several employees and sanity-check the
// override วงเงิน against each plan's standard entitlement. Each planId is real
// (BENEFIT_PLAN_REGISTRY) and the override amount intentionally DIFFERS from the
// plan default — which is the whole point of a "special privilege". Spread
// across EMP-0001..EMP-0010 (4-digit ids that resolve in MOCK_EMPLOYEES).
// Registry-backed — not a user-facing input artifact, allowed by the mockup
// caveat.
//
// NOTE: EMP-0005 keeps EXACTLY ONE record (BE-MED-002) — special-privilege.test
// pins that. Do not add a second EMP-0005 record here.
const seedRecords: SpecialPrivilegeRecord[] = [
  {
    id: 'SP-0001',
    employeeId: 'EMP-0005',
    specialBenefitGroup: true,
    planId: 'BE-MED-002',
    schedulePeriod: 'year',
    benefitEntitlementAmount: 250000,
    maxPerClaim: 50000,
    effectiveStartDate: '2026-01-01T00:00:00.000Z',
    effectiveEndDate: '2026-12-31T00:00:00.000Z',
    reason: 'ปรับวงเงินค่ารักษาพยาบาลเป็นกรณีพิเศษตามมติผู้บริหาร (Executive committee approval)',
    createdBy: 'HR Admin',
    createdAt: '2026-05-01T03:00:00.000Z',
  },
  {
    // OPD default ฿30,000 → elevated for a senior executive.
    id: 'SP-0002',
    employeeId: 'EMP-0001',
    specialBenefitGroup: true,
    planId: 'BE-MED-001',
    schedulePeriod: 'year',
    benefitEntitlementAmount: 60000,
    maxPerClaim: 10000,
    effectiveStartDate: '2026-01-01T00:00:00.000Z',
    effectiveEndDate: '2026-12-31T00:00:00.000Z',
    reason: 'ปรับเพิ่มวงเงินค่ารักษาพยาบาลผู้ป่วยนอกตามระดับตำแหน่งผู้บริหารระดับสูง (Senior executive OPD uplift)',
    createdBy: 'นงลักษณ์ ทรัพย์เจริญ (HR)',
    createdAt: '2026-02-14T04:20:00.000Z',
  },
  {
    // IPD (เบิกเอง) default ฿200,000 → special chronic-illness coverage.
    id: 'SP-0003',
    employeeId: 'EMP-0002',
    specialBenefitGroup: true,
    planId: 'BE-MED-003',
    schedulePeriod: 'year',
    benefitEntitlementAmount: 500000,
    maxPerClaim: 200000,
    effectiveStartDate: '2026-03-01T00:00:00.000Z',
    effectiveEndDate: '2027-02-28T00:00:00.000Z',
    reason: 'วงเงินค่ารักษาพยาบาลผู้ป่วยในกรณีพิเศษ (โรคเรื้อรัง) ตามมติคณะกรรมการสวัสดิการ',
    createdBy: 'HR Admin',
    createdAt: '2026-03-02T02:10:00.000Z',
  },
  {
    // Dental default ฿5,000 → trebled for continuing treatment.
    id: 'SP-0004',
    employeeId: 'EMP-0003',
    specialBenefitGroup: false,
    planId: 'BE-DEN-001',
    schedulePeriod: 'year',
    benefitEntitlementAmount: 15000,
    maxPerClaim: 5000,
    effectiveStartDate: '2026-01-01T00:00:00.000Z',
    effectiveEndDate: '2026-12-31T00:00:00.000Z',
    reason: 'เพิ่มวงเงินค่าทันตกรรมเป็นกรณีพิเศษ (รักษาต่อเนื่อง)',
    createdBy: 'อภิญญา วงศ์ดี (HR)',
    createdAt: '2026-01-20T06:45:00.000Z',
  },
  {
    // Fuel default ฿60,000/yr → monthly uplift for heavy upcountry travel.
    id: 'SP-0005',
    employeeId: 'EMP-0006',
    specialBenefitGroup: true,
    planId: 'BE-GAS-001',
    schedulePeriod: 'month',
    benefitEntitlementAmount: 9000,
    maxPerClaim: 9000,
    effectiveStartDate: '2026-04-01T00:00:00.000Z',
    effectiveEndDate: '2026-12-31T00:00:00.000Z',
    reason: 'ปรับเพิ่มค่าน้ำมันเชื้อเพลิงสำหรับตำแหน่งที่ต้องเดินทางต่างจังหวัดเป็นประจำ',
    createdBy: 'HR Admin',
    createdAt: '2026-03-28T08:00:00.000Z',
  },
  {
    // Annual check-up package B ฿8,000 → premium executive package.
    id: 'SP-0006',
    employeeId: 'EMP-0007',
    specialBenefitGroup: true,
    planId: 'BE-PHY-002',
    schedulePeriod: 'year',
    benefitEntitlementAmount: 20000,
    maxPerClaim: 20000,
    effectiveStartDate: '2026-01-01T00:00:00.000Z',
    effectiveEndDate: '2026-12-31T00:00:00.000Z',
    reason: 'แพ็กเกจตรวจสุขภาพประจำปีระดับผู้บริหาร (Executive health screening)',
    createdBy: 'นงลักษณ์ ทรัพย์เจริญ (HR)',
    createdAt: '2026-01-05T03:30:00.000Z',
  },
  {
    // Life/accident baseline ฿5,000 → elevated sum insured (exec contract).
    id: 'SP-0007',
    employeeId: 'EMP-0008',
    specialBenefitGroup: true,
    planId: 'BE-LIF-001',
    schedulePeriod: 'lifetime',
    benefitEntitlementAmount: 1000000,
    maxPerClaim: 1000000,
    effectiveStartDate: '2026-01-01T00:00:00.000Z',
    effectiveEndDate: '2030-12-31T00:00:00.000Z',
    reason: 'เพิ่มทุนประกันชีวิต/อุบัติเหตุกรณีพิเศษ (สัญญาจ้างผู้บริหาร)',
    createdBy: 'HR Admin',
    createdAt: '2026-01-02T01:15:00.000Z',
  },
  {
    // An EXPIRED record (ended 2025) — lets HR see how a lapsed privilege reads.
    id: 'SP-0008',
    employeeId: 'EMP-0010',
    specialBenefitGroup: false,
    planId: 'BE-MED-001',
    schedulePeriod: 'year',
    benefitEntitlementAmount: 45000,
    maxPerClaim: 8000,
    effectiveStartDate: '2025-01-01T00:00:00.000Z',
    effectiveEndDate: '2025-12-31T00:00:00.000Z',
    reason: 'วงเงินพิเศษชั่วคราวปี 2568 (สิ้นสุดแล้ว)',
    createdBy: 'อภิญญา วงศ์ดี (HR)',
    createdAt: '2025-01-10T05:00:00.000Z',
  },
];

// ── Store ─────────────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();
let seq = seedRecords.length;
const nextId = () => `SP-${String(++seq).padStart(4, '0')}`;

export const useSpecialPrivilegeStore = create<SpecialPrivilegeState>()(
  persist(
    (set) => ({
      records: seedRecords,
      addPrivilege: (rec) =>
        set((s) => ({
          records: [
            ...s.records,
            {
              ...rec,
              id: nextId(),
              createdAt: rec.createdAt ?? nowIso(),
            },
          ],
        })),
      removePrivilege: (id) =>
        set((s) => ({
          records: s.records.filter((r) => r.id !== id),
        })),
      clear: () => set({ records: seedRecords }),
    }),
    { name: 'cnext-special-privileges' },
  ),
);
