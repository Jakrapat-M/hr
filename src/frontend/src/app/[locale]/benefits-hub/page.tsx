'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  Hospital,
  HeartPulse,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  Avatar,
  Button,
  CancelRequestModal,
  Card,
  CardEyebrow,
  CardTitle,
  DataTable,
  DemoValuesDisclaimer,
  FormField,
  Modal,
  buttonVariants,
} from '@/components/humi';
import type { DataTableColumn } from '@/components/humi';
import { ClaimDetailModal } from '@/components/benefits/ClaimDetailModal';
import { humiClaimHistoryToClaimRequest } from '@/lib/humi-claim-history-to-claim';
import { cn } from '@/lib/utils';
import {
  CLAIM_TYPE_OPTIONS,
  CLAIM_STATUS_BUCKET_OPTIONS,
  benefitClaimRowActions,
  filterHumiClaimHistory,
  formatClaimDate,
  sortByClaimStatus,
} from '@/lib/claim-history-filter';
import {
  benefitHospitalClaimRoute,
  benefitProfileRoute,
  benefitReferralRoute,
  benefitReimbursementRoute,
} from '@/lib/benefit-routes';
import {
  ACCENT_BAR_CLASS,
  CLAIM_STATUS_META,
  HUMI_CLAIM_ALLOWANCES,
  HUMI_CLAIM_HISTORY,
  HUMI_DEPENDENTS,
  type HumiClaimHistoryItem,
} from '@/lib/humi-mock-data';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';

// ════════════════════════════════════════════════════════════════════════════
// /benefits-hub — Service catalog + my status
//
// Layout:
//   [slim header]
//   [4 KPIs]
//   [services grid (2/3)] | [in-flight tracker (1/3)]
//   [allowances strip]
//   [claim history — STA-75 search + date filters]
//   [dependents] [documents] [policies]
// ════════════════════════════════════════════════════════════════════════════

interface ServiceCardSpec {
  id: string;
  icon: typeof Hospital;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  href: (locale: string) => string;
  badgeTh?: string;
  badgeEn?: string;
  badgeTone?: 'accent' | 'success' | 'warning';
}

// Eligibility badges (mockup) — reflect whether the signed-in employee can use each
// service. Static/registry-style seed for the demo; teal = eligible, butter = waiting
// period, pumpkin (warning) = not eligible. NO-RED: warning tone uses pumpkin tokens.
const SERVICES: ServiceCardSpec[] = [
  {
    id: 'referral',
    icon: Hospital,
    titleTh: 'ขอใบส่งตัว',
    titleEn: 'Hospital referral',
    descTh: 'ใบส่งตัว ePatient ก่อนเข้ารับบริการที่โรงพยาบาลในเครือ',
    descEn: 'ePatient referral for partner hospitals before your visit',
    href: (l) => benefitReferralRoute(l),
    badgeTh: 'มีสิทธิ์',
    badgeEn: 'Eligible',
    badgeTone: 'success',
  },
  {
    id: 'reimbursement',
    icon: ReceiptText,
    titleTh: 'เบิกสวัสดิการ',
    titleEn: 'Reimbursement',
    descTh: 'เบิกค่ารักษา ตรวจสุขภาพ ค่าเดินทาง และอื่น ๆ ตามวงเงิน',
    descEn: 'Submit claims for medical, checkup, travel and other allowances',
    href: (l) => benefitReimbursementRoute(l),
    badgeTh: 'มีสิทธิ์',
    badgeEn: 'Eligible',
    badgeTone: 'success',
  },
  {
    id: 'hospital-claim',
    icon: Stethoscope,
    titleTh: 'เคลมค่ารักษา',
    titleEn: 'Hospital claim',
    descTh: 'ส่งใบเสร็จค่ารักษาพร้อมเอกสารแพทย์เพื่อเบิกย้อนหลัง',
    descEn: 'Submit hospital receipts with physician notes for reimbursement',
    href: (l) => benefitHospitalClaimRoute(l),
    badgeTh: 'มีสิทธิ์',
    badgeEn: 'Eligible',
    badgeTone: 'success',
  },
  {
    id: 'physical-checkup',
    icon: HeartPulse,
    titleTh: 'ตรวจสุขภาพประจำปี',
    titleEn: 'Annual checkup',
    descTh: 'แพ็คเกจตรวจสุขภาพประจำปีและสิทธิ์ของผู้รับสิทธิ์ร่วม',
    descEn: 'Yearly health screening and dependent coverage',
    href: (l) => `/${l}/benefits-hub/physical-checkup`,
    badgeTh: 'รอครบกำหนดสิทธิ์',
    badgeEn: 'Waiting period',
    badgeTone: 'warning',
  },
  {
    id: 'life-accident',
    icon: ShieldCheck,
    titleTh: 'ประกันชีวิตและอุบัติเหตุ',
    titleEn: 'Life & accident',
    descTh: 'รายละเอียดทุนประกัน เบนิฟิตและกรมธรรม์',
    descEn: 'Sum insured, policy details and benefit summary',
    href: (l) => `/${l}/benefits-hub/life-accident`,
    badgeTh: 'มีสิทธิ์',
    badgeEn: 'Eligible',
    badgeTone: 'success',
  },
  {
    id: 'beneficiary',
    icon: Users,
    titleTh: 'ผู้รับผลประโยชน์',
    titleEn: 'Beneficiary',
    descTh: 'จัดการรายชื่อผู้รับผลประโยชน์ตามกรมธรรม์',
    descEn: 'Maintain beneficiary records linked to your policies',
    href: (l) => `/${l}/benefits-hub/beneficiary`,
    badgeTh: 'มีสิทธิ์',
    badgeEn: 'Eligible',
    badgeTone: 'success',
  },
];

