'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Pencil, Layers, Trash2 } from 'lucide-react';

// Benefits with DB-driven eligibility editor — matches rules/[benefitKey] pages
const ELIGIBILITY_MANAGED_BENEFIT_KEYS = new Set([
  'fuel-allowance',
  'medical-reimbursement',
  'training',
  'travel-allowance',
]);
import { Card, CardEyebrow, CardTitle, Button, DataTable, Modal } from '@/components/humi';
import { Capability } from '@/components/humi';
import {
  BENEFIT_PLAN_REGISTRY,
  type BenefitPlan,
  type BenefitTypeGroup,
  type PlanCategory,
  type RecordType,
  isV2Plan,
} from '@/data/benefits/plan-registry';
import { Tab1IdentityFields, INSERT_EDITABLE_KEYS, type Tab1IdentityValues } from '@/components/benefits/Tab1IdentityFields';
import { BenefitHistorySidebar } from '@/components/benefits/BenefitHistorySidebar';
import { ActionTagChip, type ActionTagMode } from '@/components/benefits/ActionTagChip';
import { InsertChangePopup } from '@/components/benefits/InsertChangePopup';
import { useAuthStore } from '@/stores/auth-store';
import { useBenefitHistoryStore } from '@/stores/benefit-history-store';
import { applyIdentityToPlan, buildPlanFromCreate } from './plan-builders';

/** STA-240 — Eligible Claim date is mandatory + integer-only (days). Rejects
 *  empty, decimals, negatives, and non-numeric; accepts e.g. '30' / '90'. */
const isValidClaimDays = (v: string) => /^\d+$/.test(v.trim());

/** STA-98 FU-2 — next non-colliding versioned id for a superseding plan (PLAN-X → PLAN-X-v2). */
function nextVersionId(baseId: string, existing: Set<string>): string {
  const root = baseId.replace(/-v\d+$/, '');
  let n = 2;
  while (existing.has(`${root}-v${n}`)) n += 1;
  return `${root}-v${n}`;
}

// ── Plan catalog — CRUD-style mockup ─────────────────────────────────────────
// Reads all 28 plans from BENEFIT_PLAN_REGISTRY.
// Columns: id, ttt, name, category, recordType chip, template.
// Filters: category + recordType.
// "Edit Plan" opens Modal with mock form — no save.
// STA-69: annualLimitThb and approvalChain remain on the schema (still used by
//   downstream limits enforcement + approval routing) but are no longer shown
//   in this list table. They remain visible on the plan detail/edit configurator.

const CATEGORY_LABELS_TH: Record<PlanCategory, string> = {
  medical:     'การรักษาพยาบาล',
  dental:      'ทันตกรรม',
  physical:    'กายภาพ',
  gasoline:    'น้ำมันรถ',
  toll:        'ทางด่วน',
  parking:     'ที่จอดรถ',
  life:        'ชีวิต',
  gift:        'ของขวัญ',
  funeral:     'ฌาปนกิจ',
  wreath:      'พวงหรีด',
  beneficiary: 'ผู้รับผลประโยชน์',
  lifecycle:   'วงจรสวัสดิการ',
  mobile:      'ค่าโทรศัพท์',
};

const CATEGORY_LABELS_EN: Record<PlanCategory, string> = {
  medical:     'Medical',
  dental:      'Dental',
  physical:    'Physical',
  gasoline:    'Gasoline',
  toll:        'Toll',
  parking:     'Parking',
  life:        'Life',
  gift:        'Gift',
  funeral:     'Funeral',
  wreath:      'Wreath',
  beneficiary: 'Beneficiary',
  lifecycle:   'Lifecycle',
  mobile:      'Mobile',
};

const RECORD_TYPE_CHIP: Record<RecordType, { label: string; labelTh: string; className: string }> = {
  records:  { label: 'Records',  labelTh: 'บันทึก',  className: 'bg-canvas-soft text-ink-muted border border-hairline' },
  info:     { label: 'Info',     labelTh: 'ข้อมูล',  className: 'bg-accent-soft text-accent border border-accent/30' },
  claimable:{ label: 'Claimable',labelTh: 'เบิกได้', className: 'bg-success-soft text-success border border-success/30' },
};

