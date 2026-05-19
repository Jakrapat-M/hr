'use client';

// STA-27 PR-C — /spd/benefits/branch-view
// Branch-scoped enrollment matrix for SPD persona.
// STA-68 — surfaces the persona/store-based mock scope filter explicitly.
// The underlying SpdBranchViewPage already filters by useSpdBranches().assignedBranches;
// this banner makes the persona/store source-of-truth visible to HR during the demo.

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SpdBranchViewPage } from '@/components/spd/SpdBranchViewPage';
import { useSpdBranches } from '@/hooks/use-spd-branches';

export default function SpdBenefitsBranchViewRoute() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  // STA-68 — read the active SPD's assignedBranches from the same mock hook
  // that drives the child page. Surfacing the value as a visible chip strip
  // makes the persona/store-based filter behavior demonstrable.
  const { assignedBranches } = useSpdBranches();

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
        {/* STA-68 — Persona / store-based mock scope demo */}
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            {isTh ? 'STA-68 · ขอบเขตข้อมูล (จำลองจาก persona/store)' : 'STA-68 · persona-/store-based mock scope'}
          </p>
          <p className="mt-1 text-xs text-ink">
            {isTh
              ? 'หน้านี้กรองข้อมูลตาม assignedBranches ของ SPD persona ที่ active. แถวของสาขาอื่นจะถูกซ่อนจากตาราง (ไม่ได้แสดงแบบเทา). HR Admin จะมองเห็นทุกสาขา. (Mockup — ไม่ใช่การบังคับใช้ authz จริง.)'
              : 'This page filters by the active SPD persona\'s assignedBranches. Out-of-scope rows are fully hidden (not dimmed). HR Admin sees all branches. (Mock — not real authz enforcement.)'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-accent bg-surface px-3 py-1 text-xs font-medium text-accent">
              {isTh ? `เห็น ${assignedBranches.length} สาขา` : `${assignedBranches.length} branches in scope`}
            </span>
            {assignedBranches.slice(0, 6).map((branch) => (
              <span key={branch} className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-ink">
                {branch}
              </span>
            ))}
            {assignedBranches.length > 6 && (
              <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-ink-muted">
                {isTh ? `+ อีก ${assignedBranches.length - 6} สาขา` : `+ ${assignedBranches.length - 6} more`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <SpdBranchViewPage />
    </div>
  );
}
