'use client';

// ════════════════════════════════════════════════════════════
// QuickApproveSimple — simplified approvals queue (PR-5 Req7)
// Unified inbox at /quick-approve. DataTable + segmented filter.
// Rows derive status from the source store (no local override map). Clicking a
// ROW opens the RequestDetailModal popup (Approve / Cancel / Open full page) in
// place — the table stays the LIST. Reject/Return live on the full-page surface
// reached via the popup's "Open full page" link.
// Danger = --color-danger (pumpkin). No Tailwind red/rose/pink. No hex.
// ════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Square, CheckSquare, MinusSquare, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/humi';
import { Button } from '@/components/humi';
import { Capability } from '@/components/humi';
import { DataTable, type DataTableColumn } from '@/components/humi';
import { isTerminationId, useSelectPendingApprovals, type QueueApproval } from '@/lib/approval-registry';
import { moduleOf, type PendingRequest, type ClaimDetails, type WorkflowModule } from '@/lib/quick-approve-api';
import { useAuthStore } from '@/stores/auth-store';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useQuickApproveAssignments, type Assignee } from '@/stores/quick-approve-assignments';
import { canActOn, countActionable } from '@/lib/claim-permissions';
import { nextApproverLabel } from '@/lib/approval-routing';
import { RequestDetailModal } from '@/components/quick-approve/RequestDetailModal';
import { useBulkApproveDispatch } from '@/components/quick-approve/useBulkApproveDispatch';
import { BulkActionModal } from '@/components/quick-approve/BulkActionModal';

// Demo manager actor for mock dispatch (mirrors workflows/benefit-claim/[id]).
const MANAGER_NAME = 'ผู้จัดการ / Manager';

// ── Types ────────────────────────────────────────────────────

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';
// STA-178 — module filter dimension ('ALL' + the 4 workflow modules).
type ModuleFilter = WorkflowModule | 'ALL';
const MODULE_FILTERS: ModuleFilter[] = ['ALL', 'EC', 'BE', 'TM', 'PY'];

// ── Helpers ──────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} · ${time}`;
}

function typeLabel(type: PendingRequest['type']): string {
  const map: Record<PendingRequest['type'], string> = {
    leave: 'ลา',
    overtime: 'ล่วงเวลา',
    claim: 'เบิกค่าใช้จ่าย',
    transfer: 'โอนย้าย',
    change_request: 'แก้ไขข้อมูล',
    probation: 'ทดลองงาน',
    pay_rate: 'ปรับเงินเดือน',
    tax_planning: 'วางแผนภาษี',
    time_correction: 'แก้ไขเวลา',
    shift_assignment: 'จัดกะ',
  };
  return map[type] ?? type;
}

// Detail drill-in route. pay_rate / tax_planning live under /workflows/<type>/[id]
// (their own detail pages); everything else opens the unified /quick-approve/[id].
function detailHref(locale: string, row: PendingRequest): string {
  // Resignations ride the change_request vehicle (locked RequestType) but drill
  // into their own offboarding-approval surface; detect by the TR-* id.
  if (row.type === 'change_request' && isTerminationId(row.id)) {
    return `/${locale}/workflows/resignation/${row.id}`;
  }
  if (row.type === 'pay_rate') return `/${locale}/workflows/pay-rate/${row.id}`;
  if (row.type === 'tax_planning') return `/${locale}/workflows/tax-planning/${row.id}`;
  if (row.type === 'time_correction') return `/${locale}/workflows/time-correction/${row.id}`;
  if (row.type === 'leave') return `/${locale}/workflows/leave/${row.id}`;
  if (row.type === 'overtime') return `/${locale}/workflows/ot/${row.id}`;
  if (row.type === 'probation') return `/${locale}/workflows/probation/${row.id}`;
  // STA-168 — a submitted shift-assignment group deep-links into its OWN review
  // grid (the deliberate per-type convention break, D3). Read-only is enforced at
  // the renderer, NOT by this `&review=1` param (which is forgeable).
  if (row.type === 'shift_assignment') return `/${locale}/team/shift-assign?group=${row.id}&review=1`;
  return `/${locale}/quick-approve/${row.id}`;
}

