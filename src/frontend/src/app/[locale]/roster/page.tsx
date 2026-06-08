// Roster & Shifts — 24h Gantt board matching roster-ref-2026-05-25.png.
// Header breadcrumb + two-tone title, dept/week toolbar, Export + Bulk assign,
// card with "Hourly schedule" + STAFF/HRS/NOW meta, coverage strip, footer.
// Swap stays reachable via row action + ?panel=swap (no top swap button).
// MOCKUP ONLY: all actions resolve to a transient inline toast (no API).

'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { CalendarRange, Download, Plus } from 'lucide-react';
import { Card, Button, EmptyState } from '@/components/humi';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { ALL_PORTED_EMPLOYEES, EMP_BY_LOGIN } from '@/lib/all-ported-employees';
import { pickRosterScope, scopeRosterRows } from '@/lib/roster-scope';
import { RosterGantt } from '@/components/roster/RosterGantt';
import { CoverageStrip } from '@/components/roster/CoverageStrip';
import { ShiftEditorDrawer } from '@/components/roster/ShiftEditorDrawer';
import { ShiftSwapModal } from '@/components/roster/ShiftSwapModal';
import { BulkAssignModal } from '@/components/roster/BulkAssignModal';
import {
  ROSTER_ROWS,
  SHIFT_TYPE_LABELS,
  NOW_HOUR,
  NOW_MINUTE,
  rowTotalHours,
  type RosterRow,
  type RosterShift,
} from '@/data/roster/mock';

// Legend swatches reuse the same archetype tokens as the Gantt cells.
const LEGEND_CLASS: Record<string, string> = {
  manager: 'bg-[var(--color-accent-alt-soft)] border-[var(--color-accent-alt)]',
  partTime: 'bg-warning-soft border-warning',
  night: 'bg-[var(--color-ink)] border-[var(--color-ink)]',
  regular: 'bg-accent-soft border-accent',
};