// Eligibility badge tone → Humi token classes (NO-RED: warning = pumpkin).
const BADGE_TONE_CLASS: Record<NonNullable<ServiceCardSpec['badgeTone']>, string> = {
  success: 'bg-success-soft text-[color:var(--color-success)]',
  accent: 'bg-accent-soft text-accent-ink',
  warning: 'bg-danger-soft text-[color:var(--color-danger-ink)]',
};

const DOCS = [
  { n: 'ลงทะเบียนสวัสดิการปี 2569',     k: 'แบบฟอร์ม',          d: 'ครบกำหนด 29 เม.ย.',   action: 'sign'     as const },
  { n: 'ระเบียบการปฏิบัติงาน (ฉบับที่ 4)', k: 'นโยบาย',            d: 'รอรับทราบ',           action: 'sign'     as const },
  { n: 'บัตรประกันสุขภาพกลุ่ม',           k: 'สวัสดิการ',          d: 'พร้อมดาวน์โหลด',     action: 'download' as const },
  { n: 'แบบฟอร์มเพิ่มผู้ใช้สิทธิ์ร่วม',     k: 'สวัสดิการครอบครัว', d: 'อัปเดต 12 ก.พ.',     action: 'download' as const },
];

const POLICIES = [
  { t: 'การลางานและวันหยุด',    u: 'อัปเดต มี.ค. 2569', body: 'สิทธิ์วันลาแต่ละประเภท · วันลาไม่ยกยอดข้ามปี · ค่าจ้างวันหยุด' },
  { t: 'ลาคลอด',                u: 'มีผล 1 พ.ค.',       body: 'ลา 16 สัปดาห์ได้รับค่าจ้างเต็มหลังครบ 6 เดือน' },
  { t: 'ความปลอดภัยในสำนักงาน', u: 'อัปเดต ม.ค. 2569', body: 'ข้อบังคับความปลอดภัย ขั้นตอนรายงานเหตุการณ์' },
  { t: 'ระเบียบการปฏิบัติงาน',   u: 'ฉบับที่ 4 · เม.ย. 2569', body: 'การเคารพในที่ทำงาน การต่อต้านการคุกคาม' },
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function formatThb(n: number): string {
  return `฿${n.toLocaleString()}`;
}

function claimAmountValue(amount: string) {
  return Number(amount.replace(/[^0-9.-]/g, '')) || 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function HumiBenefitsHubPage() {
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === 'string' ? params.locale : 'th';
  const referrals = useBenefitReferralsStore((s) => s.referrals);

  const allowanceTotal = useMemo(
    () => HUMI_CLAIM_ALLOWANCES.reduce((sum, a) => sum + a.limit, 0),
    [],
  );
  const allowanceUsed = useMemo(
    () => HUMI_CLAIM_ALLOWANCES.reduce((sum, a) => sum + a.used, 0),
    [],
  );
  const usedPercent = Math.round((allowanceUsed / allowanceTotal) * 100);

  const pendingClaimsCount = HUMI_CLAIM_HISTORY.filter(
    (r) => CLAIM_STATUS_META[r.status]?.label !== 'Approved',
  ).length;
  const pendingReferralCount = referrals.filter((r) =>
    ['pending_spd', 'spd_reviewing', 'approved', 'send_back'].includes(r.status),
  ).length;
  const pendingTotal = pendingClaimsCount + pendingReferralCount;

  const docsToSign = DOCS.filter((d) => d.action === 'sign').length;

  return (
    <>
      {/* Slim header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardEyebrow>Benefits Hub</CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            สวัสดิการของคุณ
          </h1>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            เลือกบริการที่ต้องใช้ ติดตามสถานะคำขอ และดาวน์โหลดเอกสาร — ทุกอย่างในหน้าเดียว
          </p>
        </div>
        <Link
          href={benefitProfileRoute(locale)}
          className={cn(buttonVariants({ variant: 'ghost' }))}
        >
          ดูสิทธิ์ในโปรไฟล์
          <ArrowRight size={14} aria-hidden />
        </Link>
      </header>

      <DemoValuesDisclaimer className="mb-6" />

      {/* KPI strip */}
      <section
        aria-label="ภาพรวมสวัสดิการ"
        className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <Card variant="raised" size="md" className="border-l-4 border-l-accent">
          <CardEyebrow>วงเงินปีนี้</CardEyebrow>
          <p className="mt-1 font-display text-[length:var(--text-display-h3)] font-semibold text-ink tabular-nums whitespace-nowrap">
            {formatThb(allowanceTotal)}
          </p>
          <p className="text-small text-ink-muted">
            ใช้ไป {formatThb(allowanceUsed)} · {usedPercent}%
          </p>
        </Card>
        <Card variant="raised" size="md" className="border-l-4 border-l-[color:var(--color-warning)]">
          <CardEyebrow>คำขอรอดำเนินการ</CardEyebrow>
          <p className="mt-1 font-display text-[length:var(--text-display-h3)] font-semibold text-ink tabular-nums">
            {pendingTotal}
          </p>
          <p className="text-small text-ink-muted">
            ใบส่งตัว {pendingReferralCount} · เบิก {pendingClaimsCount}
          </p>
        </Card>
        <Card variant="raised" size="md" className="border-l-4 border-l-[color:var(--color-info)]">
          <CardEyebrow>ผู้รับสิทธิ์ร่วม</CardEyebrow>
          <p className="mt-1 font-display text-[length:var(--text-display-h3)] font-semibold text-ink tabular-nums">
            {HUMI_DEPENDENTS.length}
          </p>
          <p className="text-small text-ink-muted">ครอบครัวในแผนของคุณ</p>
        </Card>
        <Card
          variant="raised"
          size="md"
          className={cn(
            'border-l-4',
            docsToSign > 0 ? 'border-l-[color:var(--color-danger)]' : 'border-l-hairline',
          )}
        >
          <CardEyebrow>เอกสารต้องลงนาม</CardEyebrow>
          <p className="mt-1 font-display text-[length:var(--text-display-h3)] font-semibold text-ink tabular-nums">
            {docsToSign}
          </p>
          <p className="text-small text-ink-muted">
            {docsToSign > 0 ? 'กรุณาดำเนินการก่อน 29 เม.ย.' : 'ไม่มีรายการค้าง'}
          </p>
        </Card>
      </section>

      {/* Service catalog — full width */}
      <section aria-labelledby="services-heading" className="mb-6">
        <h2
          id="services-heading"
          className="mb-3 font-display text-[length:var(--text-display-h3)] font-semibold text-ink"
        >
          บริการสวัสดิการ
        </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SERVICES.map((svc) => {
              const Icon = svc.icon;
              return (
                <Link
                  key={svc.id}
                  href={svc.href(locale)}
                  className={cn(
                    'group relative flex flex-col gap-3 rounded-[var(--radius-md)] border border-hairline bg-surface p-4 transition-all duration-[var(--dur-fast)]',
                    'hover:-translate-y-0.5 hover:border-accent hover:shadow-[var(--shadow-md)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent-ink"
                    >
                      <Icon size={20} />
                    </span>
                    <div className="flex items-center gap-2">
                      {svc.badgeTone && (svc.badgeTh || svc.badgeEn) && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.12em] whitespace-nowrap',
                            BADGE_TONE_CLASS[svc.badgeTone],
                          )}
                        >
                          {locale === 'en' ? svc.badgeEn : svc.badgeTh}
                        </span>
                      )}
                      <ArrowRight
                        size={16}
                        aria-hidden
                        className="text-ink-faint transition-colors group-hover:text-accent"
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-body font-semibold text-ink">
                      {locale === 'en' ? svc.titleEn : svc.titleTh}
                    </p>
                    <p className="mt-0.5 text-small leading-relaxed text-ink-muted">
                      {locale === 'en' ? svc.descEn : svc.descTh}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
      </section>

      {/* Allowance breakdown */}
      <section aria-labelledby="allowance-heading" className="mb-6">
        <div className="mb-3 flex items-end justify-between gap-3 flex-wrap">
          <h2
            id="allowance-heading"
            className="font-display text-[length:var(--text-display-h3)] font-semibold text-ink"
          >
            วงเงินตามประเภท
          </h2>
          <Link
            href={benefitReimbursementRoute(locale)}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            เริ่มเบิก
            <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HUMI_CLAIM_ALLOWANCES.map((b) => {
            const pct = Math.min(100, Math.round((b.used / b.limit) * 100));
            return (
              <Link
                key={b.id}
                href={benefitReimbursementRoute(locale, b.id)}
                className={cn(
                  'block rounded-[var(--radius-md)] border border-hairline bg-surface p-4 transition-all duration-[var(--dur-fast)]',
                  'hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]',
                )}
              >
                <CardEyebrow>{b.label}</CardEyebrow>
                <p className="mt-1 font-display text-[length:var(--text-display-h3)] font-semibold text-ink tabular-nums whitespace-nowrap">
                  {formatThb(b.used)}{' '}
                  <span className="text-small font-normal text-ink-muted">
                    / {formatThb(b.limit)}
                  </span>
                </p>
                {b.remainingNoteTh && (
                  <p className="mt-1 text-small text-ink-muted">
                    {locale === 'en' ? b.remainingNoteEn : b.remainingNoteTh}
                  </p>
                )}
                <div
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={b.label}
                  className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-hairline-soft"
                >
                  <div
                    className={cn('h-full rounded-full', ACCENT_BAR_CLASS[b.accent])}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-small text-ink-muted">{b.sub}</p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-small font-semibold text-accent-foreground">
                  Claim
                  <ArrowRight size={12} aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>

      </section>

      {/* Claim history — STA-75 search + date filters */}
      <ClaimHistorySection />

      {/* Dependents */}
      <section aria-labelledby="dependents-heading" className="mb-6">
        <Card variant="raised" size="md">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <CardEyebrow>ครอบครัวในแผน</CardEyebrow>
              <CardTitle id="dependents-heading" className="mt-1">
                ผู้รับสิทธิ์ร่วม
              </CardTitle>
            </div>
            <Link
              href={benefitProfileRoute(locale)}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              จัดการในโปรไฟล์
              <ArrowRight size={12} aria-hidden />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {HUMI_DEPENDENTS.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-3"
              >
                <Avatar name={d.fullNameTh} tone={d.tone ?? 'ink'} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-body font-semibold text-ink">{d.fullNameTh}</p>
                  <p className="text-small text-ink-muted">{d.relation}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Documents + Policies — side by side, low priority */}
      <div className="grid gap-5 lg:grid-cols-2">
        <DocsSection />
        <PoliciesSection />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-sections
// ────────────────────────────────────────────────────────────────────────────

// Simple in-memory toast (no external library; ToastProvider is not mounted here).
function useToast() {
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });
  const show = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast({ msg: '', visible: false }), 3200);
  };
  return { toast, show };
}

// STA-194 — Claim history with Benefit name / Claim Type / Status filters over
// HUMI_CLAIM_HISTORY, sorted by status group (ขอข้อมูลเพิ่ม → รออนุมัติ → อนุมัติแล้ว).
function ClaimHistorySection() {
  const t = useTranslations('benefits');
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale === 'en' ? 'en' : 'th';

  const [benefitFilter, setBenefitFilter] = useState('');
  const [claimTypeFilter, setClaimTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  // STA-182 — "more detail" row action opens a read-only detail modal.
  const [detailRow, setDetailRow] = useState<HumiClaimHistoryItem | null>(null);
  // STA-234 — local mutable copy so cancel/edit produce visible state transitions
  // (HUMI_CLAIM_HISTORY is a const; never mutate it). Sub-flow targets + toast.
  const [rows, setRows] = useState(() => HUMI_CLAIM_HISTORY);
  const [cancelTarget, setCancelTarget] = useState<HumiClaimHistoryItem | null>(null);
  const [editTarget, setEditTarget] = useState<HumiClaimHistoryItem | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const { toast, show: showToast } = useToast();

  const filteredClaimHistory = useMemo(() => {
    const filtered = filterHumiClaimHistory(rows, {
      benefit: benefitFilter,
      claimType: claimTypeFilter,
      status: statusFilter,
      dateFrom: dateFromFilter,
      dateTo: dateToFilter,
    });
    return sortByClaimStatus(filtered);
  }, [rows, benefitFilter, claimTypeFilter, statusFilter, dateFromFilter, dateToFilter]);

  // STA-234 — gate the modal footer buttons on the row's native ClaimStatus.
  const rowActions = detailRow ? benefitClaimRowActions(detailRow.status) : null;

  const openCancel = () => {
    if (!detailRow) return;
    setCancelTarget(detailRow);
    setDetailRow(null);
  };

  const openEdit = () => {
    if (!detailRow) return;
    setEditDesc(detailRow.desc);
    setEditAmount(detailRow.amount);
    setEditTarget(detailRow);
    setDetailRow(null);
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x)));
    setCancelTarget(null);
    showToast(t('claimCancelledToast'));
  };

  const saveEdit = () => {
    if (!editTarget) return;
    const id = editTarget.id;
    setRows((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, desc: editDesc, amount: editAmount, status: 'pending' } : x,
      ),
    );
    setEditTarget(null);
    showToast(t('claimUpdatedToast'));
  };

  const claimHistoryColumns = useMemo<DataTableColumn<HumiClaimHistoryItem>[]>(() => [
    {
      id: 'benefitName',
      header: 'ชื่อสวัสดิการ / Benefit Name',
      cell: (row) => (
        <div className="min-w-[180px]">
          <p className="text-body font-semibold text-ink">{row.type}</p>
          <p className="text-small text-ink-muted">{row.desc}</p>
        </div>
      ),
      sortAccessor: (row) => row.type,
    },
    {
      id: 'claimAmount',
      header: 'จำนวนเงินเบิก / Claim Amount',
      cell: (row) => (
        <span className="font-display text-body font-semibold text-ink tabular-nums">
          {row.amount}
        </span>
      ),
      sortAccessor: (row) => claimAmountValue(row.amount),
      align: 'right',
      className: 'w-40',
    },
    {
      id: 'submissionDate',
      header: 'วันที่ส่ง / Submission Date',
      cell: (row) => (
        <span className="text-small tabular-nums text-ink-muted">
          {formatClaimDate(row.submittedAt)}
        </span>
      ),
      sortAccessor: (row) => row.submittedAt,
      className: 'w-44',
    },
    {
      id: 'status',
      header: 'สถานะ / Status',
      cell: (row) => {
        const meta = CLAIM_STATUS_META[row.status];
        return (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] whitespace-nowrap',
              meta.toneClass
            )}
          >
            {meta.label}
          </span>
        );
      },
      sortAccessor: (row) => CLAIM_STATUS_META[row.status].label,
      className: 'w-40',
    },
    // STA-182 — "more detail" row action (last column). Opens a read-only modal.
    {
      id: 'detail',
      header: 'รายละเอียด / Detail',
      headerVisuallyHidden: true,
      align: 'right',
      className: 'w-16',
      cell: (row) => (
        <button
          type="button"
          onClick={() => setDetailRow(row)}
          aria-label={`ดูรายละเอียด / more detail — ${row.type}`}
          title="ดูรายละเอียด / More detail"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-hairline bg-surface text-ink-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
        >
          <FileText size={15} aria-hidden />
        </button>
      ),
    },
  ], []);

  const resetClaimFilters = () => {
    setBenefitFilter('');
    setClaimTypeFilter('');
    setStatusFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const filterSelectClass =
    'h-10 w-full rounded-md border border-hairline bg-surface px-3 text-body text-ink ' +
    'transition-[border-color,box-shadow] duration-[var(--dur-fast)] ' +
    'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas focus:border-accent';

  return (
    <section aria-labelledby="claim-history-heading" className="mb-6">
      <Card variant="raised" size="lg">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardEyebrow>คำขอเบิกล่าสุด</CardEyebrow>
            <CardTitle id="claim-history-heading" className="mt-1">
              ประวัติการเบิกค่าใช้จ่าย
            </CardTitle>
          </div>
          <Button variant="ghost" leadingIcon={<Download size={14} />}>
            ส่งออกรายงาน
          </Button>
        </div>

        <div className="mb-4 grid gap-3 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(5,minmax(150px,1fr))_auto] lg:items-end">
          <FormField id="claim-history-benefit" label="ชื่อสวัสดิการ / Benefit Name">
            {(controlProps) => (
              <input
                {...controlProps}
                type="text"
                value={benefitFilter}
                onChange={(event) => setBenefitFilter(event.target.value)}
                placeholder="ค้นหาชื่อสวัสดิการ / Search benefit name"
                className={filterSelectClass}
              />
            )}
          </FormField>
          <FormField id="claim-history-claim-type" label="ประเภทการเบิก / Claim Type">
            {(controlProps) => (
              <select
                {...controlProps}
                value={claimTypeFilter}
                onChange={(event) => setClaimTypeFilter(event.target.value)}
                className={filterSelectClass}
              >
                <option value="">ทั้งหมด / All</option>
                {CLAIM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.labelTh} / {opt.labelEn}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="claim-history-status" label="สถานะ / Status">
            {(controlProps) => (
              <select
                {...controlProps}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={filterSelectClass}
              >
                <option value="">ทั้งหมด / All</option>
                {CLAIM_STATUS_BUCKET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.labelTh} / {opt.labelEn}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="claim-history-date-from" label="วันที่เริ่ม / Start date">
            {(controlProps) => (
              <>
                <input
                  {...controlProps}
                  type="date"
                  value={dateFromFilter}
                  onChange={(event) => setDateFromFilter(event.target.value)}
                  className={filterSelectClass}
                />
                {dateFromFilter ? (
                  <p className="mt-1 text-small tabular-nums text-ink-muted">
                    {formatClaimDate(dateFromFilter)}
                  </p>
                ) : null}
              </>
            )}
          </FormField>
          <FormField id="claim-history-date-to" label="วันที่สิ้นสุด / End date">
            {(controlProps) => (
              <>
                <input
                  {...controlProps}
                  type="date"
                  value={dateToFilter}
                  onChange={(event) => setDateToFilter(event.target.value)}
                  className={filterSelectClass}
                />
                {dateToFilter ? (
                  <p className="mt-1 text-small tabular-nums text-ink-muted">
                    {formatClaimDate(dateToFilter)}
                  </p>
                ) : null}
              </>
            )}
          </FormField>
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px] justify-center"
            onClick={resetClaimFilters}
          >
            ล้างตัวกรอง
          </Button>
        </div>

        <div className="max-h-[28rem] overflow-y-scroll rounded-[var(--radius-md)]">
          <DataTable
            caption="ประวัติการเบิกค่าใช้จ่าย"
            columns={claimHistoryColumns}
            rows={filteredClaimHistory}
            rowKey={(row) => row.id}
            dense
            emptyState={
              <div className="text-center">
                <p className="text-body font-semibold text-ink">ไม่พบประวัติการเบิก</p>
                <p className="mt-1 text-small text-ink-muted">
                  ลองปรับตัวกรองชื่อสวัสดิการ ประเภทการเบิก หรือสถานะ
                </p>
              </div>
            }
          />
        </div>
      </Card>

      {/* STA-182 — reuse the read-only ClaimDetailModal (STA-159): request detail +
          approval history + attachment view. The hub preview row is adapted into a
          BenefitClaimRequest for the shared modal.
          STA-234 — opt-in Cancel/Edit footer, gated on the row's native status. */}
      <ClaimDetailModal
        claim={detailRow ? humiClaimHistoryToClaimRequest(detailRow) : null}
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        onCancel={rowActions?.canCancel ? openCancel : undefined}
        onEdit={rowActions?.canEdit ? openEdit : undefined}
      />

      {/* STA-234 — pumpkin confirm before cancelling (NO-RED). */}
      <CancelRequestModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        locale={locale}
        fields={{
          typeLabel: cancelTarget?.type ?? '',
          period: cancelTarget ? formatClaimDate(cancelTarget.submittedAt) : '',
          reason: cancelTarget?.desc,
          currentStep: cancelTarget ? CLAIM_STATUS_META[cancelTarget.status].label : '',
          currentStatus: cancelTarget ? CLAIM_STATUS_META[cancelTarget.status].label : '',
        }}
      />

      {/* STA-234 — inline edit (info claims only): amend desc + amount, resubmit. */}
      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={t('editClaimTitle')}
        widthClass="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <FormField id="edit-claim-desc" label={locale === 'en' ? 'Description' : 'รายละเอียด'}>
            {(controlProps) => (
              <input
                {...controlProps}
                type="text"
                value={editDesc}
                onChange={(event) => setEditDesc(event.target.value)}
                className={filterSelectClass}
              />
            )}
          </FormField>
          <FormField id="edit-claim-amount" label={locale === 'en' ? 'Amount' : 'จำนวนเงิน'}>
            {(controlProps) => (
              <input
                {...controlProps}
                type="text"
                value={editAmount}
                onChange={(event) => setEditAmount(event.target.value)}
                className={filterSelectClass}
              />
            )}
          </FormField>
          <div className="mt-1 flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={() => setEditTarget(null)}>
              {locale === 'en' ? 'Cancel' : 'ยกเลิก'}
            </Button>
            <Button variant="primary" size="md" onClick={saveEdit}>
              {locale === 'en' ? 'Save' : 'บันทึก'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* STA-234 — action toast (mockup in-memory). */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3',
            'bg-ink text-canvas shadow-[var(--shadow-lg)]',
            'text-body font-medium',
          )}
        >
          <Check size={16} aria-hidden />
          {toast.msg}
        </div>
      )}
    </section>
  );
}

