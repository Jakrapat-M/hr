// lib/time/clock-state.ts — STA-126 (Team Timesheet weekly grid)
//
// MOCK ONLY. Pure clock-state classifier + the single NO-RED token map for every
// chip the weekly grid renders. Derives the actual-vs-scheduled sub-state for a
// day from the existing time-domain seeds (attendance-math) — no parallel mock.
//
// NO-RED guardrail: late / mismatch / absent use pumpkin (--color-danger),
// amber (--color-warning), or gray (--color-ink-muted) tokens — never red.

import { computeLateMinutes, type AttendanceDay } from './attendance-math';
import { DEMO_TODAY } from './week';

/** The actual-clock sub-state for a scheduled day. */
export type ClockState = 'on-time' | 'late' | 'mismatch' | 'absent' | 'none';

/**
 * Classify a day's actual clock against its schedule.
 *
 *   • day off / no scheduled shift            → 'none'
 *   • future day (date > cutoff), no actual   → 'none'
 *   • clock-in set but no clock-out           → 'mismatch' (incomplete punch)
 *   • computeLateMinutes > 0                  → 'late'
 *   • both punches, computeLateMinutes === 0  → 'on-time'
 *   • past scheduled working day, no actual   → 'absent'
 *
 * @param cutoffISO past/future boundary (defaults to DEMO_TODAY); days strictly
 *                  after it are "future" and a missing punch is 'none', not absent.
 */
export function classifyClock(day: AttendanceDay, cutoffISO: string = DEMO_TODAY): ClockState {
  // Day off or no scheduled shift → nothing to clock against.
  if (day.dayOff || !day.scheduledIn) return 'none';

  const hasIn = !!day.actualIn;
  const hasOut = !!day.actualOut;

  if (hasIn && !hasOut) return 'mismatch';

  if (hasIn && hasOut) {
    const late = computeLateMinutes(day.scheduledIn, day.actualIn);
    return late !== null && late > 0 ? 'late' : 'on-time';
  }

  // No actual punch at all. Future days are simply not-yet-clocked ('none');
  // a past scheduled working day with no punch is an absence.
  const isFuture = day.date > cutoffISO;
  return isFuture ? 'none' : 'absent';
}

/** Bilingual labels for each clock sub-state. */
export const CLOCK_STATE_LABEL: Record<Exclude<ClockState, 'none'>, { th: string; en: string }> = {
  'on-time': { th: 'มาจริง', en: 'On time' },
  late: { th: 'สาย', en: 'Late' },
  mismatch: { th: 'ไม่ตรงเวลา', en: 'Mismatch' },
  absent: { th: 'ขาดงาน', en: 'Absent' },
};

/** Every chip archetype the grid can render (drives the legend + cell colors). */
export type ChipKind =
  | 'shift'
  | 'clockOnTime'
  | 'clockLate'
  | 'clockMismatch'
  | 'clockAbsent'
  | 'ot'
  | 'leave'
  | 'dayOff'
  | 'holiday';

/**
 * NO-RED token classes per chip kind. Background-soft + matching border/ink so
 * each chip reads as a tinted pill. Token-only (no raw hex, no red):
 *   shift        → indigo  (accent-alt)   — planned shift
 *   clockOnTime  → teal    (accent)       — มาจริง
 *   clockLate    → pumpkin-soft (danger-soft)
 *   clockMismatch→ pumpkin (danger)       — solid, the strongest warning
 *   clockAbsent  → gray    (ink-muted)
 *   ot           → amber   (warning)
 *   leave        → sage    (approved leave — read-only, distinct from indigo shift)
 *   dayOff       → gray    (canvas-soft)
 *   holiday      → amber-soft (warning-soft)
 */
export const CHIP_CLASS: Record<ChipKind, string> = {
  shift:
    'bg-[var(--color-accent-alt-soft)] text-[var(--color-accent-alt)] border-[var(--color-accent-alt)]',
  clockOnTime: 'bg-accent-soft text-accent border-accent',
  clockLate:
    'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger)]',
  clockMismatch: 'bg-[var(--color-danger)] text-white border-[var(--color-danger)]',
  clockAbsent:
    'bg-canvas-soft text-ink-muted border-[var(--color-ink-muted)]',
  ot: 'bg-warning-soft text-warning border-warning',
  leave:
    'bg-[var(--color-sage-soft)] text-[var(--color-sage-ink)] border-[var(--color-sage)]',
  dayOff: 'bg-canvas-soft text-ink-muted border-hairline',
  holiday:
    'bg-warning-soft text-warning border-warning',
};

/** Map a clock sub-state to its chip kind (or null when nothing should render). */
export function clockChipKind(state: ClockState): ChipKind | null {
  switch (state) {
    case 'on-time':
      return 'clockOnTime';
    case 'late':
      return 'clockLate';
    case 'mismatch':
      return 'clockMismatch';
    case 'absent':
      return 'clockAbsent';
    case 'none':
    default:
      return null;
  }
}
