/**
 * resignation-page.resubmit-deadend.test.tsx — bug fix regression
 *
 * Demo personas share EMP001, so the form must never dead-end on prior
 * requests:
 *  - approved (terminal)   → banner only, a NEW submission is still possible
 *  - sent_back             → bare page behaves like ?edit=<id>: prefilled, and
 *                            submit REVISES the same request (no duplicate)
 *  - pending_manager/spd   → still blocks (the only legitimate block)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

let uuidCounter = 0;
vi.stubGlobal('crypto', { randomUUID: () => `deadend-uuid-${++uuidCounter}` });

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/th/resignation'),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

import { useTerminationApprovals, type TerminationRequest } from '@/stores/termination-approvals';
import { ResignationPage } from '@/components/resignation/resignation-page';

const EMP = 'EMP001';

function makeRequest(overrides: Partial<TerminationRequest>): TerminationRequest {
  return {
    id: 'TR-EXISTING-0001',
    employeeId: EMP,
    employeeName: 'สมชาย ใจดี',
    requestedLastDay: '2026-08-31',
    terminationDate: '2026-09-01',
    reasonCode: 'TERM_RESIGN',
    reasonForTermination: 'RESIGN_PERSONAL',
    voluntary: 'voluntary',
    personalEmail: 'x@gmail.com',
    submittedAt: '2026-07-01T09:00:00+07:00',
    status: 'pending_manager',
    submittedBy: { id: EMP, name: 'สมชาย ใจดี', role: 'employee' },
    sourceRoute: 'ess',
    audit: [],
    ...overrides,
  } as TerminationRequest;
}

function fillValidForm() {
  const lastDay = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  fireEvent.change(document.getElementById('lastWorkingDate') as HTMLInputElement, {
    target: { value: lastDay },
  });
  fireEvent.change(document.getElementById('reasonCode') as HTMLSelectElement, {
    target: { value: 'TERM_RESIGN' },
  });
  fireEvent.change(document.getElementById('personalEmail') as HTMLInputElement, {
    target: { value: 'somchai.personal@gmail.com' },
  });
  return lastDay;
}

function submitThroughConfirm() {
  fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอลาออก' }));
  // confirm modal primary button uses t('submitResignation') → key passthrough
  fireEvent.click(screen.getByRole('button', { name: 'submitResignation' }));
}

beforeEach(() => {
  uuidCounter = 0;
  localStorageMock.clear();
  useTerminationApprovals.setState({ requests: [] });
});

afterEach(() => {
  vi.clearAllMocks();
  useTerminationApprovals.setState({ requests: [] });
});

describe('ResignationPage — no dead end after prior requests', () => {
  it('approved request shows a banner but a NEW submission still goes through', () => {
    useTerminationApprovals.setState({
      requests: [makeRequest({ status: 'approved' })],
    });
    render(<ResignationPage />);

    expect(screen.getByText(/ได้รับการอนุมัติแล้ว/)).toBeInTheDocument();
    fillValidForm();
    expect(screen.getByRole('button', { name: 'ส่งคำขอลาออก' })).toBeEnabled();

    submitThroughConfirm();

    const requests = useTerminationApprovals.getState().requests;
    expect(requests).toHaveLength(2);
    expect(requests.some((r) => r.status === 'pending_manager')).toBe(true);
    expect(requests.some((r) => r.id === 'TR-EXISTING-0001' && r.status === 'approved')).toBe(true);
  });

  it('sent_back request prefills the bare page and submit revises the SAME id (no duplicate)', () => {
    useTerminationApprovals.setState({
      requests: [
        makeRequest({
          status: 'sent_back',
          sentBackFrom: 'pending_manager',
          audit: [
            {
              actorRole: 'manager',
              actorName: 'วิชัย หัวหน้าทีม',
              action: 'send_back',
              comment: 'ขอเอกสารเพิ่ม',
              at: '2026-07-02T09:00:00+07:00',
            },
          ],
        }),
      ],
    });
    render(<ResignationPage />);

    // banner with the approver's note + prefilled form from the sent-back request
    expect(screen.getByText(/ถูกส่งกลับให้แก้ไข/)).toBeInTheDocument();
    expect(screen.getByText(/ขอเอกสารเพิ่ม/)).toBeInTheDocument();
    expect((document.getElementById('lastWorkingDate') as HTMLInputElement).value).toBe('2026-08-31');

    const newDay = fillValidForm();
    submitThroughConfirm();

    const requests = useTerminationApprovals.getState().requests;
    expect(requests).toHaveLength(1);
    expect(requests[0].id).toBe('TR-EXISTING-0001');
    expect(requests[0].status).toBe('pending_manager');
    expect(requests[0].requestedLastDay).toBe(newDay);
  });

  it('pending request still blocks a new submission', () => {
    useTerminationApprovals.setState({
      requests: [makeRequest({ status: 'pending_manager' })],
    });
    render(<ResignationPage />);

    expect(screen.getByText(/รอ Manager อนุมัติ/)).toBeInTheDocument();
    fillValidForm();
    expect(screen.getByRole('button', { name: 'ส่งคำขอลาออก' })).toBeDisabled();
  });

  it('withdrawn request does not block and a fresh submission works', () => {
    useTerminationApprovals.setState({
      requests: [makeRequest({ status: 'withdrawn' })],
    });
    render(<ResignationPage />);

    fillValidForm();
    expect(screen.getByRole('button', { name: 'ส่งคำขอลาออก' })).toBeEnabled();
    submitThroughConfirm();

    const requests = useTerminationApprovals.getState().requests;
    expect(requests).toHaveLength(2);
    expect(requests.some((r) => r.status === 'pending_manager')).toBe(true);
  });
});
