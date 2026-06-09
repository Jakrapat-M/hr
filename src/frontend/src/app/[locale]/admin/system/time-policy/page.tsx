'use client';

// admin/system/time-policy/page.tsx — HRIS Time Policy configuration surface
// (Humi Journey EC/BE work-item #1, artboard 03.5). Single source of truth for
// leave allowances, medical-cert thresholds, carry-over and clock-in rules.
// UI-MOCKUP phase: static seed rows, no persistence.

import { useLocale, useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Card, CardEyebrow, DataTable, Capability } from '@/components/humi';
import type { DataTableColumn } from '@/components/humi';

type PolicyRow = { id: string; labelTh: string; labelEn: string; value: string };

const POLICY_ROWS: PolicyRow[] = [
  { id: 'sick',        labelTh: 'ลาป่วย / ปี',                       labelEn: 'Sick leave / year',                 value: '30' },
  { id: 'medcert',     labelTh: 'ต้องมีใบรับรองแพทย์เมื่อลา ≥',        labelEn: 'Medical certificate required from',  value: '3' },
  { id: 'annual',      labelTh: 'ลาพักร้อน / ปี',                     labelEn: 'Annual leave / year',               value: '10' },
  { id: 'carryover',   labelTh: 'สะสมวันลาพักร้อนข้ามปี',              labelEn: 'Annual leave carry-over',           value: 'ได้สูงสุด 5 วัน / Up to 5 days' },
  { id: 'clockin',     labelTh: 'เวลาเข้างานมาตรฐาน',                 labelEn: 'Standard clock-in time',            value: '09:00' },
  { id: 'late',        labelTh: 'ถือว่าสายเมื่อเกิน',                  labelEn: 'Marked late after',                 value: '09:15' },
];

export default function TimePolicyPage() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const isTh = locale !== 'en';

  const columns: DataTableColumn<PolicyRow>[] = [
    {
      id: 'parameter',
      header: t('hrisConfig.colParameter'),
      cell: (row) => <span className="text-sm text-ink">{isTh ? row.labelTh : row.labelEn}</span>,
    },
    {
      id: 'value',
      header: t('hrisConfig.colValue'),
      className: 'w-48',
      cell: (row) => <span className="text-sm font-medium tabular-nums text-ink">{row.value}</span>,
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
          <h1 className="font-display text-3xl font-semibold text-ink">{t('hrisConfig.timePolicyTitle')}</h1>
          <p className="mt-2 text-small text-ink-muted">{t('hrisConfig.timePolicyDesc')}</p>
        </header>

        <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3 text-small text-accent-ink">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-accent" aria-hidden />
          {t('hrisConfig.sourceOfTruth')}
        </p>

        <Card variant="raised" flush>
          <DataTable
            caption={t('hrisConfig.timePolicyTitle')}
            captionVisuallyHidden
            rows={POLICY_ROWS}
            columns={columns}
            rowKey={(row) => row.id}
          />
        </Card>
      </div>
    </Capability>
  );
}
