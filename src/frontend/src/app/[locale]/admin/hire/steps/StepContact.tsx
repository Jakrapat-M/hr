'use client'

// StepContact.tsx — A2 Multi-value Contact
// Wave 2-A: BRD #15 email (SF ecEmailType, no 5-cap), #16 phone (countryCode + extension),
//           BRD #17 8-field Thai address (PerAddressDEFLT)
// Phase 2: address free-text replaced by AddressPicklist cascade (zProvince→zDistrict→zSubDistrict)
// Perf budget goal: ≤500ms first interaction on slow 3G (chunk ≤100KB; Bangkok max 33KB)
// Picklist source: SF cite in code comments

import { useTranslations } from 'next-intl'
import { useHireWizard, type EmailEntry, type JobRelationship } from '@/lib/admin/store/useHireWizard'
import AddressPicklist, { EMPTY_ADDRESS_PICKLIST, type AddressPicklistValue } from '@/components/AddressPicklist'
import { AttachmentDropzone, type AttachedFile } from '@/components/admin/AttachmentDropzone/AttachmentDropzone'
import {
  attachmentNameFromFiles,
  filesFromAttachmentName,
} from '@/components/admin/AttachmentDropzone/attachmentFiles'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// BRD #15: SF ecEmailType picklist codes
// SF cite: qas-fields-2026-04-25/sf-qas-picklist-options-LINKED-2026-04-26.json (ecEmailType)
// P = Personal, B = Business/Work
const EMAIL_TYPE_LABELS: Record<string, string> = {
  P:        'ส่วนตัว (Personal)',
  B:        'ที่ทำงาน (Business)',
  personal: 'ส่วนตัว',   // legacy compat
  work:     'ที่ทำงาน',  // legacy compat
}

// BRD #16: SF ecPhoneType picklist codes
// SF cite: qas-fields-2026-04-25/sf-qas-picklist-options-LINKED-2026-04-26.json (ecPhoneType)
// BI=Business IP, B=Business, H=Home, F=Fax, C=Cell/Mobile
const PHONE_TYPE_LABELS: Record<string, string> = {
  C:      'มือถือ (Cell)',
  B:      'ที่ทำงาน (Business)',
  H:      'ที่บ้าน (Home)',
  F:      'แฟกซ์ (Fax)',
  BI:     'IP ที่ทำงาน (Business IP)',
  mobile: 'มือถือ',  // legacy compat
  office: 'ที่ทำงาน', // legacy compat
  home:   'ที่บ้าน',  // legacy compat
}

const SF_PHONE_TYPES = ['C', 'B', 'H', 'F', 'BI'] as const
const SF_EMAIL_TYPES = ['P', 'B'] as const

// BRD #17: Thai address — Phase 2 replaces free-text with AddressPicklist cascade
// SF cite: qas-fields-2026-04-26/sf-qas-PerAddressDEFLT-2026-04-26.json
// Full address stored in contact.address; house/village/moo/soi remain free-text.
// Non-THA country: picklist hidden, free-text fallback inputs shown instead.
interface ThaiAddress {
  houseNo:     string  // SF address5
  village:     string  // SF address4
  moo:         string  // SF address11
  soi:         string  // SF address7
  // Phase 2: picklist externalCodes (SF zProvince/zDistrict/zSubDistrict)
  subdistrict: string  // SF customString3
  district:    string  // SF customString2
  province:    string  // SF customString1
  zipCode:     string  // SF customString4
  country:     string  // SF country (default THA)
}

const EMPTY_ADDRESS: ThaiAddress = {
  houseNo: '', village: '', moo: '', soi: '',
  subdistrict: '', district: '', province: '',
  zipCode: '', country: 'THA',
}

// Derive AddressPicklistValue from ThaiAddress (province/district/subDistrict/postalCode)
function toPicklistValue(addr: ThaiAddress): AddressPicklistValue {
  return {
    province:    addr.province,
    district:    addr.district,
    subDistrict: addr.subdistrict,
    postalCode:  addr.zipCode,
  }
}

// Merge AddressPicklistValue back into ThaiAddress
function fromPicklistValue(addr: ThaiAddress, pv: AddressPicklistValue): ThaiAddress {
  return { ...addr, province: pv.province, district: pv.district, subdistrict: pv.subDistrict, zipCode: pv.postalCode }
}

