'use client'

// EmployeePersonalSections.tsx — STA-181 admin VIEW-page field parity.
//
// Renders the ~12 PERSONAL sections the employee sees on /profile/me as
// READ-ONLY display cards on /admin/employees/[id], so an HR/SPD viewer sees the
// same personal fields. FIX M1: these are read-only DISPLAY fields (the
// ReadOnlyField / inline-display pattern the employee sees when NOT editing) —
// NOT the edit-only `…Editor` components. FIX M2: data comes from the seeded
// by-id resolver, never the live single-user profile store.
//
// RBAC (STA-181 default): SPD / HR Admin / HR Manager see everything. Sensitive
// surfaces — Bank details, national ID, and the Assessment / Performance section
// — are REMOVED (not disabled) for lower roles (e.g. Manager). "Remove, not hide."

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Heart, Landmark, Users, MapPin, Droplet, Briefcase, Award, ClipboardList, Layers, Star, FileText } from 'lucide-react'
import { CollapsibleSectionCard } from '@/components/admin/wizard/CollapsibleSectionCard'
import { hasAnyRole, type Role } from '@/lib/rbac'
import { maskValue } from '@/lib/date'
import { maskNationalId } from '@/lib/all-ported-employees'
import { getEmployeePersonalById, type PersonalHistoryRow } from '@/lib/admin/employee-personal-resolver'

const DEP_RELATION_LABEL: Record<string, { th: string; en: string }> = {
  spouse: { th: 'คู่สมรส', en: 'Spouse' },
  child: { th: 'บุตร', en: 'Child' },
  father: { th: 'บิดา', en: 'Father' },
  mother: { th: 'มารดา', en: 'Mother' },
  other: { th: 'อื่นๆ', en: 'Other' },
}

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="cnext-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div className="text-body text-ink">{value && value.length > 0 ? value : '—'}</div>
    </div>
  )
}

/** Read-only list section reused by the P2 career/history cards. */
function HistoryList({ rows, isTh }: { rows: PersonalHistoryRow[]; isTh: boolean }) {
  if (rows.length === 0) {
    return <div className="text-body text-ink-muted">{isTh ? 'ไม่มีข้อมูล' : 'No records'}</div>
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <div key={row.id} className="cnext-card cnext-card--tight" style={{ background: 'var(--color-canvas-soft)' }}>
          <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{row.primary}</div>
          <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginTop: 2 }}>
            {[row.secondary, row.meta].filter(Boolean).join(' · ')}
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmployeePersonalSectionsProps {
  employeeId: string
  isTh: boolean
  roles: Role[]
}

