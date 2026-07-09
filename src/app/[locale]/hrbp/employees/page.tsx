'use client';

// ════════════════════════════════════════════════════════════
// /hrbp/employees — BU-scoped READ-ONLY employee registry (P2 Item 1)
//
// People-Partner personas (HRBP, SPD) see the employees in THEIR business
// unit. SPD / HR Admin / HR Manager resolve to 'all' via pickScopeMode.
// Read-only: ScopeResult.canEdit is false for 'bu' — no edit/action buttons.
//
// Route guard lives in ./layout.tsx (People-Partner + above, AccessDenied in
// place on deny). This file renders the main column only (AppShell owns shell).
// ════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import {
  Card,
  CardEyebrow,
  CardTitle,
  DataTable,
  EmptyState,
  Avatar,
  type DataTableColumn,
} from '@/components/cnext';
import { useAuthStore } from '@/stores/auth-store';
import { ALL_PORTED_EMPLOYEES, EMP_BY_LOGIN } from '@/lib/all-ported-employees';
import { filterEmployeesByPersona } from '@/lib/scope-filter';
import type { CnextEmployee } from '@/lib/cnext-mock-data';

// Bilingual labels for the canonical BU ids seeded in all-ported-employees.ts.
// Data-derived chrome (not free text) — kept local, parallel to the seed map.
const BU_LABELS: Record<string, { th: string; en: string }> = {
  'BU-PEOPLE': { th: 'ทรัพยากรบุคคล', en: 'People & Org' },
  'BU-FINANCE': { th: 'การเงินและบัญชี', en: 'Finance & Accounting' },
  'BU-TECH': { th: 'เทคโนโลยีและข้อมูล', en: 'Technology & Data' },
  'BU-STRATEGY': { th: 'กลยุทธ์องค์กร', en: 'Corporate Strategy' },
  'BU-LEGAL': { th: 'กฎหมายและกำกับดูแล', en: 'Legal & Compliance' },
  'BU-RETAIL': { th: 'ขายและการตลาด', en: 'Sales & Retail' },
  'BU-OPS': { th: 'ปฏิบัติการ', en: 'Operations' },
};

const STATUS_LABELS: Record<string, { th: string; en: string }> = {
  active: { th: 'ทำงานอยู่', en: 'Active' },
  leave: { th: 'ลางาน', en: 'On leave' },
  probation: { th: 'ทดลองงาน', en: 'Probation' },
  terminated: { th: 'พ้นสภาพ', en: 'Terminated' },
};

// CnextEmployee.avatarTone carries 'indigo', which the Avatar tone variant does
// not expose — map it onto the nearest supported tone.
type AvatarTone = 'teal' | 'sage' | 'butter' | 'ink';
function avatarTone(tone: CnextEmployee['avatarTone']): AvatarTone {
  return tone === 'indigo' ? 'teal' : tone;
}

function pickLabel(
  map: Record<string, { th: string; en: string }>,
  key: string | undefined,
  isTh: boolean,
  fallback = '—',
): string {
  if (!key) return fallback;
  const m = map[key];
  if (!m) return key;
  return isTh ? m.th : m.en;
}

export default function HrbpEmployeesPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const t = useTranslations('hrbpEmployees');

  const roles = useAuthStore((s) => s.roles);
  const email = useAuthStore((s) => s.email);
  const currentEmpId = email ? EMP_BY_LOGIN[email] ?? null : null;

  const scope = useMemo(
    () => filterEmployeesByPersona(ALL_PORTED_EMPLOYEES, roles, currentEmpId),
    [roles, currentEmpId],
  );

  const count = scope.employees.length;
  const headerLine = scope.mode === 'all' ? t('scopeAll', { count }) : t('scopeBu', { count });

  const columns: DataTableColumn<CnextEmployee>[] = [
    {
      id: 'name',
      header: t('colName'),
      sortAccessor: (r) => `${r.firstNameTh} ${r.lastNameTh}`,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar tone={avatarTone(r.avatarTone)} name={`${r.firstNameTh} ${r.lastNameTh}`} size="sm" />
          <div>
            <div className="font-medium text-ink">
              {r.firstNameTh} {r.lastNameTh}
            </div>
            <div className="text-xs text-ink-muted">{r.employeeCode}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'position',
      header: t('colPosition'),
      sortAccessor: (r) => r.position,
      cell: (r) => <span className="text-ink">{r.jobTitle || r.position}</span>,
    },
    {
      id: 'department',
      header: t('colDepartment'),
      sortAccessor: (r) => r.department,
      cell: (r) => <span className="text-ink-muted">{r.department}</span>,
    },
    {
      id: 'bu',
      header: t('colBu'),
      sortAccessor: (r) => r.businessUnitId ?? '',
      cell: (r) => (
        <span className="text-ink-muted">{pickLabel(BU_LABELS, r.businessUnitId, isTh)}</span>
      ),
    },
    {
      id: 'status',
      header: t('colStatus'),
      sortAccessor: (r) => r.status,
      cell: (r) => <span className="text-ink-muted">{pickLabel(STATUS_LABELS, r.status, isTh)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <CardEyebrow>{t('eyebrow')}</CardEyebrow>
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="text-ink-muted" data-testid="hrbp-employees-scope-line">
          {headerLine}
        </p>
      </header>

      <Card variant="raised" size="lg">
        <CardTitle className="mb-4">{t('cardTitle')}</CardTitle>
        {count === 0 ? (
          <EmptyState
            icon={Users}
            titleTh="ไม่พบพนักงานในหน่วยงานของคุณ"
            titleEn="No employees in your business unit"
            descTh="เมื่อมีพนักงานในหน่วยงานของคุณ รายชื่อจะแสดงที่นี่"
            descEn="When your business unit has members, they will appear here."
          />
        ) : (
          <DataTable
            caption={t('caption')}
            captionVisuallyHidden
            columns={columns}
            rows={scope.employees as CnextEmployee[]}
            rowKey={(r) => r.id}
          />
        )}
      </Card>
    </div>
  );
}
