'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Card, CardEyebrow, Button, DataTable } from '@/components/humi';
import type { DataTableColumn } from '@/components/humi';

// ── Benefit Payment Dashboard — แดชบอร์ดการจ่ายสวัสดิการ ──────────────────
// STA-67 — Interactive mock lifecycle + payload preview (parent: STA-61).
// UI mockup phase ONLY: no SAP, no bank, no finance posting, no file transfer,
// no backend integration. Every action mutates client state and surfaces a
// "mock/demo payload — not real SAP/bank integration" disclaimer.

// ── Lifecycle state machine ────────────────────────────────────────────────

const LIFECYCLE_STAGES = [
  'draft',
  'validating',
  'ready-to-post',
  'payload-previewed',
  'period-closed',
] as const;

type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

const STAGE_LABELS_TH: Record<LifecycleStage, string> = {
  'draft':              'ร่าง',
  'validating':         'ตรวจสอบเคลม',
  'ready-to-post':      'พร้อมส่งบัญชี',
  'payload-previewed':  'ตัวอย่าง Payload',
  'period-closed':      'ปิดรอบแล้ว',
};

const STAGE_LABELS_EN: Record<LifecycleStage, string> = {
  'draft':              'Draft',
  'validating':         'Validate claims',
  'ready-to-post':      'Ready to post',
  'payload-previewed':  'Payload preview',
  'period-closed':      'Period closed',
};

const STAGE_DESC_TH: Record<LifecycleStage, string> = {
  'draft':              'รอบใหม่กำลังตั้งต้น เลือกเคลมที่ผ่านการอนุมัติ',
  'validating':         'กำลังตรวจสอบความถูกต้องของเคลมที่ผ่านอนุมัติ',
  'ready-to-post':      'ตรวจสอบครบถ้วน พร้อมสร้าง Payload',
  'payload-previewed':  'Payload สำหรับบัญชี/ธนาคาร พร้อมตรวจสอบและดาวน์โหลด (จำลอง)',
  'period-closed':      'รอบนี้ปิดแล้ว ไม่สามารถแก้ไขเคลมในรอบนี้ได้',
};

const STAGE_DESC_EN: Record<LifecycleStage, string> = {
  'draft':              'New period starting — pick approved claims to include',
  'validating':         'Validating claim integrity against approval records',
  'ready-to-post':      'Validation complete — ready to generate payload',
  'payload-previewed':  'Finance/bank payload ready for review + mock download',
  'period-closed':      'Period sealed — no further claim changes accepted',
};

function stageIndex(stage: LifecycleStage) {
  return LIFECYCLE_STAGES.indexOf(stage);
}

// ── Mock claim rows ────────────────────────────────────────────────────────

type ClaimStatus = 'eligible' | 'posted' | 'blocked';

type ClaimRow = {
  claimId: string;
  employee: string;
  plan: string;
  amount: number; // THB
  status: ClaimStatus;
  blockReason: string | null;
};

const SEED_CLAIMS: ClaimRow[] = [
  { claimId: 'CL-2026-04-0042', employee: 'EMP-0042', plan: 'Medical OPD',  amount: 3_500, status: 'eligible', blockReason: null },
  { claimId: 'CL-2026-04-0117', employee: 'EMP-0117', plan: 'Gasoline',     amount: 2_000, status: 'eligible', blockReason: null },
  { claimId: 'CL-2026-04-0203', employee: 'EMP-0203', plan: 'Medical OPD',  amount: 4_800, status: 'blocked',  blockReason: 'Missing receipt' },
  { claimId: 'CL-2026-04-0391', employee: 'EMP-0391', plan: 'Dental OPD',   amount: 1_200, status: 'eligible', blockReason: null },
  { claimId: 'CL-2026-04-0558', employee: 'EMP-0558', plan: 'Vision',       amount:   900, status: 'blocked',  blockReason: 'Pending SPD approval' },
  { claimId: 'CL-2026-04-0612', employee: 'EMP-0612', plan: 'Medical OPD',  amount: 5_400, status: 'eligible', blockReason: null },
  { claimId: 'CL-2026-04-0701', employee: 'EMP-0701', plan: 'Gasoline',     amount: 1_800, status: 'eligible', blockReason: null },
];

