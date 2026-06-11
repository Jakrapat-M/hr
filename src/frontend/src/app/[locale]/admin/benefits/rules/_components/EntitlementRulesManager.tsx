'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, Plus, Pencil, Clock, Upload, Download } from 'lucide-react';

import { Card, CardEyebrow, CardTitle, Button, DataTable, Modal, Capability } from '@/components/humi';
import { rulesToCsv, downloadCsv, parseRulesCsv } from './rules-csv';
import type { DataTableColumn } from '@/components/humi/DataTable';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/stores/auth-store';
import { useBenefitHistoryStore } from '@/stores/benefit-history-store';
import { BenefitHistorySidebar } from '@/components/benefits/BenefitHistorySidebar';
import {
  listAllEligibilityRules,
  addEligibilityRule,
  updateEligibilityRule,
  deleteEligibilityRule,
  getEligibilityRuleHistory,
  ALL_BENEFIT_KEYS,
  BENEFIT_PLAN_LABELS,
  type EligibilityRule,
  type EligibilityRuleInput,
  type BenefitKey,
} from '@/lib/workflow-api';

// ── Constants ───────────────────────────────────────────────────────────────

const POLICY_PROFILES = ['CPN', 'RIS', 'CRC', 'CPFM', 'CPN-FOOD'] as const;

