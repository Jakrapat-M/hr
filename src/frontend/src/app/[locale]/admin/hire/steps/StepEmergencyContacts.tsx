'use client'

// StepEmergencyContacts.tsx — Phase 1.4: PerEmergencyContacts SF entity
// Repeating section: name + relationship + phone + primaryFlag + address block
// 4 visible + 7 hidden mandatory (address cascade per plan v2 §2.11)
// SF dump: relationship = Edm.String maxLength=50, free-text (no picklist at OData level)
//          addressCustomString12 = Province pair, addressCustomString13 = District pair
// Phase 2 will upgrade free-text address inputs to picklist cascade.

import { useEffect } from 'react'
import { useHireWizard, type EmergencyContactEntry } from '@/lib/admin/store/useHireWizard'

// ── Array-safe setter ─────────────────────────────────────────────────────────
// setStepData(step, patch) does { ...formData[step], ...patch } which converts
// arrays to plain objects (e.g. [{…}] → {'0':{…}}). emergencyContacts is a
// top-level array slice, not a nested object, so we bypass setStepData and
// write directly to the store via setState.
function useSetEmergencyContacts() {
  return (next: EmergencyContactEntry[]) =>
    useHireWizard.setState((s) => ({
      formData: { ...s.formData, emergencyContacts: next },
      lastSavedAt: Date.now(),
    }))
}

// Relationship hint list for datalist UX — free-text stored, datalist helps users pick common values
// SF: relationship is Edm.String maxLength=50 — any string accepted at OData level
const RELATIONSHIP_HINTS = [
  'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister',
  'Friend', 'Other',
] as const

const EMPTY_EC: EmergencyContactEntry = {
  name: '',
  relationship: '',
  phone: '',
  primaryFlag: false,
  addressCountry: 'THA',
  addressProvince: '',
  addressDistrict: '',
  addressSubDistrict: '',
  addressPostalCode: '',
}

interface StepEmergencyContactsProps {
  onValidChange?: (valid: boolean) => void
}

