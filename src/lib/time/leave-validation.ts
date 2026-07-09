// lib/time/leave-validation.ts — STA-131
//
// Pure, unit-testable leave-request validation predicates. This helper carries
// the NEW restriction rules (day-off, min/max duration, years-of-service,
// gender, marital, one-time). The form's existing quota/overlap/docs/outside-
// bookable checks stay where they are and MERGE their reasons into the same
// liveBlocks/blocking list — this helper does NOT fork a second error surface.
//
// Every predicate is a NO-OP when the leave type carries no matching restriction
// (the optional LeaveTypeDef fields), so the other 22 types are unaffected.

import type { LeaveTypeDef } from './leave-types';
import type { EmployeeEligibility } from './employee-eligibility';

/** A single bilingual blocking reason. `key` is stable for de-dupe/keys. */
export type LeaveValidationReason = {
  key: string;
  msgEn: string;
  msgTh: string;
};

export type ValidateLeaveRequestInput = {
  /** The selected leave type (optional restriction fields read from here). */
  type: LeaveTypeDef | undefined;
  /** Total counted days for the request (post day-count mode). */
  totalDays: number;
  /** Whether a date range has been selected at all. */
  hasRange: boolean;
  /** Clean eligibility facts (gender, maritalStatus, yearsOfService). */
  eligibility: EmployeeEligibility;
  /**
   * Whether this employee already has a non-rejected request of the SAME leave
   * code in history (used by the one-time predicate). The caller derives this
   * from the leave-approvals store so the helper stays pure.
   */
  hasPriorSameCodeRequest: boolean;
};

/**
 * Pure validation: returns every NEW restriction reason that fires for the
 * given input. Empty array = nothing new blocks. The form merges these into its
 * existing liveBlocks and keeps `blocking = liveBlocks.length > 0`.
 */
export function validateLeaveRequest(
  input: ValidateLeaveRequestInput,
): { reasons: LeaveValidationReason[] } {
  const reasons: LeaveValidationReason[] = [];
  const { type, totalDays, hasRange, eligibility, hasPriorSameCodeRequest } = input;

  if (!type) return { reasons };

  // ── Rule 3: Day-off only (no new config) ──
  // For a WorkingDay-type, a selected range that resolves to 0 countable days
  // means the whole range landed on weekends/holidays. CalendarDay types are
  // exempt (they count those days deliberately).
  if (
    type.dayCountMode === 'WorkingDay' &&
    hasRange &&
    totalDays === 0
  ) {
    reasons.push({
      key: 'dayOffOnly',
      msgEn: 'Leave cannot fall entirely on a day off — pick working days',
      msgTh: 'วันลาตรงกับวันหยุดทั้งหมด — เลือกวันทำงาน',
    });
  }

  // ── Rule 4: Minimum duration ──
  if (
    typeof type.minDays === 'number' &&
    totalDays > 0 &&
    totalDays < type.minDays
  ) {
    reasons.push({
      key: 'minDays',
      msgEn: `Minimum ${type.minDays} day(s) for this leave type`,
      msgTh: `ลาประเภทนี้ขั้นต่ำ ${type.minDays} วัน`,
    });
  }

  // ── Rule 4: Maximum duration ──
  if (
    typeof type.maxDays === 'number' &&
    totalDays > type.maxDays
  ) {
    reasons.push({
      key: 'maxDays',
      msgEn: `Maximum ${type.maxDays} day(s) for this leave type`,
      msgTh: `ลาประเภทนี้สูงสุด ${type.maxDays} วัน`,
    });
  }

  // ── Rule 5: Years-of-service condition ──
  if (
    typeof type.minYearsOfService === 'number' &&
    eligibility.yearsOfService < type.minYearsOfService
  ) {
    reasons.push({
      key: 'service',
      msgEn: `Requires at least ${type.minYearsOfService} year(s) of service`,
      msgTh: `ต้องมีอายุงานอย่างน้อย ${type.minYearsOfService} ปี`,
    });
  }

  // ── Rule 7: Gender condition (neutral copy — no sensitive exposure) ──
  if (
    type.genderRestriction &&
    eligibility.gender !== undefined &&
    eligibility.gender !== type.genderRestriction
  ) {
    reasons.push({
      key: 'gender',
      msgEn: 'This leave type is not available for your profile',
      msgTh: 'ประเภทการลานี้ไม่สามารถใช้ได้กับโปรไฟล์ของคุณ',
    });
  }

  // ── Rule 8: Marital status condition ──
  if (
    type.maritalRestriction &&
    eligibility.maritalStatus !== undefined &&
    eligibility.maritalStatus !== type.maritalRestriction
  ) {
    reasons.push({
      key: 'marital',
      msgEn: `This leave type requires ${type.maritalRestriction} marital status`,
      msgTh: `ประเภทการลานี้ต้องมีสถานะ ${type.maritalRestriction}`,
    });
  }

  // ── Rule 9: One-time per employment ──
  if (type.oneTimePerEmployment && hasPriorSameCodeRequest) {
    reasons.push({
      key: 'oneTime',
      msgEn: 'This leave can be used only once and has already been used',
      msgTh: 'ลาประเภทนี้ใช้ได้ครั้งเดียวและถูกใช้ไปแล้ว',
    });
  }

  return { reasons };
}
