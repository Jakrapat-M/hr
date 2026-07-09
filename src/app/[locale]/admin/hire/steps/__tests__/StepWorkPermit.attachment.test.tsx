import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import StepWorkPermit from '@/app/[locale]/admin/hire/steps/StepWorkPermit'
import { useHireWizard } from '@/lib/admin/store/useHireWizard'

beforeEach(() => {
  localStorage.clear()
  act(() => {
    useHireWizard.getState().reset()
    useHireWizard.getState().setStepData('biographical', { nationality: 'VN' })
  })
})

describe('StepWorkPermit attachment UI', () => {
  it('uses the Humi attachment dropzone instead of a filename text input', () => {
    render(<StepWorkPermit />)

    expect(screen.getByText('ไฟล์แนบ (Attachment)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'พื้นที่แนบไฟล์' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /อัปโหลด/ })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/ชื่อไฟล์/)).not.toBeInTheDocument()
  })
})
