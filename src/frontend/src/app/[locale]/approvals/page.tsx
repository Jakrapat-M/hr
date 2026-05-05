'use client';

// /[locale]/approvals — UNIFIED approval inbox.
//
// Replaces /spd/inbox + scattered manager queues. One flat sorted list
// across all five approval domains plus the live Camunda benefit-request
// task lane. Each row stays compact when collapsed and reuses the
// existing per-domain inbox components for the expanded detail render
// (BenefitClaimsInbox, BenefitReferralInbox, ApprovalInbox, …).
//
// Persona visibility (phase-1 demo): every authenticated user sees every
// pending row, with the domain badge clarifying source. RBAC tightening
// (manager-only sees their reports; HR Admin read-only over all) is a
// phase-2 task tracked inline below.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Hospital,
  Inbox,
  IdCard,
  LogOut,
  Search,
  TrendingUp,
  UserCog,
  Workflow,
} from 'lucide-react';

import { ApprovalInbox } from '@/components/workflow/ApprovalInbox';
import { TerminationInbox } from '@/components/workflow/TerminationInbox';
import { PromotionInbox } from '@/components/workflow/PromotionInbox';
import { BenefitClaimsInbox } from '@/components/workflow/BenefitClaimsInbox';
import { BenefitReferralInbox } from '@/components/workflow/BenefitReferralInbox';
import { useAuthStore } from '@/stores/auth-store';
import {
  BENEFIT_STATUS_LABEL,
  useBenefitClaimsStore,
} from '@/stores/benefit-claims';
import {
  BENEFIT_REFERRAL_STATUS_LABEL,
  useBenefitReferralsStore,
} from '@/stores/benefit-referrals';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import {
  TERMINATION_REASON_LABEL,
  TERMINATION_STEP_LABEL,
  useTerminationApprovals,
} from '@/stores/termination-approvals';
import {
  PROMOTION_STEP_LABEL,
  usePromotionApprovals,
} from '@/stores/promotion-approvals';
import { listPendingTasks, type PendingTaskSummary } from '@/lib/workflow-api';
import {
  countByDomain,
  filterApprovalRows,
  mergeApprovalRows,
  type ApprovalDomain,
  type ApprovalRow,
  type DomainFilter,
  type StatusFilter,
} from '@/lib/approvals-merge';

const STEP_LABEL_FALLBACK = {
  pending_spd: 'รอ SPD อนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ถูกปฏิเสธ',
};

const CAMUNDA_POLL_MS = 12_000;
const CAMUNDA_FALLBACK_ASSIGNEE = 'demo';

// ── Domain meta — colour pip + icon + label key per domain. Visual sorting
//    cue when the user is scanning the flat list at a glance.
const DOMAIN_META: Record<
  Exclude<ApprovalDomain, 'benefitCamunda'>,
  { icon: typeof Inbox; tone: string; labelKey: keyof DomainLabels }
> = {
  benefit:      { icon: Briefcase, tone: 'var(--color-mint, #4a9d6c)',     labelKey: 'benefit' },
  referral:     { icon: Hospital,  tone: 'var(--color-rose, #c0506b)',     labelKey: 'referral' },
  personalInfo: { icon: IdCard,    tone: 'var(--color-butter, #d8a73a)',   labelKey: 'personalInfo' },
  termination:  { icon: LogOut,    tone: 'var(--color-clay, #b56556)',     labelKey: 'termination' },
  promotion:    { icon: TrendingUp,tone: 'var(--color-cobalt, #4f6ec9)',   labelKey: 'promotion' },
};

interface DomainLabels {
  benefit: string;
  referral: string;
  personalInfo: string;
  termination: string;
  promotion: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApprovalsInboxPage() {
  const t = useTranslations('approvalsInbox');

  // ── Persona ───────────────────────────────────────────────────────────────
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const roles = useAuthStore((s) => s.roles);
  const primaryRole = roles[0] ?? 'employee';

  // ── Source stores ─────────────────────────────────────────────────────────
  const benefitClaims = useBenefitClaimsStore((s) => s.claims);
  const referrals = useBenefitReferralsStore((s) => s.referrals);
  const personalInfo = useWorkflowApprovals((s) => s.requests);
  const terminations = useTerminationApprovals((s) => s.requests);
  const promotions = usePromotionApprovals((s) => s.requests);

  // ── Camunda live lane (manager / SPD shared). Polls every 12s. ────────────
  const camundaAssignee = userId ?? CAMUNDA_FALLBACK_ASSIGNEE;
  const [camundaTasks, setCamundaTasks] = useState<PendingTaskSummary[]>([]);
  const [camundaError, setCamundaError] = useState<string | null>(null);

  const refreshCamunda = useCallback(async () => {
    try {
      const next = await listPendingTasks({ assignee: camundaAssignee });
      setCamundaTasks(next);
      setCamundaError(null);
    } catch (e) {
      setCamundaError(e instanceof Error ? e.message : String(e));
    }
  }, [camundaAssignee]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => { if (!cancelled) await refreshCamunda(); };
    void tick();
    const handle = window.setInterval(tick, CAMUNDA_POLL_MS);
    return () => { cancelled = true; window.clearInterval(handle); };
  }, [refreshCamunda]);

