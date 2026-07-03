// lib/time/geo.ts — SHARED geo-owner (STA-195 creates it; STA-169 imports it).
//
// The single source of truth for the attendance geofence radius and the
// point-to-point distance used by clock-log / geofence surfaces. Never redefine
// GEOFENCE_RADIUS_M or the haversine anywhere else — import from here.
//
// MOCK ONLY: pure math, no network, no geolocation API.

/** Attendance geofence radius, in metres. A punch beyond this is "out of radius". */
export const GEOFENCE_RADIUS_M = 200;

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle (haversine) distance in metres between two lat/lng points.
 * Returns 0 for identical points; symmetric; deterministic (pure).
 */
export function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
