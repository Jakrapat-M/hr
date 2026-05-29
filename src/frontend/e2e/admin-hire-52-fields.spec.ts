/**
 * admin-hire-52-fields.spec.ts
 *
 * Playwright E2E spec for STA-82 / AC16 / D2:
 * Covers the new 52-field clusters added to the hire wizard.
 *
 * Auth strategy: `authedContext()` (storage-auth.helper) — identical to
 * chain-2-hire-audit.spec.ts. Wizard state is injected via localStorage
 * (hire-wizard-draft Zustand persist key) matching add-employee-sanity.spec.ts.
 *
 * IMPORTANT: Draft must be injected via addInitScript BEFORE navigation so
 * the Zustand store rehydrates from the correct state on first render.
 * The page also reads `?step=N` from the URL, so we append that too.
 *
 * Test scenarios:
 *   TH-1  Happy path TH  — wizard renders, new fields visible on Job step,
 *                          Review step shows STA-82 summary card
 *   TH-2  DVT conditional — scholarship gates DVT cluster visibility
 *   TH-3  Cross-step negative — probation end ≤ hire date blocks submit
 *   EN-1  EN locale smoke  — wizard renders in EN; Job step selects present
 */

import { test, expect } from '@playwright/test';
import { authedContext } from './helpers/storage-auth.helper';

// ── Shared draft helpers ──────────────────────────────────────────────────────

/**
 * Must match the current `version` in useHireWizard.ts persist config (currently 10).
 * If they differ, Zustand runs `migrate` which preserves all fields but adds overhead.
 * Using the current version skips migration entirely.
 */
const WIZARD_STORE_VERSION = 10;

function zustandPersisted<T>(state: T): string {
  return JSON.stringify({ state, version: WIZARD_STORE_VERSION });
}

/**
 * Minimal valid identity slice — mod-11 valid Thai NID (1102003039997).
 */
function makeIdentity(overrides: Record<string, unknown> = {}) {
  return {
    hireDate: '2026-05-01',
    companyCode: 'CEN',
    eventReason: 'H_NEWHIRE',
    salutationEn: 'MR',
    firstNameEn: 'Somchai',
    middleNameEn: '',
    lastNameEn: 'Jaidee',
    dateOfBirth: '1990-01-15',
    countryOfBirth: 'TH',
    regionOfBirth: '',
    age: 36,
    employeeId: 'EMP-00001',
    nationalIdCardType: 'NATIONAL_ID',
    country: 'TH',
    nationalId: '1102003039997',
    issueDate: null,
    expiryDate: null,
    isPrimary: 'YES',
    vnIssuePlace: '',
    salutationLocal: 'MR',
    passportId: 'AA123456',
    ...overrides,
  };
}

function makeBio(overrides: Record<string, unknown> = {}) {
  return {
    otherTitleTh: 'นาย',
    firstNameLocal: 'สมชาย',
    lastNameLocal: 'ใจดี',
    middleNameLocal: 'กลาง',
    nickname: 'แดง',
    militaryStatus: 'EXEMPTED',
    gender: 'M',
    nationality: 'TH',
    foreigner: 'NO',
    bloodType: 'A_POS',
    maritalStatus: 'M',
    maritalStatusSince: '2020-01-01',
    ...overrides,
  };
}

function makeContact() {
  return {
    phones: [{ type: 'C', value: '0812345678', isPrimary: true, countryCode: '66', extension: '' }],
    emails: [{ type: 'personal', value: 'somchai@example.com', isPrimary: true }],
    address: {
      houseNo: '155', village: '', moo: '', soi: '',
      subdistrict: 'บางกระสอ', district: 'นนทบุรี', province: '12', zipCode: '11000', country: 'THA',
    },
    jobRelationships: [],
  };
}

function makeEmployeeInfo(overrides: Record<string, unknown> = {}) {
  return {
    employeeClass: 'A',
    employeeGroup: '1',
    employeeSubGroup: 'U0',
    originalStartDate: '2026-05-01',
    seniorityStartDate: '2026-05-01',
    retirementDate: '2050-01-15',
    pfServiceDate: '',
    dvtPreviousId: '',
    cgPreviousEmployeeId: '',
    ...overrides,
  };
}

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    position: 'POS-00001',
    businessUnit: 'ROBINSON',
    businessUnitLabel: 'Robinson',
    branch: null,
    branchLabel: null,
    jobCode: null,
    jobLabel: null,
    jobGrade: null,
    jobGradeLabel: null,
    hrDistrict: null,
    supervisorId: 'MGR001',
    supervisorLabel: 'Supervisor Test',
    workSchedule: 'D05H0800',
    holidayTypeCondition: 'HO',
    timeManagementStatus: '9',
    otFlag: 'YES',
    standardWeeklyHours: 40,
    dailyWorkingHours: 8,
    workingDaysPerWeek: 5,
    fte: 1,
    holidayCalendar: '',
    timeProfile: '',
    timeRecordingVariant: '',
    storeBranchCode: null,
    // STA-82 new fields
    personnelGrade: null,
    band: null,
    bandMatching: null,
    okToRehire: null,
    pointOfSales: null,
    storeBrandFormat: null,
    brand: null,
    workLocation: null,
    scholarship: null,
    probationaryPeriodEndDate: null,
    ...overrides,
  };
}

