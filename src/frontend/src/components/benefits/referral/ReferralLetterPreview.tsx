'use client';

import { Button, Card, CardEyebrow, CardTitle, Modal } from '@/components/humi';
import { buildMockEPatientLetterPayload } from '@/lib/benefit-referral-adapters';
import type { BenefitReferralRequest } from '@/stores/benefit-referrals';

export function ReferralLetterPreview({ referral, open, onClose }: { referral: BenefitReferralRequest | null; open: boolean; onClose: () => void }) {
  if (!referral) return null;
  const payload = buildMockEPatientLetterPayload(referral);
  return (
    <Modal open={open} onClose={onClose} title="ตัวอย่างใบส่งตัว ePatient" widthClass="max-w-2xl">
      <Card variant="flat" tone="canvas">
        <CardEyebrow>{referral.letter?.referralNumber ?? 'ยังไม่ออกใบส่งตัว'}</CardEyebrow>
        <CardTitle>{referral.letter?.previewTitle ?? 'รอ SPD ออกใบส่งตัว'}</CardTitle>
        <dl className="mt-4 grid gap-3 text-small sm:grid-cols-2">
          <Info label="โรงพยาบาล" value={payload.hospital} />
          <Info label="ผู้ใช้สิทธิ์" value={referral.coveredPersonName} />
          <Info label="เหตุผลเข้ารับบริการ" value={referral.serviceReason} />
          <Info label="วันนัดที่ต้องการ" value={referral.preferredVisitDate} />
          <Info label="มีผลตั้งแต่" value={referral.letter?.validFrom ?? '-'} />
          <Info label="ใช้ได้ถึง" value={referral.letter?.validUntil ?? '-'} />
          <Info label="ผู้ออกใบส่งตัว" value={referral.letter?.issuedBy ?? '-'} />
          <Info label="ePatient reference" value={payload.ePatientReference ?? '-'} />
          <Info label="สถานะ ePatient" value={payload.integrationStatus} />
        </dl>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>ปิด</Button>
          <Button variant="secondary" disabled={!referral.letter}>ดาวน์โหลด PDF (ยังไม่เปิดใช้)</Button>
        </div>
      </Card>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-surface p-3"><dt className="text-ink-muted">{label}</dt><dd className="font-semibold text-ink">{value}</dd></div>;
}