// Extended PhoneEntry with countryCode + extension (BRD #16)
// type is widened to string to accept both legacy ('mobile'|'office'|'home') and SF codes ('C'|'B'|'H'|'F'|'BI')
interface ExtendedPhoneEntry {
  type: string
  value: string
  isPrimary: boolean
  countryCode?: string
  extension?: string
}

export default function StepContact() {
  const t = useTranslations('hireForm.contact')
  const { formData, setStepData } = useHireWizard()
  const {
    phones = [],
    emails = [],
    jobRelationships = [],
  } = formData.contact ?? {}

  // Retrieve address from contact store (extended beyond original schema)
  const address = (formData.contact as Record<string, unknown>)?.address as ThaiAddress | undefined ?? EMPTY_ADDRESS
  const addressAttachmentName = formData.contact.addressAttachmentName ?? null

  // ── Phone helpers ──────────────────────────────────────────────────────────
  function setPhones(next: ExtendedPhoneEntry[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setStepData('contact', { phones: next as any })
  }

  function addPhone() {
    // BRD #15: SF has no cap — removed phones.length >= 5 gate
    setPhones([...phones as ExtendedPhoneEntry[], { type: 'C', value: '', isPrimary: false, countryCode: '66', extension: '' }])
  }

  function removePhone(idx: number) {
    if (phones.length <= 1) return
    setPhones((phones as ExtendedPhoneEntry[]).filter((_, i) => i !== idx))
  }

  function updatePhone(idx: number, patch: Partial<ExtendedPhoneEntry>) {
    setPhones((phones as ExtendedPhoneEntry[]).map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function setPrimaryPhone(idx: number) {
    setPhones((phones as ExtendedPhoneEntry[]).map((p, i) => ({ ...p, isPrimary: i === idx })))
  }

  // ── Email helpers ──────────────────────────────────────────────────────────
  function setEmails(next: EmailEntry[]) {
    setStepData('contact', { emails: next })
  }

  function addEmail() {
    // BRD #15: SF has no cap — removed emails.length >= 5 gate
    // 'P' = SF ecEmailType Personal; mapped to legacy 'personal' for type compat
    setEmails([...emails, { type: 'personal' as EmailEntry['type'], value: '', isPrimary: false }])
  }

  function removeEmail(idx: number) {
    if (emails.length <= 1) return
    setEmails(emails.filter((_, i) => i !== idx))
  }

  function updateEmail(idx: number, patch: Partial<EmailEntry>) {
    setEmails(emails.map((e, i) => (i === idx ? { ...e, ...patch } : e)))
  }

  function setPrimaryEmail(idx: number) {
    setEmails(emails.map((e, i) => ({ ...e, isPrimary: i === idx })))
  }

  // ── Address helpers ────────────────────────────────────────────────────────
  function updateAddress(patch: Partial<ThaiAddress>) {
    const next = { ...address, ...patch }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setStepData('contact', { address: next } as any)
  }

  function handlePicklistChange(pv: AddressPicklistValue) {
    updateAddress(fromPicklistValue(address, pv))
  }

  function handleAddressAttachmentFilesChange(files: AttachedFile[]) {
    setStepData('contact', {
      addressAttachmentName: attachmentNameFromFiles(files) || null,
    })
  }

  // ── Job Relationship helpers ───────────────────────────────────────────────
  function setRelationships(next: JobRelationship[]) {
    setStepData('contact', { jobRelationships: next })
  }

  function addRelationship() {
    setRelationships([...jobRelationships, { relationshipType: '', name: '' }])
  }

  function removeRelationship(idx: number) {
    setRelationships(jobRelationships.filter((_, i) => i !== idx))
  }

  function updateRelationship(idx: number, patch: Partial<JobRelationship>) {
    setRelationships(jobRelationships.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  return (
    <div className="space-y-8">

      {/* ─── เบอร์ติดต่อ (BRD #16: countryCode + extension) ─────────────────── */}
      <section aria-label={t('phoneSection')}>
        <p className="humi-label mb-3">
          {t('phoneSection')}<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
        </p>
        {/* SF cite: qas-fields-2026-04-26/sf-qas-PerPhone-2026-04-26.json#.d.results[0].countryCode */}

        <div className="space-y-3">
          {(phones as ExtendedPhoneEntry[]).map((phone, idx) => (
            <div key={idx} className="flex flex-wrap items-start gap-2">
              {/* ประเภท — SF ecPhoneType codes */}
              <select
                aria-label={`${t('phoneType')} ${idx + 1}`}
                value={phone.type}
                onChange={(e) => updatePhone(idx, { type: e.target.value })}
                className="humi-select w-40 shrink-0"
              >
                {SF_PHONE_TYPES.map((pt) => (
                  <option key={pt} value={pt}>{PHONE_TYPE_LABELS[pt]}</option>
                ))}
                {/* legacy options for compat */}
                {!SF_PHONE_TYPES.includes(phone.type as typeof SF_PHONE_TYPES[number]) && (
                  <option value={phone.type}>{PHONE_TYPE_LABELS[phone.type] ?? phone.type}</option>
                )}
              </select>

              {/* รหัสประเทศ — SF PerPhone.countryCode e.g. "66" */}
              <input
                type="text"
                aria-label={`${t('countryCode')} ${idx + 1}`}
                placeholder={t('countryCodePlaceholder')}
                value={phone.countryCode ?? '66'}
                onChange={(e) => updatePhone(idx, { countryCode: e.target.value })}
                className="humi-input w-16 shrink-0"
              />

              {/* เบอร์ */}
              <input
                type="tel"
                aria-label={`${t('phoneNumber')} ${idx + 1}`}
                aria-invalid={phone.value.trim() === '' ? 'true' : 'false'}
                placeholder={t('phonePlaceholder')}
                value={phone.value}
                onChange={(e) => updatePhone(idx, { value: e.target.value })}
                className="humi-input min-w-0 flex-1"
              />

              {/* ต่อ (extension) — SF PerPhone.extension */}
              <input
                type="text"
                aria-label={`${t('extension')} ${idx + 1}`}
                placeholder={t('extensionPlaceholder')}
                value={phone.extension ?? ''}
                onChange={(e) => updatePhone(idx, { extension: e.target.value })}
                className="humi-input w-16 shrink-0"
              />

              {/* หลัก */}
              <label className="flex items-center gap-1.5 text-sm text-ink-soft whitespace-nowrap pt-2.5">
                <input
                  type="checkbox"
                  checked={phone.isPrimary}
                  onChange={() => setPrimaryPhone(idx)}
                  className="rounded"
                />
                {t('isPrimary')}
              </label>

              {/* ลบ */}
              <button
                type="button"
                aria-label={`${t('remove')} ${t('phoneNumber')} ${idx + 1}`}
                disabled={phones.length <= 1}
                onClick={() => removePhone(idx)}
                className="rounded px-2 py-1.5 text-sm text-warning hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {t('remove')}
              </button>
            </div>
          ))}
        </div>

        {/* BRD #16: no cap on phones — SF has no limit */}
        <button
          type="button"
          onClick={addPhone}
          className="mt-3 text-sm text-accent hover:underline"
        >
          {t('addPhone')}
        </button>
      </section>

      {/* ─── อีเมล (BRD #15: SF ecEmailType, no 5-cap) ───────────────────── */}
      <section aria-label={t('emailSection')}>
        <p className="humi-label mb-3">
          {t('emailSection')}<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
        </p>
        {/* SF cite: qas-fields-2026-04-26/sf-qas-PerEmail-2026-04-26.json#.d.results[0].emailType */}

        <div className="space-y-3">
          {emails.map((email, idx) => {
            const invalid = email.value.trim() !== '' && !EMAIL_RE.test(email.value.trim())
            return (
              <div key={idx} className="flex flex-wrap items-start gap-2">
                {/* ประเภท — SF ecEmailType codes */}
                <select
                  aria-label={`${t('emailType')} ${idx + 1}`}
                  value={email.type}
                  onChange={(e) => updateEmail(idx, { type: e.target.value as EmailEntry['type'] })}
                  className="humi-select w-44 shrink-0"
                >
                  {SF_EMAIL_TYPES.map((et) => (
                    <option key={et} value={et}>{EMAIL_TYPE_LABELS[et]}</option>
                  ))}
                  {/* legacy options for compat */}
                  {!SF_EMAIL_TYPES.includes(email.type as typeof SF_EMAIL_TYPES[number]) && (
                    <option value={email.type}>{EMAIL_TYPE_LABELS[email.type] ?? email.type}</option>
                  )}
                </select>

                {/* อีเมล */}
                <input
                  type="email"
                  aria-label={`${t('emailAddress')} ${idx + 1}`}
                  aria-invalid={invalid ? 'true' : 'false'}
                  placeholder={t('emailPlaceholder')}
                  value={email.value}
                  onChange={(e) => updateEmail(idx, { value: e.target.value })}
                  className="humi-input min-w-0 flex-1"
                />

                {/* หลัก */}
                <label className="flex items-center gap-1.5 text-sm text-ink-soft whitespace-nowrap pt-2.5">
                  <input
                    type="checkbox"
                    checked={email.isPrimary}
                    onChange={() => setPrimaryEmail(idx)}
                    className="rounded"
                  />
                  {t('isPrimary')}
                </label>

                {/* ลบ */}
                <button
                  type="button"
                  aria-label={`${t('remove')} ${t('emailAddress')} ${idx + 1}`}
                  disabled={emails.length <= 1}
                  onClick={() => removeEmail(idx)}
                  className="rounded px-2 py-1.5 text-sm text-warning hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {t('remove')}
                </button>
              </div>
            )
          })}
        </div>

        {/* BRD #15: no cap — SF has no limit */}
        <button
          type="button"
          onClick={addEmail}
          className="mt-3 text-sm text-accent hover:underline"
        >
          {t('addEmail')}
        </button>
      </section>

      {/* ─── ที่อยู่ที่พักอาศัย (BRD #17: PerAddressDEFLT — Phase 2 picklist cascade) ─── */}
      <section aria-label={t('addressSection')}>
        <p className="humi-label mb-3">
          {t('addressSection')}
        </p>
        {/* SF cite: customString1=province, customString2=district, customString3=subdistrict, customString4=postalCode
            address5=houseNo, address4=village, address11=moo, address7=soi, country=THA */}

        {/* ประเทศ — SF country (shown first; controls THA vs non-THA path) */}
        <div className="mb-4">
          <fieldset>
            <label htmlFor="addr-country" className="humi-label">
              {t('country')}
            </label>
            <input id="addr-country" type="text" placeholder={t('countryPlaceholder')}
              value={address.country}
              onChange={(e) => updateAddress({ country: e.target.value })}
              className="humi-input w-full md:w-48" />
          </fieldset>
        </div>

        {/* บ้านเลขที่ / หมู่บ้าน / หมู่ที่ / ซอย — free-text for all countries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 mb-4">
          {/* บ้านเลขที่ — SF address5 */}
          <fieldset>
            <label htmlFor="addr-house-no" className="humi-label">
              {t('houseNo')}<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <input id="addr-house-no" type="text" placeholder={t('houseNoPlaceholder')}
              autoComplete="address-line1"
              value={address.houseNo}
              onChange={(e) => updateAddress({ houseNo: e.target.value })}
              className="humi-input w-full" />
          </fieldset>

          {/* หมู่บ้าน — SF address4 */}
          <fieldset>
            <label htmlFor="addr-village" className="humi-label">
              {t('village')}
            </label>
            <input id="addr-village" type="text" placeholder={t('villagePlaceholder')}
              autoComplete="address-line2"
              value={address.village}
              onChange={(e) => updateAddress({ village: e.target.value })}
              className="humi-input w-full" />
          </fieldset>

          {/* หมู่ที่ — SF address11 */}
          <fieldset>
            <label htmlFor="addr-moo" className="humi-label">
              {t('moo')}
            </label>
            <input id="addr-moo" type="text" placeholder={t('mooPlaceholder')}
              autoComplete="address-line3"
              value={address.moo}
              onChange={(e) => updateAddress({ moo: e.target.value })}
              className="humi-input w-full" />
          </fieldset>

          {/* ซอย — SF address7 */}
          <fieldset>
            <label htmlFor="addr-soi" className="humi-label">
              {t('soi')}
            </label>
            <input id="addr-soi" type="text" placeholder={t('soiPlaceholder')}
              autoComplete="address-line3"
              value={address.soi}
              onChange={(e) => updateAddress({ soi: e.target.value })}
              className="humi-input w-full" />
          </fieldset>
        </div>

        {/* Province/District/SubDistrict/PostalCode: picklist for THA, free-text for non-THA */}
        {address.country.toUpperCase() === 'THA' || address.country === '' ? (
          /* THA path: cascading picklist (Phase 2) */
          <AddressPicklist
            value={toPicklistValue(address)}
            onChange={handlePicklistChange}
          />
        ) : (
          /* Non-THA path: free-text fallback */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <fieldset>
              <label htmlFor="addr-province-text" className="humi-label">{t('province')}</label>
              <input id="addr-province-text" type="text" placeholder={t('provincePlaceholder')}
                value={address.province}
                onChange={(e) => updateAddress({ province: e.target.value })}
                className="humi-input w-full" />
            </fieldset>
            <fieldset>
              <label htmlFor="addr-district-text" className="humi-label">{t('district')}</label>
              <input id="addr-district-text" type="text" placeholder={t('districtPlaceholder')}
                value={address.district}
                onChange={(e) => updateAddress({ district: e.target.value })}
                className="humi-input w-full" />
            </fieldset>
            <fieldset>
              <label htmlFor="addr-subdistrict-text" className="humi-label">{t('subdistrict')}</label>
              <input id="addr-subdistrict-text" type="text" placeholder={t('subdistrictPlaceholder')}
                value={address.subdistrict}
                onChange={(e) => updateAddress({ subdistrict: e.target.value })}
                className="humi-input w-full" />
            </fieldset>
            <fieldset>
              <label htmlFor="addr-zip-text" className="humi-label">{t('zipCode')}</label>
              <input id="addr-zip-text" type="text" inputMode="numeric" placeholder={t('zipCodePlaceholder')}
                value={address.zipCode}
                onChange={(e) => updateAddress({ zipCode: e.target.value })}
                className="humi-input w-full" />
            </fieldset>
          </div>
        )}

        {/* BA Addresses row 94 — Attachment */}
        <div className="mt-4">
          <AttachmentDropzone
            id="address-attachment"
            files={filesFromAttachmentName(addressAttachmentName, 'address-existing')}
            onFilesChange={handleAddressAttachmentFilesChange}
            label="ไฟล์แนบที่อยู่ (Attachment)"
            maxFiles={5}
            maxSizeMB={10}
          />
        </div>
      </section>

      {/* ─── บุคคลที่เกี่ยวข้อง ───────────────────────────────────────────── */}
      <section aria-label={t('relationsSection')}>
        <p className="humi-label mb-3">{t('relationsSection')}</p>

        {jobRelationships.length > 0 && (
          <table className="mb-3 w-full text-sm">
            <thead>
              <tr className="border-b border-hairline-soft text-left text-ink-soft">
                <th className="pb-2 pr-4 font-medium">{t('relationshipType')}</th>
                <th className="pb-2 pr-4 font-medium">{t('personName')}</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {jobRelationships.map((rel, idx) => (
                <tr key={idx} className="border-b border-hairline-soft/50">
                  <td className="py-2 pr-4">
                    <input
                      type="text"
                      aria-label={`${t('relationshipType')} ${idx + 1}`}
                      placeholder={t('relationshipTypePlaceholder')}
                      value={rel.relationshipType}
                      onChange={(e) => updateRelationship(idx, { relationshipType: e.target.value })}
                      className="humi-input w-full"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="text"
                      aria-label={`${t('personName')} ${idx + 1}`}
                      placeholder={t('personNamePlaceholder')}
                      value={rel.name}
                      onChange={(e) => updateRelationship(idx, { name: e.target.value })}
                      className="humi-input w-full"
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      aria-label={`${t('remove')} ${t('relationsSection')} ${idx + 1}`}
                      onClick={() => removeRelationship(idx)}
                      className="rounded px-2 py-1 text-xs text-warning hover:bg-warning/10"
                    >
                      {t('remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button
          type="button"
          onClick={addRelationship}
          className="text-sm text-accent hover:underline"
        >
          {t('addRelation')}
        </button>
      </section>

    </div>
  )
}
