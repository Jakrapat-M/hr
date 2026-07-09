// exit-interview-options.ts — seeded factor lists for the Exit Interview section
// (STA-124 — [EC] Termination feedback).
//
// Each option carries a stable `code` (used as the persisted value + i18n key
// suffix) and a `labelTh` (Thai verbatim from the BA ticket, used as the
// fallback label). Natural-English labels live in the `terminationFeedback`
// i18n catalog keyed by `<part>.options.<code>`.
//
// Mockup phase: static registry only, no backend.

export interface ExitFactorOption {
  /** Stable code — persisted value + i18n key suffix. */
  code: string
  /** Thai label (verbatim from ticket) — fallback when no i18n key resolves. */
  labelTh: string
}

// ─── Part 1 — Job / ลักษณะงาน ───────────────────────────────────────────────
export const JOB_FACTORS: ExitFactorOption[] = [
  { code: 'job_sales_target_high', labelTh: 'ตั้งเป้ายอดขายสูงเกินไป' },
  { code: 'job_overload', labelTh: 'งานมากเกินไป' },
  { code: 'job_shift_unstable', labelTh: 'เปลี่ยนตารางกะถี่เกินไป ไม่มีความแน่นอน' },
  { code: 'job_duty_mismatch', labelTh: 'หน้าที่ได้รับมอบหมายไม่ตรงกับที่ตกลงไว้' },
  { code: 'job_relocated', labelTh: 'ถูกโอนย้ายสถานที่ทำงาน' },
  { code: 'job_no_progress', labelTh: 'ไม่ก้าวหน้าในงาน' },
]

// ─── Part 2 — Compensation & Benefit / ค่าจ้างและสวัสดิการ ───────────────────
export const COMPENSATION_FACTORS: ExitFactorOption[] = [
  { code: 'comp_low_income', labelTh: 'รายได้น้อย' },
  { code: 'comp_low_bonus', labelTh: 'โบนัสหรือค่าคอมมิชชั่นน้อย' },
  { code: 'comp_low_raise', labelTh: 'เงินเดือนขึ้นน้อย' },
  { code: 'comp_unpaid_ot', labelTh: 'ทำงานล่วงเวลามากแต่ไม่ได้รับค่าล่วงเวลา' },
  { code: 'comp_insufficient_holiday', labelTh: 'วันหยุดไม่เพียงพอ' },
  { code: 'comp_benefit_mismatch', labelTh: 'สวัสดิการไม่ตอบสนองต่อความต้องการ' },
]

// ─── Part 3 — Work Relationship / หัวหน้างานและเพื่อนร่วมงาน ─────────────────
export const WORK_RELATIONSHIP_FACTORS: ExitFactorOption[] = [
  { code: 'rel_no_coaching', labelTh: 'หัวหน้างานไม่สอนงาน' },
  { code: 'rel_harsh_criticism', labelTh: 'หัวหน้างานชอบตำหนิ ใช้คำพูดรุนแรง' },
  { code: 'rel_unfair', labelTh: 'หัวหน้าไม่ยุติธรรม' },
  { code: 'rel_unfriendly_peers', labelTh: 'เพื่อนร่วมงานไม่เป็นมิตร' },
  { code: 'rel_no_personal_leave', labelTh: 'ขอลากิจไม่ได้' },
]

// ─── Part 4 — Personal Reason / เหตุผลส่วนตัว (single select) ─────────────────
export const PERSONAL_REASON_OPTIONS: ExitFactorOption[] = [
  { code: 'personal_study', labelTh: 'ศึกษาต่อ' },
  { code: 'personal_business', labelTh: 'ทำธุรกิจส่วนตัว' },
  { code: 'personal_health', labelTh: 'สุขภาพไม่ดี' },
  { code: 'personal_commute', labelTh: 'เดินทางไม่สะดวก บ้านไกลจากที่ทำงาน' },
]

// ─── Part 5 — Have you got a new job? / ท่านได้งานใหม่แล้วหรือไม่ (single select)
/** Value that reveals the conditional new-job-type sub-select. */
export const NEW_JOB_YES_CODE = 'newjob_yes'

export const NEW_JOB_OPTIONS: ExitFactorOption[] = [
  { code: NEW_JOB_YES_CODE, labelTh: 'ได้งานใหม่แล้ว' },
  { code: 'newjob_no', labelTh: 'ยังไม่ได้งานใหม่' },
  { code: 'newjob_no_disclose', labelTh: 'ไม่ประสงค์ให้ข้อมูล' },
]

// Conditional sub-select — only when NEW_JOB_YES_CODE is chosen.
export const NEW_JOB_TYPE_OPTIONS: ExitFactorOption[] = [
  { code: 'newjobtype_better_pay', labelTh: 'ได้ผลตอบแทนที่ดีกว่าในงานที่คล้ายเดิม' },
  { code: 'newjobtype_senior_role', labelTh: 'ได้ตำแหน่งงานที่สูงขึ้น' },
  { code: 'newjobtype_better_growth', labelTh: 'ได้โอกาสในการเติบโตที่ดีขึ้น' },
]

// ─── Lookup maps (code → Thai label) for read-only surfaces (e.g. HRBP panel)
function toLabelMap(options: ExitFactorOption[]): Record<string, string> {
  return Object.fromEntries(options.map((o) => [o.code, o.labelTh]))
}

export const EXIT_FACTOR_LABEL_TH: Record<string, string> = {
  ...toLabelMap(JOB_FACTORS),
  ...toLabelMap(COMPENSATION_FACTORS),
  ...toLabelMap(WORK_RELATIONSHIP_FACTORS),
  ...toLabelMap(PERSONAL_REASON_OPTIONS),
  ...toLabelMap(NEW_JOB_OPTIONS),
  ...toLabelMap(NEW_JOB_TYPE_OPTIONS),
}
