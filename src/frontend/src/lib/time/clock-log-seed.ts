// lib/time/clock-log-seed.ts — per-punch GPS mock for the My Timesheet "Clock Log"
// tab (STA-195). Derives one in + one out punch per WORKED day from the existing
// attendance seed, attaches deterministic GPS coordinates near a fixed work
// location, and flags a fixed handful of out-of-radius warning punches.
//
// MOCK ONLY. Pure + deterministic (no Math.random, no Date.now): the same empId
// always yields the same punches, so SSR + tests are stable. Distances come from
// the SHARED distanceMeters in ./geo — this file never defines its own haversine.

import { getAttendanceForPeriod } from './attendance-seed';
import { GEOFENCE_RADIUS_M, distanceMeters } from './geo';
import { DEMO_TODAY } from './period';

/** A single clock punch with GPS + geofence verdict. */
export type ClockLogEntry = {
  date: string; // 'YYYY-MM-DD'
  type: 'in' | 'out';
  time: string; // 'HH:MM'
  /** Reverse-geocoded place name, or null when the pin fell outside a known place. */
  placeName: string | null;
  lat: number;
  lng: number;
  workLat: number;
  workLng: number;
  distanceM: number; // rounded metres from work location (via shared distanceMeters)
  withinRadius: boolean;
};

// Fixed demo work location (Central World, Bangkok). All punches are placed
// relative to this point so the map modal has a stable centre.
const WORK_LAT = 13.7467;
const WORK_LNG = 100.539;
const WORK_PLACE = 'Central World, Bangkok';

// One metre expressed in degrees near the work latitude (lat is ~constant;
// lng is scaled by cos(lat)). Used to offset a punch by a target metre distance.
const M_PER_DEG_LAT = 111_000;
const M_PER_DEG_LNG = 111_000 * Math.cos((WORK_LAT * Math.PI) / 180);

/** Deterministic 32-bit hash of a string (FNV-1a) — seeds per-punch jitter. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Offset the work location by `meters` along a deterministic bearing derived from
 * `seed`, returning a { lat, lng } near the work point. Diagonal split keeps the
 * measured haversine distance ≈ `meters`.
 */
function offsetPoint(meters: number, seed: number): { lat: number; lng: number } {
  const angle = (seed % 360) * (Math.PI / 180);
  const dNorth = Math.cos(angle) * meters;
  const dEast = Math.sin(angle) * meters;
  return {
    lat: WORK_LAT + dNorth / M_PER_DEG_LAT,
    lng: WORK_LNG + dEast / M_PER_DEG_LNG,
  };
}

/**
 * Deterministic clock log for the current period. Every worked day (a non-day-off
 * day carrying an actual clock-in) yields an in/out pair. A fixed pair of punches
 * is pushed OUT of the geofence (≈380 m / ≈520 m) so the tab always has ≥1
 * warning to demo. Pure — seeded only by empId + date + punch type.
 */
export function getClockLogForPeriod(empId: string): ClockLogEntry[] {
  const days = getAttendanceForPeriod(empId);
  const worked = days.filter((d) => !d.dayOff && !!d.actualIn && d.date <= DEMO_TODAY);

  // Deterministically pick two punches to force out-of-radius (matches the mock's
  // two-warning badge): the 2nd worked day's clock-in and the 4th worked day's
  // clock-out. Falls back to whatever exists so there is always ≥1 warning.
  const warnInDate = worked[1]?.date ?? worked[0]?.date;
  const warnOutDate = worked[3]?.date ?? worked[worked.length - 1]?.date;

  const entries: ClockLogEntry[] = [];
  for (const d of worked) {
    for (const type of ['in', 'out'] as const) {
      const time = type === 'in' ? d.actualIn : d.actualOut;
      if (!time) continue;
      const seed = hash(`${empId}|${d.date}|${type}`);
      const isWarn =
        (type === 'in' && d.date === warnInDate) ||
        (type === 'out' && d.date === warnOutDate);
      const targetM = isWarn ? (type === 'in' ? 380 : 520) : 12 + (seed % 38); // 12..49 m
      const p = offsetPoint(targetM, seed);
      const distanceM = Math.round(distanceMeters(WORK_LAT, WORK_LNG, p.lat, p.lng));
      const withinRadius = distanceM <= GEOFENCE_RADIUS_M;
      entries.push({
        date: d.date,
        type,
        time,
        placeName: withinRadius ? WORK_PLACE : null,
        lat: p.lat,
        lng: p.lng,
        workLat: WORK_LAT,
        workLng: WORK_LNG,
        distanceM,
        withinRadius,
      });
    }
  }
  return entries;
}

/** Count of out-of-radius punches — drives the Clock Log tab's noti-badge. */
export function clockLogWarnCount(entries: ClockLogEntry[]): number {
  return entries.filter((e) => !e.withinRadius).length;
}