// ── Static reference tables (kept from earlier mockup; useful HR context) ───

type CutoffRow   = { company: string; cycle: string; days: string };
type WageTypeRow = { company: string; plan: string; infotype: string; wageCode: string };
type PeriodRow   = { company: string; plan: string; periodId: string; payDate: string };

const MOCK_CUTOFF_CALENDAR: CutoffRow[] = [
  { company: 'Ex-CRC', cycle: 'Monthly',   days: '6, 16, 26 of month' },
  { company: 'CMG',    cycle: 'Monthly',   days: '6, 16, 26 of month' },
  { company: 'CRG',    cycle: 'Monthly',   days: '6, 16, 26 of month' },
  { company: 'CPN',    cycle: 'Bi-weekly', days: 'Every Mon, Thu' },
  { company: 'CHR',    cycle: 'Monthly',   days: '13th of month' },
];

const MOCK_WAGE_TYPES: WageTypeRow[] = [
  { company: 'CG',  plan: 'Medical OPD', infotype: 'IT0015', wageCode: '/001' },
  { company: 'CG',  plan: 'Gasoline',    infotype: 'IT0015', wageCode: '/002' },
  { company: 'CG',  plan: 'Mobile',      infotype: 'IT0015', wageCode: '/003' },
  { company: 'CMG', plan: 'Dental OPD',  infotype: 'IT0015', wageCode: '/004' },
  { company: 'CPN', plan: 'Vision',      infotype: 'IT0015', wageCode: '/005' },
];

const MOCK_PERIOD_MAPPING: PeriodRow[] = [
  { company: 'CG',  plan: 'Medical OPD', periodId: 'PP-2026-04',   payDate: '2026-04-30' },
  { company: 'CG',  plan: 'Gasoline',    periodId: 'PP-2026-04',   payDate: '2026-04-30' },
  { company: 'CMG', plan: 'Medical OPD', periodId: 'PP-2026-04',   payDate: '2026-04-28' },
  { company: 'CPN', plan: 'Medical OPD', periodId: 'PP-2026-04W2', payDate: '2026-04-24' },
  { company: 'CHR', plan: 'Dental OPD',  periodId: 'PP-2026-04',   payDate: '2026-04-13' },
];

// ── Sub-components ─────────────────────────────────────────────────────────

const STAGE_CHIP_BG: Record<'done' | 'current' | 'pending', string> = {
  done:    'bg-success-soft text-success border border-success/30',
  current: 'bg-accent text-white',
  pending: 'bg-canvas-soft text-ink-muted border border-hairline',
};

function StageChip({ kind, label }: { kind: 'done' | 'current' | 'pending'; label: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] ${STAGE_CHIP_BG[kind]}`}>
      {label}
    </span>
  );
}

const STATUS_BADGE_BG: Record<ClaimStatus, string> = {
  eligible: 'bg-success-soft text-success border border-success/30',
  posted:   'bg-accent-soft text-accent border border-accent/30',
  blocked:  'bg-warning-soft text-warning border border-warning/30',
};

function StatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] ${STATUS_BADGE_BG[status]}`}>
      {status}
    </span>
  );
}

function MockDisclaimer({ isTh }: { isTh: boolean }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-warning/40 bg-warning-soft px-3 py-2 text-[length:var(--text-eyebrow)] uppercase tracking-[0.12em] text-warning">
      {isTh
        ? 'ข้อมูลตัวอย่างสำหรับการนำเสนอ'
        : 'Sample data for demonstration'}
    </div>
  );
}

// ── Static-table column definitions ────────────────────────────────────────

