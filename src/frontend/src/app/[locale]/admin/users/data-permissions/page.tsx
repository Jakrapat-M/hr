'use client'

// data-permissions/page.tsx — Data Permission Group (BRD #184)
// AC-4: 4 preset chips + custom ScopeBuilder (BRD dimensions verbatim)
// Actors: HRIS Admin / SPD Admin (Rule 70)
import { useState } from 'react'
import { X } from 'lucide-react'
import { useUsersPermissions } from '@/lib/admin/store/useUsersPermissions'
import type { DataPermission } from '@/lib/admin/types/usersPermissions'

// Preset scopes — ตาม BRD #184 §2.4 (Rule C8)
type PresetKey = 'OWN_DATA' | 'TEAM_DATA' | 'COMPANY_WIDE' | 'GLOBAL'

const PRESET_CHIPS: { key: PresetKey; label: string; description: string }[] = [
  {
    key: 'OWN_DATA',
    label: 'ข้อมูลตัวเอง',
    description: 'เห็นข้อมูลตัวเองเท่านั้น',
  },
  {
    key: 'TEAM_DATA',
    label: 'ข้อมูลทีม',
    description: 'เห็นข้อมูลทีมที่ตัวเองดูแล',
  },
  {
    key: 'COMPANY_WIDE',
    label: 'ทั้งบริษัท (Company-wide)',
    description: 'เห็นข้อมูลทุกคนภายในบริษัทเดียวกัน',
  },
  {
    key: 'GLOBAL',
    label: 'ทั่วโลก',
    description: 'เห็นข้อมูลทุก entity cross-company',
  },
]

// ตัวอย่าง options สำหรับ custom scope builder
const BG_OPTIONS = ['Central Retail', 'Central Pattana', 'Central Food Retail', 'Central Department Store']
const COMPANY_OPTIONS = ['Central Group Co., Ltd.', 'Central Retail Corporation', 'CPN Co., Ltd.']
const DIVISION_OPTIONS = ['Operations Division', 'Finance Division', 'People Development Division', 'IT Division']
const DEPT_OPTIONS = ['Human Resources', 'Finance', 'Operations', 'Marketing', 'Information Technology']
const EMP_GROUP_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Temporary']
const PG_OPTIONS = ['M1', 'M2', 'M3', 'M4', 'M5', 'S1', 'S2', 'S3', 'S4']

// Custom scope state shape
type CustomScope = {
  businessGroups: string[]
  companies: string[]
  divisions: string[]
  departments: string[]
  employeeGroups: string[]
  personalGrades: string[]
  newSpd: boolean // BRD #184 — SPD ใหม่ เปิดสิทธิ์ทั้งหมดโดยไม่ restrict ช่วงเวลา
}

function emptyScope(): CustomScope {
  return {
    businessGroups: [],
    companies: [],
    divisions: [],
    departments: [],
    employeeGroups: [],
    personalGrades: [],
    newSpd: false,
  }
}