const TEMPLATE_LABELS: Record<string, string> = {
  'simple-claim':      'simple-claim',
  'hospital-claim':    'hospital-claim',
  'records-flat':      'records-flat',
  'records-dependent': 'records-dependent',
  'records-computed':  'records-computed',
  'lifecycle-admin':   'lifecycle-admin',
};

const ALL_CATEGORIES = ['all', ...Object.keys(CATEGORY_LABELS_EN)] as const;
const ALL_RECORD_TYPES = ['all', 'records', 'info', 'claimable'] as const;
const ALL_STATUSES = ['all', 'active', 'inactive'] as const;

type FilterCategory = typeof ALL_CATEGORIES[number];
type FilterRecordType = typeof ALL_RECORD_TYPES[number];
type FilterStatus = typeof ALL_STATUSES[number];

// STA-87 — Start date / Effective date both read the plan's single real date
// field, `eligibility.effectiveStartDate` (v2 plans only; v1 has none → null,
// so it is excluded when a date filter is active). The catalogue exposes a
// distinct "Start date" and "Effective date" filter per the ticket, but in the
// mockup both bind this same field — confirm a separate effective-date field
// with BA before backend wiring.
function planEffectiveDate(p: BenefitPlan): string | null {
  return 'eligibility' in p ? p.eligibility.effectiveStartDate : null;
}

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;

const selectClass =
  'h-10 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 text-body text-ink transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas';

// ── Default Tab1 identity values for Edit ─────────────────────────────────
function editPlanDefaultIdentity(plan: BenefitPlan, isTh: boolean): Tab1IdentityValues {
  // STA-70: derive default benefitTypeGroup from recordType when plan has no explicit value
  const derivedBenefitTypeGroup: BenefitTypeGroup =
    plan.benefitTypeGroup
      ?? (plan.recordType === 'records' ? 'record'
        : plan.recordType === 'info'    ? 'info'
        : 'reimbursement-employee-hr');
  return {
    ttt: plan.ttt,
    planKey: plan.id,
    nameTh: plan.nameTh,
    nameEn: plan.nameEn,
    category: plan.category,
    schemaVersion: (plan as { schemaVersion?: 'v1' | 'v2' }).schemaVersion ?? 'v2',
    template: plan.template,
    effectiveFrom: '',
    effectiveTo: '',
    // STA-70 defaults — plan-registry fields are optional; fall back to sensible UI defaults
    country: plan.country ?? 'TH',
    status: plan.status ?? 'active',
    benefitTypeGroup: derivedBenefitTypeGroup,
    // STA-70 follow-up defaults
    enrolment: plan.enrolment ?? 'auto',
    claimPeriod: plan.claimPeriod ?? 'year',
    entitlementCalcMethod: plan.entitlementCalcMethod ?? 'full',
    eligibleClaimDate: plan.eligibleClaimDate ?? '30',
    // STA-179 — default to '' (empty/No) for existing plans without the field
    specialClaimCondition: plan.specialClaimCondition ?? '',
    specialClaimConditionType: plan.specialClaimConditionType ?? '',
    company: plan.company ?? '',
  };
}

