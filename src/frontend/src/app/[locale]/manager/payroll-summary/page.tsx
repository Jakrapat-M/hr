'use client';

// ════════════════════════════════════════════════════════════
// /manager/payroll-summary — READ-ONLY team compensation rollup
//
// HR comp roles (hr_admin / hr_manager) view a per-person comp rollup (base /
// allowances / total) for the employees in their scope. Manager is NOT admitted
// — line managers must not see per-person team comp (privacy/data-minimization);
// the route guard (./layout.tsx) denies them in place. Scope resolves via
// filterEmployeesByPersona (HR resolves to mode 'all').
//
// HARD RULE: READ-ONLY. No edit / approve / write controls anywhere. Sensitive
// figures default-masked with a reveal toggle (HR comp roles may reveal; never
// red; pumpkin-free, token-only chrome).
//
// Comp figures are deterministic static mock derived from each employee id —
// there is no real payroll backend this phase. Route guard lives in
// ./layout.tsx (module 'payroll-team-summary'); denial renders in place.
// ════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Wallet, Eye, EyeOff } from 'lucide-react';
import {
  Card,
  CardEyebrow,
  CardTitle,
  DataTable,
  EmptyState,
  Avatar,
  Button,
  type DataTableColumn,
} from '@/components/humi';
import { useAuthStore } from '@/stores/auth-store';
import { ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';
import { filterEmployeesByPersona, resolveCurrentEmpId } from '@/lib/scope-filter';
import { formatCurrency } from '@/lib/date';
import type { HumiEmployee } from '@/lib/humi-mock-data';

// HumiEmployee.avatarTone carries 'indigo', which the Avatar tone variant does
// not expose — map it onto the nearest supported tone.
type AvatarTone = 'teal' | 'sage' | 'butter' | 'ink';
function avatarTone(tone: HumiEmployee['avatarTone']): AvatarTone {
  return tone === 'indigo' ? 'teal' : tone;
}

// Deterministic static mock comp derived from the employee id — stable across
// renders, no backend. Base in a realistic monthly THB band; allowances a
// fixed fraction. (Mockup phase: figures are illustrative only.)
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
interface CompRow {
  readonly emp: HumiEmployee;
  readonly base: number;
  readonly allowances: number;
  readonly total: number;
}
function compFor(emp: HumiEmployee): CompRow {
  const seed = hashSeed(emp.id);
  const base = 28_000 + (seed % 62_000); // 28k–90k monthly band
  const allowances = 2_000 + (seed % 9_000); // 2k–11k band
  return { emp, base, allowances, total: base + allowances };
}

// Mask a currency string: replace every digit (ASCII or Thai) with a bullet,
// keeping the shape (฿, separators, decimal point) so it reads "฿••,•••.••".
function maskCurrency(formatted: string): string {
  return formatted.replace(/[0-9๐-๙]/g, '•');
}

export default function ManagerPayrollSummaryPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const t = useTranslations('managerPayrollSummary');

  const roles = useAuthStore((s) => s.roles);
  const email = useAuthStore((s) => s.email);
  const currentEmpId = resolveCurrentEmpId(email);

  const [revealed, setRevealed] = useState(false);

  const scope = useMemo(
    () => filterEmployeesByPersona(ALL_PORTED_EMPLOYEES, roles, currentEmpId),
    [roles, currentEmpId],
  );

  // 'direct-reports' mode includes the manager themselves at the head — drop
  // self so the rollup shows ONLY the reports.
  const rows = useMemo<CompRow[]>(
    () =>
      scope.employees
        .filter((e) => e.id !== currentEmpId)
        .map((e) => compFor(e)),
    [scope.employees, currentEmpId],
  );

  const count = rows.length;
  const teamTotal = useMemo(() => rows.reduce((sum, r) => sum + r.total, 0), [rows]);

  const fmt = (n: number) => formatCurrency(n);
  const show = (n: number) => (revealed ? fmt(n) : maskCurrency(fmt(n)));

  const columns: DataTableColumn<CompRow>[] = [
    {
      id: 'name',
      header: t('colName'),
      sortAccessor: (r) => `${r.emp.firstNameTh} ${r.emp.lastNameTh}`,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar
            tone={avatarTone(r.emp.avatarTone)}
            name={`${r.emp.firstNameTh} ${r.emp.lastNameTh}`}
            size="sm"
          />
          <div>
            <div className="font-medium text-ink">
              {r.emp.firstNameTh} {r.emp.lastNameTh}
            </div>
            <div className="text-xs text-ink-muted">{r.emp.employeeCode}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'position',
      header: t('colPosition'),
      sortAccessor: (r) => r.emp.position,
      cell: (r) => <span className="text-ink-muted">{r.emp.jobTitle || r.emp.position}</span>,
    },
    {
      id: 'base',
      header: t('colBase'),
      align: 'right',
      sortAccessor: (r) => r.base,
      cell: (r) => <span className="tabular-nums text-ink">{show(r.base)}</span>,
    },
    {
      id: 'allowances',
      header: t('colAllowances'),
      align: 'right',
      sortAccessor: (r) => r.allowances,
      cell: (r) => <span className="tabular-nums text-ink-muted">{show(r.allowances)}</span>,
    },
    {
      id: 'total',
      header: t('colTotal'),
      align: 'right',
      sortAccessor: (r) => r.total,
      cell: (r) => <span className="tabular-nums font-medium text-ink">{show(r.total)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <CardEyebrow>{t('eyebrow')}</CardEyebrow>
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="text-ink-muted" data-testid="payroll-summary-scope-line">
          {t('scope', { count })}
        </p>
        <p className="text-xs text-ink-faint">{t('readOnlyNote')}</p>
      </header>

      <Card variant="raised" size="lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t('cardTitle')}</CardTitle>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevealed((v) => !v)}
              data-testid="payroll-summary-reveal-toggle"
            >
              {revealed ? (
                <>
                  <EyeOff className="h-4 w-4" aria-hidden /> {t('hide')}
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" aria-hidden /> {t('reveal')}
                </>
              )}
            </Button>
          )}
        </div>

        {count === 0 ? (
          <EmptyState
            icon={Wallet}
            titleTh="ไม่มีพนักงานในขอบเขตของคุณ"
            titleEn="No employees in scope"
            descTh="เมื่อมีพนักงานในขอบเขตของคุณ สรุปค่าตอบแทนจะแสดงที่นี่"
            descEn="When employees are in your scope, their compensation summary appears here."
          />
        ) : (
          <>
            <DataTable
              caption={t('caption')}
              captionVisuallyHidden
              columns={columns}
              rows={rows}
              rowKey={(r) => r.emp.id}
            />
            <div
              className="mt-4 flex items-center justify-between border-t border-hairline pt-4"
              data-testid="payroll-summary-team-total"
            >
              <span className="text-sm font-medium text-ink">{t('teamTotalLabel')}</span>
              <span className="tabular-nums text-base font-semibold text-ink">
                {show(teamTotal)}
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
