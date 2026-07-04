import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// clock-punches — mobile clock-in/out mock. Each tap records a punch (in/out)
// for the current employee + day, persisted to localStorage. Drives the
// /time/clock widget's today-status + punch list.
//
// State machine (mockup, pure + testable): before clock-in → only Clock In;
// after Clock In → only Clock Out; after Clock Out → Clock In again. Multiple
// in/out pairs per day are allowed; never two Clock-Ins in a row, never a
// Clock Out before a Clock In. A geofence result (simulated) may ride along on
// a punch via the optional `geo` field.

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

/**
 * Whether recording `type` next is legal given the day's punches. Rejects two
 * Clock-Ins in a row and a Clock Out before any Clock In. Pure → testable.
 */
export function assertLegalPunch(
  dayPunches: ClockPunch[],
  type: PunchType,
): boolean {
  const last = lastPunchType(dayPunches);
  if (type === 'in') return last === null || last === 'out';
  // type === 'out'
  return last === 'in';
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
      name: 'humi-clock-punches',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
