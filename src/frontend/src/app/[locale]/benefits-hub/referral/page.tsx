'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowLeft, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react';
import { CardEyebrow, buttonVariants } from '@/components/humi';
import { ReferralRequestPanel } from '@/components/benefits/referral/ReferralRequestPanel';
import { benefitsHubRoute } from '@/lib/benefit-routes';
import { ApprovalChain } from '@/components/quick-approve/ApprovalChain';
import type { ApproverStage } from '@/data/benefits/plan-registry';

// Hospital referral chain: hrbp → spd → hr_admin
const REFERRAL_CHAIN: ApproverStage[] = ['hrbp', 'spd', 'hr_admin'];

const STATUS_STYLE: Record<string, string> = {
  pending_spd: 'bg-amber-50 text-amber-700 border border-amber-200',
  spd_reviewing: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
  letter_issued: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-danger-soft text-danger-ink border border-danger',
  send_back: 'bg-accent-soft text-accent-ink border border-accent-soft',
};

const STATUS_LABEL_TH: Record<string, string> = {
  pending_spd: 'รอ HRBP/SPD อนุมัติ',
  spd_reviewing: 'SPD กำลังตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  letter_issued: 'ออกใบส่งตัวแล้ว',
  rejected: 'ถูกปฏิเสธ',
  send_back: 'ส่งกลับแก้ไข',
};

const STATUS_LABEL_EN: Record<string, string> = {
  pending_spd: 'Pending HRBP/SPD',
  spd_reviewing: 'SPD Reviewing',
  approved: 'Approved',
  letter_issued: 'Letter Issued',
  rejected: 'Rejected',
  send_back: 'Returned',
};

