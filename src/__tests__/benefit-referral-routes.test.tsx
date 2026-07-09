import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'th',
}));

describe('benefit referral route ownership', () => {
  it('/hospital-referral owns the referral history surface and links new requests to Benefits Hub', async () => {
    const { default: HospitalReferralPage } = await import('@/app/[locale]/hospital-referral/page');

    const { container } = render(<HospitalReferralPage />);

    expect(screen.getByRole('heading', { level: 1, name: /ขอใบส่งตัว|Hospital Referral/i })).toBeInTheDocument();
    expect(container.querySelector('a[href="/th/benefits-hub/referral"]')).toBeTruthy();
  });
});
