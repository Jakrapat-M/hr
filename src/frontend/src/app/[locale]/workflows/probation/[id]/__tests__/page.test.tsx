import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ProbationDecisionInput } from '@/hooks/use-probation';

// ------------------------------------------------------------------
// Navigation mocks
// ------------------------------------------------------------------

let routeId = 'PB-001';
let routePath = '/th/workflows/probation/PB-001';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: routeId }),
  usePathname: () => routePath,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// ------------------------------------------------------------------
// Hook mock — exposes a spy for submitDecision
// ------------------------------------------------------------------

const mockSubmitDecision = vi.fn();

vi.mock('@/hooks/use-probation', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/hooks/use-probation')>();
  return {
    ...real,
    useProbationCase: (id: string) => {
      const result = real.useProbationCase(id);
      return {
        ...result,
        submitDecision: mockSubmitDecision,
      };
    },
  };
});

import ProbationDetailPage from '../page';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

// probationEndDate for PB-001 = '2026-04-09'
const PROBATION_END = '2026-04-09';
const DATE_BEFORE_END = '2026-03-01'; // clearly before 2026-04-09
const DATE_AFTER_END  = '2026-05-01'; // clearly after  2026-04-09

async function renderLoaded(id = 'PB-001', path = `/th/workflows/probation/${id}`) {
  routeId = id;
  routePath = path;
  const view = render(<ProbationDetailPage />);
  // Page title is always present in Thai for PB-001
  await screen.findByText('ประเมินทดลองงาน', undefined, { timeout: 2000 });
  return view;
}

function getOutcomeSelect() {
  // aria-label set to Thai label in th locale
  return screen.getByRole('combobox', { name: /ผลการทดลองงาน/i });
}

