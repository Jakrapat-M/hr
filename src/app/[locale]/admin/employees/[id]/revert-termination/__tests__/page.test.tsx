// revert-termination/page.test.tsx — STA-237 regression for /revert-termination route
// Mirrors the rehire/pay-rate-change test style: mock stores + navigation, then
// assert guard banner, read-only prefill, doc-gate, and confirm side effects.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ─── Hoisted mutable state (varied per test) ─────────────────────────────────
const h = vi.hoisted(() => ({
  empStatus: 'terminated' as 'active' | 'inactive' | 'terminated',
  timeline: [] as Array<Record<string, unknown>>,
  push: vi.fn(),
  updateEmployee: vi.fn(),
  append: vi.fn(),
}))

const TERM_EVENT = {
  id: 'evt-term-1',
  employeeId: 'EMP-0009',
  kind: 'terminate',
  reasonCode: 'TERM_RETIRE',
  lastDay: '2026-06-30',
  okToRehire: false,
  effectiveDate: '2026-07-01',
  recordedAt: '2026-07-01T00:00:00Z',
  actorUserId: 'admin',
}

const BASE_EMP = {
  employee_id: 'EMP-0009',
  first_name_th: 'สมชาย',
  last_name_th: 'ใจดี',
  first_name_en: 'Somchai',
  last_name_en: 'Jaidee',
  company: 'CEN',
  position_title: 'Analyst',
  employee_class: 'PERMANENT' as const,
  probation_status: 'terminated' as const,
}

// ─── Mock next/navigation ────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'EMP-0009', locale: 'th' }),
  useRouter: () => ({ push: h.push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}))

// ─── Mock next-intl ──────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useLocale: () => 'th',
}))

// ─── Mock employees store ─────────────────────────────────────────────────────
vi.mock('@/lib/admin/store/useEmployees', () => {
  const state = {
    getById: (_id: string) => ({ ...BASE_EMP, status: h.empStatus }),
    updateEmployee: h.updateEmployee,
  }
  const useEmployees = Object.assign(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState: () => state, setState: vi.fn(), subscribe: vi.fn() },
  )
  return { useEmployees }
})

// ─── Mock timelines store ─────────────────────────────────────────────────────
vi.mock('@/lib/admin/store/useTimelines', () => {
  const state = {
    get: (_id: string) => h.timeline,
    append: h.append,
  }
  const useTimelines = Object.assign(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState: () => state, setState: vi.fn(), subscribe: vi.fn() },
  )
  return { useTimelines }
})

// ─── Mock ActionGuardBanner ───────────────────────────────────────────────────
vi.mock('@/components/admin/ActionGuardBanner', () => ({
  ActionGuardBanner: ({ reason }: { reason: string }) => (
    <div data-testid="guard-banner">{reason}</div>
  ),
}))

// ─── Mock AttachmentDropzone — button emits a fake file ───────────────────────
vi.mock('@/components/admin/AttachmentDropzone/AttachmentDropzone', () => ({
  AttachmentDropzone: ({
    files,
    onFilesChange,
  }: {
    files: Array<{ id: string }>
    onFilesChange: (f: Array<{ id: string; name: string; size: number; type: string }>) => void
  }) => (
    <button
      type="button"
      data-testid="attach-file"
      onClick={() => onFilesChange([...files, { id: 'f1', name: 'doc.pdf', size: 10, type: 'application/pdf' }])}
    >
      attach ({files.length})
    </button>
  ),
}))

// Import page AFTER mocks
import RevertTerminationPage from '../page'

beforeEach(() => {
  h.empStatus = 'terminated'
  h.timeline = [TERM_EVENT]
  h.push.mockReset()
  h.updateEmployee.mockReset()
  h.append.mockReset()
})

describe('STA-237: /revert-termination guard', () => {
  it('shows the guard banner for a non-terminated (active) employee', () => {
    h.empStatus = 'active'
    render(<RevertTerminationPage />)
    expect(screen.getByTestId('guard-banner')).toBeInTheDocument()
  })

  it('shows a neutral info card when no prior termination event exists', () => {
    h.timeline = []
    render(<RevertTerminationPage />)
    expect(screen.getByText(/ไม่พบข้อมูลการสิ้นสุดสภาพเดิม/)).toBeInTheDocument()
  })
})

describe('STA-237: /revert-termination prefill + doc-gate', () => {
  it('prefills the derived reason label read-only from the terminate event', () => {
    render(<RevertTerminationPage />)
    // TERM_RETIRE → REASON_LABELS label
    expect(screen.getByDisplayValue('เกษียณอายุ (Retirement)')).toBeInTheDocument()
    // Involuntary derived from TERMINATION_LOGIC.TERM_RETIRE.voluntary === false
    expect(screen.getByDisplayValue('ไม่สมัครใจ (Involuntary)')).toBeInTheDocument()
  })

  it('disables confirm until a supporting document is attached', () => {
    render(<RevertTerminationPage />)
    const confirmBtn = screen.getByRole('button', { name: 'ยืนยันการยกเลิกการสิ้นสุดสภาพ' })
    expect(confirmBtn).toBeDisabled()

    fireEvent.click(screen.getByTestId('attach-file'))
    expect(confirmBtn).not.toBeDisabled()
  })
})

describe('STA-237: /revert-termination confirm side effects', () => {
  it('on confirm → sets employee active + appends a revert_termination event', () => {
    render(<RevertTerminationPage />)

    fireEvent.click(screen.getByTestId('attach-file'))
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันการยกเลิกการสิ้นสุดสภาพ' }))
    // dialog confirm
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน — คืนสถานะทำงาน' }))

    expect(h.updateEmployee).toHaveBeenCalledWith(
      'EMP-0009',
      expect.objectContaining({ status: 'active' }),
    )
    expect(h.append).toHaveBeenCalledWith(
      'EMP-0009',
      expect.objectContaining({ kind: 'revert_termination', revertedReasonCode: 'TERM_RETIRE' }),
    )
    expect(h.push).toHaveBeenCalled()
  })
})