// Mock referral history for demo
const MOCK_REFERRALS = [
  {
    id: 'REF-001',
    coveredPersonName: 'สมชาย สุขใจ',
    hospitalName: 'โรงพยาบาลกรุงเทพ สาขาสีลม',
    serviceReason: 'พบแพทย์เฉพาะทาง ออร์โธปิดิกส์',
    preferredVisitDate: '2026-05-10',
    submittedAt: '2026-04-28T09:00:00Z',
    status: 'pending_spd',
    audit: [
      { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-04-28T09:00:00Z' },
    ],
  },
  {
    id: 'REF-002',
    coveredPersonName: 'สมชาย สุขใจ',
    hospitalName: 'โรงพยาบาลสมิติเวช สุขุมวิท',
    serviceReason: 'ตรวจสุขภาพประจำปี',
    preferredVisitDate: '2026-04-05',
    submittedAt: '2026-03-25T10:00:00Z',
    status: 'letter_issued',
    audit: [
      { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-03-25T10:00:00Z' },
      { actorName: 'วิชัย HRBP', action: 'approve', at: '2026-03-26T09:00:00Z' },
      { actorName: 'กัณณิกา SPD', action: 'approve', comment: 'ออกใบส่งตัวเรียบร้อย', at: '2026-03-26T14:00:00Z' },
      { actorName: 'วรินทร์ HR Admin', action: 'approve', at: '2026-03-27T11:00:00Z' },
    ],
  },
  {
    id: 'REF-003',
    coveredPersonName: 'มณีรัตน์ สุขใจ (บุตร)',
    hospitalName: 'โรงพยาบาลเด็กสมิติเวช',
    serviceReason: 'พบกุมารแพทย์ ตรวจพัฒนาการ',
    preferredVisitDate: '2026-02-20',
    submittedAt: '2026-02-10T08:00:00Z',
    status: 'rejected',
    audit: [
      { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-02-10T08:00:00Z' },
      { actorName: 'วิชัย HRBP', action: 'reject', comment: 'สิทธิบุตรไม่ครอบคลุมโรงพยาบาลเอกชนนี้', at: '2026-02-11T10:00:00Z' },
    ],
  },
];

function daysWaiting(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function dotColor(action: string) {
  if (action === 'approve') return 'bg-success';
  if (action === 'reject') return 'bg-danger';
  return 'bg-accent-soft';
}

function ReferralHistoryRow({ referral, locale }: { referral: typeof MOCK_REFERRALS[0]; locale: string }) {
  const [expanded, setExpanded] = useState(false);
  const days = daysWaiting(referral.submittedAt);
  const isPending = referral.status === 'pending_spd' || referral.status === 'spd_reviewing';
  const statusLabel = locale === 'th' ? STATUS_LABEL_TH[referral.status] : STATUS_LABEL_EN[referral.status];
  const activeStage: ApproverStage | undefined = isPending ? 'hrbp' : undefined;

  const actionLabel = (action: string) => {
    if (action === 'submit') return locale === 'th' ? 'ส่งคำขอ' : 'Submitted';
    if (action === 'approve') return locale === 'th' ? 'อนุมัติ' : 'Approved';
    if (action === 'reject') return locale === 'th' ? 'ปฏิเสธ' : 'Rejected';
    return action;
  };

  return (
    <li className="humi-card" style={{ padding: 16 }}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-ink-faint font-mono mb-0.5">{referral.id}</div>
            <p className="text-body font-semibold text-ink">{referral.serviceReason}</p>
            <p className="text-small text-ink-muted mt-0.5">
              {referral.coveredPersonName} · {referral.hospitalName}
            </p>
            <p className="text-small text-ink-muted">
              {locale === 'th' ? 'นัด' : 'Visit'}: {referral.preferredVisitDate}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLE[referral.status] ?? ''}`}>
              {statusLabel}
            </span>
            {isPending && (
              <span className={`text-xs font-mono ${days > 3 ? 'text-amber-600 font-semibold' : 'text-ink-muted'}`}>
                {days} {locale === 'th' ? 'ด. รอ' : 'd. waiting'}
              </span>
            )}
          </div>
        </div>

        {/* Approval chain */}
        <ApprovalChain chain={REFERRAL_CHAIN} locale={locale} activeStage={activeStage} size="sm" />

        {/* Audit timeline toggle */}
        <button
          className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
          {locale === 'th' ? 'ประวัติการดำเนินการ' : 'Audit history'}
        </button>
        {expanded && (
          <ol className="space-y-2 pl-2">
            {referral.audit.map((entry, idx) => (
              <li key={idx} className="flex gap-3 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor(entry.action)} mt-1.5 shrink-0`} />
                <div>
                  <span className="font-medium text-ink">{entry.actorName}</span>
                  {' '}
                  <span className="text-ink-muted">{actionLabel(entry.action)}</span>
                  <span className="ml-2 text-ink-faint">{formatDateTime(entry.at)}</span>
                  {entry.comment && (
                    <p className="text-ink-muted mt-0.5 italic">&ldquo;{entry.comment}&rdquo;</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </li>
  );
}

export default function BenefitReferralPage() {
  const locale = useLocale();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardEyebrow>สวัสดิการ · Hospital referral</CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            ขอใบส่งตัว / ePatient
          </h1>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            เส้นทางนี้ใช้สำหรับให้ SPD ออกใบส่งตัวก่อนเข้ารับบริการ ไม่ใช่การเบิกย้อนหลังตามใบเสร็จ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={benefitsHubRoute(locale)} className={buttonVariants({ variant: 'ghost' })}>
            <ArrowLeft size={14} aria-hidden />
            {locale === 'en' ? 'Back to Benefits Hub' : 'กลับ Benefits Hub'}
          </Link>
          <Link href={`/${locale}/requests`} className={buttonVariants({ variant: 'secondary' })}>
            <ClipboardList size={14} aria-hidden />
            {locale === 'en' ? 'Track Requests' : 'ติดตามคำขอ'}
          </Link>
        </div>
      </header>

      {/* Approval chain info */}
      <div className="flex flex-col gap-1.5">
        <p className="text-small font-medium text-ink-muted">
          {locale === 'en' ? 'Approval chain' : 'ขั้นตอนอนุมัติ'}
        </p>
        <ApprovalChain chain={REFERRAL_CHAIN} locale={locale} size="md" />
      </div>

      <ReferralRequestPanel />

      {/* History */}
      <section>
        <h2 className="font-display text-[length:var(--text-display-h3)] font-semibold text-ink mb-4">
          {locale === 'en' ? 'Referral History' : 'ประวัติคำขอใบส่งตัว'}
        </h2>
        <ul className="flex flex-col gap-3">
          {MOCK_REFERRALS.map((r) => (
            <ReferralHistoryRow key={r.id} referral={r} locale={locale} />
          ))}
        </ul>
      </section>
    </div>
  );
}
