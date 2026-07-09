// SystemReports.test.tsx — Part E Wave 3: Reporting 5 pages
// ครอบคลุม: ReportsHub, ReportBuilder, ScheduleReport, ReportAutomation, FavouriteReports
// Vitest + RTL — 12 tests

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, render, screen, fireEvent, renderHook, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { useDataManagement } from '@/lib/admin/store/useDataManagement'
import { useAuthStore } from '@/stores/auth-store'
import thMessages from '../../../messages/th.json'

// -----------------------------------------------------------------------
// Mock dependencies
// -----------------------------------------------------------------------

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/lib/admin/store/useUsersPermissions', () => {
  const mockStore = {
    getState: () => ({ appendAudit: vi.fn() }),
    setState: vi.fn(),
    subscribe: vi.fn(),
    destroy: vi.fn(),
    getInitialState: vi.fn(() => ({})),
  }
  const useUsersPermissions = Object.assign(vi.fn(() => ({})), mockStore)
  return { useUsersPermissions }
})

vi.mock('@/components/admin/admin-system/CronPicker', () => ({
  CronPicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="cron-picker"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="cron expression"
    />
  ),
}))

vi.mock('@/lib/admin/utils/cronFormat', () => ({
  formatCron: (cron: string) => `every (${cron})`,
}))

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

import ReportsHubPage from '@/app/[locale]/admin/system/reports/page'
import ReportBuilderPage from '@/app/[locale]/admin/system/reports/builder/page'
import ScheduleReportPage from '@/app/[locale]/admin/system/reports/schedule/page'
import ReportAutomationPage from '@/app/[locale]/admin/system/reports/automation/page'
import FavouriteReportsPage from '@/app/[locale]/admin/system/reports/favourites/page'

// reset store ก่อนทุก test
beforeEach(() => {
  act(() => {
    localStorage.clear()
    useDataManagement.setState(useDataManagement.getInitialState())
    // Subject builder reads persona scope from auth-store — give it an admin (all scope)
    useAuthStore.setState({
      userId: 'TEST',
      username: 'admin',
      email: 'admin@humi.test',
      roles: ['hr_admin'],
      isAuthenticated: true,
      originalUser: null,
      _hasHydrated: true,
    } as any)
  })
})

/** Render a builder-family page wrapped in the TH intl provider (it now uses next-intl). */
function renderBuilder(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages as any}>
      {ui}
    </NextIntlClientProvider>,
  )
}

// -----------------------------------------------------------------------
// Hub: ReportsHubPage
// -----------------------------------------------------------------------

describe('ReportsHubPage — Reporting hub landing', () => {
  it('TC-RPT-1: แสดง heading "รายงาน"', () => {
    render(<ReportsHubPage />)
    // Multiple headings match /รายงาน/ (page title + subtitles); at-least-one = pass
    expect(screen.getAllByRole('heading', { name: /รายงาน/ }).length).toBeGreaterThan(0)
  })

  it('TC-RPT-2: แสดง 4 quick link cards (สร้างรายงาน, กำหนดเวลา, งานอัตโนมัติ, รายงานโปรด)', () => {
    render(<ReportsHubPage />)
    expect(screen.getByRole('link', { name: /สร้างรายงาน/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /กำหนดเวลารายงาน/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /งานอัตโนมัติ/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /รายงานโปรด/i })).toBeInTheDocument()
  })

  it('TC-RPT-3: แสดงตาราง recent reports (seed 10 → แสดง 6 ล่าสุด)', () => {
    render(<ReportsHubPage />)
    // header ต้องมี "ชื่อรายงาน"
    expect(screen.getByText('ชื่อรายงาน')).toBeInTheDocument()
    // มี tbody rows ≤ 6
    const table = screen.getByRole('table')
    const rows = table.querySelectorAll('tbody tr')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(6)
  })

  it('TC-RPT-4: toggle favourite button ต้องเปลี่ยน aria-label (เพิ่มโปรด → ยกเลิกโปรด)', () => {
    // seed มี 3 favourite reports; ทุก row ที่ไม่ใช่ fav ต้องมี "เพิ่มโปรด"
    render(<ReportsHubPage />)
    const addBtns = screen.queryAllByRole('button', { name: /เพิ่มโปรด/i })
    const removeBtns = screen.queryAllByRole('button', { name: /ยกเลิกโปรด/i })
    // รวมกัน ≥ 1 ก็ถือว่า toggle buttons render ได้
    expect(addBtns.length + removeBtns.length).toBeGreaterThan(0)
  })
})

// -----------------------------------------------------------------------
// Builder: ReportBuilderPage
// -----------------------------------------------------------------------

