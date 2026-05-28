'use client'

// StepJob.tsx — Step 7: ข้อมูลงาน
// Phase 3: EmpJob 38 mandatory fields — extended UI
// Area B: PositionLookup + cascade (BRD #95) + readonly org chips
// Fields: PositionLookup (required) + storeBranchCode (optional) + hrDistrict (optional)
// Cascade → readonly: businessUnit, branch, job, jobGrade
// Manual (not in PositionCascade): Division, JobFunction, CorporateTitle
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useHireWizard } from '@/lib/admin/store/useHireWizard'
import { stepJobSchema } from '@/lib/admin/validation/hireSchema'
import PositionLookup from '@/components/admin/PositionLookup'
import {
  AttachmentDropzone,
  type AttachedFile,
} from '@/components/admin/AttachmentDropzone/AttachmentDropzone'
import {
  attachmentNameFromFiles,
  filesFromAttachmentName,
} from '@/components/admin/AttachmentDropzone/attachmentFiles'
import { MOCK_POSITION_MASTER } from '@/lib/admin/mock/positions'
import type { Position, PositionCascade } from '@/lib/admin/types/position'
import { WORK_LOCATION_CODES } from '@/lib/admin/hire/picklists/workLocation'

// Phase 3 small picklists — hardcoded from zPolicyProfile (27 opts), zNewCorporateTitle (18 opts),
// contractType (7 opts), EmploymentType (50 opts), zSection (125 opts)
// Source: sf-extract/qas-fields-2026-04-25/sf-qas-picklist-options-LINKED-2026-04-26.json
const POLICY_PROFILE_OPTIONS = [
  'SCM','PWB','OFM','CRG','CPN','CMG','CHR','CHG','CFR','CFM',
  'B2S','SSP','RBS','CDS','999','SU-CMC & SDO','SU-MA','SU-INTERNAL AUDIT',
  'SU-CIS','SU-T1C','SU-CNG','SU-CGO','SU-OTHER','SU-FAST','SU-BD','SU-RIS','SU-HR',
] as const

const CORPORATE_TITLE_OPTIONS = [
  '111','L90','L80','L70','L60','L50','L40','L30','L20','L10',
  'S70','S60','S50','S40','S30','S20','S10','999',
] as const

const CONTRACT_TYPE_OPTIONS = ['R1','C1','C2','C3','C4','C5','V1'] as const

const EMPLOYMENT_TYPE_OPTIONS = [
  '7','8','9','07','08','09','10','11','12','13','14','15','16','17','18','19',
  '20','21','22','23','24','25','26','27','C1','C2','C3','C4','C5','C6',
  'D1','D2','P1','P2','P3','P5','T1','T2','T3','UC','X7','X8','X9','XA','XB',
  'Y7','Y8','Y9','YA','YB',
] as const

// HR District legacy options (kept from Phase 2 — SF customString25 free-text but with known sample codes)
const HR_DISTRICT_OPTIONS = [
  { value: 'D-BKK-1', label: 'D-BKK-1 — กรุงเทพ โซน 1' },
  { value: 'D-BKK-2', label: 'D-BKK-2 — กรุงเทพ โซน 2' },
  { value: 'D-CNX-N', label: 'D-CNX-N — เชียงใหม่ / ภาคเหนือ' },
  { value: 'D-UPC-N', label: 'D-UPC-N — ต่างจังหวัด ภาคเหนือ' },
  { value: 'D-EAS-E', label: 'D-EAS-E — ภาคตะวันออก' },
]

export interface StepJobProps {
  onValidChange?: (isValid: boolean) => void
}