function selectOutcome(value: string) {
  fireEvent.change(getOutcomeSelect(), { target: { value } });
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('ProbationDetailPage — STA-23 PO v2 Manager Approve', () => {
  beforeEach(() => {
    mockSubmitDecision.mockClear();
  });

  // Test 1: outcome dropdown renders with all 5 options
  it('renders Final Probation Result dropdown with all 5 options', async () => {
    await renderLoaded();

    const select = getOutcomeSelect();
    expect(select).toBeInTheDocument();

    // Placeholder + 5 outcome options = 6 <option> elements
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(6);

    // Check each option value exists
    const values = Array.from(options).map((o) => (o as HTMLOptionElement).value);
    expect(values).toContain('pass_normal');
    expect(values).toContain('fail_normal');
    expect(values).toContain('pass_before_due');
    expect(values).toContain('fail_before_due');
    expect(values).toContain('extend');
  });

  // June feedback: fields not in list must not render on manager approve view.
  it('does not render attachment upload controls or copy', async () => {
    await renderLoaded();

    expect(screen.queryByText('เอกสารแนบ')).not.toBeInTheDocument();
    expect(screen.queryByText(/ลากเอกสารมาวาง/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/เลือกไฟล์/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('เลือกไฟล์เอกสารแนบ')).not.toBeInTheDocument();
  });

  // Test 2: Effective Date NOT in DOM for pass_normal
  it('does NOT render Effective Date when outcome is pass_normal', async () => {
    await renderLoaded();

    selectOutcome('pass_normal');

    expect(screen.queryByLabelText(/วันที่มีผล/i)).not.toBeInTheDocument();
  });

  // Test 3: Effective Date IS in DOM for the 3 special cases
  it('renders Effective Date when outcome is pass_before_due, fail_before_due, or extend', async () => {
    await renderLoaded();

    selectOutcome('pass_before_due');
    expect(screen.getByLabelText(/วันที่มีผล/i)).toBeInTheDocument();

    selectOutcome('fail_before_due');
    expect(screen.getByLabelText(/วันที่มีผล/i)).toBeInTheDocument();

    selectOutcome('extend');
    expect(screen.getByLabelText(/วันที่มีผล/i)).toBeInTheDocument();
  });

  // Test 4: Effective Date validation — pass_before_due must be BEFORE probationEndDate
  it('shows error for pass_before_due with date >= probationEndDate; clears error for date < probationEndDate', async () => {
    await renderLoaded();

    selectOutcome('pass_before_due');
    const dateInput = screen.getByLabelText(/วันที่มีผล/i);

    // Set a date ON or AFTER probationEndDate (should show error)
    fireEvent.change(dateInput, { target: { value: PROBATION_END } });
    await waitFor(() => {
      expect(
        screen.getByText(/วันที่มีผลต้องอยู่ก่อนวันสิ้นสุดทดลองงานปกติ/i),
      ).toBeInTheDocument();
    });

    // Set a date clearly BEFORE probationEndDate (error should disappear)
    fireEvent.change(dateInput, { target: { value: DATE_BEFORE_END } });
    await waitFor(() => {
      expect(
        screen.queryByText(/วันที่มีผลต้องอยู่ก่อนวันสิ้นสุดทดลองงานปกติ/i),
      ).not.toBeInTheDocument();
    });
  });

  // Test 5: Effective Date validation — extend must be AFTER probationEndDate
  it('shows error for extend with date <= probationEndDate; clears error for date > probationEndDate', async () => {
    await renderLoaded();

    selectOutcome('extend');
    const dateInput = screen.getByLabelText(/วันที่มีผล/i);

    // Set a date ON or BEFORE probationEndDate (should show error)
    fireEvent.change(dateInput, { target: { value: PROBATION_END } });
    await waitFor(() => {
      expect(
        screen.getByText(/วันที่มีผลต้องอยู่หลังวันสิ้นสุดทดลองงานปกติ/i),
      ).toBeInTheDocument();
    });

    // Set a date clearly AFTER probationEndDate (error should disappear)
    fireEvent.change(dateInput, { target: { value: DATE_AFTER_END } });
    await waitFor(() => {
      expect(
        screen.queryByText(/วันที่มีผลต้องอยู่หลังวันสิ้นสุดทดลองงานปกติ/i),
      ).not.toBeInTheDocument();
    });
  });

  // Test 6: Reason for Fail NOT in DOM for non-fail_normal outcomes
  it('does NOT render Reason for Fail when outcome is not fail_normal', async () => {
    await renderLoaded();

    for (const v of ['pass_normal', 'pass_before_due', 'fail_before_due', 'extend']) {
      selectOutcome(v);
      expect(screen.queryByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i)).not.toBeInTheDocument();
    }
  });

  // Test 7: Reason for Fail IS in DOM when outcome = fail_normal
  it('renders Reason for Fail Probation dropdown when outcome is fail_normal', async () => {
    await renderLoaded();

    selectOutcome('fail_normal');
    expect(screen.getByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i)).toBeInTheDocument();
  });

  // Test 8: Submit button disabled when no outcome; enabled when required fields filled
  it('disables submit when outcome is empty and enables it when required fields are filled', async () => {
    await renderLoaded();

    const submitBtn = screen.getByRole('button', {
      name: /ส่งผลทดลองงานไปยัง HRBP/i,
    });

    // No outcome selected — should be disabled
    expect(submitBtn).toBeDisabled();

    // Select pass_normal — no additional fields required — should enable
    selectOutcome('pass_normal');
    await waitFor(() => expect(submitBtn).not.toBeDisabled());

    // Switch to fail_normal — requires failReason — should disable again
    selectOutcome('fail_normal');
    await waitFor(() => expect(submitBtn).toBeDisabled());

    // Fill fail reason — should enable
    fireEvent.change(screen.getByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i), {
      target: { value: 'performance' },
    });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
  });

  // Test 9: Submit calls submitDecision with correct payload shape
  it('calls submitDecision with correct payload on submit', async () => {
    await renderLoaded();

    // Pick fail_normal outcome
    selectOutcome('fail_normal');

    // Select a fail reason
    const reasonSelect = screen.getByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i);
    fireEvent.change(reasonSelect, { target: { value: 'attitude' } });

    // Add comment
    const commentArea = screen.getByLabelText(/ความคิดเห็นของผู้จัดการ/i);
    fireEvent.change(commentArea, { target: { value: 'ต้องปรับปรุงพฤติกรรม' } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /ส่งผลทดลองงานไปยัง HRBP/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmitDecision).toHaveBeenCalledTimes(1);
    });

    const call = mockSubmitDecision.mock.calls[0][0] as ProbationDecisionInput;
    expect(call.outcome).toBe('fail_normal');
    expect(call.failReason).toBe('attitude');
    expect(call.comment).toBe('ต้องปรับปรุงพฤติกรรม');
    // effectiveDate should be absent for fail_normal
    expect(call.effectiveDate).toBeUndefined();
  });
});
