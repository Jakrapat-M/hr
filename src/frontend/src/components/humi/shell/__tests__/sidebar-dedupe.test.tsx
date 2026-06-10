/**
 * sidebar-dedupe.test.tsx — Req5 dedupe audit gate for the Blueprint sidebar.
 * Framework: Vitest + @testing-library/react + jsdom.
 *
 * The Blueprint MODULES IA originally had several leaves collapsing onto the same
 * route (inbox+approvals → /quick-approve, welfare+claims → /admin/benefits,
 * policy/workflows/notifs/branding → /integrations, …). PR-1 dedupes them:
 *  - inbox + approvals merged into ONE "กล่องงาน · อนุมัติ" leaf (badge 12);
 *  - intentionally-shared destinations split by a ?section= / #tab deep-link so
 *    each leaf is honestly distinct while still landing on a real screen.
 *
 * This suite enforces four acceptance criteria across ALL SIX personas:
 *  AC5.1  No two VISIBLE leaves share an identical resolved BARE href (locale,
 *         query and hash stripped) within a persona — i.e. deep-linked pairs are
 *         the only way two leaves may target the same screen.
 *  AC5.2  ROUTE-EXISTENCE GATE: every resolved bare path maps to a real
 *         src/app/[locale]/<path>/page.tsx (or a documented dynamic segment).
 *  AC5.3  Exactly one leaf resolves to /quick-approve, carrying badge 12.
 *  AC5.4  Manager persona still unlocks the team group (no regression).
 *
 * NOTE: roster + swap now resolve to /roster (swap via ?panel=swap deep-link),
 * the real 24h-day-view screen that landed in PR-3 — they share the bare /roster
 * path and are a documented query-differentiated pair in DEDUPE_EXEMPT below.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const navigationMocks = vi.hoisted(() => ({
  pathname: '/th/home',
  searchParams: new URLSearchParams(),
}));

const authMock = vi.hoisted(() => ({ roles: [] as string[] }));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => navigationMocks.pathname),
  useSearchParams: vi.fn(() => navigationMocks.searchParams),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn((selector: (s: { roles: string[]; username: string | null }) => unknown) =>
    selector({ roles: authMock.roles, username: 'จงรักษ์ ทานากะ' }),
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

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
    priority: _p,
    ...props
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    [k: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} {...props} />
  ),
}));

import { Sidebar } from '../Sidebar';

/** App-role bundles that unlock each Blueprint persona's view in PERSONA_ROLE. */
const PERSONA_ROLES: Record<string, string[]> = {
  employee: ['employee'],
  manager: ['manager', 'employee'],
  hrbp: ['hrbp', 'employee'],
  hradmin: ['hr_admin', 'employee'],
  hris: ['hr_manager', 'employee'], // top admin tier — sees every group (was also the phantom 'sysadmin')
  spd: ['spd', 'employee'],
};

const ALL_PERSONAS = Object.keys(PERSONA_ROLES);

/** Resolved bare paths that intentionally repeat across leaves — each pair lands
 *  on the same screen but a genuinely distinct surface there (a real tab or a
 *  built modal), so it is EXEMPT from the AC5.1 dedupe rule.
 *
 *  Req5 SIMPLIFY: every PURE-decoration ?section= deep-link leaf was CUT, so the
 *  only legitimate repeats left are the two that target a real sub-surface:
 *    /admin/benefits — welfare (#plans) + claims (#claims) admin tabs
 *    /roster         — roster + swap (?panel=swap deep-link to the roster grid) */
const DEDUPE_EXEMPT = new Set<string>([
  '/admin/benefits', // welfare#plans / claims#claims
  '/roster', // roster / swap (?panel=swap deep-link to the roster grid)
]);

/** Dynamic / non-static routes that legitimately have no static page.tsx. */
const DYNAMIC_ROUTE_EXEMPT = new Set<string>([]);

const APP_LOCALE_DIR = path.resolve(process.cwd(), 'src/app/[locale]');

