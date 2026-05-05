'use client';

// SPD inbox — sole approver for:
//   • Chain 3: ESS personal-info change requests (BRD #166)
//   • Chain 1: ESS termination/resignation requests (BRD #172)
//   • Chain 4: Promotion requests (BRD #103)
//   • Benefit reimbursement claims
//   • Hospital referral letters
//
// BRD #134 redesign: unified Humi section layout, no double-render.
// Each domain has ONE place where its data appears (the per-domain inbox).
// A KPI strip at the top shows pending counts and anchors to each section.

import { useId } from 'react';
import { Clock } from 'lucide-react';
import { ApprovalInbox } from '@/components/workflow/ApprovalInbox';
import { TerminationInbox } from '@/components/workflow/TerminationInbox';
import { PromotionInbox } from '@/components/workflow/PromotionInbox';
import { BenefitClaimsInbox } from '@/components/workflow/BenefitClaimsInbox';
import { BenefitReferralInbox } from '@/components/workflow/BenefitReferralInbox';
import { Capability } from '@/components/humi';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import { useTerminationApprovals } from '@/stores/termination-approvals';
import { usePromotionApprovals } from '@/stores/promotion-approvals';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';

// ── KPI strip ──────────────────────────────────────────────────────────────────

interface KpiChipProps {
  label: string;
  count: number;
  href: string;
}

function KpiChip({ label, count, href }: KpiChipProps) {
  const hasPending = count > 0;
  return (
    <a
      href={href}
      className="humi-card humi-card--cream"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '10px 16px',
        minWidth: 160,
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'box-shadow var(--dur-base) var(--ease-spring)',
      }}
      aria-label={`${label}: ${count} รอ`}
    >
      <span className="humi-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Clock size={10} aria-hidden />
        {label}
      </span>
      <span
        className="text-body font-semibold"
        style={{ color: hasPending ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}
      >
        {count} รอ
      </span>
    </a>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

interface DomainSectionProps {
  id: string;
  eyebrow: string;
  children: React.ReactNode;
}

function DomainSection({ id, eyebrow, children }: DomainSectionProps) {
  return (
    <section
      id={id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        scrollMarginTop: 80,
      }}
      aria-labelledby={`${id}-heading`}
    >
      <div className="humi-eyebrow" id={`${id}-heading`} style={{ marginBottom: 2 }}>
        {eyebrow}
      </div>
      {children}
    </section>
  );
}

