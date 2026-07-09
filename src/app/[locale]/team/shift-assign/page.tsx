'use client';

// STA-168 — Shift Assignment (จัดกะให้พนักงาน) · manager month-grid scheduler.
//
// Pick a month → lay out each team member's shift per day → submit the whole
// month as ONE approvable unit. The SAME renderer serves the author (edit) and
// the approver (review) — mode is enforced HERE (the renderer), never by the
// forgeable `?review=1` URL param (D3).
//
// Ownership gate (D4): cells are editable iff status∈{draft,returned} AND
// managerIds.includes(selfEmpId) AND not review mode. "Viewing as" flips the
// role, not the identity, so the gate keys off the logged-in employee id (resolved
// via EMP_BY_LOGIN), never persona/role alone.
//
// MOCKUP ONLY: seed-only, no backend.

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarRange } from 'lucide-react';
import { Card, Button, EmptyState, Textarea } from '@/components/cnext';
import { useAuthStore } from '@/stores/auth-store';
import { EMP_BY_LOGIN } from '@/lib/all-ported-employees';
import { getHolidaysForPeriod } from '@/lib/time/holiday-calendar';
import {
  canEditShiftGroup,
  cellKey,
  filledCellCount,
  formatMonthLabel,
  monthDays,
  resolveEmpName,
  teamForGroup,
  type ShiftGroup,
} from '@/lib/shift-groups';
import { warningsByCell } from '@/lib/shift-assign/validation';
import { useShiftAssignment, type CellPatch } from '@/stores/shift-assignment';
import { ShiftAssignmentGrid, type GridMember } from '@/components/shift-assign/ShiftAssignmentGrid';
import { ShiftAssignBulkPanel } from '@/components/shift-assign/ShiftAssignBulkPanel';

const APPROVER_NAME = 'ฝ่ายบุคคล / HR';

function statusTone(status: ShiftGroup['status']): string {
  // NO-RED: returned = pumpkin/neutral, never red.
  if (status === 'approved') return 'cnext-tag cnext-tag--accent';
  if (status === 'pending') return 'cnext-tag cnext-tag--butter';
  return 'cnext-tag'; // draft / returned → neutral
}

