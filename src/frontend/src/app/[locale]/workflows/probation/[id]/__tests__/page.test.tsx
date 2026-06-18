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
    useProbationCase: (id: string) => ({
      ...real.useProbationCase(id),
      submitDecision: mockSubmitDecision,
    }),
  };
});

import ProbationDetailPage from '../page';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

// PB-001 (EMP042): hireDate = '2026-02-19', probationEndDate = '2026-06-18'.
const PROBATION_END = '2026-06-18';
const DATE_BEFORE_END = '2026-06-01'; // <= end → invalid for extend, valid for pass-before-due (and >= hireDate 2026-02-19)
const DATE_AFTER_END = '2026-07-01'; // >  end → valid for extend, invalid for pass-before-due
const DATE_PRE_HIRE = '2026-01-01'; // < hireDate → lower-bound error for pass-before-due

async function renderLoaded(id = 'PB-001', path = `/th/workflows/probation/${id}`) {
  routeId = id;
  routePath = path;
  const view = render(<ProbationDetailPage />);
  await screen.findByText('ประเมินทดลองงาน', undefined, { timeout: 2000 });
  return view;
}

const outcomeCard = (re: RegExp) => screen.getByRole('button', { name: re });
// Normal "pass" card's accessible name includes its unique sub-text "Permanent";
// the pass-before-due card also contains "ผ่านทดลองงาน" so we disambiguate via sub-text.
const passCard = () => outcomeCard(/Permanent/);
const passBeforeDueCard = () => outcomeCard(/ก่อนกำหนด/);

// ------------------------------------------------------------------
// Tests — STA-125 4-card LOV + conditional effective date + free-text fail reason
// ------------------------------------------------------------------

