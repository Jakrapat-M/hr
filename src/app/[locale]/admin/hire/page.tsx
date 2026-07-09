'use client'

// hire/page.tsx — Hire Wizard entry (Option-1 3-step restructure)
// Shell + 3 cluster wrappers. State/validation/persist live in
// useHireWizard store — persist middleware auto-saves draft to
// localStorage on every setStepData call.
// DEF-01: Add confirmation state after successful submit
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Save } from 'lucide-react'
import { Button } from '@/components/humi'
import { WizardShell } from '@/components/admin/wizard/WizardShell'
import { HireCheckpointSidebar } from '@/components/admin/wizard/HireCheckpointSidebar'
import { useHireWizard, HIRE_WIZARD_VERSION } from '@/lib/admin/store/useHireWizard'
import { useHireDraftsStore, normalizeDraftName, type HireDraft } from '@/stores/hire-drafts-store'
import { useHireAudit } from '@/stores/hire-audit'
import { useAuthStore } from '@/stores/auth-store'
import { useRecruitment } from '@/hooks/use-recruitment'
import { useEmployees } from '@/lib/admin/store/useEmployees'
import type { MockEmployee } from '@/mocks/employees'
import { nextEmployeeCode } from '@/lib/admin/utils/employeeCode'
import ClusterWho from './clusters/ClusterWho'
import ClusterJob from './clusters/ClusterJob'
import ClusterReview from './clusters/ClusterReview'

function parseStep(value: string | null): number | null {
  if (value == null) return null
  const n = Number(value)
  return n === 1 || n === 2 || n === 3 ? n : null
}

