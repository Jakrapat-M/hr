// Time Off balance ledger (wiki §6 WFS "Time Off" tab): per leave bucket, in days,
// Initial Balance · Credits · Debits · Ending Balance. Ending = Initial + Credits −
// Debits. Mockup seed of the WFS buckets seen in the reference screenshot.

export type LeaveLedgerRow = {
  kind: string;
  nameTh: string;
  nameEn: string;
  initial: number;
  credits: number;
  debits: number;
};

export const TIME_OFF_LEDGER: LeaveLedgerRow[] = [
  { kind: 'annual', nameTh: 'ลาพักผ่อนประจำปี', nameEn: 'Annual Leave', initial: 10, credits: 0, debits: 3 },
  { kind: 'sick', nameTh: 'ลาป่วย', nameEn: 'Sick Leave', initial: 30, credits: 0, debits: 2 },
  { kind: 'personal', nameTh: 'ลากิจ', nameEn: 'Personal Leave', initial: 3, credits: 0, debits: 1 },
  { kind: 'maternity', nameTh: 'ลาคลอดบุตร', nameEn: 'Maternity Leave', initial: 98, credits: 0, debits: 0 },
  { kind: 'maternity_spouse', nameTh: 'ลาช่วยเหลือคู่สมรสคลอดบุตร', nameEn: 'Maternity (Spouse)', initial: 15, credits: 0, debits: 0 },
];

export function endingBalance(r: LeaveLedgerRow): number {
  return r.initial + r.credits - r.debits;
}