  // ── Merge ─────────────────────────────────────────────────────────────────
  const allRows = useMemo<ApprovalRow[]>(
    () =>
      mergeApprovalRows({
        benefitClaims,
        benefitClaimStatusLabels: BENEFIT_STATUS_LABEL,
        camundaTasks,
        referrals,
        referralStatusLabels: BENEFIT_REFERRAL_STATUS_LABEL,
        personalInfo,
        personalInfoStatusLabels: STEP_LABEL_FALLBACK,
        terminations,
        terminationStatusLabels: TERMINATION_STEP_LABEL,
        terminationReasonLabels: TERMINATION_REASON_LABEL,
        promotions,
        promotionStatusLabels: PROMOTION_STEP_LABEL,
      }),
    [benefitClaims, camundaTasks, referrals, personalInfo, terminations, promotions],
  );

  // ── Filter UI state ───────────────────────────────────────────────────────
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [query, setQuery] = useState('');

  const visibleRows = useMemo(
    () => filterApprovalRows(allRows, { domain: domainFilter, status: statusFilter, query }),
    [allRows, domainFilter, statusFilter, query],
  );
  const pendingCounts = useMemo(() => countByDomain(allRows), [allRows]);
  const totalPending = useMemo(
    () => allRows.filter((r) => r.status === 'pending').length,
    [allRows],
  );