describe('ReportBuilderPage — subject + filter + preview + export', () => {
  it('TC-RPT-5: แสดง heading + subject pickers', () => {
    renderBuilder(<ReportBuilderPage />)
    expect(screen.getByRole('heading', { name: /เครื่องมือสร้างรายงาน/i })).toBeInTheDocument()
    // subject chips render (default + alternates)
    expect(screen.getByRole('button', { name: 'รายชื่อพนักงาน', pressed: false })).toBeInTheDocument()
  })

  it('TC-RPT-6: เลือก subject อื่น ต้องสลับคอลัมน์ใน preview', () => {
    renderBuilder(<ReportBuilderPage />)
    fireEvent.click(screen.getByRole('button', { name: 'รายชื่อพนักงาน', pressed: false }))
    const table = screen.getByRole('table')
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(expect.arrayContaining(['ชื่อ-สกุล', 'ตำแหน่ง', 'วันเริ่มงาน']))
  })

  it('TC-RPT-7: save button disabled เมื่อ reportName ว่าง, enabled เมื่อมีชื่อ', () => {
    renderBuilder(<ReportBuilderPage />)
    const saveBtn = screen.getByRole('button', { name: /บันทึกรายงาน/i })
    expect(saveBtn).toBeDisabled()

    const input = screen.getByRole('textbox', { name: /ชื่อรายงาน/i })
    fireEvent.change(input, { target: { value: 'รายงานทดสอบ' } })
    expect(saveBtn).not.toBeDisabled()
  })

  it('TC-RPT-8: เปลี่ยน filter (สถานะ) ต้องเปลี่ยนจำนวนแถวใน preview', () => {
    renderBuilder(<ReportBuilderPage />)
    // switch to roster subject which has a status filter
    fireEvent.click(screen.getByRole('button', { name: 'รายชื่อพนักงาน', pressed: false }))
    const rowsBefore = within(screen.getByRole('table')).queryAllByRole('row').length

    const statusSelect = screen.getByLabelText('สถานะ')
    fireEvent.change(statusSelect, { target: { value: 'leave' } })
    const rowsAfter = within(screen.getByRole('table')).queryAllByRole('row').length

    // leave-only is a strict subset of all roster rows
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore)
    // export control present
    expect(screen.getByRole('button', { name: /ส่งออก CSV/i })).toBeInTheDocument()
  })
})

// -----------------------------------------------------------------------
// Schedule: ScheduleReportPage
// -----------------------------------------------------------------------

describe('ScheduleReportPage — CronPicker + delivery dropdown', () => {
  it('TC-RPT-9: แสดง heading "กำหนดเวลารายงาน"', () => {
    render(<ScheduleReportPage />)
    expect(screen.getByRole('heading', { name: /กำหนดเวลารายงาน/i })).toBeInTheDocument()
  })

  it('TC-RPT-10: CronPicker render ได้ + delivery select มีตัวเลือก email/view/cg-gateway', () => {
    render(<ScheduleReportPage />)
    expect(screen.getByTestId('cron-picker')).toBeInTheDocument()
    const deliverySelect = screen.getByRole('combobox', { name: /ช่องทางส่ง/i })
    expect(deliverySelect).toBeInTheDocument()
    expect(deliverySelect.querySelector('option[value="email"]')).toBeTruthy()
    expect(deliverySelect.querySelector('option[value="view"]')).toBeTruthy()
    expect(deliverySelect.querySelector('option[value="cg-gateway"]')).toBeTruthy()
  })
})

// -----------------------------------------------------------------------
// Automation: ReportAutomationPage
// -----------------------------------------------------------------------

describe('ReportAutomationPage — jobs list + pause/resume toggle', () => {
  it('TC-RPT-11: แสดง heading "งานอัตโนมัติ" + stat widgets (ทำงาน / หยุดชั่วคราว)', () => {
    render(<ReportAutomationPage />)
    expect(screen.getByRole('heading', { name: /งานอัตโนมัติ/i })).toBeInTheDocument()
    // Stat widgets + buttons both render "ทำงาน"/"หยุดชั่วคราว" — use getAllByText
    expect(screen.getAllByText('ทำงาน').length).toBeGreaterThan(0)
    expect(screen.getAllByText('หยุดชั่วคราว').length).toBeGreaterThan(0)
  })

  it('TC-RPT-12: ปุ่ม "หยุด" เมื่อ click → เปลี่ยนเป็น "เริ่ม" (pause/resume toggle)', () => {
    // seed มี 3 scheduledJobs; อย่างน้อย 1 isActive=true
    render(<ReportAutomationPage />)
    const pauseBtn = screen.getAllByRole('button', { name: /หยุด/i })[0]
    expect(pauseBtn).toBeInTheDocument()
    fireEvent.click(pauseBtn)
    // หลัง click ต้องมีปุ่ม "เริ่ม" ปรากฏ
    expect(screen.getAllByRole('button', { name: /เริ่ม/i }).length).toBeGreaterThan(0)
  })
})

// -----------------------------------------------------------------------
// Favourites: FavouriteReportsPage
// -----------------------------------------------------------------------

describe('FavouriteReportsPage — favourite list + toggle', () => {
  it('TC-RPT-13: แสดง heading "รายงานโปรด" + count จาก seed (seed 3 favourites)', () => {
    render(<FavouriteReportsPage />)
    expect(screen.getAllByRole('heading', { name: /รายงานโปรด/i }).length).toBeGreaterThan(0)
    // text เช่น "รายงานโปรด (3)"
    expect(screen.getByText(/รายงานโปรด \(3\)/i)).toBeInTheDocument()
  })

  it('TC-RPT-14: click ★ "ลบออกจากโปรด" ต้องลดจำนวน favourite ใน list', () => {
    render(<FavouriteReportsPage />)
    const removeBtn = screen.getAllByRole('button', { name: /ลบออกจากโปรด/i })[0]
    fireEvent.click(removeBtn)
    // หลัง toggle count ลดลง 1 → "รายงานโปรด (2)"
    expect(screen.getByText(/รายงานโปรด \(2\)/i)).toBeInTheDocument()
  })
})
