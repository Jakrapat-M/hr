'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { CardEyebrow, CardTitle, FormInput } from '@/components/humi';
import { TalentFilterPanel } from './TalentFilterPanel';
import { TalentResultCard, type TalentEmployee } from './TalentResultCard';
import { SF_REAL_EMPLOYEES } from '@/lib/humi-mock-data-sf-real';
import { HUMI_EMPLOYEES } from '@/lib/humi-mock-data';
import { useTalent } from '@/hooks/use-talent';

// ════════════════════════════════════════════════════════════
// TalentSearchPanel — HRBP-only advanced talent search.
// LEFT: TalentFilterPanel (collapsible ~30-input sidebar).
// RIGHT: Result grid of TalentResultCard components.
// All filtering is client-side (mockup — no API calls).
// ════════════════════════════════════════════════════════════

// ── Filter shape (shared with TalentFilterPanel) ─────────────

export interface TalentFilters {
  // Org
  company: string;
  group: string;
  businessUnit: string;
  functionArea: string;
  department: string;
  // Location
  country: string;
  province: string;
  branchCode: string;
  hrDistrict: string;
  workLocation: string;
  // Employment
  position: string;
  employeeClass: string;
  jobCode: string;
  payGrade: string;
  payGroup: string;
  // Personal
  gender: string;
  ageMin: string;
  ageMax: string;
  maritalStatus: string;
  nationality: string;
  // Career
  tenureMin: string;
  tenureMax: string;
  lastPromotionFrom: string;
  lastPromotionTo: string;
  performanceRatings: string[];
  lastTrainingDate: string;
  // Talent flags
  successorFor: string;
  onSuccessionPlan: string;
  preferredNextMove: string;
  mobility: string;
}

export const EMPTY_FILTERS: TalentFilters = {
  company: '',
  group: '',
  businessUnit: '',
  functionArea: '',
  department: '',
  country: '',
  province: '',
  branchCode: '',
  hrDistrict: '',
  workLocation: '',
  position: '',
  employeeClass: '',
  jobCode: '',
  payGrade: '',
  payGroup: '',
  gender: '',
  ageMin: '',
  ageMax: '',
  maritalStatus: '',
  nationality: '',
  tenureMin: '',
  tenureMax: '',
  lastPromotionFrom: '',
  lastPromotionTo: '',
  performanceRatings: [],
  lastTrainingDate: '',
  successorFor: '',
  onSuccessionPlan: '',
  preferredNextMove: '',
  mobility: '',
};

// ── Merge SF real employees with humi mock employees ─────────

function buildTalentPool(): TalentEmployee[] {
  // Combine real SF employees + mock talent hook data into one pool
  const sfPool = SF_REAL_EMPLOYEES.slice(0, 20).map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    firstNameTh: e.firstNameTh,
    lastNameTh: e.lastNameTh,
    firstNameEn: e.firstNameEn,
    lastNameEn: e.lastNameEn,
    initials: e.initials,
    position: e.position,
    department: e.department,
    hireDate: e.hireDate,
    avatarTone: e.avatarTone ?? 'teal',
    branch: undefined,
    performanceRating: undefined,
    isHiPo: false,
    yearsOfService: e.hireDate
      ? Math.max(0, new Date().getFullYear() - new Date(e.hireDate).getFullYear())
      : undefined,
  }));

  const humiPool = HUMI_EMPLOYEES.slice(0, 10).map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    firstNameTh: e.firstNameTh,
    lastNameTh: e.lastNameTh,
    firstNameEn: e.firstNameEn,
    lastNameEn: e.lastNameEn,
    initials: e.initials,
    position: e.position,
    department: e.department,
    hireDate: e.hireDate,
    avatarTone: e.avatarTone,
    maritalStatus: e.maritalStatus,
    nationality: e.nationality,
    branch: undefined,
    performanceRating: undefined,
    isHiPo: false,
    yearsOfService: e.hireDate
      ? Math.max(0, new Date().getFullYear() - new Date(e.hireDate).getFullYear())
      : undefined,
  }));

  return [...sfPool, ...humiPool];
}

const FULL_POOL = buildTalentPool();

// ── Client-side filter function ──────────────────────────────

