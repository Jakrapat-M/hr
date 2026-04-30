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
  it('/hospital-referral redirects to the profile benefits referral surface', async () => {
    const { default: HospitalReferralPage } = await import('@/app/[locale]/hospital-referral/page');

    await expect(HospitalReferralPage({ params: Promise.resolve({ locale: 'th' }) })).rejects.toThrow('NEXT_REDIRECT:/th/profile/me?tab=benefits&service=referral');
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/th/profile/me?tab=benefits&service=referral');
  });
});
