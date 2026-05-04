'use client';

import { useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Download,
  Plus,
  FileText,
  ArrowRight,
  Search,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  CardEyebrow,
  CardTitle,
  buttonVariants,
  Modal,
} from '@/components/humi';
import { BenefitServicesPanel } from '@/components/benefits/BenefitServicesPanel';
import { cn } from '@/lib/utils';
import { benefitProfileRoute, benefitClaimRoute } from '@/lib/benefit-routes';
import {
  HUMI_DEPENDENTS,
  HUMI_CLAIM_ALLOWANCES,
  HUMI_CLAIM_HISTORY,
  ACCENT_BAR_CLASS,
  CLAIM_STATUS_META,
} from '@/lib/humi-mock-data';
import { useBenefitsStore, type BenefitsTabKey } from '@/stores/humi-benefits-slice';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';
import { getPlan } from '@/data/benefits/plan-registry';

// ════════════════════════════════════════════════════════════
// /benefits-hub — Benefit Work Zone (compact redesign)
// Page concepts map to SF Employee Central self-service modules:
//   - BenefitProgram        → BenefitsTab plan grid (registry-driven)
//   - BenefitsClaim         → ClaimsTab history + allowances
//   - BenefitsDependent     → BenefitsTab dependent strip
//   - Document Generation   → DocsTab (DEMO MOCK; BRD #105–108 wiring deferred)
//   - Company Policies      → PoliciesTab (DEMO MOCK)
// ════════════════════════════════════════════════════════════

// Tab labels: [key, labelTh, labelEn]
const TABS: Array<[BenefitsTabKey, string, string]> = [
  ['benefits', 'สิทธิ์และผู้รับสิทธิ์', 'Benefits & dependents'],
  ['claims',   'ประวัติการเบิก',        'Claim history'],
  ['docs',     'เอกสาร',                 'Documents'],
  ['policies', 'นโยบาย',                 'Policies'],
];

// DEMO MOCK — replace with backend-driven document service in production (BRD #105–108).
const DOCS = [
  { nTh: 'ลงทะเบียนสวัสดิการปี 2569',       nEn: 'Benefits enrollment 2026',  kTh: 'แบบฟอร์ม',           kEn: 'Form',           dTh: 'ครบกำหนด 29 เม.ย.',   dEn: 'Due Apr 29',        action: 'sign'     as const },
  { nTh: 'ระเบียบการปฏิบัติงาน (ฉบับที่ 4)', nEn: 'Code of conduct (rev. 4)',  kTh: 'นโยบาย',             kEn: 'Policy',         dTh: 'รอรับทราบ',           dEn: 'Acknowledgement',   action: 'sign'     as const },
  { nTh: 'บัตรประกันสุขภาพกลุ่ม',            nEn: 'Group medical card',        kTh: 'สวัสดิการ',           kEn: 'Benefit',        dTh: 'พร้อมดาวน์โหลด',      dEn: 'Ready',             action: 'download' as const },
  { nTh: 'แบบฟอร์มเพิ่มผู้ใช้สิทธิ์ร่วม',     nEn: 'Add dependent form',        kTh: 'สวัสดิการครอบครัว',  kEn: 'Family benefit', dTh: 'อัปเดต 12 ก.พ.',      dEn: 'Updated Feb 12',    action: 'download' as const },
  { nTh: 'อบรมความปลอดภัยในการทำงาน',       nEn: 'Workplace safety training', kTh: 'การฝึกอบรม',         kEn: 'Training',       dTh: 'เสร็จสิ้น 8 ม.ค.',     dEn: 'Completed Jan 8',   action: 'download' as const },
  { nTh: 'สัญญาจ้างงาน',                     nEn: 'Employment contract',       kTh: 'เอกสารทางกฎหมาย',    kEn: 'Legal',          dTh: 'ลงนามเมื่อ ต.ค. 2567',dEn: 'Signed Oct 2024',   action: 'download' as const },
];

