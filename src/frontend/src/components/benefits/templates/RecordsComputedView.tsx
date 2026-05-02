'use client';

import { useLocale } from 'next-intl';
import { Card, CardEyebrow, CardTitle } from '@/components/humi';
import type { BenefitTemplateProps } from './SimpleClaimForm';

// ── RecordsComputedView ───────────────────────────────────────────────────────
// Template: records-computed
// Use cases: BE-LIF-001 Life & Accident Self-Funded (display-only, salary-driven)
// No submit. Shows salary-based computed coverage with bilingual labels.

// Mock salary data — Sprint 2 will wire to real compensation API
const MOCK_SALARY_THB = 85000;
const LIFE_MULTIPLIER = 1; // 1× base salary per TTT BE_15
const ACCIDENT_MULTIPLIER = 1; // 1× base salary

interface CoverageRowProps {
  labelTh: string;
  labelEn: string;
  value: string;
  locale: string;
}

function CoverageRow({ labelTh, labelEn, value, locale }: CoverageRowProps) {
  const isTh = locale !== 'en';
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-hairline last:border-0">
      <span className="text-small text-ink-muted">{isTh ? labelTh : labelEn}</span>
      <span className="text-body font-medium text-ink tabular-nums">{value}</span>
    </div>
  );
}

export function RecordsComputedView({
  plan,
  className,
}: BenefitTemplateProps) {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const planName = isTh ? plan.nameTh : plan.nameEn;

  const lifeCoverage = MOCK_SALARY_THB * LIFE_MULTIPLIER;
  const accidentCoverage = MOCK_SALARY_THB * ACCIDENT_MULTIPLIER;
  const fmt = (n: number) => `${n.toLocaleString('th-TH')} ${isTh ? 'บาท' : 'THB'}`;

  return (
    <Card variant="raised" size="lg" className={className}>
      <CardEyebrow>{isTh ? 'ข้อมูลสวัสดิการ · ดูข้อมูลเท่านั้น' : 'Benefit info · view only'}</CardEyebrow>
      <CardTitle>{planName}</CardTitle>
      <p className="mt-2 text-small text-ink-muted">{plan.eligibilityTh}</p>

      {/* View-only badge */}
      <div className="mt-3 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
        <span className="text-small font-medium text-accent">
          {isTh ? 'บริษัทดูแลค่าเบี้ยประกันให้ทั้งหมด' : 'Premium fully covered by the company'}
        </span>
      </div>

      {/* Coverage summary */}
      <div className="mt-4 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4">
        <p className="mb-3 text-small font-semibold text-ink">
          {isTh ? 'ความคุ้มครองของคุณ (คำนวณจากฐานเงินเดือน)' : 'Your coverage (salary-based calculation)'}
        </p>

        <CoverageRow
          labelTh="ฐานเงินเดือน"
          labelEn="Base salary"
          value={fmt(MOCK_SALARY_THB)}
          locale={locale}
        />
        <CoverageRow
          labelTh="ความคุ้มครองประกันชีวิต"
          labelEn="Life insurance coverage"
          value={fmt(lifeCoverage)}
          locale={locale}
        />
        <CoverageRow
          labelTh="ความคุ้มครองประกันอุบัติเหตุ"
          labelEn="Accident insurance coverage"
          value={fmt(accidentCoverage)}
          locale={locale}
        />
        <CoverageRow
          labelTh="ผู้รับผลประโยชน์"
          labelEn="Beneficiary"
          value={isTh ? 'ตามที่แจ้งไว้กับ HR' : 'As declared with HR'}
          locale={locale}
        />
      </div>

      {/* Eligibility note */}
      <p className="mt-4 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3 text-small text-accent">
        {isTh
          ? 'ข้อมูลนี้อัปเดตโดยอัตโนมัติเมื่อมีการเปลี่ยนแปลงเงินเดือน · ไม่สามารถแก้ไขได้ผ่านระบบนี้'
          : 'Coverage updates automatically on salary changes · cannot be edited in this system'}
      </p>

      {/* No submit / action — display only */}
    </Card>
  );
}
