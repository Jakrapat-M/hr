// StepJob.dvt-conditional.test.tsx — STA-82 AC5 / ADR-3
// Verifies the DVT detail cluster is gated by Scholarship === 'YES' and that
// typed DVT draft values survive a YES→NO→YES toggle (state lives in StepJob
// useState, so conditional JSX rendering never discards them).
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StepJob from '@/app/[locale]/admin/hire/steps/StepJob'
import { useHireWizard } from '@/lib/admin/store/useHireWizard'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'th',
}))

// Heavy children — not needed for the DVT-conditional assertions.
vi.mock('@/components/admin/PositionLookup', () => ({
  default: () => <div data-testid="position-lookup" />,
}))
vi.mock('@/components/admin/AttachmentDropzone/AttachmentDropzone', () => ({
  AttachmentDropzone: () => <div data-testid="attachment-dropzone" />,
}))

beforeEach(() => {
  localStorage.clear()
  act(() => {
    useHireWizard.getState().reset()
  })
})

describe('StepJob DVT conditional cluster (AC5)', () => {
  it('does not render DVT detail fields when Scholarship is blank', () => {
    render(<StepJob />)

    expect(screen.queryByLabelText('DVT: Project name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('DVT: Type')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('DVT: Bonding End date')).not.toBeInTheDocument()
  })

  it('reveals the 7 DVT fields once Scholarship = YES is selected', () => {
    render(<StepJob />)

    act(() => {
      fireEvent.change(screen.getByLabelText('Scholarship'), { target: { value: 'YES' } })
    })

    expect(screen.getByLabelText('DVT: Project name')).toBeInTheDocument()
    expect(screen.getByLabelText('DVT: Type')).toBeInTheDocument()
    expect(screen.getByLabelText('DVT: Course')).toBeInTheDocument()
    expect(screen.getByLabelText('DVT: Course of Time')).toBeInTheDocument()
    expect(screen.getByLabelText('DVT: Academic Year')).toBeInTheDocument()
    expect(screen.getByLabelText('DVT: Graduation Date')).toBeInTheDocument()
    expect(screen.getByLabelText('DVT: Bonding End date')).toBeInTheDocument()
  })

  it('preserves a typed DVT draft value across a YES → NO → YES toggle', () => {
    render(<StepJob />)

    const scholarship = screen.getByLabelText('Scholarship')

    act(() => {
      fireEvent.change(scholarship, { target: { value: 'YES' } })
    })

    const projectName = screen.getByLabelText('DVT: Project name') as HTMLInputElement
    act(() => {
      fireEvent.change(projectName, { target: { value: 'โครงการทุน A' } })
    })
    expect(projectName.value).toBe('โครงการทุน A')

    // YES → NO: detail fields still rendered because a DVT draft exists (ADR-3),
    // so the typed value remains visible.
    act(() => {
      fireEvent.change(scholarship, { target: { value: 'NO' } })
    })
    // YES again — value must still be present.
    act(() => {
      fireEvent.change(scholarship, { target: { value: 'YES' } })
    })

    expect((screen.getByLabelText('DVT: Project name') as HTMLInputElement).value).toBe('โครงการทุน A')
  })
})
