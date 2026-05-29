// ClusterReview.sta82-summary.test.tsx — STA-82 AC7 / ADR-4
// Verifies the new Job/Org summary card lists STA-82 fields and that a failing
// cross-step rule (probation end not after hire date) surfaces inline as a
// SummaryRow with the pre-localized 'TH (EN)' message.
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ClusterReview from '../ClusterReview'
import { useHireWizard } from '@/lib/admin/store/useHireWizard'

// Key-passthrough mock: labels render as their key, and the cross-step failure
// message (a literal, not a t() key) renders verbatim.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'th',
}))

beforeEach(() => {
  localStorage.clear()
  act(() => {
    useHireWizard.getState().reset()
  })
})

describe('ClusterReview STA-82 job details summary (AC7)', () => {
  it('lists the new STA-82 job/org field values in the summary panel', () => {
    act(() => {
      useHireWizard.getState().setStepData('job', {
        personnelGrade: 'PG_01',
        pointOfSales: 'POS_TOPS',
        workLocation: 'BKK-HQ',
      })
    })

    render(<ClusterReview />)

    expect(screen.getByText('PG_01')).toBeInTheDocument()
    expect(screen.getByText('POS_TOPS')).toBeInTheDocument()
    expect(screen.getByText('BKK-HQ')).toBeInTheDocument()
  })

  it('renders the 7 DVT rows only when Scholarship = YES', () => {
    act(() => {
      useHireWizard.getState().setStepData('job', {
        scholarship: 'YES',
        dvtProjectName: 'DVT-Alpha',
      })
    })

    render(<ClusterReview />)

    expect(screen.getByText('DVT-Alpha')).toBeInTheDocument()
    expect(screen.getByText('summaryDvtProjectName')).toBeInTheDocument()
    expect(screen.getByText('summaryDvtBondingEndDate')).toBeInTheDocument()
  })

  it('surfaces a failing cross-step rule inline (probation end not after hire date)', () => {
    act(() => {
      useHireWizard.getState().setStepData('identity', { hireDate: '2026-04-01' })
      useHireWizard.getState().setStepData('job', { probationaryPeriodEndDate: '2026-04-01' })
    })

    render(<ClusterReview />)

    expect(
      screen.getByText(
        'วันสิ้นสุดทดลองงานต้องหลังวันที่จ้าง (Probation end must be after hire date)',
      ),
    ).toBeInTheDocument()
  })
})
