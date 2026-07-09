/**
 * AC-0.1 — standalone <AccessDenied> presentational surface.
 * Asserts the Thai reason renders (th locale), the bilingual heading is present,
 * and there is NO router/redirect side-effect (no next/navigation router call).
 */

import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
const push = vi.fn();

// Locale is read via useParams; default to 'th'. No useRouter usage expected by
// the component — we mock it only to assert it is never invoked.
const localeMock = vi.hoisted(() => ({ locale: 'th' as string }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: localeMock.locale }),
  useRouter: () => ({ replace, push }),
}));

import { AccessDenied } from '../access-denied';

describe('AC-0.1 — <AccessDenied> standalone surface', () => {
  test('th locale renders the Thai reason + bilingual heading, no redirect', () => {
    localeMock.locale = 'th';
    render(<AccessDenied reason="Requires HRIS" reasonTh="ต้องมีสิทธิ์ HRIS" />);

    // bilingual heading (both TH + EN)
    expect(screen.getByText(/ไม่มีสิทธิ์เข้าถึง/)).toBeInTheDocument();
    expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
    // Thai reason chosen for th locale
    expect(screen.getByText('ต้องมีสิทธิ์ HRIS')).toBeInTheDocument();
    // no router side-effect
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  test('en locale renders the English reason', () => {
    localeMock.locale = 'en';
    render(<AccessDenied reason="Requires HRIS" reasonTh="ต้องมีสิทธิ์ HRIS" />);
    expect(screen.getByText('Requires HRIS')).toBeInTheDocument();
  });

  test('falls back to a bilingual default when no reason provided', () => {
    localeMock.locale = 'th';
    render(<AccessDenied />);
    expect(screen.getByText('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')).toBeInTheDocument();
  });
});
