import { describe, it, expect, vi, beforeEach } from 'vitest';

// The divergent inline-modal probation surface is retired — this route now
// redirects to the unified /workflows/probation journey (ref Claude design).

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}));

describe('manager-dashboard/probations redirect', () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it('redirects to the unified /workflows/probation journey (locale-aware)', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/probations/page');
    await Page({ params: Promise.resolve({ locale: 'th' }) });
    expect(redirectMock).toHaveBeenCalledWith('/th/workflows/probation');
  });

  it('preserves the en locale on redirect', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/probations/page');
    await Page({ params: Promise.resolve({ locale: 'en' }) });
    expect(redirectMock).toHaveBeenCalledWith('/en/workflows/probation');
  });
});
