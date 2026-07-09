import { expect, test } from '@playwright/test'
import { authedContext } from './helpers/storage-auth.helper'

// STA-136 — Bulk Import hub (/admin/import): Step 0 subject picker → shared
// ModuleImportWizard. STA-115 — both employee-change AND benefit-plan subjects
// are now live. Old entry points repoint here; no dead-ends.

test.describe('Bulk Import hub — Step 0 picker', () => {
  test('hr_admin sees Step 0 with both subjects enabled (TH)', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()
    await page.goto('/th/admin/import')

    const employeeCard = page.locator('[data-subject="employee-change"]')
    const benefitCard = page.locator('[data-subject="benefit-plan"]')
    await expect(employeeCard).toBeVisible()
    await expect(benefitCard).toBeVisible()

    // STA-115 — both subjects are now selectable (benefit-plan no longer "Coming soon").
    await expect(employeeCard).toBeEnabled()
    await expect(benefitCard).toBeEnabled()
    await expect(benefitCard).toContainText('เพิ่ม/ปรับสิทธิสวัสดิการ')

    // Breadcrumb resolves to "นำเข้าแบบกลุ่ม", NOT the broad "ศูนย์ Admin" fallback
    // (proves the TITLE_MAP entry sits above the broad /admin entry). The crumb
    // span is responsive-hidden at some widths, so assert DOM presence.
    await expect(page.getByText('ศูนย์ Admin')).toHaveCount(0)
    await expect(page.getByText('นำเข้าแบบกลุ่ม').first()).toBeAttached()

    await context.close()
  })

  test('selecting employee-change mounts the wizard and runs the 4 steps (TH)', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()
    await page.goto('/th/admin/import')

    await page.locator('[data-subject="employee-change"]').click()

    // Step 1 — upload a mock CSV (contents are never parsed in mockup).
    await page.setInputFiles('input[type="file"]', {
      name: 'employee_changes.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('employee_id,position_title\nEMP-0001,Senior Software Engineer\n'),
    })
    await page.getByRole('button', { name: /ถัดไป: ดูตัวอย่าง/ }).click()

    // Step 2 — preview
    await page.getByRole('button', { name: /ถัดไป: ตรวจสอบความถูกต้อง/ }).click()

    // Step 3 — validate
    await page.getByRole('button', { name: /ถัดไป: นำเข้า/ }).click()

    // Step 4 — run import (commits via importEmployees upsert)
    await page.getByRole('button', { name: /เริ่มนำเข้าข้อมูล/ }).click()
    await expect(page.getByRole('button', { name: /นำเข้าไฟล์ใหม่/ })).toBeVisible({ timeout: 15000 })

    await context.close()
  })

  test('both deep-links skip Step 0 and mount their wizard (STA-115)', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()

    // employee-change deep-link → wizard (Step 1 upload affordance visible, no picker).
    await page.goto('/th/admin/import?subject=employee-change')
    await expect(page.getByRole('button', { name: /ถัดไป: ดูตัวอย่าง/ })).toBeVisible()
    await expect(page.locator('[data-subject="benefit-plan"]')).toHaveCount(0)

    // benefit-plan deep-link → wizard too (now live).
    await page.goto('/th/admin/import?subject=benefit-plan')
    await expect(page.getByRole('button', { name: /ถัดไป: ดูตัวอย่าง/ })).toBeVisible()
    await expect(page.locator('[data-subject="employee-change"]')).toHaveCount(0)

    await context.close()
  })

  test('selecting benefit-plan runs the 4 steps and records a benefit-plan job (TH)', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()
    await page.goto('/th/admin/import')

    await page.locator('[data-subject="benefit-plan"]').click()

    // The benefit preview columns are present (Action + plan code).
    await page.setInputFiles('input[type="file"]', {
      name: 'benefit_grant.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('employee_id,action,plan_code,entitle_amount,effective_date\nEMP-0001,add,BE-MED-001,40000,2026-01-01\n'),
    })
    await page.getByRole('button', { name: /ถัดไป: ดูตัวอย่าง/ }).click()
    await expect(page.getByText('BE-MED-001').first()).toBeVisible()
    await page.getByRole('button', { name: /ถัดไป: ตรวจสอบความถูกต้อง/ }).click()
    await page.getByRole('button', { name: /ถัดไป: นำเข้า/ }).click()
    await page.getByRole('button', { name: /เริ่มนำเข้าข้อมูล/ }).click()
    await expect(page.getByRole('button', { name: /นำเข้าไฟล์ใหม่/ })).toBeVisible({ timeout: 15000 })

    await context.close()
  })

  test('EN locale localizes both subject labels and the breadcrumb', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()
    await page.goto('/en/admin/import')

    await expect(page.locator('[data-subject="employee-change"]')).toContainText('Change employee information')
    await expect(page.locator('[data-subject="benefit-plan"]')).toContainText('Add / adjust benefit')
    await expect(page.getByText('ศูนย์ Admin')).toHaveCount(0)
    await expect(page.getByText('Bulk Import').first()).toBeAttached()

    await context.close()
  })
})

test.describe('Bulk Import hub — no dead-ends + guard', () => {
  test('/admin/employees/import redirects into the employee-change wizard', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()
    await page.goto('/th/admin/employees/import')

    await expect(page).toHaveURL(/\/admin\/import\?subject=employee-change/)
    await expect(page.getByRole('button', { name: /ถัดไป: ดูตัวอย่าง/ })).toBeVisible()

    await context.close()
  })

  test('the /admin/benefits "claims & adjustments" affordance reaches the legacy import page', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()
    await page.goto('/th/admin/benefits')

    await page.getByText('เคลม/ปรับสิทธิ (รายการเดิม)').click()
    await expect(page).toHaveURL(/\/admin\/benefits\/import/)

    await context.close()
  })

  test('employee persona is denied /admin/import (guard) and has no sidebar leaf', async ({ browser }) => {
    const context = await authedContext(browser, 'employee')
    const page = await context.newPage()
    await page.goto('/th/admin/import')

    await expect(page.getByText('Access Denied')).toBeVisible()
    await expect(page.getByRole('link', { name: 'นำเข้าแบบกลุ่ม' })).toHaveCount(0)

    await context.close()
  })
})
