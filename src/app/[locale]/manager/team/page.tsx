'use client';

// ════════════════════════════════════════════════════════════
// /manager/team — DIRECT-REPORTS read-only team directory (P2)
//
// Manager persona sees the employees who report to them (managerId === self).
// filterEmployeesByPersona resolves mode 'direct-reports' for a plain manager;
// People-Partners / HR Admin resolve to 'bu' / 'all' (super-set is fine — they
// can view their team too). Read-only: no edit/action buttons.
//
// Restores the team-directory affordance the P1 cut removed (the dead
// /admin/employees?scope=team CTA on manager-dashboard).
//
// Route guard lives in ./layout.tsx (Manager + People-Partner + above,
// AccessDenied in place on deny). This file renders the main column only.
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
import { ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';
import { filterEmployeesByPersona, resolveCurrentEmpId } from '@/lib/scope-filter';
import type { CnextEmployee } from '@/lib/cnext-mock-data';

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

export default function ManagerTeamPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const t = useTranslations('managerTeam');

  const roles = useAuthStore((s) => s.roles);
  const email = useAuthStore((s) => s.email);
  const currentEmpId = resolveCurrentEmpId(email);

  const scope = useMemo(
    () => filterEmployeesByPersona(ALL_PORTED_EMPLOYEES, roles, currentEmpId),
    [roles, currentEmpId],
  );

  // 'direct-reports' mode includes the manager themselves at the head of the
  // list — drop self so the count + table show ONLY the reports.
  const reports = useMemo(
    () => scope.employees.filter((e) => e.id !== currentEmpId),
    [scope.employees, currentEmpId],
  );

  const count = reports.length;
  const headerLine = t('scope', { count });

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
        <p className="text-ink-muted" data-testid="manager-team-scope-line">
          {headerLine}
        </p>
      </header>

      <Card variant="raised" size="lg">
        <CardTitle className="mb-4">{t('cardTitle')}</CardTitle>
        {count === 0 ? (
          <EmptyState
            icon={Users}
            titleTh="ไม่มีผู้ใต้บังคับบัญชาโดยตรง"
            titleEn="No direct reports"
            descTh="เมื่อมีสมาชิกในทีมรายงานตรงต่อคุณ รายชื่อจะแสดงที่นี่"
            descEn="When team members report to you, they will appear here."
          />
        ) : (
          <DataTable
            caption={t('caption')}
            captionVisuallyHidden
            columns={columns}
            rows={reports as CnextEmployee[]}
            rowKey={(r) => r.id}
          />
        )}
      </Card>
    </div>
  );
}
