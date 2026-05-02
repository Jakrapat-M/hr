/**
 * quick-approve-workspace.test.tsx
 *
 * Acceptance criteria for the Unified Approval Workspace (A-4):
 *   1. Inbox renders for Manager / SPD / HRBP / HR Admin
 *   2. Bulk-action bar HIDDEN for Manager (no bulkApprove capability)
 *   3. Bulk-action bar VISIBLE for SPD, HRBP, HR Admin
 *   4. Benefits filter HIDDEN for Manager (BenefitEmployeeClaim entity gate)
 *   5. Benefits filter VISIBLE for SPD / HRBP / HR Admin
 *   6. Queue scope label matches resolved capability bundle
 *   7. Delegation banner shown when originalUser is non-null
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── next-intl mock ──────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}(${JSON.stringify(params)})`;
    return key;
  },
  useLocale: () => 'th',
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={String(href)} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
}));

// ── Stub heavy Humi primitives ──────────────────────────────────────────────
vi.mock('@/components/humi/Card', () => ({
  Card: ({
    children,
    header,
  }: {
    children: React.ReactNode;
    header?: React.ReactNode;
  }) => (
    <div data-testid="card">
      {header}
      {children}
    </div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  cardVariants: {},
}));

vi.mock('@/components/humi/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  buttonVariants: {},
}));

vi.mock('@/components/humi/Modal', () => ({
  Modal: ({
    open,
    children,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    title: string;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

vi.mock('@/components/humi/DataTable', () => ({
  DataTable: ({
    rows,
    emptyState,
  }: {
    rows: unknown[];
    columns: unknown[];
    emptyState?: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <div data-testid="data-table">
      {rows.length === 0 ? (
        <div data-testid="empty-state">{emptyState}</div>
      ) : (
        rows.map((_, idx) => <div key={idx} data-testid="table-row" />)
      )}
    </div>
  ),
}));

// ── Capability: pass-through to real implementation ─────────────────────────
// We do NOT mock @/hooks/use-capabilities or @/components/humi/Capability.
// The real Capability component reads from the Zustand auth-store which we
// control via useAuthStore.setState in each test helper.
// This avoids all require()-inside-vi.mock patterns.

// ── Barrel re-export of humi — inline stubs matching the individual mocks ───
// NOTE: vi.importActual on already-mocked modules returns the mock, not the
// original. We inline the stubs here to avoid that confusion.
vi.mock('@/components/humi', async () => {
  // Capability: import the real implementation so RBAC gates work
  const { Capability } = await vi.importActual<typeof import('@/components/humi/Capability')>(
    '@/components/humi/Capability',
  );
  return {
    Card: ({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) => (
      <div data-testid="card">{header}{children}</div>
    ),
    CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    cardVariants: {},
    Button: ({ children, onClick, disabled, className }: {
      children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string;
    }) => <button onClick={onClick} disabled={disabled} className={className}>{children}</button>,
    buttonVariants: {},
    Modal: ({ open, children, title }: {
      open: boolean; children: React.ReactNode; title: string; onClose: () => void;
    }) => open ? <div role="dialog" aria-label={title}>{children}</div> : null,
    DataTable: ({ rows, columns, emptyState }: {
      rows: unknown[];
      columns: Array<{ id: string; header: React.ReactNode; cell: (row: unknown) => React.ReactNode }>;
      emptyState?: React.ReactNode;
      [k: string]: unknown;
    }) => (
      <div data-testid="data-table">
        {/* Render header row so select-all checkbox is accessible */}
        <div data-testid="table-header">
          {columns.map((col) => (
            <span key={col.id}>{col.header}</span>
          ))}
        </div>
        {rows.length === 0
          ? <div data-testid="empty-state">{emptyState}</div>
          : rows.map((row, idx) => (
              <div key={idx} data-testid="table-row">
                {/* Render all cells so row checkboxes are accessible */}
                {columns.map((col) => (
                  <span key={col.id}>{col.cell(row)}</span>
                ))}
              </div>
            ))}
      </div>
    ),
    Capability,
  };
});

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} aria-hidden />
  ),
}));

