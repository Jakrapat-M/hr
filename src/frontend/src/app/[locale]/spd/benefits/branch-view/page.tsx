'use client';

// STA-27 PR-C — /spd/benefits/branch-view
// Branch-scoped enrollment matrix for SPD persona.
// Replaces the 404 that was previously served at this route (sidebar entry from PR-A).

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SpdBranchViewPage } from '@/components/spd/SpdBranchViewPage';

export default function SpdBenefitsBranchViewRoute() {
  const locale = useLocale();
  const isTh = locale !== 'en';

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
        {/* Mockup-limitation note (AC-8) */}
        <p className="mt-2 rounded-lg border border-hairline bg-canvas-soft px-3 py-2 text-xs text-ink-muted">
          {isTh
            ? 'หมายเหตุ UI Mockup: ข้อมูลในหน้านี้เป็นข้อมูลจำลอง การกรองตามสาขา (Scope filter) ยังไม่ได้เชื่อมต่อจริงในรอบ Mockup — assignedBranches มาจาก useSpdBranches() mock จะเชื่อมต่อจริงในเฟสถัดไป'
            : 'UI Mockup note: all data here is illustrative. Branch scope filter (assignedBranches from useSpdBranches()) is mocked — real filtering will be wired in the next phase.'}
        </p>
      </div>

      {/* Main content */}
      <SpdBranchViewPage />
    </div>
  );
}
