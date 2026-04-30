'use client';

import { useMemo, useState } from 'react';
import { Check, FileText, RotateCcw, X } from 'lucide-react';
import { Button, Card, CardEyebrow, FormField } from '@/components/humi';
import { useAuthStore } from '@/stores/auth-store';
import { BENEFIT_REFERRAL_STATUS_LABEL, selectReferralInboxRows, useBenefitReferralsStore, type BenefitReferralRequest } from '@/stores/benefit-referrals';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function BenefitReferralInbox() {
  const referrals = useBenefitReferralsStore((state) => state.referrals);
  const startReferralReview = useBenefitReferralsStore((state) => state.startReferralReview);
  const approveReferral = useBenefitReferralsStore((state) => state.approveReferral);
  const rejectReferral = useBenefitReferralsStore((state) => state.rejectReferral);
  const sendBackReferral = useBenefitReferralsStore((state) => state.sendBackReferral);
  const issueReferralLetter = useBenefitReferralsStore((state) => state.issueReferralLetter);
  const actorName = useAuthStore((state) => state.username) ?? 'SPD Benefits';
  const actor = { role: 'spd' as const, name: actorName };
  const pending = useMemo(() => selectReferralInboxRows(referrals).filter((item) => ['pending_spd', 'spd_reviewing'].includes(item.status)), [referrals]);
  const approved = useMemo(() => referrals.filter((item) => item.status === 'approved'), [referrals]);

  return (
    <div className="space-y-5 pb-8">
      <header>
        <CardEyebrow>Hospital referral · SPD</CardEyebrow>
        <h1 className="mt-1 font-display text-[22px] font-semibold text-ink">Hospital Referral — SPD</h1>
        <p className="text-small text-ink-muted mt-1">ขอใบส่งตัว/ePatient แยกจาก Benefit Reimbursement</p>
      </header>
      <section aria-labelledby="benefit-referral-inbox-heading">
        <CardEyebrow id="benefit-referral-inbox-heading" className="mb-3 block">คำขอใบส่งตัวรอ SPD</CardEyebrow>
        {[...pending, ...approved].length === 0 ? (
          <Card variant="flat" tone="canvas" className="text-center">
            <p className="py-8 text-body text-ink-muted">ไม่มีคำขอใบส่งตัวรอ SPD</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {[...pending, ...approved].map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                onStartReview={(note) => startReferralReview(referral.id, actor, note)}
                onApprove={(note) => approveReferral(referral.id, actor, note)}
                onReject={(reason) => rejectReferral(referral.id, actor, reason)}
                onSendBack={(reason) => sendBackReferral(referral.id, actor, reason)}
                onIssue={() => issueReferralLetter(referral.id, actor)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReferralCard({ referral, onStartReview, onApprove, onReject, onSendBack, onIssue }: { referral: BenefitReferralRequest; onStartReview: (note?: string) => void; onApprove: (note?: string) => void; onReject: (reason: string) => void; onSendBack: (reason: string) => void; onIssue: () => void }) {
  const [comment, setComment] = useState('');
  return (
    <Card variant="raised" size="lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-[220px] flex-1">
          <CardEyebrow className="mb-0.5 block">{referral.workflowRequestId} · {referral.id}</CardEyebrow>
          <div className="text-body font-semibold text-ink">{referral.employeeName} — {referral.hospital.name}</div>
          <div className="text-small text-ink-muted mt-0.5">{referral.coveredPersonName} · นัด {referral.preferredVisitDate} · {formatDate(referral.submittedAt ?? referral.updatedAt)}</div>
        </div>
        <span className="humi-tag humi-tag--butter">{BENEFIT_REFERRAL_STATUS_LABEL[referral.status]}</span>
      </div>
      <dl className="mt-4 grid gap-2 md:grid-cols-2 text-small">
        <Info label="เหตุผล" value={referral.serviceReason} />
        <Info label="สาขา/จังหวัด" value={`${referral.hospital.branch} · ${referral.hospital.province}`} />
        <Info label="ePatient code" value={referral.hospital.ePatientCode} />
        <Info label="เบอร์ติดต่อ" value={referral.contactPhone ?? '-'} />
        <Info label="หมายเหตุเอกสาร" value={referral.documentNote ?? '-'} />
        <Info label="หมายเหตุ" value={referral.notes ?? '-'} />
      </dl>
      <div className="mt-4 border-t border-hairline pt-3">
        <FormField
          id={`${referral.id}-comment`}
          label="เหตุผล (จำเป็นเมื่อปฏิเสธหรือส่งกลับ)"
          help="ใช้บันทึกคำอธิบายสำหรับการส่งกลับ แก้ไข หรือปฏิเสธคำขอ"
        >
          {(controlProps) => (
            <textarea
              {...controlProps}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              className="min-h-20 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas"
            />
          )}
        </FormField>
        <div className="mt-3 flex flex-wrap justify-end gap-2.5">
          {referral.status === 'pending_spd' && <Button variant="secondary" size="sm" onClick={() => { onStartReview(comment.trim() || undefined); setComment(''); }}>เริ่มตรวจ</Button>}
          {['pending_spd', 'spd_reviewing'].includes(referral.status) && <>
            <Button variant="ghost" size="sm" disabled={!comment.trim()} onClick={() => { onSendBack(comment.trim()); setComment(''); }}><RotateCcw size={14} aria-hidden />ส่งกลับแก้ไข</Button>
            <Button variant="ghost" size="sm" disabled={!comment.trim()} onClick={() => { onReject(comment.trim()); setComment(''); }}><X size={14} aria-hidden />ปฏิเสธ</Button>
            <Button variant="primary" size="sm" onClick={() => { onApprove(comment.trim() || undefined); setComment(''); }}><Check size={14} aria-hidden />อนุมัติ</Button>
          </>}
          {referral.status === 'approved' && <Button variant="primary" size="sm" onClick={onIssue}><FileText size={14} aria-hidden />ออกใบส่งตัว</Button>}
        </div>
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-canvas-soft px-2.5 py-1.5"><dt className="text-ink-muted">{label}</dt><dd className="font-medium text-ink">{value}</dd></div>;
}
