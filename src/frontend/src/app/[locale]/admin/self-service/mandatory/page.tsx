'use client'

// mandatory/page.tsx — Field Mandatory Editor (BRD #180)
// same matrix pattern as visibility — Field × 4 Roles + right-panel preview
// AC-3 (pattern), AC-6, AC-7, AC-8, AC-9, AC-11
import { useState } from 'react'
import { EditorShell } from '@/components/admin/admin-ss/EditorShell'
import { useAdminSelfService } from '@/lib/admin/store/useAdminSelfService'
import type { FormScope, RoleName } from '@/lib/admin/types/adminSelfService'

const ROLES: RoleName[]         = ['Employee', 'Manager', 'HRBP', 'SPD']
const FORM_SCOPES: FormScope[]  = ['Person', 'Employment', 'Job']

// Toggle — reuse inline (ไม่แยก file เพราะ 8-file budget; pattern เหมือน visibility)
function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked:   boolean
  onChange:  (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!checked) }
      }}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1',
        checked ? 'bg-accent' : 'bg-surface-raised',
      ].join(' ')}
    >
      <span className={['pointer-events-none inline-block h-4 w-4 rounded-full bg-surface shadow-card ring-0 transition-transform duration-200', checked ? 'translate-x-4' : 'translate-x-0'].join(' ')} />
    </button>
  )
}

export default function MandatoryPage() {
  const fieldConfig  = useAdminSelfService((s) => s.draft.fieldConfig)
  const mandatory    = useAdminSelfService((s) => s.draft.mandatory)
  const setMandatory = useAdminSelfService((s) => s.setMandatory)

  const [formFilter,  setFormFilter]  = useState<FormScope>('Person')
  const [previewRole, setPreviewRole] = useState<RoleName>('Employee')

  const filteredFields = fieldConfig.filter((f) => f.scope === formFilter)

  function getValue(fieldId: string, role: RoleName): boolean {
    return mandatory[fieldId]?.[role] ?? false
  }

  return (
    <EditorShell editor="mandatory" titleTh="กำหนด Field Mandatory" brd="#180">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Matrix panel */}
        <div className="flex-1 min-w-0">
          {/* Form filter */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="text-sm font-medium text-ink whitespace-nowrap">Form:</label>
            <div className="flex gap-2">
              {FORM_SCOPES.map((scope) => (
                <button key={scope} type="button" onClick={() => setFormFilter(scope)}
                  className={['px-3 py-1.5 text-sm rounded-md border transition-colors', formFilter === scope ? 'bg-accent text-white border-accent' : 'bg-surface text-ink-muted border-hairline hover:border-accent'].join(' ')}>
                  {scope}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix table (sm+) */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-hairline">
            <table className="min-w-full text-sm">
              <thead className="bg-canvas-soft border-b border-hairline">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted">Field</th>
                  {ROLES.map((role) => (
                    <th key={role} className="px-4 py-3 text-center font-medium text-ink-muted whitespace-nowrap">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-surface">
                {filteredFields.map((field) => (
                  <tr key={field.id} className="hover:bg-canvas-soft">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink whitespace-nowrap">{field.label}</div>
                      <div className="text-xs text-ink-muted mt-0.5">{field.id}</div>
                    </td>
                    {ROLES.map((role) => (
                      <td key={role} className="px-4 py-3 text-center">
                        <Toggle
                          checked={getValue(field.id, role)}
                          onChange={(v) => setMandatory(field.id, role, v)}
                          ariaLabel={`mandatory-${field.id}-${role}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards mobile (AC-10) */}
          <div className="sm:hidden space-y-3">
            {filteredFields.map((field) => (
              <div key={field.id} className="rounded-lg border border-hairline bg-surface p-4">
                <div className="font-medium text-ink mb-3">{field.label}</div>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <div key={role} className="flex items-center justify-between gap-2 rounded-md bg-canvas-soft px-3 py-2">
                      <span className="text-sm text-ink-muted">{role}</span>
                      <Toggle checked={getValue(field.id, role)} onChange={(v) => setMandatory(field.id, role, v)} ariaLabel={`mandatory-${field.id}-${role}`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview panel (AC-9) */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-surface rounded-lg border border-hairline p-4 sticky top-4">
            <h3 className="text-sm font-medium text-ink mb-3">Preview as</h3>
            <select
              value={previewRole}
              onChange={(e) => setPreviewRole(e.target.value as RoleName)}
              className="w-full rounded-md border border-hairline px-3 py-1.5 text-sm bg-surface mb-4 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="space-y-2">
              {filteredFields.map((field) => {
                const required = getValue(field.id, previewRole)
                return (
                  <div key={field.id} className="rounded-md border border-hairline bg-canvas-soft px-3 py-2">
                    <div className="flex items-center gap-1 text-xs text-ink-muted">
                      {field.label}
                      {required && <span className="text-danger font-bold">*</span>}
                    </div>
                    <div className="text-sm text-ink-muted mt-0.5 italic">— ตัวอย่างข้อมูล —</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </EditorShell>
  )
}
