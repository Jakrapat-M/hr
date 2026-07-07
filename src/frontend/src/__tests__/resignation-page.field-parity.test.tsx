/**
 * resignation-page.field-parity.test.tsx — STA-247
 *
 * ESS resignation form must carry the same employee-relevant fields as the
 * admin terminate form: personal email (required + format-validated) and
 * multi-file attachments via AttachmentDropzone. The only difference remains
 * the Exit Interview (resignation only).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// ── UUID stub ───────────────────────────────────────────────────────────────
let uuidCounter = 0;
vi.stubGlobal('crypto', { randomUUID: () => `parity-uuid-${++uuidCounter}` });

// ── localStorage mock ───────────────────────────────────────────────────────
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

// ── next-intl mock ────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      confirmSubmitTitle: 'ยืนยันการส่งใบลาออก',
      confirmSubmitMessage: 'คุณแน่ใจหรือไม่ที่จะส่งใบลาออก?',
      submitResignation: 'ส่งใบลาออก',
      lastWorkingDate: 'วันทำงานวันสุดท้าย',
      reasonType: 'เหตุผลการลาออก',
      cancel: 'ยกเลิก',
    };
    return map[key] ?? key;
  },
}));

// ── next/navigation mock ──────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/th/resignation'),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
}));

import { useTerminationApprovals } from '@/stores/termination-approvals';
import { ResignationPage } from '@/components/resignation/resignation-page';

function fillRequiredNonEmailFields() {
  const lastDay = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const dateInput = document.getElementById('lastWorkingDate') as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value: lastDay } });

  const reasonSelect = document.getElementById('reasonCode') as HTMLSelectElement;
  fireEvent.change(reasonSelect, { target: { value: 'TERM_RESIGN' } });
}

function submitButton() {
  return screen.getByRole('button', { name: 'ส่งคำขอลาออก' });
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

describe('ResignationPage — personal email parity with termination', () => {
  it('blocks submit when personal email is cleared (required)', () => {
    render(<ResignationPage />);
    fillRequiredNonEmailFields();

    const emailInput = document.getElementById('personalEmail') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: '' } });

    expect(submitButton()).toBeDisabled();
  });

  it('shows an error and blocks submit when the email format is invalid', () => {
    render(<ResignationPage />);
    fillRequiredNonEmailFields();

    const emailInput = document.getElementById('personalEmail') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    expect(screen.getByRole('alert')).toHaveTextContent('รูปแบบอีเมลไม่ถูกต้อง');
    expect(submitButton()).toBeDisabled();
  });

  it('is pre-seeded with a valid personal email so the default form is submittable', () => {
    render(<ResignationPage />);
    fillRequiredNonEmailFields();

    expect(submitButton()).not.toBeDisabled();
  });

  it('submits the edited personal email onto the stored request', () => {
    render(<ResignationPage />);
    fillRequiredNonEmailFields();

    const emailInput = document.getElementById('personalEmail') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'my.own.email@example.com' } });

    fireEvent.click(submitButton());
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'ส่งใบลาออก' }));

    const requests = useTerminationApprovals.getState().requests;
    expect(requests).toHaveLength(1);
    expect(requests[0].personalEmail).toBe('my.own.email@example.com');
  });
});

describe('ResignationPage — multi-file attachments parity with termination', () => {
  it('accepts multiple files via AttachmentDropzone and stores them on the request', async () => {
    const { container } = render(<ResignationPage />);
    fillRequiredNonEmailFields();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const fileA = new File(['a'], 'ใบลาออก.pdf', { type: 'application/pdf' });
    const fileB = new File(['b'], 'หนังสือแจ้งล่วงหน้า.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [fileA, fileB] } });

    await waitFor(() => {
      expect(screen.getByText('ใบลาออก.pdf')).toBeInTheDocument();
      expect(screen.getByText('หนังสือแจ้งล่วงหน้า.pdf')).toBeInTheDocument();
    });

    fireEvent.click(submitButton());
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'ส่งใบลาออก' }));

    const requests = useTerminationApprovals.getState().requests;
    expect(requests).toHaveLength(1);
    expect(requests[0].attachments).toHaveLength(2);
    expect(requests[0].attachments?.map((f) => f.name)).toEqual([
      'ใบลาออก.pdf',
      'หนังสือแจ้งล่วงหน้า.pdf',
    ]);
  });

  it('submits with attachments left empty (still optional)', () => {
    render(<ResignationPage />);
    fillRequiredNonEmailFields();

    fireEvent.click(submitButton());
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'ส่งใบลาออก' }));

    const requests = useTerminationApprovals.getState().requests;
    expect(requests).toHaveLength(1);
    expect(requests[0].attachments).toBeUndefined();
  });
});

describe('ResignationPage — additional-info label parity with termination', () => {
  it('labels the free-text note field "ข้อมูลเพิ่มเติม" (matching termination), not the old "หมายเหตุเพิ่มเติม"', () => {
    render(<ResignationPage />);

    expect(screen.getByText('ข้อมูลเพิ่มเติม')).toBeInTheDocument();
    expect(screen.queryByText('หมายเหตุเพิ่มเติม')).not.toBeInTheDocument();
  });
});