function DocsSection() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? DOCS : DOCS.slice(0, 3);

  return (
    <Card variant="raised" size="md" aria-labelledby="docs-heading">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <CardEyebrow>เอกสาร</CardEyebrow>
          <CardTitle id="docs-heading" className="mt-1">
            แบบฟอร์มและเอกสารของฉัน
          </CardTitle>
        </div>
      </div>
      <ul role="list" className="mt-3 divide-y divide-hairline-soft">
        {visible.map((d) => (
          <li
            key={d.n}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft text-ink-muted"
            >
              <FileText size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-ink truncate">{d.n}</p>
              <p className="text-small text-ink-muted">
                {d.k} · {d.d}
              </p>
            </div>
            {d.action === 'sign' ? (
              <Button variant="secondary" size="sm">
                ลงนาม
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<Download size={12} />}
              >
                ดาวน์โหลด
              </Button>
            )}
          </li>
        ))}
      </ul>
      {DOCS.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-small font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded"
        >
          {showAll ? 'ย่อ' : `ดูทั้งหมด (${DOCS.length})`}
        </button>
      )}
    </Card>
  );
}

function PoliciesSection() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <Card variant="raised" size="md" aria-labelledby="policies-heading">
      <CardEyebrow>นโยบาย</CardEyebrow>
      <CardTitle id="policies-heading" className="mt-1">
        เอกสารแนวปฏิบัติ
      </CardTitle>
      <ul role="list" className="mt-3 divide-y divide-hairline-soft">
        {POLICIES.map((p, idx) => {
          const open = activeIdx === idx;
          return (
            <li key={p.t} className="py-2">
              <button
                type="button"
                onClick={() => setActiveIdx(open ? null : idx)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded"
              >
                <div className="min-w-0">
                  <p className="text-body font-medium text-ink truncate">{p.t}</p>
                  <p className="text-small text-ink-muted">{p.u}</p>
                </div>
                <ArrowRight
                  size={14}
                  aria-hidden
                  className={cn(
                    'shrink-0 text-ink-muted transition-transform duration-[var(--dur-fast)]',
                    open && 'rotate-90 text-accent',
                  )}
                />
              </button>
              {open && (
                <p className="mt-1 pb-2 text-small leading-relaxed text-ink-soft">{p.body}</p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
