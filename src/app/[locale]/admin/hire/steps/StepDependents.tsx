'use client'

// StepDependents.tsx — Phase 5b-4: PerPersonRelationship SF entity
// Repeating section: relationship type + EN/Local names + personal details + NID + contact
// 26 BA fields per dependent (all optional except relationshipType + at least one name)
// Max 10 dependents per employee.
// SF dump: PerPersonRelationship composite key = (personIdExternal, relatedPersonIdExternal, startDate)
//          relationshipType = picklist code (Edm.String, sap_upsertable=true)
//          firstName/lastName = nav-persisted via relPersonalNav (sap_upsertable=false)

import { useEffect } from 'react'
import { useHireWizard, type DependentEntry } from '@/lib/admin/store/useHireWizard'
import { AttachmentDropzone, type AttachedFile } from '@/components/admin/AttachmentDropzone/AttachmentDropzone'
import {
  attachmentNameFromFiles,
  filesFromAttachmentName,
} from '@/components/admin/AttachmentDropzone/attachmentFiles'

// ── Array-safe setter ─────────────────────────────────────────────────────────
// setStepData(step, patch) does { ...formData[step], ...patch } which converts
// arrays to plain objects. dependents is a top-level array slice, so bypass
// setStepData and write directly to the store via setState (same pattern as emergencyContacts).
function useSetDependents() {
  return (next: DependentEntry[]) =>
    useHireWizard.setState((s) => ({
      formData: { ...s.formData, dependents: next },
      lastSavedAt: Date.now(),
    }))
}

// Relationship hints — datalist UX. SF stores a picklist code string.
// Common SF codes used in the CG QAS probe: 5107=Spouse, 5109=Daughter.
// UI shows human-readable hints; the value stored matches what the user types.
const RELATIONSHIP_HINTS = [
  'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Sibling', 'Other',
] as const

const EMPTY_DEP: DependentEntry = {
  relationshipType: '',
  salutationEn: null,
  firstNameEn: '',
  lastNameEn: '',
  salutationLocal: null,
  firstNameLocal: '',
  lastNameLocal: '',
  nationality: null,
  dateOfBirth: null,
  country: 'THA',
  nationalIdCardType: null,
  nationalIdCountry: null,
  nationalId: '',
  phone: '',
  email: '',
  isTaxDependent: false,
  copyAddressFromEmployee: false,
  addressLine1: '',
  building: '',
  floor: '',
  moo: '',
  soi: '',
  street: '',
  attachmentName: null,
}

interface StepDependentsProps {
  onValidChange?: (valid: boolean) => void
}

