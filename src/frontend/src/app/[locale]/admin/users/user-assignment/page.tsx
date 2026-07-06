'use client'

// user-assignment/page.tsx — User Assignment (BRD #186)
// AC-5: UserTypeahead + multi-role chips + multi-permission chips
// Actor: HRIS Admin (Rule 70)
import { useState, useMemo, useEffect } from 'react'
import { Check } from 'lucide-react'
import { useUsersPermissions } from '@/lib/admin/store/useUsersPermissions'
import type { UserAssignment } from '@/lib/admin/types/usersPermissions'

// UserTypeahead — debounce 200ms, matches displayName / userId / email
function UserTypeahead({
  users,
  onSelect,
  placeholder = 'ค้นหาพนักงาน...',
}: {
  users: UserAssignment[]
  onSelect: (u: UserAssignment) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)

  // debounce 200ms ตาม AC-5
  useEffect(() => {
    if (!query) {
      setDebouncedQuery('')
      return
    }
    const t = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(t)
  }, [query])

  const filtered = useMemo(() => {
    if (debouncedQuery.length < 2) return []
    const q = debouncedQuery.toLowerCase()
    return users.filter(
      (u) =>
        u.fullNameTh.toLowerCase().includes(q) ||
        u.fullNameEn.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    )
  }, [debouncedQuery, users])

  function handleSelect(u: UserAssignment) {
    onSelect(u)
    setQuery('')
    setDebouncedQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full border border-hairline rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        aria-label="ค้นหาพนักงาน"
        aria-autocomplete="list"
        aria-expanded={open && filtered.length > 0}
      />
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          aria-label="ผลการค้นหาพนักงาน"
          className="absolute z-20 w-full mt-1 bg-surface border border-hairline rounded-lg shadow-card max-h-60 overflow-y-auto"
        >
          {filtered.map((u) => (
            <li
              key={u.userId}
              role="option"
              aria-selected="false"
              onMouseDown={() => handleSelect(u)}
              className="px-4 py-2.5 hover:bg-accent-soft cursor-pointer"
            >
              <p className="text-sm font-medium text-ink">{u.fullNameTh}</p>
              <p className="text-xs text-ink-muted">{u.userId} · {u.department} · {u.position}</p>
            </li>
          ))}
        </ul>
      )}
      {open && debouncedQuery.length >= 2 && filtered.length === 0 && (
        <div className="absolute z-20 w-full mt-1 bg-surface border border-hairline rounded-lg shadow-card px-4 py-3 text-sm text-ink-muted">
          ไม่พบพนักงานที่ตรงกับ "{debouncedQuery}"
        </div>
      )}
    </div>
  )
}

