'use client';

import { Card, CardEyebrow, CardTitle, Button } from '@/components/humi';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { REFERRAL_HOSPITALS } from '@/stores/benefit-referrals';
import { THAI_TAX_YEAR_ASSUMPTIONS, formatTHB } from '@/lib/tax-planning';

const masterData = [
  ['BEN-MED-OPD', 'Medical reimbursement', 'Medical', 'Reimbursement', 'INC-MED', '2026-01-01', '2026-12-31', 'Active'],
  ['BEN-FUEL', 'Gasoline reimbursement', 'Transportation', 'Reimbursement', 'INC-FUEL', '2026-01-01', '2026-12-31', 'Active'],
  ['BEN-MOBILE', 'Mobile reimbursement', 'Communication', 'Reimbursement', 'INC-MOB', '2026-01-01', '2026-12-31', 'Active'],
];
const eligibility = [
  ['CG-STAFF', 'BEN-MED-OPD', 'Central Group / People Ops', 'Monthly / Staff', 'M1-M4', 'PG1-PG6', '0', '2026-01-01', 'Active'],
  ['CG-FIELD', 'BEN-FUEL', 'Central Group / Operations', 'Monthly / Field', 'S1-M2', 'PG1-PG4', '3', '2026-01-01', 'Active'],
];
const amountRules = [
  ['CG-STAFF', 'Per claim', '5,000', 'Monthly', '30,000', '2026-01-01', 'Active'],
  ['CG-FIELD', 'Mileage', '8 THB/km', 'Monthly', '6,000', '2026-01-01', 'Active'],
];
const fieldConfig = [
  ['Receipt/document no.', 'Visible', 'Mandatory', 'Read/write', 'All reimbursement types'],
  ['OPD/IPD + hospital type', 'Visible', 'Mandatory', 'Read/write', 'Medical only'],
  ['Dependent name/relationship', 'Conditional', 'Mandatory', 'Read/write', 'Dependent claims only'],
  ['Attachment metadata', 'Visible', 'Mandatory', 'Read-only after submit', 'Medical requires first attachment'],
];
const workflowCutoff = [
  ['Medical reimbursement', 'Employee → SPD Benefits → Payment', '1-25 monthly', 'Next payroll date', 'Active'],
  ['Fuel/mobile reimbursement', 'Employee → SPD Benefits → Payment', '1-20 monthly', 'Month-end bank run', 'Active'],
];
const paymentSteps = ['Create period', 'Calculate', 'Post to finance', 'Upload bank file', 'Close period'];
const referralWorkflow = [
  ['Employee draft/submit', 'Profile benefits canonical surface', 'Active preview'],
  ['SPD approve/send back/reject', 'Dedicated referral lane', 'Active preview'],
  ['Issue letter', 'ePatient payload + 30-day validity', 'Active preview'],
  ['ePatient API sync', 'Secure integration queue', 'ยังไม่เปิดใช้'],
];
const taxAllowanceRows = Object.entries(THAI_TAX_YEAR_ASSUMPTIONS.caps).map(([key, cap]) => [
  key,
  formatTHB(cap),
  'Employee-entered planning allowance',
  'รอเชื่อมต่อ Payroll',
]);

