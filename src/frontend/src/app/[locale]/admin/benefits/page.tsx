'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Card, CardEyebrow, CardTitle, Button, DemoValuesDisclaimer } from '@/components/humi';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { REFERRAL_HOSPITALS, useBenefitReferralsStore } from '@/stores/benefit-referrals';

// STA-62 — turn the Admin root from a read-only preview into a working hub.
// Each previously-disabled control resolves to one of three states:
//   (a) deep-link to an existing child page that already does the work
//   (b) mock action that fires a toast (export-CSV preview download)
//   (c) explicit roadmap callout copy with "planned post-backend" in TH + EN
// No fake-disabled buttons remain.

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
const referralWorkflow = [
  ['Employee draft/submit', 'Profile benefits canonical surface', 'Active preview'],
  ['SPD approve/send back/reject', 'Dedicated referral lane', 'Active preview'],
  ['Issue letter', 'ePatient payload + 30-day validity', 'Active preview'],
  ['ePatient API sync', 'Secure integration queue', 'ยังไม่เปิดใช้'],
];
const eboRows = [
  ['EBO-MED-2026', 'Employee Benefit Obligation', 'Medical carry-forward obligation', 'Admin/reporting only', 'Restricted'],
  ['EBO-FAM-2026', 'Employee Benefit Obligation', 'Dependent eligibility obligation', 'Admin/reporting only', 'Restricted'],
];