describe('ProbationDetailPage — STA-125 pass-probation feedback', () => {
  beforeEach(() => {
    mockSubmitDecision.mockClear();
  });

  it('renders the 4 outcome cards (pass / pass-before-due / extend / no_pass)', async () => {
    await renderLoaded();
    expect(passCard()).toBeInTheDocument();
    expect(passBeforeDueCard()).toBeInTheDocument();
    expect(outcomeCard(/ขยายเวลา/)).toBeInTheDocument();
    expect(outcomeCard(/ไม่ผ่าน/)).toBeInTheDocument();
  });

  // June BA feedback: attachment + star rating + qualitative trio must NOT render.
  it('does not render attachment, star rating, or qualitative fields', async () => {
    await renderLoaded();
    expect(screen.queryByText(/เอกสารแนบ/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ลากเอกสารมาวาง/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ผลการประเมินเชิงคุณภาพ/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/จุดเด่น/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/จุดที่ต้องพัฒนา/i)).not.toBeInTheDocument();
  });

  it('hides the effective date input on normal pass and normal fail', async () => {
    await renderLoaded();
    // default outcome = pass → no effective date input, no fail reason
    expect(screen.queryByLabelText(/วันที่บรรจุ/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/ขยายถึงวันที่/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i)).not.toBeInTheDocument();

    // normal fail → fail reason shows, but NO effective date input
    fireEvent.click(outcomeCard(/ไม่ผ่าน/));
    expect(screen.getByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/วันที่บรรจุ/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/ขยายถึงวันที่/i)).not.toBeInTheDocument();
  });

  it('pass-before-due: effective date required, earlier-than-due + >= hireDate validation', async () => {
    await renderLoaded();
    fireEvent.click(passBeforeDueCard());
    const dateInput = screen.getByLabelText(/วันที่บรรจุก่อนกำหนด/i);
    expect(dateInput).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /อนุมัติและส่งให้ HR Admin/i });
    // no date yet → disabled
    expect(submitBtn).toBeDisabled();

    // date on/after due → earlier error
    fireEvent.change(dateInput, { target: { value: PROBATION_END } });
    await waitFor(() =>
      expect(screen.getByText(/ต้องเป็นวันก่อนวันครบกำหนดทดลองงาน/i)).toBeInTheDocument(),
    );
    fireEvent.change(dateInput, { target: { value: DATE_AFTER_END } });
    await waitFor(() =>
      expect(screen.getByText(/ต้องเป็นวันก่อนวันครบกำหนดทดลองงาน/i)).toBeInTheDocument(),
    );

    // pre-hire date → lower-bound error
    fireEvent.change(dateInput, { target: { value: DATE_PRE_HIRE } });
    await waitFor(() =>
      expect(screen.getByText(/วันที่บรรจุต้องไม่ก่อนวันเริ่มงาน/i)).toBeInTheDocument(),
    );

    // valid: >= hireDate and < due → error clears, submit enabled
    fireEvent.change(dateInput, { target: { value: DATE_BEFORE_END } });
    await waitFor(() => {
      expect(screen.queryByText(/ต้องเป็นวันก่อนวันครบกำหนดทดลองงาน/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/วันที่บรรจุต้องไม่ก่อนวันเริ่มงาน/i)).not.toBeInTheDocument();
    });
    expect(submitBtn).not.toBeDisabled();
  });

  it('extend: later-than-due validation + "+119 days" hint preserved', async () => {
    await renderLoaded();
    fireEvent.click(outcomeCard(/ขยายเวลา/));
    const dateInput = screen.getByLabelText(/ขยายถึงวันที่/i);
    expect(dateInput).toBeInTheDocument();

    // "+119 days" hint present when valid
    expect(screen.getByText(/ไม่เกินวันเริ่มงาน \+ 119 วัน/i)).toBeInTheDocument();

    // date on/before end → error
    fireEvent.change(dateInput, { target: { value: PROBATION_END } });
    await waitFor(() =>
      expect(screen.getByText(/วันที่ขยายต้องอยู่หลังวันสิ้นสุดทดลองงานปกติ/i)).toBeInTheDocument(),
    );
    fireEvent.change(dateInput, { target: { value: DATE_BEFORE_END } });
    await waitFor(() =>
      expect(screen.getByText(/วันที่ขยายต้องอยู่หลังวันสิ้นสุดทดลองงานปกติ/i)).toBeInTheDocument(),
    );

    // date after end → error clears, hint returns
    fireEvent.change(dateInput, { target: { value: DATE_AFTER_END } });
    await waitFor(() =>
      expect(
        screen.queryByText(/วันที่ขยายต้องอยู่หลังวันสิ้นสุดทดลองงานปกติ/i),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/ไม่เกินวันเริ่มงาน \+ 119 วัน/i)).toBeInTheDocument();
  });

  it('disables submit for no_pass until a free-text fail reason is entered', async () => {
    await renderLoaded();
    fireEvent.click(outcomeCard(/ไม่ผ่าน/));

    const submitBtn = screen.getByRole('button', { name: /ยืนยัน ไม่ผ่านทดลองงาน/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i), {
      target: { value: 'ผลงานไม่ถึงเป้าหมาย' },
    });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
  });

  it('submits pass_normal by default (pass card preselected), no effective date', async () => {
    await renderLoaded();
    const submitBtn = screen.getByRole('button', { name: /อนุมัติและส่งให้ HR Admin/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => expect(mockSubmitDecision).toHaveBeenCalledTimes(1));
    const call = mockSubmitDecision.mock.calls[0][0] as ProbationDecisionInput;
    expect(call.outcome).toBe('pass_normal');
    expect(call.failReasonText).toBeUndefined();
    expect(call.effectiveDate).toBeUndefined();
  });

  it('submits fail_normal with free-text failReasonText + comment', async () => {
    await renderLoaded();
    fireEvent.click(outcomeCard(/ไม่ผ่าน/));
    fireEvent.change(screen.getByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i), {
      target: { value: 'ต้องปรับปรุงพฤติกรรม' },
    });
    fireEvent.change(screen.getByLabelText(/ความคิดเห็นของผู้จัดการ/i), {
      target: { value: 'หัวหน้าเห็นว่ายังไม่พร้อม' },
    });

    fireEvent.click(screen.getByRole('button', { name: /ยืนยัน ไม่ผ่านทดลองงาน/i }));

    await waitFor(() => expect(mockSubmitDecision).toHaveBeenCalledTimes(1));
    const call = mockSubmitDecision.mock.calls[0][0] as ProbationDecisionInput;
    expect(call.outcome).toBe('fail_normal');
    expect(call.failReasonText).toBe('ต้องปรับปรุงพฤติกรรม');
    expect(call.comment).toBe('หัวหน้าเห็นว่ายังไม่พร้อม');
    expect(call.effectiveDate).toBeUndefined();
  });

  it('submits pass_before_due with the chosen earlier-than-due effective date', async () => {
    await renderLoaded();
    fireEvent.click(passBeforeDueCard());
    fireEvent.change(screen.getByLabelText(/วันที่บรรจุก่อนกำหนด/i), {
      target: { value: DATE_BEFORE_END },
    });

    const submitBtn = screen.getByRole('button', { name: /อนุมัติและส่งให้ HR Admin/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => expect(mockSubmitDecision).toHaveBeenCalledTimes(1));
    const call = mockSubmitDecision.mock.calls[0][0] as ProbationDecisionInput;
    expect(call.outcome).toBe('pass_before_due');
    expect(call.effectiveDate).toBe(DATE_BEFORE_END);
    expect(call.failReasonText).toBeUndefined();
  });

  it('clears stale date state when switching from pass-before-due back to normal pass', async () => {
    await renderLoaded();
    fireEvent.click(passBeforeDueCard());
    // enter an INVALID (after-due) date that would block submit if it lingered
    fireEvent.change(screen.getByLabelText(/วันที่บรรจุก่อนกำหนด/i), {
      target: { value: DATE_AFTER_END },
    });
    await waitFor(() =>
      expect(screen.getByText(/ต้องเป็นวันก่อนวันครบกำหนดทดลองงาน/i)).toBeInTheDocument(),
    );

    // switch back to normal pass → effective input gone, submit enabled (stale date cleared)
    fireEvent.click(passCard());
    expect(screen.queryByLabelText(/วันที่บรรจุก่อนกำหนด/i)).not.toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /อนุมัติและส่งให้ HR Admin/i });
    expect(submitBtn).not.toBeDisabled();

    // re-select pass-before-due → the previously typed date must NOT persist
    fireEvent.click(passBeforeDueCard());
    expect(screen.getByLabelText(/วันที่บรรจุก่อนกำหนด/i)).toHaveValue('');
  });
});
