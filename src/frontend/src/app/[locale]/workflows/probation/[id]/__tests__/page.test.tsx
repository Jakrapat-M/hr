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

// probationEndDate for PB-001 = '2026-04-09'
const PROBATION_END = '2026-04-09';
const DATE_BEFORE_END = '2026-03-01'; // <= end → invalid for extend
const DATE_AFTER_END = '2026-05-01'; // >  end → valid for extend

async function renderLoaded(id = 'PB-001', path = `/th/workflows/probation/${id}`) {
  routeId = id;
  routePath = path;
  const view = render(<ProbationDetailPage />);
  await screen.findByText('ประเมินทดลองงาน', undefined, { timeout: 2000 });
  return view;
}

const outcomeCard = (re: RegExp) => screen.getByRole('button', { name: re });

// ------------------------------------------------------------------
// Tests — ref-design card layout reconciled to BA field set
// ------------------------------------------------------------------

describe('ProbationDetailPage — ref card layout + BA fields', () => {
  beforeEach(() => {
    mockSubmitDecision.mockClear();
  });

  it('renders the 3 ref outcome cards (pass / extend / no_pass)', async () => {
    await renderLoaded();
    expect(outcomeCard(/ผ่านทดลองงาน/)).toBeInTheDocument();
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

  it('shows fail-reason LOV only when outcome = ไม่ผ่าน', async () => {
    await renderLoaded();
    // default outcome = pass → no fail reason
    expect(screen.queryByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i)).not.toBeInTheDocument();

    fireEvent.click(outcomeCard(/ไม่ผ่าน/));
    expect(screen.getByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i)).toBeInTheDocument();
  });

  it('shows extend-until date only when outcome = ขยายเวลา and validates it is after the end date', async () => {
    await renderLoaded();
    expect(screen.queryByLabelText(/ขยายถึงวันที่/i)).not.toBeInTheDocument();

    fireEvent.click(outcomeCard(/ขยายเวลา/));
    const dateInput = screen.getByLabelText(/ขยายถึงวันที่/i);
    expect(dateInput).toBeInTheDocument();

    // date on/before end → error
    fireEvent.change(dateInput, { target: { value: PROBATION_END } });
    await waitFor(() =>
      expect(screen.getByText(/วันที่ขยายต้องอยู่หลังวันสิ้นสุดทดลองงานปกติ/i)).toBeInTheDocument(),
    );
    fireEvent.change(dateInput, { target: { value: DATE_BEFORE_END } });
    await waitFor(() =>
      expect(screen.getByText(/วันที่ขยายต้องอยู่หลังวันสิ้นสุดทดลองงานปกติ/i)).toBeInTheDocument(),
    );

    // date after end → error clears
    fireEvent.change(dateInput, { target: { value: DATE_AFTER_END } });
    await waitFor(() =>
      expect(
        screen.queryByText(/วันที่ขยายต้องอยู่หลังวันสิ้นสุดทดลองงานปกติ/i),
      ).not.toBeInTheDocument(),
    );
  });

  it('disables submit for no_pass until a fail reason is selected', async () => {
    await renderLoaded();
    fireEvent.click(outcomeCard(/ไม่ผ่าน/));

    const submitBtn = screen.getByRole('button', { name: /ยืนยัน ไม่ผ่านทดลองงาน/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i), {
      target: { value: 'attitude' },
    });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
  });

  it('submits pass_normal by default (pass card preselected)', async () => {
    await renderLoaded();
    const submitBtn = screen.getByRole('button', { name: /อนุมัติและส่งให้ HR Admin/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => expect(mockSubmitDecision).toHaveBeenCalledTimes(1));
    const call = mockSubmitDecision.mock.calls[0][0] as ProbationDecisionInput;
    expect(call.outcome).toBe('pass_normal');
    expect(call.failReason).toBeUndefined();
  });

  it('submits fail_normal with reason + comment for no_pass', async () => {
    await renderLoaded();
    fireEvent.click(outcomeCard(/ไม่ผ่าน/));
    fireEvent.change(screen.getByLabelText(/เหตุผลการไม่ผ่านทดลองงาน/i), {
      target: { value: 'attitude' },
    });
    fireEvent.change(screen.getByLabelText(/ความคิดเห็นของผู้จัดการ/i), {
      target: { value: 'ต้องปรับปรุงพฤติกรรม' },
    });

    fireEvent.click(screen.getByRole('button', { name: /ยืนยัน ไม่ผ่านทดลองงาน/i }));

    await waitFor(() => expect(mockSubmitDecision).toHaveBeenCalledTimes(1));
    const call = mockSubmitDecision.mock.calls[0][0] as ProbationDecisionInput;
    expect(call.outcome).toBe('fail_normal');
    expect(call.failReason).toBe('attitude');
    expect(call.comment).toBe('ต้องปรับปรุงพฤติกรรม');
    expect(call.effectiveDate).toBeUndefined();
  });
});
