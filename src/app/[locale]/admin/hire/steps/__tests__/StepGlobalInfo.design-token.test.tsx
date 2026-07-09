import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StepGlobalInfo from '@/app/[locale]/admin/hire/steps/StepGlobalInfo'
import { useHireWizard } from '@/lib/admin/store/useHireWizard'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      disabilityAttachment: 'เอกสารแนบ (สถานะความพิการ)',
    }
    return map[key] ?? key
  },
}))

beforeEach(() => {
  localStorage.clear()
  act(() => {
    useHireWizard.getState().reset()
  })
})

describe('StepGlobalInfo design tokens', () => {
  it('uses the Cnext textarea token and stacked full-width layout for Additional Information', () => {
    render(<StepGlobalInfo />)

    const additionalInfo = screen.getByLabelText('ข้อมูลเพิ่มเติม / Additional Information')
    const field = additionalInfo.closest('fieldset')

    expect(additionalInfo).toHaveClass('cnext-textarea')
    expect(additionalInfo).toHaveClass('cnext-input--wide')
    expect(additionalInfo).not.toHaveClass('cnext-input')
    expect(field).toHaveClass('flex')
    expect(field).toHaveClass('flex-col')
  })
})