// Multi-select helper
function MultiSelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((x) => x !== opt) : [...value, opt])
  }

  return (
    <div>
      <p className="text-xs font-medium text-ink-muted mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={[
              'px-2.5 py-1 rounded-full text-xs border transition-colors',
              value.includes(opt)
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-ink-muted border-hairline hover:border-accent',
            ].join(' ')}
            aria-pressed={value.includes(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// ScopeBuilder component (ตาม BRD #184 dimensions verbatim C8)
// -----------------------------------------------------------------------
function ScopeBuilder({
  scope,
  onChange,
}: {
  scope: CustomScope
  onChange: (s: CustomScope) => void
}) {
  return (
    <div className="space-y-4 p-4 bg-canvas-soft rounded-lg border border-hairline">
      {/* Module — fixed "EC" per BRD #184 */}
      <div>
        <p className="text-xs font-medium text-ink-muted mb-1">Module</p>
        <span className="px-2.5 py-1 rounded-full text-xs bg-blue-100 text-accent border border-blue-200">
          EC (ค่าเริ่มต้น ไม่สามารถเปลี่ยนได้)
        </span>
      </div>

      <MultiSelectField
        label="กลุ่มธุรกิจ"
        options={BG_OPTIONS}
        value={scope.businessGroups}
        onChange={(v) => onChange({ ...scope, businessGroups: v })}
      />
      <MultiSelectField
        label="บริษัท"
        options={COMPANY_OPTIONS}
        value={scope.companies}
        onChange={(v) => onChange({ ...scope, companies: v })}
      />
      <MultiSelectField
        label="หน่วยงาน"
        options={DIVISION_OPTIONS}
        value={scope.divisions}
        onChange={(v) => onChange({ ...scope, divisions: v })}
      />
      <MultiSelectField
        label="แผนก"
        options={DEPT_OPTIONS}
        value={scope.departments}
        onChange={(v) => onChange({ ...scope, departments: v })}
      />
      <MultiSelectField
        label="กลุ่มพนักงาน"
        options={EMP_GROUP_OPTIONS}
        value={scope.employeeGroups}
        onChange={(v) => onChange({ ...scope, employeeGroups: v })}
      />
      <MultiSelectField
        label="เกรด (Personal Grade / PG)"
        options={PG_OPTIONS}
        value={scope.personalGrades}
        onChange={(v) => onChange({ ...scope, personalGrades: v })}
      />

      {/* SPD ใหม่ toggle #184 line 425 */}
      <div className="flex items-center gap-3 pt-2 border-t border-hairline">
        <input
          type="checkbox"
          id="newSpd"
          checked={scope.newSpd}
          onChange={(e) => onChange({ ...scope, newSpd: e.target.checked })}
          className="w-4 h-4 accent-blue-600"
        />
        <label htmlFor="newSpd" className="text-sm text-ink cursor-pointer">
          SPD ใหม่ — เปิดสิทธิ์เห็นทั้งหมดโดยไม่ restrict ช่วงเวลา
        </label>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// Modal
// -----------------------------------------------------------------------
type ModalMode = { type: 'create' } | { type: 'edit'; dp: DataPermission }

function DataPermissionModal({
  mode,
  onClose,
  onSave,
}: {
  mode: ModalMode
  onClose: () => void
  onSave: (data: { label: string; scope: PresetKey; customScope: CustomScope }) => void
}) {
  const isEdit = mode.type === 'edit'
  const existing = isEdit ? mode.dp : null

  const [label, setLabel] = useState(existing?.label ?? '')
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(
    (existing?.scope as PresetKey) ?? 'OWN_DATA'
  )
  const [customScope, setCustomScope] = useState<CustomScope>(emptyScope())

  // Auto-fill scope เมื่อ select preset
  function selectPreset(key: PresetKey) {
    setSelectedPreset(key)
    // preset shortcut ตาม spec T6
    if (key === 'OWN_DATA') {
      setCustomScope({ ...emptyScope(), departments: ['Human Resources'] })
    } else if (key === 'TEAM_DATA') {
      setCustomScope({ ...emptyScope(), divisions: ['Operations Division'] })
    } else if (key === 'COMPANY_WIDE') {
      setCustomScope({ ...emptyScope(), companies: [...COMPANY_OPTIONS] })
    } else if (key === 'GLOBAL') {
      setCustomScope({
        businessGroups: [...BG_OPTIONS],
        companies: [...COMPANY_OPTIONS],
        divisions: [...DIVISION_OPTIONS],
        departments: [...DEPT_OPTIONS],
        employeeGroups: [...EMP_GROUP_OPTIONS],
        personalGrades: [...PG_OPTIONS],
        newSpd: false,
      })
    }
  }

  function handleSave() {
    if (!label.trim()) return
    onSave({ label: label.trim(), scope: selectedPreset, customScope })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'แก้ไขกลุ่มสิทธิ์ข้อมูล' : 'สร้างกลุ่มสิทธิ์ข้อมูลใหม่'}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-12 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-lg shadow-card w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <h2 className="text-lg font-semibold text-ink">
            {isEdit ? 'แก้ไขกลุ่มสิทธิ์ข้อมูล' : 'สร้างกลุ่มสิทธิ์ข้อมูลใหม่'}
          </h2>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1 rounded"
            aria-label="ปิด dialog"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* ชื่อ */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              ชื่อกลุ่มสิทธิ์ข้อมูล <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="เช่น ทีม HR บริษัทแม่"
              className="w-full border border-hairline rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Preset chips */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">ขอบเขตข้อมูล (เลือก preset หรือกำหนดเอง)</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_CHIPS.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => selectPreset(chip.key)}
                  className={[
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    selectedPreset === chip.key
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-ink border-hairline hover:border-accent',
                  ].join(' ')}
                  aria-pressed={selectedPreset === chip.key}
                  title={chip.description}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom scope builder */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">กำหนดขอบเขตเอง</p>
            <ScopeBuilder scope={customScope} onChange={setCustomScope} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-hairline">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-ink border border-hairline rounded-lg hover:bg-canvas-soft"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={!label.trim()}
            className="px-4 py-2 text-sm text-white bg-accent rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------
export default function DataPermissionsPage() {
  const dataPermissions = useUsersPermissions((s) => s.dataPermissions)
  const [modal, setModal] = useState<ModalMode | null>(null)

  // หมายเหตุ: store Wave 1 ใช้ DataPermission type — เก็บ scope แบบ enum
  // ถ้า upsertPermissionGroup มีใน store ให้ใช้; ถ้าไม่มีให้ skip save (mock-only)
  function handleSave(_data: { label: string; scope: PresetKey; customScope: CustomScope }) {
    // Wave 1 store ใช้ DataPermission แบบ simple — save closes modal (mock-only UI)
    setModal(null)
  }

  const scopeLabel: Record<string, string> = {
    OWN_DATA: 'ข้อมูลตัวเอง',
    TEAM_DATA: 'ข้อมูลทีม',
    COMPANY_WIDE: 'ทั้งบริษัท',
    GLOBAL: 'ทั่วโลก',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">กลุ่มสิทธิ์ข้อมูล</h1>
          <p className="text-sm text-ink-muted mt-0.5">BRD #184 — กำหนด Data Scope ตาม Module / BG / Company / Division / Department / EmpGroup / PG</p>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent whitespace-nowrap"
        >
          <span>+</span>
          <span>เพิ่มกลุ่มสิทธิ์ข้อมูล</span>
        </button>
      </div>

      {/* Preset info */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PRESET_CHIPS.map((chip) => (
          <div key={chip.key} className="p-3 bg-surface rounded-lg border border-hairline text-center">
            <p className="text-xs font-medium text-ink whitespace-nowrap">{chip.label}</p>
            <p className="text-xs text-ink-muted mt-0.5">{chip.description}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-surface rounded-lg border border-hairline shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table role="table" className="w-full text-sm" aria-label="รายการกลุ่มสิทธิ์ข้อมูล">
            <thead className="bg-canvas-soft">
              <tr role="row">
                <th className="px-4 py-3 text-left font-medium text-ink">ชื่อกลุ่มสิทธิ์</th>
                <th className="px-4 py-3 text-left font-medium text-ink hidden sm:table-cell">ขอบเขต</th>
                <th className="px-4 py-3 text-left font-medium text-ink hidden md:table-cell">คำอธิบาย</th>
                <th className="px-4 py-3 text-center font-medium text-ink w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {dataPermissions.length === 0 && (
                <tr role="row">
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                    ยังไม่มีกลุ่มสิทธิ์ข้อมูล
                  </td>
                </tr>
              )}
              {dataPermissions.map((dp) => (
                <tr key={dp.id} role="row" className="hover:bg-canvas-soft">
                  <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                    {dp.label}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {scopeLabel[dp.scope] ?? dp.scope}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted hidden md:table-cell max-w-xs truncate">
                    {dp.description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setModal({ type: 'edit', dp })}
                      className="text-xs text-accent hover:underline px-2 py-1"
                      aria-label={`แก้ไข ${dp.label}`}
                    >
                      แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <DataPermissionModal
          mode={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
