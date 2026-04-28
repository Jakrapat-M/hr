import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import StepGlobalInfo from '@/app/[locale]/admin/hire/steps/StepGlobalInfo'
import { useHireWizard } from '@/lib/admin/store/useHireWizard'

beforeEach(() => {
  localStorage.clear()
  act(() => {
    useHireWizard.getState().reset()
  })
})

describe('StepGlobalInfo design tokens', () => {
  it('uses the Humi textarea token and stacked full-width layout for Additional Information', () => {
    render(<StepGlobalInfo />)

    const additionalInfo = screen.getByLabelText('ข้อมูลเพิ่มเติม / Additional Information')
    const field = additionalInfo.closest('fieldset')

    expect(additionalInfo).toHaveClass('humi-textarea')
    expect(additionalInfo).toHaveClass('humi-input--wide')
    expect(additionalInfo).not.toHaveClass('humi-input')
    expect(field).toHaveClass('flex')
    expect(field).toHaveClass('flex-col')
  })
})