export default function StepDependents({ onValidChange }: StepDependentsProps) {
  const { formData, setStepValidity } = useHireWizard()
  const setDependents = useSetDependents()
  const entries: DependentEntry[] = formData.dependents ?? []

  // ── Validation effect ─────────────────────────────────────────────────────
  // Optional list (0 entries is valid); when entries present, each must have
  // relationshipType + at least one name (EN or Local)
  useEffect(() => {
    const valid =
      entries.length === 0 ||
      entries.every(
        (dep) =>
          dep.relationshipType.trim() !== '' &&
          (dep.firstNameEn.trim() !== '' || dep.firstNameLocal.trim() !== '')
      )
    setStepValidity('dependents', valid)
    onValidChange?.(valid)
  }, [entries, onValidChange, setStepValidity])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function addEntry() {
    if (entries.length >= 10) return
    setDependents([...entries, { ...EMPTY_DEP }])
  }

  function removeEntry(idx: number) {
    setDependents(entries.filter((_, i) => i !== idx))
  }

  function updateEntry(idx: number, patch: Partial<DependentEntry>) {
    setDependents(entries.map((dep, i) => (i === idx ? { ...dep, ...patch } : dep)))
  }

  function updateAttachment(idx: number, files: AttachedFile[]) {
    updateEntry(idx, { attachmentName: attachmentNameFromFiles(files) || null })
  }

  return (
    <div className="space-y-4">

      {entries.length === 0 && (
        <p className="text-sm text-ink-muted">
          ยังไม่มีบุคคลในอุปการะ — กด &quot;+ เพิ่มบุคคลในอุปการะ&quot; เพื่อเพิ่ม
        </p>
      )}

      {entries.map((dep, idx) => {
        const relError = dep.relationshipType.trim() === ''
        const nameError =
          dep.firstNameEn.trim() === '' && dep.firstNameLocal.trim() === ''

        return (
          <div
            key={idx}
            className="rounded-lg border border-hairline-soft bg-canvas-soft p-4 space-y-4"
          >
            {/* Card header: entry number + tax badge + remove */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">
                บุคคลในอุปการะ #{idx + 1}
                {dep.isTaxDependent && (
                  <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                    ลดหย่อนภาษี / Tax
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label={`ลบบุคคลในอุปการะ #${idx + 1}`}
                onClick={() => removeEntry(idx)}
                className="rounded px-2 py-1 text-xs text-warning hover:bg-warning/10"
              >
                ลบ / Remove
              </button>
            </div>

            {/* ─── Relationship ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <fieldset className="md:col-span-2">
                <label htmlFor={`dep-rel-${idx}`} className="cnext-label">
                  ความสัมพันธ์ / Relationship
                  <span aria-hidden="true" className="cnext-asterisk ml-1">*</span>
                </label>
                <input
                  id={`dep-rel-${idx}`}
                  type="text"
                  placeholder="เช่น Spouse, Son, Daughter"
                  list={`dep-rel-hints-${idx}`}
                  value={dep.relationshipType}
                  onChange={(e) => updateEntry(idx, { relationshipType: e.target.value })}
                  aria-invalid={relError ? 'true' : 'false'}
                  className="cnext-input w-full"
                />
                <datalist id={`dep-rel-hints-${idx}`}>
                  {RELATIONSHIP_HINTS.map((hint) => (
                    <option key={hint} value={hint} />
                  ))}
                </datalist>
                {relError && (
                  <p role="alert" className="mt-1 text-xs text-warning">
                    กรุณาระบุความสัมพันธ์
                  </p>
                )}
              </fieldset>

              {/* ─── EN Name block ──────────────────────────────────────── */}
              <fieldset>
                <label htmlFor={`dep-sal-en-${idx}`} className="cnext-label">
                  คำนำหน้า (EN) / Salutation (EN)
                </label>
                <input
                  id={`dep-sal-en-${idx}`}
                  type="text"
                  placeholder="Mr. / Ms. / Mrs."
                  value={dep.salutationEn ?? ''}
                  onChange={(e) => updateEntry(idx, { salutationEn: e.target.value || null })}
                  className="cnext-input w-full"
                />
              </fieldset>

              <fieldset>
                <label htmlFor={`dep-fn-en-${idx}`} className="cnext-label">
                  ชื่อ (EN) / First Name (EN)
                  {dep.firstNameLocal.trim() === '' && (
                    <span aria-hidden="true" className="cnext-asterisk ml-1">*</span>
                  )}
                </label>
                <input
                  id={`dep-fn-en-${idx}`}
                  type="text"
                  placeholder="First Name"
                  value={dep.firstNameEn}
                  onChange={(e) => updateEntry(idx, { firstNameEn: e.target.value })}
                  aria-invalid={nameError ? 'true' : 'false'}
                  className="cnext-input w-full"
                />
              </fieldset>

              <fieldset>
                <label htmlFor={`dep-ln-en-${idx}`} className="cnext-label">
                  นามสกุล (EN) / Last Name (EN)
                </label>
                <input
                  id={`dep-ln-en-${idx}`}
                  type="text"
                  placeholder="Last Name"
                  value={dep.lastNameEn}
                  onChange={(e) => updateEntry(idx, { lastNameEn: e.target.value })}
                  className="cnext-input w-full"
                />
              </fieldset>

              {/* ─── Local Name block ────────────────────────────────────── */}
              <fieldset>
                <label htmlFor={`dep-sal-local-${idx}`} className="cnext-label">
                  คำนำหน้า (ไทย) / Salutation (Local)
                </label>
                <input
                  id={`dep-sal-local-${idx}`}
                  type="text"
                  placeholder="นาย / นางสาว / นาง"
                  value={dep.salutationLocal ?? ''}
                  onChange={(e) => updateEntry(idx, { salutationLocal: e.target.value || null })}
                  className="cnext-input w-full"
                />
              </fieldset>

              <fieldset>
                <label htmlFor={`dep-fn-local-${idx}`} className="cnext-label">
                  ชื่อ (ไทย) / First Name (Local)
                  {dep.firstNameEn.trim() === '' && (
                    <span aria-hidden="true" className="cnext-asterisk ml-1">*</span>
                  )}
                </label>
                <input
                  id={`dep-fn-local-${idx}`}
                  type="text"
                  placeholder="ชื่อ"
                  value={dep.firstNameLocal}
                  onChange={(e) => updateEntry(idx, { firstNameLocal: e.target.value })}
                  aria-invalid={nameError ? 'true' : 'false'}
                  className="cnext-input w-full"
                />
              </fieldset>

              <fieldset>
                <label htmlFor={`dep-ln-local-${idx}`} className="cnext-label">
                  นามสกุล (ไทย) / Last Name (Local)
                </label>
                <input
                  id={`dep-ln-local-${idx}`}
                  type="text"
                  placeholder="นามสกุล"
                  value={dep.lastNameLocal}
                  onChange={(e) => updateEntry(idx, { lastNameLocal: e.target.value })}
                  className="cnext-input w-full"
                />
              </fieldset>

              {nameError && (
                <p role="alert" className="md:col-span-2 mt-1 text-xs text-warning">
                  กรุณาระบุชื่ออย่างน้อยหนึ่งภาษา (EN หรือ ไทย)
                </p>
              )}

              {/* ─── Personal details ────────────────────────────────────── */}
              <fieldset>
                <label htmlFor={`dep-nat-${idx}`} className="cnext-label">
                  สัญชาติ / Nationality (ISO3)
                </label>
                <input
                  id={`dep-nat-${idx}`}
                  type="text"
                  placeholder="THA"
                  maxLength={3}
                  value={dep.nationality ?? ''}
                  onChange={(e) => updateEntry(idx, { nationality: e.target.value.toUpperCase() || null })}
                  className="cnext-input w-full"
                />
              </fieldset>

              <fieldset>
                <label htmlFor={`dep-dob-${idx}`} className="cnext-label">
                  วันเกิด / Date of Birth
                </label>
                <input
                  id={`dep-dob-${idx}`}
                  type="date"
                  value={dep.dateOfBirth ?? ''}
                  onChange={(e) => updateEntry(idx, { dateOfBirth: e.target.value || null })}
                  className="cnext-input w-full"
                />
              </fieldset>

              <fieldset>
                <label htmlFor={`dep-country-${idx}`} className="cnext-label">
                  ประเทศ / Country (ISO3)
                </label>
                <input
                  id={`dep-country-${idx}`}
                  type="text"
                  placeholder="THA"
                  maxLength={3}
                  value={dep.country ?? 'THA'}
                  onChange={(e) => updateEntry(idx, { country: e.target.value.toUpperCase() || null })}
                  className="cnext-input w-full"
                />
              </fieldset>

              {/* ─── Tax dependent ───────────────────────────────────────── */}
              <fieldset className="md:pt-7">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dep.isTaxDependent}
                    onChange={(e) => updateEntry(idx, { isTaxDependent: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm text-ink">ใช้สิทธิลดหย่อนภาษี / Tax Dependent</span>
                </label>
                <p className="mt-1 text-xs text-ink-faint">บุคคลในอุปการะที่ใช้สิทธิลดหย่อนภาษีเงินได้</p>
              </fieldset>
            </div>

            {/* ─── NID block (collapsible) ──────────────────────────────── */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-accent hover:underline select-none">
                บัตรประจำตัว / National ID (ถ้ามี)
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">

                <fieldset>
                  <label htmlFor={`dep-nid-type-${idx}`} className="cnext-label">
                    ประเภทบัตร / Card Type
                  </label>
                  <input
                    id={`dep-nid-type-${idx}`}
                    type="text"
                    placeholder="เช่น Thai National ID, Passport"
                    value={dep.nationalIdCardType ?? ''}
                    onChange={(e) => updateEntry(idx, { nationalIdCardType: e.target.value || null })}
                    className="cnext-input w-full"
                  />
                </fieldset>

                <fieldset>
                  <label htmlFor={`dep-nid-country-${idx}`} className="cnext-label">
                    ประเทศออกบัตร / ID Country (ISO3)
                  </label>
                  <input
                    id={`dep-nid-country-${idx}`}
                    type="text"
                    placeholder="THA"
                    maxLength={3}
                    value={dep.nationalIdCountry ?? ''}
                    onChange={(e) => updateEntry(idx, { nationalIdCountry: e.target.value.toUpperCase() || null })}
                    className="cnext-input w-full"
                  />
                </fieldset>

                <fieldset className="md:col-span-2">
                  <label htmlFor={`dep-nid-${idx}`} className="cnext-label">
                    เลขบัตร / ID Number
                  </label>
                  <input
                    id={`dep-nid-${idx}`}
                    type="text"
                    placeholder="หมายเลขบัตรประจำตัว"
                    value={dep.nationalId}
                    onChange={(e) => updateEntry(idx, { nationalId: e.target.value })}
                    className="cnext-input w-full"
                  />
                </fieldset>

              </div>
            </details>

            {/* ─── Contact + Address block (collapsible) ───────────────── */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-accent hover:underline select-none">
                ข้อมูลติดต่อและที่อยู่ / Contact &amp; Address (ถ้ามี)
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">

                <fieldset>
                  <label htmlFor={`dep-phone-${idx}`} className="cnext-label">
                    เบอร์โทร / Phone
                  </label>
                  <input
                    id={`dep-phone-${idx}`}
                    type="tel"
                    placeholder="0812345678"
                    value={dep.phone}
                    onChange={(e) => updateEntry(idx, { phone: e.target.value })}
                    className="cnext-input w-full"
                  />
                </fieldset>

                <fieldset>
                  <label htmlFor={`dep-email-${idx}`} className="cnext-label">
                    อีเมล / Email
                  </label>
                  <input
                    id={`dep-email-${idx}`}
                    type="email"
                    placeholder="example@email.com"
                    value={dep.email}
                    onChange={(e) => updateEntry(idx, { email: e.target.value })}
                    className="cnext-input w-full"
                  />
                </fieldset>

                {/* STA-82: Copy Address from Employee */}
                <fieldset className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dep.copyAddressFromEmployee}
                      onChange={(e) => updateEntry(idx, { copyAddressFromEmployee: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm text-ink">คัดลอกที่อยู่จากพนักงาน / Copy Address from Employee</span>
                  </label>
                </fieldset>

                <fieldset className="md:col-span-2">
                  <label htmlFor={`dep-addr-${idx}`} className="cnext-label">
                    ที่อยู่ / Address
                  </label>
                  <input
                    id={`dep-addr-${idx}`}
                    type="text"
                    placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด"
                    value={dep.addressLine1}
                    onChange={(e) => updateEntry(idx, { addressLine1: e.target.value })}
                    className="cnext-input w-full"
                  />
                </fieldset>

                {/* STA-82: Building / Floor / Street */}
                <fieldset>
                  <label htmlFor={`dep-building-${idx}`} className="cnext-label">
                    อาคาร / Building
                  </label>
                  <input
                    id={`dep-building-${idx}`}
                    type="text"
                    placeholder="ชื่ออาคาร"
                    value={dep.building}
                    onChange={(e) => updateEntry(idx, { building: e.target.value })}
                    className="cnext-input w-full"
                  />
                </fieldset>

                <fieldset>
                  <label htmlFor={`dep-floor-${idx}`} className="cnext-label">
                    ชั้น / Floor
                  </label>
                  <input
                    id={`dep-floor-${idx}`}
                    type="text"
                    placeholder="เช่น 3, ชั้น 3"
                    value={dep.floor}
                    onChange={(e) => updateEntry(idx, { floor: e.target.value })}
                    className="cnext-input w-full"
                  />
                </fieldset>

                {/* BA row 130: Moo (หมู่ที่) */}
                <fieldset>
                  <label htmlFor={`dep-moo-${idx}`} className="cnext-label">
                    หมู่ที่ / Moo
                  </label>
                  <input
                    id={`dep-moo-${idx}`}
                    type="text"
                    placeholder="เช่น 5"
                    value={dep.moo}
                    onChange={(e) => updateEntry(idx, { moo: e.target.value })}
                    className="cnext-input w-full"
                  />
                </fieldset>

                {/* BA row 131: Lane/Soi (ซอย) */}
                <fieldset>
                  <label htmlFor={`dep-soi-${idx}`} className="cnext-label">
                    ซอย / Lane / Soi
                  </label>
                  <input
                    id={`dep-soi-${idx}`}
                    type="text"
                    placeholder="เช่น สนามบินน้ำ"
                    value={dep.soi}
                    onChange={(e) => updateEntry(idx, { soi: e.target.value })}
                    className="cnext-input w-full"
                  />
                </fieldset>

                <fieldset className="md:col-span-2">
                  <label htmlFor={`dep-street-${idx}`} className="cnext-label">
                    ถนน / Street
                  </label>
                  <input
                    id={`dep-street-${idx}`}
                    type="text"
                    placeholder="ชื่อถนน"
                    value={dep.street}
                    onChange={(e) => updateEntry(idx, { street: e.target.value })}
                    className="cnext-input w-full"
                  />
                </fieldset>

              </div>
            </details>

            {/* BA Dependents row 123 — Attachment */}
            <AttachmentDropzone
              id={`dependent-attachment-${idx}`}
              files={filesFromAttachmentName(dep.attachmentName, `dependent-existing-${idx}`)}
              onFilesChange={(files) => updateAttachment(idx, files)}
              label="ไฟล์แนบบุคคลในอุปการะ (Attachment)"
              maxFiles={5}
              maxSizeMB={10}
            />

          </div>
        )
      })}

      {/* Add button — max 10 entries */}
      {entries.length < 10 && (
        <button
          type="button"
          onClick={addEntry}
          className="text-sm text-accent hover:underline"
        >
          + เพิ่มบุคคลในอุปการะ
        </button>
      )}
      {entries.length >= 10 && (
        <p className="text-xs text-ink-muted">เพิ่มได้สูงสุด 10 คน</p>
      )}

    </div>
  )
}
