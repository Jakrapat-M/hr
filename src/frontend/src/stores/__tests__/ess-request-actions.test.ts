import { beforeEach, describe, expect, it } from 'vitest';
import { useEssRequestActions } from '../ess-request-actions';

describe('useEssRequestActions', () => {
  beforeEach(() => {
    useEssRequestActions.getState().clear();
  });

  it('records withdrawn and resubmitted overrides by request id', () => {
    useEssRequestActions.getState().withdraw('TR-100');
    expect(useEssRequestActions.getState().actions['TR-100']).toBe('withdrawn');

    useEssRequestActions.getState().resubmit('TR-100');
    expect(useEssRequestActions.getState().actions['TR-100']).toBe('resubmitted');
  });

  it('clears self-service overrides', () => {
    useEssRequestActions.getState().withdraw('TR-200');
    useEssRequestActions.getState().clear();

    expect(useEssRequestActions.getState().actions).toEqual({});
  });
});
