// lib/time/geofence-sim.ts — SIMULATED geofence source for /time/clock.
//
// Mockup only: no navigator.geolocation, no network, no reverse-geocode. A
// demo selector (within | outside | disabled) drives which of the 3 clock
// cases fires. Distances are derived from fixed mock coordinates via the shared
// `distanceMeters` / `GEOFENCE_RADIUS_M` in ./geo — never redefine those here.

import { GEOFENCE_RADIUS_M, distanceMeters } from './geo';

export type GeoResult = 'within' | 'outside' | 'disabled';

export interface GeofenceEvaluation {
  result: GeoResult;
  /** Simulated distance from the work location in metres; null when disabled. */
  distanceM: number | null;
  /** True only when a concrete distance is inside GEOFENCE_RADIUS_M. */
  withinRadius: boolean;
}

// Fixed mock work location + two mock device positions (one inside, one well
// outside the radius). Real coords would come from the device; here they are
// constants so the simulated distance stays consistent with GEOFENCE_RADIUS_M.
const WORK_LAT = 13.7466;
const WORK_LNG = 100.5347;
// ~32 m north-east of the work point (inside the 200 m radius).
const NEAR_LAT = 13.74679;
const NEAR_LNG = 100.53489;
// ~380 m away (outside the 200 m radius).
const FAR_LAT = 13.74998;
const FAR_LNG = 100.53699;

/**
 * Map a simulated geofence selection to a concrete evaluation. `within` and
 * `outside` derive their distance from the shared haversine so the withinRadius
 * flag always agrees with GEOFENCE_RADIUS_M; `disabled` yields no distance.
 */
export function evaluateGeofence(sim: GeoResult): GeofenceEvaluation {
  if (sim === 'disabled') {
    return { result: 'disabled', distanceM: null, withinRadius: false };
  }
  const [lat, lng] = sim === 'within' ? [NEAR_LAT, NEAR_LNG] : [FAR_LAT, FAR_LNG];
  const distanceM = Math.round(distanceMeters(WORK_LAT, WORK_LNG, lat, lng));
  return {
    result: sim,
    distanceM,
    withinRadius: distanceM <= GEOFENCE_RADIUS_M,
  };
}

/**
 * Deterministic default geofence selection. Always 'within' — no Math.random,
 * so renders and tests are stable. The gated demo selector can flip it.
 */
export function defaultGeoSim(): GeoResult {
  return 'within';
}
