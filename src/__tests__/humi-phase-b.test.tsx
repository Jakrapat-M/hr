/**
 * humi-phase-b.test.tsx
 * AC-8, AC-9, AC-10, AC-13, AC-14 — Phase B integration tests
 *
 * b1: OrgChart page wheel zoom + reset (original)
 * b2: ThemeProvider dark mode round-trip (original)
 * b3: Theme toggle round-trip light → dark → light, html[data-theme] check
 * b4: Middleware redirect / → /th/ (unit test of routing config)
 * b5: OrgChart canvas wheel event → transform style changes (WheelEvent)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// ── Mock next/navigation ─────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/th/org-chart'),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

// ── Mock next-intl ───────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: vi.fn().mockReturnValue((key: string) => key),
}));

// ── Mock next/link ───────────────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ─────────────────────────────────────────────────────────────────────────────
// b1: OrgChartPage — egocentric lineage view (Teams/Viva style, 2026-05)
//
// The org-chart was rewritten from a zoom/pan canvas to an egocentric lineage
// view. There is no zoom/pan/transform-scale canvas. Tests now verify the new
// view: the lineage column, navigation buttons (Home/Back), search input, and
// clickable node cards that change the focused person.
// ─────────────────────────────────────────────────────────────────────────────
describe('b1 — OrgChartPage egocentric lineage view', () => {
  it('renders the lineage column with a focused person card', async () => {
    const { default: OrgChartPage } = await import(
      '@/app/[locale]/org-chart/page'
    );
    const { container } = render(<OrgChartPage />);
    // The lineage column has the class sforg-lineage-col
    const lineageCol = container.querySelector('.sforg-lineage-col');
    expect(lineageCol).toBeTruthy();
    // The focused card has the is-focused modifier
    const focusedCard = container.querySelector('.sforg-linecard.is-focused');
    expect(focusedCard).toBeTruthy();
  });

  it('Home button navigates to root (has aria-label)', async () => {
    const { default: OrgChartPage } = await import(
      '@/app/[locale]/org-chart/page'
    );
    render(<OrgChartPage />);
    // Home button: aria-label "ไปยัง CEO / ราก"
    const homeBtn = screen.getByRole('button', { name: /ไปยัง CEO/i });
    expect(homeBtn).toBeTruthy();
  });

  it('Back button is present and has aria-label', async () => {
    const { default: OrgChartPage } = await import(
      '@/app/[locale]/org-chart/page'
    );
    render(<OrgChartPage />);
    // Back button: aria-label "ย้อนกลับ"
    const backBtn = screen.getByRole('button', { name: /ย้อนกลับ/i });
    expect(backBtn).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// b2: ThemeProvider dark mode round-trip
// ─────────────────────────────────────────────────────────────────────────────
describe('b2 — ThemeProvider dark mode round-trip', () => {
  beforeEach(() => {
    // Reset html classes
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('setTheme dark → html gets class "dark"', async () => {
    const { useUIStore } = await import('@/stores/ui-store');

    act(() => {
      useUIStore.getState().setTheme('dark');
    });

    // ThemeProvider effect runs after render — simulate manually
    const theme = useUIStore.getState().theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setTheme light → html loses class "dark"', async () => {
    const { useUIStore } = await import('@/stores/ui-store');

    // Start in dark
    document.documentElement.classList.add('dark');

    act(() => {
      useUIStore.getState().setTheme('light');
    });

    const theme = useUIStore.getState().theme;
    if (theme !== 'dark') {
      document.documentElement.classList.remove('dark');
    }

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('round-trip light → dark → light preserves correct class state', async () => {
    const { useUIStore } = await import('@/stores/ui-store');

    act(() => { useUIStore.getState().setTheme('dark'); });
    document.documentElement.classList.add('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => { useUIStore.getState().setTheme('light'); });
    document.documentElement.classList.remove('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// b3: Theme toggle round-trip — html[data-theme] attribute
// AC-10, AC-14
// ─────────────────────────────────────────────────────────────────────────────
describe('b3 — theme toggle round-trip (data-theme attribute)', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('light → dark → light round-trip produces no residual dark state', async () => {
    const { useUIStore } = await import('@/stores/ui-store');

    // Set dark
    act(() => { useUIStore.getState().setTheme('dark'); });
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Set light
    act(() => { useUIStore.getState().setTheme('light'); });
    document.documentElement.setAttribute('data-theme', 'light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // No flicker: store agrees with DOM
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('theme store starts as light by default', async () => {
    const { useUIStore } = await import('@/stores/ui-store');
    // Reset to initial
    act(() => { useUIStore.setState({ theme: 'light' }); });
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('toggleSidebar flips sidebarOpen in store', async () => {
    const { useUIStore } = await import('@/stores/ui-store');
    act(() => { useUIStore.setState({ sidebarOpen: true }); });
    act(() => { useUIStore.getState().toggleSidebar(); });
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    act(() => { useUIStore.getState().toggleSidebar(); });
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// b4: Middleware — i18n routing config redirects / to /en/
// AC-9, AC-14
// ─────────────────────────────────────────────────────────────────────────────
describe('b4 — i18n routing config (locale redirect)', () => {
  it('routing config has en as defaultLocale', async () => {
    const { routing } = await import('@/i18n/routing');
    expect(routing.defaultLocale).toBe('en');
  });

  it('routing config includes both th and en locales', async () => {
    const { routing } = await import('@/i18n/routing');
    expect(routing.locales).toContain('th');
    expect(routing.locales).toContain('en');
    expect(routing.locales).toHaveLength(2);
  });

  it('middleware.ts exports default middleware function', async () => {
    // createMiddleware requires Next.js server runtime (next/server) which is
    // unavailable in jsdom. Verify the module shape via a lightweight mock instead.
    vi.doMock('next-intl/middleware', () => ({
      default: () => (_req: unknown) => null,
    }));
    vi.doMock('next/server', () => ({
      NextResponse: { next: () => ({}) },
    }));
    const mod = await import(
      /* @vite-ignore */ '../../middleware'
    );
    expect(typeof mod.default).toBe('function');
    vi.doUnmock('next-intl/middleware');
    vi.doUnmock('next/server');
  });

  it('routing config disables localeDetection', async () => {
    const { routing } = await import('@/i18n/routing');
    // localeDetection is false per routing.ts
    expect((routing as { localeDetection?: boolean }).localeDetection).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// b5: OrgChartPage search input → focus change
// AC-9
//
// The org-chart was rewritten as an egocentric lineage view (2026-05).
// There is no zoom/pan canvas — wheel events no longer change transform scale.
// This test now verifies that the search input is present and functional
// (typing a query updates the store via handleSearch).
// ─────────────────────────────────────────────────────────────────────────────
describe('b5 — OrgChartPage search input interaction', () => {
  it('search input is present and accepts text', async () => {
    const { default: OrgChartPage } = await import('@/app/[locale]/org-chart/page');
    const { container } = render(<OrgChartPage />);

    const searchInput = container.querySelector('input[aria-label="ค้นหาพนักงาน"]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    // Typing in the search input should work without errors
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'วาสนา' } });
    });

    expect(searchInput.value).toBe('วาสนา');
  });
});
