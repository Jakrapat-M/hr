'use client'

// StepGlobalInfo.tsx — Phase 5b-2: PerGlobalInfoTHA SF entity
// Single-record section (not repeating). All 10 BA fields are optional per BA spec.
// SF entity key: country='THA' + personIdExternal + startDate
//
// SF field mapping (verified from sf-qas-ec-fields-FULL-2026-04-25.json):
//   religion          → genericString5  (RELIGION_THA picklist, 6 active codes)
//   numberOfChildren  → genericNumber2  (Edm.Int64)
//   disabilityStatus  → customString1   (free-text / Yes/No toggle)
//   typeOfDisability  → genericString2  (conditional on disabilityStatus)
//   certificateId     → genericString4
//   disabilityCertStartDate → customDate1
//   disabilityCertEndDate   → customDate2
//   spouseFatherIdNumber → genericNumber4 (13-digit string at OData level)
//   spouseMotherIdNumber → genericNumber5
//   additionalInformation → customString2
//
// RELIGION_THA picklist codes (from sf-qas-picklist-options-LINKED-2026-04-26.json):
//   sortOrder 1→'24' (Buddhist), 2→'29' (Muslim), 3→'36' (Christian),
//   4→'43' (Hindu), 5→'46' (Catholic), 6→'99' (Other)
// Labels confirmed via standard Thai government religion code convention.

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useHireWizard } from '@/lib/admin/store/useHireWizard'
import {
  AttachmentDropzone,
  type AttachedFile,
} from '@/components/admin/AttachmentDropzone/AttachmentDropzone'
import {
  attachmentNameFromFiles,
  filesFromAttachmentName,
} from '@/components/admin/AttachmentDropzone/attachmentFiles'
import { PICKLIST_COUNTRY_ISO } from '@hrms/shared/picklists'

// SF RELIGION_THA picklist — 6 active codes (externalCode values), sort-order ascending
// Source: sf-qas-picklist-options-LINKED-2026-04-26.json # RELIGION_THA
const RELIGION_THA_OPTIONS = [
  { code: '24', labelTh: 'พุทธ', labelEn: 'Buddhist' },
  { code: '29', labelTh: 'อิสลาม', labelEn: 'Muslim' },
  { code: '36', labelTh: 'คริสต์', labelEn: 'Christian' },
  { code: '43', labelTh: 'ฮินดู', labelEn: 'Hindu' },
  { code: '46', labelTh: 'คาทอลิก', labelEn: 'Catholic' },
  { code: '99', labelTh: 'อื่นๆ', labelEn: 'Other' },
] as const

interface StepGlobalInfoProps {
  onValidChange?: (valid: boolean) => void
}