export default function ShiftAssignPage() {
  const t = useTranslations('shiftAssign');
  const locale = useLocale();
  const isTh = locale !== 'en';
  const router = useRouter();
  const searchParams = useSearchParams();

  const reviewMode = searchParams?.get('review') === '1';
  const groupParam = searchParams?.get('group');

  const email = useAuthStore((s) => s.email);
  const selfEmpId = email ? EMP_BY_LOGIN[email] ?? null : null;

  const groups = useShiftAssignment((s) => s.groups);
  const upsertCell = useShiftAssignment((s) => s.upsertCell);
  const bulkApply = useShiftAssignment((s) => s.bulkApply);
  const clearCells = useShiftAssignment((s) => s.clearCells);
  const submit = useShiftAssignment((s) => s.submit);
  const approve = useShiftAssignment((s) => s.approve);
  const returnForRevision = useShiftAssignment((s) => s.returnForRevision);

  // Owned groups (for the author's month picker). In review mode we still resolve
  // the deep-linked group even if the reviewer doesn't own it.
  const ownedGroups = useMemo(
    () => groups.filter((g) => (selfEmpId ? g.managerIds.includes(selfEmpId) : false)),
    [groups, selfEmpId],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const resolvedId =
    groupParam ?? activeId ?? ownedGroups[0]?.id ?? groups[0]?.id ?? null;
  const group = groups.find((g) => g.id === resolvedId) ?? null;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [returnOpen, setReturnOpen] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  const goToInbox = () => router.push(`/${locale}/quick-approve`);

  const members = useMemo<GridMember[]>(() => {
    if (!group) return [];
    return teamForGroup(group).map((e) => ({
      id: e.id,
      name: resolveEmpName(e.id, isTh ? 'th' : 'en'),
      role: isTh ? e.position : e.jobTitle ?? e.position,
    }));
  }, [group, isTh]);

  const days = useMemo(() => (group ? monthDays(group.month) : []), [group]);
  const holidays = useMemo(
    () => (days.length ? getHolidaysForPeriod(days[0], days[days.length - 1]) : new Map()),
    [days],
  );
  const warnings = useMemo(() => (group ? warningsByCell(group) : {}), [group]);

  const editable = group ? canEditShiftGroup(group, selfEmpId) && !reviewMode : false;
  const canReview = reviewMode && group?.status === 'pending';

  if (!group) {
    return (
      <div className="pb-8">
        <EmptyState
          icon={CalendarRange}
          titleTh="ยังไม่มีตารางจัดกะ"
          titleEn="No shift assignment yet"
          descTh="ยังไม่มีเดือนที่ต้องจัดกะสำหรับทีมของคุณ"
          descEn="There is no month to schedule for your team yet."
        />
      </div>
    );
  }

  const toggleCell = (empId: string, date: string) => {
    if (!editable) return;
    const key = cellKey(empId, date);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedTargets = () =>
    Array.from(selected).map((k) => {
      const [empId, date] = k.split('::');
      return { empId, date };
    });

  const handleApply = (patch: CellPatch) => {
    const targets = selectedTargets();
    if (targets.length === 0) return;
    // Single-cell edits and range edits share ONE path (bulkApply over N targets).
    bulkApply(group.id, targets, patch);
    setSelected(new Set());
    flash(isTh ? `นำไปใช้กับ ${targets.length} ช่องแล้ว` : `Applied to ${targets.length} cells`);
  };

  const handleClearCells = () => {
    const targets = selectedTargets();
    if (targets.length === 0) return;
    clearCells(group.id, targets);
    setSelected(new Set());
  };

  const selectWholeMonth = () => {
    const next = new Set<string>();
    for (const m of members) for (const d of days) next.add(cellKey(m.id, d));
    setSelected(next);
  };

  const handleSubmit = () => {
    submit(group.id);
    flash(t('submittedToast'));
    goToInbox();
  };

  const handleApprove = () => {
    approve(group.id, { name: APPROVER_NAME });
    flash(t('approvedToast'));
    goToInbox();
  };

  const handleReturn = () => {
    if (!note.trim()) return;
    returnForRevision(group.id, note.trim(), { name: APPROVER_NAME });
    setReturnOpen(false);
    flash(t('returnedToast'));
    goToInbox();
  };

  const totalCells = members.length * days.length;
  const filled = filledCellCount(group);
  const managerName = resolveEmpName(group.managerIds[0] ?? '', isTh ? 'th' : 'en');

  return (
    <div className="pb-8 flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="cnext-eyebrow">
          {isTh ? 'CNEXT • บริหารทีม • จัดกะ' : 'CNEXT • TEAM MANAGEMENT • SHIFT ASSIGNMENT'}
        </span>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{t('title')}</h1>
          <span className={statusTone(group.status)} style={{ fontSize: 12 }}>
            {t(`status.${group.status}`)}
          </span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>
          {formatMonthLabel(group.month, isTh ? 'th' : 'en')} · {managerName} · {members.length}{' '}
          {isTh ? 'คน' : 'members'}
        </p>
      </header>

      {/* Viewing-as / review-mode banner (read-only enforced at the renderer). */}
      {reviewMode && (
        <div role="note" className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-4 py-2.5 text-small text-ink-muted">
          {t('reviewBanner')}
        </div>
      )}

      {/* Returned note — pumpkin/neutral, NO-RED. */}
      {group.status === 'returned' && group.returnNote && (
        <div
          role="note"
          className="rounded-[var(--radius-md)] px-4 py-2.5 text-small"
          style={{ border: '1px solid var(--color-danger)', background: 'var(--color-danger-soft, var(--color-canvas-soft))', color: 'var(--color-ink)' }}
          data-testid="shift-assign-return-note"
        >
          <strong>{t('returnNoteLabel')}:</strong> {group.returnNote}
        </div>
      )}

      {toast && (
        <div role="status" className="rounded-[var(--radius-md)] border border-accent bg-accent-soft px-4 py-2.5 text-small font-medium text-accent">
          {toast}
        </div>
      )}

      {/* Month picker (author only, multiple owned months). */}
      {!reviewMode && ownedGroups.length > 1 && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{t('monthPicker')}</span>
          <select
            aria-label={t('monthPicker')}
            value={group.id}
            onChange={(e) => {
              setActiveId(e.target.value);
              setSelected(new Set());
            }}
            style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-hairline)', background: 'var(--color-surface)', color: 'var(--color-ink)' }}
          >
            {ownedGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {formatMonthLabel(g.month, isTh ? 'th' : 'en')} — {t(`status.${g.status}`)}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Submission progress. */}
      <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }} data-testid="shift-assign-progress">
        {t('submissionProgress')}: {filled} / {totalCells}
      </div>

      {/* Author edit toolbar. */}
      {editable && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={selectWholeMonth}>
              {t('selectAllMonth')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
              {t('clearSelection')}
            </Button>
          </div>
          <ShiftAssignBulkPanel
            selectedCount={selected.size}
            isTh={isTh}
            onApply={handleApply}
            onClear={handleClearCells}
            onClearSelection={() => setSelected(new Set())}
          />
        </>
      )}

      <Card flush>
        <ShiftAssignmentGrid
          group={group}
          members={members}
          editable={editable}
          holidays={holidays}
          selected={selected}
          warnings={warnings}
          onToggleCell={toggleCell}
          isTh={isTh}
        />
      </Card>

      {/* Footer actions. */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {editable && (
          <Button variant="primary" size="md" onClick={handleSubmit} data-testid="shift-assign-submit">
            {t('submit')}
          </Button>
        )}
        {canReview && !returnOpen && (
          <>
            <Button variant="secondary" size="md" onClick={() => setReturnOpen(true)} data-testid="shift-assign-return">
              {t('returnForRevision')}
            </Button>
            <Button variant="primary" size="md" onClick={handleApprove} data-testid="shift-assign-approve">
              {t('approve')}
            </Button>
          </>
        )}
      </div>

      {/* Return-with-note surface. */}
      {canReview && returnOpen && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--color-ink-soft)' }}>
              {t('returnNoteLabel')}
              <Textarea
                placeholder={t('notePlaceholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                data-testid="shift-assign-return-note-input"
              />
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="md" onClick={() => setReturnOpen(false)}>
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button variant="primary" size="md" onClick={handleReturn} disabled={!note.trim()} data-testid="shift-assign-return-confirm">
                {t('returnForRevision')}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
