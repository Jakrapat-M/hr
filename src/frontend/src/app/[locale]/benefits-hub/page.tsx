'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  HUMI_BENEFIT_PLANS,
  HUMI_DEPENDENTS,
  HUMI_CLAIM_ALLOWANCES,
  HUMI_CLAIM_HISTORY,
  ACCENT_BAR_CLASS,
  CLAIM_STATUS_META,
  type HumiBenefitPlan,
} from '@/lib/humi-mock-data';
import { useBenefitsStore, type BenefitsTabKey } from '@/stores/humi-benefits-slice';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';

// ════════════════════════════════════════════════════════════
// /benefits-hub — Benefit Work Zone (compact redesign)
// Header collapses entitlement signals into status pills, services
// panel sits above the tab nav, tabs surface dense data tables.
// ════════════════════════════════════════════════════════════

const TABS: Array<[BenefitsTabKey, string]> = [
  ['benefits', 'สิทธิ์และผู้รับสิทธิ์'],
  ['claims', 'ประวัติการเบิก'],
  ['docs', 'เอกสาร'],
  ['policies', 'นโยบาย'],
];

const DOCS = [
  { n: 'ลงทะเบียนสวัสดิการปี 2569', k: 'แบบฟอร์ม', d: 'ครบกำหนด 29 เม.ย.', action: 'sign' as const },
  { n: 'ระเบียบการปฏิบัติงาน (ฉบับที่ 4)', k: 'นโยบาย', d: 'รอรับทราบ', action: 'sign' as const },
  { n: 'บัตรประกันสุขภาพกลุ่ม', k: 'สวัสดิการ', d: 'พร้อมดาวน์โหลด', action: 'download' as const },
  { n: 'แบบฟอร์มเพิ่มผู้ใช้สิทธิ์ร่วม', k: 'สวัสดิการครอบครัว', d: 'อัปเดต 12 ก.พ.', action: 'download' as const },
  { n: 'อบรมความปลอดภัยในการทำงาน', k: 'การฝึกอบรม', d: 'เสร็จสิ้น 8 ม.ค.', action: 'download' as const },
  { n: 'สัญญาจ้างงาน', k: 'เอกสารทางกฎหมาย', d: 'ลงนามเมื่อ ต.ค. 2567', action: 'download' as const },
];

const POLICIES = [
  {
    t: 'การลางานและวันหยุด',
    u: 'อัปเดต มี.ค. 2569',
    body: 'การสะสมวันลาพักร้อน กฎการยกยอด ค่าจ้างวันหยุดสำหรับพนักงานประจำและสัญญาจ้าง',
  },
  {
    t: 'ลาคลอด',
    u: 'มีผล 1 พ.ค.',
    body: 'ลา 16 สัปดาห์ได้รับค่าจ้างเต็ม ใช้ได้กับทุกประเภทการจ้างหลังทำงานครบ 6 เดือน',
  },
  {
    t: 'ความปลอดภัยในสำนักงาน',
    u: 'อัปเดต ม.ค. 2569',
    body: 'ข้อบังคับความปลอดภัย · การใช้อุปกรณ์สำนักงาน · ขั้นตอนรายงานเหตุการณ์',
  },
  {
    t: 'ระเบียบการปฏิบัติงาน',
    u: 'ฉบับที่ 4 · เม.ย. 2569',
    body: 'การเคารพในที่ทำงาน การต่อต้านการคุกคาม ผลประโยชน์ทับซ้อน การรายงาน',
  },
];

function benefitDisplayItem(item: string) {
  return item === 'ไม่ต้องเสียภาษี' ? 'ใช้ตามเงื่อนไขสวัสดิการ' : item;
}

const EYEBROW_TEXT_CLASS =
  'text-[length:var(--text-eyebrow)] leading-[var(--text-eyebrow--line-height)] tracking-[0.14em] uppercase font-semibold';

