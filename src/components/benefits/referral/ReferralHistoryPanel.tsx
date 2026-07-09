'use client';

import { useState } from 'react';
import { Button, Card, CardEyebrow, CardTitle } from '@/components/cnext';
import { BENEFIT_REFERRAL_STATUS_LABEL, useBenefitReferralsStore, type BenefitReferralRequest } from '@/stores/benefit-referrals';
import { ReferralLetterPreview } from './ReferralLetterPreview';

export function ReferralHistoryPanel() {
  const referrals = useBenefitReferralsStore((state) => state.referrals);
  const cancelReferral = useBenefitReferralsStore((state) => state.cancelReferral);
  const [selected, setSelected] = useState<BenefitReferralRequest | null>(null);

  return (
    <Card variant="raised" size="lg">
      <CardEyebrow>Referral tracking</CardEyebrow>
      <CardTitle>ประวัติใบส่งตัว</CardTitle>
      <div className="mt-4 grid gap-3">
        {referrals.length === 0 ? <p className="text-small text-ink-muted">ยังไม่มีคำขอใบส่งตัว</p> : referrals.map((referral) => (
          <div key={referral.id} className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-small font-semibold text-ink">{referral.workflowRequestId} · {referral.hospital.name}</div>
                <div className="mt-1 text-small text-ink-muted">{referral.coveredPersonName} · นัด {referral.preferredVisitDate} · {referral.serviceReason}</div>
                {(referral.correctionReason || referral.rejectionReason) && <div className="mt-2 rounded-md bg-surface p-2 text-small text-ink">{referral.correctionReason ?? referral.rejectionReason}</div>}
              </div>
              <span className="cnext-tag">{BENEFIT_REFERRAL_STATUS_LABEL[referral.status]}</span>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" disabled={referral.status !== 'letter_issued'} onClick={() => setSelected(referral)}>ดูใบส่งตัว</Button>
              <Button variant="ghost" size="sm" disabled={!['draft', 'pending_spd', 'spd_reviewing', 'send_back'].includes(referral.status)} onClick={() => cancelReferral(referral.id)}>ยกเลิก</Button>
            </div>
          </div>
        ))}
      </div>
      <ReferralLetterPreview referral={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </Card>
  );
}
