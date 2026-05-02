'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, Info } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Card, CardEyebrow, CardTitle } from '@/components/humi';
import { cn } from '@/lib/utils';
import {
  BENEFIT_RULES_REGISTRY,
  RULE_BASE_OBJECTS,
  getRulesByBaseObject,
  type BenefitRule,
  type BenefitRuleBaseObject,
} from '@/data/benefits/rules-registry';

// ── Types ────────────────────────────────────────────────────────────────────

interface BenefitRulesViewerProps {
  /** If set, the viewer scrolls to and highlights this rule on mount. */
  highlightRuleId?: string;
  /** i18n strings passed from the server page via useTranslations */
  t: {
    eyebrow: string;
    title: string;
    subtitle: string;
    groupBenefitEmployeeClaim: string;
    groupBenefitInsurancePlan: string;
    groupBenefit: string;
    groupSpecialPrivilege: string;
    groupExceptionDetails: string;
    colCode: string;
    colDescription: string;
    colLastModified: string;
    detailCode: string;
    detailDescription: string;
    detailScenario: string;
    detailLastModified: string;
    detailBaseObject: string;
    viewDsl: string;
    hideDsl: string;
    noRules: string;
    eligibilityRule: string;
    viewRule: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupLabel(
  baseObject: BenefitRuleBaseObject,
  t: BenefitRulesViewerProps['t'],
): string {
  const map: Record<BenefitRuleBaseObject, string> = {
    BenefitEmployeeClaim: t.groupBenefitEmployeeClaim,
    BenefitInsurancePlan: t.groupBenefitInsurancePlan,
    Benefit: t.groupBenefit,
    cust_BE_BenefitSpecialPrivilegeDetail: t.groupSpecialPrivilege,
    BenefitExceptionDetails: t.groupExceptionDetails,
  };
  return map[baseObject];
}

// ── Rule detail side panel ────────────────────────────────────────────────────

function RuleDetail({
  rule,
  t,
}: {
  rule: BenefitRule;
  t: BenefitRulesViewerProps['t'];
}) {
  const [dslOpen, setDslOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          {t.detailCode}
        </p>
        <p className="font-mono text-small font-medium text-ink break-all">{rule.id}</p>
      </div>

      <div className="space-y-1">
        <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          {t.detailBaseObject}
        </p>
        <p className="text-small text-ink font-mono">{rule.baseObject}</p>
      </div>

      <div className="space-y-1">
        <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          {t.detailDescription}
        </p>
        <p className="text-small text-ink">{rule.description}</p>
      </div>

      {rule.scenario && (
        <div className="space-y-1">
          <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            {t.detailScenario}
          </p>
          <p className="text-small text-ink">{rule.scenario}</p>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          {t.detailLastModified}
        </p>
        <p className="text-small text-ink">{rule.lastModified}</p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setDslOpen((v) => !v)}
          className="flex items-center gap-1.5 text-small font-medium text-accent hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[var(--radius-sm)]"
        >
          <FileCode size={14} aria-hidden="true" />
          {dslOpen ? t.hideDsl : t.viewDsl}
        </button>
        {dslOpen && (
          <pre className="mt-2 overflow-x-auto rounded-[var(--radius-md)] bg-canvas-soft p-3 text-[11px] leading-relaxed text-ink-muted whitespace-pre-wrap break-all">
            {rule.dslBody}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── Accordion group ───────────────────────────────────────────────────────────

function RuleGroup({
  baseObject,
  rules,
  selectedRuleId,
  onSelect,
  t,
  defaultOpen,
}: {
  baseObject: BenefitRuleBaseObject;
  rules: BenefitRule[];
  selectedRuleId: string | null;
  onSelect: (id: string) => void;
  t: BenefitRulesViewerProps['t'];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const label = groupLabel(baseObject, t);

  return (
    <div className="border border-hairline rounded-[var(--radius-md)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-canvas-soft px-4 py-3 text-left hover:bg-canvas transition-colors duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-small font-semibold text-ink">{label}</span>
          <span className="rounded-[var(--radius-sm)] bg-accent-soft px-1.5 py-0.5 text-[length:var(--text-eyebrow)] font-semibold text-accent">
            {rules.length}
          </span>
        </span>
        {open ? (
          <ChevronDown size={16} aria-hidden="true" className="text-ink-muted shrink-0" />
        ) : (
          <ChevronRight size={16} aria-hidden="true" className="text-ink-muted shrink-0" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-hairline">
          {rules.length === 0 ? (
            <p className="px-4 py-3 text-small text-ink-muted">{t.noRules}</p>
          ) : (
            rules.map((rule) => {
              const active = rule.id === selectedRuleId;
              return (
                <button
                  key={rule.id}
                  type="button"
                  id={`rule-${rule.id}`}
                  onClick={() => onSelect(rule.id)}
                  className={cn(
                    'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors duration-[var(--dur-fast)] hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
                    active && 'bg-accent-soft',
                  )}
                >
                  <span className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.08em] text-ink break-all">
                    {rule.id}
                  </span>
                  <span className="text-small text-ink-muted line-clamp-2">{rule.description}</span>
                  <span className="text-[length:var(--text-eyebrow)] text-ink-muted">{rule.lastModified}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Main viewer ───────────────────────────────────────────────────────────────

export function BenefitRulesViewer({ highlightRuleId, t }: BenefitRulesViewerProps) {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(
    highlightRuleId ?? null,
  );
  const selectedRule = selectedRuleId
    ? BENEFIT_RULES_REGISTRY.find((r) => r.id === selectedRuleId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <header>
        <CardEyebrow>{t.eyebrow}</CardEyebrow>
        <h1 className="font-display text-[28px] font-semibold text-ink">{t.title}</h1>
        <p className="mt-2 text-small text-ink-muted">{t.subtitle}</p>
      </header>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        {RULE_BASE_OBJECTS.map((obj) => {
          const count = getRulesByBaseObject(obj).length;
          return (
            <div
              key={obj}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-1.5"
            >
              <span className="font-mono text-[length:var(--text-eyebrow)] text-ink-muted">{obj}</span>
              <span className="rounded-[var(--radius-sm)] bg-accent-soft px-1.5 py-0.5 text-[length:var(--text-eyebrow)] font-semibold text-accent">
                {count}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-1.5 ml-auto">
          <Info size={13} aria-hidden="true" className="text-ink-muted" />
          <span className="text-small text-ink-muted">{BENEFIT_RULES_REGISTRY.length} total</span>
        </div>
      </div>

      {/* Main two-panel layout */}
      <div className="flex gap-6 items-start">
        {/* Left: accordion groups */}
        <div className="flex-1 min-w-0 space-y-3">
          {RULE_BASE_OBJECTS.map((obj, i) => (
            <RuleGroup
              key={obj}
              baseObject={obj}
              rules={getRulesByBaseObject(obj)}
              selectedRuleId={selectedRuleId}
              onSelect={setSelectedRuleId}
              t={t}
              defaultOpen={i === 0}
            />
          ))}
        </div>

        {/* Right: detail panel */}
        <div className="w-[360px] shrink-0 sticky top-6">
          <Card variant="raised" size="md">
            {selectedRule ? (
              <RuleDetail rule={selectedRule} t={t} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <FileCode size={32} className="text-ink-muted" aria-hidden="true" />
                <p className="text-small text-ink-muted">
                  Select a rule from the list to view details
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
