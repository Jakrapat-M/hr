'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { XCircle, RotateCcw, ChevronDown } from 'lucide-react';
import { Modal, Button, FormField } from '@/components/humi';

export type DrawerMode = 'reject' | 'return';

interface RejectReturnDrawerProps {
  open: boolean;
  mode: DrawerMode;
  requestId: string;
  onClose: () => void;
  onConfirm: (requestId: string, reason: string, comment: string) => void;
}

const REJECT_REASONS_TH = [
  'ข้อมูลไม่ครบถ้วน',
  'เอกสารไม่ถูกต้อง',
  'ไม่เป็นไปตามนโยบายบริษัท',
  'วันที่มีผลไม่ถูกต้อง',
  'ซ้ำกับคำขอที่ยื่นไปแล้ว',
  'ไม่ผ่านเงื่อนไขสิทธิ์',
  'ขัดแย้งกับตารางงาน',
  'อื่น ๆ (โปรดระบุในความคิดเห็น)',
];

const REJECT_REASONS_EN = [
  'Incomplete information',
  'Invalid document',
  'Does not comply with company policy',
  'Effective date issue',
  'Duplicate of existing request',
  'Eligibility criteria not met',
  'Conflicts with work schedule',
  'Other (please specify in comments)',
];

const RETURN_REASONS_TH = [
  'ข้อมูลไม่ครบถ้วน',
  'เอกสารไม่ถูกต้อง',
  'ไม่เป็นไปตามนโยบายบริษัท',
  'วันที่มีผลไม่ถูกต้อง',
  'ซ้ำกับคำขอที่ยื่นไปแล้ว',
  'ไม่ผ่านเงื่อนไขสิทธิ์',
  'ขัดแย้งกับตารางงาน',
  'อื่น ๆ (โปรดระบุในความคิดเห็น)',
];

const RETURN_REASONS_EN = [
  'Incomplete information',
  'Invalid document',
  'Does not comply with company policy',
  'Effective date issue',
  'Duplicate of existing request',
  'Eligibility criteria not met',
  'Conflicts with work schedule',
  'Other (please specify in comments)',
];

export function RejectReturnDrawer({
  open,
  mode,
  requestId,
  onClose,
  onConfirm,
}: RejectReturnDrawerProps) {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const isTh = locale !== 'en';

  const [selectedReason, setSelectedReason] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isReject = mode === 'reject';
  const reasons = isReject
    ? (isTh ? REJECT_REASONS_TH : REJECT_REASONS_EN)
    : (isTh ? RETURN_REASONS_TH : RETURN_REASONS_EN);

  const title = isReject
    ? (isTh ? 'ปฏิเสธคำขอ' : 'Reject Request')
    : (isTh ? 'ส่งคืนคำขอ' : 'Return Request');

  const canSubmit = selectedReason.trim().length > 0;

  function handleClose() {
    setSelectedReason('');
    setComment('');
    onClose();
  }

  async function handleConfirm() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      onConfirm(requestId, selectedReason, comment);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="flex flex-col gap-5 p-4">
        {/* Reason picker */}
        <FormField label={isTh ? 'เหตุผล' : 'Reason'} required>
          {(ctrl) => (
            <div className="relative">
              <select
                {...ctrl}
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-hairline bg-surface px-3 pr-9 text-body text-ink transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas"
              >
                <option value="">
                  {isTh ? '— เลือกเหตุผล —' : '— Select a reason —'}
                </option>
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown
                size={16}
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
            </div>
          )}
        </FormField>

        {/* Comment textarea */}
        <FormField label={isTh ? 'ความคิดเห็นเพิ่มเติม' : 'Additional comments'} help={isTh ? 'ไม่บังคับ' : 'optional'}>
          {(ctrl) => (
            <textarea
              {...ctrl}
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={isTh ? 'ระบุรายละเอียดเพิ่มเติม...' : 'Add more details...'}
              className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas"
            />
          )}
        </FormField>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="md" onClick={handleClose} disabled={submitting}>
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
            className="flex items-center gap-2"
          >
            {isReject ? (
              <XCircle className="h-4 w-4" aria-hidden />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden />
            )}
            {submitting
              ? (isTh ? 'กำลังดำเนินการ...' : 'Processing...')
              : isReject
              ? (isTh ? 'ยืนยันปฏิเสธ' : 'Confirm Reject')
              : (isTh ? 'ยืนยันส่งคืน' : 'Confirm Return')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
