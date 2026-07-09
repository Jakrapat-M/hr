import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// clock-punches — mobile clock-in/out mock. Each tap records a punch (in/out)
// for the current employee + day, persisted to localStorage. Drives the
// /time/clock widget's today-status + punch list.
//
// State machine (mockup, pure + testable — STA-251 Draft 2): two separate
// buttons. Clock Out is legal only while an unmatched Clock In exists (out
// right after in is fine). Clock In is legal on an empty day, after an out,
// or ≥ 2 h after the previous in (cooldown — re-clock-in for a forgotten out
// / new shift). Multiple in/out pairs per day are allowed. A geofence result
// (simulated) may ride along on a punch via the optional `geo` field.

export type PunchType = 'in' | 'out';

/** Simulated geofence outcome recorded with a punch (mockup — no real GPS). */
export type PunchGeo = {
  /** Whether the punch was inside the geofence radius. */
  withinRadius: boolean;
  /** Simulated distance from the work location, in metres. */
  distanceM: number;
  /** In-memory stand-in for a supervisor notification (set on outside punches). */
  notifiedSupervisor: boolean;
};

export type ClockPunch = {
  id: string;
  empId: string;
  type: PunchType;
  /** ISO timestamp of the punch. */
  at: string;
  /** Local calendar day key YYYY-MM-DD (so a day groups its punches). */
  dateKey: string;
  /** Simulated geofence context, present when a punch carried a geo result. */
  geo?: PunchGeo;
};

/** Local YYYY-MM-DD for a Date (not UTC — punches are wall-clock local). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Punches for one employee + day, oldest first. Pure → unit-testable. */
export function punchesForDay(
  punches: ClockPunch[],
  empId: string,
  dateKey: string,
): ClockPunch[] {
  return punches
    .filter((p) => p.empId === empId && p.dateKey === dateKey)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * The type of the most recent punch of the day, or null when the day is empty.
 * Assumes `dayPunches` is oldest-first (as returned by punchesForDay); falls
 * back to sorting defensively so callers can pass any order.
 */
export function lastPunchType(dayPunches: ClockPunch[]): PunchType | null {
  if (dayPunches.length === 0) return null;
  const sorted = [...dayPunches].sort((a, b) => a.at.localeCompare(b.at));
  return sorted[sorted.length - 1].type;
}

/**
 * What the next tap should record. Empty day or last punch = 'out' → 'in';
 * last punch = 'in' → 'out'. Multiple pairs/day are allowed, so this never
 * returns a terminal 'done' state.
 */
export function nextPunchType(dayPunches: ClockPunch[]): PunchType {
  return lastPunchType(dayPunches) === 'in' ? 'out' : 'in';
}

/** STA-251 rule 2b: a Clock In locks the Clock In button for 2 hours. */
export const CLOCK_IN_COOLDOWN_MS = 2 * 60 * 60 * 1000;

/** ISO timestamp of the day's most recent `in` punch, or null. */
function lastInAt(dayPunches: ClockPunch[]): string | null {
  const ins = dayPunches
    .filter((p) => p.type === 'in')
    .sort((a, b) => a.at.localeCompare(b.at));
  return ins.length ? ins[ins.length - 1].at : null;
}

/**
 * Whether recording `type` next is legal given the day's punches. A Clock Out
 * needs an unmatched Clock In; a repeat Clock In is legal only once the 2-hour
 * cooldown since the previous Clock In has elapsed. Pure → testable.
 */
export function assertLegalPunch(
  dayPunches: ClockPunch[],
  type: PunchType,
  nowMs: number = Date.now(),
): boolean {
  const last = lastPunchType(dayPunches);
  if (type === 'in') {
    if (last === null || last === 'out') return true;
    // last === 'in' — re-clock-in allowed after the cooldown (rule 2b).
    const at = lastInAt(dayPunches);
    return at !== null && nowMs - new Date(at).getTime() >= CLOCK_IN_COOLDOWN_MS;
  }
  // type === 'out'
  return last === 'in';
}

/** Per-button enable state + disable reason for the dual-button UI (STA-251). */
export interface ClockButtonState {
  canIn: boolean;
  canOut: boolean;
  /** Why Clock In is disabled ('cooldown') — null when enabled. */
  inReason: 'cooldown' | null;
  /** Why Clock Out is disabled ('needsIn') — null when enabled. */
  outReason: 'needsIn' | null;
}

/**
 * Derives the STA-251 state matrix from the day's punches at `nowMs`:
 * empty day → in only; within 2 h of an in → out only; ≥ 2 h after an in
 * (still not out) → both; after an out → in only.
 */
export function clockButtonState(
  dayPunches: ClockPunch[],
  nowMs: number = Date.now(),
): ClockButtonState {
  const canIn = assertLegalPunch(dayPunches, 'in', nowMs);
  const canOut = assertLegalPunch(dayPunches, 'out', nowMs);
  return {
    canIn,
    canOut,
    inReason: canIn ? null : 'cooldown',
    outReason: canOut ? null : 'needsIn',
  };
}

interface ClockPunchesState {
  punches: ClockPunch[];
  /**
   * Record a punch for an employee. Returns the created punch, or `null` when
   * the transition is illegal (guard against a corrupt sequence).
   */
  punch: (empId: string, type: PunchType, geo?: PunchGeo) => ClockPunch | null;
  clear: () => void;
}

function generatePunchId(): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PCH-${ts}-${rand}`;
}

export const useClockPunches = create<ClockPunchesState>()(
  persist(
    (set, get) => ({
      punches: [],
      punch: (empId, type, geo) => {
        const now = new Date();
        const dateKey = localDateKey(now);
        // Guard: reject illegal transitions so the UI can't corrupt the day's
        // sequence (double-tap, stale persisted punches, etc.).
        const dayPunches = punchesForDay(get().punches, empId, dateKey);
        if (!assertLegalPunch(dayPunches, type)) return null;
        const p: ClockPunch = {
          id: generatePunchId(),
          empId,
          type,
          at: now.toISOString(),
          dateKey,
          ...(geo ? { geo } : {}),
        };
        set((state) => ({ punches: [p, ...state.punches] }));
        return p;
      },
      clear: () => set({ punches: [] }),
    }),
    {
      name: 'cnext-clock-punches',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
