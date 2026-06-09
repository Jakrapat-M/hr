import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// clock-punches — mobile clock-in/out mock. Each tap records a punch (in/out)
// for the current employee + day, persisted to localStorage. Drives the
// /time/clock widget's today-status + punch list. Mockup: no backend, no
// geofence; one IN + one OUT per day is the simple model.

export type PunchType = 'in' | 'out';

export type ClockPunch = {
  id: string;
  empId: string;
  type: PunchType;
  /** ISO timestamp of the punch. */
  at: string;
  /** Local calendar day key YYYY-MM-DD (so a day groups its punches). */
  dateKey: string;
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

/** What the next tap should record: 'in' → 'out' → 'done' (already clocked out). */
export function nextPunchType(dayPunches: ClockPunch[]): PunchType | 'done' {
  const hasIn = dayPunches.some((p) => p.type === 'in');
  const hasOut = dayPunches.some((p) => p.type === 'out');
  if (!hasIn) return 'in';
  if (!hasOut) return 'out';
  return 'done';
}

interface ClockPunchesState {
  punches: ClockPunch[];
  /** Record a punch for an employee; returns the created punch. */
  punch: (empId: string, type: PunchType) => ClockPunch;
  clear: () => void;
}

function generatePunchId(): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PCH-${ts}-${rand}`;
}

export const useClockPunches = create<ClockPunchesState>()(
  persist(
    (set) => ({
      punches: [],
      punch: (empId, type) => {
        const now = new Date();
        const p: ClockPunch = {
          id: generatePunchId(),
          empId,
          type,
          at: now.toISOString(),
          dateKey: localDateKey(now),
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
