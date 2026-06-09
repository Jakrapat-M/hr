'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Card, CardEyebrow, CardTitle, Button, DemoValuesDisclaimer } from '@/components/humi';
import { CollapsibleSectionCard } from '@/components/admin/wizard/CollapsibleSectionCard';
import {
  FileText,
  ShieldCheck,
  Upload,
  PieChart,
  CreditCard,
  ClipboardList,
  Database,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { REFERRAL_HOSPITALS, useBenefitReferralsStore } from '@/stores/benefit-referrals';

// Benefits Admin hub. Redesigned (ccg: Gemini + Claude synthesis) from a button-pile
// + wall-of-8-tables into a lean launcher:
//   • one primary action (edit plans)
//   • a workspace card grid that deep-links to the child pages where real work lives
//   • a compact integrations/sync section
//   • the read-only reference tables collapsed by default (edit lives on child pages)
// Humi tokens only; danger = pumpkin (--color-danger), never red. No backend.

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

type NavCardDef = {
  href: string;
  icon: LucideIcon;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
};

const NAV_CARDS: NavCardDef[] = [
  { href: 'plans', icon: FileText, titleTh: 'แผนสวัสดิการ', titleEn: 'Benefit plans', descTh: 'สร้างและแก้ไขแผน (configurator)', descEn: 'Create & edit plans (configurator)' },
  { href: 'rules', icon: ShieldCheck, titleTh: 'กฎสิทธิ์', titleEn: 'Eligibility rules', descTh: 'เงื่อนไขสิทธิ์ตามแผน (สร้างหลังตั้งแผน)', descEn: 'Eligibility conditions per plan' },
  { href: 'import', icon: Upload, titleTh: 'นำเข้าข้อมูล', titleEn: 'Import', descTh: 'นำเข้าข้อมูลสวัสดิการแบบกลุ่ม', descEn: 'Bulk benefit data import' },
  { href: 'reports', icon: PieChart, titleTh: 'รายงาน / ส่งออก', titleEn: 'Reports & export', descTh: 'รายงานและไฟล์ส่งออก', descEn: 'Reports and export files' },
  { href: 'payment', icon: CreditCard, titleTh: 'การจ่ายสวัสดิการ', titleEn: 'Payment', descTh: 'สถานะรอบจ่าย (อ่านอย่างเดียว)', descEn: 'Payment period status (read-only)' },
  { href: 'records', icon: ClipboardList, titleTh: 'บันทึกการเคลม', titleEn: 'Claim records', descTh: 'ประวัติและรายการเคลม', descEn: 'Claim history & records' },
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

  const [toast, setToast] = useState<string | null>(null);
  const [refOpen, setRefOpen] = useState(false); // reference tables collapsed by default
  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // Mock Export-CSV action: generate a 1-row preview CSV blob and download.
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
    flashToast(isTh ? 'ดาวน์โหลดไฟล์ตัวอย่างแล้ว' : 'Sample CSV downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Header — single primary action (no more button pile) */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardEyebrow>{isTh ? 'สวัสดิการ · หน้าหลักของผู้ดูแล' : 'Benefits admin · operations hub'}</CardEyebrow>
          <h1 className="font-display text-3xl font-semibold text-ink">
            {isTh ? 'จัดการสวัสดิการ' : 'Benefits administration'}
          </h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            {isTh
              ? 'ศูนย์รวมการตั้งค่าแผน กฎสิทธิ์ การนำเข้า รายงาน และการจ่าย — เลือกพื้นที่ทำงานด้านล่าง'
              : 'Central hub for plans, eligibility rules, imports, reports and payment — pick a workspace below.'}
          </p>
        </div>
        <Link href={`/${locale}/admin/benefits/plans`} className="shrink-0">
          <Button variant="primary">{isTh ? 'แก้ไขแผนสวัสดิการ' : 'Edit benefit plans'} →</Button>
        </Link>
      </header>

      <DemoValuesDisclaimer />

      {/* Summary stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Summary label={isTh ? 'รออนุมัติ' : 'Pending claims'} value={pending} />
        <Summary label={isTh ? 'อนุมัติแล้ว' : 'Approved claims'} value={approved} />
        <Summary label={isTh ? 'ส่งกลับ' : 'Send-back claims'} value={sendBack} />
        <Summary label={isTh ? 'คำขอส่งตัว' : 'Referral requests'} value={activeReferrals} />
        <Summary label={isTh ? 'ยอดคงเหลือ' : 'Remaining amount'} value={`฿${remainingAmount.toLocaleString('th-TH')}`} />
        <Summary label={isTh ? 'ยอดเคลมรวม' : 'Total claim amount'} value={`฿${totalClaimAmount.toLocaleString('th-TH')}`} />
      </section>

      {/* Workspace launcher — replaces the scattered buttons + inline tables */}
      <section aria-labelledby="benefits-nav-heading" className="space-y-3">
        <h2 id="benefits-nav-heading" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
          {isTh ? 'พื้นที่ทำงาน' : 'Workspaces'}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_CARDS.map((card) => (
            <NavCard key={card.href} card={card} locale={locale} isTh={isTh} />
          ))}
        </div>
      </section>

      {/* System integrations & sync (was the loose "Admin operations" buttons) */}
      <Card variant="raised" size="lg">
        <CardEyebrow>{isTh ? 'การเชื่อมต่อระบบ' : 'System integrations'}</CardEyebrow>
        <CardTitle>{isTh ? 'การเชื่อมต่อและซิงก์' : 'Integrations & sync'}</CardTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <IntegrationRow
            active
            label={isTh ? 'นำเข้าโรงพยาบาล' : 'Hospital import'}
            href={`/${locale}/admin/benefits/import`}
          />
          <IntegrationRow
            active={false}
            label={isTh ? 'ePatient sync — ยังไม่พร้อมใช้งาน' : 'ePatient sync — not available yet'}
          />
          <IntegrationRow
            active
            label={isTh ? 'ส่งบัญชี (Payment)' : 'Finance export (Payment)'}
            href={`/${locale}/admin/benefits/payment`}
          />
          <IntegrationRow
            active
            label={isTh ? 'สร้างไฟล์ธนาคาร (Payment)' : 'Bank file (Payment)'}
            href={`/${locale}/admin/benefits/payment`}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={handleExportCsvPreview}>
            {isTh ? 'Export CSV (จำลอง)' : 'Export CSV (sample)'}
          </Button>
          <p className="text-small text-ink-muted">
            {isTh
              ? 'การส่งออกการเงินและไฟล์ธนาคารทำผ่านหน้าการจ่ายสวัสดิการ'
              : 'Finance and bank-file export run through the Payment page.'}
          </p>
        </div>
      </Card>

      {/* Reference data — collapsed by default (edit lives on the workspace pages) */}
      <CollapsibleSectionCard
        id="benefits-reference"
        icon={Database}
        eyebrow={isTh ? 'อ้างอิง' : 'Reference'}
        title={isTh ? 'ข้อมูลอ้างอิง (อ่านอย่างเดียว)' : 'Reference data (read-only)'}
        sub={isTh ? 'ดูได้จากที่นี่ — แก้ไขที่หน้าพื้นที่ทำงานที่เกี่ยวข้อง' : 'Read here — edit on the related workspace pages'}
        collapsed={!refOpen}
        onToggle={() => setRefOpen((v) => !v)}
        expandLabel={isTh ? 'ขยาย' : 'Expand'}
        collapseLabel={isTh ? 'ย่อ' : 'Collapse'}
      >
        <div className="mt-2 space-y-6">
          <DataSection title="Benefit master data" headers={['Benefit code', 'Name', 'Category', 'Type', 'Payroll income code', 'Effective date', 'End date', 'Status']} rows={masterData} />
          <DataSection title="Eligibility rules" headers={['Benefit group', 'Benefit code', 'Business unit/company', 'Employee group/subgroup', 'Job level', 'Personal grade', 'Min service month', 'Effective date', 'Status']} rows={eligibility} />
          <DataSection title="Benefit Special Privilege and EBO reporting" description="EBO is admin/reporting-only and is not exposed to employees." headers={['Record code', 'Section', 'Description', 'Visibility', 'Status']} rows={eboRows} />
          <DataSection title="Amount rules" headers={['Benefit group', 'Amount type', 'Amount per claim', 'Frequency', 'Maximum amount', 'Effective date', 'Status']} rows={amountRules} />
          <DataSection title="Field configuration" headers={['Field name', 'Visibility', 'Mandatory', 'Read-only', 'Conditional rule']} rows={fieldConfig} />
          <DataSection title="Approval workflow and cutoff schedule" description="Workflow and cutoff schedule" headers={['Benefit plan', 'Approver lane', 'Cutoff range', 'Payment date', 'Status']} rows={workflowCutoff} />
          <DataSection
            title="Referral configuration preview"
            description="Hospital network, referral workflow setup, letter template, and ePatient integration are read-only."
            headers={['Hospital / workflow item', 'Branch / route', 'Province / behavior', 'Status']}
            rows={[
              ...REFERRAL_HOSPITALS.map((hospital) => [hospital.name, hospital.branch, hospital.province, `ePatient code ${hospital.ePatientCode}`]),
              ...referralWorkflow,
            ]}
          />
        </div>
      </CollapsibleSectionCard>

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

function NavCard({ card, locale, isTh }: { card: NavCardDef; locale: string; isTh: boolean }) {
  const { href, icon: Icon, titleTh, titleEn, descTh, descEn } = card;
  return (
    <Link href={`/${locale}/admin/benefits/${href}`} className="group block no-underline">
      <Card variant="raised" size="md" className="h-full transition-shadow hover:shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-4">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
          >
            <Icon size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold group-hover:text-accent transition-colors">
              {isTh ? titleTh : titleEn}
            </CardTitle>
            <p className="mt-1 text-small text-ink-muted">{isTh ? descTh : descEn}</p>
          </div>
          <ArrowRight size={16} className="mt-1 shrink-0 text-ink-faint transition-colors group-hover:text-accent" aria-hidden />
        </div>
      </Card>
    </Link>
  );
}

function IntegrationRow({ active, label, href }: { active: boolean; label: string; href?: string }) {
  const body = (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2.5">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: active ? 'var(--color-accent)' : 'var(--color-danger)' }}
        aria-hidden
      />
      <span className={`text-small ${active ? 'text-ink' : 'text-ink-muted'}`}>{label}</span>
      {href && <ArrowRight size={14} className="ml-auto shrink-0 text-ink-faint" aria-hidden />}
    </div>
  );
  return href ? (
    <Link href={href} className="block no-underline hover:opacity-90">{body}</Link>
  ) : (
    body
  );
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
