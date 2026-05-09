'use client'

import {
  Fingerprint, User2, Phone, AlertCircle, Globe, FileText,
  Users, Briefcase, Building2, Wallet, ClipboardList,
  CheckCircle2,
} from 'lucide-react'
import { useHireWizard } from '@/lib/admin/store/useHireWizard'
import { cn } from '@/lib/utils'

interface SectionDef {
  id: string
  validityKey: string | null
  icon: React.ElementType
  labelTh: string
}

interface StepGroup {
  step: 1 | 2 | 3
  labelTh: string
  sections: SectionDef[]
}

const CHECKPOINT_GROUPS: StepGroup[] = [
  {
    step: 1,
    labelTh: 'ข้อมูลบุคคล',
    sections: [
      { id: 'who.identity',        validityKey: 'identity',        icon: Fingerprint,  labelTh: 'ระบุตัวตน' },
      { id: 'who.biographical',    validityKey: 'biographical',    icon: User2,        labelTh: 'ข้อมูลส่วนตัว' },
      { id: 'who.contact',         validityKey: 'contact',         icon: Phone,        labelTh: 'ข้อมูลติดต่อ' },
      { id: 'who.emergencyContacts', validityKey: 'emergencyContacts', icon: AlertCircle, labelTh: 'ผู้ติดต่อฉุกเฉิน' },
      { id: 'who.globalInfo',      validityKey: 'globalInfo',      icon: Globe,        labelTh: 'ข้อมูลทั่วไป' },
      { id: 'who.workPermit',      validityKey: 'workPermit',      icon: FileText,     labelTh: 'ใบอนุญาตทำงาน' },
      { id: 'who.dependents',      validityKey: 'dependents',      icon: Users,        labelTh: 'บุคคลในอุปการะ' },
    ],
  },
  {
    step: 2,
    labelTh: 'ข้อมูลงาน',
    sections: [
      { id: 'job.employeeInfo',  validityKey: 'employeeInfo', icon: Briefcase,  labelTh: 'ประเภทการจ้างงาน' },
      { id: 'job.assignment',    validityKey: 'job',          icon: Building2,  labelTh: 'ตำแหน่งและสังกัด' },
      { id: 'job.compensation',  validityKey: 'compensation', icon: Wallet,     labelTh: 'ค่าตอบแทน' },
    ],
  },
  {
    step: 3,
    labelTh: 'ตรวจสอบและส่ง',
    sections: [
      { id: 'review', validityKey: null, icon: ClipboardList, labelTh: 'สรุปและยืนยัน' },
    ],
  },
]

export function HireCheckpointSidebar() {
  const currentStep = useHireWizard((s) => s.currentStep)
  const maxUnlockedStep = useHireWizard((s) => s.maxUnlockedStep)
  const stepValidity = useHireWizard((s) => s.stepValidity)
  const jumpTo = useHireWizard((s) => s.jumpTo)
  const setSectionCollapsed = useHireWizard((s) => s.setSectionCollapsed)

  const handleSectionClick = (step: 1 | 2 | 3, sectionId: string) => {
    if (step > maxUnlockedStep) return
    jumpTo(step)
    if (step !== 3) {
      setSectionCollapsed(sectionId, false)
    }
    // Wait one frame for the cluster to render before scrolling
    setTimeout(() => {
      const el = document.getElementById(sectionId)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <nav
      aria-label="หัวข้อการกรอกข้อมูล"
      className="mt-3 space-y-3 px-1"
    >
      <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
        Checkpoints
      </p>

      {CHECKPOINT_GROUPS.map((group) => {
        const locked = group.step > maxUnlockedStep
        const isCurrentStep = group.step === currentStep

        return (
          <div key={group.step} className="space-y-0.5">
            {/* Step group label */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-1 py-0.5',
                locked && 'opacity-40',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                  isCurrentStep
                    ? 'bg-accent text-white'
                    : locked
                    ? 'bg-canvas-soft text-ink-muted'
                    : 'bg-accent/20 text-accent',
                )}
              >
                {group.step}
              </span>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wide',
                  isCurrentStep ? 'text-accent' : 'text-ink-soft',
                )}
              >
                {group.labelTh}
              </span>
            </div>

            {/* Section items */}
            <div className="ml-3 space-y-0.5 border-l border-hairline pl-2">
              {group.sections.map((section) => {
                const isValid =
                  section.validityKey != null
                    ? (stepValidity as unknown as Record<string, boolean>)[section.validityKey]
                    : undefined
                const Icon = section.icon

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleSectionClick(group.step, section.id)}
                    disabled={locked}
                    className={cn(
                      'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors',
                      locked
                        ? 'cursor-not-allowed opacity-40'
                        : 'cursor-pointer text-ink-soft hover:bg-canvas-soft hover:text-ink',
                    )}
                  >
                    <Icon size={11} className="shrink-0 text-ink-muted" aria-hidden />
                    <span className="flex-1 leading-snug">{section.labelTh}</span>
                    {isValid === true && (
                      <CheckCircle2
                        size={11}
                        className="shrink-0 text-success"
                        aria-label="ครบถ้วน"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

HireCheckpointSidebar.displayName = 'HireCheckpointSidebar'