export default function StepGlobalInfo({ onValidChange }: StepGlobalInfoProps) {
  const t = useTranslations('hireForm.globalInfo')
  const { formData, setStepData, setStepValidity } = useHireWizard()
  const gi = formData.globalInfo

  const [disabilityAttachmentFiles, setDisabilityAttachmentFiles] = useState<AttachedFile[]>(
    () => filesFromAttachmentName(gi.disabilityAttachmentName, 'disability-attachment'),
  )

  // All fields optional per BA — always valid
  useEffect(() => {
    setStepValidity('globalInfo', true)
    onValidChange?.(true)
  }, [onValidChange, setStepValidity])

  function patch(values: Partial<typeof gi>) {
    setStepData('globalInfo', values)
  }

  function handleDisabilityAttachmentChange(files: AttachedFile[]) {
    setDisabilityAttachmentFiles(files)
    patch({ disabilityAttachmentName: attachmentNameFromFiles(files) || null })
  }

  const showDisabilityFields = gi.disabilityStatus === 'Y'

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">

        {/* ประเทศ/ภูมิภาค — BA row 49 (STA-82); reuses PICKLIST_COUNTRY_ISO */}
        <fieldset>
          <label htmlFor="gi-country-region" className="cnext-label">
            {t('countryRegion')}
          </label>
          <select
            id="gi-country-region"
            value={gi.countryRegion ?? 'THA'}
            onChange={(e) => patch({ countryRegion: e.target.value || null })}
            className="cnext-input w-full"
          >
            <option value="">— {t('selectCountryRegion')} —</option>
            {PICKLIST_COUNTRY_ISO.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.labelTh}</option>
            ))}
          </select>
        </fieldset>

        {/* ศาสนา — SF: genericString5 (RELIGION_THA picklist) */}
        <fieldset>
          <label htmlFor="gi-religion" className="cnext-label">
            ศาสนา / Religion
          </label>
          <select
            id="gi-religion"
            value={gi.religion ?? ''}
            onChange={(e) => patch({ religion: e.target.value || null })}
            className="cnext-input w-full"
          >
            <option value="">— เลือกศาสนา / Select Religion —</option>
            {RELIGION_THA_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.labelTh} ({opt.labelEn})
              </option>
            ))}
          </select>
        </fieldset>

        {/* จำนวนบุตร — SF: genericNumber2 (Edm.Int64) */}
        <fieldset>
          <label htmlFor="gi-children" className="cnext-label">
            จำนวนบุตร / Number of Children
          </label>
          <input
            id="gi-children"
            type="number"
            min={0}
            max={99}
            placeholder="0"
            value={gi.numberOfChildren ?? ''}
            onChange={(e) => {
              const val = e.target.value
              patch({ numberOfChildren: val === '' ? null : parseInt(val, 10) })
            }}
            className="cnext-input w-full"
          />
        </fieldset>

        {/* สถานะความพิการ — SF: customString1 */}
        <fieldset>
          <label htmlFor="gi-disability-status" className="cnext-label">
            สถานะความพิการ / Disability Status
          </label>
          <select
            id="gi-disability-status"
            value={gi.disabilityStatus}
            onChange={(e) => {
              const val = e.target.value
              // Clear disability sub-fields when status cleared
              if (!val || val === 'N') {
                patch({
                  disabilityStatus: val,
                  typeOfDisability: '',
                  certificateId: '',
                  disabilityCertStartDate: null,
                  disabilityCertEndDate: null,
                })
              } else {
                patch({ disabilityStatus: val })
              }
            }}
            className="cnext-input w-full"
          >
            <option value="">— เลือก / Select —</option>
            <option value="Y">มีความพิการ / Yes</option>
            <option value="N">ไม่มีความพิการ / No</option>
          </select>
        </fieldset>

        {/* ประเภทความพิการ — SF: genericString2 (conditional: Disability Status = Y) */}
        {showDisabilityFields && (
          <fieldset>
            <label htmlFor="gi-disability-type" className="cnext-label">
              ประเภทความพิการ / Type of Disability
            </label>
            <input
              id="gi-disability-type"
              type="text"
              placeholder="ระบุประเภทความพิการ"
              value={gi.typeOfDisability}
              onChange={(e) => patch({ typeOfDisability: e.target.value })}
              className="cnext-input w-full"
            />
          </fieldset>
        )}

        {/* เลขที่บัตรผู้พิการ — SF: genericString4 */}
        {showDisabilityFields && (
          <fieldset>
            <label htmlFor="gi-cert-id" className="cnext-label">
              เลขที่บัตรผู้พิการ / Disability Certificate ID
            </label>
            <input
              id="gi-cert-id"
              type="text"
              placeholder="เลขที่ใบรับรองความพิการ"
              value={gi.certificateId}
              onChange={(e) => patch({ certificateId: e.target.value })}
              className="cnext-input w-full"
            />
          </fieldset>
        )}

        {/* วันที่เริ่มบัตรผู้พิการ — SF: customDate1 */}
        {showDisabilityFields && (
          <fieldset>
            <label htmlFor="gi-cert-start" className="cnext-label">
              วันที่ออกบัตรผู้พิการ / Disability Cert Start Date
            </label>
            <input
              id="gi-cert-start"
              type="date"
              value={gi.disabilityCertStartDate ?? ''}
              onChange={(e) => patch({ disabilityCertStartDate: e.target.value || null })}
              className="cnext-input w-full"
            />
          </fieldset>
        )}

        {/* วันที่หมดอายุบัตรผู้พิการ — SF: customDate2 */}
        {showDisabilityFields && (
          <fieldset>
            <label htmlFor="gi-cert-end" className="cnext-label">
              วันที่หมดอายุบัตรผู้พิการ / Disability Cert End Date
            </label>
            <input
              id="gi-cert-end"
              type="date"
              value={gi.disabilityCertEndDate ?? ''}
              onChange={(e) => patch({ disabilityCertEndDate: e.target.value || null })}
              className="cnext-input w-full"
            />
          </fieldset>
        )}

        {/* STA-81: เอกสารแนบ (สถานะความพิการ) — shown only when disabilityStatus = Y */}
        {showDisabilityFields && (
          <fieldset className="md:col-span-2">
            <AttachmentDropzone
              id="gi-disability-attachment"
              files={disabilityAttachmentFiles}
              onFilesChange={handleDisabilityAttachmentChange}
              label={t('disabilityAttachment')}
              maxFiles={5}
              maxSizeMB={10}
            />
          </fieldset>
        )}

        {/* เลขประจำตัวบิดาของคู่สมรส — SF: genericNumber4 (stored as string, 13-digit) */}
        <fieldset>
          <label htmlFor="gi-spouse-father-id" className="cnext-label">
            เลขบัตรบิดาของคู่สมรส / Spouse Father ID Number
          </label>
          <input
            id="gi-spouse-father-id"
            type="text"
            inputMode="numeric"
            maxLength={13}
            placeholder="เลข 13 หลัก"
            value={gi.spouseFatherIdNumber}
            onChange={(e) => patch({ spouseFatherIdNumber: e.target.value.replace(/\D/g, '').slice(0, 13) })}
            className="cnext-input w-full"
          />
        </fieldset>

        {/* เลขประจำตัวมารดาของคู่สมรส — SF: genericNumber5 (stored as string, 13-digit) */}
        <fieldset>
          <label htmlFor="gi-spouse-mother-id" className="cnext-label">
            เลขบัตรมารดาของคู่สมรส / Spouse Mother ID Number
          </label>
          <input
            id="gi-spouse-mother-id"
            type="text"
            inputMode="numeric"
            maxLength={13}
            placeholder="เลข 13 หลัก"
            value={gi.spouseMotherIdNumber}
            onChange={(e) => patch({ spouseMotherIdNumber: e.target.value.replace(/\D/g, '').slice(0, 13) })}
            className="cnext-input w-full"
          />
        </fieldset>

      </div>

      {/* ข้อมูลเพิ่มเติม — SF: customString2 (full-width textarea) */}
      <fieldset className="flex flex-col gap-2">
        <label htmlFor="gi-additional-info" className="cnext-label">
          ข้อมูลเพิ่มเติม / Additional Information
        </label>
        <textarea
          id="gi-additional-info"
          rows={3}
          maxLength={256}
          placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"
          value={gi.additionalInformation}
          onChange={(e) => patch({ additionalInformation: e.target.value })}
          className="cnext-textarea cnext-input--wide w-full resize-none"
        />
      </fieldset>

    </div>
  )
}
