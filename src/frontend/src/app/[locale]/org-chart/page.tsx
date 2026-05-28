'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Home,
  IdCard,
  Info,
  Mail,
  Phone,
  Plus,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { Avatar, Button, Card, CardEyebrow } from '@/components/humi';
import { cn } from '@/lib/utils';
import {
  HUMI_ORG_PEOPLE,
  type HumiOrgPerson,
  type HumiOrgTone,
} from '@/lib/humi-mock-data';
import { useOrgChartStore } from '@/stores/humi-orgchart-slice';
// BRD #8, #9, #11: bind department detail panel to FODepartment store (OrgUnits)
// SF cite: sf-extract/qas-fields-2026-04-26/sf-qas-FODepartment-2026-04-26.json
import { useOrgUnits } from '@/lib/admin/store/useOrgUnits';

// ════════════════════════════════════════════════════════════
// Humi /org-chart — Teams/Viva-style egocentric lineage view.
//
// LEFT  = single centered column: breadcrumb nav → collapsed/visible
//         ancestor cards (manager chain) → focused person (emphasized)
//         → direct reports list → peers horizontal carousel.
//         No pan/zoom. Normal vertical scroll. Re-focus on card click.
// RIGHT = rich employee detail panel (unchanged sections + bindings).
//
// Focus history (back navigation) is LOCAL component state.
// Store slice shape { query, selectedId, setQuery, select } unchanged.
// ════════════════════════════════════════════════════════════

// ── Avatar helpers ──────────────────────────────────────────
function avatarTone(tone: HumiOrgTone): 'teal' | 'sage' | 'butter' | 'ink' {
  return tone === 'coral' ? 'butter' : tone;
}

// Stable presence status from id — deterministic, no random per render.
// 0 = available (sage), 1 = busy (pumpkin/danger), 2 = offline (muted)
function presenceOf(id: string): 'available' | 'busy' | 'offline' {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return (['available', 'busy', 'offline'] as const)[n % 3];
}

const CERT_DOT_TONE: Record<'sage' | 'butter' | 'teal', string> = {
  sage: 'bg-[color:var(--color-sage)]',
  butter: 'bg-[color:var(--color-butter)]',
  teal: 'bg-[color:var(--color-accent)]',
};

// ── Tree model (retained from prior version) ────────────────
function buildChildIndex(): Record<string, string[]> {
  const byManager: Record<string, string[]> = {};
  for (const p of Object.values(HUMI_ORG_PEOPLE)) {
    if (p.managerId && HUMI_ORG_PEOPLE[p.managerId]) {
      (byManager[p.managerId] ??= []).push(p.id);
    }
  }
  const index: Record<string, string[]> = {};
  for (const p of Object.values(HUMI_ORG_PEOPLE)) {
    const explicit = (p.reportIds ?? []).filter((id) => HUMI_ORG_PEOPLE[id]);
    index[p.id] = explicit.length > 0 ? explicit : byManager[p.id] ?? [];
  }
  return index;
}

function subtreeSize(
  id: string,
  childIndex: Record<string, string[]>,
  seen = new Set<string>()
): number {
  if (seen.has(id)) return 0;
  seen.add(id);
  let n = 1;
  for (const c of childIndex[id] ?? []) n += subtreeSize(c, childIndex, seen);
  return n;
}

function pickRoot(childIndex: Record<string, string[]>): string {
  const roots = Object.values(HUMI_ORG_PEOPLE)
    .filter((p) => p.managerId === null || !HUMI_ORG_PEOPLE[p.managerId])
    .map((p) => p.id);
  if (roots.length === 0) return Object.keys(HUMI_ORG_PEOPLE)[0];
  if (roots.length === 1) return roots[0];
  return roots
    .map((id) => ({ id, size: subtreeSize(id, childIndex) }))
    .sort((a, b) => b.size - a.size)[0].id;
}

// Returns ancestor ids ordered root → ... → direct manager of targetId.
function ancestorsOf(targetId: string): string[] {
  const chain: string[] = [];
  let cur: string | null | undefined = HUMI_ORG_PEOPLE[targetId]?.managerId;
  while (cur && HUMI_ORG_PEOPLE[cur]) {
    chain.unshift(cur);
    cur = HUMI_ORG_PEOPLE[cur].managerId;
  }
  return chain;
}