export default function HirePage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
    currentStep,
    maxUnlockedStep,
    lastSavedAt,
    candidateContext,
    freezeCandidateContext,
    ensureDraftId,
    setDraftId,
    goNext,
    goBack,
    jumpTo,
    jumpToUrl,
    isStepValid,
    reset,
  } = useHireWizard()
  // STA-114: subscribe to the first-name fields so the Save Draft disable gate
  // re-evaluates reactively as the admin types.
  const firstNameEn = useHireWizard((s) => s.formData.identity.firstNameEn)
  const firstNameLocal = useHireWizard((s) => s.formData.biographical.firstNameLocal)
  const saveDraftToTray = useHireDraftsStore((s) => s.saveDraft)
  const t = useTranslations('saveDraft')
  const [draftSaved, setDraftSaved] = useState(false)
  const { candidates, loading: recruitmentLoading } = useRecruitment()
  const allEmployees = useEmployees((s) => s.all)
  const importEmployees = useEmployees((s) => s.importEmployees)

  const appendHireAudit = useHireAudit((s) => s.append)
  const hrAdminId = useAuthStore((s) => s.userId) ?? 'ADM001'
  const hrAdminName = useAuthStore((s) => s.username) ?? 'HR Admin'

  // DEF-01: confirmation state after submit
  const [submittedEmployeeId, setSubmittedEmployeeId] = useState<string | null>(null)
  const [submittedName, setSubmittedName] = useState('')
  // DEF-04: HRBP validation error (BRD #109 enforced at submit, not button gate)
  const [hrbpError, setHrbpError] = useState(false)
  // DEF-HYBRID: Strict validation error state for final submit
  const [submitError, setSubmitError] = useState<string | null>(null)
  const paramsString = searchParams.toString()
  const requestedCandidateId = searchParams.get('candidateId')
  const requestedApplicantId = searchParams.get('applicantId') ?? undefined
  const locale = pathname.split('/').find((segment) => segment === 'th' || segment === 'en') ?? 'th'

  const requestedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === requestedCandidateId),
    [candidates, requestedCandidateId],
  )

  const makeStepUrl = (step: number) => {
    const params = new URLSearchParams(paramsString)
    params.set('step', String(step))
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const mirrorStepToUrl = (step: number, mode: 'push' | 'replace' = 'push') => {
    const url = makeStepUrl(step)
    const currentUrl = paramsString ? `${pathname}?${paramsString}` : pathname
    if (url === currentUrl) return
    router[mode](url, { scroll: false })
  }

  useEffect(() => {
    const urlStep = parseStep(searchParams.get('step'))
    if (urlStep == null) {
      mirrorStepToUrl(currentStep, 'replace')
      return
    }
    if (urlStep !== currentStep) {
      jumpToUrl(urlStep)
    }
  // `searchParams` is intentionally represented as paramsString to avoid
  // object-identity churn from Next navigation mocks and runtime wrappers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString, currentStep, maxUnlockedStep, pathname])

  useEffect(() => {
    if (!requestedCandidateId || candidateContext) return
    if (recruitmentLoading && !requestedCandidate) return
    freezeCandidateContext({
      candidateId: requestedCandidateId,
      applicantId: requestedApplicantId,
      source: requestedCandidate?.source ?? 'url',
      displayName: requestedCandidate?.name ?? requestedCandidateId,
      email: requestedCandidate?.email,
      phone: requestedCandidate?.phone,
      position: requestedCandidate?.position,
      initialStatus: requestedCandidate?.status,
      frozenAt: new Date().toISOString(),
    })
  }, [candidateContext, freezeCandidateContext, recruitmentLoading, requestedApplicantId, requestedCandidate, requestedCandidateId])

  const hasCandidateConflict = Boolean(
    candidateContext &&
    requestedCandidateId &&
    (candidateContext.candidateId !== requestedCandidateId ||
      (candidateContext.applicantId ?? '') !== (requestedApplicantId ?? '')),
  )

  const handleBack = () => {
    goBack()
    mirrorStepToUrl(useHireWizard.getState().currentStep)
  }

  const handleNext = () => {
    goNext()
    mirrorStepToUrl(useHireWizard.getState().currentStep)
  }

  const handleStepClick = (step: number) => {
    jumpTo(step)
    mirrorStepToUrl(useHireWizard.getState().currentStep)
  }

  // STA-114: Save Draft is enabled once a first name exists (local or EN) — the
  // same minimum handleSubmit derives candidateName from.
  const canSaveDraft = (firstNameLocal || firstNameEn).trim() !== ''

  const handleSaveDraft = () => {
    if (!canSaveDraft) return
    const state = useHireWizard.getState()
    const formData = state.formData
    // Mirror handleSubmit's local-first candidate name derivation.
    const first = formData.biographical?.firstNameLocal?.trim() || formData.identity?.firstNameEn?.trim() || ''
    const last = formData.biographical?.lastNameLocal?.trim() || formData.identity?.lastNameEn?.trim() || ''
    const candidateName = `${first} ${last}`.trim()
    const nameKey = normalizeDraftName(candidateName)

    const id = ensureDraftId()
    const draft: HireDraft = {
      draftId: id,
      candidateName,
      nameKey,
      savedAt: Date.now(),
      step: state.currentStep,
      snapshot: formData,
      candidateContext: state.candidateContext,
      schemaVersion: HIRE_WIZARD_VERSION,
    }
    saveDraftToTray(draft)
    // D2: the tray may have adopted an existing same-name row's id — sync the
    // wizard's draftId so the next save/submit targets the same row.
    const persisted = useHireDraftsStore.getState().drafts.find((d) => d.nameKey === nameKey)
    if (persisted && persisted.draftId !== id) setDraftId(persisted.draftId)

    setDraftSaved(true)
    window.setTimeout(() => setDraftSaved(false), 4000)
  }

  const handleSubmit = () => {
    const state = useHireWizard.getState()
    const formData = state.formData
    const hrbpAssignee = state.hrbpAssignee

    setSubmitError(null)
    setHrbpError(false)

    // Final strict validation gate (Option C)
    const isS1Valid = state.isStepValid(1, true)
    const isS2Valid = state.isStepValid(2, true)

    if (!isS1Valid || !isS2Valid) {
      setSubmitError('กรุณาตรวจสอบข้อมูลให้ถูกต้องครบถ้วนก่อนบันทึก (Please fix validation errors before saving)')
      return
    }

    // DEF-04: BRD #109 — HRBP must be assigned before submission
    if (!hrbpAssignee) {
      setHrbpError(true)
      return
    }

    const directManagerId = formData.job?.supervisorId?.trim() || ''
    if (!directManagerId) {
      setSubmitError('กรุณาเลือกตำแหน่งที่มี Direct Manager ก่อนบันทึก (Please select a position with Direct Manager approval before saving)')
      return
    }

    // Log SH4 hire approval + notification audit entry (Chain 2 / BRD #109)
    const firstNameTh = formData.biographical?.firstNameLocal?.trim() || formData.identity?.firstNameEn?.trim() || 'พนักงานใหม่'
    const lastNameTh = formData.biographical?.lastNameLocal?.trim() || formData.identity?.lastNameEn?.trim() || ''
    const candidateName = `${firstNameTh} ${lastNameTh}`.trim()
    const position = formData.job?.position?.trim() || 'ไม่ระบุตำแหน่ง'
    const company = formData.identity?.companyCode ?? 'CEN'
    const hireDate = formData.identity?.hireDate ?? new Date().toISOString().slice(0, 10)
    const employeeId = nextEmployeeCode(allEmployees)

    // Resolve selected HRBP email from roster if available
    const hrbpEmail = hrbpAssignee ? `${hrbpAssignee}@humi.test` : 'hrbp@humi.test'
    const directManagerEmail = `${directManagerId}@humi.test`

    appendHireAudit({
      candidateName,
      position,
      company: company ?? 'CEN',
      hireDate: hireDate ?? new Date().toISOString().slice(0, 10),
      directManagerId,
      directManagerEmail,
      hrbpEmail,
      notificationRecipients: [directManagerEmail, hrbpEmail],
      approvalStep: 'direct-manager',
      hrAdminName,
      hrAdminId,
    })

    // Mockup persistence: insert the new hire into the in-memory employee store
    // so the "ดูรายละเอียดพนักงาน" link resolves (useEmployees.getById) instead of
    // landing on "ไม่พบพนักงาน". Ephemeral by design (store is not persisted).
    const job = formData.job
    importEmployees([
      {
        employee_id: employeeId,
        first_name_th: firstNameTh,
        last_name_th: lastNameTh,
        first_name_en: formData.identity?.firstNameEn?.trim() || '',
        last_name_en: formData.identity?.lastNameEn?.trim() || '',
        employee_class: state.employeeClassToggle === 'PARTIME' ? 'PARTIME' : 'PERMANENT',
        date_of_birth: formData.identity?.dateOfBirth ?? '',
        hire_date: hireDate,
        original_start_date: hireDate,
        seniority_start_date: hireDate,
        company: (company as MockEmployee['company']) ?? 'CEN',
        position_title: job?.jobLabel?.trim() || position,
        corporate_title: job?.corporateTitle ?? '',
        org_unit: job?.department ?? '',
        probation_status: 'in_probation',
        status: 'active',
        store_branch_code: job?.storeBranchCode ?? null,
        hr_district: job?.hrDistrict ?? null,
        job_grade: job?.jobGrade ?? '',
      },
    ])

    // DEF-01: show confirmation instead of silently resetting
    setSubmittedEmployeeId(employeeId)
    setSubmittedName(candidateName)
    // STA-114 (D6): auto-remove the originating tray draft BEFORE reset() nulls
    // the top-level draftId. Keyed by draftId → removes the exact row even among many.
    const submittedDraftId = state.draftId
    if (submittedDraftId) useHireDraftsStore.getState().removeDraft(submittedDraftId)
    reset()
    router.replace(makeStepUrl(1), { scroll: false })
  }

  const handleAddAnother = () => {
    setSubmittedEmployeeId(null)
    setSubmittedName('')
  }

  const handleViewEmployee = () => {
    if (submittedEmployeeId) {
      router.push(`/${locale}/admin/employees/${submittedEmployeeId}`)
    }
  }

  // DEF-01: show confirmation card after successful submission
  if (submittedEmployeeId) {
    return (
      <div className="h-full flex items-start justify-center pt-16 px-4">
        <div className="humi-card max-w-lg w-full text-center space-y-6 p-8">
          <div className="flex justify-center">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 text-accent text-3xl">✓</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink mb-1">บันทึกเรียบร้อย</h2>
            <p className="text-sm text-ink-soft">Employee saved successfully</p>
          </div>
          <div className="humi-card humi-card--cream py-4 px-5 text-left space-y-1">
            <p className="text-xs text-ink-muted uppercase tracking-wide">รหัสพนักงาน / Employee ID</p>
            <p className="text-lg font-mono font-semibold text-ink">{submittedEmployeeId}</p>
            {submittedName && <p className="text-sm text-ink-soft">{submittedName}</p>}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button variant="secondary" onClick={handleAddAnother}>เพิ่มพนักงานใหม่</Button>
            <Button variant="primary" onClick={handleViewEmployee}>ดูรายละเอียดพนักงาน</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {submitError && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded text-error text-sm text-center animate-in fade-in slide-in-from-top-1">
          {submitError}
        </div>
      )}
      {candidateContext && (
        <section className="mb-4 humi-card humi-card--cream" aria-label="Frozen candidate context">
          <div className="humi-eyebrow">Candidate snapshot</div>
          <h2 className="mt-1 font-display text-base font-semibold text-ink">
            {candidateContext.displayName}
          </h2>
          <p className="mt-1 text-small text-ink-soft">
            {candidateContext.position ?? 'Manual hire'} · {candidateContext.email ?? candidateContext.candidateId}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Frozen at {new Date(candidateContext.frozenAt).toLocaleString('th-TH')}
          </p>
        </section>
      )}
      {hasCandidateConflict && (
        <div className="mb-4 rounded border border-warning/30 bg-warning/10 p-3 text-sm text-ink" role="alert">
          URL candidate differs from the frozen hire draft. The existing draft snapshot was not overwritten.
        </div>
      )}
      {/* STA-114: explicit Save Draft — commits the form into the shared tray
          surfaced on /admin/employees?tab=drafts. Stays on the current step. */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        {draftSaved && (
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-accent/10 px-3 py-2 text-small font-medium text-accent animate-in fade-in slide-in-from-top-1"
          >
            ✓ {t('success')}
          </span>
        )}
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={!canSaveDraft}
            leadingIcon={<Save size={16} aria-hidden />}
          >
            {t('button')}
          </Button>
          {!canSaveDraft && (
            <span className="text-xs text-ink-muted">{t('disabledHint')}</span>
          )}
        </div>
      </div>
      <WizardShell
        currentStep={currentStep}
        maxUnlockedStep={maxUnlockedStep}
        isCurrentStepValid={isStepValid(currentStep)}
        lastSavedAt={lastSavedAt}
        onStepClick={handleStepClick}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={handleSubmit}
        sidebarContent={<HireCheckpointSidebar />}
        showStepperRail={false}
      >
        {currentStep === 1 && <ClusterWho />}
        {currentStep === 2 && <ClusterJob />}
        {currentStep === 3 && <ClusterReview hrbpError={hrbpError} />}
      </WizardShell>
    </div>
  )
}