// Show the typed id as-is; truncate long timestamp ids to keep columns compact.
// e.g. "LV-20260611-123456-A1B2" → "LV-20260611-…B2"  "BEN-CLM-0001" → unchanged
function displayRef(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 12)}…${id.slice(-3)}`;
}

// ── Component ────────────────────────────────────────────────

export function QuickApproveSimple() {
  const t = useTranslations('quickApprove.simple');

  // PR-1b: rows now DERIVE from the seeded stores (single source of truth) instead
  // of the static MOCK_PENDING_REQUESTS array. The selector collapses the store
  // status enums (pending_spd/pending_hr/pending_manager(_approval)) → pending for
  // the 3-state filter below.
  const locale = useLocale();
  const roles = useAuthStore((s) => s.roles);
  const queue = useSelectPendingApprovals();
  const rows = useMemo<PendingRequest[]>(() => queue.map((q) => q.row), [queue]);
  // Look up the full QueueApproval (status + awaitingNext) by row id so the
  // actions column can ask the DEFAULT-SCOPE predicate canActOn(item, roles).
  const queueById = useMemo<Record<string, QueueApproval>>(
    () => Object.fromEntries(queue.map((q) => [q.row.id, q])),
    [queue],
  );
  // HONEST COUNT — rows THIS persona can actually act on (not a global number).
  const actionableCount = useMemo(() => countActionable(queue, roles), [queue, roles]);
  // PR-1c: status DERIVES from the store (via the selector) — no local override
  // map. Approve/reject dispatch to the source store and the row re-renders from
  // the new store status.
  const seededStatus = useMemo<Record<string, 'pending' | 'approved' | 'rejected'>>(
    () => Object.fromEntries(queue.map((q) => [q.row.id, q.status])),
    [queue],
  );
  // Rows where the first approver has acted but a later step is still pending
  // (e.g. a claim the manager approved → now awaiting SPD). Drives the explicit
  // "awaiting next approver" chip so an approved-but-not-terminal row never looks
  // unactioned (AC-1c.2).
  const awaitingNext = useMemo<Record<string, boolean>>(
    () => Object.fromEntries(queue.filter((q) => q.awaitingNext).map((q) => [q.row.id, true])),
    [queue],
  );

  // STA-88 — per-row "assign to me" state. The current persona is the assignee
  // candidate; rows fall back to their seeded `assignedApprover` until overridden.
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const me: Assignee = { id: userId ?? 'me', name: username ?? MANAGER_NAME };
  const assignmentOverrides = useQuickApproveAssignments((s) => s.assignments);
  const assignToMe = useQuickApproveAssignments((s) => s.assignToMe);
  const unassign = useQuickApproveAssignments((s) => s.unassign);

  // ── Inline bulk multi-select (restored; shared engine with /quick-approve/bulk).
  // Gated by the bulkApprove capability (RBAC remove-not-hide: personas without it
  // see the classic single-row inbox — no checkboxes at all).
  const canBulk = useCapabilities().canDo('bulkApprove');
  const bulk = useBulkApproveDispatch({ name: username ?? MANAGER_NAME });
  const [bulkDone, setBulkDone] = useState<{ action: 'approve' | 'reject'; count: number } | null>(
    null,
  );
  // Auto-dismiss the success toast.
  useEffect(() => {
    if (!bulkDone) return;
    const timer = setTimeout(() => setBulkDone(null), 3200);
    return () => clearTimeout(timer);
  }, [bulkDone]);

  function assigneeOf(row: PendingRequest): Assignee | null {
    if (Object.prototype.hasOwnProperty.call(assignmentOverrides, row.id)) {
      return assignmentOverrides[row.id];
    }
    return row.assignedApprover
      ? { id: row.assignedApprover.id, name: row.assignedApprover.name }
      : null;
  }

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  // STA-178 — module scope filter (broader than the status tabs). Default 'ALL'.
  const [activeModule, setActiveModule] = useState<ModuleFilter>('ALL');

  // Clear the bulk selection whenever the tab/module filter changes so a
  // selection made under one filter can't silently act on now-hidden rows (the
  // action-bar count is global). Keeps "N selected" honest to what's on screen.
  useEffect(() => {
    bulk.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear only on filter change
  }, [activeTab, activeModule]);

  // STA-172 — the request-detail POPUP. Clicking a row selects it; the modal
  // mounts the generic detail + Approve / Cancel / Open-full-page.
  const [selected, setSelected] = useState<PendingRequest | null>(null);

  // Effective status = the collapsed store status (no local override).
  function effectiveStatus(req: PendingRequest): 'pending' | 'approved' | 'rejected' {
    return seededStatus[req.id] ?? 'pending';
  }

  // Tab counts.
  const pendingCount  = rows.filter((r) => effectiveStatus(r) === 'pending').length;
  const approvedCount = rows.filter((r) => effectiveStatus(r) === 'approved').length;
  const rejectedCount = rows.filter((r) => effectiveStatus(r) === 'rejected').length;

  // Filtered rows — module scope (STA-178) intersected with the status tab.
  const visibleRows = rows.filter((r) => {
    if (activeModule !== 'ALL' && moduleOf(r.type) !== activeModule) return false;
    const status = effectiveStatus(r);
    if (activeTab === 'all')      return true;
    if (activeTab === 'pending')  return status === 'pending';
    if (activeTab === 'approved') return status === 'approved';
    if (activeTab === 'rejected') return status === 'rejected';
    return true;
  });

  // Bulk affordance shows only on tabs that can contain pending rows; on the
  // approved/rejected tabs the whole multi-select UI hides.
  const bulkTabActive = activeTab !== 'approved' && activeTab !== 'rejected';
  const bulkEnabled = canBulk && bulkTabActive;
  // Selectable = only actionable pending rows for THIS viewer, using the SAME
  // predicate the per-row Approve uses (canActOn) — no self-approval leak. Select-
  // all respects the active filters (only the currently visibleRows).
  const selectableIds = bulkEnabled
    ? visibleRows
        .filter((r) => {
          if (effectiveStatus(r) !== 'pending') return false;
          const item = queueById[r.id];
          return item ? canActOn(item, roles) : false;
        })
        .map((r) => r.id)
    : [];
  const selectableIdSet = new Set(selectableIds);
  const allSelectableSelected =
    selectableIds.length > 0 && selectableIds.every((id) => bulk.isSelected(id));
  const someSelectableSelected = selectableIds.some((id) => bulk.isSelected(id));

  async function handleBulkConfirm() {
    // Pass the full row set so every selected id resolves to its type even if the
    // active filter changed after selection.
    const result = await bulk.dispatch(rows);
    if (result) setBulkDone(result);
  }

  // ── Columns ──────────────────────────────────────────────

  const columns: DataTableColumn<PendingRequest>[] = [
    {
      id: 'ref',
      header: t('columns.ref'),
      cell: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ink-muted)' }}>
          {displayRef(row.id)}
        </span>
      ),
      className: 'w-28',
    },
    {
      id: 'employeeId',
      header: t('columns.employeeId'),
      // STA-128: the emp code is the requester's structural identifier. Adapters
      // populate the explicit `employeeId` field; the static seed fixtures carry
      // the same code in `requester.id` (codebase invariant: id === employeeId for
      // every real requester, '' only for the source-less generic placeholder).
      // Read employeeId first, fall back to a non-empty id, else '—' — never parse
      // the description string.
      cell: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ink-muted)' }}>
          {row.requester.employeeId || row.requester.id || '—'}
        </span>
      ),
      className: 'w-28',
    },
    {
      id: 'employee',
      header: t('columns.employee'),
      cell: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="humi-avatar humi-avatar--teal"
            style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}
            aria-hidden
          >
            {row.requester.name.slice(0, 2)}
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
              {row.requester.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>
              {row.requester.department}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      header: t('columns.type'),
      cell: (row) => (
        <span className="humi-tag" style={{ fontSize: 12 }}>
          {row.type === 'change_request' && isTerminationId(row.id) ? 'ลาออก' : typeLabel(row.type)}
        </span>
      ),
      className: 'w-32',
    },
    {
      id: 'filed',
      header: t('columns.filed'),
      cell: (row) => (
        <span style={{ fontSize: 12, color: 'var(--color-ink-muted)', whiteSpace: 'nowrap' }}>
          {formatDateTime(row.submittedAt)}
        </span>
      ),
      className: 'w-36',
      sortAccessor: (row) => row.submittedAt,
    },
    {
      id: 'submitDate',
      header: t('columns.submitDate'),
      cell: (row) => (
        <span style={{ fontSize: 12, color: 'var(--color-ink-muted)', whiteSpace: 'nowrap' }}>
          {formatDateTime(row.submitDate ?? row.submittedAt)}
        </span>
      ),
      className: 'w-36',
      sortAccessor: (row) => row.submitDate ?? row.submittedAt,
    },
    {
      id: 'detail',
      header: t('columns.detail'),
      cell: (row) => (
        <span style={{ fontSize: 13, color: 'var(--color-ink-soft)', maxWidth: 260, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.description}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('columns.status'),
      cell: (row) => {
        const status = effectiveStatus(row);
        // P4: a small "next: <routed approver>" hint under the status chip so the
        // queue speaks truth about WHO the row is currently routed to.
        const item = queueById[row.id];
        const nextLabel =
          status === 'pending' && item ? nextApproverLabel(item, locale) : null;
        const nextHint = nextLabel ? (
          <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginTop: 2 }}>
            {t('nextApprover', { approver: nextLabel })}
          </div>
        ) : null;
        // AC-1c.2: a still-pending row whose first approver has acted shows an
        // explicit "awaiting next approver" chip instead of looking unactioned.
        if (status === 'pending' && awaitingNext[row.id]) {
          return (
            <div>
              <span className="humi-tag humi-tag--butter" style={{ fontSize: 12 }}>
                {t('status.awaitingNext')}
              </span>
              {nextHint}
            </div>
          );
        }
        const badgeClass =
          status === 'approved' ? 'humi-tag humi-tag--accent' :
          status === 'rejected' ? 'humi-tag' :
          'humi-tag humi-tag--butter';
        return (
          <div>
            <span className={badgeClass} style={{ fontSize: 12 }}>{t(`status.${status}`)}</span>
            {nextHint}
          </div>
        );
      },
      className: 'w-28',
    },
    {
      id: 'assignTo',
      header: t('columns.assignTo'),
      cell: (row) => {
        const mine = assigneeOf(row)?.id === me.id;
        return (
          <Button
            variant={mine ? 'secondary' : 'ghost'}
            size="sm"
            onClick={(e) => {
              // Don't open the row's detail popup when assigning.
              e.stopPropagation();
              mine ? unassign(row.id) : assignToMe(row.id, me);
            }}
          >
            {mine ? t('actions.assigned') : t('actions.assignToMe')}
          </Button>
        );
      },
      className: 'w-32',
    },
    {
      id: 'assignedPeople',
      header: t('columns.assignedPeople'),
      cell: (row) => {
        const assignee = assigneeOf(row);
        if (!assignee) return <span style={{ color: 'var(--color-ink-muted)' }}>—</span>;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="humi-avatar humi-avatar--teal"
              style={{ width: 24, height: 24, fontSize: 10, flexShrink: 0 }}
              aria-hidden
            >
              {assignee.name.trim().charAt(0)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-ink)' }}>{assignee.name}</span>
          </div>
        );
      },
      className: 'w-44',
    },
    {
      id: 'totalClaimAmount',
      header: t('columns.totalClaimAmount'),
      cell: (row) => {
        if (row.type !== 'claim') {
          return <span style={{ color: 'var(--color-ink-muted)' }}>—</span>;
        }
        const details = row.details as ClaimDetails;
        const amount = details.totalClaimAmount ?? details.amount;
        return (
          <span
            style={{
              fontSize: 13,
              color: 'var(--color-ink)',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            ฿{amount.toLocaleString('th-TH')}
          </span>
        );
      },
      className: 'w-32',
      sortAccessor: (row) =>
        row.type === 'claim'
          ? (row.details as ClaimDetails).totalClaimAmount ?? (row.details as ClaimDetails).amount
          : -1,
    },
    {
      id: 'actions',
      header: '',
      headerVisuallyHidden: true,
      cell: (row) => {
        // The ROW is the affordance now (click → RequestDetailModal popup), so the
        // old actions-column "View" link is gone. A still-pending row this persona
        // CANNOT act on keeps the explicit "view only" badge so the read-only scope
        // stays transparent.
        const status = effectiveStatus(row);
        if (status !== 'pending') return null;
        const item = queueById[row.id];
        const actable = item ? canActOn(item, roles) : false;
        if (!actable) {
          return (
            <span
              className="humi-tag"
              style={{ fontSize: 12 }}
              data-testid="view-only-badge"
            >
              {t('actions.viewOnly')}
            </span>
          );
        }
        return null;
      },
      className: 'w-32',
    },
  ];

  // Leading checkbox column (only when bulk is enabled for this persona/tab).
  // The cell renders a checkbox ONLY for selectable rows; clicking it must not
  // open the row detail popup (stopPropagation).
  const selectColumn: DataTableColumn<PendingRequest> = {
    id: 'bulkSelect',
    header: (
      <button
        type="button"
        onClick={() => bulk.toggleAll(selectableIds)}
        disabled={selectableIds.length === 0}
        aria-label={t('bulk.selectAll')}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: selectableIds.length ? 'pointer' : 'default',
        }}
      >
        {allSelectableSelected ? (
          <CheckSquare className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden />
        ) : someSelectableSelected ? (
          <MinusSquare className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden />
        ) : (
          <Square className="h-4 w-4" style={{ color: 'var(--color-ink-muted)' }} aria-hidden />
        )}
      </button>
    ),
    headerVisuallyHidden: false,
    cell: (row) => {
      if (!selectableIdSet.has(row.id)) return null;
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            bulk.toggle(row.id);
          }}
          aria-label={t('bulk.selectRow', { ref: displayRef(row.id) })}
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          {bulk.isSelected(row.id) ? (
            <CheckSquare className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden />
          ) : (
            <Square className="h-4 w-4" style={{ color: 'var(--color-ink-muted)' }} aria-hidden />
          )}
        </button>
      );
    },
    className: 'w-10',
  };

  const displayColumns = bulkEnabled ? [selectColumn, ...columns] : columns;

  // ── Render ───────────────────────────────────────────────

  // HONEST COUNT on the Pending tab: show what THIS persona can act on, not the
  // global pending total (which would imply false workload for a view-only role).
  const tabs: { key: FilterTab; count: number }[] = [
    { key: 'all',      count: rows.length },
    { key: 'pending',  count: actionableCount },
    { key: 'approved', count: approvedCount },
    { key: 'rejected', count: rejectedCount },
  ];

  // STA-178 — per-module row counts for the module filter strip.
  const moduleCounts = MODULE_FILTERS.reduce<Record<ModuleFilter, number>>((acc, m) => {
    acc[m] = m === 'ALL' ? rows.length : rows.filter((r) => moduleOf(r.type) === m).length;
    return acc;
  }, {} as Record<ModuleFilter, number>);
  const moduleLabelKey: Record<ModuleFilter, string> = {
    ALL: 'moduleFilter.all', EC: 'moduleFilter.ec', BE: 'moduleFilter.be', TM: 'moduleFilter.tm', PY: 'moduleFilter.py',
  };

  return (
    <div className="pb-8">
      {/* Breadcrumb */}
      <div className="humi-eyebrow" style={{ marginBottom: 6 }}>
        {t('breadcrumb')}
      </div>

      {/* Title + subtitle */}
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink" style={{ marginBottom: 4 }}>
        {t('title')}
      </h1>
      {/* HONEST COUNT: actionable (what THIS persona can decide) vs total pending.
          A view-only persona sees actionable=0 even when rows are visible. */}
      <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', marginBottom: 20 }}>
        {t('subtitleActionable', { actionable: actionableCount, total: pendingCount })}
      </p>

      {/* STA-178 — module filter strip (broader scope, sits above the status tabs).
          Uses aria-pressed toggle buttons (not role=tab) so it doesn't collide with
          the status tablist. */}
      <div
        role="group"
        aria-label={t('moduleFilter.label')}
        data-testid="module-filter"
        style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}
      >
        {MODULE_FILTERS.map((m) => (
          <button
            key={m}
            type="button"
            data-module={m}
            aria-pressed={activeModule === m}
            onClick={() => setActiveModule(m)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-hairline)',
              background: activeModule === m ? 'var(--color-accent-soft)' : 'var(--color-canvas-soft)',
              color: activeModule === m ? 'var(--color-accent)' : 'var(--color-ink-soft)',
              fontWeight: activeModule === m ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background var(--dur-base)',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            {t(moduleLabelKey[m])}
            <span
              style={{
                background: 'var(--color-hairline)',
                borderRadius: 99,
                fontSize: 11,
                padding: '0 6px',
                lineHeight: '18px',
              }}
            >
              {moduleCounts[m]}
            </span>
          </button>
        ))}
      </div>

      {/* Segmented filter tabs */}
      <div
        role="tablist"
        aria-label={t('title')}
        style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}
      >
        {tabs.map(({ key, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-hairline)',
              background: activeTab === key ? 'var(--color-accent-soft)' : 'var(--color-canvas-soft)',
              color: activeTab === key ? 'var(--color-accent)' : 'var(--color-ink-soft)',
              fontWeight: activeTab === key ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background var(--dur-base)',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            {t(`filter.${key}`)}
            <span
              style={{
                background: 'var(--color-hairline)',
                borderRadius: 99,
                fontSize: 11,
                padding: '0 6px',
                lineHeight: '18px',
              }}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <DataTable<PendingRequest>
          caption={t('title')}
          captionVisuallyHidden
          columns={displayColumns}
          rows={visibleRows}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelected(row)}
          dense
        />
      </Card>

      {/* Inline bulk affordance — gated by bulkApprove capability (RBAC remove). */}
      <Capability action="bulkApprove">
        {bulkTabActive && bulk.selectedIds.size > 0 && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              zIndex: 10,
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-hairline)',
              background: 'var(--color-surface)',
              padding: '12px 20px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>
              {t('bulk.selectedCount', { count: bulk.selectedIds.size })}
            </span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Button variant="ghost" size="sm" onClick={bulk.clear}>
                {t('bulk.clear')}
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => bulk.openAction('reject')}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" aria-hidden />
                {t('bulk.reject')}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => bulk.openAction('approve')}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {t('bulk.approveSelected', { count: bulk.selectedIds.size })}
              </Button>
            </div>
          </div>
        )}

        {bulk.pendingAction && (
          <BulkActionModal
            action={bulk.pendingAction}
            reason={bulk.reason}
            onReasonChange={bulk.setReason}
            onConfirm={handleBulkConfirm}
            onClose={bulk.closeAction}
            submitting={bulk.submitting}
            canConfirm={bulk.canConfirm}
            labels={{
              approveTitle: t('bulk.confirmApproveTitle', { count: bulk.selectedIds.size }),
              rejectTitle: t('bulk.confirmRejectTitle', { count: bulk.selectedIds.size }),
              approveDesc: t('bulk.approveConfirmDesc', { count: bulk.selectedIds.size }),
              reasonLabel: t('bulk.rejectReason'),
              reasonPlaceholder: t('bulk.rejectReasonPlaceholder'),
              cancel: t('bulk.cancel'),
              confirm: t('bulk.confirm'),
              submitting: t('bulk.submitting'),
            }}
          />
        )}

        {bulkDone && (
          <div
            role="status"
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-hairline)',
              background: 'var(--color-surface)',
              padding: '10px 18px',
              boxShadow: 'var(--shadow-md)',
              fontSize: 13,
              color: 'var(--color-ink)',
            }}
          >
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden />
            {bulkDone.action === 'approve'
              ? t('bulk.approveSuccess', { count: bulkDone.count })
              : t('bulk.rejectSuccess', { count: bulkDone.count })}
          </div>
        )}
      </Capability>

      {/* STA-172 — per-row detail POPUP (Approve / Cancel / Open full page). */}
      <RequestDetailModal
        request={selected}
        open={selected != null}
        onClose={() => setSelected(null)}
        fullPageHref={selected ? detailHref(locale, selected) : undefined}
        actorName={me.name}
      />
    </div>
  );
}