export function EmployeePersonalSections({ employeeId, isTh, roles }: EmployeePersonalSectionsProps) {
  const p = getEmployeePersonalById(employeeId)

  // RBAC: SPD / HR Admin / HR Manager see the sensitive surfaces; lower roles
  // (Manager) do not (section removed, not disabled).
  const canSeeSensitive = hasAnyRole(roles, ['spd', 'hr_admin', 'hr_manager'])

  const expandLabel = isTh ? 'ขยาย' : 'Expand'
  const collapseLabel = isTh ? 'ย่อ' : 'Collapse'

  // Every parity section starts collapsed (matches the admin page convention).
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setOpen((s) => ({ ...s, [id]: !s[id] }))

  const section = (
    id: string,
    icon: LucideIcon,
    eyebrow: string,
    title: string,
    children: React.ReactNode,
  ) => (
    <CollapsibleSectionCard
      id={id}
      icon={icon}
      eyebrow={eyebrow}
      title={title}
      sub=""
      collapsed={open[id] !== true}
      onToggle={() => toggle(id)}
      expandLabel={expandLabel}
      collapseLabel={collapseLabel}
      dense
    >
      {children}
    </CollapsibleSectionCard>
  )

  return (
    <>
      {/* ── P1 · Marital ─────────────────────────────────────────────── */}
      {section(
        'emp-marital',
        Heart,
        isTh ? 'ข้อมูลส่วนบุคคล' : 'Personal',
        isTh ? 'สถานภาพสมรส' : 'Marital status',
        <div className="grid gap-3 md:grid-cols-2">
          <ReadOnlyField label={isTh ? 'สถานภาพ' : 'Status'} value={p.maritalStatus} />
          <ReadOnlyField label={isTh ? 'มีผลตั้งแต่' : 'Since'} value={p.maritalStatusSince} />
          {p.maritalStatus === 'สมรส' && (
            <ReadOnlyField label={isTh ? 'ชื่อคู่สมรส' : 'Spouse name'} value={p.spouseName} />
          )}
        </div>,
      )}

      {/* ── P1 · Bank details (SENSITIVE — SPD/HR only) ──────────────── */}
      {canSeeSensitive &&
        section(
          'emp-bank',
          Landmark,
          isTh ? 'ข้อมูลส่วนบุคคล' : 'Personal',
          isTh ? 'บัญชีธนาคาร' : 'Bank details',
          <div className="grid gap-3 md:grid-cols-2">
            <ReadOnlyField label={isTh ? 'ธนาคาร' : 'Bank'} value={p.bank.bankCode} />
            <ReadOnlyField
              label={isTh ? 'เลขที่บัญชี' : 'Account number'}
              value={p.bank.accountNo ? maskValue(p.bank.accountNo, 4) : ''}
            />
            <ReadOnlyField label={isTh ? 'ชื่อบัญชี' : 'Account holder'} value={p.bank.holderName} />
          </div>,
        )}

      {/* ── P1 · Emergency contacts ──────────────────────────────────── */}
      {section(
        'emp-emergency',
        Users,
        isTh ? 'ข้อมูลส่วนบุคคล' : 'Personal',
        isTh ? 'ผู้ติดต่อฉุกเฉิน' : 'Emergency contacts',
        p.emergencyContacts.length === 0 ? (
          <div className="text-body text-ink-muted">{isTh ? 'ไม่มีข้อมูล' : 'No records'}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {p.emergencyContacts.map((c) => (
              <div key={c.id} className="cnext-card cnext-card--tight" style={{ background: 'var(--color-canvas-soft)' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                  {c.name}
                  {c.primaryFlag && (
                    <span className="cnext-tag cnext-tag--teal" style={{ marginLeft: 8, fontSize: 11 }}>
                      {isTh ? 'หลัก' : 'Primary'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginTop: 2 }}>
                  {[c.relation, c.phones.join(', ')].filter(Boolean).join(' · ')}
                </div>
              </div>
            ))}
          </div>
        ),
      )}

      {/* ── P1 · Dependents ──────────────────────────────────────────── */}
      {section(
        'emp-dependents',
        Users,
        isTh ? 'ข้อมูลส่วนบุคคล' : 'Personal',
        isTh ? 'ผู้อุปการะ' : 'Dependents',
        p.dependents.length === 0 ? (
          <div className="text-body text-ink-muted">{isTh ? 'ไม่มีข้อมูล' : 'No records'}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {p.dependents.map((dep) => {
              const rel = DEP_RELATION_LABEL[dep.relation] ?? DEP_RELATION_LABEL.other
              return (
                <div key={dep.id} className="cnext-card cnext-card--tight" style={{ background: 'var(--color-canvas-soft)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                    {isTh ? dep.fullNameTh : dep.fullNameEn || dep.fullNameTh}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginTop: 2 }}>
                    {isTh ? rel.th : rel.en}
                    {dep.dateOfBirth ? ` · ${isTh ? 'เกิด' : 'DOB'} ${dep.dateOfBirth}` : ''}
                  </div>
                </div>
              )
            })}
          </div>
        ),
      )}

      {/* ── P1 · Full contact + structured address ───────────────────── */}
      {section(
        'emp-contact-address',
        MapPin,
        isTh ? 'ข้อมูลส่วนบุคคล' : 'Personal',
        isTh ? 'การติดต่อและที่อยู่' : 'Contact & address',
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="cnext-eyebrow" style={{ marginBottom: 4 }}>{isTh ? 'โทรศัพท์' : 'Phone'}</div>
            {p.phones.length === 0 ? (
              <div className="text-body text-ink">—</div>
            ) : (
              p.phones.map((ph, i) => (
                <div key={i} className="text-body text-ink">
                  {ph.primary && '★ '}
                  {ph.value}
                  {ph.label ? ` (${ph.label})` : ''}
                </div>
              ))
            )}
          </div>
          <div>
            <div className="cnext-eyebrow" style={{ marginBottom: 4 }}>{isTh ? 'อีเมล' : 'Email'}</div>
            {p.emails.length === 0 ? (
              <div className="text-body text-ink">—</div>
            ) : (
              p.emails.map((em, i) => (
                <div key={i} className="text-body text-ink">
                  {em.primary && '★ '}
                  {em.value}
                </div>
              ))
            )}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="cnext-eyebrow" style={{ marginBottom: 4 }}>{isTh ? 'ที่อยู่' : 'Address'}</div>
            <div className="text-body text-ink">
              {p.address && p.address.houseNo
                ? [
                    p.address.houseNo,
                    p.address.village,
                    p.address.soi,
                    p.address.road,
                    p.address.subdistrict,
                    p.address.district,
                    p.address.province,
                    p.address.postalCode,
                  ]
                    .filter(Boolean)
                    .join(' ')
                : '—'}
            </div>
          </div>
        </div>,
      )}

      {/* ── P1 · Advanced personal ───────────────────────────────────── */}
      {section(
        'emp-advanced',
        Droplet,
        isTh ? 'ข้อมูลส่วนบุคคล' : 'Personal',
        isTh ? 'ข้อมูลส่วนบุคคลเพิ่มเติม' : 'Advanced personal',
        <div className="grid gap-3 md:grid-cols-2">
          <ReadOnlyField label={isTh ? 'กรุ๊ปเลือด' : 'Blood type'} value={p.bloodType} />
          <ReadOnlyField label={isTh ? 'สถานะทางทหาร' : 'Military status'} value={p.militaryStatus} />
          <ReadOnlyField label={isTh ? 'ความพิการ' : 'Disability'} value={p.disability} />
          {canSeeSensitive && (
            <ReadOnlyField
              label={isTh ? 'เลขบัตรประชาชน' : 'National ID'}
              value={p.nationalId ? maskNationalId(p.nationalId) : ''}
            />
          )}
        </div>,
      )}

      {/* ── P2 · Work experience ─────────────────────────────────────── */}
      {section(
        'emp-work-experience',
        Briefcase,
        isTh ? 'ประวัติการทำงาน' : 'Career',
        isTh ? 'ประสบการณ์ทำงาน' : 'Work experience',
        <HistoryList rows={p.workExperience} isTh={isTh} />,
      )}

      {/* ── P2 · Certifications ──────────────────────────────────────── */}
      {section(
        'emp-certifications',
        Award,
        isTh ? 'ประวัติการทำงาน' : 'Career',
        isTh ? 'ใบรับรอง / ใบอนุญาต' : 'Certifications & licenses',
        <HistoryList rows={p.certifications} isTh={isTh} />,
      )}

      {/* ── P2 · Assessments / Performance (SENSITIVE — SPD/HR only) ─── */}
      {canSeeSensitive &&
        section(
          'emp-assessments',
          ClipboardList,
          isTh ? 'ประวัติการทำงาน' : 'Career',
          isTh ? 'การประเมิน / ศักยภาพเลื่อนตำแหน่ง' : 'Performance & promotability',
          <HistoryList rows={p.assessments} isTh={isTh} />,
        )}

      {/* ── P2 · Professional memberships ────────────────────────────── */}
      {section(
        'emp-memberships',
        Layers,
        isTh ? 'ประวัติการทำงาน' : 'Career',
        isTh ? 'สมาชิกภาพวิชาชีพ' : 'Professional memberships',
        <HistoryList rows={p.memberships} isTh={isTh} />,
      )}

      {/* ── P2 · Special projects ────────────────────────────────────── */}
      {section(
        'emp-projects',
        Star,
        isTh ? 'ประวัติการทำงาน' : 'Career',
        isTh ? 'โครงการพิเศษ' : 'Special projects',
        <HistoryList rows={p.projects} isTh={isTh} />,
      )}

      {/* ── P2 · Documents & e-letter ────────────────────────────────── */}
      {section(
        'emp-documents',
        FileText,
        isTh ? 'เอกสาร' : 'Documents',
        isTh ? 'เอกสารและหนังสือ' : 'Documents & e-letter',
        <HistoryList rows={p.documents} isTh={isTh} />,
      )}
    </>
  )
}
