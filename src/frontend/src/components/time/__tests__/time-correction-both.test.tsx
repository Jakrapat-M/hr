/**
 * time-correction-both.test.tsx — STA-171 dual clock-in/out correction (`both`).
 *
 * Covers: the pure `both` validator (both-required + Out > In), the store-level
 * mirror/projection coherence (findCorrectionConflict keys on the clock-in mirror;
 * latestCorrectionForDate projects the dual fields), the form's `both` dual capture
 * + submit mirror, and that single-side in/out stays byte-identical.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../../messages/en.json';
import { TimeCorrectionForm, validateBothCorrectionTimes } from '../TimeCorrectionForm';
import {
  useTimeCorrections,
  latestCorrectionForDate,
  findCorrectionConflict,
  materializeCorrectionDays,
  type TimeCorrectionRequest,
} from '@/stores/time-corrections';
import { useAuthStore } from '@/stores/auth-store';

// A clocking employee id (passes the non-clocking gate) + a date inside the current
// (unlocked) payroll period so isTimesheetLocked stays false.
const CLOCKING_EMP = 'emp-001';
const UNLOCKED_DATE = '2026-06-25';

function req(p: Partial<TimeCorrectionRequest>): TimeCorrectionRequest {
  return {
    id: p.id ?? 'TCR-1',
    employeeId: 'emp-001',
    employeeName: 'Emp',
    department: 'Team',
    date: p.date ?? '2026-06-01',
    correctionType: p.correctionType ?? 'in',
    reasonCode: 'R',
    payCode: 'R',
    correctedTime: p.correctedTime ?? '08:00',
    reason: 'fix',
    status: p.status ?? 'pending_manager',
    submittedAt: '2026-06-01T09:00:00.000Z',
    audit: [],
    ...p,
  };
}

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <TimeCorrectionForm subjectEmpId={CLOCKING_EMP} subjectName="Test Emp" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useTimeCorrections.getState().clear();
  useAuthStore.setState({
    username: 'Test Emp',
    isAuthenticated: true,
    _hasHydrated: true,
  } as Parameters<typeof useAuthStore.setState>[0]);
});

describe('validateBothCorrectionTimes — pure validator', () => {
  it('flags a missing corrected clock-out (both required)', () => {
    expect(validateBothCorrectionTimes('09:35', '', false)).not.toBeNull();
  });
  it('flags a missing corrected clock-in (both required)', () => {
    expect(validateBothCorrectionTimes('', '18:30', false)).not.toBeNull();
  });
  it('rejects clock-out equal to clock-in (Out > In, strict)', () => {
    expect(validateBothCorrectionTimes('09:35', '09:35', false)).not.toBeNull();
  });
  it('rejects clock-out earlier than clock-in', () => {
    expect(validateBothCorrectionTimes('18:30', '09:35', false)).not.toBeNull();
  });
  it('accepts a valid pair (Out later than In)', () => {
    expect(validateBothCorrectionTimes('09:35', '18:30', false)).toBeNull();
  });
  it('returns Thai copy when isTh', () => {
    const msg = validateBothCorrectionTimes('09:35', '09:35', true);
    expect(msg).toMatch(/[ก-๙]/);
  });
});

describe('store coherence — mirror + projection for `both`', () => {
  it('findCorrectionConflict fires on the clock-in mirror (correctedTime = correctedClockIn)', () => {
    // A stored `both` request mirrors correctedTime onto the clock-in half (09:35).
    const stored = materializeCorrectionDays(
      req({
        date: '2026-06-04',
        correctionType: 'both',
        correctedTime: '09:35',
        originalClockIn: '10:00',
        correctedClockIn: '09:35',
        originalClockOut: '18:00',
        correctedClockOut: '18:30',
      }),
    );
    // Another correction on the same date + same clock value clashes via the mirror.
    expect(
      findCorrectionConflict(
        { date: '2026-06-04', correctionType: 'in', correctedTime: '09:35' },
        stored,
      ),
    ).toBe('time_clash');
  });

  it('latestCorrectionForDate projects the dual fields for a `both` days[] entry', () => {
    const projected = latestCorrectionForDate(
      [
        req({
          date: '2026-06-01',
          correctionType: 'in',
          correctedTime: '08:00',
          days: [
            {
              date: '2026-06-04',
              correctionType: 'both',
              reasonCode: 'R',
              originalTime: '10:00',
              correctedTime: '09:35',
              originalClockIn: '10:00',
              correctedClockIn: '09:35',
              originalClockOut: '18:00',
              correctedClockOut: '18:30',
              reason: 'x',
            },
          ],
        }),
      ],
      'emp-001',
      '2026-06-04',
    );
    expect(projected?.correctionType).toBe('both');
    expect(projected?.correctedClockIn).toBe('09:35');
    expect(projected?.correctedClockOut).toBe('18:30');
  });

  it('in/out request materializes with no dual fields (byte-identical)', () => {
    const days = materializeCorrectionDays(
      req({ date: '2026-06-01', correctionType: 'in', correctedTime: '08:00' }),
    );
    expect(days).toEqual([{ date: '2026-06-01', correctionType: 'in', correctedTime: '08:00' }]);
  });
});

describe('TimeCorrectionForm — `both` dual capture + submit mirror', () => {
  function fillCommon(container: HTMLElement) {
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: UNLOCKED_DATE } });
    const typeSelect = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'both' } });
    const note = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: 'Forgot to tap in and out' } });
  }

  function correctedInputs(container: HTMLElement): HTMLInputElement[] {
    // Order: [originalClockIn(disabled), correctedClockIn, originalClockOut(disabled), correctedClockOut]
    const times = Array.from(
      container.querySelectorAll('input[type="time"]'),
    ) as HTMLInputElement[];
    return [times[1], times[3]];
  }

  it('valid `both` submit populates the 4 dual fields + mirror', () => {
    const { container } = renderForm();
    fillCommon(container);
    const [inEl, outEl] = correctedInputs(container);
    fireEvent.change(inEl, { target: { value: '09:35' } });
    fireEvent.change(outEl, { target: { value: '18:30' } });

    const submit = screen.getByRole('button', { name: /submit request/i });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);

    const stored = useTimeCorrections.getState().requests;
    expect(stored).toHaveLength(1);
    const r = stored[0];
    expect(r.correctionType).toBe('both');
    expect(r.correctedClockIn).toBe('09:35');
    expect(r.correctedClockOut).toBe('18:30');
    // Mirror = clock-in anchor.
    expect(r.correctedTime).toBe('09:35');
  });

  it('blocks submit when only one corrected time is entered', () => {
    const { container } = renderForm();
    fillCommon(container);
    const [inEl] = correctedInputs(container);
    fireEvent.change(inEl, { target: { value: '09:35' } });
    // Clock-out left blank → not fully filled → submit stays disabled.
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
    expect(useTimeCorrections.getState().requests).toHaveLength(0);
  });

  it('blocks submit when corrected clock-out is not later than clock-in', () => {
    const { container } = renderForm();
    fillCommon(container);
    const [inEl, outEl] = correctedInputs(container);
    fireEvent.change(inEl, { target: { value: '18:30' } });
    fireEvent.change(outEl, { target: { value: '09:35' } });
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
    expect(useTimeCorrections.getState().requests).toHaveLength(0);
  });
});