vi.mock('@/components/quick-approve/UrgencyBadge', () => ({
  UrgencyBadge: ({ urgency, label }: { urgency: string; label?: string }) => (
    <span data-testid={`urgency-${urgency}`}>{label ?? urgency}</span>
  ),
}));

vi.mock('@/components/quick-approve/ApprovalChain', () => ({
  ApprovalChain: () => <div data-testid="approval-chain" />,
  ApprovalTimelineChain: () => <div data-testid="approval-timeline-chain" />,
}));

vi.mock('@/components/quick-approve/DelegationModal', () => ({
  DelegationModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="delegation-modal" /> : null,
}));

vi.mock('@/hooks/use-quick-approve', () => ({
  useQuickApprove: () => ({
    loading: false,
    delegations: [],
    createDelegation: vi.fn(),
    revokeDelegation: vi.fn(),
  }),
}));

// ── localStorage mock ───────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── Imports AFTER mocks ────────────────────────────────────────────────────
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/rbac';
import { QuickApprovePage } from '@/components/manager/quick-approve-page';

// ── Helpers ─────────────────────────────────────────────────────────────────

function setPersona(
  roles: Role[],
  opts?: {
    username?: string;
    originalUser?: {
      userId: string;
      username: string;
      email: string;
      roles: Role[];
    } | null;
  },
) {
  useAuthStore.setState({
    userId: 'TEST-001',
    username: opts?.username ?? 'Test User',
    email: 'test@humi.test',
    roles,
    isAuthenticated: true,
    originalUser: opts?.originalUser ?? null,
    _hasHydrated: true,
  } as Parameters<typeof useAuthStore.setState>[0]);
}

// ── Test setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════════════
// AC-1: Inbox renders for all personas
// ════════════════════════════════════════════════════════════════════════════