  const domainLabels: DomainLabels = {
    benefit: t('filter.domain.benefit'),
    referral: t('filter.domain.referral'),
    personalInfo: t('filter.domain.personalInfo'),
    termination: t('filter.domain.termination'),
    promotion: t('filter.domain.promotion'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* ─── Editorial header ──────────────────────────────────────────── */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="humi-eyebrow" style={{ letterSpacing: '0.18em' }}>
          {t('eyebrow')}
        </span>
        <h1 className="font-display text-[26px] font-semibold text-ink" style={{ lineHeight: 1.15 }}>
          {t('title')}
        </h1>
        <p className="text-small text-ink-muted" style={{ maxWidth: 640 }}>
          {t('subtitle')}
        </p>

        {/* Persona "byline" — narrow, italicised marker like a magazine lede. */}
        <div
          className="humi-row"
          style={{
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--color-hairline-soft)',
          }}
        >
          <span
            className="humi-row"
            style={{
              gap: 6,
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: 999,
              background: 'var(--color-canvas-soft)',
              border: '1px solid var(--color-hairline)',
            }}
          >
            <UserCog size={12} aria-hidden style={{ opacity: 0.7 }} />
            <span className="text-small text-ink-muted">{t('viewingAs')}</span>
            <span className="text-small font-semibold text-ink">
              {t(`role.${primaryRole}`)}
            </span>
            {username && (
              <span className="text-small text-ink-muted" style={{ fontStyle: 'italic' }}>
                · {username}
              </span>
            )}
          </span>
          <span
            className="humi-row"
            style={{ gap: 6, alignItems: 'center', color: 'var(--color-ink-muted)' }}
          >
            <Clock size={12} aria-hidden />
            <span className="text-small">
              {t('totalPending', { count: totalPending })}
            </span>
          </span>
        </div>
      </header>

      {/* ─── Domain pulse strip ───────────────────────────────────────── */}
      <nav
        aria-label={t('filter.domain.label')}
        className="humi-row"
        style={{ gap: 8, flexWrap: 'wrap' }}
      >
        <DomainChip
          active={domainFilter === 'all'}
          onClick={() => setDomainFilter('all')}
          icon={<Filter size={12} aria-hidden />}
          label={t('filter.domain.all')}
          count={totalPending}
        />
        {(Object.keys(DOMAIN_META) as Array<keyof typeof DOMAIN_META>).map((d) => {
          const meta = DOMAIN_META[d];
          const Icon = meta.icon;
          const count =
            d === 'benefit'
              ? pendingCounts.benefit + pendingCounts.benefitCamunda
              : pendingCounts[d];
          return (
            <DomainChip
              key={d}
              active={domainFilter === d}
              onClick={() => setDomainFilter(d)}
              icon={<Icon size={12} aria-hidden />}
              label={domainLabels[meta.labelKey]}
              count={count}
              tone={meta.tone}
            />
          );
        })}
      </nav>

      {/* ─── Status chips + search ───────────────────────────────────── */}
      <div
        className="humi-row"
        style={{
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          paddingBottom: 4,
          borderBottom: '1px solid var(--color-hairline-soft)',
        }}
      >
        <div className="humi-row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
            <StatusChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={t(`filter.status.${s}`)}
            />
          ))}
        </div>
        <div className="humi-spacer" style={{ flex: 1 }} />
        <label
          className="humi-row"
          style={{
            gap: 6,
            alignItems: 'center',
            background: 'var(--color-canvas-soft)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 8,
            padding: '6px 10px',
            minWidth: 220,
          }}
        >
          <Search size={12} aria-hidden style={{ opacity: 0.6 }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            className="text-small text-ink"
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              flex: 1,
              minWidth: 0,
            }}
          />
        </label>
      </div>

      {/* ─── Camunda gateway-down hint ─────────────────────────────── */}
      {camundaError && (
        <div
          className="humi-card"
          style={{ padding: '8px 12px', borderColor: 'var(--color-danger, #c0392b)' }}
          role="status"
        >
          <p className="text-small text-ink-muted">
            <Workflow size={11} className="inline mr-1" aria-hidden />
            {t('camundaOffline', { error: camundaError })}
          </p>
        </div>
      )}

      {/* ─── Flat list ───────────────────────────────────────────────── */}
      <section aria-label={t('listLabel')}>
        {visibleRows.length === 0 ? (
          <div
            className="humi-card humi-card--cream"
            style={{ textAlign: 'center', padding: 56 }}
          >
            <Inbox size={28} aria-hidden style={{ opacity: 0.4, marginBottom: 8 }} />
            <p className="text-body text-ink-muted">{t('empty')}</p>
            <p className="text-small text-ink-muted mt-1">{t('emptyHint')}</p>
          </div>
        ) : (
          <ul
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}
          >
            {visibleRows.map((row) => (
              <li key={row.key}>
                <ApprovalRowItem row={row} domainLabels={domainLabels} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Phase-2 visibility-rule note kept here so the next maintainer sees the
          intent without grepping. Strip when RBAC is enforced server-side. */}
      <p className="text-small text-ink-faint" style={{ marginTop: 8, fontStyle: 'italic' }}>
        {t('phaseTwoHint')}
      </p>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function DomainChip({
  active,
  onClick,
  icon,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="humi-row"
      style={{
        gap: 6,
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: 999,
        border: active
          ? '1px solid var(--color-ink)'
          : '1px solid var(--color-hairline)',
        background: active ? 'var(--color-ink)' : 'var(--color-canvas)',
        color: active ? 'var(--color-canvas)' : 'var(--color-ink-muted)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition:
          'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
      }}
    >
      {tone && (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: 999,
            background: tone,
          }}
        />
      )}
      {icon}
      <span>{label}</span>
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
          opacity: active ? 1 : 0.7,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function StatusChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        border: 'none',
        background: active ? 'var(--color-accent-soft, #f0ead8)' : 'transparent',
        color: active ? 'var(--color-ink)' : 'var(--color-ink-muted)',
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        textDecorationLine: active ? 'none' : 'underline',
        textDecorationColor: 'transparent',
        transition: 'background var(--dur-fast) var(--ease-out)',
      }}
    >
      {label}
    </button>
  );
}

