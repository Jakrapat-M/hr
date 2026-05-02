'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button, Card, CardEyebrow, CardTitle, Modal } from '@/components/humi';
import { Capability } from '@/components/humi';
import { RecordsFlatForm } from '@/components/benefits/templates/RecordsFlatForm';
import { getPlan } from '@/data/benefits/plan-registry';

// ── Beneficiary management page ───────────────────────────────────────────────
// Table of mock beneficiaries + Modal-driven add/edit via RecordsFlatForm (BE-BEN-001).

interface BeneficiaryRow {
  id: string;
  employeeId: string;
  employeeName: string;
  beneficiaryName: string;
  relationship: string;
  relationshipEn: string;
  nationalId: string;
  percentage: number;
  updatedDate: string;
  status: 'active' | 'inactive';
}

const MOCK_BENEFICIARIES: BeneficiaryRow[] = [
  { id: 'BEN-001', employeeId: 'EMP001', employeeName: 'สมชาย ใจดี',      beneficiaryName: 'สมหญิง ใจดี',      relationship: 'คู่สมรส',  relationshipEn: 'Spouse',  nationalId: '1-2345-67890-12-3', percentage: 100, updatedDate: '2026-01-15', status: 'active' },
  { id: 'BEN-002', employeeId: 'EMP002', employeeName: 'วิภา รักงาน',       beneficiaryName: 'ประยุทธ รักงาน',   relationship: 'บิดา',     relationshipEn: 'Father',  nationalId: '1-9876-54321-00-1', percentage: 50,  updatedDate: '2026-02-03', status: 'active' },
  { id: 'BEN-003', employeeId: 'EMP002', employeeName: 'วิภา รักงาน',       beneficiaryName: 'ศรีประภา รักงาน',  relationship: 'มารดา',    relationshipEn: 'Mother',  nationalId: '1-9876-54321-00-2', percentage: 50,  updatedDate: '2026-02-03', status: 'active' },
  { id: 'BEN-004', employeeId: 'EMP003', employeeName: 'ธนกร มั่นคง',       beneficiaryName: 'ธนพร มั่นคง',      relationship: 'คู่สมรส',  relationshipEn: 'Spouse',  nationalId: '2-1111-22222-33-4', percentage: 70,  updatedDate: '2025-11-20', status: 'active' },
  { id: 'BEN-005', employeeId: 'EMP003', employeeName: 'ธนกร มั่นคง',       beneficiaryName: 'ธนวัฒน์ มั่นคง',   relationship: 'บุตร',     relationshipEn: 'Child',   nationalId: '2-1111-22222-33-5', percentage: 30,  updatedDate: '2025-11-20', status: 'active' },
  { id: 'BEN-006', employeeId: 'EMP004', employeeName: 'นภาพร สุขสันต์',    beneficiaryName: 'ณัฐพงษ์ สุขสันต์', relationship: 'คู่สมรส',  relationshipEn: 'Spouse',  nationalId: '3-4567-89012-34-5', percentage: 100, updatedDate: '2026-03-10', status: 'active' },
  { id: 'BEN-007', employeeId: 'EMP005', employeeName: 'อาทิตย์ วิจิตร',    beneficiaryName: 'สุมาลี วิจิตร',    relationship: 'มารดา',    relationshipEn: 'Mother',  nationalId: '4-5678-90123-45-6', percentage: 100, updatedDate: '2026-01-28', status: 'active' },
  { id: 'BEN-008', employeeId: 'EMP006', employeeName: 'กมลา ประสิทธิ์',    beneficiaryName: 'ภาณุวัฒน์ ประสิทธิ์', relationship: 'คู่สมรส', relationshipEn: 'Spouse', nationalId: '5-6789-01234-56-7', percentage: 60,  updatedDate: '2025-12-05', status: 'active' },
  { id: 'BEN-009', employeeId: 'EMP006', employeeName: 'กมลา ประสิทธิ์',    beneficiaryName: 'สิริยา ประสิทธิ์',  relationship: 'บุตร',     relationshipEn: 'Child',   nationalId: '5-6789-01234-56-8', percentage: 40,  updatedDate: '2025-12-05', status: 'active' },
  { id: 'BEN-010', employeeId: 'EMP007', employeeName: 'พิชิต เจริญรุ่ง',   beneficiaryName: 'มานิตา เจริญรุ่ง',  relationship: 'คู่สมรส',  relationshipEn: 'Spouse',  nationalId: '6-7890-12345-67-8', percentage: 100, updatedDate: '2026-04-02', status: 'active' },
  { id: 'BEN-011', employeeId: 'EMP008', employeeName: 'รัตนา ศิริโชค',     beneficiaryName: 'ชัยวัฒน์ ศิริโชค',  relationship: 'บิดา',     relationshipEn: 'Father',  nationalId: '7-8901-23456-78-9', percentage: 100, updatedDate: '2026-02-18', status: 'inactive' },
  { id: 'BEN-012', employeeId: 'EMP009', employeeName: 'ประสิทธิ์ แสงทอง', beneficiaryName: 'พรพิมล แสงทอง',   relationship: 'คู่สมรส',  relationshipEn: 'Spouse',  nationalId: '8-9012-34567-89-0', percentage: 100, updatedDate: '2026-03-25', status: 'active' },
];

const BEN_PLAN = getPlan('BE-BEN-001')!;

