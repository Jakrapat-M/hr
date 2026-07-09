/**
 * STA-260 — OtScheduleModal: mandatory x1…x3 rate-type gating, overlap guard
 * wired to the inline pumpkin error, valid save payload, and edit-mode prefill.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { OtScheduleModal } from '../OtScheduleModal';
import type { BlockedWindow } from '@/lib/time/roster-ot';

const SHIFT: BlockedWindow = { start: '10:00', end: '19:00', labelTh: 'กะทำงาน', labelEn: 'shift' };

function renderModal(over: Partial<React.ComponentProps<typeof OtScheduleModal>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <OtScheduleModal
      open
      isTh={false}
      employeeName="พิมพ์ชนก ศรีวัฒน์"
      date="2026-06-04"
      blocked={[SHIFT]}
      onClose={onClose}
      onSave={onSave}
      {...over}
    />,
  );
  return { onSave, onClose };
}

afterEach(() => cleanup());

describe('OtScheduleModal — STA-260', () => {
  it('cannot save without choosing an OT type (x1…x3)', () => {
    const { onSave } = renderModal();
    fireEvent.change(screen.getByTestId('ot-start-input'), { target: { value: '19:00' } });
    fireEvent.change(screen.getByTestId('ot-end-input'), { target: { value: '21:00' } });
    fireEvent.click(screen.getByTestId('ot-schedule-save'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('ot-schedule-error').textContent).toMatch(/OT type/);
  });

  it('rejects a window overlapping the shift with an inline error', () => {
    const { onSave } = renderModal();
    fireEvent.click(screen.getByTestId('ot-rate-x1.5'));
    fireEvent.change(screen.getByTestId('ot-start-input'), { target: { value: '18:00' } });
    fireEvent.change(screen.getByTestId('ot-end-input'), { target: { value: '20:00' } });
    fireEvent.click(screen.getByTestId('ot-schedule-save'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('ot-schedule-error').textContent).toMatch(/shift \(10:00–19:00\)/);
  });

  it('saves a valid window with the chosen rate type + computed hours', () => {
    const { onSave } = renderModal();
    fireEvent.click(screen.getByTestId('ot-rate-x2'));
    fireEvent.change(screen.getByTestId('ot-start-input'), { target: { value: '19:00' } });
    fireEvent.change(screen.getByTestId('ot-end-input'), { target: { value: '21:30' } });
    fireEvent.click(screen.getByTestId('ot-schedule-save'));
    expect(onSave).toHaveBeenCalledWith({ start: '19:00', end: '21:30', rateType: 'x2', hours: 2.5 });
  });

  it('edit mode prefills times + rate type from the existing OT', () => {
    renderModal({
      existing: { id: 'OT-1', start: '19:00', end: '21:00', rateType: 'x3' },
    });
    expect((screen.getByTestId('ot-start-input') as HTMLInputElement).value).toBe('19:00');
    expect((screen.getByTestId('ot-end-input') as HTMLInputElement).value).toBe('21:00');
    expect(screen.getByTestId('ot-rate-x3')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Save changes')).toBeInTheDocument();
  });
});
