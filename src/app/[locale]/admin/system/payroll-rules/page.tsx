'use client';

// admin/system/payroll-rules/page.tsx — HRIS Payroll Rules configuration surface
// (Cnext Journey EC/BE work-item #1, artboard 05.1). Single source of truth for
// bonus, OT multiplier, provident fund and withholding tax.
// UI-MOCKUP phase: static seed rows, no persistence.

import { useLocale, useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Card, CardEyebrow, DataTable, Capability } from '@/components/cnext';
import type { DataTableColumn } from '@/components/cnext';

type RuleRow = { id: string; labelTh: string; labelEn: string; value: string };

const RULE_ROWS: RuleRow[] = [
  { id: 'bonus',   labelTh: 'โบนัสประจำปี',                labelEn: 'Annual bonus',                value: '2 เดือน / 2 months' },
  { id: 'ot',      labelTh: 'อัตราค่าล่วงเวลา (OT)',        labelEn: 'Overtime (OT) multiplier',    value: '1.5×' },
  { id: 'pvd',     labelTh: 'กองทุนสำรองเลี้ยงชีพ (PVD)',   labelEn: 'Provident fund (PVD)',        value: 'พนักงาน 5% + นายจ้าง 5%' },
  { id: 'wht',     labelTh: 'ภาษีหัก ณ ที่จ่าย',           labelEn: 'Withholding tax',             value: 'ตามอัตราก้าวหน้า / Progressive' },
  { id: 'sso',     labelTh: 'ประกันสังคม',                 labelEn: 'Social security',             value: '5% (สูงสุด ฿750/เดือน)' },
];

export default function PayrollRulesPage() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const isTh = locale !== 'en';

  const columns: DataTableColumn<RuleRow>[] = [
    {
      id: 'parameter',
      header: t('hrisConfig.colParameter'),
      cell: (row) => <span className="text-sm text-ink">{isTh ? row.labelTh : row.labelEn}</span>,
    },
    {
      id: 'value',
      header: t('hrisConfig.colValue'),
      className: 'w-56',
      cell: (row) => <span className="text-sm font-medium text-ink">{row.value}</span>,
    },
  ];

  return (
    <Capability
      action="editFoundation"
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-ink-muted">
            {isTh ? 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' : 'You do not have access to this page.'}
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <header>
          <CardEyebrow>{t('hrisConfig.eyebrow')}</CardEyebrow>
          <h1 className="font-display text-3xl font-semibold text-ink">{t('hrisConfig.payrollRulesTitle')}</h1>
          <p className="mt-2 text-small text-ink-muted">{t('hrisConfig.payrollRulesDesc')}</p>
        </header>

        <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3 text-small text-accent-ink">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-accent" aria-hidden />
          {t('hrisConfig.sourceOfTruth')}
        </p>

        <Card variant="raised" flush>
          <DataTable
            caption={t('hrisConfig.payrollRulesTitle')}
            captionVisuallyHidden
            rows={RULE_ROWS}
            columns={columns}
            rowKey={(row) => row.id}
          />
        </Card>
      </div>
    </Capability>
  );
}