function applyFilters(pool: TalentEmployee[], filters: TalentFilters, query: string): TalentEmployee[] {
  let results = pool;

  // Free-text search: name or position or department
  if (query.trim()) {
    const q = query.toLowerCase();
    results = results.filter(
      (e) =>
        e.firstNameTh.toLowerCase().includes(q) ||
        e.lastNameTh.toLowerCase().includes(q) ||
        (e.firstNameEn?.toLowerCase() ?? '').includes(q) ||
        (e.lastNameEn?.toLowerCase() ?? '').includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q),
    );
  }

  // Department filter
  if (filters.department) {
    results = results.filter((e) =>
      e.department.toLowerCase().includes(filters.department.toLowerCase()),
    );
  }

  // Position filter
  if (filters.position) {
    results = results.filter((e) =>
      e.position.toLowerCase().includes(filters.position.toLowerCase()),
    );
  }

  // BU filter (businessUnitId match or name match)
  if (filters.businessUnit) {
    results = results.filter((e) => {
      // HUMI employees don't have businessUnitId, do a loose position match
      return (e as unknown as { businessUnitId?: string }).businessUnitId
        ? (e as unknown as { businessUnitId: string }).businessUnitId === filters.businessUnit
        : e.department.toLowerCase().includes(filters.businessUnit.toLowerCase());
    });
  }

  // Nationality filter
  if (filters.nationality) {
    results = results.filter((e) => {
      const nat = (e as unknown as { nationality?: string }).nationality ?? '';
      return nat.toLowerCase().includes(filters.nationality.toLowerCase());
    });
  }

  // Marital status filter
  if (filters.maritalStatus) {
    results = results.filter((e) => {
      const ms = (e as unknown as { maritalStatus?: string }).maritalStatus ?? '';
      return ms === filters.maritalStatus;
    });
  }

  // Gender filter (mock data doesn't carry gender — pass-through in mockup)
  // Performance rating filter (mock talent hook data carries performanceRating)
  if (filters.performanceRatings.length > 0 && results.some((e) => e.performanceRating != null)) {
    const allowed = new Set(filters.performanceRatings.map(Number));
    results = results.filter(
      (e) => e.performanceRating == null || allowed.has(e.performanceRating),
    );
  }

  // Tenure range
  if (filters.tenureMin) {
    const min = Number(filters.tenureMin);
    results = results.filter((e) => (e.yearsOfService ?? 0) >= min);
  }
  if (filters.tenureMax) {
    const max = Number(filters.tenureMax);
    results = results.filter((e) => (e.yearsOfService ?? 999) <= max);
  }

  return results;
}

// ── Main component ───────────────────────────────────────────

export function TalentSearchPanel() {
  const [filters, setFilters] = useState<TalentFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState('');

  // Also pull the talent hook pool (for HiPo / performance data)
  const { employees: talentHookPool } = useTalent();

  // Merge talent hook data into the pool for employees that have performance ratings
  const fullPool = useMemo<TalentEmployee[]>(() => {
    // Overlay talent-hook data onto matching entries by name heuristic
    return FULL_POOL.map((e) => {
      const match = talentHookPool.find(
        (t) =>
          t.name.toLowerCase().includes(e.firstNameEn?.toLowerCase() ?? '__never__') ||
          t.name.toLowerCase().includes(e.firstNameTh?.toLowerCase() ?? '__never__'),
      );
      if (match) {
        return {
          ...e,
          performanceRating: match.performanceRating,
          isHiPo: match.isHiPo,
          yearsOfService: match.yearsOfService,
        };
      }
      return e;
    });
  }, [talentHookPool]);

  const results = useMemo(() => applyFilters(fullPool, filters, query), [fullPool, filters, query]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    const skip: (keyof TalentFilters)[] = ['performanceRatings'];
    for (const [k, v] of Object.entries(filters) as Array<[keyof TalentFilters, unknown]>) {
      if (skip.includes(k)) continue;
      if (typeof v === 'string' && v !== '') count++;
    }
    count += filters.performanceRatings.length;
    return count;
  }, [filters]);

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div>
        <CardEyebrow>HRBP — Talent Search</CardEyebrow>
        <CardTitle>ค้นหาบุคลากร / Talent Search</CardTitle>
        <p className="mt-1 text-small text-ink-muted">
          ค้นหาและกรองพนักงานตามเงื่อนไขขั้นสูง — {FULL_POOL.length} records in pool
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
          aria-hidden="true"
        />
        <FormInput
          type="search"
          placeholder="ค้นหาชื่อ ตำแหน่ง แผนก หรือรหัสพนักงาน…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="ค้นหาบุคลากร"
        />
      </div>

      {/* Two-column layout: filter sidebar + result grid */}
      <div className="flex gap-6 items-start">
        {/* LEFT — filter sidebar */}
        <aside className="w-72 shrink-0 sticky top-4" aria-label="ตัวกรองการค้นหา">
          <TalentFilterPanel
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_FILTERS)}
          />
        </aside>

        {/* RIGHT — results */}
        <div className="flex-1 min-w-0">
          {/* Results summary bar */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-small text-ink-muted" aria-live="polite">
              พบ <strong className="text-ink">{results.length}</strong> รายการ
              {activeFilterCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink">
                  {activeFilterCount} ตัวกรอง
                </span>
              )}
            </p>
          </div>

          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
              <Search className="h-10 w-10 mb-3 opacity-30" aria-hidden="true" />
              <p className="text-body font-medium">ไม่พบบุคลากรที่ตรงกับเงื่อนไข</p>
              <p className="text-small mt-1">ลองปรับหรือล้างตัวกรองแล้วค้นหาใหม่</p>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
              data-testid="talent-result-grid"
            >
              {results.map((emp) => (
                <TalentResultCard key={emp.id} employee={emp} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
