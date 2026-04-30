'use client';

import { useMemo, useState } from 'react';
import { Check, FileText, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/humi';
import { useAuthStore } from '@/stores/auth-store';
import { BENEFIT_REFERRAL_STATUS_LABEL, useBenefitReferralsStore, type BenefitReferralRequest } from '@/stores/benefit-referrals';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function BenefitReferralInbox() {
  const referrals = useBenefitReferralsStore((state) => state.referrals);
  const approveReferral = useBenefitReferralsStore((state) => state.approveReferral);
  const rejectReferral = useBenefitReferralsStore((state) => state.rejectReferral);
  const sendBackReferral = useBenefitReferralsStore((state) => state.sendBackReferral);
  const issueReferralLetter = useBenefitReferralsStore((state) => state.issueReferralLetter);
  const actorName = useAuthStore((state) => state.username) ?? 'SPD Benefits';
  const actor = { role: 'spd' as const, name: actorName };
  const pending = useMemo(() => referrals.filter((item) => item.status === 'pending_spd'), [referrals]);
  const approved = useMemo(() => referrals.filter((item) => item.status === 'approved'), [referrals]);

  return (
    <div className="pb-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 className="font-display text-[22px] font-semibold text-ink">Hospital Referral — SPD</h1>
        <p className="text-small text-ink-muted mt-1">ขอใบส่งตัว/ePatient แยกจาก Benefit Reimbursement</p>
      </div>
      <section>
        <div className="humi-eyebrow" style={{ marginBottom: 10 }}>คำขอใบส่งตัวรอ SPD</div>
        {[...pending, ...approved].length === 0 ? <div className="humi-card humi-card--cream" style={{ textAlign: 'center', padding: 40 }}><p className="text-body text-ink-muted">ไม่มีคำขอใบส่งตัวรอ SPD</p></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...pending, ...approved].map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
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

function ReferralCard({ referral, onApprove, onReject, onSendBack, onIssue }: { referral: BenefitReferralRequest; onApprove: (note?: string) => void; onReject: (reason: string) => void; onSendBack: (reason: string) => void; onIssue: () => void }) {
  const [comment, setComment] = useState('');
  return (
    <div className="humi-card" style={{ padding: 18 }}>
      <div className="humi-row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>{referral.workflowRequestId} · {referral.id}</div>
          <div className="text-body font-semibold text-ink">{referral.employeeName} — {referral.hospital.name}</div>
          <div className="text-small text-ink-muted mt-0.5">{referral.coveredPersonName} · นัด {referral.preferredVisitDate} · {formatDate(referral.submittedAt ?? referral.updatedAt)}</div>
        </div>
        <span className="humi-tag humi-tag--butter">{BENEFIT_REFERRAL_STATUS_LABEL[referral.status]}</span>
      </div>
      <dl className="mt-4 grid gap-2 md:grid-cols-2 text-small">
        <Info label="เหตุผล" value={referral.serviceReason} />
        <Info label="สาขา/จังหวัด" value={`${referral.hospital.branch} · ${referral.hospital.province}`} />
        <Info label="ePatient code" value={referral.hospital.ePatientCode} />
        <Info label="หมายเหตุ" value={referral.notes ?? '-'} />
      </dl>
      <div className="mt-4 border-t border-hairline pt-3">
        <label className="humi-label" htmlFor={`${referral.id}-comment`}>เหตุผล (จำเป็นเมื่อปฏิเสธหรือส่งกลับ)</label>
        <textarea id={`${referral.id}-comment`} value={comment} onChange={(event) => setComment(event.target.value)} rows={3} className="humi-input" style={{ width: '100%', minHeight: 80 }} />
        <div className="humi-row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          {referral.status === 'pending_spd' && <>
            <Button variant="ghost" size="sm" disabled={!comment.trim()} onClick={() => { onSendBack(comment.trim()); setComment(''); }}><RotateCcw size={14} aria-hidden />ส่งกลับแก้ไข</Button>
            <Button variant="ghost" size="sm" disabled={!comment.trim()} onClick={() => { onReject(comment.trim()); setComment(''); }}><X size={14} aria-hidden />ปฏิเสธ</Button>
            <Button variant="primary" size="sm" onClick={() => { onApprove(comment.trim() || undefined); setComment(''); }}><Check size={14} aria-hidden />อนุมัติ</Button>
          </>}
          {referral.status === 'approved' && <Button variant="primary" size="sm" onClick={onIssue}><FileText size={14} aria-hidden />ออกใบส่งตัว</Button>}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: '6px 10px', background: 'var(--color-canvas-soft)', borderRadius: 8 }}><dt className="text-ink-muted">{label}</dt><dd className="font-medium text-ink">{value}</dd></div>;
}
