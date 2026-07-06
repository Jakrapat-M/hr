/**
 * HR admin Termination — Exit Interview removed (reverts STA-236).
 *
 * The Exit Interview must NOT appear on the HR admin terminate flow (neither an
 * inline section nor a post-submit popup). Exit feedback is collected solely on
 * the ESS resignation page (employee self-submit). Terminate → confirm → status
 * flips to `terminated` → redirect with the success banner, in one shot.
 *
 * Guards:
 *  - Inline Exit Interview section is absent on initial render.
 *  - After confirm: no exit-interview-section ever appears, the redirect fires
 *    exactly once, and the employee status flips to `terminated` directly (no
 *    deferral to a Skip/Save popup handler).
 */

import { describe, expect, test, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { useEmployees } from '@/lib/admin/store/useEmployees'
import { useExitFeedback } from '@/stores/exit-feedback'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'EMP-0009', locale: 'th' }),
  useRouter: () => ({ push }),
}))

// Identity i18n — child components (gate/reason picker) may call next-intl.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

import TerminatePage from '@/app/[locale]/admin/employees/[id]/terminate/page'

const EMP_ID = 'EMP-0009'
const FUTURE_DATE = '2030-01-01'

function resetStores() {
  push.mockClear()
  localStorage.clear()
  // Force the target employee active so the terminate guard passes deterministically
  // (the mock roster status is randomly seeded).
  useEmployees.getState().updateEmployee(EMP_ID, { status: 'active' })
  useExitFeedback.setState({ byEmployee: {} })
}

/** Drive the form through the confirm dialog, which now completes directly. */
function submitTermination() {
  const dateInput = screen.getByLabelText('วันที่ลาออก (Resigned Date)')
  fireEvent.change(dateInput, { target: { value: FUTURE_DATE } })
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันวันที่มีผล' }))

  fireEvent.change(screen.getByLabelText(/เหตุผล \/ ประเภทรายการ/), {
    target: { value: 'TERM_RETIRE' },
  })

  fireEvent.click(screen.getByRole('button', { name: 'บันทึกการสิ้นสุดสภาพ' }))
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน บันทึกการสิ้นสุดสภาพ' }))
}

describe('HR terminate — Exit Interview removed (no inline, no popup)', () => {
  beforeEach(() => {
    resetStores()
  })

  test('no inline Exit Interview section on initial render', () => {
    render(<TerminatePage />)
    expect(screen.queryByTestId('exit-interview-section')).toBeNull()
  })

  test('confirm → no popup, redirects once, status flips to terminated', () => {
    render(<TerminatePage />)
    expect(screen.queryByTestId('exit-interview-section')).toBeNull()

    submitTermination()

    // No Exit Interview surfaces at any point in the flow.
    expect(screen.queryByTestId('exit-interview-section')).toBeNull()
    // Direct completion: redirect fired exactly once, status terminated.
    expect(push).toHaveBeenCalledTimes(1)
    expect(useEmployees.getState().getById(EMP_ID)?.status).toBe('terminated')
    // Nothing written to the exit-feedback store from the admin flow.
    expect(useExitFeedback.getState().list()).toHaveLength(0)
  })
})