export default function AdminBenefitsPage() {
  const claims = useBenefitClaimsStore((s) => s.claims);
  const pending = claims.filter((c) => c.status === 'pending_spd').length;
  const approved = claims.filter((c) => c.status === 'approved').length;
  const sendBack = claims.filter((c) => c.status === 'send_back').length;
  const totalClaimAmount = claims.reduce((sum, c) => sum + c.totalClaimAmount, 0);
  const remainingAmount = claims.reduce((sum, c) => sum + c.remainingAmount, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardEyebrow>Benefits admin · read-only first pass</CardEyebrow>
          <h1 className="font-display text-[28px] font-semibold text-ink">Benefits master, reporting, and payment</h1>
          <p className="mt-2 text-small text-ink-muted">BRD-backed read-only setup. Edit, import, export, and integrations remain disabled until governance is ready.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled>Edit disabled</Button>
          <Button variant="secondary" disabled>Import disabled</Button>
          <Button variant="secondary" disabled>Export disabled</Button>
          <Button variant="secondary" disabled>Export CSV disabled</Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Summary label="Pending claims" value={pending} />
        <Summary label="Approved claims" value={approved} />
        <Summary label="Send-back claims" value={sendBack} />
        <Summary label="Remaining amount" value={`฿${remainingAmount.toLocaleString('th-TH')}`} />
        <Summary label="Total claim amount" value={`฿${totalClaimAmount.toLocaleString('th-TH')}`} />
      </section>

      <DataSection title="Benefit master data" headers={['Benefit code','Name','Category','Type','Payroll income code','Effective date','End date','Status']} rows={masterData} />
      <DataSection title="Eligibility rules" headers={['Benefit group','Benefit code','Business unit/company','Employee group/subgroup','Job level','Personal grade','Min service month','Effective date','Status']} rows={eligibility} />
      <DataSection title="Amount rules" headers={['Benefit group','Amount type','Amount per claim','Frequency','Maximum amount','Effective date','Status']} rows={amountRules} />
      <DataSection title="Field configuration" headers={['Field name','Visibility','Mandatory','Read-only','Conditional rule']} rows={fieldConfig} />
      <DataSection
        title="Approval workflow and cutoff schedule"
        description="Workflow and cutoff schedule"
        headers={['Benefit plan','Approver lane','Cutoff range','Payment date','Status']}
        rows={workflowCutoff}
      />

      <DataSection
        title="Referral configuration preview"
        description="Hospital network, referral workflow setup, letter template, and ePatient integration are read-only in this pass."
        headers={['Hospital / workflow item','Branch / route','Province / behavior','Status']}
        rows={[
          ...REFERRAL_HOSPITALS.map((hospital) => [hospital.name, hospital.branch, hospital.province, `ePatient code ${hospital.ePatientCode}`]),
          ...referralWorkflow,
        ]}
      />

      <DataSection
        title="Tax Planning configuration preview"
        description={`Tax year ${THAI_TAX_YEAR_ASSUMPTIONS.taxYear}; employee-only estimate with no payroll mutation or reviewer workflow.`}
        headers={['Allowance category','Maximum cap','Purpose','Integration status']}
        rows={taxAllowanceRows}
      />

      <Card variant="raised" size="lg">
        <CardEyebrow>Deferred service integrations</CardEyebrow>
        <CardTitle>Disabled admin actions</CardTitle>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" disabled>Hospital import disabled</Button>
          <Button variant="secondary" disabled>ePatient sync disabled</Button>
          <Button variant="secondary" disabled>Edit tax brackets disabled</Button>
          <Button variant="secondary" disabled>Payroll sync disabled</Button>
        </div>
      </Card>

      <Card variant="raised" size="lg">
        <CardEyebrow>Benefit claim report fields</CardEyebrow>
        <CardTitle>CSV export shape preview</CardTitle>
        <p className="mt-2 text-small text-ink-muted">Preview columns: employee_id, benefit_code, receipt_no, receipt_date, claim_amount, approved_amount, payment_period, status. Actual CSV/Excel export remains disabled.</p>
      </Card>

      <Card variant="raised" size="lg">
        <CardEyebrow>Read-only payment period status</CardEyebrow>
        <CardTitle>CSV export preview and payment process</CardTitle>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {paymentSteps.map((step) => <div key={step} className="rounded-md bg-canvas-soft p-3 text-small font-medium text-ink">{step}<div className="mt-1 text-[length:var(--text-eyebrow)] uppercase tracking-[0.14em] text-ink-muted">Read-only / deferred integration</div></div>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" disabled>Post to finance disabled</Button>
          <Button variant="secondary" disabled>Generate bank file disabled</Button>
        </div>
        <p className="mt-4 text-small text-ink-muted">Deferred: bank file generation, finance posting, payroll calculation, real Excel import/export.</p>
      </Card>

      <Card variant="raised" size="lg">
        <CardEyebrow>BE User Management deferred</CardEyebrow>
        <CardTitle>Data permission group editing</CardTitle>
        <p className="mt-2 text-small text-ink-muted">Application role group and user assignment editing stay deferred until real admin RBAC integration is in scope.</p>
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number | string }) {
  return <Card variant="raised" size="md"><CardEyebrow>{label}</CardEyebrow><p className="mt-1 font-display text-[24px] font-semibold text-ink tabular-nums">{value}</p></Card>;
}

function DataSection({ title, description, headers, rows }: { title: string; description?: string; headers: string[]; rows: string[][] }) {
  return (
    <Card variant="raised" size="lg" className="overflow-x-auto">
      <CardTitle>{title}</CardTitle>
      {description && <p className="mt-1 text-small text-ink-muted">{description}</p>}
      <table className="mt-4 min-w-full text-left text-small">
        <thead><tr className="border-b border-hairline">{headers.map((header) => <th key={header} className="whitespace-nowrap px-3 py-2 font-semibold text-ink-muted">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.join('|')} className="border-b border-hairline last:border-0">{row.map((cell, index) => <td key={`${cell}-${index}`} className="whitespace-nowrap px-3 py-2 text-ink-soft">{cell}</td>)}</tr>)}</tbody>
      </table>
    </Card>
  );
}
