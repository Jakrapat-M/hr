'use client'

// field-config/page.tsx — Field Configuration Editor (BRD #178)
// ตาราง field config + filter Form/Company + modal แก้ไข type/default
// Actor: HRIS Admin
import { useState } from 'react'
import { EditorShell } from '@/components/admin/admin-ss/EditorShell'
import { useAdminSelfService } from '@/lib/admin/store/useAdminSelfService'
import type { FieldConfigEntry, FormScope } from '@/lib/admin/types/adminSelfService'

const FORM_SCOPES: FormScope[] = ['Person', 'Employment', 'Job']
const FIELD_TYPES: FieldConfigEntry['fieldType'][] = ['text', 'date', 'select', 'number', 'checkbox']

export default function FieldConfigPage() {
  const fieldConfig    = useAdminSelfService((s) => s.draft.fieldConfig)
  const setFieldConfig = useAdminSelfService((s) => s.setFieldConfig)

  // filter state
  const [formFilter, setFormFilter] = useState<FormScope | 'ทั้งหมด'>('ทั้งหมด')

  // modal state
  const [editTarget, setEditTarget] = useState<FieldConfigEntry | null>(null)
  const [modalType,  setModalType]  = useState<FieldConfigEntry['fieldType']>('text')
  const [modalDefault, setModalDefault] = useState<string>('')

  // กรอง field ตาม form
  const filtered = formFilter === 'ทั้งหมด'
    ? fieldConfig
    : fieldConfig.filter((f) => f.scope === formFilter)

  // เปิด modal แก้ไข
  function openEdit(entry: FieldConfigEntry) {
    setEditTarget(entry)
    setModalType(entry.fieldType)
    setModalDefault(entry.defaultValue ?? '')
  }

  // บันทึก modal → update draft
  function saveModal() {
    if (!editTarget) return
    const updated = fieldConfig.map((f) =>
      f.id === editTarget.id
        ? { ...f, fieldType: modalType, defaultValue: modalDefault || null }
        : f
    )
    setFieldConfig(updated)
    setEditTarget(null)
  }

  return (
    <EditorShell editor="field-config" titleTh="จัดการ Field Configuration">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm font-medium text-ink whitespace-nowrap">Form:</label>
        <div className="flex gap-2">
          {(['ทั้งหมด', ...FORM_SCOPES] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => setFormFilter(scope as FormScope | 'ทั้งหมด')}
              className={[
                'px-3 py-1.5 text-sm rounded-md border transition-colors',
                formFilter === scope
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface text-ink-muted border-hairline hover:border-accent',
              ].join(' ')}
            >
              {scope}
            </button>
          ))}
        </div>
      </div>

      {/* DataTable */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-ink-muted">ไม่พบ field ในกลุ่มนี้</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline">
          <table className="min-w-full text-sm">
            <thead className="bg-canvas-soft border-b border-hairline">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-ink-muted whitespace-nowrap">Field ID</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted whitespace-nowrap">ชื่อ Field</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted whitespace-nowrap">Form</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted whitespace-nowrap">ประเภท Field</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted whitespace-nowrap">ค่าเริ่มต้น</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted whitespace-nowrap">System</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline bg-surface">
              {filtered.map((field) => (
                <tr key={field.id} className="hover:bg-canvas-soft">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-canvas-soft rounded px-1.5 py-0.5 text-ink-muted">{field.id}</code>
                  </td>
                  <td className="px-4 py-3 text-ink whitespace-nowrap">{field.label}</td>
                  <td className="px-4 py-3 text-ink-muted">{field.scope}</td>
                  <td className="px-4 py-3 text-ink-muted">{field.fieldType}</td>
                  <td className="px-4 py-3 text-ink-muted text-xs">{field.defaultValue ?? '—'}</td>
                  <td className="px-4 py-3">
                    {field.isSystem ? (
                      <span className="text-xs bg-accent-soft text-accent px-2 py-0.5 rounded-full">System</span>
                    ) : (
                      <span className="text-xs text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openEdit(field)}
                      disabled={field.isSystem}
                      className="text-sm text-accent hover:underline disabled:text-ink-muted disabled:no-underline disabled:cursor-not-allowed"
                    >
                      แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`แก้ไข field ${editTarget.label}`}
        >
          <div className="bg-surface rounded-lg shadow-card w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-ink mb-4">
              แก้ไข Field: <span className="text-accent">{editTarget.label}</span>
            </h2>

            {/* ประเภท field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-ink mb-1.5">ประเภท Field</label>
              <select
                value={modalType}
                onChange={(e) => setModalType(e.target.value as FieldConfigEntry['fieldType'])}
                className="w-full rounded-md border border-hairline px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* ค่าเริ่มต้น */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-ink mb-1.5">ค่าเริ่มต้น</label>
              <input
                type="text"
                value={modalDefault}
                onChange={(e) => setModalDefault(e.target.value)}
                placeholder="ไม่ระบุ = ไม่มีค่าเริ่มต้น"
                className="w-full rounded-md border border-hairline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 text-sm rounded-md border border-hairline text-ink hover:bg-canvas-soft"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={saveModal}
                className="px-4 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </EditorShell>
  )
}