export default function AdminBeneficiariesPage() {
  const locale = useLocale();
  const routeParams = useParams<{ locale: string }>();
  const loc = routeParams?.locale ?? locale ?? 'th';
  const isTh = loc !== 'en';

  const [rows] = useState<BeneficiaryRow[]>(MOCK_BENEFICIARIES);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<BeneficiaryRow | null>(null);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.employeeId.toLowerCase().includes(q) ||
      r.employeeName.toLowerCase().includes(q) ||
      r.beneficiaryName.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setEditRow(null);
    setModalOpen(true);
  };

  const openEdit = (row: BeneficiaryRow) => {
    setEditRow(row);
    setModalOpen(true);
  };

  const activeCount  = rows.filter((r) => r.status === 'active').length;
  const empCount     = new Set(rows.map((r) => r.employeeId)).size;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardEyebrow>
            {isTh ? 'สวัสดิการ · บันทึกโดย HR' : 'Benefits admin · HR records'}
          </CardEyebrow>
          <h1 className="font-display text-[28px] font-semibold text-ink">
            {isTh ? 'ผู้รับผลประโยชน์' : 'Beneficiaries'}
          </h1>
          <p className="mt-2 text-small text-ink-muted">
            {isTh
              ? 'รายชื่อผู้รับผลประโยชน์จากกรมธรรม์ประกันชีวิตและสวัสดิการของพนักงาน'
              : 'Life insurance and benefit policy beneficiaries for all employees.'}
          </p>
        </div>
        <Capability
          action="edit"
          fallback={
            <Button variant="primary" disabled>
              {isTh ? '+ เพิ่มผู้รับผลประโยชน์' : '+ Add Beneficiary'}
            </Button>
          }
        >
          <Button variant="primary" onClick={openAdd}>
            {isTh ? '+ เพิ่มผู้รับผลประโยชน์' : '+ Add Beneficiary'}
          </Button>
        </Capability>
      </header>

      {/* Summary strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card variant="raised" size="md">
          <CardEyebrow>{isTh ? 'รายการทั้งหมด' : 'Total records'}</CardEyebrow>
          <p className="mt-1 font-display text-[24px] font-semibold text-ink tabular-nums">{rows.length}</p>
        </Card>
        <Card variant="raised" size="md">
          <CardEyebrow>{isTh ? 'ใช้งานอยู่' : 'Active'}</CardEyebrow>
          <p className="mt-1 font-display text-[24px] font-semibold text-ink tabular-nums">{activeCount}</p>
        </Card>
        <Card variant="raised" size="md">
          <CardEyebrow>{isTh ? 'จำนวนพนักงาน' : 'Employees covered'}</CardEyebrow>
          <p className="mt-1 font-display text-[24px] font-semibold text-ink tabular-nums">{empCount}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isTh ? 'ค้นหา รหัสพนักงาน / ชื่อ…' : 'Search employee ID / name…'}
          className="h-10 w-full max-w-sm rounded-[var(--radius-md)] border border-hairline bg-surface px-3 text-small text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas"
        />
        {search && (
          <span className="text-small text-ink-muted">
            {filtered.length} {isTh ? 'รายการ' : 'results'}
          </span>
        )}
      </div>

      {/* Table */}
      <Card variant="raised" size="lg" className="overflow-x-auto">
        <table className="min-w-full text-left text-small">
          <thead>
            <tr className="border-b border-hairline">
              {[
                isTh ? 'รหัส' : 'ID',
                isTh ? 'รหัสพนักงาน' : 'Emp ID',
                isTh ? 'ชื่อพนักงาน' : 'Employee',
                isTh ? 'ชื่อผู้รับผลประโยชน์' : 'Beneficiary',
                isTh ? 'ความสัมพันธ์' : 'Relationship',
                isTh ? 'เลขบัตรประชาชน' : 'National ID',
                isTh ? 'สัดส่วน %' : 'Share %',
                isTh ? 'อัปเดตล่าสุด' : 'Updated',
                isTh ? 'สถานะ' : 'Status',
                '',
              ].map((h, i) => (
                <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold text-ink-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-canvas-soft transition-colors">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-muted">{row.id}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{row.employeeId}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink">{row.employeeName}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">{row.beneficiaryName}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-soft">
                  {isTh ? row.relationship : row.relationshipEn}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-soft">{row.nationalId}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink">{row.percentage}%</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{row.updatedDate}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span
                    className={[
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.12em]',
                      row.status === 'active'
                        ? 'bg-success-soft text-success'
                        : 'bg-canvas-soft text-ink-muted',
                    ].join(' ')}
                  >
                    {row.status === 'active'
                      ? (isTh ? 'ใช้งาน' : 'Active')
                      : (isTh ? 'ยกเลิก' : 'Inactive')}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <Capability
                    action="edit"
                    fallback={
                      <button disabled className="text-small font-medium text-ink-faint cursor-not-allowed">
                        {isTh ? 'แก้ไข' : 'Edit'}
                      </button>
                    }
                  >
                    <button
                      onClick={() => openEdit(row)}
                      className="text-small font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
                    >
                      {isTh ? 'แก้ไข' : 'Edit'}
                    </button>
                  </Capability>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-small text-ink-muted">
                  {isTh ? 'ไม่พบรายการ' : 'No records found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editRow
            ? (isTh ? `แก้ไขผู้รับผลประโยชน์ — ${editRow.beneficiaryName}` : `Edit Beneficiary — ${editRow.beneficiaryName}`)
            : (isTh ? 'เพิ่มผู้รับผลประโยชน์' : 'Add Beneficiary')
        }
        widthClass="max-w-2xl"
      >
        <RecordsFlatForm
          plan={BEN_PLAN}
          defaultEmployeeId={editRow?.employeeId}
          onSubmitted={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
