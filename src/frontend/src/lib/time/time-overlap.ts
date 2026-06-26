// time-overlap — single definition of the cross-midnight-aware interval overlap
// test, shared by the ESS OT form (/overtime) and available to the time-correction
// flow. Extracted verbatim from overtime/page.tsx so there is EXACTLY ONE
// `overlaps` definition (MF-4).
//
// Arguments are ISO datetime strings (e.g. `2026-06-01T23:00:00`). Callers build
// them via combineDateTime(date, time) — the helper does NOT accept bare `HH:mm`
// clock values; pass a full datetime so the cross-midnight normalization works.
//
// Dormant for the time-correction flow (Sub-Option 1 validates by duplicate +
// same-time clash, no interval math). It is wired + unit-tested here so the BA's
// ranged-overlap pivot (Sub-Option 2) is mechanical: add fromTime/toTime to the
// day model and pass the combined datetimes through.

/** Two windows overlap when start < other.end AND other.start < end. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = new Date(aStart).getTime();
  let ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  let be = new Date(bEnd).getTime();
  if ([as, ae, bs, be].some(Number.isNaN)) return false;
  // Normalize cross-midnight ends so the comparison stays a simple interval test.
  if (ae <= as) ae += 24 * 60 * 60 * 1000;
  if (be <= bs) be += 24 * 60 * 60 * 1000;
  return as < be && bs < ae;
}