const EMPLOYEE_GROUPS = [
  { value: 'A', label: 'A - Permanent',         color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'B', label: 'B - Expat Outbound',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'C', label: 'C - Expat Inbound',     color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'D', label: 'D - Retirement',        color: 'bg-slate-50 text-slate-600 border-slate-200' },
  { value: 'E', label: 'E - Temporary',         color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { value: 'F', label: 'F - DVT',               color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'G', label: 'G - Internship',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'H', label: 'H - Contingent Worker', color: 'bg-stone-50 text-stone-700 border-stone-200' },
] as const;

const EMPLOYEE_SUBGROUPS = ['Permanent', 'Expat Outbound', 'Expat Inbound', 'Retirement', 'Temporary', 'DVT', 'Internship', 'Contingent Worker'] as const;

const PLAN_EFFECTIVE_OPTIONS = [
  { value: 'hire_date',           label: 'HireDate' },
  { value: 'pass_probation_date', label: 'PassProbationDate' },
  { value: 'day_from_hire_date',  label: 'DayFromHireDate' },
  { value: 'hour_from_hire_date', label: 'HourFromHireDate' },
] as const;

const CLAIM_PERIOD_OPTIONS = ['Year', 'Month', 'Quarter', 'One-time', 'Lifetime'] as const;

// STA-99 — table view: filter <select> styling mirrors the plans-catalog pattern.
const tableSelectClass =
  'h-9 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 text-small text-ink transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas';

function effectiveTypeLabel(value: string | null | undefined) {
  return PLAN_EFFECTIVE_OPTIONS.find((o) => o.value === value)?.label ?? (value || '-');
}

function egColor(value: string) {
  return EMPLOYEE_GROUPS.find((g) => g.value === value)?.color ?? 'bg-canvas-soft text-ink-soft border-hairline';
}
function egLabel(value: string) {
  return EMPLOYEE_GROUPS.find((g) => g.value === value)?.label ?? value;
}

// ── Main component ──────────────────────────────────────────────────────────

export function EntitlementRulesManager() {
  const { toast } = useToast();
  const t        = useTranslations('admin_benefits_entitlement_rules');
  const userId   = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const actorName = useAuthStore((s) => s.username) ?? username ?? 'admin';
  const addHistoryEntry = useBenefitHistoryStore((s) => s.addEntry);

  // Resolve a human-friendly label for a rule's history entry.
  const ruleTargetName = (rule: EligibilityRule) =>
    (('rule_name' in rule && typeof rule.rule_name === 'string' && rule.rule_name) ? rule.rule_name : null)
    ?? BENEFIT_PLAN_LABELS[rule.benefit_key as BenefitKey]?.th
    ?? rule.benefit_key;

  const [rules,          setRules]          = useState<EligibilityRule[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showAddForm,    setShowAddForm]    = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState<EligibilityRule | null>(null);
  const [editTarget,     setEditTarget]     = useState<EligibilityRule | null>(null);
  const [historyTarget,  setHistoryTarget]  = useState<EligibilityRule | null>(null);
  const [historyData,    setHistoryData]    = useState<EligibilityRule[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const all = await listAllEligibilityRules();
      setRules(all.filter((r) => r.scope_type === 'entitlement' && !r.effective_to));
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const handleAdd = async (input: EligibilityRuleInput, benefitKey: string) => {
    const newRule = await addEligibilityRule(benefitKey, input);
    setRules((prev) => [...prev, newRule]);
    // STA-102 — log rule creation (history keyed by benefit_key).
    addHistoryEntry({
      targetType: 'rule',
      targetId: newRule.benefit_key,
      targetName: ruleTargetName(newRule),
      action: 'create',
      actorName,
    });
    toast('success', 'เพิ่มกฎสิทธิ์เรียบร้อย');
  };

  const handleUpdate = async (input: Partial<EligibilityRuleInput>) => {
    if (!editTarget) return;
    const updated = await updateEligibilityRule(editTarget.benefit_key, editTarget.id, input);
    setRules((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    toast('success', 'แก้ไขกฎสิทธิ์เรียบร้อย');
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEligibilityRule(deleteTarget.benefit_key, deleteTarget.id);
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      // STA-102 — log rule deletion.
      addHistoryEntry({
        targetType: 'rule',
        targetId: deleteTarget.benefit_key,
        targetName: ruleTargetName(deleteTarget),
        action: 'delete',
        actorName,
      });
      toast('success', 'ลบกฎสิทธิ์เรียบร้อย');
      setDeleteTarget(null);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  const handleHistory = async (rule: EligibilityRule) => {
    if (historyTarget?.id === rule.id) { setHistoryTarget(null); return; }
    setHistoryTarget(rule);
    setHistoryLoading(true);
    try {
      const data = await getEligibilityRuleHistory(rule.benefit_key, rule.id);
      setHistoryData(data);
    } catch {
      toast('error', 'โหลดประวัติไม่สำเร็จ');
    } finally {
      setHistoryLoading(false);
    }
  };

  // STA-100 — export current rules to a client-side CSV download.
  const handleExportCsv = () => {
    downloadCsv('benefit-rules.csv', rulesToCsv(rules));
  };

  // STA-100 — mock import: parse the chosen CSV and append rows to in-session state.
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseRulesCsv(String(reader.result ?? ''), userId ?? username ?? 'admin');
        if (parsed.length === 0) { toast('warning', t('importEmpty')); return; }
        setRules((prev) => [...prev, ...parsed]);
        toast('success', t('importSuccess', { count: parsed.length }));
      } catch {
        toast('error', t('importError'));
      }
    };
    reader.onerror = () => toast('error', t('importError'));
    reader.readAsText(file);
  };

  return (
    <Card variant="raised" size="lg">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardEyebrow>CG-BE Entitlement Amount</CardEyebrow>
          <CardTitle>กฎวงเงินสิทธิ์</CardTitle>
          {rules.length > 0 && (
            <p className="mt-0.5 text-small text-ink-muted">{rules.length} กฎทั้งหมด</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* STA-100 — Import / Export CSV toolbar, mirroring the benefit plan catalog */}
          <Capability action="editFoundation" fallback={
            <Button variant="ghost" size="sm" leadingIcon={<Upload size={14} aria-hidden />} disabled>
              {t('importCsv')}
            </Button>
          }>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Upload size={14} aria-hidden />}
              onClick={() => importInputRef.current?.click()}
              disabled={loading}
            >
              {t('importCsv')}
            </Button>
          </Capability>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCsv}
          />
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<Download size={14} aria-hidden />}
            onClick={handleExportCsv}
            disabled={loading || rules.length === 0}
          >
            {t('exportCsv')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Plus size={14} aria-hidden />}
            onClick={() => setShowAddForm(true)}
            disabled={loading}
          >
            เพิ่มกฎ
          </Button>
        </div>
      </div>

      {/* Add modal — RuleForm in a Humi Modal (matches the benefit plan module) */}
      <Modal open={showAddForm} onClose={() => setShowAddForm(false)} title="เพิ่มกฎสิทธิ์ใหม่" widthClass="max-w-3xl">
        <RuleForm
          inModal
          createdBy={userId ?? username ?? 'admin'}
          onSave={async (input, benefitKey) => { await handleAdd(input as EligibilityRuleInput, benefitKey!); setShowAddForm(false); }}
          onCancel={() => setShowAddForm(false)}
        />
      </Modal>

      {loading ? (
        <p className="mt-4 text-small text-ink-muted">กำลังโหลด...</p>
      ) : (
        <RulesTableView
          rules={rules}
          createdBy={userId ?? username ?? 'admin'}
          historyTarget={historyTarget}
          historyData={historyData}
          historyLoading={historyLoading}
          editTarget={editTarget}
          onEdit={(rule) => setEditTarget(rule)}
          onDelete={(rule) => setDeleteTarget(rule)}
          onHistory={handleHistory}
          onSaveEdit={async (input) => { await handleUpdate(input); }}
          onCancelEdit={() => setEditTarget(null)}
        />
      )}

      {/* Delete modal */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="ยืนยันการลบกฎสิทธิ์">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-body text-ink">
              ต้องการลบกฎ{' '}
              <span className="font-semibold">
                {BENEFIT_PLAN_LABELS[deleteTarget.benefit_key as BenefitKey]?.th ?? deleteTarget.benefit_key}
                {' / '}{deleteTarget.policy_profile ?? '-'}
                {' / '}{egLabel(deleteTarget.employee_group ?? '')}
                {deleteTarget.pg_from != null ? ` PG ${deleteTarget.pg_from}–${deleteTarget.pg_to}` : ''}
              </span>{' '}(฿{(deleteTarget.entitlement_amount ?? 0).toLocaleString('th-TH')}) ใช่หรือไม่?
            </p>
            <p className="text-small text-ink-muted">การลบจะตั้งค่า effective_to เป็นวันนี้ (soft-delete)</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>ยกเลิก</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>ลบกฎ</Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

// ── RulesTableView (STA-99) ───────────────────────────────────────────────────
// Filterable table mirroring the BA Excel "2. Benefit Eligibility rule" columns.
// Sole view for the Manage Rules page; per-row history / edit / delete actions
// (ported from the former grouped-card RuleRow) live in the rightmost column.

interface RulesTableViewProps {
  rules: EligibilityRule[];
  createdBy: string;
  historyTarget: EligibilityRule | null;
  historyData: EligibilityRule[];
  historyLoading: boolean;
  editTarget: EligibilityRule | null;
  onEdit: (rule: EligibilityRule) => void;
  onDelete: (rule: EligibilityRule) => void;
  onHistory: (rule: EligibilityRule) => void;
  onSaveEdit: (input: Partial<EligibilityRuleInput>) => Promise<void>;
  onCancelEdit: () => void;
}

function RulesTableView({
  rules,
  createdBy,
  historyTarget,
  historyData,
  historyLoading,
  editTarget,
  onEdit,
  onDelete,
  onHistory,
  onSaveEdit,
  onCancelEdit,
}: RulesTableViewProps) {
  const t = useTranslations('admin_benefits_entitlement_rules');

  const [fBenefit,   setFBenefit]   = useState<string>('all');
  const [fRuleType,  setFRuleType]  = useState<string>('all');
  const [fEmpGroup,  setFEmpGroup]  = useState<string>('all');
  const [fPolicy,    setFPolicy]    = useState<string>('all');
  const [fPgFrom,    setFPgFrom]    = useState<string>('');
  const [fPgTo,      setFPgTo]      = useState<string>('');
  const [fEffective, setFEffective] = useState<string>('all');

  const benefitPlanId = (r: EligibilityRule) =>
    r.plan_id ?? BENEFIT_PLAN_LABELS[r.benefit_key as BenefitKey]?.code ?? r.benefit_key;

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (fBenefit !== 'all' && r.benefit_key !== fBenefit) return false;
      if (fRuleType !== 'all' && (r.rule_type ?? 'special') !== fRuleType) return false;
      if (fEmpGroup !== 'all' && (r.employee_group ?? '') !== fEmpGroup) return false;
      if (fPolicy !== 'all' && (r.policy_profile ?? '') !== fPolicy) return false;
      if (fEffective !== 'all' && (r.effective_type ?? r.plan_effective ?? '') !== fEffective) return false;
      if (fPgFrom && (r.pg_from == null || r.pg_from < Number(fPgFrom))) return false;
      if (fPgTo && (r.pg_to == null || r.pg_to > Number(fPgTo))) return false;
      return true;
    });
  }, [rules, fBenefit, fRuleType, fEmpGroup, fPolicy, fPgFrom, fPgTo, fEffective]);

  const mono = 'font-mono text-[length:var(--text-eyebrow)] text-ink-muted whitespace-nowrap';

  const columns: DataTableColumn<EligibilityRule>[] = [
    { id: 'rule_id', header: t('colRuleId'),
      cell: (r) => <span className={`${mono} text-ink font-semibold`}>{r.rule_id ?? r.id}</span>,
      sortAccessor: (r) => r.rule_id ?? r.id, className: 'whitespace-nowrap' },
    { id: 'rule_name', header: t('colRuleName'),
      cell: (r) => <span className="text-ink whitespace-nowrap">{r.rule_name ?? r.scope_value ?? '-'}</span>,
      sortAccessor: (r) => r.rule_name ?? r.scope_value ?? '' },
    { id: 'rule_type', header: t('colRuleType'),
      cell: (r) => {
        const isStd = (r.rule_type ?? 'special') === 'standard';
        return (
          <span className={`inline-flex items-center rounded-[var(--radius-sm)] border px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold ${isStd ? 'bg-accent-soft text-accent border-accent/30' : 'bg-canvas-soft text-ink-muted border-hairline'}`}>
            {isStd ? t('ruleTypeStandard') : t('ruleTypeSpecial')}
          </span>
        );
      },
      sortAccessor: (r) => r.rule_type ?? 'special', className: 'whitespace-nowrap' },
    { id: 'benefit_plan_id', header: t('colBenefitPlanId'),
      cell: (r) => <span className={mono}>{benefitPlanId(r)}</span>,
      sortAccessor: (r) => benefitPlanId(r) },
    // STA-99: business_group pending BA — is it distinct from business_unit? Column omitted for now.
    { id: 'business_unit', header: t('colBusinessUnit'),
      cell: (r) => <span className="text-small text-ink whitespace-nowrap">{r.business_unit ?? '-'}</span>,
      sortAccessor: (r) => r.business_unit ?? '' },
    { id: 'company_code', header: t('colCompanyCode'),
      cell: (r) => <span className="text-small text-ink whitespace-nowrap">{r.company_code ?? '-'}</span>,
      sortAccessor: (r) => r.company_code ?? '' },
    // STA-99: "Job Classification on Job" mapped to job_code — exact BA label pending confirmation.
    { id: 'job', header: t('colJob'),
      cell: (r) => <span className="text-small text-ink whitespace-nowrap">{r.job_code ?? '-'}</span>,
      sortAccessor: (r) => r.job_code ?? '' },
    { id: 'dvt_project', header: t('colDvtProject'),
      cell: (r) => <span className="text-small text-ink whitespace-nowrap">{r.dvt_project ?? '-'}</span>,
      sortAccessor: (r) => r.dvt_project ?? '' },
    { id: 'employee_group', header: t('colEmployeeGroup'),
      cell: (r) => (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${egColor(r.employee_group ?? '')}`}>
          {r.employee_group ?? '-'}
        </span>
      ),
      sortAccessor: (r) => r.employee_group ?? '', className: 'whitespace-nowrap' },
    { id: 'employee_subgroup', header: t('colEmployeeSubgroup'),
      cell: (r) => <span className="text-small text-ink whitespace-nowrap">{r.employee_subgroup ?? '-'}</span>,
      sortAccessor: (r) => r.employee_subgroup ?? '' },
    { id: 'pg_from', header: t('colPgFrom'), align: 'right' as const,
      cell: (r) => <span className="tabular-nums text-ink">{r.pg_from ?? '-'}</span>,
      sortAccessor: (r) => r.pg_from ?? -1 },
    { id: 'pg_to', header: t('colPgTo'), align: 'right' as const,
      cell: (r) => <span className="tabular-nums text-ink">{r.pg_to ?? '-'}</span>,
      sortAccessor: (r) => r.pg_to ?? -1 },
    { id: 'hiring_date_from', header: t('colHiringDateFrom'),
      cell: (r) => <span className={mono}>{r.hiring_date_from ?? '-'}</span>,
      sortAccessor: (r) => r.hiring_date_from ?? '' },
    { id: 'hiring_date_to', header: t('colHiringDateTo'),
      cell: (r) => <span className={mono}>{r.hiring_date_to ?? '-'}</span>,
      sortAccessor: (r) => r.hiring_date_to ?? '' },
    { id: 'effective_type', header: t('colEffectiveType'),
      cell: (r) => <span className="text-small text-ink whitespace-nowrap">{effectiveTypeLabel(r.effective_type ?? r.plan_effective)}</span>,
      sortAccessor: (r) => r.effective_type ?? r.plan_effective ?? '', className: 'whitespace-nowrap' },
    { id: 'entitlement_amount', header: t('colEntitlementAmount'), align: 'right' as const,
      cell: (r) => <span className="font-semibold text-ink tabular-nums whitespace-nowrap">฿{(r.entitlement_amount ?? 0).toLocaleString('th-TH')}</span>,
      sortAccessor: (r) => r.entitlement_amount ?? 0, className: 'whitespace-nowrap' },
    // STA-102 — per-row actions ported from the former card RuleRow: history / edit / delete.
    { id: 'actions', header: t('colActions'), align: 'right' as const, className: 'whitespace-nowrap',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button type="button" aria-pressed={historyTarget?.id === r.id} aria-label={t('historyToggle')} title={t('historyToggle')}
            onClick={() => onHistory(r)}
            className={`inline-flex items-center justify-center rounded-[var(--radius-sm)] border p-1.5 transition-colors ${historyTarget?.id === r.id ? 'border-accent/40 bg-accent-soft text-accent' : 'border-hairline text-ink-muted hover:bg-canvas-soft hover:text-ink'}`}>
            <Clock size={14} aria-hidden />
          </button>
          <button type="button" aria-label="แก้ไข" title="แก้ไข" onClick={() => onEdit(r)}
            className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-hairline p-1.5 text-ink-muted hover:bg-accent/10 hover:text-accent transition-colors">
            <Pencil size={14} aria-hidden />
          </button>
          <button type="button" aria-label="ลบ" title="ลบ" onClick={() => onDelete(r)}
            className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-hairline p-1.5 text-ink-muted hover:bg-danger/10 hover:text-danger transition-colors">
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      ) },
  ];

  const hasFilter = fBenefit !== 'all' || fRuleType !== 'all' || fEmpGroup !== 'all'
    || fPolicy !== 'all' || fEffective !== 'all' || fPgFrom !== '' || fPgTo !== '';

  return (
    <div className="mt-4 space-y-3">
      {/* Filters — mirror the plans-catalog pattern */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-small font-medium text-ink-muted">
          {t('filterBenefitPlan')}
          <select value={fBenefit} onChange={(e) => setFBenefit(e.target.value)} className={tableSelectClass}>
            <option value="all">{t('filterAll')}</option>
            {ALL_BENEFIT_KEYS.map((k) => <option key={k} value={k}>{BENEFIT_PLAN_LABELS[k].th} ({BENEFIT_PLAN_LABELS[k].code})</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-ink-muted">
          {t('filterRuleType')}
          <select value={fRuleType} onChange={(e) => setFRuleType(e.target.value)} className={tableSelectClass}>
            <option value="all">{t('filterAll')}</option>
            <option value="standard">{t('ruleTypeStandard')}</option>
            <option value="special">{t('ruleTypeSpecial')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-ink-muted">
          {t('filterEmployeeGroup')}
          <select value={fEmpGroup} onChange={(e) => setFEmpGroup(e.target.value)} className={tableSelectClass}>
            <option value="all">{t('filterAll')}</option>
            {EMPLOYEE_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-ink-muted">
          {t('filterPolicyProfile')}
          <select value={fPolicy} onChange={(e) => setFPolicy(e.target.value)} className={tableSelectClass}>
            <option value="all">{t('filterAll')}</option>
            {POLICY_PROFILES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-ink-muted">
          {t('filterEffectiveType')}
          <select value={fEffective} onChange={(e) => setFEffective(e.target.value)} className={tableSelectClass}>
            <option value="all">{t('filterAll')}</option>
            {PLAN_EFFECTIVE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-ink-muted">
          {t('filterPgFrom')}
          <input type="number" min={1} max={99} value={fPgFrom} onChange={(e) => setFPgFrom(e.target.value)} className={`${tableSelectClass} w-20`} />
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-ink-muted">
          {t('filterPgTo')}
          <input type="number" min={1} max={99} value={fPgTo} onChange={(e) => setFPgTo(e.target.value)} className={`${tableSelectClass} w-20`} />
        </label>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={() => {
            setFBenefit('all'); setFRuleType('all'); setFEmpGroup('all'); setFPolicy('all');
            setFPgFrom(''); setFPgTo(''); setFEffective('all');
          }}>
            {t('clearFilters')}
          </Button>
        )}
        <span className="ml-auto self-center text-small text-ink-muted tabular-nums">
          {t('showing', { shown: filtered.length, total: rules.length })}
        </span>
      </div>

      <DataTable
        caption={t('tableCaption')}
        captionVisuallyHidden
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        dense
        emptyState={<p className="text-small text-ink-muted">{t('empty')}</p>}
      />

      {/* Edit modal — RuleForm for the selected row (matches the benefit plan module) */}
      {editTarget && (
        <Modal open onClose={onCancelEdit} title="แก้ไขกฎสิทธิ์" widthClass="max-w-3xl">
          <RuleForm
            inModal
            key={editTarget.id}
            initialRule={editTarget}
            createdBy={createdBy}
            onSave={async (input) => { await onSaveEdit(input); }}
            onCancel={onCancelEdit}
          />
        </Modal>
      )}

      {/* STA-102 — labelled, visible change-history panel for the selected row, below the table */}
      {historyTarget && (
        <div className="rounded-md border border-hairline border-l-4 border-l-accent/30 bg-canvas-soft px-4 py-3">
          <p className="mb-2 text-small font-semibold text-ink">
            {historyTarget.rule_name ?? BENEFIT_PLAN_LABELS[historyTarget.benefit_key as BenefitKey]?.th ?? historyTarget.benefit_key}
          </p>
          <BenefitHistorySidebar
            targetType="rule"
            targetId={historyTarget.benefit_key}
            isTh
            className="bg-surface"
          />
          {/* Entitlement-amount audit (DB effective-dated history) */}
          {historyLoading ? (
            <p className="mt-3 text-small text-ink-muted">{t('historyLoading')}</p>
          ) : historyData.length > 0 && (
            <div className="mt-3 space-y-1 text-small">
              <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.08em] text-ink-faint">{t('historyAmountTitle')}</p>
              {historyData.map((h) => (
                <div key={h.id} className="flex items-center gap-4">
                  <span className="text-ink-muted tabular-nums">{new Date(h.effective_from).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span className="font-semibold text-ink tabular-nums">฿{(h.entitlement_amount ?? 0).toLocaleString('th-TH')}</span>
                  {h.effective_to && <span className="text-xs text-ink-faint">(ยกเลิก)</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── RuleForm (add + edit) ─────────────────────────────────────────────────────

interface RuleFormProps {
  initialRule?: EligibilityRule;
  createdBy: string;
  onSave: (input: Partial<EligibilityRuleInput>, benefitKey?: string) => Promise<void>;
  onCancel: () => void;
  /** When rendered inside a Modal, drop the inline card chrome + internal title. */
  inModal?: boolean;
}

function RuleForm({ initialRule, createdBy, onSave, onCancel, inModal }: RuleFormProps) {
  const { toast } = useToast();
  const isEdit = !!initialRule;

  const [benefitKey,     setBenefitKey]     = useState<BenefitKey>((initialRule?.benefit_key as BenefitKey) ?? 'medical-reimbursement');
  const [ruleId,         setRuleId]         = useState(initialRule?.id ?? '');
  const [ruleName,       setRuleName]       = useState(('rule_name' in (initialRule ?? {}) ? String((initialRule as EligibilityRule & { rule_name?: string }).rule_name ?? '') : ''));
  const [ruleType,       setRuleType]       = useState<'standard' | 'special'>((initialRule?.rule_type as 'standard' | 'special') ?? 'special');
  const [status,         setStatus]         = useState(initialRule?.allow === false ? 'inactive' : 'active');
  const [effectiveStart, setEffectiveStart] = useState(initialRule?.effective_from?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [effectiveEnd,   setEffectiveEnd]   = useState(initialRule?.effective_to?.slice(0, 10) ?? '');
  const [policyProfile,  setPolicyProfile]  = useState(initialRule?.policy_profile ?? 'CPN');
  const [businessUnit,   setBusinessUnit]   = useState(('business_unit' in (initialRule ?? {}) ? String((initialRule as EligibilityRule & { business_unit?: string }).business_unit ?? '') : ''));
  const [company,        setCompany]        = useState(initialRule?.company ?? '');
  const [companyCode,    setCompanyCode]    = useState(('company_code' in (initialRule ?? {}) ? String((initialRule as EligibilityRule & { company_code?: string }).company_code ?? '') : ''));
  const [jobCode,        setJobCode]        = useState(initialRule?.job_code ?? '');
  const [employeeGroup,  setEmployeeGroup]  = useState(initialRule?.employee_group ?? 'A');
  const [employeeSubgroup, setEmployeeSubgroup] = useState(('employee_subgroup' in (initialRule ?? {}) ? String((initialRule as EligibilityRule & { employee_subgroup?: string }).employee_subgroup ?? '') : 'Permanent'));
  const [dvtProject,     setDvtProject]     = useState(('dvt_project' in (initialRule ?? {}) ? String((initialRule as EligibilityRule & { dvt_project?: string }).dvt_project ?? '') : ''));
  const [pgFrom,         setPgFrom]         = useState(initialRule?.pg_from?.toString() ?? '');
  const [pgTo,           setPgTo]           = useState(initialRule?.pg_to?.toString() ?? '');
  const [planEffective,  setPlanEffective]  = useState<(typeof PLAN_EFFECTIVE_OPTIONS)[number]['value']>((initialRule?.plan_effective as (typeof PLAN_EFFECTIVE_OPTIONS)[number]['value']) ?? 'hire_date');
  const [waitingPeriod,  setWaitingPeriod]  = useState(('waiting_period' in (initialRule ?? {}) ? String((initialRule as EligibilityRule & { waiting_period?: number | string }).waiting_period ?? '') : ''));
  const [hiringDateFrom, setHiringDateFrom] = useState(initialRule?.hiring_date_from ?? '1900-01-01');
  const [hiringDateTo,   setHiringDateTo]   = useState(initialRule?.hiring_date_to ?? '9999-12-31');
  const [claimPeriod,    setClaimPeriod]    = useState(('claim_period' in (initialRule ?? {}) ? String((initialRule as EligibilityRule & { claim_period?: string }).claim_period ?? '') : 'Year'));
  const [entitlementAmt, setEntitlementAmt] = useState(initialRule?.entitlement_amount?.toString() ?? '');
  const [maxPerClaim,          setMaxPerClaim]          = useState(initialRule?.max_per_claim?.toString() ?? '');
  const [additionalCondition,  setAdditionalCondition]  = useState(initialRule?.additional_condition ?? '');
  const [saving,               setSaving]               = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entitlementAmt || Number(entitlementAmt) <= 0) { toast('warning', 'กรุณาระบุวงเงินเบิกต่อปี'); return; }
    if (employeeSubgroup === 'DVT' && !dvtProject.trim()) { toast('warning', 'กรุณาระบุ DVTProject เมื่อ Employee Subgroup เป็น DVT'); return; }
    if (pgFrom && pgTo && Number(pgFrom) > Number(pgTo)) { toast('warning', 'PG From ต้องน้อยกว่าหรือเท่ากับ PG To'); return; }
    setSaving(true);
    try {
      const pg_from = pgFrom ? parseInt(pgFrom, 10) : null;
      const pg_to   = pgTo   ? parseInt(pgTo,   10) : null;
      const payload: Partial<EligibilityRuleInput> = {
        scope_type: 'entitlement',
        scope_value: `${policyProfile}:${employeeGroup}:${pg_from ?? 'any'}-${pg_to ?? 'any'}`,
        allow: status === 'active',
        created_by: createdBy,
        rule_name:              ruleName || null,
        rule_type:              ruleType,
        status,
        effective_from:         effectiveStart || new Date().toISOString().slice(0, 10),
        effective_to:           effectiveEnd || null,
        policy_profile:         policyProfile,
        business_unit:          businessUnit || null,
        company:                company || null,
        company_code:           companyCode || null,
        job_code:               jobCode || null,
        employee_group:         employeeGroup,
        employee_subgroup:      employeeSubgroup || null,
        dvt_project:            employeeSubgroup === 'DVT' ? dvtProject || null : null,
        pg_from,
        pg_to,
        plan_effective:         planEffective,
        waiting_period:         waitingPeriod ? parseInt(waitingPeriod, 10) : null,
        hiring_date_from:       hiringDateFrom || '1900-01-01',
        hiring_date_to:         hiringDateTo   || '9999-12-31',
        claim_period:           claimPeriod || null,
        entitlement_amount:     parseInt(entitlementAmt, 10),
        max_per_claim:          maxPerClaim ? parseInt(maxPerClaim, 10) : null,
        additional_condition:   additionalCondition || null,
      };
      await onSave(payload, isEdit ? undefined : benefitKey);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'rounded-md border border-hairline bg-surface px-3 py-2 text-small text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50';
  const labelCls = 'text-small font-medium text-ink';

  return (
    <form onSubmit={handleSubmit} className={inModal ? 'space-y-4' : 'mt-4 rounded-md border border-accent/30 bg-accent/5 p-4 space-y-4'} aria-label={isEdit ? 'แก้ไขกฎวงเงินสิทธิ์' : 'เพิ่มกฎวงเงินสิทธิ์'}>
      {!inModal && <p className="text-small font-semibold text-ink">{isEdit ? 'แก้ไขกฎวงเงินสิทธิ์' : 'เพิ่มกฎวงเงินสิทธิ์ใหม่'}</p>}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Rule ID and Validity</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Rule ID</label>
            <input type="text" value={ruleId} onChange={(e) => setRuleId(e.target.value)} disabled={saving || isEdit} placeholder="ระบบสร้างให้อัตโนมัติ" className={`${inputCls} disabled:bg-canvas-soft`} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Rule Name</label>
            <input type="text" value={ruleName} onChange={(e) => setRuleName(e.target.value)} disabled={saving} placeholder="เช่น Medical entitlement A" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Rule Type</label>
            <select value={ruleType} onChange={(e) => setRuleType(e.target.value as 'standard' | 'special')} disabled={saving} className={inputCls}>
              <option value="standard">Standard</option>
              <option value="special">Special</option>
            </select>
          </div>
          {!isEdit && (
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Benefit Plan ID <span className="text-danger ml-0.5">*</span></label>
              <select value={benefitKey} onChange={(e) => setBenefitKey(e.target.value as BenefitKey)} disabled={saving} className={inputCls}>
                {ALL_BENEFIT_KEYS.map((k) => <option key={k} value={k}>{BENEFIT_PLAN_LABELS[k].th} ({BENEFIT_PLAN_LABELS[k].code})</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Status <span className="text-danger ml-0.5">*</span></label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={saving} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>effectiveStartDate</label>
            <input type="date" value={effectiveStart} onChange={(e) => setEffectiveStart(e.target.value)} disabled={saving} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>effectiveEndDate</label>
            <input type="date" value={effectiveEnd} onChange={(e) => setEffectiveEnd(e.target.value)} disabled={saving} className={inputCls} />
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-hairline-soft pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Employee Info.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Business Unit</label>
            <input type="text" value={businessUnit} onChange={(e) => setBusinessUnit(e.target.value)} disabled={saving} placeholder="เช่น BU-HR" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Company Code</label>
            <input type="text" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} disabled={saving} placeholder="เช่น CPN" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Policy Profile <span className="text-danger ml-0.5">*</span></label>
            <select value={policyProfile} onChange={(e) => setPolicyProfile(e.target.value)} disabled={saving} className={inputCls}>
              {POLICY_PROFILES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Company</label>
            <select value={company} onChange={(e) => setCompany(e.target.value)} disabled={saving} className={inputCls}>
              <option value="">ทุกบริษัท</option>
              {POLICY_PROFILES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Job Code</label>
            <input type="text" value={jobCode} onChange={(e) => setJobCode(e.target.value)} disabled={saving} placeholder="เช่น SE-01" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Employee Group <span className="text-danger ml-0.5">*</span></label>
            <select value={employeeGroup} onChange={(e) => setEmployeeGroup(e.target.value)} disabled={saving} className={inputCls}>
              {EMPLOYEE_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Employee Subgroup</label>
            <select value={employeeSubgroup} onChange={(e) => setEmployeeSubgroup(e.target.value)} disabled={saving} className={inputCls}>
              {EMPLOYEE_SUBGROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {employeeSubgroup === 'DVT' && (
            <div className="flex flex-col gap-1">
              <label className={labelCls}>DVTProject <span className="text-danger ml-0.5">*</span></label>
              <input type="text" value={dvtProject} onChange={(e) => setDvtProject(e.target.value)} disabled={saving} placeholder="ระบุ DVT project" className={inputCls} />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>PG From</label>
            <input type="number" min={1} max={99} value={pgFrom} onChange={(e) => setPgFrom(e.target.value)} disabled={saving} placeholder="เช่น 17" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>PG To</label>
            <input type="number" min={1} max={99} value={pgTo} onChange={(e) => setPgTo(e.target.value)} disabled={saving} placeholder="เช่น 20" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Hiring Date From</label>
            <input type="date" value={hiringDateFrom} onChange={(e) => setHiringDateFrom(e.target.value)} disabled={saving} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Hiring Date To</label>
            <input type="date" value={hiringDateTo} onChange={(e) => setHiringDateTo(e.target.value)} disabled={saving} className={inputCls} />
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-hairline-soft pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Effective of plan</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Effective Types</label>
            <select value={planEffective} onChange={(e) => setPlanEffective(e.target.value as (typeof PLAN_EFFECTIVE_OPTIONS)[number]['value'])} disabled={saving} className={inputCls}>
              {PLAN_EFFECTIVE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Waiting Period</label>
            <input type="number" min={0} value={waitingPeriod} onChange={(e) => setWaitingPeriod(e.target.value)} disabled={saving} placeholder="เช่น 30" className={inputCls} />
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-hairline-soft pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Reimbursement Limitation</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Claim Period</label>
            <select value={claimPeriod} onChange={(e) => setClaimPeriod(e.target.value)} disabled={saving} className={inputCls}>
              {CLAIM_PERIOD_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Entitlement Amount <span className="text-danger ml-0.5">*</span></label>
            <input type="number" min={0} value={entitlementAmt} onChange={(e) => setEntitlementAmt(e.target.value)} disabled={saving} placeholder="เช่น 70000" className={`${inputCls} font-semibold`} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Maximum Amount per Claim</label>
            <input type="number" min={0} value={maxPerClaim} onChange={(e) => setMaxPerClaim(e.target.value)} disabled={saving} placeholder="ไม่จำกัด" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>Additional Condition (Defined in Rule)</label>
            <textarea rows={2} value={additionalCondition} onChange={(e) => setAdditionalCondition(e.target.value)} disabled={saving} placeholder="เงื่อนไขเพิ่มเติม (ถ้ามี)" className={`${inputCls} resize-none`} />
          </div>
        </div>
      </section>
      <div className="flex justify-end gap-3 pt-2 border-t border-hairline-soft">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>ยกเลิก</Button>
        <Button type="submit" variant="primary" size="sm" loading={saving}>{isEdit ? 'บันทึกการแก้ไข' : 'บันทึกกฎ'}</Button>
      </div>
    </form>
  );
}