// ── Presence dot component ─────────────────────────────────
function PresenceDot({ id }: { id: string }) {
  return (
    <span
      aria-hidden
      className={cn('sforg-presence', presenceOf(id))}
    />
  );
}

// ── Avatar + presence wrapper ──────────────────────────────
function AvatarWithPresence({
  person,
  size,
}: {
  person: HumiOrgPerson;
  size: 'sm' | 'md' | 'lg';
}) {
  return (
    <span className="sforg-linecard-avatar">
      <Avatar name={person.name} tone={avatarTone(person.tone)} size={size} />
      <PresenceDot id={person.id} />
    </span>
  );
}

// ── Lineage card (ancestor / report) ──────────────────────
function LineCard({
  person,
  childIndex,
  onClick,
  focused = false,
}: {
  person: HumiOrgPerson;
  childIndex: Record<string, string[]>;
  onClick: () => void;
  focused?: boolean;
}) {
  const reportCount = subtreeSize(person.id, childIndex) - 1; // exclude self
  const directCount = (childIndex[person.id] ?? []).length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('sforg-linecard', focused && 'is-focused')}
    >
      <AvatarWithPresence person={person} size={focused ? 'md' : 'sm'} />
      <span className="sforg-linecard-body">
        <span className="sforg-linecard-name">{person.name}</span>
        <span className="sforg-linecard-sub">
          {person.title ?? person.role}
        </span>
        {focused ? (
          <span className="sforg-focused-stats">
            <Users className="h-3 w-3" aria-hidden />
            {reportCount} รายงาน · {directCount} ตรง
          </span>
        ) : (
          <span className="sforg-linecard-dept">{person.department}</span>
        )}
      </span>
      {!focused && reportCount > 0 && (
        <span className="sforg-report-badge">
          <Users aria-hidden />
          {reportCount}
        </span>
      )}
    </button>
  );
}

// ── Peer compact card ──────────────────────────────────────
function PeerCard({
  person,
  onClick,
}: {
  person: HumiOrgPerson;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="sforg-peercard">
      <span className="sforg-linecard-avatar">
        <Avatar name={person.name} tone={avatarTone(person.tone)} size="sm" />
        <PresenceDot id={person.id} />
      </span>
      <span className="sforg-peercard-name">{person.name}</span>
      <span className="sforg-peercard-sub">
        {person.title ?? person.role}
        {person.location ? ` · ${person.location}` : ''}
      </span>
    </button>
  );
}

// ── Section divider ────────────────────────────────────────
function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="sforg-section-divider">
      <span className="sforg-section-label">{children}</span>
    </div>
  );
}

// ── Vertical connector line ────────────────────────────────
function Connector() {
  return <span aria-hidden className="sforg-connector" />;
}

// ── Detail row (right panel) ───────────────────────────────
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-28 shrink-0 text-small text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-small font-medium text-ink">
        {value}
      </dd>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════