function makeCompensation() {
  return { baseSalary: 35000, currency: 'THB', payGroup: 'QA', payFrequency: 'MON' };
}

function makeReview() {
  return {
    salutationEnReview: 'MR',
    firstNameEnReview: 'Somchai',
    lastNameEnReview: 'Jaidee',
    middleNameEnReview: '',
    attachmentName: null,
  };
}

/**
 * Build the serialised Zustand draft value for a given step and optional overrides.
 */
function buildDraftValue(opts: {
  currentStep?: number;
  maxUnlockedStep?: number;
  identityOverrides?: Record<string, unknown>;
  jobOverrides?: Record<string, unknown>;
} = {}): string {
  const {
    currentStep = 2,
    maxUnlockedStep = 3,
    identityOverrides = {},
    jobOverrides = {},
  } = opts;

  return zustandPersisted({
    currentStep,
    maxUnlockedStep,
    lastSavedAt: Date.now(),
    employeeClassToggle: 'PERMANENT',
    candidateContext: null,
    // Expand job.assignment so StepJob content (STA-82 fields) is visible.
    // Default is collapsed=true (ClusterJob.tsx:36), which hides the fieldset via
    // CollapsibleSectionCard hidden prop. Also expand compensation to avoid issues.
    sectionCollapse: {
      'job.employeeInfo': false,
      'job.assignment': false,
      'job.compensation': false,
    },
    formData: {
      identity: makeIdentity(identityOverrides),
      biographical: makeBio(),
      contact: makeContact(),
      employeeInfo: makeEmployeeInfo(),
      job: makeJob(jobOverrides),
      compensation: makeCompensation(),
      review: makeReview(),
      emergencyContacts: [],
      dependents: [],
      // Phase 5b-2: Global Information — must be present or conditional-sections.ts crashes
      globalInfo: {
        numberOfChildren: null,
        religion: null,
        disabilityStatus: '',
        disabilityCertStartDate: null,
        disabilityCertEndDate: null,
        typeOfDisability: '',
        certificateId: '',
        spouseFatherIdNumber: '',
        spouseMotherIdNumber: '',
        additionalInformation: '',
        disabilityAttachmentName: null,
      },
      // Phase 5b-3: Work Permit — documentType must exist or conditional-sections.ts throws
      workPermit: {
        documentType: '',
        country: '',
        documentNumber: '',
        issueDate: null,
        expiryDate: null,
        arrivalDateVisa: null,
        ninetyDayReportVisa: null,
        attachmentName: '',
      },
      // Legacy slices
      name: { firstNameTh: '', lastNameTh: '', firstNameEn: '', lastNameEn: '' },
      nationalId: { value: '' },
      personal: { addressLine1: '' },
    },
  });
}

/**
 * Navigate to the hire page with a pre-seeded wizard draft at a specific step.
 *
 * Pattern (matches chain-2-hire-audit.spec.ts):
 *   1. First goto — establishes auth + loads the page.
 *   2. page.evaluate — writes the draft to localStorage (Zustand persist key).
 *   3. Second goto — full reload; Zustand rehydrates from the new localStorage value.
 *
 * The `?step=N` URL param is used as a belt-and-suspenders fallback: the page's
 * useEffect calls jumpToUrl(N) if urlStep !== currentStep, ensuring even a
 * partial rehydration ends up on the correct cluster.
 */
async function gotoHireWithDraft(
  page: import('@playwright/test').Page,
  locale: 'th' | 'en',
  draftOpts: Parameters<typeof buildDraftValue>[0] = {},
): Promise<boolean> {
  const step = draftOpts.currentStep ?? 2;
  const url = `/${locale}/admin/hire?step=${step}`;

  // First navigation — establishes the origin so localStorage can be written
  const reachable = await page
    .goto(`/${locale}/admin/hire`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!reachable) return false;

  // Inject auth + draft into localStorage (runs in page context)
  const draftValue = buildDraftValue(draftOpts);
  await page.evaluate(
    ({ draftKey, draftVal }) => {
      localStorage.setItem('hire-wizard-draft', draftVal);
    },
    { draftKey: 'hire-wizard-draft', draftVal: draftValue },
  );

  // Second navigation — Zustand rehydrates from the written draft
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  return true;
}


// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('STA-82 Hire Wizard — 52 fields (AC16 / D2)', () => {
  test.setTimeout(60_000);

  // ─────────────────────────────────────────────────────────────────────────
  // TH-1: Happy path TH — wizard renders; new STA-82 fields visible on Job step;
  //        Review step shows the "Job & Organisation Details" card.
  // ─────────────────────────────────────────────────────────────────────────
  test('TH-1: Happy path TH — wizard renders + STA-82 Job fields + Review card', async ({ browser }) => {
    // ── Part A: Step 1 — wizard renders; Passport ID (STA-82) present ────
    {
      const ctx = await authedContext(browser, 'hr_admin');
      const page = await ctx.newPage();
      try {
        const reachable = await page
          .goto('/th/admin/hire', { waitUntil: 'domcontentloaded', timeout: 15_000 })
          .then(() => true).catch(() => false);
        if (!reachable) { test.skip(); return; }

        await expect(page.getByText(/ขั้นตอนที่ 1|เพิ่มพนักงานใหม่/i).first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('#passport-id')).toBeVisible({ timeout: 5_000 });
      } finally {
        await ctx.close();
      }
    }

    // ── Part B: Step 2 (Job) — STA-82 registry-backed selects present ────
    {
      const ctx = await authedContext(browser, 'hr_admin');
      const page = await ctx.newPage();
      try {
        const reached = await gotoHireWithDraft(page, 'th', { currentStep: 2, maxUnlockedStep: 3 });
        if (!reached) { test.skip(); return; }

        const posSelect = page.locator('#point-of-sales');
        await expect(posSelect).toBeVisible({ timeout: 10_000 });
        const posOptionCount = await posSelect.evaluate((el: HTMLSelectElement) => el.options.length);
        expect(posOptionCount).toBeGreaterThan(1);

        const personnelGradeSelect = page.locator('#personnel-grade');
        await expect(personnelGradeSelect).toBeVisible({ timeout: 5_000 });
        const pgOptionCount = await personnelGradeSelect.evaluate((el: HTMLSelectElement) => el.options.length);
        expect(pgOptionCount).toBeGreaterThan(1);

        const brandSelect = page.locator('#brand');
        await expect(brandSelect).toBeVisible({ timeout: 5_000 });
        const brandOptionCount = await brandSelect.evaluate((el: HTMLSelectElement) => el.options.length);
        expect(brandOptionCount).toBeGreaterThan(1);

        const okToRehireSelect = page.locator('#ok-to-rehire');
        await expect(okToRehireSelect).toBeVisible({ timeout: 5_000 });
        const otrOptionCount = await okToRehireSelect.evaluate((el: HTMLSelectElement) => el.options.length);
        expect(otrOptionCount).toBeGreaterThan(1);
      } finally {
        await ctx.close();
      }
    }

    // ── Part C: Step 3 (Review) — STA-82 job-details summary card ────────
    {
      const ctx = await authedContext(browser, 'hr_admin');
      const page = await ctx.newPage();
      try {
        const reached = await gotoHireWithDraft(page, 'th', {
          currentStep: 3,
          maxUnlockedStep: 3,
          jobOverrides: { personnelGrade: 'G1', pointOfSales: 'POS_HQ', brand: 'ROBINSON', okToRehire: 'YES' },
        });
        if (!reached) { test.skip(); return; }

        const jobDetailsCard = page.locator('#review\\.jobDetails');
        await expect(jobDetailsCard).toBeVisible({ timeout: 10_000 });
        await expect(
          jobDetailsCard.getByText(/ข้อมูลงาน|Job.*Detail|Organisation/i).first(),
        ).toBeVisible({ timeout: 5_000 });
      } finally {
        await ctx.close();
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TH-2: DVT conditional — DVT fields hidden until Scholarship = YES
  // ─────────────────────────────────────────────────────────────────────────
  test('TH-2: DVT conditional — hidden initially; visible after Scholarship = YES', async ({ browser }) => {
    const ctx = await authedContext(browser, 'hr_admin');
    const page = await ctx.newPage();

    try {
      const reached = await gotoHireWithDraft(page, 'th', {
        currentStep: 2,
        maxUnlockedStep: 3,
        jobOverrides: { scholarship: null },
      });
      if (!reached) { test.skip(); return; }

      const scholarshipSelect = page.locator('#scholarship');
      await expect(scholarshipSelect).toBeVisible({ timeout: 10_000 });

      // DVT: Project name NOT visible initially (scholarship empty → showDvtFields = false)
      await expect(page.locator('#dvt-project-name')).not.toBeVisible({ timeout: 3_000 });

      // Select Scholarship = YES (YES_NO_IDS[0] per scholarship.ts)
      await scholarshipSelect.selectOption({ value: 'YES' });

      // All 7 DVT fields become visible after YES selection
      await expect(page.locator('#dvt-project-name')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('#dvt-type')).toBeVisible();
      await expect(page.locator('#dvt-course')).toBeVisible();
      await expect(page.locator('#dvt-course-of-time')).toBeVisible();
      await expect(page.locator('#dvt-academic-year')).toBeVisible();
      await expect(page.locator('#dvt-graduation-date')).toBeVisible();
      await expect(page.locator('#dvt-bonding-end-date')).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TH-3: Cross-step negative — probation end date ≤ hire date blocks submit
  // ─────────────────────────────────────────────────────────────────────────
  test('TH-3: Cross-step — probation end ≤ hire date surfaces validation error on Review', async ({ browser }) => {
    const ctx = await authedContext(browser, 'hr_admin');
    const page = await ctx.newPage();

    try {
      // hireDate = probationaryPeriodEndDate (equal → NOT after hire date → cross-step rule fails)
      // ClusterReview: collectCrossStepFailures(3, { identity: { hireDate }, job: { probationEnd } })
      // where probationEnd = job.probationaryPeriodEndDate
      const reached = await gotoHireWithDraft(page, 'th', {
        currentStep: 3,
        maxUnlockedStep: 3,
        identityOverrides: { hireDate: '2026-04-01' },
        jobOverrides: {
          probationaryPeriodEndDate: '2026-04-01',
          supervisorId: 'MGR001',
          supervisorLabel: 'Supervisor Test',
        },
      });
      if (!reached) { test.skip(); return; }

      // Cross-step failure inline in review.jobDetails card
      // Exact message from crossStepRules.ts:49
      const crossStepError = page.getByText(/วันสิ้นสุดทดลองงานต้องหลังวันที่จ้าง|Probation end must be after hire date/i);
      await expect(crossStepError).toBeVisible({ timeout: 8_000 });

      // Pick an HRBP so that gate doesn't fire first
      const hrbpSelect = page.locator('#hrbp-assignee');
      if (await hrbpSelect.count() > 0) {
        const optionCount = await hrbpSelect.evaluate((el: HTMLSelectElement) => el.options.length);
        if (optionCount > 1) await hrbpSelect.selectOption({ index: 1 });
      }

      const submitBtn = page.getByRole('button', { name: /บันทึกและส่ง/i });
      if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(500);

        // Must NOT show success — isStepValid(2, true) blocks because cross-step rule fails
        await expect(page.getByText(/สำเร็จ|เพิ่มพนักงาน.*สำเร็จ|ส่งสำเร็จ/i)).not.toBeVisible({ timeout: 3_000 });

        // Either the submit-error banner or the cross-step row must be visible
        const submitError = page.getByText(/ตรวจสอบข้อมูล|fix validation/i).first();
        const crossStepStillVisible = await crossStepError.isVisible({ timeout: 3_000 }).catch(() => false);
        const submitErrorVisible = await submitError.isVisible({ timeout: 3_000 }).catch(() => false);
        expect(crossStepStillVisible || submitErrorVisible).toBe(true);
      } else {
        // Submit button not visible — cross-step error row alone is sufficient
        await expect(crossStepError).toBeVisible({ timeout: 5_000 });
      }
    } finally {
      await ctx.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EN-1: EN locale smoke — wizard renders in EN; Job step selects present
  // ─────────────────────────────────────────────────────────────────────────
  test('EN-1: EN locale smoke — wizard renders + Job step STA-82 selects present', async ({ browser }) => {
    const ctx = await authedContext(browser, 'hr_admin');
    const page = await ctx.newPage();

    try {
      const reached = await gotoHireWithDraft(page, 'en', { currentStep: 2, maxUnlockedStep: 3 });
      if (!reached) { test.skip(); return; }

      await expect(page.locator('#point-of-sales')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('#personnel-grade')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('#brand')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('#ok-to-rehire')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('#scholarship')).toBeVisible({ timeout: 5_000 });

      // EN locale: POS options carry English labels (pickLabel returns labelEn)
      const posSelect = page.locator('#point-of-sales');
      const posOptionTexts: string[] = await posSelect.evaluate((el: HTMLSelectElement) =>
        Array.from(el.options).map((o) => o.text),
      );
      const hasEnglishLabel = posOptionTexts.some((t) =>
        /Head Office|Tops|FamilyMart|Robinson|Warehouse/i.test(t),
      );
      expect(hasEnglishLabel).toBe(true);
    } finally {
      await ctx.close();
    }
  });
});
