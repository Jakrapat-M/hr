# Benefit Module Pass 1 Implementation Notes

Status: implemented as a front-end first pass for the PRD/test spec in `.omx/plans/prd-benefit-module-requirements.md` and `.omx/plans/test-spec-benefit-module-requirements.md`.

## Canonical employee journey

- Employees start benefit reimbursement from `/profile/me?tab=benefits`.
- Submitted claims are stored in the benefit-domain Zustand aggregate at `src/frontend/src/stores/benefit-claims.ts`.
- `/requests` consumes `selectBenefitRequestSummaries(...)` from the benefit store for tracking instead of creating a separate generic request form.
- `/spd/inbox` renders the `BenefitClaimsInbox` lane for approve, reject, and send-back actions.
- `/admin/benefits` exposes read-only BRD-backed configuration, reporting, cutoff, and payment surfaces.

## Implemented first-pass scope

- Claim statuses: `pending_spd`, `send_back`, `approved`, `rejected`.
- Claim audit trail for submit, approve, reject, send-back, and resubmit.
- Duplicate receipt detection by employee, benefit code, and receipt/document number.
- Attachment validation for `.pdf`, `.jpg`, `.jpeg`, `.png`, `.pptx`, `.xlsx`, max 10 MB/file, max 5 files.
- Employee profile benefits tab with reimbursement CTA, workbook-style conditional fields, ePatient `ขอใบส่งตัว` deferred action, submitted claim history, and send-back visibility.
- Requests hub projection with request ID, benefit type, receipt/document number, amount, submitted date, and status.
- SPD review lane with reason-required reject/send-back controls.
- Admin read-only master data, eligibility, amount rules, field configuration, workflow/cutoff, report preview, payment steps, and BE User Management deferrals.

## Deferred integrations

- Real entitlement calculation and final benefit taxonomy.
- Full ePatient transfer request submission.
- Configurable admin edit/import/export and field-rule engines.
- Real document storage/download, payroll/accounting/bank posting, and Excel/CSV export.
- BE User Management editing for data permission groups, application role groups, and user assignment.

## Review notes

- The benefit aggregate remains the single source for reimbursement workflow state; keep `/requests` as a projection consumer only.
- Compatibility aliases in `benefit-claims.ts` support both worker test fixture shapes (`benefitType`/`totalClaimAmount` and `claimType`/`claimAmount`) while normalizing to the canonical model on submit.
- The older duplicate in-profile claim widget was removed during review to avoid two independent claim forms and stale store API references.
