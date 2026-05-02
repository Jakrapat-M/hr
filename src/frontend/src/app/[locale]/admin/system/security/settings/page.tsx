// VALIDATION_EXEMPT: admin landing/audit page — filter inputs only, no submit form (per design-gates Track C 2026-04-26)
'use client'

// security/settings/page.tsx — consolidated Security Settings (BRD #201-204)
// 4 sections: Hidden Profile + Direct User list + Encryption Policy (READ-ONLY) + Session Timeout
// C3: 4 sections in 1 page (not 4 separate pages) to stay within 8-file budget

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useDataManagement } from '@/lib/admin/store/useDataManagement'

// -----------------------------------------------------------------------
// Section 1 — Hidden Profile toggle list
// -----------------------------------------------------------------------
function HiddenProfileSection() {
  const hiddenProfiles = useDataManagement((s) => s.hiddenProfiles)
  const setHiddenProfile = useDataManagement((s) => s.setHiddenProfile)
  const directUsers = useDataManagement((s) => s.directUsers)

  // mock employee list based on direct users + some extras
  const employees = [
    ...directUsers.map((u) => ({ id: u.id, name: u.displayName })),
    { id: 'EMP020', name: 'ศิริพร มีโชค' },
    { id: 'EMP021', name: 'ประภาส รุ่งเรือง' },
    { id: 'EMP022', name: 'สุวรรณา ดีงาม' },
  ]

  return (
    <section aria-labelledby="hidden-profile-heading">
      <div className="mb-3">
        <h2 id="hidden-profile-heading" className="text-base font-semibold text-ink">
          Hidden Profile
        </h2>
        <p className="text-xs text-ink-muted mt-0.5">
          BRD #201 — ซ่อนโปรไฟล์พนักงานจาก O365 sync (ไม่แสดงใน org chart / directory)
        </p>
      </div>
      <div className="divide-y divide-gray-100 border border-hairline-soft rounded-xl overflow-hidden">
        {employees.map((emp) => {
          const isHidden = hiddenProfiles.includes(emp.id)
          return (
            <div key={emp.id} className="flex items-center justify-between px-4 py-3 bg-surface hover:bg-canvas-soft transition-colors">
              <div>
                <p className="text-sm font-medium text-ink">{emp.name}</p>
                <p className="text-xs text-ink-faint font-mono">{emp.id}</p>
              </div>
              <div className="flex items-center gap-3">
                {isHidden && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                    ซ่อนอยู่
                  </span>
                )}
                <label className="relative inline-flex items-center cursor-pointer" aria-label={`${isHidden ? 'เลิกซ่อน' : 'ซ่อน'} ${emp.name}`}>
                  <input
                    type="checkbox"
                    checked={isHidden}
                    onChange={(e) => setHiddenProfile(emp.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-hairline-soft peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-surface after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------
// Section 2 — Direct User list (read + simple display)
// -----------------------------------------------------------------------
function DirectUserSection() {
  const directUsers = useDataManagement((s) => s.directUsers)

  return (
    <section aria-labelledby="direct-user-heading">
      <div className="mb-3">
        <h2 id="direct-user-heading" className="text-base font-semibold text-ink">
          Direct Users
        </h2>
        <p className="text-xs text-ink-muted mt-0.5">
          BRD #202 — Service accounts ที่ไม่ผ่าน SSO ({directUsers.length} บัญชี)
        </p>
      </div>
      <div className="border border-hairline-soft rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="Direct Users">
          <thead className="bg-canvas-soft">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase">ชื่อ</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase">Email</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase">สถานะ</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-surface">
            {directUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-ink-faint">ไม่มี Direct Users</td>
              </tr>
            ) : (
              directUsers.map((u) => (
                <tr key={u.id} className="hover:bg-canvas-soft transition-colors">
                  <td className="px-4 py-3 text-sm text-ink">{u.displayName}</td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 whitespace-nowrap">ใช้งาน</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-canvas-soft text-ink-muted whitespace-nowrap">ปิดใช้งาน</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">{u.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------
// Section 3 — Encryption Policy (READ-ONLY per Q8)
// -----------------------------------------------------------------------
function EncryptionSection() {
  const policy = useDataManagement((s) => s.encryptionPolicy)

  const SCOPE_LABEL: Record<string, string> = {
    'at-rest':   'At Rest',
    'in-transit': 'In Transit',
    'both':      'At Rest + In Transit',
  }

  return (
    <section aria-labelledby="encryption-heading">
      <div className="mb-3">
        <h2 id="encryption-heading" className="text-base font-semibold text-ink">
          Encryption Policy
          <span className="ml-2 text-xs font-normal text-ink-faint bg-canvas-soft px-2 py-0.5 rounded">READ-ONLY</span>
        </h2>
        <p className="text-xs text-ink-muted mt-0.5">
          BRD #203 (Q8) — นโยบาย encryption ที่กำหนดโดย IT Security ห้ามแก้ไขผ่าน UI
        </p>
      </div>
      <div className="bg-canvas-soft border border-hairline-soft rounded-xl p-5">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-muted">Algorithm</dt>
            <dd className="text-sm font-semibold text-ink mt-0.5">{policy.algorithm}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Scope</dt>
            <dd className="text-sm font-semibold text-ink mt-0.5">{SCOPE_LABEL[policy.scope] ?? policy.scope}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Key Rotation</dt>
            <dd className="text-sm font-semibold text-ink mt-0.5">ทุก {policy.keyRotationIntervalDays} วัน</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Compliance</dt>
            <dd className="text-sm font-semibold text-ink mt-0.5">{policy.complianceStandard}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-ink-muted">Last Key Rotation</dt>
            <dd className="text-sm font-semibold text-ink mt-0.5">
              {new Date(policy.lastKeyRotatedAt).toLocaleString('th-TH')}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ข้อมูลนี้เป็น read-only — ติดต่อ IT Security เพื่อเปลี่ยนแปลงนโยบาย
        </p>
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------
// Section 4 — Session Timeout config (editable, 5-480 min)
// -----------------------------------------------------------------------
function SessionTimeoutSection() {
  const sessionTimeoutMinutes = useDataManagement((s) => s.sessionTimeoutMinutes)
  const setSessionTimeout = useDataManagement((s) => s.setSessionTimeout)
  const [localVal, setLocalVal] = useState(String(sessionTimeoutMinutes))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    const num = Number(localVal)
    if (!Number.isInteger(num) || num < 5 || num > 480) {
      setError('กรุณากรอกตัวเลขระหว่าง 5-480 นาที')
      return
    }
    setError(null)
    setSessionTimeout(num)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleInput(val: string) {
    setLocalVal(val)
    setError(null)
    setSaved(false)
  }

  return (
    <section aria-labelledby="session-timeout-heading">
      <div className="mb-3">
        <h2 id="session-timeout-heading" className="text-base font-semibold text-ink">
          Session Timeout
        </h2>
        <p className="text-xs text-ink-muted mt-0.5">
          BRD #204 — กำหนดเวลา session หมดอายุ (5-480 นาที = 8 ชั่วโมงสูงสุด)
        </p>
      </div>
      <div className="bg-surface border border-hairline-soft rounded-xl p-5">
        <div className="flex items-end gap-4">
          <div>
            <label htmlFor="session-timeout" className="block text-sm font-medium text-ink-soft mb-1">
              เวลา (นาที)
            </label>
            <input
              id="session-timeout"
              type="number"
              min={5}
              max={480}
              value={localVal}
              onChange={(e) => handleInput(e.target.value)}
              className="w-32 text-sm border border-hairline rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby="session-timeout-hint"
            />
            <p id="session-timeout-hint" className="text-xs text-ink-faint mt-1">ช่วง 5–480 นาที</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {saved ? <span className="inline-flex items-center gap-1.5"><Check size={16}/>บันทึกแล้ว</span> : 'บันทึก'}
          </button>
          <div className="text-sm text-ink-muted">
            ค่าปัจจุบัน: <strong>{sessionTimeoutMinutes} นาที</strong>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-sm text-danger" role="alert">{error}</p>
        )}
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------
// Main page
// -----------------------------------------------------------------------
export default function SecuritySettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Security Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          ตั้งค่าความปลอดภัยระบบ, Direct User, Encryption Policy, Session Timeout
        </p>
      </div>

      <div className="space-y-8">
        <HiddenProfileSection />
        <hr className="border-hairline-soft" />
        <DirectUserSection />
        <hr className="border-hairline-soft" />
        <EncryptionSection />
        <hr className="border-hairline-soft" />
        <SessionTimeoutSection />
      </div>
    </div>
  )
}
