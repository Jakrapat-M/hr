'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plus,
  FileText,
  ArrowRight,
  Search,
  Calendar,
  Heart,
  Shield,
  Clock,
  Globe,
  BookOpen,
  Plug,
  Users,
  AlertCircle,
  Check,
  type LucideIcon,
} from 'lucide-react';
import {
  Avatar,
  Button,
  CancelRequestModal,
  Card,
  CardEyebrow,
  CardTitle,
  Modal,
} from '@/components/humi';
import { cn } from '@/lib/utils';
import {
  HUMI_REQUEST_CATALOG,
  HUMI_MY_REQUESTS,
  REQUEST_STATUS_META,
  ACCENT_ICON_CLASS,
  ACCENT_BAR_CLASS,
  type RequestIconKey,
  type RequestStatus,
  type HumiApprovalStep,
} from '@/lib/humi-mock-data';
import {
  useRequestsStore,
  type RequestFilterKey,
} from '@/stores/humi-requests-slice';
import { selectBenefitRequestSummaries, useBenefitClaimsStore } from '@/stores/benefit-claims';
import { selectBenefitReferralRequestSummaries, useBenefitReferralsStore } from '@/stores/benefit-referrals';
import { selectTaxPlanningRequestSummaries, useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';
import { useQueueRequestRows, buildCancelModalFields, APPROVAL_REGISTRY } from '@/lib/approval-registry';
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/rbac';
import type { RequestType } from '@/lib/quick-approve-api';

// ════════════════════════════════════════════════════════════
// /requests — Forms/requests tracker
// Port of docs/design-ref/shelfly-bundle/project/screens/requests.jsx
// c7: template selector form + submit → Zustand + filter chips
// ════════════════════════════════════════════════════════════

type TabKey = 'mine' | 'catalog' | 'approvals';

// Roles that can approve requests — manager and above
const APPROVAL_ROLES: Role[] = ['manager', 'hrbp', 'spd', 'hr_admin', 'hr_manager'];

const ICONS: Record<RequestIconKey, LucideIcon> = {
  calendar: Calendar,
  heart: Heart,
  shield: Shield,
  doc: FileText,
  clock: Clock,
  globe: Globe,
  book: BookOpen,
  plug: Plug,
  people: Users,
  arrow: ArrowRight,
};

const FILTER_CHIPS: Array<{ key: RequestFilterKey; label: string }> = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'รออนุมัติ' },
  { key: 'approved', label: 'อนุมัติแล้ว' },
  { key: 'rejected', label: 'ไม่อนุมัติ' },
  { key: 'info', label: 'ขอข้อมูลเพิ่ม' },
];

const REQUEST_FORM_CATALOG = HUMI_REQUEST_CATALOG.filter((form) => form.id !== 'claim');

// Template-specific form fields definition
type TemplateField = { id: string; label: string; placeholder: string; type?: 'text' | 'textarea' };

const TEMPLATE_FIELDS: Record<string, TemplateField[]> = {
  leave: [
    { id: 'leave-type', label: 'ประเภทการลา', placeholder: 'เช่น ลาพักร้อน / ลาป่วย / ลากิจ' },
    { id: 'leave-dates', label: 'วันที่', placeholder: 'เช่น 28 เม.ย. – 2 พ.ค.' },
    { id: 'leave-reason', label: 'เหตุผล', placeholder: 'ระบุเหตุผลโดยย่อ', type: 'textarea' },
  ],
  ot: [
    { id: 'ot-date', label: 'วันที่ทำโอที', placeholder: 'เช่น เสาร์ 19 เม.ย.' },
    { id: 'ot-hours', label: 'จำนวนชั่วโมง', placeholder: 'เช่น 4' },
    { id: 'ot-reason', label: 'เหตุผล', placeholder: 'ระบุงานที่ต้องทำ', type: 'textarea' },
  ],
  default: [
    { id: 'detail', label: 'รายละเอียด', placeholder: 'ระบุรายละเอียดคำร้อง', type: 'textarea' },
  ],
};