// Multi-chip selector
function ChipSelector({
  label,
  options,
  selected,
  onToggle,
  colorClass = 'bg-accent-soft text-accent',
}: {
  label: string
  options: { id: string; name: string }[]
  selected: string[]
  onToggle: (id: string) => void
  colorClass?: string
}) {
  return (
    <div>
      <p className="text-sm font-medium text-ink mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.id)
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              aria-pressed={isSelected}
              className={[
                'px-3 py-1.5 rounded-full text-xs border transition-colors',
                isSelected
                  ? `${colorClass} border-current`
                  : 'bg-surface text-ink-muted border-hairline hover:border-accent',
              ].join(' ')}
            >
              {opt.name}
              {isSelected && <Check size={14} className="ml-1" />}
            </button>
          )
        })}
        {options.length === 0 && (
          <span className="text-xs text-ink-muted">ไม่มีตัวเลือก</span>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------
export default function UserAssignmentPage() {
  const users = useUsersPermissions((s) => s.users)
  const roles = useUsersPermissions((s) => s.roles)
  const dataPermissions = useUsersPermissions((s) => s.dataPermissions)
  const assignUserRoles = useUsersPermissions((s) => s.assignUserRoles)

  const [selectedUser, setSelectedUser] = useState<UserAssignment | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [selectedDpId, setSelectedDpId] = useState<string>('')
  const [saved, setSaved] = useState(false)

  function handleSelectUser(u: UserAssignment) {
    setSelectedUser(u)
    setSelectedRoleIds(u.roleIds)
    setSelectedDpId(u.dataPermissionId)
    setSaved(false)
  }

  function toggleRole(id: string) {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setSaved(false)
  }

  function toggleDp(id: string) {
    setSelectedDpId((prev) => (prev === id ? '' : id))
    setSaved(false)
  }

  function handleSave() {
    if (!selectedUser) return
    if (selectedRoleIds.length === 0 && !selectedDpId) return
    try {
      assignUserRoles(selectedUser.userId, selectedRoleIds)
      setSaved(true)
    } catch (err) {
      console.warn('[UserAssignment] handleSave error:', err)
    }
  }

  const canSave = selectedRoleIds.length > 0 || !!selectedDpId

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">กำหนดสิทธิ์ผู้ใช้</h1>
        <p className="text-sm text-ink-muted mt-0.5">Assign ผู้ใช้ → กลุ่มสิทธิ์แอปพลิเคชัน + กลุ่มสิทธิ์ข้อมูล</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left — ค้นหาผู้ใช้ */}
        <div>
          <div className="bg-surface rounded-lg border border-hairline shadow-card p-5">
            <p className="text-sm font-medium text-ink mb-3">ค้นหาพนักงาน</p>
            <UserTypeahead users={users} onSelect={handleSelectUser} />
            <p className="text-xs text-ink-muted mt-2">พิมพ์อย่างน้อย 2 ตัวอักษร — ค้นหาจากชื่อ, รหัสพนักงาน, email</p>

            {/* รายชื่อพนักงานทั้งหมด */}
            <div className="mt-4">
              <p className="text-xs text-ink-muted mb-2">พนักงานทั้งหมด ({users.length} คน)</p>
              <ul className="divide-y divide-hairline max-h-64 overflow-y-auto rounded-lg border border-hairline">
                {users.map((u) => (
                  <li key={u.userId}>
                    <button
                      onClick={() => handleSelectUser(u)}
                      className={[
                        'w-full text-left px-3 py-2.5 hover:bg-accent-soft transition-colors',
                        selectedUser?.userId === u.userId ? 'bg-accent-soft border-l-2 border-accent' : '',
                      ].join(' ')}
                    >
                      <p className="text-sm font-medium text-ink">{u.fullNameTh}</p>
                      <p className="text-xs text-ink-muted">{u.userId} · {u.department}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right — assignment panel */}
        <div>
          {!selectedUser ? (
            <div className="bg-surface rounded-lg border border-hairline shadow-card p-8 flex flex-col items-center justify-center text-center h-full min-h-64">
              <p className="text-ink-muted text-sm">เลือกพนักงานทางซ้ายเพื่อกำหนดสิทธิ์</p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg border border-hairline shadow-card p-5 space-y-5">
              {/* User summary */}
              <div className="p-3 bg-accent-soft rounded-lg">
                <p className="font-semibold text-ink">{selectedUser.fullNameTh}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {selectedUser.userId} · {selectedUser.position}
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  แผนก: {selectedUser.department}
                </p>
                <p className={['text-xs mt-1', selectedUser.isActive ? 'text-green-600' : 'text-danger'].join(' ')}>
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>

              {/* Role chips */}
              <ChipSelector
                label="กลุ่มสิทธิ์แอปพลิเคชัน"
                options={roles.map((r) => ({ id: r.id, name: r.name }))}
                selected={selectedRoleIds}
                onToggle={toggleRole}
                colorClass="bg-purple-100 text-purple-700"
              />

              {/* Data permission chips */}
              <div>
                <p className="text-sm font-medium text-ink mb-2">กลุ่มสิทธิ์ข้อมูล</p>
                <div className="flex flex-wrap gap-2">
                  {dataPermissions.map((dp) => (
                    <button
                      key={dp.id}
                      type="button"
                      onClick={() => toggleDp(dp.id)}
                      aria-pressed={selectedDpId === dp.id}
                      className={[
                        'px-3 py-1.5 rounded-full text-xs border transition-colors',
                        selectedDpId === dp.id
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-surface text-ink-muted border-hairline hover:border-accent',
                      ].join(' ')}
                    >
                      {dp.label}
                      {selectedDpId === dp.id && <Check size={14} className="ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center justify-between pt-2 border-t border-hairline">
                {saved && (
                  <span className="text-xs text-green-600">บันทึกสำเร็จ</span>
                )}
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="ml-auto px-5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  บันทึก
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
