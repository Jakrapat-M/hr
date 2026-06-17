import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/humi', () => ({
  Avatar: ({ name }: { name: string; src?: string; size?: string }) => <div data-testid="avatar">{name}</div>,
  Capability: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { RequestSummary } from '@/components/quick-approve/detail/RequestSummary';
import { MOCK_PENDING_REQUESTS } from '@/components/quick-approve/mock-requests';

describe('RequestSummary requester metadata', () => {
  it('does not repeat department when it is already part of the position label', () => {
    const claimRequest = MOCK_PENDING_REQUESTS.find((request) => request.id === 'WF-2026-004');

    expect(claimRequest).toBeDefined();
    render(<RequestSummary request={claimRequest!} />);

    expect(screen.getByText('HR Specialist')).toBeInTheDocument();
    expect(screen.queryByText('HR')).not.toBeInTheDocument();
  });

  it('renders Employee ID under the name and not as a grid fact', () => {
    const claimRequest = MOCK_PENDING_REQUESTS.find((request) => request.id === 'WF-2026-004');
    expect(claimRequest).toBeDefined();
    render(<RequestSummary request={claimRequest!} />);

    // Employee ID renders inline under the name (label + value in one line node).
    expect(screen.getByText(/employeeId:\s*EMP-009/)).toBeInTheDocument();

    // It is NOT a standalone grid <dt> label anymore.
    expect(screen.queryByText('employeeId')).not.toBeInTheDocument();
  });

  it('renders Hire date and Terminate date in the grid (terminate shows -)', () => {
    const claimRequest = MOCK_PENDING_REQUESTS.find((request) => request.id === 'WF-2026-004');
    expect(claimRequest).toBeDefined();
    const { container } = render(<RequestSummary request={claimRequest!} />);

    const grid = container.querySelector('dl');
    expect(grid).not.toBeNull();
    const gridScope = within(grid as HTMLElement);

    expect(gridScope.getByText('hireDate')).toBeInTheDocument();
    expect(gridScope.getByText('terminateDate')).toBeInTheDocument();
    // Terminate date is unset on the seed → always renders the literal '-'.
    expect(gridScope.getByText('-')).toBeInTheDocument();
  });

  it('does not render an urgency badge in the employee card', () => {
    const claimRequest = MOCK_PENDING_REQUESTS.find((request) => request.id === 'WF-2026-004');
    expect(claimRequest).toBeDefined();
    render(<RequestSummary request={claimRequest!} />);

    expect(screen.queryByTestId('urgency-normal')).not.toBeInTheDocument();
  });
});
