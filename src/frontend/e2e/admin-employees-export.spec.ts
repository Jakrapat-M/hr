import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { authedContext } from './helpers/storage-auth.helper'

const EXPECTED_HEADER = 'employee_id,name_th,employee_class,hire_date,company,position_title,probation_status,status'

function stripBom(text: string) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

test.describe('Admin employees CSV export', () => {
  test('exports the currently visible filtered rows as a sensitive-safe CSV', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()

    await page.goto('/th/admin/employees')

    const exportButton = page.getByRole('button', { name: 'ดาวน์โหลด CSV' })
    await expect(exportButton).toBeVisible()

    await page.getByRole('searchbox', { name: 'ค้นหาพนักงาน' }).fill('EMP-0001')
    await expect(page.getByRole('row', { name: /พนักงาน/ })).toHaveCount(1)
    await expect(exportButton).toBeEnabled()

    const visibleRows = await page.getByRole('row', { name: /พนักงาน/ }).count()
    const downloadPromise = page.waitForEvent('download')
    await exportButton.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/employees-\d{4}-\d{2}-\d{2}\.csv/)

    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    const rawCsv = await readFile(downloadPath!, 'utf8')
    expect(rawCsv.charCodeAt(0)).toBe(0xfeff)

    const csvLines = stripBom(rawCsv).split(/\r?\n/)
    expect(csvLines[0]).toBe(EXPECTED_HEADER)
    expect(csvLines).toHaveLength(visibleRows + 1)
    expect(rawCsv).not.toMatch(/salary|national_id|bank_|personal_email|personal_phone/i)

    await context.close()
  })

  test('disables export when the current search has zero matching rows', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()

    await page.goto('/th/admin/employees')

    const exportButton = page.getByRole('button', { name: 'ดาวน์โหลด CSV' })
    await page.getByRole('searchbox', { name: 'ค้นหาพนักงาน' }).fill('NO-SUCH-EMPLOYEE')
    await expect(page.getByText('ไม่พบพนักงานที่ตรงกับการค้นหา')).toBeVisible()

    await expect(exportButton).toBeDisabled()
    await expect(exportButton).toHaveAttribute('aria-disabled', 'true')

    await context.close()
  })
})
