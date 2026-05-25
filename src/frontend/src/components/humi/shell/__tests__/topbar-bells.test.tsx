/**
 * topbar-bells.test.tsx — Req6 inbox-then-bell topbar chrome.
 * AC6.1 both triggers present (TodoBell inbox + NotificationBell).
 * AC6.2 TodoBell renders the Mail (envelope) glyph; ListTodo absent.
 * AC6.3 badges derive from MOCK_TODOS / MOCK_IN_APP_NOTIFICATIONS, both bg-danger.
 * AC6.4 TodoBell precedes NotificationBell in DOM order.
 * AC6.5 footers → /{locale}/ess/workflows and /{locale}/admin/system/notifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const navMock = vi.hoisted(() => ({ pathname: '/th/home' }));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => navMock.pathname),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  useParams: vi.fn(() => ({ locale: 'th' })),
}));

// Keep the persona switcher inert (no proxy) so the topbar renders its trigger
// without opening the modal — this suite is about the two bells.
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        email: 'ken@humi.test',
        userId: 'KEN001',
        username: 'จงรักษ์ ทานากะ',
        roles: ['hr_admin', 'employee'],
        originalUser: null,
        switchPersona: vi.fn(),
        exitPersona: vi.fn(),
        _hasHydrated: true,
      }),
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { Topbar } from '../Topbar';
import { MOCK_TODOS } from '@/data/todos/mock';
import { MOCK_IN_APP_NOTIFICATIONS } from '@/data/notifications/mock';

const unreadTodos = MOCK_TODOS.filter((t) => !t.done).length;
const unreadNotifs = MOCK_IN_APP_NOTIFICATIONS.filter((n) => !n.read).length;

function inboxTrigger() {
  return screen.getByRole('button', { name: 'กล่องข้อความเข้า' });
}
function bellTrigger() {
  return screen.getByRole('button', { name: 'การแจ้งเตือน' });
}

beforeEach(() => {
  navMock.pathname = '/th/home';
});

describe('Topbar bells — Req6', () => {
  it('AC6.1: both the inbox and the notification triggers render', () => {
    render(<Topbar title="หน้าหลัก" />);
    expect(inboxTrigger()).toBeInTheDocument();
    expect(bellTrigger()).toBeInTheDocument();
  });

  it('AC6.2: TodoBell trigger uses the Mail glyph (lucide-mail), not ListTodo', () => {
    const { container } = render(<Topbar title="หน้าหลัก" />);
    const inbox = inboxTrigger();
    expect(inbox.querySelector('svg.lucide-mail')).not.toBeNull();
    // No list-todo icon anywhere in the topbar.
    expect(container.querySelector('svg.lucide-list-todo')).toBeNull();
  });

  it('AC6.3: the inbox badge reflects the unread MOCK_TODOS count, in bg-danger', () => {
    render(<Topbar title="หน้าหลัก" />);
    const badge = inboxTrigger().querySelector('span[aria-label]')!;
    expect(badge).toHaveClass('bg-danger');
    expect(badge.textContent).toBe(unreadTodos > 9 ? '9+' : String(unreadTodos));
  });

  it('AC6.3: the notification badge reflects MOCK_IN_APP_NOTIFICATIONS, in bg-danger', () => {
    render(<Topbar title="หน้าหลัก" />);
    const badge = bellTrigger().querySelector('span[aria-label]')!;
    expect(badge).toHaveClass('bg-danger');
    expect(badge.textContent).toBe(unreadNotifs > 9 ? '9+' : String(unreadNotifs));
  });

  it('AC6.4: TodoBell precedes NotificationBell in DOM order', () => {
    render(<Topbar title="หน้าหลัก" />);
    const inbox = inboxTrigger();
    const bell = bellTrigger();
    // Node.compareDocumentPosition: FOLLOWING (4) means bell comes after inbox.
    expect(inbox.compareDocumentPosition(bell) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('AC6.5: TodoBell footer links to /{locale}/ess/workflows', () => {
    render(<Topbar title="หน้าหลัก" />);
    fireEvent.click(inboxTrigger());
    const footer = screen.getByText('ดูงานทั้งหมด').closest('a')!;
    expect(footer).toHaveAttribute('href', '/th/ess/workflows');
  });

  it('AC6.5: NotificationBell footer links to /{locale}/admin/system/notifications', () => {
    render(<Topbar title="หน้าหลัก" />);
    fireEvent.click(bellTrigger());
    const footer = screen.getByText('ดูการแจ้งเตือนทั้งหมด').closest('a')!;
    expect(footer).toHaveAttribute('href', '/th/admin/system/notifications');
  });
});