export default function RosterPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const searchParams = useSearchParams();

  // ── Persona scope (P2) — narrow the visible roster to the persona's slice ──
  // manager → direct reports · hrbp → BU · spd/hr_admin/hr_manager → all rows.
  // Open route (menu show: manager/hradmin/hris) — scope data, never deny.
  const roles = useAuthStore((s) => s.roles);
  const email = useAuthStore((s) => s.email);
  const currentEmpId = email ? EMP_BY_LOGIN[email] ?? null : null;
  const scope = useMemo(
    () => pickRosterScope(ALL_PORTED_EMPLOYEES, roles, currentEmpId, ROSTER_ROWS.length),
    [roles, currentEmpId],
  );
  const rows = useMemo(() => scopeRosterRows(ROSTER_ROWS, scope), [scope]);
  const isScoped = scope.mode !== 'all';

  // ── Drawer + modal local state (mockup only) ──────────────────────────────
  const [editor, setEditor] = useState<{
    shift: RosterShift | null;
    employee: string;
  } | null>(null);
  const [swapOpen, setSwapOpen] = useState(
    () => searchParams?.get('panel') === 'swap',
  );
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Keep swap modal in sync with ?panel=swap (deep-link).
  const panelSwap = searchParams?.get('panel') === 'swap';
  const swapVisible = swapOpen || panelSwap;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleShiftClick = (shift: RosterShift, row: RosterRow) => {
    setEditor({ shift, employee: row.name });
  };

  const handleEditorSave = () => {
    setEditor(null);
    flash(isTh ? 'บันทึกกะแล้ว (ตัวอย่าง)' : 'Shift saved (demo)');
  };

  const handleSwapSubmit = () => {
    setSwapOpen(false);
    flash(isTh ? 'ส่งคำขอสลับกะแล้ว (ตัวอย่าง)' : 'Swap requested (demo)');
  };

  const handleBulkApply = (ids: string[]) => {
    setBulkOpen(false);
    flash(
      isTh
        ? `กำหนดกะให้ ${ids.length} คนแล้ว (ตัวอย่าง)`
        : `Assigned ${ids.length} employees (demo)`,
    );
  };

  // Export — build a client-side CSV blob of the visible roster (no backend).
  const handleExport = () => {
    const header = isTh
      ? ['พนักงาน', 'รวมชั่วโมง', 'กะ']
      : ['Employee', 'Total hours', 'Shifts'];
    const lines = rows.map((r) => {
      const shifts = r.shifts
        .map((s) => `${s.start}-${s.end}`)
        .join(' / ');
      return [r.name, rowTotalHours(r).toFixed(1), shifts]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(
      isTh
        ? `ส่งออกตารางกะ ${rows.length} แถวแล้ว`
        : `Exported ${rows.length} roster rows`,
    );
  };

  const hasRows = rows.length > 0;
  const legendEntries = useMemo(
    () => Object.keys(SHIFT_TYPE_LABELS) as Array<keyof typeof SHIFT_TYPE_LABELS>,
    [],
  );

  // Card-header meta: staff count + summed paid hours + static NOW.
  const staffCount = rows.length;
  const totalHrs = useMemo(
    () => rows.reduce((n, r) => n + rowTotalHours(r), 0),
    [rows],
  );
  const nowLabel = `${NOW_HOUR.toString().padStart(2, '0')}:${NOW_MINUTE.toString().padStart(2, '0')}`;
  const headerMeta = isTh
    ? `${staffCount} คน · ${totalHrs.toFixed(1)} ชม. · ตอนนี้ ${nowLabel}`
    : `${staffCount} STAFF · ${totalHrs.toFixed(1)} HRS · NOW ${nowLabel}`;

  return (
    <div className="pb-8 flex flex-col gap-6">
      {/* Header — breadcrumb eyebrow + two-tone title + subtitle */}
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {isTh
            ? 'HUMI • บริหารทีม • ตารางกะ'
            : 'HUMI • TEAM MANAGEMENT • ROSTER & SHIFTS'}
        </span>
        <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
          {isTh ? (
            <>
              ตาราง<span className="italic font-medium text-accent">กะ</span>
            </>
          ) : (
            <>
              Roster <span className="italic font-medium text-accent">&amp; Shifts</span>
            </>
          )}
        </h1>
        <p className="text-small text-ink-muted mt-1">
          {isTh ? 'คลิกที่กะเพื่อแก้ไขเวลา' : 'Click a shift to override times.'}
        </p>
      </header>

      {/* Persona scope banner — shown when the board is narrowed to a slice */}
      {isScoped && (
        <div
          role="note"
          className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-4 py-2.5 text-small text-ink-muted"
        >
          {scope.mode === 'bu'
            ? isTh
              ? `แสดงเฉพาะตารางกะในหน่วยงานของคุณ (${rows.length} คน)`
              : `Showing roster for your business unit only (${rows.length} staff)`
            : isTh
              ? `แสดงเฉพาะตารางกะทีมของคุณ (${rows.length} คน)`
              : `Showing your team's roster only (${rows.length} staff)`}
        </div>
      )}

      {/* Toolbar: LEFT filters · RIGHT actions */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-small text-ink-soft">
          <select
            aria-label={isTh ? 'แผนก' : 'Department'}
            className="bg-transparent pr-1 text-small text-ink-soft focus-visible:outline-none"
            defaultValue="all"
          >
            <option value="all">{isTh ? 'ทุกแผนก' : 'All departments'}</option>
            <option value="foh">FOH</option>
            <option value="boh">BOH</option>
            <option value="floor">{isTh ? 'หน้าร้าน' : 'Floor'}</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-small text-ink-soft">
          <CalendarRange size={15} className="text-ink-muted" aria-hidden />
          <select
            aria-label={isTh ? 'สัปดาห์' : 'Week'}
            className="bg-transparent pr-1 text-small text-ink-soft focus-visible:outline-none"
            defaultValue="w1"
          >
            <option value="w1">{isTh ? 'สัปดาห์ 19–25 พ.ค.' : 'Week of 19–25 May'}</option>
            <option value="w2">{isTh ? 'สัปดาห์ 26 พ.ค.–1 มิ.ย.' : 'Week of 26 May–1 Jun'}</option>
          </select>
        </label>
        <div className="ml-auto flex flex-wrap gap-3">
          <Button
            variant="secondary"
            leadingIcon={<Download size={16} />}
            onClick={handleExport}
          >
            {isTh ? 'ส่งออก' : 'Export'}
          </Button>
          <Button
            variant="primary"
            leadingIcon={<Plus size={16} />}
            onClick={() => setBulkOpen(true)}
          >
            {isTh ? 'กำหนดกะแบบกลุ่ม' : 'Bulk assign'}
          </Button>
        </div>
      </div>

      {/* Transient mockup toast */}
      {toast && (
        <div
          role="status"
          className="rounded-[var(--radius-md)] border border-accent bg-accent-soft px-4 py-2.5 text-small font-medium text-accent"
        >
          {toast}
        </div>
      )}

      {/* Board */}
      {hasRows ? (
        <Card variant="raised" size="lg" flush>
          {/* Card header: title + meta line */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <h2 className="font-display text-[length:var(--text-display-h3)] font-semibold tracking-tight text-ink">
              {isTh ? 'ตารางรายชั่วโมง' : 'Hourly schedule'}
            </h2>
            <span className="font-mono text-small uppercase tracking-[0.04em] text-ink-muted">
              {headerMeta}
            </span>
          </div>

          <RosterGantt rows={rows} onShiftClick={handleShiftClick} />
          <CoverageStrip />

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 border-t border-hairline-soft px-5 py-3">
            {legendEntries.map((t) => (
              <span key={t} className="inline-flex items-center gap-2 font-mono text-xs text-ink-muted">
                <span
                  className={cn('inline-block h-2.5 w-4 rounded-sm border', LEGEND_CLASS[t])}
                  aria-hidden
                />
                {isTh ? SHIFT_TYPE_LABELS[t].th : SHIFT_TYPE_LABELS[t].en}
              </span>
            ))}
          </div>

          {/* Footer hint */}
          <div className="border-t border-hairline-soft px-5 py-3">
            <span className="text-small text-ink-muted">
              {isTh ? 'คลิกที่กะเพื่อแก้ไข' : 'Click a shift to override'}
            </span>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={CalendarRange}
          titleTh="ยังไม่มีตารางกะ"
          titleEn="No roster yet"
          descTh="เพิ่มกะให้พนักงานเพื่อเริ่มจัดตารางกะรายวัน"
          descEn="Assign shifts to employees to start building the daily roster."
        />
      )}

      {/* Shift editor drawer */}
      <ShiftEditorDrawer
        open={editor !== null}
        shift={editor?.shift ?? null}
        employeeName={editor?.employee}
        onClose={() => setEditor(null)}
        onSave={handleEditorSave}
      />

      {/* Swap modal — reachable via ?panel=swap or row action */}
      <ShiftSwapModal
        open={swapVisible}
        onClose={() => setSwapOpen(false)}
        onSubmit={handleSwapSubmit}
      />

      {/* Bulk assign modal */}
      <BulkAssignModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onApply={handleBulkApply}
      />
    </div>
  );
}
