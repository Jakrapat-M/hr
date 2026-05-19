'use client';

// STA-27 PR-B' — /hrbp/benefits/reports
// 4-tab HRBP benefits reports: Claim, Cost Analysis, Enrollment, Special Privilege.
// STA-68 — Persona/store-based mock scope filter demo.

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClaimReport } from '@/components/hrbp/reports/ClaimReport';
import { CostAnalysisReport } from '@/components/hrbp/reports/CostAnalysisReport';
import { EnrollmentReport } from '@/components/hrbp/reports/EnrollmentReport';
import { SpecialPrivilegeReport } from '@/components/hrbp/reports/SpecialPrivilegeReport';

type ReportTab = 'claims' | 'cost' | 'enrollment' | 'privilege';

const TABS: { id: ReportTab; labelEn: string; labelTh: string }[] = [
  { id: 'claims', labelEn: 'Claim Report', labelTh: 'รายงานเคลม' },
  { id: 'cost', labelEn: 'Cost Analysis', labelTh: 'วิเคราะห์ค่าใช้จ่าย' },
  { id: 'enrollment', labelEn: 'Enrollment Stats', labelTh: 'สถิติลงทะเบียน' },
  { id: 'privilege', labelEn: 'Special Privileges', labelTh: 'สิทธิพิเศษ' },
];

// STA-68 — Persona mock scope. In real product this would come from auth/RBAC.
type PersonaScope =
  | { kind: 'hrbp';  department: 'Finance' | 'HR' | 'IT' }
  | { kind: 'admin' };

const PERSONAS: { id: string; scope: PersonaScope; labelTh: string; labelEn: string; visibleDeptsTh: string; visibleDeptsEn: string }[] = [
  { id: 'hrbp-finance', scope: { kind: 'hrbp', department: 'Finance' }, labelTh: 'HRBP · Finance', labelEn: 'HRBP · Finance', visibleDeptsTh: 'Finance', visibleDeptsEn: 'Finance' },
  { id: 'hrbp-hr',      scope: { kind: 'hrbp', department: 'HR' },      labelTh: 'HRBP · HR',      labelEn: 'HRBP · HR',      visibleDeptsTh: 'HR',      visibleDeptsEn: 'HR' },
  { id: 'hrbp-it',      scope: { kind: 'hrbp', department: 'IT' },      labelTh: 'HRBP · IT',      labelEn: 'HRBP · IT',      visibleDeptsTh: 'IT',      visibleDeptsEn: 'IT' },
  { id: 'admin',        scope: { kind: 'admin' },                       labelTh: 'HR Admin (ดูทุกแผนก)', labelEn: 'HR Admin (sees all)', visibleDeptsTh: 'ทุกแผนก',  visibleDeptsEn: 'all departments' },
];

export default function HRBPBenefitsReportsPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const [activeTab, setActiveTab] = useState<ReportTab>('claims');
  // STA-68 — persona switcher (defaults to first HRBP persona)
  const [personaId, setPersonaId] = useState<string>(PERSONAS[0].id);
  const persona = useMemo(() => PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0], [personaId]);
  const isAdmin = persona.scope.kind === 'admin';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-ink-muted">
        <Link href={`/${locale}/hrbp/dashboard`} className="hover:text-ink hover:underline">
          {isTh ? 'หน้าหลัก' : 'Home'}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="hover:text-ink">
          {isTh ? 'สวัสดิการ HRBP' : 'HRBP Benefits'}
        </span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-ink">{isTh ? 'รายงาน' : 'Reports'}</span>
      </nav>

      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-ink">
          {isTh ? 'รายงานสวัสดิการ HRBP' : 'HRBP Benefits Reports'}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isTh
            ? 'ภาพรวมเคลม ค่าใช้จ่าย การลงทะเบียน และสิทธิพิเศษในแผนกที่ดูแล'
            : 'Claims, costs, enrollment, and special privileges for partnered departments'}
        </p>
        {/* STA-68 — Persona / store-based mock scope demo */}
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            {isTh ? 'STA-68 · ขอบเขตข้อมูล (จำลองจาก persona/store)' : 'STA-68 · persona-/store-based mock scope'}
          </p>
          <p className="mt-1 text-xs text-ink">
            {isTh
              ? 'สลับ persona ด้านล่างเพื่อจำลองการกรองตามแผนกของ HRBP. HR Admin จะมองเห็นทุกแผนกเพื่อเปรียบเทียบ. (Mockup — ไม่ใช่การบังคับใช้ authz จริง.)'
              : 'Switch persona below to simulate HRBP department-scoped filtering. HR Admin sees all departments for comparison. (Mock — not real authz enforcement.)'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersonaId(p.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  personaId === p.id
                    ? 'border-accent bg-accent text-white'
                    : 'border-hairline bg-surface text-ink hover:border-accent/50',
                )}
              >
                {isTh ? p.labelTh : p.labelEn}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {isTh
              ? `ขอบเขตปัจจุบัน: ${isAdmin ? 'ทุกแผนก (admin override)' : `เห็นเฉพาะแผนก ${persona.visibleDeptsTh}`}`
              : `Current scope: ${isAdmin ? 'all departments (admin override)' : `visible department only — ${persona.visibleDeptsEn}`}`}
          </p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="mb-6 border-b border-hairline">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-hairline hover:text-ink',
              )}
            >
              {isTh ? tab.labelTh : tab.labelEn}
            </button>
          ))}
        </nav>
      </div>

      {/* Active report */}
      <div>
        {activeTab === 'claims' && <ClaimReport />}
        {activeTab === 'cost' && <CostAnalysisReport />}
        {activeTab === 'enrollment' && <EnrollmentReport />}
        {activeTab === 'privilege' && <SpecialPrivilegeReport />}
      </div>
    </div>
  );
}
