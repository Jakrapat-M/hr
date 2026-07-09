/**
 * resignation-page.confirm.test.tsx — P2 D-tier polish
 *
 * Resignation submission must NOT be a single irreversible-looking click.
 * Clicking ส่งคำขอลาออก opens a confirmation Modal first (mockup confirm, no backend);
 * the termination-approvals store is written ONLY after confirming.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// ── UUID stub ───────────────────────────────────────────────────────────────
let uuidCounter = 0;
vi.stubGlobal('crypto', { randomUUID: () => `confirm-uuid-${++uuidCounter}` });

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

// ── next-intl mock — only the resignation keys the confirm Modal needs ────────
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
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

import { useTerminationApprovals } from '@/stores/termination-approvals';
import { ResignationPage } from '@/components/resignation/resignation-page';

function fillValidForm() {
  // last working day — at least 30 days out
  const lastDay = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const dateInput = document.getElementById('lastWorkingDate') as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value: lastDay } });

  const reasonSelect = document.getElementById('reasonCode') as HTMLSelectElement;
  fireEvent.change(reasonSelect, { target: { value: 'TERM_RESIGN' } });
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

describe('ResignationPage — confirmation step before submit', () => {
  it('clicking ส่งคำขอลาออก opens a confirmation Modal and does NOT write the store yet', () => {
    render(<ResignationPage />);
    fillValidForm();

    expect(useTerminationApprovals.getState().requests).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอลาออก' }));

    // Confirmation dialog appears…
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('ยืนยันการส่งใบลาออก')).toBeInTheDocument();
    expect(within(dialog).getByText('คุณแน่ใจหรือไม่ที่จะส่งใบลาออก?')).toBeInTheDocument();

    // …but nothing has been submitted to the store.
    expect(useTerminationApprovals.getState().requests).toHaveLength(0);
  });

  it('confirming inside the Modal writes exactly one request to the store', () => {
    render(<ResignationPage />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอลาออก' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'ส่งใบลาออก' }));

    const requests = useTerminationApprovals.getState().requests;
    expect(requests).toHaveLength(1);
    expect(requests[0].reasonCode).toBe('TERM_RESIGN');
  });

  it('cancelling the Modal leaves the store untouched', () => {
    render(<ResignationPage />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอลาออก' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'ยกเลิก' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useTerminationApprovals.getState().requests).toHaveLength(0);
  });
});
