import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RequestDetailModal } from '@/components/quick-approve/RequestDetailModal';
import { MOCK_PENDING_REQUESTS } from '@/components/quick-approve/mock-requests';
import { APPROVAL_REGISTRY } from '@/lib/approval-registry';

// ── next-intl mock: keys pass through; default locale 'en' ────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Spy on the registry so Approve's single-step dispatch is observable without
// touching the real stores. Each adapter keeps a STABLE mocked `approve` so the
// component and the assertion reference the same spy.
vi.mock('@/lib/approval-registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/approval-registry')>();
  const mocked = Object.fromEntries(
    Object.entries(actual.APPROVAL_REGISTRY).map(([type, adapter]) => [
      type,
      { ...adapter, approve: vi.fn() },
    ]),
  ) as typeof actual.APPROVAL_REGISTRY;
  return { ...actual, APPROVAL_REGISTRY: mocked };
});

// A claim request with an attachment (WF-2026-004 is a claim in the seed).
const CLAIM_REQUEST = MOCK_PENDING_REQUESTS.find((r) => r.id === 'WF-2026-004')!;

describe('<RequestDetailModal> — STA-172 approval-detail popup', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders nothing when request is null', () => {
    const { container } = render(
      <RequestDetailModal request={null} open onClose={() => {}} actorName="Manager" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the detail sub-components + Approve / Cancel / Open-full-page footer', () => {
    render(
      <RequestDetailModal
        request={CLAIM_REQUEST}
        open
        onClose={() => {}}
        actorName="Manager"
        fullPageHref="/th/quick-approve/WF-2026-004"
      />,
    );
    // RequestSummary renders the requester name.
    expect(screen.getByText(CLAIM_REQUEST.requester.name)).toBeInTheDocument();
    // Footer controls (inline bilingual, locale 'en').
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    // The "Open full page" link renders only when a fullPageHref is supplied.
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/quick-approve\/WF-2026-004$/),
    );
  });

  it('Approve dispatches the single-step registry approve once then closes', () => {
    const onClose = vi.fn();
    render(
      <RequestDetailModal request={CLAIM_REQUEST} open onClose={onClose} actorName="Manager" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    const approve = APPROVAL_REGISTRY[CLAIM_REQUEST.type].approve as ReturnType<typeof vi.fn>;
    expect(approve).toHaveBeenCalledTimes(1);
    expect(approve).toHaveBeenCalledWith(CLAIM_REQUEST.id, { name: 'Manager' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Cancel closes the modal and dispatches nothing', () => {
    const onClose = vi.fn();
    render(
      <RequestDetailModal request={CLAIM_REQUEST} open onClose={onClose} actorName="Manager" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    const approve = APPROVAL_REGISTRY[CLAIM_REQUEST.type].approve as ReturnType<typeof vi.fn>;
    expect(approve).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