export default function StepEmergencyContacts({ onValidChange }: StepEmergencyContactsProps) {
  const { formData, setStepValidity } = useHireWizard()
  const setEmergencyContacts = useSetEmergencyContacts()
  const entries: EmergencyContactEntry[] = formData.emergencyContacts ?? []

  // ── Validation effect ─────────────────────────────────────────────────────
  useEffect(() => {
    // Optional list (0 entries is valid); when entries present, each must have name + relationship + phone
    const valid =
      entries.length === 0 ||
      entries.every((ec) => ec.name.trim() !== '' && ec.relationship.trim() !== '' && ec.phone.trim() !== '')
    setStepValidity('emergencyContacts', valid)
    onValidChange?.(valid)
  }, [entries, onValidChange, setStepValidity])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function setEntries(next: EmergencyContactEntry[]) {
    setEmergencyContacts(next)
  }

  function addEntry() {
    if (entries.length >= 5) return
    // Default primaryFlag to true for the first entry, false otherwise
    const isPrimary = entries.length === 0
    setEntries([...entries, { ...EMPTY_EC, primaryFlag: isPrimary }])
  }

  function removeEntry(idx: number) {
    const next = entries.filter((_, i) => i !== idx)
    // If we removed the primary and there are entries left, make the first one primary
    const hadPrimary = entries[idx]?.primaryFlag
    if (hadPrimary && next.length > 0 && !next.some((ec) => ec.primaryFlag)) {
      next[0] = { ...next[0], primaryFlag: true }
    }
    setEntries(next)
  }

  function updateEntry(idx: number, patch: Partial<EmergencyContactEntry>) {
    setEntries(entries.map((ec, i) => (i === idx ? { ...ec, ...patch } : ec)))
  }

  function setPrimary(idx: number) {
    // Only one entry can be primary — uncheck all others
    setEntries(entries.map((ec, i) => ({ ...ec, primaryFlag: i === idx })))
  }

  return (
    <div className="space-y-4">

      {entries.length === 0 && (
        <p className="text-sm text-ink-muted">
          ยังไม่มีผู้ติดต่อฉุกเฉิน — กด "+ เพิ่มผู้ติดต่อ" เพื่อเพิ่ม
        </p>
      )}

      {entries.map((ec, idx) => {
        const nameError = ec.name.trim() === ''
        const relError = ec.relationship.trim() === ''
        const phoneError = ec.phone.trim() === ''

        return (
          <div
            key={idx}
            className="rounded-lg border border-hairline-soft bg-canvas-soft p-4 space-y-4"
          >
            {/* Card header: entry number + primary badge + remove */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">
                ผู้ติดต่อ #{idx + 1}
                {ec.primaryFlag && (
                  <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                    หลัก / Primary
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label={`ลบผู้ติดต่อ #${idx + 1}`}
                onClick={() => removeEntry(idx)}
                className="rounded px-2 py-1 text-xs text-warning hover:bg-warning/10"
              >
                ลบ / Remove
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              {/* ชื่อ — SF: name (sap_required=true) */}
              <fieldset>
                <label htmlFor={`ec-name-${idx}`} className="humi-label">
                  ชื่อ / Name<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
                </label>
                <input
                  id={`ec-name-${idx}`}
                  type="text"
                  placeholder="ชื่อผู้ติดต่อ"
                  value={ec.name}
                  onChange={(e) => updateEntry(idx, { name: e.target.value })}
                  aria-invalid={nameError ? 'true' : 'false'}
                  className="humi-input w-full"
                />
                {nameError && (
                  <p role="alert" className="mt-1 text-xs text-warning">กรุณาระบุชื่อ</p>
                )}
              </fieldset>

              {/* ความสัมพันธ์ — SF: relationship (Edm.String maxLength=50, free-text) */}
              <fieldset>
                <label htmlFor={`ec-rel-${idx}`} className="humi-label">
                  ความสัมพันธ์ / Relationship<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
                </label>
                <input
                  id={`ec-rel-${idx}`}
                  type="text"
                  placeholder="เช่น Spouse, Father, Mother"
                  list={`ec-rel-hints-${idx}`}
                  value={ec.relationship}
                  maxLength={50}
                  onChange={(e) => updateEntry(idx, { relationship: e.target.value })}
                  aria-invalid={relError ? 'true' : 'false'}
                  className="humi-input w-full"
                />
                <datalist id={`ec-rel-hints-${idx}`}>
                  {RELATIONSHIP_HINTS.map((hint) => (
                    <option key={hint} value={hint} />
                  ))}
                </datalist>
                {relError && (
                  <p role="alert" className="mt-1 text-xs text-warning">กรุณาระบุความสัมพันธ์</p>
                )}
              </fieldset>

              {/* เบอร์โทร — SF: phone (sap_required=false but UI-required) */}
              <fieldset>
                <label htmlFor={`ec-phone-${idx}`} className="humi-label">
                  เบอร์โทร / Phone<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
                </label>
                <input
                  id={`ec-phone-${idx}`}
                  type="tel"
                  placeholder="0812345678"
                  value={ec.phone}
                  onChange={(e) => updateEntry(idx, { phone: e.target.value })}
                  aria-invalid={phoneError ? 'true' : 'false'}
                  className="humi-input w-full"
                />
                {phoneError && (
                  <p role="alert" className="mt-1 text-xs text-warning">กรุณาระบุเบอร์โทร</p>
                )}
              </fieldset>

              {/* ผู้ติดต่อหลัก — SF: primaryFlag (Y/N) */}
              <fieldset className="md:pt-7">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ec.primaryFlag}
                    onChange={() => setPrimary(idx)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm text-ink">ผู้ติดต่อหลัก / Primary Contact</span>
                </label>
                <p className="mt-1 text-xs text-ink-faint">เลือกได้หนึ่งคนเป็นผู้ติดต่อหลัก</p>
              </fieldset>
            </div>

            {/* ─── ที่อยู่ (7 hidden mandatory SF cascade fields) ─────────────── */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-accent hover:underline select-none">
                ที่อยู่ / Address (optional — cascades to SF hidden fields)
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">

                {/* ประเทศ — SF: addressCountry (ISO3, default THA) */}
                <fieldset>
                  <label htmlFor={`ec-country-${idx}`} className="humi-label">
                    ประเทศ / Country
                  </label>
                  <input
                    id={`ec-country-${idx}`}
                    type="text"
                    placeholder="THA"
                    value={ec.addressCountry}
                    onChange={(e) => updateEntry(idx, { addressCountry: e.target.value })}
                    className="humi-input w-full"
                  />
                </fieldset>

                {/* จังหวัด — SF: addressCustomString1 + addressCustomString12 (Province cascade pair) */}
                <fieldset>
                  <label htmlFor={`ec-province-${idx}`} className="humi-label">
                    จังหวัด / Province
                  </label>
                  <input
                    id={`ec-province-${idx}`}
                    type="text"
                    placeholder="จังหวัด"
                    value={ec.addressProvince}
                    onChange={(e) => updateEntry(idx, { addressProvince: e.target.value })}
                    className="humi-input w-full"
                  />
                </fieldset>

                {/* อำเภอ/เขต — SF: addressCustomString2 + addressCustomString13 (District cascade pair) */}
                <fieldset>
                  <label htmlFor={`ec-district-${idx}`} className="humi-label">
                    อำเภอ/เขต / District
                  </label>
                  <input
                    id={`ec-district-${idx}`}
                    type="text"
                    placeholder="อำเภอ หรือ เขต"
                    value={ec.addressDistrict}
                    onChange={(e) => updateEntry(idx, { addressDistrict: e.target.value })}
                    className="humi-input w-full"
                  />
                </fieldset>

                {/* ตำบล/แขวง — SF: addressCustomString3 (Sub-District) */}
                <fieldset>
                  <label htmlFor={`ec-subdistrict-${idx}`} className="humi-label">
                    ตำบล/แขวง / Sub-District
                  </label>
                  <input
                    id={`ec-subdistrict-${idx}`}
                    type="text"
                    placeholder="ตำบล หรือ แขวง"
                    value={ec.addressSubDistrict}
                    onChange={(e) => updateEntry(idx, { addressSubDistrict: e.target.value })}
                    className="humi-input w-full"
                  />
                </fieldset>

                {/* รหัสไปรษณีย์ — SF: addressCustomString4 (Postal Code) */}
                <fieldset>
                  <label htmlFor={`ec-postal-${idx}`} className="humi-label">
                    รหัสไปรษณีย์ / Postal Code
                  </label>
                  <input
                    id={`ec-postal-${idx}`}
                    type="text"
                    inputMode="numeric"
                    placeholder="10000"
                    value={ec.addressPostalCode}
                    onChange={(e) => updateEntry(idx, { addressPostalCode: e.target.value })}
                    className="humi-input w-full"
                  />
                </fieldset>

              </div>
            </details>
          </div>
        )
      })}

      {/* Add button — max 5 entries */}
      {entries.length < 5 && (
        <button
          type="button"
          onClick={addEntry}
          className="text-sm text-accent hover:underline"
        >
          + เพิ่มผู้ติดต่อ
        </button>
      )}
      {entries.length >= 5 && (
        <p className="text-xs text-ink-muted">เพิ่มได้สูงสุด 5 คน</p>
      )}

    </div>
  )
}