describe('QuickApprovePage — inbox renders for all personas', () => {
  it('renders for Manager role', () => {
    setPersona(['manager']);
    render(<QuickApprovePage />);
    expect(screen.getByText('กล่องอนุมัติ')).toBeInTheDocument();
    expect(screen.getByTestId('queue-scope-badge')).toHaveTextContent('ทีม');
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders for SPD role', () => {
    setPersona(['spd']);
    render(<QuickApprovePage />);
    expect(screen.getByText('กล่องอนุมัติ')).toBeInTheDocument();
    expect(screen.getByTestId('queue-scope-badge')).toHaveTextContent('บริษัท');
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders for HRBP role', () => {
    setPersona(['hrbp']);
    render(<QuickApprovePage />);
    expect(screen.getByText('กล่องอนุมัติ')).toBeInTheDocument();
    expect(screen.getByTestId('queue-scope-badge')).toHaveTextContent('บริษัท');
  });

  it('renders for HR Admin role', () => {
    setPersona(['hr_admin']);
    render(<QuickApprovePage />);
    expect(screen.getByText('กล่องอนุมัติ')).toBeInTheDocument();
    expect(screen.getByTestId('queue-scope-badge')).toHaveTextContent('ทั้งหมด');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AC-2 / AC-3: Bulk-action bar visibility
// ════════════════════════════════════════════════════════════════════════════

describe('Bulk-action bar visibility', () => {
  it('bulk-action bar HIDDEN for Manager — clicking checkbox does not reveal it', async () => {
    setPersona(['manager']);
    const user = userEvent.setup();
    render(<QuickApprovePage />);

    const checkboxes = screen.getAllByRole('checkbox');
    // checkboxes[0] = select-all header, checkboxes[1+] = row checkboxes
    if (checkboxes.length > 1) {
      await user.click(checkboxes[1]);
    }

    expect(screen.queryByTestId('bulk-action-bar')).not.toBeInTheDocument();
  });

  it('bulk-action bar VISIBLE for SPD after selecting a row', async () => {
    setPersona(['spd']);
    const user = userEvent.setup();
    render(<QuickApprovePage />);

    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 1) {
      await user.click(checkboxes[1]);
    }

    expect(screen.getByTestId('bulk-action-bar')).toBeInTheDocument();
  });

  it('bulk-action bar VISIBLE for HRBP after selecting a row', async () => {
    setPersona(['hrbp']);
    const user = userEvent.setup();
    render(<QuickApprovePage />);

    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 1) {
      await user.click(checkboxes[1]);
    }

    expect(screen.getByTestId('bulk-action-bar')).toBeInTheDocument();
  });

  it('bulk-action bar VISIBLE for HR Admin after selecting a row', async () => {
    setPersona(['hr_admin']);
    const user = userEvent.setup();
    render(<QuickApprovePage />);

    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 1) {
      await user.click(checkboxes[1]);
    }

    expect(screen.getByTestId('bulk-action-bar')).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AC-4: Benefits filter chip RBAC gate
// ════════════════════════════════════════════════════════════════════════════

describe('Benefits filter chip RBAC gate', () => {
  it('Benefits filter chip HIDDEN for Manager', () => {
    setPersona(['manager']);
    render(<QuickApprovePage />);
    expect(screen.queryByTestId('benefits-filter-chip')).not.toBeInTheDocument();
  });

  it('Benefits filter chip VISIBLE for SPD', () => {
    setPersona(['spd']);
    render(<QuickApprovePage />);
    expect(screen.getByTestId('benefits-filter-chip')).toBeInTheDocument();
  });

  it('Benefits filter chip VISIBLE for HRBP', () => {
    setPersona(['hrbp']);
    render(<QuickApprovePage />);
    expect(screen.getByTestId('benefits-filter-chip')).toBeInTheDocument();
  });

  it('Benefits filter chip VISIBLE for HR Admin', () => {
    setPersona(['hr_admin']);
    render(<QuickApprovePage />);
    expect(screen.getByTestId('benefits-filter-chip')).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AC-5: Queue scope label matches resolved capability bundle
// ════════════════════════════════════════════════════════════════════════════

describe('Queue scope label matches capability bundle', () => {
  const cases: [Role, string][] = [
    ['manager', 'ทีม'],
    ['spd', 'บริษัท'],
    ['hrbp', 'บริษัท'],
    ['hr_admin', 'ทั้งหมด'],
    ['hr_manager', 'ทั้งหมด'],
  ];

  cases.forEach(([role, expectedScope]) => {
    it(`${role} → scope badge = "${expectedScope}"`, () => {
      setPersona([role]);
      render(<QuickApprovePage />);
      expect(screen.getByTestId('queue-scope-badge')).toHaveTextContent(expectedScope);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AC-6: Delegation banner (proxy mode)
// ════════════════════════════════════════════════════════════════════════════

describe('Delegation banner (proxy mode)', () => {
  it('shows delegation banner when originalUser is non-null', () => {
    setPersona(['manager'], {
      originalUser: {
        userId: 'ORIG-001',
        username: 'Original Manager',
        email: 'orig@humi.test',
        roles: ['manager'],
      },
    });
    render(<QuickApprovePage />);
    // Banner shows both TH and EN versions of the name — getAllByText handles multiples
    expect(screen.getAllByText(/Original Manager/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/กำลังทำงานแทน/)).toBeInTheDocument();
  });

  it('does NOT show delegation banner when originalUser is null', () => {
    setPersona(['manager'], { originalUser: null });
    render(<QuickApprovePage />);
    expect(screen.queryByText(/กำลังทำงานแทน/)).not.toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AC-7: Inbox table row count
// ════════════════════════════════════════════════════════════════════════════

describe('Inbox table', () => {
  it('renders 20 mock rows for HR Admin', () => {
    setPersona(['hr_admin']);
    render(<QuickApprovePage />);
    expect(screen.getAllByTestId('table-row').length).toBe(20);
  });
});