const cutoffCols = (isTh: boolean): DataTableColumn<CutoffRow>[] => [
  { id: 'company', header: isTh ? 'บริษัท' : 'Company', cell: (r) => r.company, sortAccessor: (r) => r.company },
  { id: 'cycle',   header: isTh ? 'รอบ' : 'Cycle',     cell: (r) => r.cycle },
  { id: 'days',    header: isTh ? 'วันตัดรอบ (ZBET003)' : 'Cut-off days (ZBET003)', cell: (r) => r.days },
];

const wageTypeCols = (isTh: boolean): DataTableColumn<WageTypeRow>[] => [
  { id: 'company',  header: isTh ? 'บริษัท' : 'Company', cell: (r) => r.company, sortAccessor: (r) => r.company },
  { id: 'plan',     header: isTh ? 'แผนสวัสดิการ' : 'Benefit plan', cell: (r) => r.plan },
  { id: 'infotype', header: isTh ? 'Infotype (SAP)' : 'Infotype (SAP)', cell: (r) => r.infotype },
  { id: 'wageCode', header: isTh ? 'รหัส Wage type (ZBET001)' : 'Wage type code (ZBET001)', cell: (r) => r.wageCode },
];

const periodCols = (isTh: boolean): DataTableColumn<PeriodRow>[] => [
  { id: 'company',  header: isTh ? 'บริษัท' : 'Company', cell: (r) => r.company, sortAccessor: (r) => r.company },
  { id: 'plan',     header: isTh ? 'แผนสวัสดิการ' : 'Benefit plan', cell: (r) => r.plan },
  { id: 'periodId', header: isTh ? 'รหัสรอบ (ZBET004)' : 'Period ID (ZBET004)', cell: (r) => r.periodId },
  { id: 'payDate',  header: isTh ? 'วันจ่ายเงิน' : 'Pay date', cell: (r) => r.payDate },
];

// ── Page ───────────────────────────────────────────────────────────────────

const PERIOD_ID = 'PP-2026-04';

