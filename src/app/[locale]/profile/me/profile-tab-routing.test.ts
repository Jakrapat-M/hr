/**
 * D2 — `/profile/me?tab=compensation` deep-link routing.
 *
 * The compensation cards (CompensationSummary + CompensationHistory) render
 * inside the `job` panel. A `?tab=compensation` deep-link previously resolved
 * to the `compensation` slice → SLICE_TO_PANEL.compensation === 'emergency' →
 * the EMERGENCY panel (wrong). The fix maps inbound `?tab=compensation` to the
 * `employment` slice → the `job` panel that actually renders comp.
 *
 * This test pins the inbound trace AND the outbound query map so a future
 * "cleanup" can't silently re-break the emergency deep-link.
 */

import { describe, expect, test } from 'vitest';

import {
  PROFILE_TAB_FROM_QUERY,
  PROFILE_TAB_QUERY,
  SLICE_TO_PANEL,
  resolveProfileTab,
} from './page';

function searchParams(tab: string): Pick<URLSearchParams, 'get'> {
  return new URLSearchParams(`tab=${tab}`);
}

describe('D2 — compensation deep-link routes to the job/compensation panel', () => {
  test('?tab=compensation resolves to the job panel (where CompensationSummary/History render)', () => {
    const slice = resolveProfileTab(searchParams('compensation'));
    expect(slice).toBe('employment');
    // employment slice → job panel → CompensationSummary + CompensationHistory
    expect(SLICE_TO_PANEL[slice]).toBe('job');
  });

  test('?tab=employment also resolves to the same job/compensation panel', () => {
    const slice = resolveProfileTab(searchParams('employment'));
    expect(slice).toBe('employment');
    expect(SLICE_TO_PANEL[slice]).toBe('job');
  });

  test('?tab=emergency still resolves to the emergency panel (unchanged)', () => {
    const slice = resolveProfileTab(searchParams('emergency'));
    expect(slice).toBe('compensation');
    expect(SLICE_TO_PANEL[slice]).toBe('emergency');
  });
});

describe('D2 — outbound query map pinned so the emergency deep-link cannot silently re-break', () => {
  test('in-app compensation-tab click keeps emitting ?tab=emergency', () => {
    // The asymmetry is intentional: clicking the comp/emergency tab emits
    // `?tab=emergency`, which round-trips back to the emergency panel.
    expect(PROFILE_TAB_QUERY.compensation).toBe('emergency');
    expect(PROFILE_TAB_QUERY.employment).toBe('employment');
  });

  test('inbound map entries pinned (compensation → employment, emergency → compensation)', () => {
    expect(PROFILE_TAB_FROM_QUERY.compensation).toBe('employment');
    expect(PROFILE_TAB_FROM_QUERY.emergency).toBe('compensation');
  });
});