function ApprovalRowItem({
  row,
  domainLabels,
}: {
  row: ApprovalRow;
  domainLabels: DomainLabels;
}) {
  const t = useTranslations('approvalsInbox');

  // Camunda lane shares the benefit visual badge but with its own label.
  const isCamunda = row.domain === 'benefitCamunda';
  const badgeKey: keyof DomainLabels = isCamunda ? 'benefit' : (row.domain as keyof DomainLabels);
  const meta = DOMAIN_META[badgeKey];
  const Icon = isCamunda ? Workflow : meta.icon;

  const submitted = useMemo(() => {
    try {
      return new Date(row.submittedAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return row.submittedAt;
    }
  }, [row.submittedAt]);

  const statusToneVar =
    row.status === 'approved'
      ? 'var(--color-mint, #4a9d6c)'
      : row.status === 'rejected'
      ? 'var(--color-clay, #b56556)'
      : 'var(--color-butter, #d8a73a)';

  return (
    <details
      className="humi-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        transition: 'box-shadow var(--dur-base) var(--ease-spring)',
      }}
    >
      <summary
        className="humi-row"
        style={{
          gap: 10,
          alignItems: 'center',
          padding: '12px 16px',
          cursor: 'pointer',
          listStyle: 'none',
          flexWrap: 'wrap',
        }}
      >
        {/* Left pip — domain accent */}
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 6,
            height: 22,
            borderRadius: 3,
            background: meta.tone,
            flexShrink: 0,
          }}
        />

        {/* Domain badge */}
        <span
          className="humi-row"
          style={{
            gap: 4,
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: 6,
            background: 'var(--color-canvas-soft)',
            border: '1px solid var(--color-hairline-soft)',
            fontSize: 11,
            color: 'var(--color-ink-muted)',
            flexShrink: 0,
          }}
        >
          <Icon size={11} aria-hidden />
          <span>{isCamunda ? t('badge.camunda') : domainLabels[badgeKey]}</span>
        </span>

        {/* Title + requester */}
        <span style={{ flex: 1, minWidth: 200 }}>
          <span className="text-small font-semibold text-ink" style={{ display: 'block' }}>
            {row.title}
          </span>
          <span className="text-small text-ink-muted" style={{ display: 'block', fontSize: 12 }}>
            {row.requesterName}
            {row.requesterId ? ` · ${row.requesterId}` : ''}
          </span>
        </span>

        {/* Highlight (amount/date) */}
        {row.highlight && (
          <span
            className="text-small"
            style={{
              color: 'var(--color-ink)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              minWidth: 100,
              textAlign: 'right',
            }}
          >
            {row.highlight}
          </span>
        )}

        <span
          className="text-small text-ink-muted"
          style={{ minWidth: 90, textAlign: 'right', fontSize: 11 }}
        >
          {submitted}
        </span>

        {/* Status pip */}
        <span
          className="humi-row"
          style={{
            gap: 6,
            alignItems: 'center',
            padding: '2px 10px',
            borderRadius: 999,
            background: 'var(--color-canvas-soft)',
            fontSize: 11,
            color: 'var(--color-ink)',
            flexShrink: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: 999,
              background: statusToneVar,
            }}
          />
          {row.rawStatusLabel}
        </span>

        {/* Expand affordance — flips on open via the parent `details[open]` selector */}
        <span aria-hidden style={{ flexShrink: 0, color: 'var(--color-ink-muted)' }}>
          <ChevronRight
            size={14}
            className="approvals-row-chev"
            style={{ transition: 'transform var(--dur-fast) var(--ease-spring)' }}
          />
        </span>
      </summary>

      <div
        style={{
          borderTop: '1px solid var(--color-hairline-soft)',
          padding: '14px 16px',
          background: 'var(--color-canvas-soft)',
        }}
      >
        <ExpandedDetail row={row} />
      </div>

      {/* Tiny inline rule: rotate chevron when open. Kept inline so we don't
          have to add a CSS file just for this page. */}
      <style>{`
        details[open] > summary .approvals-row-chev {
          transform: rotate(90deg);
        }
      `}</style>
    </details>
  );
}

// ── Expanded detail — reuses existing per-domain inbox components ────────────
//
// We render the entire domain inbox inside the panel rather than extracting
// the per-row card, because the inbox components own their own data hooks
// and approve/reject handlers. Rendering twice in the same view is the
// pragmatic compromise the spec calls out: once filtered to the row the
// user clicked, the inbox surfaces only the matching item plus any sibling
// pending items the persona has access to. Wrapping in <Capability> would
// hide them entirely from non-SPD personas, so we render unconditionally
// and rely on per-row handlers to enforce action-level RBAC.

function ExpandedDetail({ row }: { row: ApprovalRow }) {
  switch (row.domain) {
    case 'benefit':
    case 'benefitCamunda':
      return <BenefitClaimsInbox />;
    case 'referral':
      return <BenefitReferralInbox />;
    case 'personalInfo':
      return (
        <ApprovalInbox
          role="spd"
          expectedStep="pending_spd"
          title="แก้ไขข้อมูลส่วนตัว"
          subtitle="คำขอแก้ไขข้อมูลส่วนตัวที่รอการอนุมัติ (BRD #166)"
        />
      );
    case 'termination':
      return <TerminationInbox />;
    case 'promotion':
      return <PromotionInbox />;
    default: {
      // Exhaustiveness guard — TypeScript will fail this branch if a new
      // domain is added without a render-case above.
      const _exhaustive: never = row;
      return null;
    }
  }
}
