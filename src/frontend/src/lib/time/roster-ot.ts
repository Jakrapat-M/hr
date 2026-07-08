// lib/time/roster-ot.ts — STA-260 (manager-scheduled OT on /roster).
//
// MOCK ONLY. Pure validation for the per-day +OverTime popup: an OT window is a
// same-day HH:MM range that must not overlap ANY existing block on that
// employee-day (the scheduled shift, other OT, an approved leave block).
// Touching boundaries are allowed (OT may start exactly when the shift ends).
// Deterministic, no Date.now — unit-tested.

/** One existing blocked window on an employee-day (HH:MM, same-day). */
export type BlockedWindow = {
  start: string;
  end: string;
  /** What the window is (shift / OT / leave) — interpolated into the error copy. */
  labelTh: string;
  labelEn: string;
};

export type RosterOtValidation =
  | { code: 'missing_time' }
  | { code: 'bad_range' }
  | { code: 'overlap'; block: BlockedWindow }
  | null;

/**
 * Validate a candidate OT window against the day's blocked windows.
 *   • missing_time — either time is blank.
 *   • bad_range    — end at/before start (roster OT is same-day; no midnight wrap).
 *   • overlap      — intersects a blocked window (strict: start < b.end && end > b.start,
 *                    so exactly-touching boundaries are allowed).
 */
export function validateRosterOt(
  start: string,
  end: string,
  blocked: readonly BlockedWindow[],
): RosterOtValidation {
  if (!start || !end) return { code: 'missing_time' };
  if (end <= start) return { code: 'bad_range' };
  for (const b of blocked) {
    if (start < b.end && end > b.start) return { code: 'overlap', block: b };
  }
  return null;
}

/** OT hours for a same-day HH:MM window, 2-decimal rounded. */
export function rosterOtHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0;
}