export default function BenefitPaymentPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const [stage, setStage] = useState<LifecycleStage>('draft');
  const [filter, setFilter] = useState<'all' | ClaimStatus>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(SEED_CLAIMS.filter((c) => c.status === 'eligible').map((c) => c.claimId)));
  const [claims, setClaims] = useState<ClaimRow[]>(SEED_CLAIMS);
  const [toast, setToast] = useState<string | null>(null);

  const filteredClaims = useMemo(
    () => (filter === 'all' ? claims : claims.filter((c) => c.status === filter)),
    [claims, filter],
  );

  const totals = useMemo(() => {
    const sel = claims.filter((c) => selectedIds.has(c.claimId));
    const eligibleSel = sel.filter((c) => c.status === 'eligible');
    const blockedSel  = sel.filter((c) => c.status === 'blocked');
    const sum = eligibleSel.reduce((acc, c) => acc + c.amount, 0);
    return {
      selectedCount: sel.length,
      eligibleCount: eligibleSel.length,
      blockedCount: blockedSel.length,
      eligibleAmountThb: sum,
    };
  }, [claims, selectedIds]);

  const payloadPreview = useMemo(() => {
    if (stageIndex(stage) < stageIndex('ready-to-post')) return null;
    return {
      periodId: PERIOD_ID,
      stage,
      generatedAt: '2026-05-19T11:10:00+07:00',
      target: { system: 'SAP-MOCK', tcode: 'ZBER001 (mock)' },
      currency: 'THB',
      lineItems: claims
        .filter((c) => selectedIds.has(c.claimId) && c.status === 'eligible')
        .map((c) => ({
          claimId: c.claimId,
          employee: c.employee,
          plan: c.plan,
          amountThb: c.amount,
          wageType: '/001',
          status: 'PENDING-POST',
        })),
      totals: {
        eligibleLineCount: totals.eligibleCount,
        eligibleAmountThb: totals.eligibleAmountThb,
      },
      _disclaimer: 'Sample data for demonstration',
    };
  }, [claims, selectedIds, stage, totals]);

  const toggleRow = (claimId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  };

  const advanceStage = () => {
    const idx = stageIndex(stage);
    if (idx >= LIFECYCLE_STAGES.length - 1) return;
    const next = LIFECYCLE_STAGES[idx + 1];
    setStage(next);

    if (next === 'period-closed') {
      // Mark all selected eligible claims as 'posted'
      setClaims((prev) =>
        prev.map((c) =>
          selectedIds.has(c.claimId) && c.status === 'eligible'
            ? { ...c, status: 'posted' }
            : c,
        ),
      );
      flashToast(isTh ? 'ปิดรอบเรียบร้อย (จำลอง)' : 'Period closed (mock)');
    }
  };

  const resetCycle = () => {
    setStage('draft');
    setClaims(SEED_CLAIMS);
    setSelectedIds(new Set(SEED_CLAIMS.filter((c) => c.status === 'eligible').map((c) => c.claimId)));
    flashToast(isTh ? 'เริ่มรอบใหม่ (จำลอง)' : 'Cycle reset (mock)');
  };

  const downloadPayload = () => {
    if (!payloadPreview) return;
    const blob = new Blob([JSON.stringify(payloadPreview, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benefit-payment-payload-${PERIOD_ID}-mock.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flashToast(isTh ? 'ดาวน์โหลดไฟล์ตัวอย่างแล้ว' : 'Sample file downloaded');
  };

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const isCanAdvance = stageIndex(stage) < LIFECYCLE_STAGES.length - 1;
  const advanceLabelTh: Record<LifecycleStage, string> = {
    'draft':             'เริ่มตรวจสอบเคลม',
    'validating':        'ยืนยันว่าตรวจสอบเสร็จ',
    'ready-to-post':     'สร้าง Payload',
    'payload-previewed': 'ปิดรอบ',
    'period-closed':     '—',
  };
  const advanceLabelEn: Record<LifecycleStage, string> = {
    'draft':             'Start validation',
    'validating':        'Mark validation complete',
    'ready-to-post':     'Generate payload',
    'payload-previewed': 'Close period',
    'period-closed':     '—',
  };

  return (
    <div className="space-y-8">

      {/* A) Page header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardEyebrow>
            {isTh ? 'สวัสดิการ · การจ่าย' : 'Benefits Admin · Payment'}
          </CardEyebrow>
          <h1 className="font-display text-3xl font-semibold text-ink">
            {isTh
              ? 'แดชบอร์ดการจ่ายสวัสดิการ'
              : 'Benefit Payment Dashboard'}
          </h1>
          <p className="mt-2 text-small text-ink-muted">
            {isTh
              ? `รอบ ${PERIOD_ID}`
              : `Period ${PERIOD_ID}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={advanceStage} disabled={!isCanAdvance}>
            {isTh ? advanceLabelTh[stage] : advanceLabelEn[stage]}
          </Button>
          <Button variant="ghost" onClick={resetCycle}>
            {isTh ? 'เริ่มรอบใหม่' : 'Reset cycle'}
          </Button>
        </div>
      </header>

      <MockDisclaimer isTh={isTh} />

      {/* B) Lifecycle 5-state cards */}
      <section>
        <h2 className="mb-3 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {isTh ? 'วงจรการจ่าย (5 สถานะ)' : 'Payment lifecycle (5 states)'}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LIFECYCLE_STAGES.map((s, i) => {
            const cur = stageIndex(stage);
            const kind: 'done' | 'current' | 'pending' = i < cur ? 'done' : i === cur ? 'current' : 'pending';
            const label = kind === 'done'
              ? isTh ? 'เสร็จแล้ว' : 'Done'
              : kind === 'current'
                ? isTh ? 'กำลังดำเนินการ' : 'Active'
                : isTh ? 'รอดำเนินการ' : 'Pending';
            return (
              <Card key={s} variant="raised" size="md">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-[length:var(--text-eyebrow)] font-semibold text-ink-muted">
                    {i + 1}
                  </span>
                  <StageChip kind={kind} label={label} />
                </div>
                <p className="mt-2 text-small font-semibold text-ink">
                  {isTh ? STAGE_LABELS_TH[s] : STAGE_LABELS_EN[s]}
                </p>
                <p className="mt-1 text-[length:var(--text-eyebrow)] text-ink-muted">
                  {isTh ? STAGE_DESC_TH[s] : STAGE_DESC_EN[s]}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* C) Selection summary chips */}
      <section className="flex flex-wrap items-center gap-3">
        <span className="text-small font-semibold text-ink">
          {isTh ? 'สรุปการเลือก:' : 'Selection summary:'}
        </span>
        <span className="rounded-full border border-hairline bg-canvas-soft px-3 py-1 text-small text-ink">
          {isTh ? `เลือก ${totals.selectedCount} รายการ` : `${totals.selectedCount} selected`}
        </span>
        <span className="rounded-full border border-success/30 bg-success-soft px-3 py-1 text-small text-success">
          {isTh ? `เบิกได้ ${totals.eligibleCount} รายการ` : `${totals.eligibleCount} eligible`}
        </span>
        <span className="rounded-full border border-warning/40 bg-warning-soft px-3 py-1 text-small text-warning">
          {isTh ? `ถูกระงับ ${totals.blockedCount} รายการ` : `${totals.blockedCount} blocked`}
        </span>
        <span className="ml-auto rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-small font-semibold tabular-nums text-accent">
          {isTh ? 'ยอดเบิกได้รวม' : 'Eligible total'} ฿{totals.eligibleAmountThb.toLocaleString('th-TH')}
        </span>
      </section>

      {/* D) Claim selector with status filter */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {isTh ? 'เคลมในรอบ — เลือกเข้าจ่าย' : 'Claims in period — select to include'}
          </h2>
          <div className="flex items-center gap-2 text-small">
            <span className="text-ink-muted">{isTh ? 'กรอง:' : 'Filter:'}</span>
            {(['all', 'eligible', 'blocked', 'posted'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-small ${filter === f ? 'bg-accent text-white' : 'border border-hairline bg-surface text-ink'}`}
              >
                {f === 'all'
                  ? isTh ? 'ทั้งหมด' : 'All'
                  : f === 'eligible'
                    ? isTh ? 'เบิกได้' : 'Eligible'
                    : f === 'blocked'
                      ? isTh ? 'ถูกระงับ' : 'Blocked'
                      : isTh ? 'จ่ายแล้ว' : 'Posted'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-hairline">
          <table className="w-full border-collapse text-small">
            <thead className="bg-canvas-soft text-[length:var(--text-eyebrow)] uppercase tracking-[0.12em] text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left">
                  <span className="sr-only">{isTh ? 'เลือก' : 'Select'}</span>
                </th>
                <th className="px-3 py-2 text-left">{isTh ? 'รหัสเคลม' : 'Claim ID'}</th>
                <th className="px-3 py-2 text-left">{isTh ? 'พนักงาน' : 'Employee'}</th>
                <th className="px-3 py-2 text-left">{isTh ? 'แผน' : 'Plan'}</th>
                <th className="px-3 py-2 text-right">{isTh ? 'จำนวนเงิน' : 'Amount'}</th>
                <th className="px-3 py-2 text-left">{isTh ? 'สถานะ' : 'Status'}</th>
                <th className="px-3 py-2 text-left">{isTh ? 'เหตุที่ถูกระงับ' : 'Block reason'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((c) => (
                <tr key={c.claimId} className="border-t border-hairline">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={isTh ? `เลือกเคลม ${c.claimId}` : `Select claim ${c.claimId}`}
                      checked={selectedIds.has(c.claimId)}
                      disabled={c.status === 'blocked' || c.status === 'posted' || stage === 'period-closed'}
                      onChange={() => toggleRow(c.claimId)}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-ink">{c.claimId}</td>
                  <td className="px-3 py-2 text-ink">{c.employee}</td>
                  <td className="px-3 py-2 text-ink">{c.plan}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">฿{c.amount.toLocaleString('th-TH')}</td>
                  <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-2 text-ink-muted">{c.blockReason ?? '—'}</td>
                </tr>
              ))}
              {filteredClaims.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-ink-muted">
                  {isTh ? 'ไม่พบเคลมตามตัวกรอง' : 'No claims match the filter'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* E) Payload preview panel — visible from 'ready-to-post' onward */}
      {payloadPreview && (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {isTh ? 'ตัวอย่าง Payload สำหรับบัญชี / ธนาคาร (จำลอง)' : 'Finance / bank payload preview (mock)'}
            </h2>
            <Button variant="secondary" onClick={downloadPayload}>
              {isTh ? 'ดาวน์โหลด Payload (จำลอง)' : 'Download mock payload'}
            </Button>
          </div>
          <MockDisclaimer isTh={isTh} />
          <Card variant="raised" size="md" className="mt-3">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[length:var(--text-eyebrow)] text-ink">
              <code>{JSON.stringify(payloadPreview, null, 2)}</code>
            </pre>
          </Card>
        </section>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 rounded-[var(--radius-md)] border border-accent/30 bg-accent-soft px-4 py-2 text-small font-medium text-accent shadow-md"
        >
          {toast}
        </div>
      )}

      {/* C1) Payment cut-off calendar */}
      <section>
        <h2 className="mb-3 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {isTh ? 'ตารางวันตัดรอบการจ่าย (A-PY-01 / ZBET003)' : 'Payment cut-off calendar (A-PY-01 / ZBET003)'}
        </h2>
        <DataTable
          caption={isTh ? 'ตารางวันตัดรอบการจ่าย' : 'Payment cut-off calendar'}
          columns={cutoffCols(isTh)}
          rows={MOCK_CUTOFF_CALENDAR}
          rowKey={(r) => r.company}
          dense
        />
      </section>

      {/* C2) Wage type mapping */}
      <section>
        <h2 className="mb-3 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {isTh ? 'การแมป Wage Type (A-PY-02 / ZBET001)' : 'Wage type mapping (A-PY-02 / ZBET001)'}
        </h2>
        <DataTable
          caption={isTh ? 'การแมป Wage Type' : 'Wage type mapping'}
          columns={wageTypeCols(isTh)}
          rows={MOCK_WAGE_TYPES}
          rowKey={(r) => `${r.company}-${r.wageCode}`}
          dense
        />
      </section>

      {/* C3) Payment period mapping */}
      <section>
        <h2 className="mb-3 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {isTh ? 'การแมปรอบการจ่าย (A-PY-03 / ZBET004)' : 'Payment period mapping (A-PY-03 / ZBET004)'}
        </h2>
        <DataTable
          caption={isTh ? 'การแมปรอบการจ่าย' : 'Payment period mapping'}
          columns={periodCols(isTh)}
          rows={MOCK_PERIOD_MAPPING}
          rowKey={(r) => `${r.company}-${r.periodId}-${r.plan}`}
          dense
        />
      </section>

      {/* F) Footer note */}
      <Card variant="raised" size="md">
        <CardEyebrow>SAP ZBER001/003/004</CardEyebrow>
        <p className="mt-2 text-small text-ink-muted">
          {isTh
            ? 'ไฟล์ส่งจ่ายผ่าน SAP ZBER001/003 — แสดงขั้นตอนและตัวอย่าง Payload (ยังไม่ส่งจริง)'
            : 'Payment export via SAP ZBER001/003 — shows the steps and a sample payload (not yet submitted).'}
        </p>
      </Card>

    </div>
  );
}
