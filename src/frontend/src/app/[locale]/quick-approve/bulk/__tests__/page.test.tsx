import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string, params?: Record<string, unknown>) => {
    let result = `${ns}.${key}`;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }
    return result;
  },
}));

// Capability mock — controls who can bulkApprove
let _canBulkApprove = true;

vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    canSee: () => true,
    canDo: (action: string) => {
      if (action === 'bulkApprove') return _canBulkApprove;
      return true;
    },
  }),
}));

vi.mock('@/components/humi', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  DataTable: ({
    rows,
    columns,
    emptyState,
  }: {
    rows: unknown[];
    columns: { id: string; header: React.ReactNode; cell: (row: unknown) => React.ReactNode }[];
    emptyState?: React.ReactNode;
    caption?: string;
    captionVisuallyHidden?: boolean;
    rowKey?: (row: unknown) => string;
  }) =>
    rows.length === 0 ? (
      <>{emptyState}</>
    ) : (
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.id}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: unknown, i: number) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.id}>{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
  Modal: ({
    open,
    children,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    title: string;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
  FormField: ({
    children,
    label,
  }: {
    children: React.ReactNode;
    label: string;
  }) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  FormInput: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
  // CONTRACT: Capability reads _canBulkApprove directly — avoids jest.requireMock
  // which is unavailable in vitest. The variable is set per-test in beforeEach.
  Capability: ({
    children,
    fallback,
    action,
  }: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    action?: string;
  }) => {
    const ok = action === 'bulkApprove' ? _canBulkApprove : true;
    return ok ? <>{children}</> : <>{fallback ?? null}</>;
  },
}));

vi.mock('@/components/quick-approve/UrgencyBadge', () => ({
  UrgencyBadge: ({ urgency }: { urgency: string }) => (
    <span data-testid="urgency-badge">{urgency}</span>
  ),
}));

// ── Subject ───────────────────────────────────────────────────────────────────

import BulkApprovePage from '../page';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BulkApprovePage', () => {
  beforeEach(() => {
    _canBulkApprove = true;
  });

  it('renders the bulk queue table for SPD/HRBP (capability allowed)', () => {
    render(<BulkApprovePage />);
    expect(screen.getByText('quick_approve_bulk.title')).toBeInTheDocument();
    // Column headers should be visible
    expect(screen.getByText('quick_approve_bulk.colRequester')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_bulk.colType')).toBeInTheDocument();
  });

  it('shows NotAuthorized fallback for Manager/Employee (capability denied)', () => {
    _canBulkApprove = false;
    render(<BulkApprovePage />);
    expect(screen.getByText('quick_approve_bulk.notAuthorized')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_bulk.notAuthorizedDesc')).toBeInTheDocument();
    // Table must NOT appear
    expect(screen.queryByText('quick_approve_bulk.title')).not.toBeInTheDocument();
  });

  it('renders approve and reject buttons', () => {
    render(<BulkApprovePage />);
    expect(screen.getByText('quick_approve_bulk.approveSelected')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_bulk.rejectSelected')).toBeInTheDocument();
  });

  it('approve button is disabled when no rows are selected', () => {
    render(<BulkApprovePage />);
    const approveBtn = screen.getByText('quick_approve_bulk.approveSelected').closest('button');
    expect(approveBtn).toBeDisabled();
  });

  it('shows row data for pending requests', () => {
    render(<BulkApprovePage />);
    // First mock requester name should appear
    expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument();
  });
});
