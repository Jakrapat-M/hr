import { describe, expect, it, vi } from 'vitest';

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
}));

describe('benefit referral route ownership', () => {
  it('/hospital-referral redirects to the dedicated Benefits Hub referral surface', async () => {
    const { default: HospitalReferralPage } = await import('@/app/[locale]/hospital-referral/page');

    await expect(
      HospitalReferralPage({ params: Promise.resolve({ locale: 'th' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/th/benefits-hub/referral');
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/th/benefits-hub/referral');
  });
});
