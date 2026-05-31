// Workforce Reports — persona-scoped aggregate rollups (P2).
// Open route (menu show: manager/hrbp/hradmin/hris/spd/sysadmin). We DO NOT deny
// here — instead the employee set the report aggregates over is narrowed to the
// persona's scope (manager → direct reports · hrbp → BU · spd/admin → all), so
// every persona sees correct counts for what it is entitled to see.
// MOCKUP ONLY: aggregates derive from ALL_PORTED_EMPLOYEES, no backend.

'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BarChart3, Users } from 'lucide-react';
import { Card, DataTable, EmptyState, type DataTableColumn } from '@/components/humi';
import { useAuthStore } from '@/stores/auth-store';
import { ALL_PORTED_EMPLOYEES, EMP_BY_LOGIN } from '@/lib/all-ported-employees';
import { filterEmployeesByPersona } from '@/lib/scope-filter';
import type { HumiEmployee } from '@/lib/humi-mock-data';

interface DeptRollup {
  department: string;
  total: number;
  active: number;
  leave: number;
}

function rollupByDepartment(emps: ReadonlyArray<HumiEmployee>): DeptRollup[] {
  const map = new Map<string, DeptRollup>();
  for (const e of emps) {
    const key = e.department || '—';
    const row = map.get(key) ?? { department: key, total: 0, active: 0, leave: 0 };
    row.total += 1;
    if (e.status === 'active') row.active += 1;
    if (e.status === 'leave') row.leave += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export default function ReportsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isTh = locale !== 'en';

  // ── Persona scope — aggregate only over the entitled employee slice ──
  const roles = useAuthStore((s) => s.roles);
  const email = useAuthStore((s) => s.email);
  const currentEmpId = email ? EMP_BY_LOGIN[email] ?? null : null;

  const scope = useMemo(
    () => filterEmployeesByPersona(ALL_PORTED_EMPLOYEES, roles, currentEmpId),
    [roles, currentEmpId],
  );
  const employees = scope.employees;
  const isScoped = scope.mode !== 'all';

  const totals = useMemo(() => {
    const active = employees.filter((e) => e.status === 'active').length;
    const onLeave = employees.filter((e) => e.status === 'leave').length;
    const depts = new Set(employees.map((e) => e.department)).size;
    return { headcount: employees.length, active, onLeave, depts };
  }, [employees]);

  const deptRows = useMemo(() => rollupByDepartment(employees), [employees]);

  const columns: DataTableColumn<DeptRollup>[] = useMemo(
    () => [
      {
        id: 'department',
        header: isTh ? 'แผนก' : 'Department',
        cell: (r) => <span className="font-medium text-ink">{r.department}</span>,
        sortAccessor: (r) => r.department,
      },
      {
        id: 'total',
        header: isTh ? 'ทั้งหมด' : 'Headcount',
        align: 'right',
        cell: (r) => <span className="tabular-nums text-ink">{r.total}</span>,
        sortAccessor: (r) => r.total,
      },
      {
        id: 'active',
        header: isTh ? 'ทำงาน' : 'Active',
        align: 'right',
        cell: (r) => <span className="tabular-nums text-ink-muted">{r.active}</span>,
        sortAccessor: (r) => r.active,
      },
      {
        id: 'leave',
        header: isTh ? 'ลา' : 'On leave',
        align: 'right',
        cell: (r) => <span className="tabular-nums text-ink-muted">{r.leave}</span>,
        sortAccessor: (r) => r.leave,
      },
    ],
    [isTh],
  );

  const kpis = [
    { id: 'headcount', label: isTh ? 'จำนวนพนักงาน' : 'Headcount', value: totals.headcount },
    { id: 'active', label: isTh ? 'ทำงานอยู่' : 'Active', value: totals.active },
    { id: 'leave', label: isTh ? 'กำลังลา' : 'On leave', value: totals.onLeave },
    { id: 'depts', label: isTh ? 'แผนก' : 'Departments', value: totals.depts },
  ];

  return (
    <div className="pb-8 flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {isTh ? 'HUMI • รายงาน' : 'HUMI • REPORTS'}
        </span>
        <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
          {t('pages.reports.title')}
        </h1>
        <p className="text-small text-ink-muted mt-1">
          {isScoped
            ? scope.mode === 'bu'
              ? isTh
                ? 'สรุปกำลังคนเฉพาะหน่วยงานของคุณ'
                : 'Workforce summary for your business unit only'
              : isTh
                ? 'สรุปกำลังคนเฉพาะทีมของคุณ'
                : "Workforce summary for your team only"
            : isTh
              ? 'สรุปกำลังคนทั้งองค์กร'
              : 'Organization-wide workforce summary'}
        </p>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.id} variant="raised" size="md">
            <div className="flex flex-col gap-1">
              <span className="text-small text-ink-muted">{k.label}</span>
              <span className="font-display text-[length:var(--text-display-h2)] font-semibold tabular-nums text-ink">
                {k.value}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* By-department rollup */}
      <Card variant="raised" size="lg" flush>
        <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
          <BarChart3 size={18} className="text-accent" aria-hidden />
          <h2 className="font-display text-[length:var(--text-display-h3)] font-semibold tracking-tight text-ink">
            {isTh ? 'กำลังคนตามแผนก' : 'Headcount by department'}
          </h2>
        </div>
        <div className="px-2 py-1">
          <DataTable
            caption={isTh ? 'กำลังคนตามแผนก' : 'Headcount by department'}
            captionVisuallyHidden
            columns={columns}
            rows={deptRows}
            rowKey={(r) => r.department}
            emptyState={
              <EmptyState
                icon={Users}
                titleTh="ไม่มีข้อมูลในขอบเขตของคุณ"
                titleEn="No data in your scope"
                descTh="ยังไม่มีพนักงานในขอบเขตที่คุณดูแล"
                descEn="There are no employees within the scope you manage."
              />
            }
          />
        </div>
      </Card>
    </div>
  );
}
