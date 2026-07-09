// DWS (Daily Work Schedule) validation — wiki §2. The Excel planning tool flags
// each day with a 3-colour warning; we replicate that rule set so the schedule UI
// can surface the same signals:
//   🔴 red    = working day with an empty / invalid shift code → must fix.
//   🟢 green  = weekly day-off (`F`) / special weekly holiday.
//   🟡 yellow = shift starts < 5 hours after the previous shift's end
//               (continuous-shift warning → needs extra Time-Correction certification).
//   (ok)      = a normal, valid working day.
// Pure functions over the Template-derived schedule (single source).

import type { DaySchedule } from './schedule-template';
import { getShiftCode } from './shift-codes';

export type DwsLevel = 'ok' | 'green' | 'red' | 'yellow';

export type DwsResult = {
  level: DwsLevel;
  reasonTh: string;
  reasonEn: string;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Gap in minutes from the previous day's scheduled OUT to this day's IN (crosses midnight). */
export function continuousShiftGapMinutes(prevOut: string, thisIn: string): number {
  return 24 * 60 - toMinutes(prevOut) + toMinutes(thisIn);
}

const CONTINUOUS_SHIFT_THRESHOLD_MIN = 5 * 60; // wiki §2: < 5h between shifts

/** Validate one scheduled day. `prev` is the immediately preceding day (or null). */
export function validateDwsDay(day: DaySchedule, prev: DaySchedule | null): DwsResult {
  if (day.dayOff) {
    return { level: 'green', reasonTh: 'วันหยุดประจำสัปดาห์', reasonEn: 'Weekly day off' };
  }
  if (!day.shiftCode || !getShiftCode(day.shiftCode) || !day.scheduledIn) {
    return { level: 'red', reasonTh: 'ไม่มีรหัสกะ หรือรหัสไม่ถูกต้อง', reasonEn: 'Missing or invalid shift code' };
  }
  if (prev && !prev.dayOff && prev.scheduledOut && day.scheduledIn) {
    const gap = continuousShiftGapMinutes(prev.scheduledOut, day.scheduledIn);
    if (gap < CONTINUOUS_SHIFT_THRESHOLD_MIN) {
      return {
        level: 'yellow',
        reasonTh: `เริ่มกะหลังกะก่อนหน้าไม่ถึง 5 ชม. (${Math.floor(gap / 60)} ชม. ${gap % 60} นาที)`,
        reasonEn: `Starts < 5h after previous shift (${Math.floor(gap / 60)}h ${gap % 60}m)`,
      };
    }
  }
  return { level: 'ok', reasonTh: 'ปกติ', reasonEn: 'OK' };
}

/** Validate a whole period; returns a per-day result + a roll-up of warning counts. */
export function validateDwsPeriod(days: DaySchedule[]): {
  perDay: DwsResult[];
  red: number;
  yellow: number;
} {
  const perDay = days.map((d, i) => validateDwsDay(d, i > 0 ? days[i - 1] : null));
  return {
    perDay,
    red: perDay.filter((r) => r.level === 'red').length,
    yellow: perDay.filter((r) => r.level === 'yellow').length,
  };
}

/** Humi token classes for each level — green=success, yellow=warning, red=pumpkin danger. */
export const DWS_LEVEL_CLASS: Record<DwsLevel, string> = {
  green: 'bg-success-soft text-success',
  yellow: 'bg-warning-soft text-warning',
  red: 'bg-danger-soft text-danger',
  ok: 'bg-canvas-soft text-ink-muted',
};

export function dwsLabel(level: DwsLevel, isTh: boolean): string {
  switch (level) {
    case 'green': return isTh ? 'วันหยุด' : 'Day off';
    case 'red': return isTh ? 'ต้องแก้ไข' : 'Fix required';
    case 'yellow': return isTh ? 'เตือน' : 'Warning';
    default: return isTh ? 'ปกติ' : 'OK';
  }
}