export default function HumiBenefitsHubPage() {
  const { activeTab, setTab } = useBenefitsStore();
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === 'string' ? params.locale : 'th';

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

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1">
        <CardEyebrow>Benefits Hub</CardEyebrow>
        <h1
          className={cn(
            'font-display font-semibold tracking-tight text-ink',
            'text-[length:var(--text-display-h1)] leading-[var(--text-display-h1--line-height)]'
          )}
        >
          ศูนย์รวมสวัสดิการ
        </h1>
        <p className="max-w-xl text-body leading-relaxed text-ink-soft">
          จัดการสิทธิ์ ติดตามสถานะการเบิก และอ่านนโยบายสวัสดิการล่าสุดจากที่นี่
        </p>
      </header>

      {/* Prominent stat cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="ภาพรวมงานสวัสดิการ">
        <Card variant="raised" size="md">
          <CardEyebrow>สถานะวงเงิน · ปี 2569</CardEyebrow>
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
            aria-label="วงเงินที่ใช้ไป"
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-hairline-soft"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${usedPct}%` }} />
          </div>
          <p className="mt-2 text-small text-ink-muted">
            ใช้ไป {usedPct}% · เหลือ ฿{totalRemaining.toLocaleString()} จนถึงสิ้นปี
          </p>
        </Card>

        <Card variant="raised" size="md" className="flex flex-col justify-between">
          <div>
            <CardEyebrow>คำขอที่ต้องตามผล</CardEyebrow>
            <p
              className={cn(
                'mt-1 font-display font-semibold tabular-nums text-ink whitespace-nowrap',
                'text-[length:var(--text-display-h2)] leading-[var(--text-display-h2--line-height)]'
              )}
            >
              {totalPending}
              <span className="ml-1 text-body font-normal text-ink-muted">
                {totalPending === 1 ? 'รายการ' : 'รายการ'}
              </span>
            </p>
            <p className="mt-1 text-small text-ink-muted">
              {pendingReferrals > 0 && `${pendingReferrals} ใบส่งตัว`}
              {pendingReferrals > 0 && pendingClaims > 0 && ' · '}
              {pendingClaims > 0 && `${pendingClaims} คำขอเบิก`}
              {totalPending === 0 && 'ไม่มีคำขอที่ค้างอยู่'}
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
            ดูสถานะทั้งหมด →
          </Link>
        </Card>
      </section>

      {/* Primary work zone */}
      <section aria-label="บริการสวัสดิการ">
        <BenefitServicesPanel locale={locale} />
      </section>

      {/* Tabs */}
      <div className="space-y-6">
        <nav
          role="tablist"
          aria-label="มุมมองสวัสดิการ"
          className="flex w-full gap-1 overflow-x-auto border-b border-hairline"
        >
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={activeTab === k}
              onClick={() => setTab(k)}
              className={cn(
                '-mb-px border-b-2 px-5 py-3.5 text-body font-medium transition-colors whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                activeTab === k
                  ? 'border-accent text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              {l}
            </button>
          ))}
        </nav>

        <div className="min-h-[400px]">
          {activeTab === 'benefits' && <BenefitsTab locale={locale} />}
          {activeTab === 'claims' && <ClaimsTab locale={locale} />}
          {activeTab === 'docs' && <DocsTab />}
          {activeTab === 'policies' && <PoliciesTab />}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Benefits
// ────────────────────────────────────────────────────────────