// Simple in-memory toast
function useToast() {
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });
  const show = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast({ msg: '', visible: false }), 3000);
  };
  return { toast, show };
}

export default function HumiRequestsPage() {
  const pathname = usePathname();
  const locale = pathname.startsWith('/th') ? 'th' : 'en';
  const roles = useAuthStore((s) => s.roles);
  const canApprove = roles.some((r) => APPROVAL_ROLES.includes(r));
  // STA-175 — ownership gate: Cancel renders only on the current user's OWN rows.
  // The tracker is a manager-inbox fan-in with no owner filter, so this is required.
  const currentUserId = useAuthStore((s) => s.userId) ?? '';
  const currentUserName = useAuthStore((s) => s.username) ?? '';

  const [tab, setTab] = useState<TabKey>('mine');
  const { toast, show: showToast } = useToast();

  const { submissions, filter } = useRequestsStore();
  const benefitClaims = useBenefitClaimsStore((state) => state.claims);
  const benefitReferrals = useBenefitReferralsStore((state) => state.referrals);
  const taxPlanningDrafts = useBenefitTaxPlanningStore((state) => state.drafts);
  // PR-2 (ORPHAN1): project the canonical approval-queue rows into the tracker so
  // an approval/rejection in /quick-approve flips the SAME request's status here
  // live, no refresh (AC-2.1). queueSnapshot ids (WF-2026-NNN) are distinct from
  // the legacy REQ-/benefit rows, so no de-dup is needed.
  const queueRows = useQueueRequestRows('th');

  const allMine = useMemo<MineRow[]>(() => {
    const base = HUMI_MY_REQUESTS.map((r) => ({ ...r }));
    const store = submissions.map((s) => ({
      id: s.id,
      type: s.type,
      sub: s.sub,
      submitted: s.submitted,
      status: s.status,
      approvalChain: [
        { role: 'หัวหน้างาน', name: 'ปรีชา วัฒนกุล', initials: 'ปว', tone: 'teal' as const, status: 'pending' as const, when: 'รอดำเนินการ' },
      ] satisfies HumiApprovalStep[],
    }));
    const queue = queueRows.map((q) => ({
      id: q.id,
      type: q.type,
      sub: q.sub,
      submitted: q.submitted,
      status: q.status as RequestStatus,
      approvalChain: q.approvalChain satisfies HumiApprovalStep[],
      // STA-175 — only self-cancellable types carry a cancel adapter; others stay false.
      requestType: q.requestType,
      requesterId: q.requesterId,
      cancellable: q.cancellable && !!APPROVAL_REGISTRY[q.requestType].cancel,
    }));
    const benefitRows = selectBenefitRequestSummaries(benefitClaims);
    const referralRows = selectBenefitReferralRequestSummaries(benefitReferrals);
    const taxRows = selectTaxPlanningRequestSummaries(taxPlanningDrafts);
    // Deduplicate by id — queue-seeded benefit claims carry the same id as the
    // domain-selector rows (workflowRequestId = row.id), so merging without
    // dedup causes React duplicate-key warnings. First occurrence wins (domain
    // selectors come first so their richer shape takes priority).
    const seen = new Set<string>();
    return [...referralRows, ...taxRows, ...benefitRows, ...queue, ...store, ...base].filter(
      (r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      },
    );
  }, [benefitClaims, benefitReferrals, taxPlanningDrafts, submissions, queueRows]);

  const filtered = useMemo(() => {
    if (filter === 'all') return allMine;
    return allMine.filter((r) => r.status === filter);
  }, [allMine, filter]);

  const summary = useMemo(() => {
    const total = allMine.length;
    const pending = allMine.filter((r) => r.status === 'pending').length;
    const approved = allMine.filter((r) => r.status === 'approved').length;
    const rejected = allMine.filter((r) => r.status === 'rejected').length;
    const info = allMine.filter((r) => r.status === 'info').length;
    return { total, pending, approved, rejected, info };
  }, [allMine]);

  return (
    <>
      {/* Toast */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3',
            'bg-ink text-canvas shadow-[var(--shadow-lg)] text-body font-medium'
          )}
        >
          <Check size={16} aria-hidden />
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardEyebrow>คำร้องและแบบฟอร์ม</CardEyebrow>
          <h1
            className={cn(
              'font-display font-semibold tracking-tight text-ink',
              'text-[length:var(--text-display-h1)] leading-[var(--text-display-h1--line-height)]'
            )}
          >
            {locale === 'th' ? 'ส่งคำขอและติดตามสถานะ' : 'Submit Requests & Track Status'}
          </h1>
        </div>
        <Button
          variant="primary"
          leadingIcon={<Plus size={14} />}
          onClick={() => setTab('catalog')}
          block
          className="sm:w-auto"
        >
          สร้างคำร้องใหม่
        </Button>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="มุมมองคำร้อง"
        className="mb-6 flex flex-wrap gap-1 border-b border-hairline"
      >
        <TabButton
          active={tab === 'mine'}
          onClick={() => setTab('mine')}
          count={allMine.length}
        >
          คำร้องของฉัน
        </TabButton>
        <TabButton
          active={tab === 'catalog'}
          onClick={() => setTab('catalog')}
          count={REQUEST_FORM_CATALOG.length}
        >
          แบบฟอร์มทั้งหมด
        </TabButton>
        {canApprove && (
          <TabButton
            active={tab === 'approvals'}
            onClick={() => setTab('approvals')}
          >
            {locale === 'th' ? 'รออนุมัติ' : 'Pending Approval'}
          </TabButton>
        )}
      </div>

      {tab === 'mine' && (
        <MineTab
          summary={summary}
          filtered={filtered}
          locale={locale}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onCancelled={() =>
            showToast(locale === 'th' ? 'ยกเลิกคำขอแล้ว' : 'Request cancelled successfully.')
          }
        />
      )}
      {tab === 'catalog' && (
        <CatalogTab onSubmitted={(msg) => { showToast(msg); setTab('mine'); }} />
      )}
      {tab === 'approvals' && canApprove && <ApprovalsTab locale={locale} />}
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Mine — with filter chips
// ────────────────────────────────────────────────────────────

type MineRow = {
  id: string;
  type: string;
  sub: string;
  submitted: string;
  status: RequestStatus;
  approvalChain: HumiApprovalStep[];
  href?: string;
  // STA-175 — self-cancel plumbing (present only on queue-projected rows).
  requestType?: RequestType;
  requesterId?: string;
  cancellable?: boolean;
};

function MineTab({
  summary,
  filtered,
  locale,
  currentUserId,
  currentUserName,
  onCancelled,
}: {
  summary: { total: number; pending: number; approved: number; rejected: number; info: number };
  filtered: MineRow[];
  locale: 'th' | 'en';
  currentUserId: string;
  currentUserName: string;
  onCancelled: () => void;
}) {
  const { filter, setFilter } = useRequestsStore();
  const [selected, setSelected] = useState<MineRow | null>(null);
  // STA-175 — self-cancel: the row being cancelled + its resolved modal fields.
  const [cancelRow, setCancelRow] = useState<MineRow | null>(null);
  const cancelFields = useMemo(
    () =>
      cancelRow?.requestType
        ? buildCancelModalFields(cancelRow.requestType, cancelRow.id, locale)
        : null,
    [cancelRow, locale],
  );

  function handleConfirmCancel() {
    if (!cancelRow?.requestType) return;
    const adapter = APPROVAL_REGISTRY[cancelRow.requestType];
    void Promise.resolve(
      adapter.cancel?.(cancelRow.id, { id: currentUserId, name: currentUserName }),
    ).then(() => {
      onCancelled();
    });
    setCancelRow(null);
  }

  const summaryCards: Array<{ l: string; n: number; tone: 'accent' | 'warn' | 'sage' | 'butter' }> = [
    { l: 'ส่งทั้งหมด', n: summary.total, tone: 'accent' },
    { l: 'รออนุมัติ', n: summary.pending, tone: 'butter' },
    { l: 'อนุมัติแล้ว', n: summary.approved, tone: 'sage' },
    { l: 'ไม่อนุมัติ', n: summary.rejected, tone: 'warn' },
    { l: 'ขอข้อมูลเพิ่ม', n: summary.info, tone: 'accent' },
  ];

  return (
    <>
      {/* Summary tiles */}
      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((s) => (
          <div key={s.l} className={cn('humi-stat-card', `humi-stat-card--${s.tone}`)}>
            <CardEyebrow>{s.l}</CardEyebrow>
            <p
              className={cn(
                'mt-1 font-display font-semibold text-ink tabular-nums',
                'text-[length:var(--text-display-h2)] leading-[var(--text-display-h2--line-height)]'
              )}
            >
              {s.n}
            </p>
          </div>
        ))}
      </section>

      {/* Filter chips */}
      <div role="group" aria-label="กรองสถานะ" className="mb-4 flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-pressed={filter === chip.key}
            onClick={() => setFilter(chip.key)}
            className={cn(
              'min-h-[44px] rounded-full px-4 py-2.5 text-small font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              filter === chip.key
                ? 'bg-ink text-canvas'
                : 'bg-canvas-soft text-ink-muted hover:text-ink'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Request list */}
      <Card variant="raised" size="lg">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <CardTitle>คำร้องของฉัน</CardTitle>
          <div
            role="search"
            className="flex w-full min-w-0 items-center gap-2 rounded-full border border-hairline bg-canvas-soft px-3 py-2 text-small text-ink-muted sm:w-auto sm:min-w-[220px]"
          >
            <Search size={14} aria-hidden />
            <span>ค้นหารหัสหรือหัวข้อ…</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-small text-ink-muted">ไม่มีคำร้องในสถานะนี้</p>
        ) : (
          <ul role="list" className="divide-y divide-hairline">
            {filtered.slice(0, 8).map((r) => {
              const meta = REQUEST_STATUS_META[r.status];
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:gap-3"
                >
                  <span
                    aria-hidden
                    className="flex h-10 w-8 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-hairline bg-canvas-soft text-ink-muted"
                  >
                    <FileText size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-semibold text-ink">
                      {r.href ? (
                        <Link href={r.href} className="hover:text-accent">{r.type}</Link>
                      ) : r.type}{' '}
                      <span className="font-mono text-small font-normal text-ink-muted">
                        · {r.id}
                      </span>
                    </p>
                    <p className="text-small text-ink-muted">
                      {r.sub} · ส่ง {r.submitted}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] whitespace-nowrap',
                        meta.toneClass
                      )}
                    >
                      {meta.label}
                    </span>
                    {/* STA-175 — self-cancel: only the employee's OWN first-approval row. */}
                    {r.cancellable && r.requesterId === currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancelRow(r)}
                      >
                        {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
                      </Button>
                    )}
                    <button
                      type="button"
                      aria-label={`ดูรายละเอียดการอนุมัติ ${r.id}`}
                      onClick={() => setSelected(r)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-canvas-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      <ArrowRight size={14} aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
            {filtered.length > 8 && (
              <li className="flex items-center gap-2 py-3 text-small text-ink-muted">
                <span>Showing 8 of {filtered.length}</span>
                <span aria-hidden className="text-ink-faint">·</span>
                <span className="font-medium text-accent">View all</span>
              </li>
            )}
          </ul>
        )}
      </Card>

      <RequestDetailModal open={selected !== null} request={selected} onClose={() => setSelected(null)} />

      {/* STA-175 — shared self-cancel confirm modal. */}
      {cancelFields && (
        <CancelRequestModal
          open={cancelRow !== null}
          onClose={() => setCancelRow(null)}
          onConfirm={handleConfirmCancel}
          locale={locale}
          fields={cancelFields}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Request detail modal — shows approval chain
// ────────────────────────────────────────────────────────────

const STEP_TONE: Record<HumiApprovalStep['status'], string> = {
  approved: 'bg-[color:var(--color-sage-soft)] text-[color:var(--color-sage-ink)]',
  pending: 'bg-[color:var(--color-butter-soft)] text-[color:var(--color-butter-ink)]',
  rejected: 'bg-[color:var(--color-accent-alt-soft)] text-[color:var(--color-accent-alt-ink)]',
  skipped: 'bg-canvas-soft text-ink-muted',
};

const STEP_LABEL: Record<HumiApprovalStep['status'], string> = {
  approved: 'อนุมัติแล้ว',
  pending: 'รออนุมัติ',
  rejected: 'ไม่อนุมัติ',
  skipped: 'ข้ามขั้น',
};

function RequestDetailModal({ open, request, onClose }: { open: boolean; request: MineRow | null; onClose: () => void }) {
  if (!request) return null;
  const meta = REQUEST_STATUS_META[request.status];
  return (
    <Modal open={open} onClose={onClose} title={`${request.type} · ${request.id}`} widthClass="max-w-xl">
      <div className="space-y-4">
        <div className="rounded-md bg-canvas-soft px-4 py-3">
          <p className="text-small text-ink-muted">{request.sub}</p>
          <p className="mt-1 text-small text-ink-muted">
            ส่งเมื่อ {request.submitted}
            <span className={cn('ml-2 rounded-full px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em]', meta.toneClass)}>
              {meta.label}
            </span>
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-small font-semibold uppercase tracking-[0.14em] text-ink-muted">ลำดับการอนุมัติ</h4>
          {request.approvalChain.length === 0 ? (
            <p className="text-small text-ink-muted">ยังไม่มีผู้อนุมัติ</p>
          ) : (
            <ol className="space-y-3">
              {request.approvalChain.map((step, i) => (
                <li key={`${step.name}-${i}`} className="flex items-start gap-3">
                  <Avatar name={step.name} tone={step.tone} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body font-semibold text-ink">{step.name}</p>
                      <span className={cn('rounded-full px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em]', STEP_TONE[step.status])}>
                        {STEP_LABEL[step.status]}
                      </span>
                    </div>
                    <p className="text-small text-ink-muted">{step.role}{step.when ? ` · ${step.when}` : ''}</p>
                    {step.note ? <p className="mt-1 text-small text-ink">{step.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>ปิด</Button>
        </div>
      </div>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Catalog — with template form
// ────────────────────────────────────────────────────────────

function CatalogTab({ onSubmitted }: { onSubmitted: (msg: string) => void }) {
  const submit = useRequestsStore((s) => s.submit);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fields = selectedTemplate
    ? (TEMPLATE_FIELDS[selectedTemplate] ?? TEMPLATE_FIELDS.default)
    : null;

  const selectedCatalog = REQUEST_FORM_CATALOG.find((f) => f.id === selectedTemplate);

  function handleFieldChange(id: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  function validateFields() {
    if (!fields) return {};
    const errs: Record<string, string> = {};
    fields.forEach((f) => {
      if (!fieldValues[f.id]?.trim()) {
        errs[f.id] = 'กรุณากรอกข้อมูล';
      }
    });
    return errs;
  }

  function handleSubmit() {
    const errs = validateFields();
    setErrors(errs);
    if (Object.keys(errs).length > 0 || !selectedCatalog) return;

    const sub = fields!
      .map((f) => `${f.label}: ${fieldValues[f.id]?.trim()}`)
      .join(' · ');

    submit({ type: selectedCatalog.title, sub });
    setSelectedTemplate(null);
    setFieldValues({});
    setErrors({});
    onSubmitted(`ส่งคำร้อง "${selectedCatalog.title}" เรียบร้อยแล้ว · สถานะ: รออนุมัติ`);
  }

  return (
    <>
      {/* Hero */}
      <Card
        variant="raised"
        size="lg"
        className="humi-banner mb-6"
      >
        <div
          aria-hidden
          className="absolute -right-10 -top-10 h-36 w-28 rounded-full bg-accent opacity-40 blur-2xl"
        />
        <div className="relative">
          <CardEyebrow>
            แบบฟอร์มคำร้องทั้งหมด · {REQUEST_FORM_CATALOG.length} ประเภท
          </CardEyebrow>
          <h2
            className={cn(
              'mt-2 max-w-2xl font-display font-semibold tracking-tight text-ink',
              'text-[length:var(--text-display-h2)] leading-[var(--text-display-h2--line-height)]'
            )}
          >
            เลือกแบบฟอร์มที่คุณต้องการยื่น
          </h2>
          <p className="mt-2 max-w-xl text-body text-ink-soft leading-relaxed">
            คำร้องทุกประเภทจะถูกส่งต่อไปยังผู้มีอำนาจอนุมัติโดยอัตโนมัติ
            คุณสามารถติดตามสถานะได้จากแท็บ &quot;คำร้องของฉัน&quot;
          </p>
        </div>
      </Card>

      {/* Inline form when template selected */}
      {selectedTemplate && selectedCatalog && fields && (
        <Card variant="raised" size="lg" className="mb-6 border border-accent/30">
          <div className="mb-5 flex items-center justify-between gap-3">
            <CardTitle>กรอกข้อมูล: {selectedCatalog.title}</CardTitle>
            <button
              type="button"
              onClick={() => { setSelectedTemplate(null); setFieldValues({}); setErrors({}); }}
              className="text-small text-ink-muted hover:text-ink"
            >
              ยกเลิก
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {fields.map((field) => (
              <div key={field.id} className="flex flex-col gap-1.5">
                <label htmlFor={field.id} className="text-small font-medium text-ink-soft">
                  {field.label} *
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.id}
                    value={fieldValues[field.id] ?? ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    aria-invalid={!!errors[field.id]}
                    className={cn(inputClass, 'min-h-[80px] resize-y', errors[field.id] && 'border-[color:var(--color-warning)]')}
                  />
                ) : (
                  <input
                    id={field.id}
                    type="text"
                    value={fieldValues[field.id] ?? ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    aria-invalid={!!errors[field.id]}
                    className={cn(inputClass, errors[field.id] && 'border-[color:var(--color-warning)]')}
                  />
                )}
                {errors[field.id] && (
                  <p role="alert" className="flex items-center gap-1 text-[length:var(--text-eyebrow)] text-[color:var(--color-warning)]">
                    <AlertCircle size={12} aria-hidden />
                    {errors[field.id]}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" block onClick={handleSubmit} className="sm:w-auto">
              ส่งคำร้อง
            </Button>
            <Button variant="ghost" block onClick={() => { setSelectedTemplate(null); setFieldValues({}); setErrors({}); }} className="sm:w-auto">
              ยกเลิก
            </Button>
          </div>
        </Card>
      )}

      <Card variant="raised" size="md" className="mb-4 border border-accent/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardEyebrow>สวัสดิการ</CardEyebrow>
            <CardTitle>เบิกสวัสดิการ</CardTitle>
            <p className="mt-1 text-small text-ink-muted">
              เริ่มคำขอจากข้อมูลสิทธิ์ในโปรไฟล์ เพื่อไม่ให้เกิดแบบฟอร์มซ้ำใน Requests
            </p>
          </div>
          <Link href="/th/profile/me?tab=benefits" className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-canvas-soft px-4 text-small font-semibold text-ink hover:bg-hairline-soft">
            ไปที่สวัสดิการของฉัน <ArrowRight size={14} className="ml-2" />
          </Link>
        </div>
      </Card>

      {/* Catalog grid */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REQUEST_FORM_CATALOG.map((f) => {
          const Icon = ICONS[f.icon];
          const isSelected = selectedTemplate === f.id;
          return (
            <Card
              key={f.id}
              variant="raised"
              size="md"
              className={cn(
                'humi-card-lift',
                isSelected && 'ring-2 ring-accent ring-offset-2 ring-offset-surface'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className={cn(
                    'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)]',
                    ACCENT_ICON_CLASS[f.accent]
                  )}
                >
                  <Icon size={20} />
                </span>
                <span className="rounded-full bg-canvas-soft px-2.5 py-1 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted whitespace-nowrap">
                  SLA {f.sla}
                </span>
              </div>
              <CardTitle className="mt-3 text-[length:var(--text-body-lg)] leading-snug">
                {f.title}
              </CardTitle>
              <p className="mt-1 text-small text-ink-soft leading-relaxed">
                {f.subtitle}
              </p>
              {f.id === 'claim' ? (
                <Link href="/th/profile/me?tab=benefits" className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-canvas-soft px-4 py-2.5 text-small font-semibold text-ink hover:bg-accent-soft">
                  ไปที่โปรไฟล์เพื่อเบิกสวัสดิการ
                </Link>
              ) : (
                <Button
                  variant={isSelected ? 'secondary' : 'ghost'}
                  block
                  className="mt-4"
                  trailingIcon={<ArrowRight size={13} />}
                  onClick={() => setSelectedTemplate(isSelected ? null : f.id)}
                >
                  {isSelected ? 'กำลังกรอก' : 'เริ่มกรอก'}
                </Button>
              )}
            </Card>
          );
        })}
      </section>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Approvals
// ────────────────────────────────────────────────────────────

function ApprovalsTab({ locale }: { locale: string }) {
  return (
    <Card variant="raised" size="lg">
      <div className="mb-4">
        <CardEyebrow>
          {locale === 'th' ? 'คิวอนุมัติทั้งหมด' : 'Full Approval Queue'}
        </CardEyebrow>
        <CardTitle className="mt-1">
          {locale === 'th' ? 'ดูและดำเนินการอนุมัติได้ที่จัดการคำขอเวิร์กโฟลว์' : 'Review and action approvals in Manage workflow request'}
        </CardTitle>
        <p className="mt-2 text-small text-ink-muted">
          {locale === 'th'
            ? 'คำร้องทุกประเภทรวมอยู่ที่จัดการคำขอเวิร์กโฟลว์ สามารถอนุมัติ ปฏิเสธ หรือส่งคืนได้ครบในที่เดียว'
            : 'All pending requests are consolidated in Manage workflow request where you can approve, reject, or send back in one place.'}
        </p>
      </div>
      <Link
        href={`/${locale}/quick-approve`}
        className={cn(
          'inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 py-2.5',
          'bg-ink text-canvas text-small font-semibold',
          'hover:bg-ink/90 transition-colors'
        )}
      >
        {locale === 'th' ? 'ไปที่จัดการคำขอเวิร์กโฟลว์' : 'Go to Manage workflow request'}
        <ArrowRight size={14} aria-hidden />
      </Link>
    </Card>
  );
}

// ────────── helpers ──────────

const inputClass = cn(
  'w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  'placeholder:text-ink-faint'
);

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-4 py-3 text-body font-medium transition-colors whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        active
          ? 'border-accent text-ink'
          : 'border-transparent text-ink-muted hover:text-ink'
      )}
    >
      {children}
      {typeof count === 'number' && (
        <span className="ml-1.5 font-normal text-ink-muted">({count})</span>
      )}
    </button>
  );
}

// ACCENT_BAR_CLASS imported for tree-shaking predictability
void ACCENT_BAR_CLASS;