// STA-113 — Make Correction + Insert share ONE mode-aware popup. The action that
// opened it (correction = update in place, insert = supersede) is shown as an
// ActionTagChip at the top of the body, and Save branches on the mode. The footer
// is exactly Save | Cancel (the old footer Insert button is removed — Insert is now
// a row action). The history sidebar is shown for both edit-style modes.
function PlanFormModal({
  plan,
  mode,
  seedEffectiveStart,
  onClose,
  onSubmit,
  onInsert,
  isTh,
  locale,
  t,
}: {
  plan: BenefitPlan;
  mode: Extract<ActionTagMode, 'correction' | 'insert'>;
  /** STA-123 — chosen effective date carried from the Insert date-gate pop-up. */
  seedEffectiveStart?: string;
  onClose: () => void;
  onSubmit: (updated: BenefitPlan) => void;
  onInsert: (original: BenefitPlan, edited: BenefitPlan, seedDate?: string) => void;
  isTh: boolean;
  locale: string;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const [tab1Values, setTab1Values] = useState<Tab1IdentityValues>(() => ({
    ...editPlanDefaultIdentity(plan, isTh),
    // STA-123 — seed the Identity effective-from cosmetically; the authoritative
    // stamp happens in handleSupersedePlan.
    ...(mode === 'insert' && seedEffectiveStart ? { effectiveFrom: seedEffectiveStart } : {}),
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTab1Change = <K extends keyof Tab1IdentityValues>(
    field: K,
    value: Tab1IdentityValues[K],
  ) => {
    setTab1Values((prev) => ({ ...prev, [field]: value }));
  };

  const tab1Panel = (
    <Tab1IdentityFields
      values={tab1Values}
      onChange={handleTab1Change}
      mode="edit"
      isTh={isTh}
      showSchemaVersion={false}
      // STA-146: Insert mode locks every identity field except Status + Company.
      // Correction mode passes undefined → nothing locked (unchanged).
      lockExceptKeys={mode === 'insert' ? INSERT_EDITABLE_KEYS : undefined}
    />
  );

  // STA-113 — Save branches on the popup mode: correction = update in place,
  // insert = supersede (the old footer Insert behaviour, now driven by the row).
  const handleSave = () => {
    // STA-240 — Eligible Claim date is mandatory + integer-only; block + show a
    // visible pumpkin error when invalid.
    if (!isValidClaimDays(tab1Values.eligibleClaimDate)) {
      setError(isTh ? 'ระบุจำนวนวัน (ตัวเลขจำนวนเต็ม)' : 'Enter number of days (whole number)');
      return;
    }
    setError(null);
    setSaving(true);
    // In-session mutation only — no backend POST/PUT in this mockup phase.
    if (mode === 'insert') {
      onInsert(plan, applyIdentityToPlan(plan, tab1Values), seedEffectiveStart);
    } else {
      onSubmit(applyIdentityToPlan(plan, tab1Values));
    }
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  const chipLabel = mode === 'insert' ? t('tagInsert') : t('tagCorrection');

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'insert'
        ? t('insertPlan', { id: plan.id })
        : t('correctionPlan', { id: plan.id })}
      widthClass="max-w-5xl"
    >
      <div className="space-y-4">
        <ActionTagChip mode={mode} label={chipLabel} />

        {/* History panel beside the plan's current info (STA-102) */}
        {/* STA-111 — tab strip removed; Identity form renders directly as the modal body. */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          {tab1Panel}
          <BenefitHistorySidebar
            targetType="plan"
            targetId={plan.id}
            isTh={isTh}
            className="lg:self-start"
          />
        </div>

        {/* Eligibility rule link (v2 plans only) */}
        {isV2Plan(plan) && plan.eligibility.eligibilityRuleId && (
          <div className="pt-2 border-t border-hairline">
            <p className="mb-2 text-small font-medium text-ink">
              {isTh ? 'กฎเงื่อนไขสิทธิ์' : 'Eligibility rule'}
            </p>
            <Link
              href={`/${locale}/admin/benefits/rules?rule=${encodeURIComponent(plan.eligibility.eligibilityRuleId)}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent-soft px-2 py-1 text-[length:var(--text-eyebrow)] font-mono font-semibold text-accent hover:bg-accent/10 transition-colors duration-[var(--dur-fast)]"
            >
              {plan.eligibility.eligibilityRuleId}
            </Link>
            {ELIGIBILITY_MANAGED_BENEFIT_KEYS.has(plan.id) && (
              <Link
                href={`/${locale}/admin/benefits/rules/${plan.id}`}
                className="ml-2 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-hairline bg-canvas px-2 py-1 text-[length:var(--text-eyebrow)] font-semibold text-ink hover:border-accent hover:text-accent transition-colors duration-[var(--dur-fast)]"
              >
                {isTh ? 'ตั้งค่าฐานข้อมูล →' : 'DB editor →'}
              </Link>
            )}
          </div>
        )}

        {saved && (
          <div role="status" className="rounded-[var(--radius-md)] bg-success-soft p-3 text-small font-medium text-ink">
            {isTh ? 'บันทึกแล้ว' : 'Saved'}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-small font-medium text-danger-ink">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Capability action="edit" fallback={
            <Button variant="primary" disabled>{mode === 'insert' ? t('confirmInsert') : t('save')}</Button>
          }>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving
                ? (isTh ? 'กำลังบันทึก…' : 'Saving…')
                : (mode === 'insert' ? t('confirmInsert') : t('save'))}
            </Button>
          </Capability>
        </div>
      </div>
    </Modal>
  );
}

function CreatePlanModal({
  onClose,
  onSubmit,
  existingIds,
  isTh,
  t,
}: {
  onClose: () => void;
  onSubmit: (created: BenefitPlan) => void;
  existingIds: Set<string>;
  isTh: boolean;
  t: (key: string) => string;
}) {
  const defaultTab1: Tab1IdentityValues = {
    ttt: '',
    planKey: '',
    nameTh: '',
    nameEn: '',
    category: 'medical',
    schemaVersion: 'v2',
    template: 'simple-claim',
    effectiveFrom: '',
    effectiveTo: '',
    // STA-70 defaults for new-plan creation
    country: 'TH',
    status: 'active',
    benefitTypeGroup: 'reimbursement-employee-hr',
    // STA-70 follow-up defaults for new-plan creation
    enrolment: 'auto',
    claimPeriod: 'year',
    entitlementCalcMethod: 'full',
    eligibleClaimDate: '30',
    // STA-179 — new plans default Special claim condition to empty (No)
    specialClaimCondition: '',
    specialClaimConditionType: '',
    company: '',
  };

  const [tab1Values, setTab1Values] = useState<Tab1IdentityValues>(defaultTab1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTab1Change = <K extends keyof Tab1IdentityValues>(
    field: K,
    value: Tab1IdentityValues[K],
  ) => {
    setTab1Values((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = tab1Values.planKey.trim() && tab1Values.nameTh.trim() && tab1Values.nameEn.trim();

  const handleSave = () => {
    if (!isValid) return;
    setError(null);
    // STA-240 — Eligible Claim date is mandatory + integer-only; surface a visible
    // pumpkin error (setError, NOT a silent early-return) when invalid.
    if (!isValidClaimDays(tab1Values.eligibleClaimDate)) {
      setError(isTh ? 'ระบุจำนวนวัน (ตัวเลขจำนวนเต็ม)' : 'Enter number of days (whole number)');
      return;
    }
    const key = tab1Values.planKey.trim();
    if (existingIds.has(key)) {
      setError(isTh ? `รหัสแผน "${key}" มีอยู่แล้ว` : `Plan ID "${key}" already exists`);
      return;
    }
    setSaving(true);
    // In-session mutation only — no backend POST in this mockup phase.
    onSubmit(buildPlanFromCreate(tab1Values));
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  const tab1Panel = (
    <Tab1IdentityFields
      values={tab1Values}
      onChange={handleTab1Change}
      mode="create"
      isTh={isTh}
      showSchemaVersion={false}
    />
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={isTh ? 'สร้างแผนสวัสดิการใหม่' : 'Create Benefit Plan'}
      widthClass="max-w-3xl"
    >
      <div className="space-y-4">
        <ActionTagChip mode="create" label={t('tagCreate')} />

        {/* STA-112 — tab strip removed; Identity form renders directly as the modal body. */}
        {tab1Panel}

        {saved && (
          <div role="status" className="rounded-[var(--radius-md)] bg-success-soft p-3 text-small font-medium text-ink">
            {isTh ? 'สร้างแผนสำเร็จ' : 'Plan created'}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-small font-medium text-danger-ink">
            {error}
          </div>
        )}

        {/* Draft retired from the benefit-plan surface (Draft status no longer
            used). Footer is Cancel | Create. */}
        <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Capability action="edit" fallback={
            <Button variant="primary" disabled>{t('createPlan')}</Button>
          }>
            <Button variant="primary" onClick={handleSave} disabled={saving || !isValid}>
              {saving ? (isTh ? 'กำลังสร้าง…' : 'Creating…') : t('createPlan')}
            </Button>
          </Capability>
        </div>
      </div>
    </Modal>
  );
}

export default function BenefitPlansPage() {
  const t = useTranslations('admin_benefits_plans');
  const locale = useLocale();
  const isTh = locale !== 'en';

  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterRecordType, setFilterRecordType] = useState<FilterRecordType>('all');
  // STA-87 — active-status + start/effective date (month + year) filters.
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [startMonth, setStartMonth] = useState<string>('all');
  const [startYear, setStartYear] = useState<string>('all');
  const [effectiveMonth, setEffectiveMonth] = useState<string>('all');
  const [effectiveYear, setEffectiveYear] = useState<string>('all');
  // STA-113 — one mode-aware popup for Make Correction / Insert (null = closed).
  const [editingPlan, setEditingPlan] = useState<BenefitPlan | null>(null);
  const [editMode, setEditMode] = useState<Extract<ActionTagMode, 'correction' | 'insert'>>('correction');
  const [deleteTarget, setDeleteTarget] = useState<BenefitPlan | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  // STA-123 — Insert is a two-step gated flow: the row action opens a date-gate
  // pop-up; Proceed then opens the edit modal in insert mode carrying that date.
  const [insertTarget, setInsertTarget] = useState<BenefitPlan | null>(null);
  const [insertSeedDate, setInsertSeedDate] = useState<string | null>(null);

  const openCorrection = (p: BenefitPlan) => { setEditMode('correction'); setEditingPlan(p); };
  const openInsert = (p: BenefitPlan) => { setInsertTarget(p); };
  const handleInsertProceed = (date: string) => {
    if (!insertTarget) return;
    setEditMode('insert');
    setInsertSeedDate(date);
    setEditingPlan(insertTarget);
    setInsertTarget(null);
  };
  const closePlanModal = () => { setEditingPlan(null); setInsertSeedDate(null); };

  // In-session plan list — seeded from the static registry. Create/Edit mutate
  // this list so changes appear without a backend (out of scope this phase).
  const [plans, setPlans] = useState<BenefitPlan[]>(() => [...BENEFIT_PLAN_REGISTRY]);

  const actorName = useAuthStore((s) => s.username) ?? 'HR Admin';
  const addHistoryEntry = useBenefitHistoryStore((s) => s.addEntry);

  const handleCreatePlan = (created: BenefitPlan) => {
    setPlans((prev) => [created, ...prev]);
    // STA-102 — log plan creation (draft + active both log as `create`).
    addHistoryEntry({
      targetType: 'plan',
      targetId: created.id,
      targetName: created.nameTh || created.nameEn || created.id,
      action: 'create',
      actorName,
    });
  };

  const handleUpdatePlan = (updated: BenefitPlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const existingIds = useMemo(() => new Set(plans.map((p) => p.id)), [plans]);

  // STA-98 FU-2 — Insert = supersede: inactivate the edited plan and prepend a
  // NEW active plan (versioned id) built from the just-typed values. Show both.
  const handleSupersedePlan = (original: BenefitPlan, edited: BenefitPlan, seedDate?: string) => {
    const newId = nextVersionId(original.id, existingIds);
    const replacement: BenefitPlan = {
      ...edited,
      id: newId,
      status: 'active',
      // STA-123 — stamp the chosen revision start date onto the new revision.
      // Guarded for v1 plans which carry no `eligibility` sub-object.
      ...(seedDate && 'eligibility' in edited && edited.eligibility
        ? { eligibility: { ...edited.eligibility, effectiveStartDate: seedDate } }
        : {}),
    };
    setPlans((prev) => [
      replacement,
      ...prev.map((p) => (p.id === original.id ? { ...p, status: 'inactive' as const } : p)),
    ]);
    setFilterStatus('all');

    // STA-107 — log the supersede with the plan's effective date + a field diff
    // scoped to the identity fields BA cares about (Legal Entity / Company).
    const changes: { field: string; from: string; to: string }[] = [];
    const dash = '-';
    if ((original.company ?? '') !== (edited.company ?? '')) {
      changes.push({ field: 'Legal Entity', from: original.company || dash, to: edited.company || dash });
    }
    if (original.nameEn !== edited.nameEn) {
      changes.push({ field: 'Name', from: original.nameEn || dash, to: edited.nameEn || dash });
    }
    if (original.category !== edited.category) {
      changes.push({ field: 'Category', from: original.category, to: edited.category });
    }
    addHistoryEntry({
      targetType: 'plan',
      targetId: original.id,
      targetName: edited.nameTh || edited.nameEn || newId,
      action: 'insert',
      actorName,
      effectiveDate: planEffectiveDate(edited) ?? undefined,
      ...(changes.length > 0 ? { changes } : {}),
    });
  };

  // STA-113 — Delete = soft-inactivate the plan (mirrors the rules soft-delete);
  // no hard removal in this mockup. Logs the deletion to the history store.
  const handleDeletePlan = (target: BenefitPlan) => {
    setPlans((prev) => prev.map((p) => (p.id === target.id ? { ...p, status: 'inactive' as const } : p)));
    addHistoryEntry({
      targetType: 'plan',
      targetId: target.id,
      targetName: target.nameTh || target.nameEn || target.id,
      action: 'delete',
      actorName,
    });
    setDeleteTarget(null);
  };

  // Years present in the registry's effective dates — drives the year dropdowns.
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const p of plans) {
      const d = planEffectiveDate(p);
      if (d) years.add(d.slice(0, 4));
    }
    return Array.from(years).sort();
  }, [plans]);

  const matchDate = (iso: string | null, month: string, year: string) => {
    if (month === 'all' && year === 'all') return true;
    if (!iso) return false; // no date → excluded once a date filter is active
    const [y, m] = iso.split('-');
    if (year !== 'all' && y !== year) return false;
    if (month !== 'all' && m !== month) return false;
    return true;
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      if (filterRecordType !== 'all' && p.recordType !== filterRecordType) return false;
      if (filterStatus !== 'all' && (p.status ?? 'active') !== filterStatus) return false;
      const eff = planEffectiveDate(p);
      if (!matchDate(eff, startMonth, startYear)) return false;
      if (!matchDate(eff, effectiveMonth, effectiveYear)) return false;
      return true;
    });
  }, [plans, filterCategory, filterRecordType, filterStatus, startMonth, startYear, effectiveMonth, effectiveYear]);

  const columns = useMemo(() => [
    {
      id: 'id',
      header: t('colId'),
      cell: (p: BenefitPlan) => (
        <span className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.08em] text-ink">
          {p.id}
        </span>
      ),
      sortAccessor: (p: BenefitPlan) => p.id,
      className: 'w-36',
    },
    {
      id: 'name',
      header: t('colName'),
      cell: (p: BenefitPlan) => (
        <span className="inline-flex items-center gap-2 text-ink">
          {isTh ? p.nameTh : p.nameEn}
          {p.status === 'inactive' && (
            <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.06em] text-ink-muted">
              {t('filterStatusInactive')}
            </span>
          )}
        </span>
      ),
      sortAccessor: (p: BenefitPlan) => (isTh ? p.nameTh : p.nameEn),
    },
    {
      id: 'category',
      header: t('colCategory'),
      cell: (p: BenefitPlan) => (
        <span className="text-small text-ink-muted">
          {isTh ? CATEGORY_LABELS_TH[p.category] : CATEGORY_LABELS_EN[p.category]}
        </span>
      ),
      sortAccessor: (p: BenefitPlan) => p.category,
      className: 'w-32',
    },
    {
      id: 'recordType',
      header: t('colRecordType'),
      cell: (p: BenefitPlan) => {
        const chip = RECORD_TYPE_CHIP[p.recordType];
        return (
          <span className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.1em] ${chip.className}`}>
            {isTh ? chip.labelTh : chip.label}
          </span>
        );
      },
      sortAccessor: (p: BenefitPlan) => p.recordType,
      className: 'w-28',
    },
    {
      id: 'template',
      header: t('colTemplate'),
      cell: (p: BenefitPlan) => (
        <span className="font-mono text-[length:var(--text-eyebrow)] text-ink-muted">
          {TEMPLATE_LABELS[p.template] ?? p.template}
        </span>
      ),
      sortAccessor: (p: BenefitPlan) => p.template,
      className: 'w-40',
    },
    {
      id: 'actions',
      header: t('colActions'),
      headerVisuallyHidden: true,
      // STA-113 — exactly three row actions: Make Correction · Insert · Delete.
      cell: (p: BenefitPlan) => (
        <Capability action="edit" fallback={
          <div className="flex items-center justify-end gap-1 opacity-50">
            <span role="img" aria-label={t('makeCorrection')} title={t('makeCorrection')} className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-hairline p-1.5 text-ink-muted"><Pencil size={14} aria-hidden /></span>
            <span role="img" aria-label={t('insert')} title={t('insert')} className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-hairline p-1.5 text-ink-muted"><Layers size={14} aria-hidden /></span>
            <span role="img" aria-label={t('delete')} title={t('delete')} className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-hairline p-1.5 text-ink-muted"><Trash2 size={14} aria-hidden /></span>
          </div>
        }>
          <div className="flex items-center justify-end gap-1">
            <button type="button" aria-label={t('makeCorrection')} title={t('makeCorrection')} onClick={() => openCorrection(p)}
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-hairline p-1.5 text-ink-muted hover:bg-accent/10 hover:text-accent transition-colors">
              <Pencil size={14} aria-hidden />
            </button>
            <button type="button" aria-label={t('insert')} title={t('insert')} onClick={() => openInsert(p)}
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-hairline p-1.5 text-ink-muted hover:bg-accent/10 hover:text-accent transition-colors">
              <Layers size={14} aria-hidden />
            </button>
            <button type="button" aria-label={t('delete')} title={t('delete')} onClick={() => setDeleteTarget(p)}
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-hairline p-1.5 text-ink-muted hover:bg-danger/10 hover:text-danger transition-colors">
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        </Capability>
      ),
      className: 'w-32',
      align: 'right' as const,
    },
  ], [isTh, t]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardEyebrow>{t('eyebrow')}</CardEyebrow>
          <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
          <p className="mt-2 text-small text-ink-muted">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Capability action="editFoundation" fallback={
            <Button variant="secondary" disabled>{t('importDisabled')}</Button>
          }>
            <Button variant="secondary" disabled>{t('import')}</Button>
          </Capability>
          <Button variant="secondary" disabled>{t('export')}</Button>
          <Capability action="edit" fallback={
            <Button variant="primary" disabled>{t('createPlan')}</Button>
          }>
            <Button variant="primary" onClick={() => setCreatingPlan(true)}>
              {t('createPlan')}
            </Button>
          </Capability>
        </div>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t('statTotal'),     value: plans.length },
          { label: t('statClaimable'), value: plans.filter((p) => p.recordType === 'claimable').length },
          { label: t('statRecords'),   value: plans.filter((p) => p.recordType === 'records').length },
          { label: t('statLifecycle'), value: plans.filter((p) => p.category === 'lifecycle').length },
        ].map((stat) => (
          <Card key={stat.label} variant="raised" size="md">
            <CardEyebrow>{stat.label}</CardEyebrow>
            <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-category" className="text-small font-medium text-ink-muted whitespace-nowrap">
            {t('filterCategory')}
          </label>
          <select
            id="filter-category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
            className={selectClass}
          >
            <option value="all">{t('filterAll')}</option>
            {Object.entries(isTh ? CATEGORY_LABELS_TH : CATEGORY_LABELS_EN).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-type" className="text-small font-medium text-ink-muted whitespace-nowrap">
            {t('filterType')}
          </label>
          <select
            id="filter-type"
            value={filterRecordType}
            onChange={(e) => setFilterRecordType(e.target.value as FilterRecordType)}
            className={selectClass}
          >
            <option value="all">{t('filterAll')}</option>
            <option value="claimable">{isTh ? 'เบิกได้' : 'Claimable'}</option>
            <option value="records">{isTh ? 'บันทึก' : 'Records'}</option>
            <option value="info">{isTh ? 'ข้อมูล' : 'Info'}</option>
          </select>
        </div>

        {/* STA-87 — Active status */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-status" className="text-small font-medium text-ink-muted whitespace-nowrap">
            {t('filterStatus')}
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className={selectClass}
          >
            <option value="all">{t('filterAll')}</option>
            <option value="active">{t('filterStatusActive')}</option>
            <option value="inactive">{t('filterStatusInactive')}</option>
          </select>
        </div>

        {/* STA-87 — Start date (month + year) */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-start-month" className="text-small font-medium text-ink-muted whitespace-nowrap">
            {t('filterStartDate')}
          </label>
          <select
            id="filter-start-month"
            aria-label={t('filterStartDate')}
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className={selectClass}
          >
            <option value="all">{t('filterMonthAll')}</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            id="filter-start-year"
            aria-label={t('filterStartDate')}
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
            className={selectClass}
          >
            <option value="all">{t('filterYearAll')}</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* STA-87 — Effective date (month + year) */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-effective-month" className="text-small font-medium text-ink-muted whitespace-nowrap">
            {t('filterEffectiveDate')}
          </label>
          <select
            id="filter-effective-month"
            aria-label={t('filterEffectiveDate')}
            value={effectiveMonth}
            onChange={(e) => setEffectiveMonth(e.target.value)}
            className={selectClass}
          >
            <option value="all">{t('filterMonthAll')}</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            id="filter-effective-year"
            aria-label={t('filterEffectiveDate')}
            value={effectiveYear}
            onChange={(e) => setEffectiveYear(e.target.value)}
            className={selectClass}
          >
            <option value="all">{t('filterYearAll')}</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {(filterCategory !== 'all' || filterRecordType !== 'all' || filterStatus !== 'all'
          || startMonth !== 'all' || startYear !== 'all' || effectiveMonth !== 'all' || effectiveYear !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterCategory('all'); setFilterRecordType('all'); setFilterStatus('all');
              setStartMonth('all'); setStartYear('all'); setEffectiveMonth('all'); setEffectiveYear('all');
            }}
          >
            {t('clearFilters')}
          </Button>
        )}

        <span className="ml-auto self-center text-small text-ink-muted">
          {isTh ? `แสดง ${filteredPlans.length} / ${plans.length} แผน` : `Showing ${filteredPlans.length} of ${plans.length} plans`}
        </span>
      </div>

      {/* Table */}
      <DataTable
        caption={isTh ? 'ตารางแผนสวัสดิการทั้งหมด' : 'Benefit plan catalog'}
        captionVisuallyHidden
        columns={columns}
        rows={filteredPlans}
        rowKey={(p) => p.id}
        dense
        emptyState={
          <p className="text-small text-ink-muted">{t('empty')}</p>
        }
      />

      {/* Disclaimer */}
      <Card variant="raised" size="md">
        <CardEyebrow>{t('disclaimerEyebrow')}</CardEyebrow>
        <CardTitle>{t('disclaimerTitle')}</CardTitle>
        <p className="mt-2 text-small text-ink-muted">{t('disclaimerBody')}</p>
      </Card>

      {/* Make Correction / Insert modal (mode-aware, shared form) */}
      {editingPlan && (
        <PlanFormModal
          plan={editingPlan}
          mode={editMode}
          seedEffectiveStart={insertSeedDate ?? undefined}
          onClose={closePlanModal}
          onSubmit={handleUpdatePlan}
          onInsert={handleSupersedePlan}
          isTh={isTh}
          locale={locale}
          t={t}
        />
      )}

      {/* STA-123 — Insert date-gate pop-up (shared with the rule surface). */}
      {insertTarget && (
        <InsertChangePopup
          open
          benefitName={isTh ? insertTarget.nameTh : insertTarget.nameEn}
          onCancel={() => setInsertTarget(null)}
          onProceed={handleInsertProceed}
        />
      )}

      {/* Create modal */}
      {creatingPlan && (
        <CreatePlanModal
          onClose={() => setCreatingPlan(false)}
          onSubmit={handleCreatePlan}
          existingIds={existingIds}
          isTh={isTh}
          t={t}
        />
      )}

      {/* STA-113 — Delete confirm (soft-inactivate), mirrors the rules delete modal. */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title={t('deleteConfirmTitle')}>
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-body text-ink">
              {isTh ? 'ต้องการลบแผน ' : 'Delete plan '}
              <span className="font-semibold">{isTh ? deleteTarget.nameTh : deleteTarget.nameEn} ({deleteTarget.id})</span>
              {isTh ? ' ใช่หรือไม่?' : '?'}
            </p>
            <p className="text-small text-ink-muted">{t('deleteConfirmBody')}</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>{t('cancel')}</Button>
              <Capability action="edit" fallback={<Button variant="danger" disabled>{t('delete')}</Button>}>
                <Button variant="danger" onClick={() => handleDeletePlan(deleteTarget)}>{t('delete')}</Button>
              </Capability>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
