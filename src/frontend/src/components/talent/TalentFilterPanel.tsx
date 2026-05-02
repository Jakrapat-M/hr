'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Card, FormField, FormInput } from '@/components/humi';
import type { TalentFilters } from './TalentSearchPanel';

// ════════════════════════════════════════════════════════════
// TalentFilterPanel — ~30-input advanced filter sourced from
// SF SuccessFactors advanced search (01-sf-system-baseline §3).
// Groups: Org / Location / Employment / Personal / Career / Talent flags.
// All filters are optional — client-side only (mockup).
// ════════════════════════════════════════════════════════════

const selectClassName =
  'h-10 w-full rounded-md border border-hairline bg-surface px-3 text-body text-ink transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas';

// ── Section collapse helper ──────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3 text-small font-semibold text-ink hover:text-accent transition-colors"
        aria-expanded={open}
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="flex flex-col gap-3 pb-4">{children}</div>}
    </div>
  );
}

// ── Reusable select wrapper ──────────────────────────────────

function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <FormField label={label} id={id}>
      {(ctrl) => (
        <select
          {...ctrl}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={selectClassName}
          aria-label={label}
        >
          <option value="">{placeholder ?? `— เลือก ${label} —`}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}

// ── Multi-select chip placeholder ────────────────────────────

function MultiChipField({
  label,
  id,
  selected,
  onChange,
  options,
}: {
  label: string;
  id: string;
  selected: string[];
  onChange: (v: string[]) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const toggle = (val: string) => {
    onChange(
      selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val],
    );
  };

  return (
    <div className="flex flex-col gap-1.5" id={id}>
      <span className="text-small font-medium text-ink">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={[
                'rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
                active
                  ? 'bg-accent text-canvas'
                  : 'bg-canvas-soft text-ink-muted hover:bg-accent-soft hover:text-accent-ink',
              ].join(' ')}
              aria-pressed={active}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Picklist data ────────────────────────────────────────────

const COMPANIES = [
  { value: 'cg', label: 'Central Group' },
  { value: 'crc', label: 'Central Retail Corporation' },
  { value: 'cebu', label: 'Central Department Store' },
  { value: 'tops', label: 'Tops Supermarket' },
];

const BUSINESS_UNITS = [
  { value: 'retail', label: 'Retail Operations' },
  { value: 'people', label: 'People Operations' },
  { value: 'finance', label: 'Finance & Accounting' },
  { value: 'it', label: 'Information Technology' },
  { value: 'marketing', label: 'Marketing & Branding' },
  { value: 'ops', label: 'OPS-Operations' },
  { value: 'supply', label: 'Supply Chain' },
];

const DEPARTMENTS = [
  { value: 'hr', label: 'ทรัพยากรบุคคล / HR' },
  { value: 'finance', label: 'การเงิน / Finance' },
  { value: 'it', label: 'เทคโนโลยีสารสนเทศ / IT' },
  { value: 'sales', label: 'ฝ่ายขาย / Sales' },
  { value: 'ops', label: 'ปฏิบัติการ / Operations' },
  { value: 'food', label: 'Food' },
  { value: 'cashier', label: 'Cashier & Service' },
];

const COUNTRIES = [
  { value: 'TH', label: 'ไทย / Thailand' },
  { value: 'VN', label: 'เวียดนาม / Vietnam' },
  { value: 'MY', label: 'มาเลเซีย / Malaysia' },
  { value: 'SG', label: 'สิงคโปร์ / Singapore' },
];

const EMPLOYEE_CLASSES = [
  { value: 'full_time', label: 'พนักงานประจำ / Full-time' },
  { value: 'part_time', label: 'พนักงานพาร์ทไทม์ / Part-time' },
  { value: 'contract', label: 'พนักงานสัญญาจ้าง / Contract' },
  { value: 'temp', label: 'ชั่วคราว / Temporary' },
];

const PAY_GRADES = [
  { value: 'G1', label: 'Grade 1' },
  { value: 'G2', label: 'Grade 2' },
  { value: 'G3', label: 'Grade 3' },
  { value: 'G4', label: 'Grade 4' },
  { value: 'G5', label: 'Grade 5' },
  { value: 'M1', label: 'Manager Grade 1' },
  { value: 'M2', label: 'Manager Grade 2' },
];

const PAY_GROUPS = [
  { value: 'monthly', label: 'รายเดือน / Monthly' },
  { value: 'bimonthly', label: 'รายครึ่งเดือน / Bi-monthly' },
];

const GENDERS = [
  { value: 'male', label: 'ชาย / Male' },
  { value: 'female', label: 'หญิง / Female' },
  { value: 'other', label: 'อื่น ๆ / Other' },
];

const MARITAL_STATUSES = [
  { value: 'single', label: 'โสด / Single' },
  { value: 'married', label: 'สมรส / Married' },
  { value: 'divorced', label: 'หย่า / Divorced' },
  { value: 'widowed', label: 'หม้าย / Widowed' },
];

const PERFORMANCE_RATINGS = [
  { value: '5', label: '5 — Exceptional' },
  { value: '4', label: '4 — Exceeds' },
  { value: '3', label: '3 — Meets' },
  { value: '2', label: '2 — Below' },
  { value: '1', label: '1 — Unsatisfactory' },
];

const MOBILITY_OPTIONS = [
  { value: 'yes', label: 'ย้ายได้ / Relocatable' },
  { value: 'domestic', label: 'ในประเทศเท่านั้น' },
  { value: 'no', label: 'ไม่ต้องการย้าย' },
];

const PREFERRED_NEXT_MOVES = [
  { value: 'promote', label: 'เลื่อนตำแหน่ง / Promotion' },
  { value: 'lateral', label: 'โอนย้าย / Lateral Move' },
  { value: 'develop', label: 'พัฒนาในตำแหน่งปัจจุบัน' },
  { value: 'retire', label: 'เกษียณ' },
];

// ── Main component ───────────────────────────────────────────

export interface TalentFilterPanelProps {
  filters: TalentFilters;
  onChange: (next: TalentFilters) => void;
  onReset: () => void;
}

export function TalentFilterPanel({ filters, onChange, onReset }: TalentFilterPanelProps) {
  const set = <K extends keyof TalentFilters>(key: K, val: TalentFilters[K]) =>
    onChange({ ...filters, [key]: val });

  return (
    <Card className="flex flex-col gap-0 divide-y-0 p-0 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-canvas-soft">
        <span className="text-small font-semibold text-ink">ตัวกรองขั้นสูง</span>
        <button
          type="button"
          onClick={onReset}
          className="text-small text-accent hover:underline"
        >
          ล้างทั้งหมด / Clear all
        </button>
      </div>

      <div className="px-4 py-1 overflow-y-auto max-h-[calc(100vh-220px)]">

        {/* ── Org ─────────────────────────────────────────── */}
        <Section title="องค์กร / Org">
          <SelectField
            label="Company"
            id="filter-company"
            value={filters.company}
            onChange={(v) => set('company', v)}
            options={COMPANIES}
            placeholder="— เลือก Company —"
          />
          <FormField label="Group / Corporate" id="filter-group">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                placeholder="ค้นหา Group"
                value={filters.group}
                onChange={(e) => set('group', e.target.value)}
              />
            )}
          </FormField>
          <SelectField
            label="Business Unit"
            id="filter-bu"
            value={filters.businessUnit}
            onChange={(v) => set('businessUnit', v)}
            options={BUSINESS_UNITS}
            placeholder="— เลือก BU —"
          />
          <FormField label="Function" id="filter-function">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                placeholder="ค้นหา Function"
                value={filters.functionArea}
                onChange={(e) => set('functionArea', e.target.value)}
              />
            )}
          </FormField>
          <SelectField
            label="Department"
            id="filter-department"
            value={filters.department}
            onChange={(v) => set('department', v)}
            options={DEPARTMENTS}
            placeholder="— เลือก Department —"
          />
        </Section>

        {/* ── Location ─────────────────────────────────────── */}
        <Section title="สถานที่ / Location" defaultOpen={false}>
          <SelectField
            label="Country"
            id="filter-country"
            value={filters.country}
            onChange={(v) => set('country', v)}
            options={COUNTRIES}
            placeholder="— เลือก Country —"
          />
          <FormField label="Province / จังหวัด" id="filter-province">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                placeholder="เช่น กรุงเทพ, เชียงใหม่"
                value={filters.province}
                onChange={(e) => set('province', e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Branch Code / รหัสสาขา" id="filter-branch-code">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                placeholder="เช่น 0001"
                value={filters.branchCode}
                onChange={(e) => set('branchCode', e.target.value)}
              />
            )}
          </FormField>
          <FormField label="HR District" id="filter-hr-district">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                placeholder="ค้นหา HR District"
                value={filters.hrDistrict}
                onChange={(e) => set('hrDistrict', e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Work Location" id="filter-work-location">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                placeholder="ค้นหา Work Location"
                value={filters.workLocation}
                onChange={(e) => set('workLocation', e.target.value)}
              />
            )}
          </FormField>
        </Section>

        {/* ── Employment ───────────────────────────────────── */}
        <Section title="การจ้างงาน / Employment" defaultOpen={false}>
          <FormField label="Position" id="filter-position">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                placeholder="ค้นหา Position"
                value={filters.position}
                onChange={(e) => set('position', e.target.value)}
              />
            )}
          </FormField>
          <SelectField
            label="Employee Class"
            id="filter-employee-class"
            value={filters.employeeClass}
            onChange={(v) => set('employeeClass', v)}
            options={EMPLOYEE_CLASSES}
            placeholder="— เลือก Employee Class —"
          />
          <FormField label="Job Code" id="filter-job-code">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                placeholder="เช่น JOB-001"
                value={filters.jobCode}
                onChange={(e) => set('jobCode', e.target.value)}
              />
            )}
          </FormField>
          <SelectField
            label="Pay Grade"
            id="filter-pay-grade"
            value={filters.payGrade}
            onChange={(v) => set('payGrade', v)}
            options={PAY_GRADES}
            placeholder="— เลือก Pay Grade —"
          />
          <SelectField
            label="Pay Group"
            id="filter-pay-group"
            value={filters.payGroup}
            onChange={(v) => set('payGroup', v)}
            options={PAY_GROUPS}
            placeholder="— เลือก Pay Group —"
          />
        </Section>

        {/* ── Personal ─────────────────────────────────────── */}
        <Section title="ข้อมูลส่วนตัว / Personal" defaultOpen={false}>
          <SelectField
            label="เพศ / Gender"
            id="filter-gender"
            value={filters.gender}
            onChange={(v) => set('gender', v)}
            options={GENDERS}
            placeholder="— เลือก Gender —"
          />
          <div className="grid grid-cols-2 gap-2">
            <FormField label="อายุ (ต่ำสุด)" id="filter-age-min">
              {(ctrl) => (
                <FormInput
                  {...ctrl}
                  type="number"
                  min={18}
                  max={65}
                  placeholder="18"
                  value={filters.ageMin}
                  onChange={(e) => set('ageMin', e.target.value)}
                />
              )}
            </FormField>
            <FormField label="อายุ (สูงสุด)" id="filter-age-max">
              {(ctrl) => (
                <FormInput
                  {...ctrl}
                  type="number"
                  min={18}
                  max={65}
                  placeholder="65"
                  value={filters.ageMax}
                  onChange={(e) => set('ageMax', e.target.value)}
                />
              )}
            </FormField>
          </div>
          <SelectField
            label="สถานภาพสมรส / Marital Status"
            id="filter-marital"
            value={filters.maritalStatus}
            onChange={(v) => set('maritalStatus', v)}
            options={MARITAL_STATUSES}
            placeholder="— เลือก —"
          />
          <FormField label="สัญชาติ / Nationality" id="filter-nationality">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                placeholder="เช่น th, vn"
                value={filters.nationality}
                onChange={(e) => set('nationality', e.target.value)}
              />
            )}
          </FormField>
        </Section>

        {/* ── Career ───────────────────────────────────────── */}
        <Section title="อาชีพ / Career" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="อายุงาน (ปี ต่ำสุด)" id="filter-tenure-min">
              {(ctrl) => (
                <FormInput
                  {...ctrl}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={filters.tenureMin}
                  onChange={(e) => set('tenureMin', e.target.value)}
                />
              )}
            </FormField>
            <FormField label="อายุงาน (ปี สูงสุด)" id="filter-tenure-max">
              {(ctrl) => (
                <FormInput
                  {...ctrl}
                  type="number"
                  min={0}
                  placeholder="40"
                  value={filters.tenureMax}
                  onChange={(e) => set('tenureMax', e.target.value)}
                />
              )}
            </FormField>
          </div>
          <FormField label="เลื่อนตำแหน่งครั้งล่าสุด (หลังจาก)" id="filter-promotion-from">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                type="date"
                value={filters.lastPromotionFrom}
                onChange={(e) => set('lastPromotionFrom', e.target.value)}
              />
            )}
          </FormField>
          <FormField label="เลื่อนตำแหน่งครั้งล่าสุด (ก่อน)" id="filter-promotion-to">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                type="date"
                value={filters.lastPromotionTo}
                onChange={(e) => set('lastPromotionTo', e.target.value)}
              />
            )}
          </FormField>
          <MultiChipField
            label="Performance Rating"
            id="filter-performance"
            selected={filters.performanceRatings}
            onChange={(v) => set('performanceRatings', v)}
            options={PERFORMANCE_RATINGS}
          />
          <FormField label="การฝึกอบรมล่าสุด (หลังจาก)" id="filter-training-date">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                type="date"
                value={filters.lastTrainingDate}
                onChange={(e) => set('lastTrainingDate', e.target.value)}
              />
            )}
          </FormField>
        </Section>

        {/* ── Talent flags ─────────────────────────────────── */}
        <Section title="Talent Flags" defaultOpen={false}>
          <FormField label="Successor for (ตำแหน่ง)" id="filter-successor-for">
            {(ctrl) => (
              <FormInput
                {...ctrl}
                placeholder="ค้นหาตำแหน่ง"
                value={filters.successorFor}
                onChange={(e) => set('successorFor', e.target.value)}
              />
            )}
          </FormField>
          <FormField label="On Succession Plan" id="filter-on-plan">
            {(ctrl) => (
              <select
                {...ctrl}
                value={filters.onSuccessionPlan}
                onChange={(e) => set('onSuccessionPlan', e.target.value)}
                className={selectClassName}
                aria-label="On Succession Plan"
              >
                <option value="">— ทั้งหมด —</option>
                <option value="yes">ใช่ / Yes</option>
                <option value="no">ไม่ / No</option>
              </select>
            )}
          </FormField>
          <SelectField
            label="Preferred Next Move"
            id="filter-next-move"
            value={filters.preferredNextMove}
            onChange={(v) => set('preferredNextMove', v)}
            options={PREFERRED_NEXT_MOVES}
            placeholder="— เลือก —"
          />
          <SelectField
            label="Mobility / ความสามารถในการย้าย"
            id="filter-mobility"
            value={filters.mobility}
            onChange={(v) => set('mobility', v)}
            options={MOBILITY_OPTIONS}
            placeholder="— เลือก —"
          />
        </Section>
      </div>
    </Card>
  );
}
