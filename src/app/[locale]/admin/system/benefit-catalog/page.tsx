'use client';

// admin/system/benefit-catalog/page.tsx — HRIS Benefit Catalog configuration
// surface (Cnext Journey EC/BE work-item #1, artboard 04.7). Single source of
// truth for benefit types + default annual quota; HR Admin overrides per grade.
// UI-MOCKUP phase: static seed rows, no persistence.

import { useLocale, useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Card, CardEyebrow, DataTable, Capability } from '@/components/cnext';
import type { DataTableColumn } from '@/components/cnext';

type BenefitRow = { id: string; labelTh: string; labelEn: string; quota: string };

const BENEFIT_ROWS: BenefitRow[] = [
  { id: 'dental',     labelTh: 'ทันตกรรม',          labelEn: 'Dental',          quota: '฿4,000 / ปี' },
  { id: 'opd',        labelTh: 'ผู้ป่วยนอก (OPD)',   labelEn: 'Outpatient (OPD)', quota: '฿20,000 / ปี' },
  { id: 'ipd',        labelTh: 'ผู้ป่วยใน (IPD)',     labelEn: 'Inpatient (IPD)',  quota: '฿80,000 / ปี' },
  { id: 'optical',    labelTh: 'แว่นสายตา',          labelEn: 'Optical',         quota: '฿3,000 / ปี' },
  { id: 'lifeins',    labelTh: 'ประกันชีวิตกลุ่ม',    labelEn: 'Group life insurance', quota: '฿500,000' },
  { id: 'health',     labelTh: 'ตรวจสุขภาพประจำปี',   labelEn: 'Annual health check', quota: '฿2,500 / ปี' },
];

export default function BenefitCatalogPage() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const isTh = locale !== 'en';

  const columns: DataTableColumn<BenefitRow>[] = [
    {
      id: 'benefit',
      header: t('hrisConfig.colBenefit'),
      cell: (row) => <span className="text-sm text-ink">{isTh ? row.labelTh : row.labelEn}</span>,
    },
    {
      id: 'quota',
      header: t('hrisConfig.colQuota'),
      className: 'w-48',
      cell: (row) => <span className="text-sm font-medium tabular-nums text-ink">{row.quota}</span>,
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
          <h1 className="font-display text-3xl font-semibold text-ink">{t('hrisConfig.benefitCatalogTitle')}</h1>
          <p className="mt-2 text-small text-ink-muted">{t('hrisConfig.benefitCatalogDesc')}</p>
        </header>

        <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3 text-small text-accent-ink">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-accent" aria-hidden />
          {t('hrisConfig.sourceOfTruth')}
        </p>

        <Card variant="raised" flush>
          <DataTable
            caption={t('hrisConfig.benefitCatalogTitle')}
            captionVisuallyHidden
            rows={BENEFIT_ROWS}
            columns={columns}
            rowKey={(row) => row.id}
          />
        </Card>

        <p className="text-xs text-ink-muted">{t('hrisConfig.benefitOverrideHint')}</p>
      </div>
    </Capability>
  );
}