export default function StepJob({ onValidChange }: StepJobProps) {
  const t = useTranslations('hireForm.job')
  const { formData, setStepData } = useHireWizard()
  const job = formData.job

  // Find initial Position object matching stored position code (controlled mode)
  const initialPosition = job.position
    ? MOCK_POSITION_MASTER.find((p) => p.code === job.position) ?? null
    : null
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(initialPosition)

  // Work Location (customString7) — replaces old 8-option STORE_BRANCH_OPTIONS
  const [storeBranchCode, setStoreBranchCode] = useState<string>(job.storeBranchCode ?? '')
  const [hrDistrict, setHrDistrict]           = useState<string>(job.hrDistrict ?? '')

  // Time Information state (Area C — SF Image 15)
  const [workSchedule,        setWorkSchedule]        = useState<string>(job.workSchedule ?? '')
  const [holidayTypeCondition,setHolidayTypeCondition]= useState<string>(job.holidayTypeCondition ?? '')
  const [timeManagementStatus,setTimeManagementStatus]= useState<string>(job.timeManagementStatus ?? '')
  const [otFlag,              setOtFlag]              = useState<string>(job.otFlag ?? '')
  const [standardWeeklyHours, setStandardWeeklyHours] = useState<number>(job.standardWeeklyHours ?? 40)
  const [overrideStandardWeeklyHours, setOverrideStandardWeeklyHours] = useState<boolean>(job.overrideStandardWeeklyHours ?? false)
  const [dayOffType,          setDayOffType]          = useState<string>(job.dayOffType ?? '')
  const [dailyWorkingHours,   setDailyWorkingHours]   = useState<number>(job.dailyWorkingHours ?? 8)
  const [workingDaysPerWeek,  setWorkingDaysPerWeek]  = useState<number>(job.workingDaysPerWeek ?? 5)
  const [fte,                 setFte]                 = useState<number>(job.fte ?? 1)
  const [holidayCalendar,     setHolidayCalendar]     = useState<string>(job.holidayCalendar ?? '')
  const [timeProfile,         setTimeProfile]         = useState<string>(job.timeProfile ?? '')
  const [timeRecordingVariant,setTimeRecordingVariant]= useState<string>(job.timeRecordingVariant ?? '')
  const [showAdvanced,        setShowAdvanced]        = useState(false)

  // Phase 3: Job Org fields
  const [department,       setDepartment]       = useState<string>(job.department ?? '')
  const [division,         setDivision]         = useState<string>(job.division ?? '')
  const [costCenter,       setCostCenter]       = useState<string>(job.costCenter ?? '')
  const [jobFunction,      setJobFunction]      = useState<string>(job.jobFunction ?? '')
  const [corporateTitle,   setCorporateTitle]   = useState<string>(job.corporateTitle ?? '')

  // Phase 3: Classification fields
  const [policyProfile,     setPolicyProfile]     = useState<string>(job.policyProfile ?? '')
  const [ssoLocation,       setSsoLocation]       = useState<string>(job.ssoLocation ?? '')
  const [groupCompanyGroup, setGroupCompanyGroup] = useState<string>(job.groupCompanyGroup ?? '')
  const [contractType,      setContractType]      = useState<string>(job.contractType ?? '')
  const [zone,              setZone]              = useState<string>(job.zone ?? '')
  const [employmentType,    setEmploymentType]    = useState<string>(job.employmentType ?? '')
  const [contractEndDate,   setContractEndDate]   = useState<string>(job.contractEndDate ?? '')
  const [probationEndDate,  setProbationEndDate]  = useState<string>(job.probationEndDate ?? '')
  const [attachmentFiles,   setAttachmentFiles]   = useState<AttachedFile[]>(
    () => filesFromAttachmentName(job.attachmentName, 'job-existing'),
  )

  // STA-82: additional spec fields — Job Information
  const [jobRole,               setJobRole]               = useState<string>(job.jobRole ?? '')
  const [jobType,               setJobType]               = useState<string>(job.jobType ?? '')
  const [personnelGrade,        setPersonnelGrade]        = useState<string>(job.personnelGrade ?? '')
  const [bandMatching,          setBandMatching]          = useState<string>(job.bandMatching ?? '')
  const [band,                  setBand]                  = useState<string>(job.band ?? '')
  const [transferOutTo,         setTransferOutTo]         = useState<string>(job.transferOutTo ?? '')
  const [transferInTo,          setTransferInTo]          = useState<string>(job.transferInTo ?? '')
  const [transferFrom,          setTransferFrom]          = useState<string>(job.transferFrom ?? '')
  const [specialBenefitGroup,   setSpecialBenefitGroup]   = useState<string>(job.specialBenefitGroup ?? '')
  const [okToRehire,            setOkToRehire]            = useState<string>(job.okToRehire ?? '')
  // DVT subsection
  const [dvtProjectName,        setDvtProjectName]        = useState<string>(job.dvtProjectName ?? '')
  const [dvtType,               setDvtType]               = useState<string>(job.dvtType ?? '')
  const [dvtCourse,             setDvtCourse]             = useState<string>(job.dvtCourse ?? '')
  const [dvtCourseOfTime,       setDvtCourseOfTime]       = useState<string>(job.dvtCourseOfTime ?? '')
  const [dvtAcademicYear,       setDvtAcademicYear]       = useState<string>(job.dvtAcademicYear ?? '')
  const [dvtGraduationDate,     setDvtGraduationDate]     = useState<string>(job.dvtGraduationDate ?? '')
  const [dvtBondingEndDate,     setDvtBondingEndDate]     = useState<string>(job.dvtBondingEndDate ?? '')
  const [scholarship,           setScholarship]           = useState<string>(job.scholarship ?? '')
  const [probationaryPeriodEndDate, setProbationaryPeriodEndDate] = useState<string>(job.probationaryPeriodEndDate ?? '')
  const [extendedProbationDate, setExtendedProbationDate] = useState<string>(job.extendedProbationDate ?? '')
  // Organisation Information
  const [pointOfSales,          setPointOfSales]          = useState<string>(job.pointOfSales ?? '')
  const [storeBrandFormat,      setStoreBrandFormat]      = useState<string>(job.storeBrandFormat ?? '')
  const [brand,                 setBrand]                 = useState<string>(job.brand ?? '')
  const [workLocation,          setWorkLocation]          = useState<string>(job.workLocation ?? '')

  // Compute FTE when standard weekly hours change
  useEffect(() => {
    const computed = standardWeeklyHours > 0 ? standardWeeklyHours / 40 : 0
    setFte(parseFloat(computed.toFixed(2)))
  }, [standardWeeklyHours])

  // Sync Time Information to store
  useEffect(() => {
    setStepData('job', {
      workSchedule,
      holidayTypeCondition,
      timeManagementStatus,
      otFlag,
      standardWeeklyHours,
      overrideStandardWeeklyHours,
      dayOffType,
      dailyWorkingHours,
      workingDaysPerWeek,
      fte,
      holidayCalendar,
      timeProfile,
      timeRecordingVariant,
    })
  }, [workSchedule, holidayTypeCondition, timeManagementStatus, otFlag, standardWeeklyHours,
      overrideStandardWeeklyHours, dayOffType, dailyWorkingHours, workingDaysPerWeek, fte,
      holidayCalendar, timeProfile, timeRecordingVariant, setStepData])

  // Sync Phase 3 Job Org fields to store
  useEffect(() => {
    setStepData('job', {
      department: department || null,
      division: division || null,
      costCenter: costCenter || null,
      jobFunction: jobFunction || null,
      corporateTitle: corporateTitle || null,
    })
  }, [department, division, costCenter, jobFunction, corporateTitle, setStepData])

  // Sync Phase 3 Classification fields to store
  useEffect(() => {
    setStepData('job', {
      policyProfile: policyProfile || null,
      ssoLocation: ssoLocation || null,
      groupCompanyGroup: groupCompanyGroup || null,
      contractType: contractType || null,
      zone: zone || null,
      employmentType: employmentType || null,
      contractEndDate: contractEndDate || null,
      probationEndDate: probationEndDate || null,
    })
  }, [policyProfile, ssoLocation, groupCompanyGroup, contractType, zone, employmentType,
      contractEndDate, probationEndDate, setStepData])

  // Sync STA-82 fields to store
  useEffect(() => {
    setStepData('job', {
      jobRole: jobRole || null,
      jobType: jobType || null,
      personnelGrade: personnelGrade || null,
      bandMatching: bandMatching || null,
      band: band || null,
      transferOutTo: transferOutTo || null,
      transferInTo: transferInTo || null,
      transferFrom: transferFrom || null,
      specialBenefitGroup: specialBenefitGroup || null,
      okToRehire: okToRehire || null,
      dvtProjectName: dvtProjectName || null,
      dvtType: dvtType || null,
      dvtCourse: dvtCourse || null,
      dvtCourseOfTime: dvtCourseOfTime || null,
      dvtAcademicYear: dvtAcademicYear || null,
      dvtGraduationDate: dvtGraduationDate || null,
      dvtBondingEndDate: dvtBondingEndDate || null,
      scholarship: scholarship || null,
      probationaryPeriodEndDate: probationaryPeriodEndDate || null,
      extendedProbationDate: extendedProbationDate || null,
      pointOfSales: pointOfSales || null,
      storeBrandFormat: storeBrandFormat || null,
      brand: brand || null,
      workLocation: workLocation || null,
    })
  }, [jobRole, jobType, personnelGrade, bandMatching, band,
      transferOutTo, transferInTo, transferFrom, specialBenefitGroup, okToRehire,
      dvtProjectName, dvtType, dvtCourse, dvtCourseOfTime, dvtAcademicYear,
      dvtGraduationDate, dvtBondingEndDate, scholarship, probationaryPeriodEndDate,
      extendedProbationDate, pointOfSales, storeBrandFormat, brand, workLocation, setStepData])

  const validate = useCallback(
    (positionCode: string, bu: string | null) => {
      const result = stepJobSchema.safeParse({
        position: positionCode || undefined,
        businessUnit: bu || undefined,
      })
      if (result.success) {
        onValidChange?.(true)
      } else {
        onValidChange?.(false)
      }
    },
    [onValidChange],
  )

  useEffect(() => {
    validate(job.position, job.businessUnit)
  }, [job.position, job.businessUnit, validate])

  // ── handleCascade: called by PositionLookup on select/clear ──────────────────
  const handleCascade = useCallback(
    (cascade: PositionCascade | null) => {
      if (!cascade) {
        setSelectedPosition(null)
        setStepData('job', {
          position: '',
          businessUnit: null,
          businessUnitLabel: null,
          branch: null,
          branchLabel: null,
          jobCode: null,
          jobLabel: null,
          jobGrade: null,
          jobGradeLabel: null,
          hrDistrict: null,
          supervisorId: null,
          supervisorLabel: null,
        })
        return
      }
      // Resolve full Position object for controlled value prop
      const pos = MOCK_POSITION_MASTER.find((p) => p.code === cascade.code) ?? null
      setSelectedPosition(pos)
      setStepData('job', {
        position: cascade.code,
        businessUnit: cascade.businessUnit,
        businessUnitLabel: cascade.businessUnitLabel,
        branch: cascade.branch ?? null,
        branchLabel: cascade.branchLabel ?? null,
        jobCode: cascade.job,
        jobLabel: cascade.jobLabel,
        jobGrade: cascade.jobGrade,
        jobGradeLabel: cascade.jobGradeLabel,
        hrDistrict: cascade.hrDistrict ?? null,
        supervisorId: cascade.managerPositionCode ?? null,
        supervisorLabel: cascade.managerPositionLabel ?? null,
      })
    },
    [setStepData],
  )

  function handleAttachmentFilesChange(files: AttachedFile[]) {
    setAttachmentFiles(files)
    setStepData('job', {
      attachmentName: attachmentNameFromFiles(files) || null,
    })
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
      {/* ตำแหน่งงาน — PositionLookup (BRD #95 cascade) */}
      <div className="md:col-span-2">
        <PositionLookup
          id="hire-position-lookup"
          positionMaster={MOCK_POSITION_MASTER}
          value={selectedPosition}
          onSelect={handleCascade}
          required
          label={t('position')}
        />
      </div>

      {/* หน่วยธุรกิจ — readonly after cascade */}
      <fieldset>
        <label className="humi-label">
          {t('businessUnit')}
          <span className="text-xs text-ink-muted ml-1">{t('fromPosition')}</span>
        </label>
        <div className="humi-input w-full bg-canvas-soft text-ink-muted">
          {job.businessUnitLabel || job.businessUnit || '—'}
        </div>
      </fieldset>

      {/* สาขา/สถานที่ — readonly after cascade */}
      <fieldset>
        <label className="humi-label">
          {t('branch')}
          <span className="text-xs text-ink-muted ml-1">{t('fromPosition')}</span>
        </label>
        <div className="humi-input w-full bg-canvas-soft text-ink-muted">
          {job.branchLabel || job.branch || '—'}
        </div>
      </fieldset>

      {/* รหัสงาน / Job Code — readonly after cascade */}
      <fieldset>
        <label className="humi-label">
          {t('jobCode')}
          <span className="text-xs text-ink-muted ml-1">{t('fromPosition')}</span>
        </label>
        <div className="humi-input w-full bg-canvas-soft text-ink-muted">
          {job.jobLabel || job.jobCode || '—'}
        </div>
      </fieldset>

      {/* เกรดงาน — readonly after cascade */}
      <fieldset>
        <label className="humi-label">
          {t('jobGrade')}
          <span className="text-xs text-ink-muted ml-1">{t('fromPosition')}</span>
        </label>
        <div className="humi-input w-full bg-canvas-soft text-ink-muted">
          {job.jobGradeLabel
            ? `${job.jobGrade} — ${job.jobGradeLabel}`
            : job.jobGrade || '—'}
        </div>
      </fieldset>

      {/* Work Location (customString7) — full 963-option cust_WorkLocation picklist via datalist */}
      {/* Replaces old 8-option STORE_BRANCH_OPTIONS hardcode */}
      <fieldset>
        <label htmlFor="store-branch-code" className="humi-label">
          {t('storeBranchCode')}
        </label>
        <input
          id="store-branch-code"
          list="work-location-list"
          value={storeBranchCode}
          onChange={(e) => {
            setStoreBranchCode(e.target.value)
            setStepData('job', { storeBranchCode: e.target.value || null })
          }}
          placeholder="พิมพ์เพื่อค้นหา Work Location..."
          className="humi-input w-full"
          autoComplete="off"
        />
        <datalist id="work-location-list">
          {WORK_LOCATION_CODES.map((code) => (
            <option key={code} value={code} />
          ))}
        </datalist>
      </fieldset>

      {/* HR District — customString25 — manual override or cascaded from Position */}
      <fieldset>
        <label htmlFor="hr-district" className="humi-label">{t('hrDistrict')}</label>
        <select
          id="hr-district"
          value={hrDistrict}
          onChange={(e) => {
            setHrDistrict(e.target.value)
            setStepData('job', { hrDistrict: e.target.value || null })
          }}
          className="humi-select w-full"
        >
          <option value="">{t('selectHrDistrict')}</option>
          {HR_DISTRICT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </fieldset>

      {/* Supervisor ID — auto-derived from Position FO reporting line */}
      <fieldset>
        <label className="humi-label">
          {t('supervisorId')}
          <span className="text-xs text-ink-muted ml-1">{t('fromPosition')}</span>
        </label>
        <div className="humi-input w-full bg-canvas-soft text-ink-muted">
          {job.supervisorId
            ? `${job.supervisorId}${job.supervisorLabel ? ` — ${job.supervisorLabel}` : ''}`
            : '—'}
        </div>
      </fieldset>

      {/* ── Phase 3: Job Organisation (SF EmpJob mandatory) ─────────────────────── */}
      <fieldset className="md:col-span-2 mt-4 pt-4 border-t border-hairline-soft">
        <legend className="humi-section-legend text-sm font-semibold text-ink mb-3">
          Job Organisation / หน่วยองค์กร
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          {/* Department (SF: EmpJob.department = Organization) */}
          <fieldset>
            <label htmlFor="department" className="humi-label">
              Department / Organization<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <input
              id="department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="รหัส department (เช่น D-RETAIL-OPS)"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Division (SF: EmpJob.division = Function) — was unstored in pre-Phase3 */}
          <fieldset>
            <label htmlFor="division" className="humi-label">
              Division / Function<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <input
              id="division"
              type="text"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              placeholder="รหัส division (เช่น DIV-RETAIL)"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Cost Center (SF: EmpJob.costCenter) */}
          <fieldset>
            <label htmlFor="cost-center" className="humi-label">
              Cost Center<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <input
              id="cost-center"
              type="text"
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value)}
              placeholder="รหัส cost center (เช่น CC-1001)"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Job Family (SF: EmpJob.customString21) — was unstored in pre-Phase3 */}
          <fieldset>
            <label htmlFor="job-function" className="humi-label">
              Job Family<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
              {/* TODO Phase 0.4 — picklist binding TBD; use free-text for now */}
            </label>
            <input
              id="job-function"
              type="text"
              value={jobFunction}
              onChange={(e) => setJobFunction(e.target.value)}
              placeholder="Job Family code"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Corporate Title (SF: EmpJob.customString5) — zNewCorporateTitle 18 opts */}
          {/* NOTE: stakeholder to confirm zNewCorporateTitle vs zCorporateTitle (legacy) */}
          <fieldset>
            <label htmlFor="corporate-title" className="humi-label">
              Corporate Title
            </label>
            <select
              id="corporate-title"
              value={corporateTitle}
              onChange={(e) => setCorporateTitle(e.target.value)}
              className="humi-select w-full"
            >
              <option value="">— เลือก Corporate Title —</option>
              {CORPORATE_TITLE_OPTIONS.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </fieldset>

          {/* Policy Profile (SF: EmpJob.customString1) — zPolicyProfile 27 opts */}
          <fieldset>
            <label htmlFor="policy-profile" className="humi-label">
              Policy Profile<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <select
              id="policy-profile"
              value={policyProfile}
              onChange={(e) => setPolicyProfile(e.target.value)}
              className="humi-select w-full"
            >
              <option value="">— เลือก Policy Profile —</option>
              {POLICY_PROFILE_OPTIONS.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </fieldset>

        </div>
      </fieldset>

      {/* ── ตั้งค่าขั้นสูง toggle ── */}
      <div className="md:col-span-2 mt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="text-small text-accent underline-offset-2 hover:underline flex items-center gap-1 mb-3"
        >
          {showAdvanced ? 'ซ่อนการตั้งค่าขั้นสูง' : 'ดูการตั้งค่าขั้นสูง (Time, FTE)'}
        </button>
        {showAdvanced && (
          <>
            {/* ── Time Information (Area C — SF Image 15) ────────────────────────── */}
            <fieldset className="md:col-span-2 mt-4 pt-4 border-t border-hairline-soft">
              <legend className="humi-section-legend text-sm font-semibold text-ink mb-3">{t('timeInfoSection')}</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

                {/* ตารางการทำงาน */}
                <fieldset>
                  <label htmlFor="work-schedule" className="humi-label">
                    {t('workSchedule')}<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
                  </label>
                  <select
                    id="work-schedule"
                    value={workSchedule}
                    onChange={(e) => setWorkSchedule(e.target.value)}
                    className="humi-select w-full"
                  >
                    <option value="">{t('selectWorkSchedule')}</option>
                    <option value="D05H0800">D05H0800 (มาตรฐาน 5 วัน × 8 ชั่วโมง)</option>
                    <option value="D06H0700">D06H0700 (6 วัน × 7 ชั่วโมง)</option>
                    <option value="D05H0900">D05H0900 (5 วัน × 9 ชั่วโมง)</option>
                  </select>
                </fieldset>

                {/* ประเภทวันหยุด */}
                <fieldset>
                  <label htmlFor="holiday-type" className="humi-label">
                    {t('holidayTypeCondition')}<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
                  </label>
                  <select
                    id="holiday-type"
                    value={holidayTypeCondition}
                    onChange={(e) => setHolidayTypeCondition(e.target.value)}
                    className="humi-select w-full"
                  >
                    <option value="">{t('selectHolidayType')}</option>
                    <option value="HO">HO (ปฏิทินสำนักงานใหญ่)</option>
                    <option value="STORE">STORE (ปฏิทินสาขา)</option>
                    <option value="CALL_CENTER">CALL_CENTER (ปฏิทิน call center)</option>
                  </select>
                </fieldset>

                {/* สถานะจัดการเวลา */}
                <fieldset>
                  <label htmlFor="time-mgmt-status" className="humi-label">
                    {t('timeManagementStatus')}<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
                  </label>
                  <select
                    id="time-mgmt-status"
                    value={timeManagementStatus}
                    onChange={(e) => setTimeManagementStatus(e.target.value)}
                    className="humi-select w-full"
                  >
                    <option value="">{t('selectTimeManagement')}</option>
                    <option value="9">9 — Time Eval (มาตรฐาน)</option>
                    <option value="7">7 — PDC</option>
                    <option value="0">0 — ไม่มี</option>
                  </select>
                </fieldset>

                {/* สถานะ OT */}
                <fieldset>
                  <label htmlFor="ot-flag" className="humi-label">
                    {t('otFlag')}<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
                  </label>
                  <select
                    id="ot-flag"
                    value={otFlag}
                    onChange={(e) => setOtFlag(e.target.value)}
                    className="humi-select w-full"
                  >
                    <option value="">{t('selectOtFlag')}</option>
                    <option value="YES">{t('otYes')}</option>
                    <option value="NO">{t('otNo')}</option>
                  </select>
                </fieldset>

                {/* ชั่วโมงทำงานต่อสัปดาห์ */}
                <fieldset>
                  <label htmlFor="weekly-hours" className="humi-label">{t('standardWeeklyHours')}</label>
                  <input
                    id="weekly-hours"
                    type="number"
                    min={0}
                    max={168}
                    value={standardWeeklyHours}
                    onChange={(e) => setStandardWeeklyHours(Number(e.target.value))}
                    className="humi-input w-full"
                  />
                </fieldset>

                {/* Override Standard Weekly Hours */}
                <fieldset>
                  <label htmlFor="override-weekly-hours" className="humi-label">{t('overrideStandardWeeklyHours')}</label>
                  <select
                    id="override-weekly-hours"
                    value={overrideStandardWeeklyHours ? 'YES' : 'NO'}
                    onChange={(e) => setOverrideStandardWeeklyHours(e.target.value === 'YES')}
                    className="humi-select w-full"
                  >
                    <option value="NO">{t('overrideNo')}</option>
                    <option value="YES">{t('overrideYes')}</option>
                  </select>
                </fieldset>

                {/* Day off Type */}
                <fieldset>
                  <label htmlFor="day-off-type" className="humi-label">{t('dayOffType')}</label>
                  <select
                    id="day-off-type"
                    value={dayOffType}
                    onChange={(e) => setDayOffType(e.target.value)}
                    className="humi-select w-full"
                  >
                    <option value="">{t('selectDayOffType')}</option>
                    <option value="FIXED">{t('dayOffFixed')}</option>
                    <option value="SHIFT">{t('dayOffShift')}</option>
                    <option value="ROTATION">{t('dayOffRotation')}</option>
                  </select>
                </fieldset>

                {/* ชั่วโมงทำงานต่อวัน (SF: EmpJob.customDouble1 — Daily Working Hours) */}
                <fieldset>
                  <label htmlFor="daily-hours" className="humi-label">{t('dailyWorkingHours')}</label>
                  <input
                    id="daily-hours"
                    type="number"
                    min={0}
                    max={24}
                    value={dailyWorkingHours}
                    onChange={(e) => setDailyWorkingHours(Number(e.target.value))}
                    className="humi-input w-full"
                  />
                </fieldset>

                {/* วันทำงานต่อสัปดาห์ */}
                <fieldset>
                  <label htmlFor="work-days" className="humi-label">{t('workingDaysPerWeek')}</label>
                  <input
                    id="work-days"
                    type="number"
                    min={0}
                    max={7}
                    value={workingDaysPerWeek}
                    onChange={(e) => setWorkingDaysPerWeek(Number(e.target.value))}
                    className="humi-input w-full"
                  />
                </fieldset>

                {/* FTE (computed) */}
                <fieldset>
                  <label htmlFor="fte" className="humi-label">
                    {t('fte')} <span className="text-xs text-ink-muted ml-1">{t('fteHint')}</span>
                  </label>
                  <input
                    id="fte"
                    type="number"
                    value={fte}
                    readOnly
                    className="humi-input w-full bg-canvas-soft"
                  />
                </fieldset>

                {/* ปฏิทินวันหยุด */}
                <fieldset>
                  <label htmlFor="holiday-cal" className="humi-label">{t('holidayCalendar')}</label>
                  <select
                    id="holiday-cal"
                    value={holidayCalendar}
                    onChange={(e) => setHolidayCalendar(e.target.value)}
                    className="humi-select w-full"
                  >
                    <option value="">{t('selectHolidayCalendar')}</option>
                    <option value="TH_PUBLIC">ปฏิทินวันหยุดราชการไทย</option>
                    <option value="CG_CORP">ปฏิทิน Central Group Corporate</option>
                  </select>
                </fieldset>

                {/* Time Profile */}
                <fieldset>
                  <label htmlFor="time-profile" className="humi-label">{t('timeProfile')}</label>
                  <select
                    id="time-profile"
                    value={timeProfile}
                    onChange={(e) => setTimeProfile(e.target.value)}
                    className="humi-select w-full"
                  >
                    <option value="">{t('selectTimeProfile')}</option>
                    <option value="TP_STD">TP_STD — มาตรฐาน</option>
                    <option value="TP_FLEX">TP_FLEX — Flexible</option>
                    <option value="TP_SHIFT">TP_SHIFT — กะ</option>
                  </select>
                </fieldset>

                {/* รูปแบบการบันทึกเวลา */}
                <fieldset>
                  <label htmlFor="time-variant" className="humi-label">{t('timeRecordingVariant')}</label>
                  <select
                    id="time-variant"
                    value={timeRecordingVariant}
                    onChange={(e) => setTimeRecordingVariant(e.target.value)}
                    className="humi-select w-full"
                  >
                    <option value="">{t('selectTimeVariant')}</option>
                    <option value="01">01 — ระบบสแกนนิ้ว</option>
                    <option value="02">02 — Clock-in app</option>
                    <option value="03">03 — Manual</option>
                  </select>
                </fieldset>

              </div>
            </fieldset>
          </>
        )}
      </div>

      {/* ── Phase 3: Classification / Identifiers ───────────────────────────────── */}
      <fieldset className="md:col-span-2 mt-4 pt-4 border-t border-hairline-soft">
        <legend className="humi-section-legend text-sm font-semibold text-ink mb-3">
          Classification / ประเภทการจ้าง
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          {/* Employee Group — customString2 — read from employeeInfo slice (already in store) */}
          <fieldset>
            <label className="humi-label">
              Employee Group
              <span className="text-xs text-ink-muted ml-1">จาก Employee Info</span>
            </label>
            <div className="humi-input w-full bg-canvas-soft text-ink-muted">
              {formData.employeeInfo.employeeGroup || '—'}
            </div>
          </fieldset>

          {/* Employee Subgroup — customString3 — read from employeeInfo slice */}
          <fieldset>
            <label className="humi-label">
              Employee Subgroup
              <span className="text-xs text-ink-muted ml-1">จาก Employee Info</span>
            </label>
            <div className="humi-input w-full bg-canvas-soft text-ink-muted">
              {formData.employeeInfo.employeeSubGroup || '—'}
            </div>
          </fieldset>

          {/* Group / Company Group (SF: EmpJob.customString16) — zSection 125 opts */}
          <fieldset>
            <label htmlFor="group-company" className="humi-label">
              Group / Company Group<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <input
              id="group-company"
              list="section-list"
              value={groupCompanyGroup}
              onChange={(e) => setGroupCompanyGroup(e.target.value)}
              placeholder="พิมพ์รหัส Section (เช่น S00001)"
              className="humi-input w-full"
              autoComplete="off"
            />
            <datalist id="section-list">
              {/* zSection 125 opts — inline for simplicity; Phase 4+ may convert to remote search */}
              {['S00001','S00002','S00003','S00004','S00005','S00006','S00007','S00008','S00009','S00010',
                'S00011','S00012','S00013','S00014','S00015','S00016','S00017','S00018','S00019','S00020',
                'S00021','S00022','S00023','S00024','S00025','S00026','S00027','S00028','S00029','S00030',
                'S00031','S00032','S00033','S00034','S00035','S00036','S00037','S00038','S00039','S00040',
                'S00041','S00042','S00043','S00044','S00045','S00046','S00047','S00048','S00049','S00050',
                'S00051','S00052','S00053','S00054','S00055','S00056','S00057','S00058','S00059','S00060',
                'S00061','S00062','S00063','S00064','S00065','S00066','S00067','S00068','S00069','S00070',
                'S00071','S00072','S00073','S00074','S00075','S00076','S00077','S00078','S00079','S00080',
                'S00081','S00082','S00083','S00084','S00085','S00086','S00087','S00088','S00089','S00090',
                'S00091','S00092','S00093','S00094','S00095','S00096','S00097','S00098','S00099','S00100',
                'S00101','S00102','S00103','S00104','S00105','S00106','S00107','S00108','S00109','S00110',
                'S00111','S00112','S00113','S00114','S00115','S00116','S00117','S00118','S00119','S00120',
                'S00121','S00122','S00123','S00124','S00125',
              ].map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
          </fieldset>

          {/* Contract Type (SF: EmpJob.customString24) — contractType 7 opts */}
          <fieldset>
            <label htmlFor="contract-type" className="humi-label">
              Contract Type<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <select
              id="contract-type"
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className="humi-select w-full"
            >
              <option value="">— เลือก Contract Type —</option>
              {CONTRACT_TYPE_OPTIONS.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </fieldset>

          {/* Employment Type (SF: EmpJob.employmentType) — EmploymentType 50 opts */}
          <fieldset>
            <label htmlFor="employment-type" className="humi-label">
              Employment Type
            </label>
            <select
              id="employment-type"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="humi-select w-full"
            >
              <option value="">— เลือก Employment Type —</option>
              {EMPLOYMENT_TYPE_OPTIONS.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </fieldset>

          {/* SSO Location (SF: EmpJob.customString8) — free-text, picklist TBD Phase 0.4 */}
          <fieldset>
            <label htmlFor="sso-location" className="humi-label">
              SSO Location<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
              {/* TODO Phase 0.4 — picklist binding TBD; use free-text for now */}
            </label>
            <input
              id="sso-location"
              type="text"
              value={ssoLocation}
              onChange={(e) => setSsoLocation(e.target.value)}
              placeholder="SSO Location code"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Zone (SF: EmpJob.customString31) — free-text, picklist TBD Phase 0.4 */}
          <fieldset>
            <label htmlFor="zone" className="humi-label">
              Zone<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
              {/* TODO Phase 0.4 — picklist binding TBD; use free-text for now */}
            </label>
            <input
              id="zone"
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Zone code"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Contract End Date */}
          <fieldset>
            <label htmlFor="contract-end" className="humi-label">
              Contract End Date
            </label>
            <input
              id="contract-end"
              type="date"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
              className="humi-input w-full"
            />
          </fieldset>

          {/* Probation End Date */}
          <fieldset>
            <label htmlFor="probation-end" className="humi-label">
              Probation End Date
            </label>
            <input
              id="probation-end"
              type="date"
              value={probationEndDate}
              onChange={(e) => setProbationEndDate(e.target.value)}
              className="humi-input w-full"
            />
          </fieldset>

        </div>
      </fieldset>

      {/* ── STA-82: Job Information additional fields ───────────────────────── */}
      <fieldset className="md:col-span-2 mt-4 pt-4 border-t border-hairline-soft">
        <legend className="humi-section-legend text-sm font-semibold text-ink mb-3">
          ข้อมูลงานเพิ่มเติม / Additional Job Information
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          {/* Job Role */}
          <fieldset>
            <label htmlFor="job-role" className="humi-label">Job Role</label>
            <input
              id="job-role"
              type="text"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="Job Role"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Job Type */}
          <fieldset>
            <label htmlFor="job-type" className="humi-label">Job Type</label>
            <input
              id="job-type"
              type="text"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              placeholder="Job Type"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Personnel Grade */}
          <fieldset>
            <label htmlFor="personnel-grade" className="humi-label">Personnel Grade</label>
            <input
              id="personnel-grade"
              type="text"
              value={personnelGrade}
              onChange={(e) => setPersonnelGrade(e.target.value)}
              placeholder="Personnel Grade"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Band Matching */}
          <fieldset>
            <label htmlFor="band-matching" className="humi-label">Band Matching</label>
            <input
              id="band-matching"
              type="text"
              value={bandMatching}
              onChange={(e) => setBandMatching(e.target.value)}
              placeholder="Band Matching"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Band */}
          <fieldset>
            <label htmlFor="band" className="humi-label">Band</label>
            <input
              id="band"
              type="text"
              value={band}
              onChange={(e) => setBand(e.target.value)}
              placeholder="Band"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Transfer out to (LOV) */}
          <fieldset>
            <label htmlFor="transfer-out-to" className="humi-label">Transfer out to</label>
            <select
              id="transfer-out-to"
              value={transferOutTo}
              onChange={(e) => setTransferOutTo(e.target.value)}
              className="humi-select w-full"
            >
              <option value="">— เลือก —</option>
              <option value="BU-RETAIL">BU-RETAIL</option>
              <option value="BU-FOOD">BU-FOOD</option>
              <option value="BU-PROPERTY">BU-PROPERTY</option>
              <option value="BU-DIGITAL">BU-DIGITAL</option>
              <option value="BU-INTERNATIONAL">BU-INTERNATIONAL</option>
            </select>
          </fieldset>

          {/* Transfer in to (LOV) */}
          <fieldset>
            <label htmlFor="transfer-in-to" className="humi-label">Transfer in to</label>
            <select
              id="transfer-in-to"
              value={transferInTo}
              onChange={(e) => setTransferInTo(e.target.value)}
              className="humi-select w-full"
            >
              <option value="">— เลือก —</option>
              <option value="BU-RETAIL">BU-RETAIL</option>
              <option value="BU-FOOD">BU-FOOD</option>
              <option value="BU-PROPERTY">BU-PROPERTY</option>
              <option value="BU-DIGITAL">BU-DIGITAL</option>
              <option value="BU-INTERNATIONAL">BU-INTERNATIONAL</option>
            </select>
          </fieldset>

          {/* Transfer from */}
          <fieldset>
            <label htmlFor="transfer-from" className="humi-label">Transfer from</label>
            <input
              id="transfer-from"
              type="text"
              value={transferFrom}
              onChange={(e) => setTransferFrom(e.target.value)}
              placeholder="Transfer from"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Special Benefit Group */}
          <fieldset>
            <label htmlFor="special-benefit-group" className="humi-label">Special Benefit Group</label>
            <input
              id="special-benefit-group"
              type="text"
              value={specialBenefitGroup}
              onChange={(e) => setSpecialBenefitGroup(e.target.value)}
              placeholder="Special Benefit Group"
              className="humi-input w-full"
            />
          </fieldset>

          {/* OK to Rehire (LOV Yes/No) */}
          <fieldset>
            <label htmlFor="ok-to-rehire" className="humi-label">OK to Rehire</label>
            <select
              id="ok-to-rehire"
              value={okToRehire}
              onChange={(e) => setOkToRehire(e.target.value)}
              className="humi-select w-full"
            >
              <option value="">— เลือก —</option>
              <option value="YES">Yes / ใช่</option>
              <option value="NO">No / ไม่ใช่</option>
            </select>
          </fieldset>

          {/* Probationary Period End Date */}
          <fieldset>
            <label htmlFor="probationary-period-end-date" className="humi-label">Probationary Period End Date</label>
            <input
              id="probationary-period-end-date"
              type="date"
              value={probationaryPeriodEndDate}
              onChange={(e) => setProbationaryPeriodEndDate(e.target.value)}
              className="humi-input w-full"
            />
          </fieldset>

          {/* Extended Probation Date */}
          <fieldset>
            <label htmlFor="extended-probation-date" className="humi-label">Extended Probation Date</label>
            <input
              id="extended-probation-date"
              type="date"
              value={extendedProbationDate}
              onChange={(e) => setExtendedProbationDate(e.target.value)}
              className="humi-input w-full"
            />
          </fieldset>

        </div>
      </fieldset>

      {/* ── STA-82: DVT Subsection ────────────────────────────────────────────── */}
      <fieldset className="md:col-span-2 mt-4 pt-4 border-t border-hairline-soft">
        <legend className="humi-section-legend text-sm font-semibold text-ink mb-3">
          DVT / ทุนการศึกษา
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          {/* DVT: Project name */}
          <fieldset>
            <label htmlFor="dvt-project-name" className="humi-label">DVT: Project name</label>
            <input
              id="dvt-project-name"
              type="text"
              value={dvtProjectName}
              onChange={(e) => setDvtProjectName(e.target.value)}
              placeholder="DVT Project name"
              className="humi-input w-full"
            />
          </fieldset>

          {/* DVT: Type */}
          <fieldset>
            <label htmlFor="dvt-type" className="humi-label">DVT: Type</label>
            <input
              id="dvt-type"
              type="text"
              value={dvtType}
              onChange={(e) => setDvtType(e.target.value)}
              placeholder="DVT Type"
              className="humi-input w-full"
            />
          </fieldset>

          {/* DVT: Course */}
          <fieldset>
            <label htmlFor="dvt-course" className="humi-label">DVT: Course</label>
            <input
              id="dvt-course"
              type="text"
              value={dvtCourse}
              onChange={(e) => setDvtCourse(e.target.value)}
              placeholder="DVT Course"
              className="humi-input w-full"
            />
          </fieldset>

          {/* DVT: Course of Time */}
          <fieldset>
            <label htmlFor="dvt-course-of-time" className="humi-label">DVT: Course of Time</label>
            <input
              id="dvt-course-of-time"
              type="text"
              value={dvtCourseOfTime}
              onChange={(e) => setDvtCourseOfTime(e.target.value)}
              placeholder="DVT Course of Time"
              className="humi-input w-full"
            />
          </fieldset>

          {/* DVT: Academic Year */}
          <fieldset>
            <label htmlFor="dvt-academic-year" className="humi-label">DVT: Academic Year</label>
            <input
              id="dvt-academic-year"
              type="text"
              value={dvtAcademicYear}
              onChange={(e) => setDvtAcademicYear(e.target.value)}
              placeholder="ปีการศึกษา (เช่น 2568)"
              className="humi-input w-full"
            />
          </fieldset>

          {/* DVT: Graduation Date */}
          <fieldset>
            <label htmlFor="dvt-graduation-date" className="humi-label">DVT: Graduation Date</label>
            <input
              id="dvt-graduation-date"
              type="date"
              value={dvtGraduationDate}
              onChange={(e) => setDvtGraduationDate(e.target.value)}
              className="humi-input w-full"
            />
          </fieldset>

          {/* DVT: Bonding End date */}
          <fieldset>
            <label htmlFor="dvt-bonding-end-date" className="humi-label">DVT: Bonding End date</label>
            <input
              id="dvt-bonding-end-date"
              type="date"
              value={dvtBondingEndDate}
              onChange={(e) => setDvtBondingEndDate(e.target.value)}
              className="humi-input w-full"
            />
          </fieldset>

          {/* Scholarship */}
          <fieldset>
            <label htmlFor="scholarship" className="humi-label">Scholarship</label>
            <input
              id="scholarship"
              type="text"
              value={scholarship}
              onChange={(e) => setScholarship(e.target.value)}
              placeholder="Scholarship"
              className="humi-input w-full"
            />
          </fieldset>

        </div>
      </fieldset>

      {/* ── STA-82: Organisation Information ─────────────────────────────────── */}
      <fieldset className="md:col-span-2 mt-4 pt-4 border-t border-hairline-soft">
        <legend className="humi-section-legend text-sm font-semibold text-ink mb-3">
          Organisation Information / ข้อมูลองค์กร
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          {/* Point of Sales (required) */}
          <fieldset>
            <label htmlFor="point-of-sales" className="humi-label">
              Point of Sales<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <input
              id="point-of-sales"
              type="text"
              value={pointOfSales}
              onChange={(e) => setPointOfSales(e.target.value)}
              placeholder="Point of Sales"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Store Brand/ Format */}
          <fieldset>
            <label htmlFor="store-brand-format" className="humi-label">Store Brand / Format</label>
            <input
              id="store-brand-format"
              type="text"
              value={storeBrandFormat}
              onChange={(e) => setStoreBrandFormat(e.target.value)}
              placeholder="Store Brand / Format"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Brand */}
          <fieldset>
            <label htmlFor="brand" className="humi-label">Brand</label>
            <input
              id="brand"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Brand"
              className="humi-input w-full"
            />
          </fieldset>

          {/* Work Location (required) */}
          <fieldset>
            <label htmlFor="work-location" className="humi-label">
              Work Location<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <input
              id="work-location"
              type="text"
              value={workLocation}
              onChange={(e) => setWorkLocation(e.target.value)}
              placeholder="Work Location"
              className="humi-input w-full"
            />
          </fieldset>

        </div>
      </fieldset>

      {/* BA Job Information row 234 — Attachment */}
      <fieldset className="md:col-span-2 mt-4 pt-4 border-t border-hairline-soft">
        <AttachmentDropzone
          id="job-info-attachment"
          files={attachmentFiles}
          onFilesChange={handleAttachmentFilesChange}
          label="ไฟล์แนบ Job Information (Attachment)"
          maxFiles={5}
          maxSizeMB={10}
        />
      </fieldset>
    </div>
  )
}