// ── Hairline divider ───────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ borderTop: '1px solid var(--color-hairline-soft)' }} />;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SPDInboxPage() {
  // Pending counts for KPI strip — each store is read once, here only.
  const wfPending      = useWorkflowApprovals((s) =>
    s.requests.filter((r) => r.status === 'pending_spd').length,
  );
  const termPending    = useTerminationApprovals((s) =>
    s.requests.filter((r) => r.status === 'pending_spd').length,
  );
  const promPending    = usePromotionApprovals((s) =>
    s.requests.filter((r) => r.status === 'pending_spd').length,
  );
  const claimPending   = useBenefitClaimsStore((s) =>
    s.claims.filter((c) => c.status === 'pending_spd').length,
  );
  const referralPending = useBenefitReferralsStore((s) =>
    s.referrals.filter((r) => r.status === 'pending_spd' || r.status === 'spd_reviewing').length,
  );

  // Stable section IDs
  const prefix = useId().replace(/:/g, '');
  const ids = {
    claims:   `${prefix}-claims`,
    referral: `${prefix}-referral`,
    wf:       `${prefix}-wf`,
    term:     `${prefix}-term`,
    promo:    `${prefix}-promo`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-[22px] font-semibold text-ink">
          กล่องอนุมัติ — SPD
        </h1>
        <p className="text-small text-ink-muted mt-1">
          อนุมัติคำขอทั้งหมดที่พนักงานส่งผ่าน Self-Service (BRD #134)
        </p>
      </div>

      {/* ── KPI strip ───────────────────────────────────────── */}
      <nav
        aria-label="ประเภทคำขอ"
        className="humi-row"
        style={{ gap: 10, flexWrap: 'wrap' }}
      >
        <KpiChip label="Benefit Reimbursement" count={claimPending}    href={`#${ids.claims}`}   />
        <KpiChip label="Hospital Referral"      count={referralPending} href={`#${ids.referral}`} />
        <KpiChip label="แก้ไขข้อมูลส่วนตัว"     count={wfPending}      href={`#${ids.wf}`}       />
        <KpiChip label="ลาออก"                  count={termPending}    href={`#${ids.term}`}     />
        <KpiChip label="เลื่อนตำแหน่ง"          count={promPending}    href={`#${ids.promo}`}    />
      </nav>

      <Divider />

      {/* ── Domain 1: Benefit Reimbursement ─────────────────── */}
      <Capability entity="BenefitEmployeeClaim">
        <DomainSection id={ids.claims} eyebrow={`Benefit Reimbursement${claimPending > 0 ? ` · ${claimPending} รอ` : ''}`}>
          <p className="text-small text-ink-muted" style={{ marginTop: -4, marginBottom: 4 }}>
            กล่องอนุมัติคำขอเบิกสวัสดิการ
          </p>
          <BenefitClaimsInbox />
        </DomainSection>
      </Capability>

      <Divider />

      {/* ── Domain 2: Hospital Referral ──────────────────────── */}
      <Capability entity="BenefitEmployeeClaim">
        <DomainSection id={ids.referral} eyebrow={`Hospital Referral / ขอใบส่งตัว${referralPending > 0 ? ` · ${referralPending} รอ` : ''}`}>
          <BenefitReferralInbox />
        </DomainSection>
      </Capability>

      <Divider />

      {/* ── Domain 3: Personal-info change-request ───────────── */}
      <Capability action="approve">
        <DomainSection id={ids.wf} eyebrow={`แก้ไขข้อมูลส่วนตัว (BRD #166)${wfPending > 0 ? ` · ${wfPending} รอ` : ''}`}>
          <ApprovalInbox
            role="spd"
            expectedStep="pending_spd"
            title="Chain 3 — แก้ไขข้อมูลส่วนตัว"
            subtitle="อนุมัติคำขอแก้ไขข้อมูลส่วนตัวที่พนักงานส่งผ่าน Self-Service (BRD #166)"
          />
        </DomainSection>
      </Capability>

      <Divider />

      {/* ── Domain 4: Termination / Resignation ─────────────── */}
      <Capability action="approve">
        <DomainSection id={ids.term} eyebrow={`ลาออก (BRD #172)${termPending > 0 ? ` · ${termPending} รอ` : ''}`}>
          <TerminationInbox />
        </DomainSection>
      </Capability>

      <Divider />

      {/* ── Domain 5: Promotion ──────────────────────────────── */}
      <Capability action="approve">
        <DomainSection id={ids.promo} eyebrow={`เลื่อนตำแหน่ง (BRD #103)${promPending > 0 ? ` · ${promPending} รอ` : ''}`}>
          <PromotionInbox />
        </DomainSection>
      </Capability>

      {/* ── Override / Bulk-approve panels ──────────────────── */}
      <Capability action="override">
        <Divider />
        <div>
          <p className="text-small font-semibold text-ink-muted uppercase tracking-[0.14em]">
            Override Actions
          </p>
          <p className="text-small text-ink-muted mt-1">
            การดำเนินการ Override — มองเห็นได้เฉพาะ SPD / HRBP / HR Admin
          </p>
        </div>
      </Capability>

      <Capability action="bulkApprove">
        <Divider />
        <div>
          <p className="text-small font-semibold text-ink-muted uppercase tracking-[0.14em]">
            Bulk Approve
          </p>
          <p className="text-small text-ink-muted mt-1">
            อนุมัติหลายรายการพร้อมกัน — มองเห็นได้เฉพาะ SPD / HRBP / HR Admin
          </p>
        </div>
      </Capability>

    </div>
  );
}
