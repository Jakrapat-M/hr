/**
 * STA-198 — Time Correction Request page is create-only:
 *  (T1) no "My recent requests" list on the page;
 *  (T2) a successful submit shows the success toast (TH + EN).
 * Vitest + jsdom + RTL. TimeCorrectionForm is mocked to expose onSubmitted.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

let mockLocale = 'th';
vi.mock('next-intl', () => ({ useLocale: () => mockLocale }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (sel: (s: { username: string | null; userId: string | null; email: string | null }) => unknown) =>
    sel({ username: 'สมชาย ใจดี', userId: 'EMP001', email: 'emp@humi.test' }),
}));
vi.mock('@/lib/scope-filter', () => ({ resolveCurrentEmpId: () => 'EMP001' }));
// Mock the form so we can trigger onSubmitted without driving full validation.
vi.mock('@/components/time/TimeCorrectionForm', () => ({
  TimeCorrectionForm: (props: { onSubmitted?: (id: string) => void }) => (
    <button type="button" onClick={() => props.onSubmitted?.('TC-1')}>mock-submit</button>
  ),
}));

import TimeCorrectionsPage from '@/app/[locale]/time/corrections/page';

beforeEach(() => { mockLocale = 'th'; });
afterEach(() => cleanup());

describe('/time/corrections — create-only (STA-198)', () => {
  it('does NOT render a recent-requests list', () => {
    render(<TimeCorrectionsPage />);
    expect(screen.queryByText('คำขอล่าสุดของฉัน')).toBeNull();
    expect(screen.queryByText(/My recent requests/i)).toBeNull();
    // The create form is present.
    expect(screen.getByRole('button', { name: 'mock-submit' })).toBeInTheDocument();
  });

  it('shows the TH success toast after a successful submit', () => {
    render(<TimeCorrectionsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'mock-submit' }));
    expect(screen.getByRole('status')).toHaveTextContent('ส่งคำขอแก้ไขเวลาเรียบร้อยแล้ว');
  });

  it('shows the EN success toast on /en', () => {
    mockLocale = 'en';
    render(<TimeCorrectionsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'mock-submit' }));
    expect(screen.getByRole('status')).toHaveTextContent('Time correction request submitted successfully.');
  });
});
