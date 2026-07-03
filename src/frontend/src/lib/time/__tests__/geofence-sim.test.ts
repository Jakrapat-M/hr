import { describe, it, expect } from 'vitest';
import { evaluateGeofence, defaultGeoSim } from '../geofence-sim';
import { GEOFENCE_RADIUS_M, distanceMeters } from '../geo';

describe('evaluateGeofence — maps each GeoResult via the shared geo module', () => {
  it('within → concrete distance inside the shared radius, withinRadius true', () => {
    const e = evaluateGeofence('within');
    expect(e.result).toBe('within');
    expect(e.distanceM).not.toBeNull();
    expect(e.distanceM as number).toBeLessThanOrEqual(GEOFENCE_RADIUS_M);
    expect(e.withinRadius).toBe(true);
  });

  it('outside → concrete distance beyond the shared radius, withinRadius false', () => {
    const e = evaluateGeofence('outside');
    expect(e.result).toBe('outside');
    expect(e.distanceM as number).toBeGreaterThan(GEOFENCE_RADIUS_M);
    expect(e.withinRadius).toBe(false);
  });

  it('disabled → no distance, withinRadius false', () => {
    const e = evaluateGeofence('disabled');
    expect(e.result).toBe('disabled');
    expect(e.distanceM).toBeNull();
    expect(e.withinRadius).toBe(false);
  });
});

describe('shared geo module (single source)', () => {
  it('GEOFENCE_RADIUS_M is 200', () => {
    expect(GEOFENCE_RADIUS_M).toBe(200);
  });
  it('distanceMeters is 0 for identical points and positive otherwise', () => {
    expect(distanceMeters(13.7466, 100.5347, 13.7466, 100.5347)).toBe(0);
    expect(distanceMeters(13.7466, 100.5347, 13.75, 100.54)).toBeGreaterThan(0);
  });
});

describe('defaultGeoSim — deterministic', () => {
  it('always returns "within" (no randomness)', () => {
    expect(defaultGeoSim()).toBe('within');
    expect(defaultGeoSim()).toBe('within');
    expect(defaultGeoSim()).toBe('within');
  });
});
