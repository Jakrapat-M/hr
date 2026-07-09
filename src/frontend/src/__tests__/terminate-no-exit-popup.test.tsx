/**
 * HR admin Termination — Exit Interview removed (reverts STA-236).
 *
 * The Exit Interview must NOT appear on the HR admin terminate flow (neither an
 * inline section nor a post-submit popup). Exit feedback is collected solely on
 * the ESS resignation page (employee self-submit). Terminate → confirm → queues
 * an approval request; employee status does not flip until final approval.
 *
 * Guards:
 *  - Inline Exit Interview section is absent on initial render.
 *  - After confirm: no exit-interview-section ever appears, one approval request
 *    is stored, and the employee status remains active.
 */

import { describe, expect, test, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { useEmployees } from '@/lib/admin/store/useEmployees'
import { useExitFeedback } from '@/stores/exit-feedback'
import { useTerminationApprovals } from '@/stores/termination-approvals'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'EMP-0009', locale: 'th' }),
  useSearchParams: () => new URLSearchParams(),
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
  useTerminationApprovals.setState({ requests: [] })
  useExitFeedback.setState({ byEmployee: {} })
}

function submitTermination() {
  const dateInput = screen.getByLabelText(/วันที่ทำงานวันสุดท้าย \(Resigned Date\)/)
  fireEvent.change(dateInput, { target: { value: FUTURE_DATE } })

  fireEvent.change(screen.getByLabelText(/เหตุผล \/ ประเภทรายการ/), {
    target: { value: 'TERM_RETIRE' },
  })

  fireEvent.click(screen.getByRole('button', { name: 'บันทึกการสิ้นสุดสภาพ' }))
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน ส่งคำขออนุมัติ' }))
}

describe('HR terminate — Exit Interview removed (no inline, no popup)', () => {
  beforeEach(() => {
    resetStores()
  })

  test('no inline Exit Interview section on initial render', () => {
    render(<TerminatePage />)
    expect(screen.queryByTestId('exit-interview-section')).toBeNull()
  })

  test('confirm → no popup, queues request, status remains active', () => {
    render(<TerminatePage />)
    expect(screen.queryByTestId('exit-interview-section')).toBeNull()

    submitTermination()

    // No Exit Interview surfaces at any point in the flow.
    expect(screen.queryByTestId('exit-interview-section')).toBeNull()
    expect(push).not.toHaveBeenCalled()
    expect(useEmployees.getState().getById(EMP_ID)?.status).toBe('active')
    expect(useTerminationApprovals.getState().requests).toHaveLength(1)
    expect(useTerminationApprovals.getState().requests[0]).toMatchObject({
      employeeId: EMP_ID,
      requestedLastDay: FUTURE_DATE,
      terminationDate: '2030-01-02',
      reasonCode: 'TERM_RETIRE',
      status: 'pending_manager',
      sourceRoute: 'admin',
    })
    // Nothing written to the exit-feedback store from the admin flow.
    expect(useExitFeedback.getState().list()).toHaveLength(0)
    expect(screen.getByText('ส่งคำขอเข้าสู่การอนุมัติแล้ว / Request submitted for approval')).toBeInTheDocument()
  })
})
