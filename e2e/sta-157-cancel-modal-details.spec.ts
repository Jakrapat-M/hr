// STA-157 (BA follow-up) — the cancel-confirmation modal for a pending leave request
// must SHOW which leave (type + dates) is being cancelled, not just a generic prompt.
// Seed a pending first-approval leave row for the ESS persona, open its Cancel modal,
// and assert the leave type + date render above the confirm question.
import { test, expect, type Page } from '@playwright/test'

const PENDING_ROW = {
  id: 'LV-E2E-STA157-0001',
  employeeId: 'EMP001',
  employeeName: 'สมชาย ใจดี',
  leaveType: 'sick',
  leaveCode: 'sick_leave',
  startDate: '2026-06-28',
  endDate: '2026-06-28',
  reason: 'ทดสอบยกเลิกคำขอ',
  status: 'pending',
  submittedAt: '2026-06-26T09:00:00+07:00',
  audit: [],
  days: 1,
  reservedDays: 1,
  awaitingNext: false,
  queueSnapshot: { type: 'leave' },
}

async function seed(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(
    ([row]) => {
      localStorage.setItem(
        'humi-auth',
        JSON.stringify({ state: { userId: 'EMP001', username: 'สมชาย ใจดี', email: 'e@e.com', roles: ['employee'], isAuthenticated: true }, version: 0 }),
      )
      // Pre-seed one pending first-approval leave so the Cancel action is present
      // deterministically (seedFromQueue only seeds when requests.length === 0).
      localStorage.setItem('humi-leave-approvals', JSON.stringify({ state: { requests: [row] }, version: 1 }))
    },
    [PENDING_ROW],
  )
}

test('STA-157 — cancel modal shows the leave type + dates of the request being cancelled', async ({ page }) => {
  await seed(page)
  await page.goto('/th/timeoff')
  await page.waitForLoadState('networkidle').catch(() => {})

  // Reach the "My request status" list.
  const statusTab = page.getByRole('tab', { name: /สถานะ|request status/i }).first()
  if (await statusTab.count()) await statusTab.click()

  const cancelBtn = page.getByRole('button', { name: 'ยกเลิกคำขอ' }).first()
  await expect(cancelBtn).toBeVisible()
  await cancelBtn.click()

  // The confirm modal shows WHICH leave + WHICH dates (the BA follow-up gap).
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('ประเภทการลา')).toBeVisible() // "Leave type" label
  await expect(dialog.getByText('วันที่', { exact: true })).toBeVisible() // "Dates" label
  await expect(dialog.getByText('ลาป่วย', { exact: true })).toBeVisible() // the seeded leave type
  await expect(dialog.getByText(/2569/)).toBeVisible() // Thai BE year of the date
  await expect(dialog.getByText(/ต้องการยกเลิกคำขอลานี้/)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'ยืนยันยกเลิก' })).toBeVisible()
})