export default function OrgChartPage() {
  const { query, selectedId, setQuery, select } = useOrgChartStore();

  // Stable tree model.
  const childIndex = useMemo(() => buildChildIndex(), []);
  const rootId = useMemo(() => pickRoot(childIndex), [childIndex]);

  const resolvedFocus = selectedId ?? 'marcus';

  // ── Focus history for breadcrumb back navigation ─────────
  const [history, setHistory] = useState<string[]>([]);

  const refocus = useCallback(
    (id: string) => {
      if (id === resolvedFocus) return;
      setHistory((h) => [...h, resolvedFocus]);
      select(id);
    },
    [resolvedFocus, select]
  );

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    select(prev);
  }, [history, select]);

  const goRoot = useCallback(() => {
    if (resolvedFocus === rootId) return;
    setHistory((h) => [...h, resolvedFocus]);
    select(rootId);
  }, [resolvedFocus, rootId, select]);

  // Scroll lineage col to top on focus change.
  const lineageColRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    lineageColRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [resolvedFocus]);

  // ── Manager-chain (ancestors) expand/collapse ──────────────
  // A single toggle gangs the WHOLE upline branch: collapsed hides every
  // ancestor behind one pill; expanded shows the full chain up to the root.
  // (Not a partial "keep the 2 closest, fold only the upper" split.)
  // Keyed by focusId so it resets when focus changes — no useEffect needed.
  const [expandedFocusIds, setExpandedFocusIds] = useState<Set<string>>(
    () => new Set()
  );
  const ancestorsExpanded = expandedFocusIds.has(resolvedFocus);
  const toggleAncestors = useCallback(() => {
    setExpandedFocusIds((prev) => {
      const next = new Set(prev);
      if (next.has(resolvedFocus)) next.delete(resolvedFocus);
      else next.add(resolvedFocus);
      return next;
    });
  }, [resolvedFocus]);

  const allAncestors = useMemo(() => ancestorsOf(resolvedFocus), [resolvedFocus]);

  // Whole branch: expanded → every ancestor; collapsed → none (all behind the pill).
  const visibleAncestors = ancestorsExpanded ? allAncestors : [];
  const collapsedCount = ancestorsExpanded ? 0 : allAncestors.length;
  // Avatars previewed inside the collapsed pill (closest 3, top-down order).
  const collapsedAncestors = useMemo(
    () => allAncestors.slice(0, collapsedCount),
    [allAncestors, collapsedCount]
  );

  // ── Direct reports + peers ─────────────────────────────────
  const focusedPerson = HUMI_ORG_PEOPLE[resolvedFocus] ?? HUMI_ORG_PEOPLE.marcus;
  const directReportIds = childIndex[resolvedFocus] ?? [];
  const peers = useMemo(() => {
    const mgr = focusedPerson.managerId;
    if (!mgr || !HUMI_ORG_PEOPLE[mgr]) return [];
    return (childIndex[mgr] ?? [])
      .filter((id) => id !== resolvedFocus)
      .map((id) => HUMI_ORG_PEOPLE[id])
      .filter((p): p is HumiOrgPerson => !!p);
  }, [focusedPerson.managerId, childIndex, resolvedFocus]);

  // ── Search: jump-focus to first match synchronously in the handler.
  // No useEffect: we do the focus jump inside handleSearch so React sees
  // both state updates in the same event batch, avoiding cascading renders.
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      const qLower = value.trim().toLowerCase();
      if (!qLower) return;
      for (const p of Object.values(HUMI_ORG_PEOPLE)) {
        if (
          p.name.toLowerCase().includes(qLower) ||
          p.role.toLowerCase().includes(qLower) ||
          (p.title ?? '').toLowerCase().includes(qLower) ||
          p.department.toLowerCase().includes(qLower)
        ) {
          if (p.id !== resolvedFocus) {
            setHistory((h) => [...h, resolvedFocus]);
            select(p.id);
          }
          break;
        }
      }
    },
    [setQuery, resolvedFocus, select]
  );

  // ── Peers carousel ref ─────────────────────────────────────
  const peersRowRef = useRef<HTMLDivElement>(null);
  const scrollPeers = (dir: 'prev' | 'next') => {
    peersRowRef.current?.scrollBy?.({
      left: dir === 'next' ? 320 : -320,
      behavior: 'smooth',
    });
  };

  // ── Right-panel bindings (unchanged) ─────────────────────────
  const allOrgUnits = useOrgUnits((s) => s.all);
  const person = focusedPerson; // alias for right panel (same node)

  const matchedOrgUnit = useMemo(() => {
    const dept = person.department.split(' · ')[0].trim();
    return (
      allOrgUnits.find(
        (u) =>
          u.nameTh === dept ||
          u.nameEn === dept ||
          u.nameTh.includes(dept) ||
          dept.includes(u.nameTh)
      ) ?? null
    );
  }, [allOrgUnits, person.department]);

  const manager = person.managerId ? HUMI_ORG_PEOPLE[person.managerId] : null;

  const firstName = person.name.split(' ')[0];

  return (
    <>
      {/* ── Page header ─────────────────────────────────────── */}
      {/* Page title ("ผังองค์กร") is rendered by the shell Topbar — don't repeat
          it here (was a duplicate H1). Keep the context eyebrow + export action. */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <CardEyebrow>สายบังคับบัญชา · โปรไฟล์พนักงาน</CardEyebrow>
        <Button variant="ghost" leadingIcon={<Download className="h-4 w-4" />}>
          ส่งออกการ์ด
        </Button>
      </header>

      {/* ── 2-col grid: lineage chart is the dominant column (1.5fr) so the
          wide Teams/Viva cards + peers carousel get room; profile detail (1fr). ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">

        {/* LEFT — Teams/Viva egocentric lineage */}
        <Card size="lg" className="lg:sticky lg:top-6 lg:self-start">

          {/* Toolbar: breadcrumb + search */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {/* Breadcrumb nav */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goRoot}
                aria-label="ไปยัง CEO / ราก"
                disabled={resolvedFocus === rootId}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-ink-soft hover:bg-canvas-soft disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Home className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={goBack}
                aria-label="ย้อนกลับ"
                disabled={history.length === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-ink-soft hover:bg-canvas-soft disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>

            {/* Search */}
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-hairline bg-surface px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="ค้นหาพนักงาน…"
                aria-label="ค้นหาพนักงาน"
                className="w-full bg-transparent text-small text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
          </div>

          {/* Lineage scroll column */}
          <div className="sforg-lineage-col" ref={lineageColRef}>

            {/* ── Manager-chain toggle — one pill gangs the WHOLE upline branch
                 (expand shows the full chain to the root; collapse hides it all). */}
            {allAncestors.length > 0 && (
              <>
                {ancestorsExpanded ? (
                  <button
                    type="button"
                    className="sforg-show-more"
                    onClick={toggleAncestors}
                    aria-expanded
                    aria-label="ย่อสายบังคับบัญชาทั้งหมด"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden />
                    ย่อสายบังคับบัญชา
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sforg-show-more"
                    onClick={toggleAncestors}
                    aria-expanded={false}
                    aria-label={`ดูสายบังคับบัญชาทั้งหมด ${collapsedCount} คน`}
                  >
                    <span className="sforg-avatar-stack">
                      {collapsedAncestors.slice(0, 3).reverse().map((aid) => {
                        const ap = HUMI_ORG_PEOPLE[aid];
                        return ap ? (
                          <Avatar
                            key={aid}
                            name={ap.name}
                            tone={avatarTone(ap.tone)}
                            size="sm"
                          />
                        ) : null;
                      })}
                    </span>
                    ดูสายบังคับบัญชา ({collapsedCount})
                  </button>
                )}
                <Connector />
              </>
            )}

            {/* ── Visible ancestors (2 closest or all if expanded) */}
            {visibleAncestors.map((aid, i) => {
              const ap = HUMI_ORG_PEOPLE[aid];
              if (!ap) return null;
              return (
                <div key={aid}>
                  {i > 0 && <Connector />}
                  <LineCard
                    person={ap}
                    childIndex={childIndex}
                    onClick={() => refocus(aid)}
                  />
                </div>
              );
            })}

            {/* Connector from last ancestor to focused card */}
            {visibleAncestors.length > 0 && <Connector />}

            {/* ── Focused person card (emphasized) */}
            <LineCard
              person={focusedPerson}
              childIndex={childIndex}
              onClick={() => {/* clicking focused card: no-op / already focused */}}
              focused
            />

            {/* View profile button below focused card */}
            <div className="mt-3 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<IdCard className="h-3.5 w-3.5" />}
              >
                ดูโปรไฟล์เต็ม
              </Button>
            </div>

            {/* ── Direct reports section */}
            {directReportIds.length > 0 && (
              <>
                <SectionDivider>
                  ผู้ที่รายงานต่อ{' '}
                  <strong>{firstName}</strong>
                </SectionDivider>

                {directReportIds.map((rid, i) => {
                  const rp = HUMI_ORG_PEOPLE[rid];
                  if (!rp) return null;
                  return (
                    <div key={rid}>
                      {i > 0 && <div className="h-2" />}
                      <LineCard
                        person={rp}
                        childIndex={childIndex}
                        onClick={() => refocus(rid)}
                      />
                    </div>
                  );
                })}
              </>
            )}

            {/* ── Peers carousel section */}
            {peers.length > 0 && (
              <>
                <SectionDivider>
                  <strong>{firstName}</strong> ทำงานร่วมกับ{' '}
                  <Info className="inline h-3 w-3 align-middle text-ink-faint" aria-hidden />
                </SectionDivider>

                <div className="sforg-carousel-wrap">
                  {peers.length > 3 && (
                    <button
                      type="button"
                      className="sforg-carousel-btn prev"
                      onClick={() => scrollPeers('prev')}
                      aria-label="เลื่อนซ้าย"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                  <div className="sforg-peers-row" ref={peersRowRef}>
                    {peers.map((peer) => (
                      <PeerCard
                        key={peer.id}
                        person={peer}
                        onClick={() => refocus(peer.id)}
                      />
                    ))}
                  </div>
                  {peers.length > 3 && (
                    <button
                      type="button"
                      className="sforg-carousel-btn next"
                      onClick={() => scrollPeers('next')}
                      aria-label="เลื่อนขวา"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* RIGHT — Employee profile (preserved verbatim) */}
        <div className="flex flex-col gap-4">
          {/* Profile header card with gradient band + stats */}
          <Card size="lg" flush className="overflow-hidden">
            <div
              aria-hidden
              className="relative h-16 bg-[linear-gradient(110deg,var(--color-ink)_0%,var(--color-ink-soft)_100%)]"
            >
              <span className="pointer-events-none absolute -top-4 right-10 block h-28 w-24 rounded-full bg-[color:var(--color-accent)] opacity-40 blur-2xl" />
              <span className="pointer-events-none absolute top-5 right-36 block h-16 w-16 rounded-full bg-[color:var(--color-butter)] opacity-40 blur-xl" />
            </div>
            <div className="px-6 pb-5 pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar
                  name={person.name}
                  tone={avatarTone(person.tone)}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[length:var(--text-display-h2)] font-semibold tracking-tight text-ink">
                    {person.name}
                  </h2>
                  <p className="mt-1 text-small leading-relaxed text-ink-muted">
                    {person.title ?? person.role} · {person.department}
                    {manager && (
                      <>
                        {' · รายงานต่อ '}
                        <span className="font-semibold text-ink-soft">
                          {manager.name}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leadingIcon={<Send className="h-3.5 w-3.5" />}
                >
                  ส่งข้อความ
                </Button>
                <Button variant="primary" size="sm">
                  ดูโปรไฟล์เต็ม
                </Button>
              </div>
            </div>
            <dl className="grid grid-cols-2 border-t border-hairline sm:grid-cols-4">
              {[
                { label: 'อายุงาน', value: person.tenure ?? '—' },
                {
                  label: 'ที่ตั้ง',
                  value: person.location ?? person.department,
                },
                {
                  label: 'ผลประเมินล่าสุด',
                  value: person.reviewSummary ?? '—',
                },
                {
                  label: 'วันลาคงเหลือ',
                  value: person.leaveRemaining ?? '—',
                },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={cn(
                    'px-4 py-3.5',
                    i > 0 && 'sm:border-l border-hairline'
                  )}
                >
                  <CardEyebrow>{stat.label}</CardEyebrow>
                  <dd className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Contact + Employment */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card size="md">
              <CardEyebrow>ช่องทางติดต่อ</CardEyebrow>
              <ul className="mt-3 flex flex-col gap-2.5 text-small">
                <li className="flex items-center gap-2 text-ink-soft">
                  <Mail className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
                  <span className="truncate">{person.email ?? '—'}</span>
                </li>
                {person.phone && (
                  <li className="flex items-center gap-2 text-ink-soft">
                    <Phone className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
                    <span>{person.phone}</span>
                  </li>
                )}
                {person.timezone && (
                  <li className="flex items-center gap-2 text-ink-muted">
                    <Clock className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
                    <span>{person.timezone}</span>
                  </li>
                )}
                {person.language && (
                  <li className="flex items-center gap-2 text-ink-muted">
                    <BookOpen
                      className="h-3.5 w-3.5 text-ink-muted"
                      aria-hidden
                    />
                    <span>{person.language}</span>
                  </li>
                )}
              </ul>
            </Card>
            <Card size="md">
              {/* BRD #8, #9, #11: FODepartment fields bound to OrgUnits store */}
              {/* SF cite: sf-extract/qas-fields-2026-04-26/sf-qas-FODepartment-2026-04-26.json */}
              <CardEyebrow>ข้อมูลการจ้างงาน</CardEyebrow>
              <dl className="mt-3 flex flex-col gap-2.5">
                {(
                  [
                    ['ประเภท', person.employmentType],
                    ['ระดับ', person.grade],
                    // BRD #8: costCenter from FODepartment store (live) or fallback to person mock
                    ['ศูนย์ต้นทุน', matchedOrgUnit?.costCenter ?? person.costCenter],
                    ['เริ่มงาน', person.hiredOn],
                    ['ผลตอบแทน', person.compensation],
                    // BRD #8: parentUnit from FODepartment store (live OrgUnit hierarchy)
                    ['หน่วยงานต้นสังกัด', matchedOrgUnit?.parentId ?? person.parentUnit],
                  ] as const
                )
                  .filter(([, v]) => !!v)
                  .map(([label, value]) => (
                    <DetailRow
                      key={label}
                      label={label}
                      value={value as string}
                    />
                  ))}
              </dl>
              {/* BRD #9: effective-date + status A/I indicator from FODepartment store */}
              {(matchedOrgUnit ||
                person.effectiveStartDate ||
                person.unitStatus) && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-hairline pt-3">
                  {(matchedOrgUnit?.effectiveStartDate ??
                    person.effectiveStartDate) && (
                    <span className="text-small text-ink-muted">
                      มีผลตั้งแต่:{' '}
                      {new Date(
                        matchedOrgUnit?.effectiveStartDate ??
                          person.effectiveStartDate!
                      ).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  {/* BRD #9: status A/I from FODepartment store .active field */}
                  <span
                    className={`humi-tag ${(matchedOrgUnit?.active ?? person.unitStatus === 'A') ? 'humi-tag--accent' : ''}`}
                  >
                    {(matchedOrgUnit?.active ?? person.unitStatus !== 'I')
                      ? 'Active'
                      : 'Inactive'}
                  </span>
                  {/* BRD #11: bilingual Thai department name from FODepartment store */}
                  {(matchedOrgUnit?.nameTh ?? person.nameTh) && (
                    <span className="text-small text-ink-soft">
                      {matchedOrgUnit?.nameTh ?? person.nameTh}
                    </span>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Skills */}
          {person.skills && (
            <Card size="md">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <CardEyebrow>ทักษะและจุดแข็ง</CardEyebrow>
                  <h3 className="mt-1 font-display text-[length:var(--text-display-h3)] font-semibold tracking-tight text-ink">
                    สิ่งที่ {firstName} ถนัด
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  leadingIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  รับรองทักษะ
                </Button>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {person.skills.map((skill) => (
                  <li
                    key={skill}
                    className="inline-flex items-center rounded-full bg-canvas-soft px-3 py-1 text-small text-ink-soft"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Goals */}
          {person.goals && (
            <Card size="md">
              <CardEyebrow>เป้าหมายครึ่งปีแรก 2568</CardEyebrow>
              <h3 className="mt-1 mb-4 font-display text-[length:var(--text-display-h3)] font-semibold tracking-tight text-ink">
                ความคืบหน้าปัจจุบัน
              </h3>
              <ul className="flex flex-col gap-3.5">
                {person.goals.map((goal) => (
                  <li key={goal.label}>
                    <div className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-small font-medium text-ink">
                        {goal.label}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {goal.progress}%
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={goal.progress}
                      aria-label={goal.label}
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--color-hairline)]"
                    >
                      <span
                        className="block h-full rounded-full bg-[color:var(--color-accent)]"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Certifications + Upcoming */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {person.certifications && (
              <Card size="md">
                <CardEyebrow>ใบรับรอง</CardEyebrow>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {person.certifications.map((cert) => (
                    <li
                      key={cert.name}
                      className="flex items-center gap-3 text-small"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'h-2.5 w-2.5 shrink-0 rounded-full',
                          CERT_DOT_TONE[cert.tone]
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-ink">
                        {cert.name}
                      </span>
                      <span className="shrink-0 text-ink-muted">
                        {cert.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {person.upcoming && (
              <Card size="md">
                <CardEyebrow>กำหนดการที่จะถึง</CardEyebrow>
                <ul className="mt-3 flex flex-col gap-3">
                  {person.upcoming.map((event) => (
                    <li key={event.title} className="flex gap-3">
                      <span
                        aria-hidden
                        className="inline-block w-1 shrink-0 self-stretch rounded-full bg-[color:var(--color-accent)]"
                      />
                      <div className="min-w-0">
                        <p className="text-small font-medium text-ink">
                          {event.title}
                        </p>
                        <p className="text-xs text-ink-muted">{event.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* HR note — dark/ink card */}
          {person.hrNote && (
            <Card
              size="md"
              className="relative overflow-hidden border-transparent bg-ink text-canvas"
            >
              <span className="pointer-events-none absolute -top-6 -right-6 block h-24 w-24 rounded-full bg-[color:var(--color-accent)] opacity-30 blur-2xl" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
                บันทึก HR · สำหรับผู้จัดการ
              </span>
              <p className="mt-2 text-small leading-relaxed text-canvas-soft">
                {person.hrNote}
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

export type { HumiOrgTone };
