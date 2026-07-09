import type { TerminationStep } from './termination-approvals';

export const TERMINATION_STEP_LABEL: Record<TerminationStep, string> = {
  pending_manager: 'รอ Manager อนุมัติ',
  pending_spd: 'รอ SPD อนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ถูกปฏิเสธ',
  sent_back: 'ส่งกลับให้แก้ไข / Sent back',
  withdrawn: 'ถอนคำขอแล้ว / Withdrawn',
};

export const TERMINATION_STEP_LABEL_I18N: Record<TerminationStep, { th: string; en: string }> = {
  pending_manager: { th: 'รอ Manager อนุมัติ', en: 'Awaiting manager' },
  pending_spd: { th: 'รอ SPD อนุมัติ', en: 'Awaiting SPD' },
  approved: { th: 'อนุมัติแล้ว', en: 'Approved' },
  rejected: { th: 'ถูกปฏิเสธ', en: 'Rejected' },
  sent_back: { th: 'ส่งกลับให้แก้ไข', en: 'Sent back' },
  withdrawn: { th: 'ถอนคำขอแล้ว', en: 'Withdrawn' },
};

export const TERMINATION_STEP_BADGE_TONE: Record<TerminationStep, 'neutral' | 'success' | 'warning' | 'pumpkin'> = {
  pending_manager: 'warning',
  pending_spd: 'warning',
  approved: 'success',
  rejected: 'pumpkin',
  sent_back: 'pumpkin',
  withdrawn: 'neutral',
};
