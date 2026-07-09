// STA-195 — shared geo module (single owner of the geofence radius + haversine).

import { describe, it, expect } from 'vitest';
import { GEOFENCE_RADIUS_M, distanceMeters } from '../geo';

describe('geo', () => {
  it('geofence radius is 200 m', () => {
    expect(GEOFENCE_RADIUS_M).toBe(200);
  });

  it('identical points → 0', () => {
    expect(distanceMeters(13.7467, 100.539, 13.7467, 100.539)).toBe(0);
  });

  it('~111 m per 0.001° of latitude', () => {
    const d = distanceMeters(0, 0, 0.001, 0);
    expect(d).toBeGreaterThan(108);
    expect(d).toBeLessThan(114);
  });

  it('sane, symmetric metric distance for the mock warning coords', () => {
    const d = distanceMeters(13.7467, 100.539, 13.7511, 100.5388);
    expect(d).toBeGreaterThan(400);
    expect(d).toBeLessThan(700);
    expect(distanceMeters(13.7511, 100.5388, 13.7467, 100.539)).toBeCloseTo(d, 6);
  });
});