export default function AdminBenefitsPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const claims = useBenefitClaimsStore((s) => s.claims);
  const referrals = useBenefitReferralsStore((s) => s.referrals);
  const pending = claims.filter((c) => c.status === 'pending_spd').length;
  const approved = claims.filter((c) => c.status === 'approved').length;
  const sendBack = claims.filter((c) => c.status === 'send_back').length;
  const totalClaimAmount = claims.reduce((sum, c) => sum + c.totalClaimAmount, 0);
  const remainingAmount = claims.reduce((sum, c) => sum + c.remainingAmount, 0);
  const activeReferrals = referrals.filter((referral) => !['draft', 'cancelled'].includes(referral.status)).length;

  // STA-62 — toast for mock actions
  const [toast, setToast] = useState<string | null>(null);
  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // STA-62 — mock Export-CSV action: generate a 1-row preview CSV blob and download
  const handleExportCsvPreview = () => {
    const header = 'employee_id,benefit_code,receipt_no,receipt_date,claim_amount,approved_amount,payment_period,status\n';
    const sample = 'EMP-0042,BEN-MED-OPD,RCP-2026-04-0042,2026-04-12,3500,3500,PP-2026-04,approved\n';
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benefit-claims-preview-mock.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flashToast(isTh ? 'ดาวน์โหลด CSV ตัวอย่าง (จำลอง) แล้ว' : 'Mock CSV preview downloaded');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardEyebrow>{isTh ? 'สวัสดิการ · หน้าหลักของผู้ดูแล' : 'Benefits admin · operations hub'}</CardEyebrow>
          <h1 className="font-display text-3xl font-semibold text-ink">Benefits governance and service operations</h1>
          <p className="mt-2 text-small text-ink-muted">
            {isTh
              ? 'Master data, eligibility, Benefit Special Privilege, EBO reporting, SPD workflows, payment export status, and hospital integration previews. Payroll/Tax review stays outside Benefits Admin. (STA-62 — actions deep-link to working child pages or fire mock previews; no fake disabled buttons remain.)'
              : 'Master data, eligibility, Benefit Special Privilege, EBO reporting, SPD workflows, payment export status, and hospital integration previews. Payroll/Tax review stays outside Benefits Admin. (STA-62 — actions deep-link to working child pages or fire mock previews; no fake disabled buttons remain.)'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* STA-62 — Edit → deep-link to plans (configurator lives there) */}
          <Link href={`/${locale}/admin/benefits/plans`}>
            <Button variant="secondary">
              {isTh ? 'แก้ไขแผน' : 'Edit plans'} →
            </Button>
          </Link>
          {/* STA-62 — Import → deep-link to existing /import child route */}
          <Link href={`/${locale}/admin/benefits/import`}>
            <Button variant="secondary">
              {isTh ? 'นำเข้าข้อมูล' : 'Import'} →
            </Button>
          </Link>
          {/* STA-62 — Export → deep-link to reports child route */}
          <Link href={`/${locale}/admin/benefits/reports`}>
            <Button variant="secondary">
              {isTh ? 'รายงาน / Export' : 'Reports / Export'} →
            </Button>
          </Link>
          {/* STA-62 — Export CSV → mock action: download a preview CSV blob */}
          <Button variant="secondary" onClick={handleExportCsvPreview}>
            {isTh ? 'Export CSV (จำลอง)' : 'Export CSV (mock)'}
          </Button>
        </div>
      </header>

      <DemoValuesDisclaimer />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Summary label="Pending claims" value={pending} />
        <Summary label="Approved claims" value={approved} />
        <Summary label="Send-back claims" value={sendBack} />
        <Summary label="Referral requests" value={activeReferrals} />
        <Summary label="Remaining amount" value={`฿${remainingAmount.toLocaleString('th-TH')}`} />
        <Summary label="Total claim amount" value={`฿${totalClaimAmount.toLocaleString('th-TH')}`} />
      </section>

      <DataSection title="Benefit master data" headers={['Benefit code','Name','Category','Type','Payroll income code','Effective date','End date','Status']} rows={masterData} />
      <DataSection title="Eligibility rules" headers={['Benefit group','Benefit code','Business unit/company','Employee group/subgroup','Job level','Personal grade','Min service month','Effective date','Status']} rows={eligibility} />
      <DataSection title="Benefit Special Privilege and EBO reporting" description="EBO is admin/reporting-only in this pass and is not exposed to employees." headers={['Record code','Section','Description','Visibility','Status']} rows={eboRows} />
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

      <Card variant="raised" size="lg">
        <CardEyebrow>Service integrations</CardEyebrow>
        <CardTitle>{isTh ? 'การดำเนินการของผู้ดูแล' : 'Admin operations'}</CardTitle>
        <div className="mt-4 flex flex-wrap gap-2">
          {/* STA-62 — Hospital import → deep-link to /admin/benefits/import */}
          <Link href={`/${locale}/admin/benefits/import`}>
            <Button variant="secondary">
              {isTh ? 'นำเข้าโรงพยาบาล' : 'Hospital import'} →
            </Button>
          </Link>
          {/* STA-62 — ePatient sync → roadmap callout (no integration in mockup phase) */}
          <Button variant="ghost" disabled title={isTh ? 'วางแผนหลังเปิดใช้ Backend' : 'Planned post-backend'}>
            {isTh ? 'ePatient sync — วางแผนหลังเปิดใช้ Backend' : 'ePatient sync — planned post-backend'}
          </Button>
          {/* STA-62 — Finance export → deep-link to payment lifecycle page (handles export now) */}
          <Link href={`/${locale}/admin/benefits/payment`}>
            <Button variant="secondary">
              {isTh ? 'ส่งบัญชี (Payment)' : 'Finance export (Payment)'} →
            </Button>
          </Link>
          {/* STA-62 — Bank file generation → deep-link to payment lifecycle page (payload preview) */}
          <Link href={`/${locale}/admin/benefits/payment`}>
            <Button variant="secondary">
              {isTh ? 'สร้างไฟล์ธนาคาร (Payment)' : 'Bank file (Payment)'} →
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-[length:var(--text-eyebrow)] uppercase tracking-[0.12em] text-ink-muted">
          {isTh
            ? 'หมายเหตุ: Finance/Bank export ทำผ่านหน้าจ่ายสวัสดิการ (STA-67). ePatient sync วางแผนหลังเปิดใช้ Backend จริง.'
            : 'Note: Finance/Bank export runs through the Payment lifecycle page (STA-67). ePatient sync is planned post-backend.'}
        </p>
      </Card>

      <Card variant="raised" size="lg">
        <CardEyebrow>Benefit claim report fields</CardEyebrow>
        <CardTitle>CSV export shape preview</CardTitle>
        <p className="mt-2 text-small text-ink-muted">
          {isTh
            ? 'คอลัมน์ตัวอย่าง: employee_id, benefit_code, receipt_no, receipt_date, claim_amount, approved_amount, payment_period, status. ใช้ปุ่ม “Export CSV (จำลอง)” ด้านบนเพื่อดาวน์โหลดไฟล์ตัวอย่าง 1 แถว. CSV/Excel ตัวจริงเปิดใช้หลัง Backend integration.'
            : 'Preview columns: employee_id, benefit_code, receipt_no, receipt_date, claim_amount, approved_amount, payment_period, status. Use the "Export CSV (mock)" button above to download a 1-row sample. Real CSV/Excel export ships with backend integration.'}
        </p>
      </Card>

      <Card variant="raised" size="md" className="mt-6">
        <CardEyebrow>BE-27 · Payment Integration · Read-only payment period status</CardEyebrow>
        <CardTitle>{isTh ? 'การจ่ายสวัสดิการ' : 'Benefit Payment'}</CardTitle>
        <p className="mt-2 text-small text-ink-muted">
          {isTh ? 'ดูแดชบอร์ดการจ่าย (อ่านอย่างเดียว)' : 'View payment dashboard (read-only)'}
        </p>
        <Link
          href={`/${locale}/admin/benefits/payment`}
          className="mt-3 inline-block text-small font-semibold text-accent hover:underline"
        >
          {isTh ? 'ไปยังแดชบอร์ด →' : 'Go to dashboard →'}
        </Link>
      </Card>

      <Card variant="raised" size="lg">
        <CardEyebrow>BE User Management deferred</CardEyebrow>
        <CardTitle>Data permission group editing</CardTitle>
        <p className="mt-2 text-small text-ink-muted">
          {isTh
            ? 'การจัดการกลุ่มสิทธิ์และการกำหนดผู้ใช้ — วางแผนหลังเปิดใช้ Backend RBAC จริง.'
            : 'Application role group and user assignment editing — planned post-backend (real admin RBAC integration).'}
        </p>
      </Card>

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
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number | string }) {
  return <Card variant="raised" size="md"><CardEyebrow>{label}</CardEyebrow><p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">{value}</p></Card>;
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