// DEMO MOCK — replace with policy CMS feed in production.
const POLICIES = [
  {
    tTh: 'การลางานและวันหยุด',
    tEn: 'Leave & holidays',
    uTh: 'อัปเดต มี.ค. 2569',
    uEn: 'Updated Mar 2026',
    bodyTh: 'การสะสมวันลาพักร้อน กฎการยกยอด ค่าจ้างวันหยุดสำหรับพนักงานประจำและสัญญาจ้าง',
    bodyEn: 'Vacation accrual, carry-over rules, and holiday pay for permanent and contract staff.',
  },
  {
    tTh: 'ลาคลอด',
    tEn: 'Maternity leave',
    uTh: 'มีผล 1 พ.ค.',
    uEn: 'Effective May 1',
    bodyTh: 'ลา 16 สัปดาห์ได้รับค่าจ้างเต็ม ใช้ได้กับทุกประเภทการจ้างหลังทำงานครบ 6 เดือน',
    bodyEn: '16 weeks at full pay, available to all employment types after 6 months of service.',
  },
  {
    tTh: 'ความปลอดภัยในสำนักงาน',
    tEn: 'Office safety',
    uTh: 'อัปเดต ม.ค. 2569',
    uEn: 'Updated Jan 2026',
    bodyTh: 'ข้อบังคับความปลอดภัย · การใช้อุปกรณ์สำนักงาน · ขั้นตอนรายงานเหตุการณ์',
    bodyEn: 'Safety rules · office equipment guidelines · incident reporting steps.',
  },
  {
    tTh: 'ระเบียบการปฏิบัติงาน',
    tEn: 'Code of conduct',
    uTh: 'ฉบับที่ 4 · เม.ย. 2569',
    uEn: 'Revision 4 · Apr 2026',
    bodyTh: 'การเคารพในที่ทำงาน การต่อต้านการคุกคาม ผลประโยชน์ทับซ้อน การรายงาน',
    bodyEn: 'Workplace respect, anti-harassment, conflicts of interest, reporting channels.',
  },
];

const EYEBROW_TEXT_CLASS =
  'text-[length:var(--text-eyebrow)] leading-[var(--text-eyebrow--line-height)] tracking-[0.14em] uppercase font-semibold';

// ── Registry-driven enrolled-plan view ────────────────────────────────────────
// Maps SF-derived BENEFIT_PLAN_REGISTRY rows to display cards. Pulls live data
// (nameTh/nameEn, coverage limit, taxation) from the registry rather than
// fabricating plans (HUMI_BENEFIT_PLANS retired here per BRD/CNEXT parity).

interface EnrolledPlanView {
  id: string;
  titleTh: string;
  titleEn: string;
  nameTh: string;
  nameEn: string;
  costTh: string;
  costEn: string;
  /** Utilization % when tracked (0–100). null when not applicable (eg. records-computed). */
  percent: number | null;
  itemsTh: string[];
  itemsEn: string[];
  barClass: string;
}

function buildEnrolledPlanView(
  planId: string,
  allowanceId: string | null,
  barClass: string,
  titleOverrides?: { th: string; en: string }
): EnrolledPlanView | null {
  const plan = getPlan(planId);
  if (!plan) return null;
  const isV2 = plan.schemaVersion === 'v2';

  const allowance = allowanceId
    ? HUMI_CLAIM_ALLOWANCES.find((a) => a.id === allowanceId)
    : undefined;
  const percent = allowance
    ? Math.min(100, Math.round((allowance.used / allowance.limit) * 100))
    : null;

  const limit =
    (isV2 ? plan.coverage?.entitlementAmount : null) ?? plan.annualLimitThb ?? null;
  const limitTh = limit ? `วงเงินปี ฿${limit.toLocaleString()}` : 'คุ้มครองอัตโนมัติ';
  const limitEn = limit ? `Annual ฿${limit.toLocaleString()}` : 'Auto coverage';

  const taxationMode = isV2 ? plan.claimRules?.taxationMode : null;
  const taxationTh = taxationMode === 'Non-taxable' ? 'ไม่หักภาษี' : 'หักภาษีตามเงื่อนไข';
  const taxationEn = taxationMode === 'Non-taxable' ? 'Non-taxable' : 'Taxable';

  const eligibilityTh = plan.eligibilityTh ?? 'พนักงานประจำ';
  const eligibilityEn = isV2 ? plan.eligibilityEn ?? 'Permanent staff' : 'Permanent staff';

  return {
    id: plan.id,
    titleTh: titleOverrides?.th ?? plan.nameTh,
    titleEn: titleOverrides?.en ?? plan.nameEn,
    nameTh: plan.nameTh,
    nameEn: plan.nameEn,
    costTh: 'บริษัทเป็นผู้จ่าย',
    costEn: 'Company-paid',
    percent,
    itemsTh: [limitTh, eligibilityTh, taxationTh],
    itemsEn: [limitEn, eligibilityEn, taxationEn],
    barClass,
  };
}

