'use client'

// Stepper.tsx — Cnext-skinned 3-step rail for Hire Wizard
// States: locked (disabled) / active (teal bg) / complete (teal ring + ✓)
// Each step shows ไทย label + short Thai description so the rail acts
// as a table-of-contents, not a pure progress bar.
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepItem {
  number: number
  labelTh: string
  labelEn: string
  descTh?: string
}

interface StepperProps {
  steps: readonly StepItem[] | StepItem[]
  currentStep: number
  maxUnlockedStep: number
  onStepClick: (step: number) => void
  /** aria-label บน nav — default "ขั้นตอน Hire Wizard" */
  stepperLabel?: string
}

export function Stepper({ steps, currentStep, maxUnlockedStep, onStepClick, stepperLabel = 'ขั้นตอน Hire Wizard' }: StepperProps) {
  return (
    <nav aria-label={stepperLabel}>
      <ol className="flex flex-col gap-2">
        {steps.map((step) => {
          const isActive = step.number === currentStep
          const isComplete = step.number < currentStep
          const isLocked = step.number > maxUnlockedStep

          return (
            <li key={step.number} data-testid="step-item">
              <button
                type="button"
                onClick={() => !isLocked && onStepClick(step.number)}
                aria-current={isActive ? 'step' : undefined}
                aria-disabled={isLocked ? 'true' : 'false'}
                disabled={isLocked}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]',
                  isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  isActive && 'bg-accent-soft',
                  !isActive && 'hover:bg-canvas-soft',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                    isActive && 'border-accent bg-accent text-white',
                    isComplete && !isActive && 'border-accent bg-surface text-accent',
                    !isActive && !isComplete && 'border-hairline bg-surface text-ink-muted',
                  )}
                  aria-hidden="true"
                >
                  {isComplete ? <Check size={14} strokeWidth={3} /> : step.number}
                </span>

                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      'font-display text-base font-semibold leading-tight',
                      isActive ? 'text-accent' : 'text-ink',
                    )}
                  >
                    {step.labelTh}
                  </span>
                  <span className="mt-0.5 text-xs font-medium tracking-wide text-ink-muted">
                    {step.labelEn}
                  </span>
                  {step.descTh && (
                    <span
                      className={cn(
                        'mt-1 text-xs leading-snug',
                        isActive ? 'text-ink-soft' : 'text-ink-muted',
                      )}
                    >
                      {step.descTh}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