/** Strip locale prefix, query and hash → the bare app path. */
function toBarePath(href: string): string {
  return href.replace(/^\/(th|en)/, '').replace(/[?#].*$/, '') || '/';
}

/** Render the sidebar for a persona, click through every unlocked group, and
 *  collect each visible leaf's <a href>. The rail shows one group at a time, so
 *  we must open each enabled group trigger to surface all of its leaves. */
function collectLeafHrefs(roles: string[]): string[] {
  authMock.roles = roles;
  const { container, unmount } = render(<Sidebar />);
  const hrefs = new Set<string>();

  const railButtons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('.bp-rail-item'),
  ).filter((b) => !b.disabled);

  for (const btn of railButtons) {
    fireEvent.click(btn);
    container
      .querySelectorAll<HTMLAnchorElement>('.bp-panel-nav a.bp-panel-item')
      .forEach((a) => hrefs.add(a.getAttribute('href') ?? ''));
  }

  unmount();
  return Array.from(hrefs);
}

beforeEach(() => {
  navigationMocks.pathname = '/th/home';
  navigationMocks.searchParams = new URLSearchParams();
  authMock.roles = [];
  localStorage.clear();
});

// ─── AC5.1 — no duplicate bare hrefs per persona ──────────────────────────────

describe('AC5.1 — no two visible leaves share a bare href (per persona)', () => {
  ALL_PERSONAS.forEach((persona) => {
    it(`${persona}: every duplicate bare path is a documented deep-link pair`, () => {
      const hrefs = collectLeafHrefs(PERSONA_ROLES[persona]);
      const seen = new Map<string, number>();
      hrefs.forEach((h) => {
        const bare = toBarePath(h);
        seen.set(bare, (seen.get(bare) ?? 0) + 1);
      });
      const undocumentedDups = [...seen.entries()].filter(
        ([bare, n]) => n > 1 && !DEDUPE_EXEMPT.has(bare),
      );
      expect(undocumentedDups).toEqual([]);
    });
  });
});

// ─── Req5 SIMPLIFY — the menu stays lean, no pure-decoration deep-links ───────

describe('Req5 — menu simplification (cut placeholder clutter)', () => {
  it('the full menu (hris / hr_manager sees every group) stays at the simplified size', () => {
    // hr_manager (top admin tier) sees: workspace 10 + team 6 + hr 6 + system 4 = 26
    // distinct routes. System dropped 6→4 on 2026-06-10: Time Policy + Benefit
    // Catalog were un-leafed and nested under Master Catalog (/admin/foundation)
    // tiles — IA simplification, not a feature cut (both screens still reachable).
    // The 3 People-Partner-only hr leaves (employees-bu, talent-search,
    // benefits-reports — gated hrbp/spd) are NOT visible to hr_manager.
    const total = collectLeafHrefs(PERSONA_ROLES.hris).length;
    expect(total).toBe(26);
  });

  it('no leaf is a bare ?section= deep-link onto a page another leaf already owns', () => {
    const hrefs = collectLeafHrefs(PERSONA_ROLES.hris);
    // After the cut, the ONLY query/hash suffixes left are the two exempt real
    // sub-surfaces (benefits #plans/#claims tabs, roster ?panel=swap modal).
    const decoration = hrefs.filter((h) => {
      if (!/[?#]/.test(h)) return false;
      const bare = toBarePath(h);
      return !DEDUPE_EXEMPT.has(bare);
    });
    expect(decoration).toEqual([]);
  });

  it('the system group has the simplified set of leaves (roles, catalog, docreview/audit)', () => {
    // 2026-05-25 simplification: /integrations was CUT from the system group.
    // System group now has: roles (/permissions), catalog (/admin/foundation),
    // docreview (/hrbp/doc-review — P4 PR-4 split off /admin/documents), audit (/admin/system).
    // hris maps to hr_manager role per PERSONA_ROLE (top admin tier).
    const sysHrefs = collectLeafHrefs(['hr_manager', 'employee']).map(toBarePath);
    // /permissions must be present
    expect(sysHrefs).toContain('/permissions');
    // /integrations must NOT be present (it was cut)
    expect(sysHrefs).not.toContain('/integrations');
    // /admin/foundation (catalog) must be present for hris (hr_manager)
    expect(sysHrefs).toContain('/admin/foundation');
  });
});

// ─── AC5.2 — route-existence gate ─────────────────────────────────────────────

describe('AC5.2 — every leaf bare path has a real page.tsx', () => {
  it('app/[locale] dir resolves (guards against a wrong cwd)', () => {
    expect(fs.existsSync(APP_LOCALE_DIR)).toBe(true);
  });

  ALL_PERSONAS.forEach((persona) => {
    it(`${persona}: no leaf points at a missing route`, () => {
      const bares = collectLeafHrefs(PERSONA_ROLES[persona]).map(toBarePath);
      const missing = bares.filter((bare) => {
        if (bare === '/') return false; // root handled by app/[locale]/page.tsx
        if (DYNAMIC_ROUTE_EXEMPT.has(bare)) return false;
        const pageFile = path.join(APP_LOCALE_DIR, bare.replace(/^\//, ''), 'page.tsx');
        return !fs.existsSync(pageFile);
      });
      expect(missing).toEqual([]);
    });
  });
});

// ─── AC5.3 — exactly one /quick-approve leaf with badge 12 ─────────────────────

describe('AC5.3 — unified approval inbox', () => {
  it('exactly one leaf resolves to /quick-approve for a manager', () => {
    const hrefs = collectLeafHrefs(PERSONA_ROLES.manager);
    const quickApprove = hrefs.filter((h) => toBarePath(h) === '/quick-approve');
    expect(quickApprove).toHaveLength(1);
  });

  it('the merged inbox leaf carries badge 12', () => {
    authMock.roles = PERSONA_ROLES.manager;
    navigationMocks.pathname = '/th/quick-approve'; // team group open by default
    render(<Sidebar />);
    const inbox = screen.getByText('กล่องงาน · อนุมัติ').closest('a')!;
    expect(inbox).toHaveAttribute('href', '/th/quick-approve');
    expect(inbox.querySelector('.bp-badge')?.textContent).toBe('12');
  });

  it('the old standalone "อนุมัติ" leaf is gone', () => {
    authMock.roles = PERSONA_ROLES.manager;
    navigationMocks.pathname = '/th/quick-approve';
    render(<Sidebar />);
    expect(screen.queryByText('อนุมัติ')).not.toBeInTheDocument();
  });
});

// ─── AC5.4 — manager still unlocks the team group ─────────────────────────────

describe('AC5.4 — manager team-group regression guard', () => {
  it('manager unlocks the team group (enabled rail trigger)', () => {
    authMock.roles = PERSONA_ROLES.manager;
    const { container } = render(<Sidebar />);
    const teamTrigger = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.bp-rail-item'),
    ).find((b) => /Team|ทีม/.test(b.textContent ?? ''));
    expect(teamTrigger).toBeDefined();
    expect(teamTrigger!.disabled).toBe(false);
  });
});

// ─── AC-2.1 (P1 Item 2) — ghost-menu cut for People Partners ──────────────────
// hrbp/spd were shown /admin/employees + /admin/change-requests leaves that the
// route guards block (admin/layout admits neither; change-requests excludes
// hrbp) → false affordances. PR-3 drops them. REMOVE not HIDE.

describe('AC-2.1 — People-Partner ghost-menu leaves are cut', () => {
  it('spd persona: no leaf resolves to /admin/employees', () => {
    const bares = collectLeafHrefs(PERSONA_ROLES.spd).map(toBarePath);
    expect(bares).not.toContain('/admin/employees');
  });

  it('hrbp persona: no leaf resolves to /admin/employees OR /admin/change-requests', () => {
    const bares = collectLeafHrefs(PERSONA_ROLES.hrbp).map(toBarePath);
    expect(bares).not.toContain('/admin/employees');
    expect(bares).not.toContain('/admin/change-requests');
  });

  it("the employees leaf show === ['hradmin','hris']", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/humi/shell/Sidebar.tsx'),
      'utf8',
    );
    const line = src
      .split('\n')
      .find((l) => l.includes("href: '/admin/employees'"));
    expect(line).toBeDefined();
    expect(line).toContain("show: ['hradmin', 'hris']");
  });
});
