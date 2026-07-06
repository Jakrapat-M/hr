/**
 * STA-236 — [EC] Termination: Exit Interview moved to a post-submit popup.
 *
 * The Exit Interview questionnaire used to render INLINE on the admin terminate
 * form. It now shows as a Humi Modal AFTER the confirm dialog is accepted; the
 * user can ข้าม (Skip) or บันทึก (Save).
 *
 * Guards covered:
 *  - Inline section is gone (queryByTestId null on initial render).
 *  - After confirm, the popup section is VISIBLE — this is the load-bearing P0:
 *    the employee selector is reactive and a status flip in the commit path
 *    would trip the terminate guard and unmount the page before the modal
 *    renders. The status flip is deferred to Skip/Save completion instead.
 *  - ข้าม persists nothing; บันทึก with ≥1 answer writes one exit-feedback entry.
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

// Identity i18n — assertions target data-testid / roles, not translated copy.
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
  // Clear captured exit feedback between cases.
  useExitFeedback.setState({ byEmployee: {} })
}

/**
 * Drive the form up to (and including) confirming the terminate dialog, which
 * opens the post-submit Exit Interview popup.
 */
function submitTerminationToPopup() {
  // 1. EffectiveDateGate — set a future resigned date, then confirm.
  const dateInput = screen.getByLabelText('วันที่ลาออก (Resigned Date)')
  fireEvent.change(dateInput, { target: { value: FUTURE_DATE } })
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันวันที่มีผล' }))

  // 2. Reason → auto-fills sub-reason + transferOut default; email auto-fills on mount.
  fireEvent.change(screen.getByLabelText(/เหตุผล \/ ประเภทรายการ/), {
    target: { value: 'TERM_RETIRE' },
  })

  // 3. Submit → opens the irreversible-action confirm dialog.
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกการสิ้นสุดสภาพ' }))

  // 4. Confirm → commitTermination() → opens the Exit Interview popup.
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน บันทึกการสิ้นสุดสภาพ' }))
}

describe('STA-236 terminate — Exit Interview post-submit popup', () => {
  beforeEach(() => {
    resetStores()
  })

  test('inline Exit Interview section is absent on initial render', () => {
    render(<TerminatePage />)
    expect(screen.queryByTestId('exit-interview-section')).toBeNull()
  })

  test('ข้าม (Skip) shows the popup, persists nothing, and redirects', () => {
    render(<TerminatePage />)

    // Inline removal precondition.
    expect(screen.queryByTestId('exit-interview-section')).toBeNull()

    submitTerminationToPopup()

    // P0: the popup must actually be VISIBLE (guard did not pre-empt it).
    const section = screen.getByTestId('exit-interview-section')
    expect(section).toBeInTheDocument()

    // Skip → nothing persisted, redirect fired.
    fireEvent.click(screen.getByRole('button', { name: 'skip' }))
    expect(push).toHaveBeenCalledTimes(1)
    expect(useExitFeedback.getState().list()).toHaveLength(0)
  })

  test('บันทึก (Save) with ≥1 answer persists one exit-feedback entry', () => {
    render(<TerminatePage />)
    submitTerminationToPopup()

    const section = screen.getByTestId('exit-interview-section')
    expect(section).toBeInTheDocument()

    // Answer one ranked factor (Part 1 — Job, rank 1). Select by id — the
    // identity i18n makes the visible rank labels non-unique.
    const jobRank1 = section.querySelector('#exit-job-rank1') as HTMLSelectElement
    expect(jobRank1).not.toBeNull()
    fireEvent.change(jobRank1, { target: { value: 'job_overload' } })

    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    const entries = useExitFeedback.getState().list()
    expect(entries).toHaveLength(1)
    expect(entries[0].employeeId).toBe(EMP_ID)
    expect(entries[0].reasonCode).toBe('TERM_RETIRE')
    expect(entries[0].record.job.rank1).toBe('job_overload')
    expect(push).toHaveBeenCalledTimes(1)
  })
})