function BenefitsTab({ locale }: { locale: string }) {
  const { enrolled } = useBenefitsStore();
  const [detailPlan, setDetailPlan] = useState<HumiBenefitPlan | null>(null);

  return (
    <div className="space-y-8">
      <Modal
        open={detailPlan !== null}
        onClose={() => setDetailPlan(null)}
        title={detailPlan?.title}
      >
        {detailPlan && (
          <div className="flex flex-col gap-5">
            <div className="rounded-[var(--radius-lg)] bg-canvas-soft p-4">
              <p className="text-body font-semibold text-ink">{detailPlan.plan}</p>
              <p className="text-small text-ink-muted">
                ค่าใช้จ่าย {detailPlan.cost} · หักจากเงินเดือน
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-small font-medium">
                <span className="text-ink-muted">สิทธิ์ที่ใช้ไป</span>
                <span className="text-ink">{detailPlan.percent}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={detailPlan.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={detailPlan.title}
                className="h-1.5 w-full overflow-hidden rounded-full bg-hairline-soft"
              >
                <div
                  className={cn('h-full rounded-full', detailPlan.barClass)}
                  style={{ width: `${detailPlan.percent}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className={cn(EYEBROW_TEXT_CLASS, 'text-ink-muted')}>
                รายละเอียดความคุ้มครอง
              </p>
              <ul className="space-y-2 text-body text-ink-soft">
                {detailPlan.items.map((x) => (
                  <li key={x} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-accent"
                      aria-hidden
                    />
                    <span>{benefitDisplayItem(x)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 border-t border-hairline pt-4">
              <Link
                href={benefitProfileRoute(locale)}
                className={cn(buttonVariants({ variant: 'primary' }), 'flex-1')}
              >
                จัดการในโปรไฟล์
              </Link>
              <Button variant="ghost" onClick={() => setDetailPlan(null)}>
                ปิด
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Plan grid */}
      <section className="space-y-5">
        <div className="space-y-1">
          <h2
            className={cn(
              'font-display font-semibold text-ink',
              'text-[length:var(--text-display-h3)] leading-[var(--text-display-h3--line-height)]'
            )}
          >
            แผนสวัสดิการของคุณ
          </h2>
          <p className="text-small text-ink-muted">
            แผนที่คุณเข้าร่วมในรอบปีปัจจุบัน อ้างอิงจากข้อมูล HRMS
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {HUMI_BENEFIT_PLANS.map((b) => {
            const isEnrolled = enrolled.has(b.id);
            return (
              <Card
                key={b.id}
                variant="raised"
                size="md"
                className="humi-card-lift group flex cursor-pointer flex-col justify-between border-t-4 border-t-accent"
                role="button"
                tabIndex={0}
                aria-label={`ดูรายละเอียด ${b.plan}`}
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
                    <CardEyebrow>{b.title}</CardEyebrow>
                    {isEnrolled && (
                      <span
                        className={cn(
                          EYEBROW_TEXT_CLASS,
                          'rounded-full bg-success-soft px-2.5 py-0.5 text-success whitespace-nowrap'
                        )}
                      >
                        เข้าร่วมแล้ว
                      </span>
                    )}
                  </div>
                  <CardTitle className="mb-1">{b.plan}</CardTitle>
                  <p className="text-small text-ink-muted">คุณจ่าย {b.cost}</p>

                  <ul className="mt-4 space-y-1.5">
                    {b.items.slice(0, 2).map((x) => (
                      <li
                        key={x}
                        className="flex items-center gap-2 text-small text-ink-soft"
                      >
                        <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
                        <span className="truncate">{benefitDisplayItem(x)}</span>
                      </li>
                    ))}
                    {b.items.length > 2 && (
                      <li className={cn(EYEBROW_TEXT_CLASS, 'text-ink-muted')}>
                        + อีก {b.items.length - 2} รายการ
                      </li>
                    )}
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-hairline-soft pt-4">
                  <div className="flex-1 space-y-1.5">
                    <div className={cn(EYEBROW_TEXT_CLASS, 'flex justify-between text-ink-muted')}>
                      <span>ใช้ไป</span>
                      <span>{b.percent}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={b.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={b.title}
                      className="h-1 w-full overflow-hidden rounded-full bg-hairline-soft"
                    >
                      <div
                        className={cn('h-full rounded-full', b.barClass)}
                        style={{ width: `${b.percent}%` }}
                      />
                    </div>
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
            <CardTitle>ผู้อุปการะที่ใช้สิทธิ์ร่วม</CardTitle>
            <p className="text-small text-ink-muted">
              บุคคลในครอบครัวที่ได้รับความคุ้มครองในแผนประกันกลุ่มของคุณ
            </p>
          </div>
          <Link
            href={benefitProfileRoute(locale)}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'gap-2')}
          >
            <Plus size={14} aria-hidden />
            จัดการผู้รับสิทธิ์
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

function ClaimsTab({ locale }: { locale: string }) {
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
            วงเงินสวัสดิการปี 2569
          </h2>
          <p className="text-small text-ink-muted">
            ตรวจสอบยอดคงเหลือแยกตามหมวดหมู่ก่อนเริ่มคำขอเบิก
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
          <CardTitle>ประวัติคำขอเบิกล่าสุด</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" leadingIcon={<Download size={14} />}>
              ส่งออกรายงาน
            </Button>
            <Link
              href={benefitClaimRoute(locale)}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              <Plus size={14} aria-hidden />
              <span>เบิกสวัสดิการ</span>
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
                  ประเภท / รายละเอียด
                </th>
                <th
                  scope="col"
                  className={cn(EYEBROW_TEXT_CLASS, 'px-6 py-3 text-ink-muted')}
                >
                  วันที่
                </th>
                <th
                  scope="col"
                  className={cn(EYEBROW_TEXT_CLASS, 'px-6 py-3 text-right text-ink-muted')}
                >
                  จำนวนเงิน
                </th>
                <th
                  scope="col"
                  className={cn(EYEBROW_TEXT_CLASS, 'px-6 py-3 text-center text-ink-muted')}
                >
                  สถานะ
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
                        เปิด
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

function DocsTab() {
  return (
    <Card variant="raised" size="lg" className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-6 py-5">
        <div className="space-y-1">
          <CardTitle>เอกสารและแบบฟอร์ม</CardTitle>
          <p className="text-small text-ink-muted">
            ดาวน์โหลดแบบฟอร์มหรือลงนามเอกสารดิจิทัลที่เกี่ยวข้อง
          </p>
        </div>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">ค้นหาเอกสาร</span>
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            placeholder="ค้นหาเอกสาร…"
            className="w-full rounded-full border border-hairline bg-canvas-soft py-2 pl-9 pr-4 text-small text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
          />
        </label>
      </div>

      <ul role="list" className="divide-y divide-hairline">
        {DOCS.map((d) => (
          <li
            key={d.n}
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
                <p className="text-body font-semibold leading-tight text-ink">{d.n}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-small text-ink-muted">
                  <span>{d.k}</span>
                  <span aria-hidden>·</span>
                  <span className={cn(d.action === 'sign' && 'font-semibold text-warning')}>
                    {d.d}
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
                    ต้องลงนาม
                  </span>
                  <Button variant="secondary" size="sm">
                    ลงนาม
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" leadingIcon={<Download size={14} />}>
                  ดาวน์โหลด
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

function PoliciesTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2
          className={cn(
            'font-display font-semibold text-ink',
            'text-[length:var(--text-display-h3)] leading-[var(--text-display-h3--line-height)]'
          )}
        >
          ระเบียบและนโยบาย
        </h2>
        <p className="text-small text-ink-muted">ข้อกำหนดการใช้สวัสดิการที่พนักงานควรรู้</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {POLICIES.map((p) => (
          <Card
            key={p.t}
            variant="raised"
            size="md"
            className="group flex flex-col justify-between transition-colors hover:border-accent"
          >
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent" aria-hidden />
                <span className={cn(EYEBROW_TEXT_CLASS, 'text-ink-muted')}>{p.u}</span>
              </div>
              <CardTitle className="mb-2">{p.t}</CardTitle>
              <p className="text-body leading-relaxed text-ink-soft">{p.body}</p>
            </div>
            <div className="mt-6 border-t border-hairline-soft pt-4">
              <Button
                variant="ghost"
                size="sm"
                trailingIcon={<ExternalLink size={14} />}
              >
                อ่านนโยบาย
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
              มีข้อสงสัยเกี่ยวกับนโยบาย?
            </h3>
            <p className="text-body leading-relaxed text-canvas/75">
              เจ้าหน้าที่ HRBP พร้อมให้คำปรึกษาเกี่ยวกับเงื่อนไขการใช้สวัสดิการของท่าน
            </p>
          </div>
          <Button variant="primary">ติดต่อฝ่ายบุคคล</Button>
        </div>
      </Card>
    </div>
  );
}
