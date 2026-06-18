'use client';

// STA-27 PR-C — /spd/benefits/branch-view
// Branch-scoped enrollment matrix for SPD persona.
// STA-64 — a LOCAL switcher is the single scope source: non-admin SPD sees only
// the assigned branches; HR Admin sees all branches. The visible branch set is
// resolved here via filterBranches and passed down to SpdBranchViewPage.

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpdBranchViewPage } from '@/components/spd/SpdBranchViewPage';
import { useSpdBranches } from '@/hooks/use-spd-branches';
import { getAllBranchCodes } from '@/lib/spd-branch-mock';
import { filterBranches, type BenefitScope } from '@/lib/benefit-scope-filter';

type SpdMode = 'spd' | 'admin';

export default function SpdBenefitsBranchViewRoute() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  // STA-27 — the active SPD's assigned branches (non-admin scope).
  const { assignedBranches } = useSpdBranches();

  // STA-64 — local switcher is the single scope source for this surface.
  const [mode, setMode] = useState<SpdMode>('spd');
  const isAdmin = mode === 'admin';

  const scope = useMemo<BenefitScope>(
    () => (isAdmin ? { kind: 'admin' } : { kind: 'branch', branches: assignedBranches }),
    [isAdmin, assignedBranches],
  );

  // Admin → all branch codes; otherwise only the assigned branches.
  const visibleBranches = useMemo(
    () => filterBranches(isAdmin ? getAllBranchCodes() : assignedBranches, scope),
    [isAdmin, assignedBranches, scope],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-ink-muted">
        <Link href={`/${locale}/spd-management`} className="hover:text-ink hover:underline">
          {isTh ? 'หน้าหลัก' : 'Home'}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="hover:text-ink">{isTh ? 'สวัสดิการสาขา' : 'Branch Benefits'}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-ink">{isTh ? 'ภาพรวมสาขา' : 'Branch Overview'}</span>
      </nav>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">
          {isTh ? 'ภาพรวมสวัสดิการสาขา' : 'Branch Benefits Overview'}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isTh
            ? 'ตรวจสอบสถานะการลงทะเบียนสวัสดิการของพนักงานในแต่ละสาขาที่ดูแล'
            : 'Monitor benefit enrollment status of employees across your assigned branches'}
        </p>
        {/* STA-68 — Persona / store-based mock scope demo (wired to data in STA-64) */}
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            {isTh ? 'ขอบเขตข้อมูลตามผู้ใช้งาน' : 'Data scope by user'}
          </p>
          <p className="mt-1 text-xs text-ink">
            {isTh
              ? 'หน้านี้แสดงเฉพาะสาขาที่ผู้ใช้งานดูแล สาขาอื่นจะถูกซ่อน · ผู้ดูแลระบบเห็นได้ทุกสาขา'
              : 'This page shows only the branches the current user manages; other branches are hidden. HR Admin sees all branches.'}
          </p>
          {/* Local switcher: SPD (assigned) vs HR Admin (all) */}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('spd')}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                mode === 'spd'
                  ? 'border-accent bg-accent text-white'
                  : 'border-hairline bg-surface text-ink hover:border-accent/50',
              )}
            >
              {isTh ? 'SPD (สาขาที่ดูแล)' : 'SPD (assigned branches)'}
            </button>
            <button
              type="button"
              onClick={() => setMode('admin')}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                mode === 'admin'
                  ? 'border-accent bg-accent text-white'
                  : 'border-hairline bg-surface text-ink hover:border-accent/50',
              )}
            >
              {isTh ? 'HR Admin (ดูทุกสาขา)' : 'HR Admin (sees all)'}
            </button>
          </div>
          {/* Active-mode chip strip */}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-accent bg-surface px-3 py-1 text-xs font-medium text-accent">
              {isAdmin
                ? isTh ? 'HR Admin · ทุกสาขา' : 'HR Admin · all branches'
                : isTh ? `เห็น ${visibleBranches.length} สาขา` : `${visibleBranches.length} branches in scope`}
            </span>
            {visibleBranches.slice(0, 6).map((branch) => (
              <span key={branch} className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-ink">
                {branch}
              </span>
            ))}
            {visibleBranches.length > 6 && (
              <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-ink-muted">
                {isTh ? `+ อีก ${visibleBranches.length - 6} สาขา` : `+ ${visibleBranches.length - 6} more`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main content — driven by the single scope source (visibleBranches) */}
      <SpdBranchViewPage branches={visibleBranches} />
    </div>
  );
}