function useEnrolledPlans(): EnrolledPlanView[] {
  const med = buildEnrolledPlanView('BE-MED-001', 'ca-medical', 'bg-accent', {
    th: 'ค่ารักษาพยาบาล',
    en: 'Medical reimbursement',
  });
  const dental = buildEnrolledPlanView('BE-DEN-001', 'ca-dental', 'bg-[color:var(--color-accent-alt)]', {
    th: 'ค่าทันตกรรม',
    en: 'Dental',
  });
  const life = buildEnrolledPlanView('BE-LIF-001', null, 'bg-[color:var(--color-sage)]', {
    th: 'ประกันชีวิตและอุบัติเหตุ',
    en: 'Life & accident insurance',
  });
  return [med, dental, life].filter((v): v is EnrolledPlanView => v !== null);
}

// ── Page component ───────────────────────────────────────────────────────────

export default function HumiBenefitsHubPage() {
  const { activeTab, setTab } = useBenefitsStore();
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === 'string' ? params.locale : 'th';
  const reactLocale = useLocale();
  const isTh = (reactLocale ?? locale) !== 'en';

  const totalUsed = HUMI_CLAIM_ALLOWANCES.reduce((sum, a) => sum + a.used, 0);
  const totalLimit = HUMI_CLAIM_ALLOWANCES.reduce((sum, a) => sum + a.limit, 0);
  const usedPct = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
  const totalRemaining = totalLimit - totalUsed;

  const pendingClaims = HUMI_CLAIM_HISTORY.filter((c) => c.status !== 'approved').length;
  const pendingReferrals = useBenefitReferralsStore((s) =>
    s.referrals.filter((r) =>
      ['pending_spd', 'spd_reviewing', 'send_back', 'approved'].includes(r.status)
    ).length
  );
  const totalPending = pendingClaims + pendingReferrals;

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const nextIdx =
      e.key === 'ArrowRight'
        ? (idx + 1) % TABS.length
        : (idx - 1 + TABS.length) % TABS.length;
    const [nextKey] = TABS[nextIdx];
    setTab(nextKey);
    const btn = document.getElementById(`bh-tab-${nextKey}`);
    btn?.focus();
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1">
        <CardEyebrow>{isTh ? 'ศูนย์รวมสวัสดิการ' : 'Benefits Hub'}</CardEyebrow>
        <h1
          className={cn(
            'font-display font-semibold tracking-tight text-ink',
            'text-[length:var(--text-display-h1)] leading-[var(--text-display-h1--line-height)]'
          )}
        >
          {isTh ? 'ศูนย์รวมสวัสดิการ' : 'Benefits Hub'}
        </h1>
        <p className="max-w-xl text-body leading-relaxed text-ink-soft">
          {isTh
            ? 'จัดการสิทธิ์ ติดตามสถานะการเบิก และอ่านนโยบายสวัสดิการล่าสุดจากที่นี่'
            : 'Manage your entitlements, track claim status, and read the latest benefits policies in one place.'}
        </p>
      </header>

      {/* Prominent stat cards */}
      <section
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        aria-label={isTh ? 'ภาพรวมงานสวัสดิการ' : 'Benefits overview'}
      >
        <Card variant="raised" size="md">
          <CardEyebrow>{isTh ? 'สถานะวงเงิน · ปี 2569' : 'Allowance status · 2026'}</CardEyebrow>
          <p
            className={cn(
              'mt-1 font-display font-semibold tabular-nums text-ink whitespace-nowrap',
              'text-[length:var(--text-display-h2)] leading-[var(--text-display-h2--line-height)]'
            )}
          >
            ฿{totalUsed.toLocaleString()}
            <span className="ml-1 text-body font-normal text-ink-muted">
              / ฿{totalLimit.toLocaleString()}
            </span>
          </p>
          <div
            role="progressbar"
            aria-valuenow={usedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={isTh ? 'วงเงินที่ใช้ไป' : 'Allowance used'}
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-hairline-soft"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${usedPct}%` }} />
          </div>
          <p className="mt-2 text-small text-ink-muted">
            {isTh
              ? `ใช้ไป ${usedPct}% · เหลือ ฿${totalRemaining.toLocaleString()} จนถึงสิ้นปี`
              : `${usedPct}% used · ฿${totalRemaining.toLocaleString()} remaining until year-end`}
          </p>
        </Card>

        <Card variant="raised" size="md" className="flex flex-col justify-between">
          <div>
            <CardEyebrow>{isTh ? 'คำขอที่ต้องตามผล' : 'Requests in flight'}</CardEyebrow>
            <p
              className={cn(
                'mt-1 font-display font-semibold tabular-nums text-ink whitespace-nowrap',
                'text-[length:var(--text-display-h2)] leading-[var(--text-display-h2--line-height)]'
              )}
            >
              {totalPending}
              <span className="ml-1 text-body font-normal text-ink-muted">
                {isTh ? 'รายการ' : totalPending === 1 ? 'item' : 'items'}
              </span>
            </p>
            <p className="mt-1 text-small text-ink-muted">
              {totalPending === 0
                ? isTh ? 'ไม่มีคำขอที่ค้างอยู่' : 'No pending requests'
                : isTh
                  ? [
                      pendingReferrals > 0 ? `${pendingReferrals} ใบส่งตัว` : '',
                      pendingClaims > 0 ? `${pendingClaims} คำขอเบิก` : '',
                    ].filter(Boolean).join(' · ')
                  : [
                      pendingReferrals > 0 ? `${pendingReferrals} referral${pendingReferrals === 1 ? '' : 's'}` : '',
                      pendingClaims > 0 ? `${pendingClaims} claim${pendingClaims === 1 ? '' : 's'}` : '',
                    ].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Link
            href={`/${locale}/requests`}
            className={cn(
              'mt-4 inline-flex items-center gap-1.5 self-start text-small font-semibold text-accent transition-colors hover:text-ink',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'
            )}
          >
            <Clock size={14} aria-hidden />
            {isTh ? 'ดูสถานะทั้งหมด →' : 'View all requests →'}
          </Link>
        </Card>
      </section>

      {/* Primary work zone */}
      <section aria-label={isTh ? 'บริการสวัสดิการ' : 'Benefit services'}>
        <BenefitServicesPanel locale={locale} />
      </section>

      {/* Tabs */}
      <div className="space-y-6">
        <nav
          role="tablist"
          aria-label={isTh ? 'มุมมองสวัสดิการ' : 'Benefits views'}
          className="flex w-full flex-wrap gap-1 border-b border-hairline"
        >
          {TABS.map(([k, lTh, lEn], idx) => (
            <button
              key={k}
              id={`bh-tab-${k}`}
              type="button"
              role="tab"
              aria-selected={activeTab === k}
              aria-controls={`bh-panel-${k}`}
              tabIndex={activeTab === k ? 0 : -1}
              onClick={() => setTab(k)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className={cn(
                '-mb-px border-b-2 px-5 py-3.5 font-medium transition-colors whitespace-nowrap',
                'text-[length:var(--text-body)] leading-[var(--text-body--line-height)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                activeTab === k
                  ? 'border-accent text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              {isTh ? lTh : lEn}
            </button>
          ))}
        </nav>

        <div
          role="tabpanel"
          id={`bh-panel-${activeTab}`}
          aria-labelledby={`bh-tab-${activeTab}`}
          tabIndex={0}
          className="min-h-[400px]"
        >
          {activeTab === 'benefits' && <BenefitsTab locale={locale} isTh={isTh} />}
          {activeTab === 'claims' && <ClaimsTab locale={locale} isTh={isTh} />}
          {activeTab === 'docs' && <DocsTab isTh={isTh} />}
          {activeTab === 'policies' && <PoliciesTab isTh={isTh} />}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Benefits — registry-driven enrollment cards + dependents
// ────────────────────────────────────────────────────────────

function BenefitsTab({ locale, isTh }: { locale: string; isTh: boolean }) {
  const { enrolled } = useBenefitsStore();
  const enrolledPlans = useEnrolledPlans();
  const [detailPlan, setDetailPlan] = useState<EnrolledPlanView | null>(null);

  return (
    <div className="space-y-8">
      <Modal
        open={detailPlan !== null}
        onClose={() => setDetailPlan(null)}
        title={detailPlan ? (isTh ? detailPlan.titleTh : detailPlan.titleEn) : undefined}
      >
        {detailPlan && (
          <div className="flex flex-col gap-5">
            <div className="rounded-[var(--radius-lg)] bg-canvas-soft p-4">
              <p className="text-body font-semibold text-ink">
                {isTh ? detailPlan.nameTh : detailPlan.nameEn}
              </p>
              <p className="text-small text-ink-muted">
                {isTh ? `${detailPlan.costTh} · รหัสแผน ${detailPlan.id}` : `${detailPlan.costEn} · Plan ${detailPlan.id}`}
              </p>
            </div>

            {detailPlan.percent !== null && (
              <div className="space-y-2">
                <div className="flex justify-between text-small font-medium">
                  <span className="text-ink-muted">{isTh ? 'สิทธิ์ที่ใช้ไป' : 'Used'}</span>
                  <span className="text-ink">{detailPlan.percent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={detailPlan.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={isTh ? detailPlan.titleTh : detailPlan.titleEn}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-hairline-soft"
                >
                  <div
                    className={cn('h-full rounded-full', detailPlan.barClass)}
                    style={{ width: `${detailPlan.percent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className={cn(EYEBROW_TEXT_CLASS, 'text-ink-muted')}>
                {isTh ? 'รายละเอียดความคุ้มครอง' : 'Coverage details'}
              </p>
              <ul className="space-y-2 text-body text-ink-soft">
                {(isTh ? detailPlan.itemsTh : detailPlan.itemsEn).map((x) => (
                  <li key={x} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-accent"
                      aria-hidden
                    />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 border-t border-hairline pt-4">
              <Link
                href={benefitProfileRoute(locale)}
                className={cn(buttonVariants({ variant: 'primary' }), 'flex-1')}
              >
                {isTh ? 'จัดการในโปรไฟล์' : 'Manage in profile'}
              </Link>
              <Button variant="ghost" onClick={() => setDetailPlan(null)}>
                {isTh ? 'ปิด' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Plan grid — registry-driven (BE-MED-001 / BE-DEN-001 / BE-LIF-001) */}
      <section className="space-y-5">
        <div className="space-y-1">
          <h2
            className={cn(
              'font-display font-semibold text-ink',
              'text-[length:var(--text-display-h3)] leading-[var(--text-display-h3--line-height)]'
            )}
          >
            {isTh ? 'แผนสวัสดิการของคุณ' : 'Your benefit plans'}
          </h2>
          <p className="text-small text-ink-muted">
            {isTh
              ? 'แผนที่บริษัทมอบให้พนักงานประจำ อ้างอิงจาก SF BenefitProgram (รหัส BE-*)'
              : 'Plans automatically granted to permanent employees, sourced from SF BenefitProgram (BE-* records).'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {enrolledPlans.map((b) => {
            const isEnrolled = enrolled.has(b.id);
            return (
              <Card
                key={b.id}
                variant="raised"
                size="md"
                className="humi-card-lift group flex cursor-pointer flex-col justify-between border-t-4 border-t-accent"
                role="button"
                tabIndex={0}
                aria-label={`${isTh ? 'ดูรายละเอียด' : 'View details for'} ${isTh ? b.nameTh : b.nameEn}`}
                onClick={() => setDetailPlan(b)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setDetailPlan(b);
                  }
                }}
              >
                <div>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <CardEyebrow>{isTh ? b.titleTh : b.titleEn}</CardEyebrow>
                    {isEnrolled && (
                      <span
                        className={cn(
                          EYEBROW_TEXT_CLASS,
                          'rounded-full bg-success-soft px-2.5 py-0.5 text-success whitespace-nowrap'
                        )}
                      >
                        {isTh ? 'เข้าร่วมแล้ว' : 'Active'}
                      </span>
                    )}
                  </div>
                  <CardTitle className="mb-1">{isTh ? b.nameTh : b.nameEn}</CardTitle>
                  <p className="text-small text-ink-muted">
                    {isTh ? b.costTh : b.costEn}
                  </p>

                  <ul className="mt-4 space-y-1.5">
                    {(isTh ? b.itemsTh : b.itemsEn).slice(0, 2).map((x) => (
                      <li
                        key={x}
                        className="flex items-center gap-2 text-small text-ink-soft"
                      >
                        <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
                        <span className="truncate">{x}</span>
                      </li>
                    ))}
                    {b.itemsTh.length > 2 && (
                      <li className={cn(EYEBROW_TEXT_CLASS, 'text-ink-muted')}>
                        {isTh
                          ? `+ อีก ${b.itemsTh.length - 2} รายการ`
                          : `+ ${b.itemsTh.length - 2} more`}
                      </li>
                    )}
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-hairline-soft pt-4">
                  <div className="flex-1 space-y-1.5">
                    {b.percent !== null ? (
                      <>
                        <div className={cn(EYEBROW_TEXT_CLASS, 'flex justify-between text-ink-muted')}>
                          <span>{isTh ? 'ใช้ไป' : 'Used'}</span>
                          <span>{b.percent}%</span>
                        </div>
                        <div
                          role="progressbar"
                          aria-valuenow={b.percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={isTh ? b.titleTh : b.titleEn}
                          className="h-1 w-full overflow-hidden rounded-full bg-hairline-soft"
                        >
                          <div
                            className={cn('h-full rounded-full', b.barClass)}
                            style={{ width: `${b.percent}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <p className={cn(EYEBROW_TEXT_CLASS, 'text-ink-muted')}>
                        {isTh ? 'ไม่ต้องเบิก · บริษัทดูแลให้' : 'No claim needed · auto-coverage'}
                      </p>
                    )}
                  </div>
                  <span
                    aria-hidden
                    className="ml-4 rounded-full bg-canvas-soft p-2 text-ink-muted transition-colors group-hover:bg-accent-soft group-hover:text-accent"
                  >
                    <ArrowRight size={14} />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Dependents */}
      <Card variant="raised" size="lg" className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline bg-canvas-soft px-6 py-4">
          <div className="space-y-1">
            <CardTitle>{isTh ? 'ผู้อุปการะที่ใช้สิทธิ์ร่วม' : 'Covered dependents'}</CardTitle>
            <p className="text-small text-ink-muted">
              {isTh
                ? 'บุคคลในครอบครัวที่ได้รับความคุ้มครองในแผนประกันกลุ่มของคุณ'
                : 'Family members covered under your group insurance plans.'}
            </p>
          </div>
          <Link
            href={benefitProfileRoute(locale)}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'gap-2')}
          >
            <Plus size={14} aria-hidden />
            {isTh ? 'จัดการผู้รับสิทธิ์' : 'Manage dependents'}
          </Link>
        </div>
        <div className="grid grid-cols-1 divide-y divide-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
          {HUMI_DEPENDENTS.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-4 p-5 transition-colors hover:bg-canvas-soft/60"
            >
              <Avatar name={d.fullNameTh} tone={d.tone ?? 'ink'} size="md" />
              <div className="min-w-0">
                <p className="truncate text-body font-semibold leading-tight text-ink">
                  {d.fullNameTh}
                </p>
                <p className="text-small text-ink-muted">{d.relation}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Claims
// ────────────────────────────────────────────────────────────

function ClaimsTab({ locale, isTh }: { locale: string; isTh: boolean }) {
  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div className="space-y-1">
          <h2
            className={cn(
              'font-display font-semibold text-ink',
              'text-[length:var(--text-display-h3)] leading-[var(--text-display-h3--line-height)]'
            )}
          >
            {isTh ? 'วงเงินสวัสดิการปี 2569' : 'Allowance · 2026'}
          </h2>
          <p className="text-small text-ink-muted">
            {isTh
              ? 'ตรวจสอบยอดคงเหลือแยกตามหมวดหมู่ก่อนเริ่มคำขอเบิก'
              : 'Check remaining balances by category before submitting a claim.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HUMI_CLAIM_ALLOWANCES.map((b) => {
            const pct = Math.min(100, Math.round((b.used / b.limit) * 100));
            return (
              <Card
                key={b.id}
                variant="raised"
                size="md"
                className={cn(
                  'flex flex-col justify-between border-l-4',
                  b.accent === 'accent' && 'humi-stat-card--accent',
                  b.accent === 'sage' && 'humi-stat-card--sage',
                  b.accent === 'butter' && 'humi-stat-card--butter'
                )}
                style={
                  b.accent === 'alt'
                    ? { borderLeftColor: 'var(--color-accent-alt)' }
                    : undefined
                }
              >
                <div>
                  <CardEyebrow>{b.label}</CardEyebrow>
                  <p
                    className={cn(
                      'mt-1 font-display font-semibold tabular-nums text-ink whitespace-nowrap',
                      'text-[length:var(--text-display-h3)] leading-[var(--text-display-h3--line-height)]'
                    )}
                  >
                    ฿{b.used.toLocaleString()}
                    <span className="ml-1 text-small font-normal text-ink-muted">
                      / {b.limit.toLocaleString()}
                    </span>
                  </p>
                </div>

                <div className="mt-5 space-y-2">
                  <div
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={b.label}
                    className="h-1.5 w-full overflow-hidden rounded-full bg-hairline-soft"
                  >
                    <div
                      className={cn('h-full rounded-full', ACCENT_BAR_CLASS[b.accent])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-small text-ink-muted">{b.sub}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <Card variant="raised" size="lg" className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-6 py-5">
          <CardTitle>{isTh ? 'ประวัติคำขอเบิกล่าสุด' : 'Recent claim history'}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" leadingIcon={<Download size={14} />}>
              {isTh ? 'ส่งออกรายงาน' : 'Export'}
            </Button>
            <Link
              href={benefitClaimRoute(locale)}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              <Plus size={14} aria-hidden />
              <span>{isTh ? 'เบิกสวัสดิการ' : 'Submit a claim'}</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-hairline bg-canvas-soft">
              <tr>
                <th
                  scope="col"
                  className={cn(EYEBROW_TEXT_CLASS, 'px-6 py-3 text-ink-muted')}
                >
                  {isTh ? 'ประเภท / รายละเอียด' : 'Type / detail'}
                </th>
                <th
                  scope="col"
                  className={cn(EYEBROW_TEXT_CLASS, 'px-6 py-3 text-ink-muted')}
                >
                  {isTh ? 'วันที่' : 'Date'}
                </th>
                <th
                  scope="col"
                  className={cn(EYEBROW_TEXT_CLASS, 'px-6 py-3 text-right text-ink-muted')}
                >
                  {isTh ? 'จำนวนเงิน' : 'Amount'}
                </th>
                <th
                  scope="col"
                  className={cn(EYEBROW_TEXT_CLASS, 'px-6 py-3 text-center text-ink-muted')}
                >
                  {isTh ? 'สถานะ' : 'Status'}
                </th>
                <th scope="col" className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {HUMI_CLAIM_HISTORY.map((r) => {
                const meta = CLAIM_STATUS_META[r.status];
                return (
                  <tr
                    key={r.id}
                    className="group transition-colors hover:bg-canvas-soft/40"
                  >
                    <td className="px-6 py-4">
                      <p className="text-body font-semibold text-ink">{r.type}</p>
                      <p className="max-w-[260px] truncate text-small text-ink-muted">
                        {r.desc}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-small text-ink-soft">
                      {r.date}
                    </td>
                    <td className="px-6 py-4 text-right font-display text-body font-semibold tabular-nums text-ink">
                      {r.amount}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            EYEBROW_TEXT_CLASS,
                            'rounded-full px-2.5 py-1 whitespace-nowrap',
                            meta.toneClass
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm">
                        {isTh ? 'เปิด' : 'Open'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Docs
// ────────────────────────────────────────────────────────────

function DocsTab({ isTh }: { isTh: boolean }) {
  return (
    <Card variant="raised" size="lg" className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-6 py-5">
        <div className="space-y-1">
          <CardTitle>{isTh ? 'เอกสารและแบบฟอร์ม' : 'Documents & forms'}</CardTitle>
          <p className="text-small text-ink-muted">
            {isTh
              ? 'ดาวน์โหลดแบบฟอร์มหรือลงนามเอกสารดิจิทัลที่เกี่ยวข้อง'
              : 'Download forms or sign related digital documents.'}
          </p>
        </div>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">{isTh ? 'ค้นหาเอกสาร' : 'Search documents'}</span>
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            aria-label={isTh ? 'ค้นหาเอกสาร' : 'Search documents'}
            placeholder={isTh ? 'ค้นหาเอกสาร…' : 'Search documents…'}
            className="w-full rounded-full border border-hairline bg-canvas-soft py-2 pl-9 pr-4 text-small text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
          />
        </label>
      </div>

      <ul role="list" className="divide-y divide-hairline">
        {DOCS.map((d) => (
          <li
            key={d.nTh}
            className="flex flex-col gap-3 p-5 transition-colors hover:bg-canvas-soft/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-hairline bg-surface text-ink-muted shadow-[var(--shadow-sm)]"
              >
                <FileText size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-body font-semibold leading-tight text-ink">
                  {isTh ? d.nTh : d.nEn}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-small text-ink-muted">
                  <span>{isTh ? d.kTh : d.kEn}</span>
                  <span aria-hidden>·</span>
                  <span className={cn(d.action === 'sign' && 'font-semibold text-warning')}>
                    {isTh ? d.dTh : d.dEn}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {d.action === 'sign' ? (
                <>
                  <span
                    className={cn(
                      EYEBROW_TEXT_CLASS,
                      'rounded-full bg-warning-soft px-2.5 py-1 text-warning whitespace-nowrap'
                    )}
                  >
                    {isTh ? 'ต้องลงนาม' : 'Sign required'}
                  </span>
                  <Button variant="secondary" size="sm">
                    {isTh ? 'ลงนาม' : 'Sign'}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" leadingIcon={<Download size={14} />}>
                  {isTh ? 'ดาวน์โหลด' : 'Download'}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Policies
// ────────────────────────────────────────────────────────────

function PoliciesTab({ isTh }: { isTh: boolean }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2
          className={cn(
            'font-display font-semibold text-ink',
            'text-[length:var(--text-display-h3)] leading-[var(--text-display-h3--line-height)]'
          )}
        >
          {isTh ? 'ระเบียบและนโยบาย' : 'Policies & guidelines'}
        </h2>
        <p className="text-small text-ink-muted">
          {isTh
            ? 'ข้อกำหนดการใช้สวัสดิการที่พนักงานควรรู้'
            : 'Benefit policies and rules every employee should know.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {POLICIES.map((p) => (
          <Card
            key={p.tTh}
            variant="raised"
            size="md"
            className="group flex flex-col justify-between transition-colors hover:border-accent"
          >
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent" aria-hidden />
                <span className={cn(EYEBROW_TEXT_CLASS, 'text-ink-muted')}>
                  {isTh ? p.uTh : p.uEn}
                </span>
              </div>
              <CardTitle className="mb-2">{isTh ? p.tTh : p.tEn}</CardTitle>
              <p className="text-body leading-relaxed text-ink-soft">
                {isTh ? p.bodyTh : p.bodyEn}
              </p>
            </div>
            <div className="mt-6 border-t border-hairline-soft pt-4">
              <Button
                variant="ghost"
                size="sm"
                trailingIcon={<ExternalLink size={14} />}
              >
                {isTh ? 'อ่านนโยบาย' : 'Read policy'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card variant="raised" size="lg" className="border-none bg-ink p-0 text-canvas">
        <div className="flex flex-col gap-5 p-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h3
              className={cn(
                'font-display font-semibold',
                'text-[length:var(--text-display-h3)] leading-[var(--text-display-h3--line-height)]'
              )}
            >
              {isTh ? 'มีข้อสงสัยเกี่ยวกับนโยบาย?' : 'Questions about a policy?'}
            </h3>
            <p className="text-body leading-relaxed text-canvas/75">
              {isTh
                ? 'เจ้าหน้าที่ HRBP พร้อมให้คำปรึกษาเกี่ยวกับเงื่อนไขการใช้สวัสดิการของท่าน'
                : 'Your HRBP can clarify any benefit eligibility or claim rule.'}
            </p>
          </div>
          <Button variant="primary">
            {isTh ? 'ติดต่อฝ่ายบุคคล' : 'Contact HR'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
