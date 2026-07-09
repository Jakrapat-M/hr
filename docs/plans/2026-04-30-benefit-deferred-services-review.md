# Historical note

This document records the earlier deferred-services review checklist. The current Benefits/Profile entry-point IA review and route contract live in `docs/plans/2026-04-30-benefits-profile-entrypoint-ia-cleanup.md`. Treat the "current worktree" findings below as historical pre-integration observations unless revalidated against the latest branch.

---

# Benefit Deferred Services — Implementation Review + Documentation Handoff

Status: **review/documentation pass for task 3**  
Source PRD: `.omx/plans/prd-benefit-deferred-services.md`  
Source test spec: `.omx/plans/test-spec-benefit-deferred-services.md`  
Review worktree: `worker-3` on 2026-04-30

## Review scope

This note documents the review checklist and implementation guardrails for the deferred Benefit services work:

- **Hospital Referral / ขอใบส่งตัว** as a separate Benefit-adjacent domain.
- **Tax Planning / วางแผนภาษี** as a local estimator domain with PII-safe selectors.
- **Shell/projections** through profile benefits, `/requests`, SPD inbox, admin benefits, and legacy referral routing.
- **Cnext design/test** expectations for migrated referral and tax surfaces.
- **Verification evidence** needed before this feature is considered complete.

The defining boundary is: reimbursement claims stay in `benefit-claims.ts`; referral and tax planning must not reuse reimbursement receipt, amount, attachment, or claim-state rules as their canonical model.

## Current codebase review findings

The current worker-3 worktree still shows the pre-deferred-service state for several surfaces. The findings below are intended as review criteria for integration and as documentation for any remaining follow-up.

### 1. Reimbursement domain remains isolated today

- `src/frontend/src/stores/benefit-claims.ts` is still the reimbursement-only aggregate.
- `/requests` consumes `selectBenefitRequestSummaries(...)` from the benefit claim store and removes the generic claim form from the catalog.
- `/spd/inbox` renders `BenefitClaimsInbox` as the action panel for reimbursement claims.
- `/admin/benefits` presents read-only reimbursement master/report/payment previews.

This is a good baseline. Referral and tax planning should add selectors beside reimbursement, not inside `benefit-claims.ts`.

### 2. Hospital Referral is still legacy/canonical-route unsafe in this worktree

- `src/frontend/src/app/[locale]/hospital-referral/page.tsx` owns a standalone local journey through `useHospitalReferral`.
- `src/frontend/src/hooks/use-hospital-referral.ts` still uses the older workflow model (`submitted`, `pending_manager`, `pending_hr`) instead of the PRD's SPD-only first-pass states (`draft`, `pending_spd`, `send_back`, `approved`, `rejected`, `letter_issued`, `cancelled`).
- `src/frontend/src/components/hospital-referral/*` still uses legacy utility color classes for status chips in places, including hardcoded red/orange/purple utility tones. Migrated referral UI should use Cnext tokens or Cnext primitives.
- The profile benefits tab still shows the disabled combined action `ขอใบส่งตัว · วางแผน` instead of separate service cards.

Required integration outcome: `/[locale]/hospital-referral` should redirect or render the same canonical profile-benefits referral surface at `/[locale]/profile/me?tab=benefits&service=referral`; it must not remain a second source of referral state.

### 3. Tax Planning is not implemented in this worktree

- The profile tax panel currently renders legacy tax document rows only.
- No `benefit-tax-planning` store or `tax-planning` calculator helper is present in this worktree.
- No masked tax profile, allowance-input estimator, approximate-tax disclaimer, or disabled/planned submit-for-review CTA is present.

Required integration outcome: tax planning must be local-estimator only for MVP, must avoid raw tax ID persistence, and must not create `/requests` rows or SPD/payroll inbox rows until review workflow scope is explicitly approved.

### 4. Shell/projection risks to lock during integration

- `/requests` should merge reimbursement and referral rows through domain selectors only. It must not render new referral/tax start forms or mutate referral/tax state.
- `/requests` should not include tax planning rows in MVP because submit-for-review is deferred.
- `BenefitClaimsInbox` should remain reimbursement-only.
- Referral review should use a separate `BenefitReferralInbox` lane.
- The current SPD slot list contains two reimbursement summary slots in `src/frontend/src/app/[locale]/spd/inbox/page.tsx`; integration should avoid duplicating reimbursement and referral rows in the unified summary shell.
- Sidebar benefits navigation should continue to point to `/th/profile/me?tab=benefits`.

### 5. Admin/read-only documentation expectations

`/admin/benefits` should continue to show reimbursement configuration and add read-only deferred-service sections:

- Referral configuration preview: hospital network, SPD workflow, ePatient integration status, letter template status.
- Tax planning configuration preview: tax year, bracket assumptions, allowance categories/caps, payroll integration status.
- Edit/import/export/sync/payroll actions should remain disabled or marked planned.

## Implementation review checklist

Use this checklist before integrating any worker implementation branch.

### Referral domain

- [ ] Add a separate referral store/module such as `src/frontend/src/stores/benefit-referrals.ts`.
- [ ] Use the MVP status path: `draft -> pending_spd -> send_back | rejected | approved -> letter_issued | cancelled`.
- [ ] Validate hospital, covered person, service reason, and preferred date.
- [ ] Support dependent validation against mock dependent/profile data.
- [ ] Generate referral request IDs independently from reimbursement claim IDs.
- [ ] Generate referral number, validity window, issuer, and letter metadata only on `letter_issued`.
- [ ] Add `selectBenefitReferralRequestSummaries(...)` for `/requests` projection.
- [ ] Add `selectReferralInboxRows(...)` for SPD referral lane.
- [ ] Do not require receipt number, receipt date, claim amount, or reimbursement attachments.
- [ ] Do not import or mutate `benefit-claims.ts` from referral actions.

### Tax planning domain

- [ ] Add deterministic calculator helpers such as `src/frontend/src/lib/tax-planning.ts`.
- [ ] Add a separate store/module such as `src/frontend/src/stores/benefit-tax-planning.ts`.
- [ ] Expose only masked tax ID and summary DTOs through selectors.
- [ ] Avoid Zustand `persist` for payroll-sensitive snapshots; if later persistence is added, persist only user-entered allowance drafts and never raw tax IDs.
- [ ] Validate negative income/deduction inputs.
- [ ] Format all amounts as THB and label results as approximate planning estimates.
- [ ] Keep tax documents separate from the estimator.
- [ ] Keep submit-for-review disabled/planned and do not create tax review requests in MVP.
- [ ] Do not add tax planning rows to `/requests` or SPD/payroll inbox in MVP.

### Profile/shell/projections

- [ ] Replace the disabled combined benefits action with three separate Cnext-styled cards/actions: reimbursement, referral, tax planning.
- [ ] Referral action opens/navigates to `/profile/me?tab=benefits&service=referral`.
- [ ] Tax planning action opens/navigates to `/profile/me?tab=tax&mode=planning`.
- [ ] `/hospital-referral` is a compatibility redirect or shared canonical wrapper.
- [ ] `/requests` remains projection-only and consumes domain selectors.
- [ ] SPD inbox renders reimbursement and referral lanes once each.
- [ ] Admin benefits adds read-only referral/tax setup previews without enabling real integrations.

### Cnext design and accessibility

- [ ] New/refactored surfaces use Cnext `Card`, `Button`, `Modal`, field components, or tokenized `cnext-*` classes.
- [ ] New/refactored sources do not introduce hardcoded brick/red/crimson utility classes for danger states; use danger tokens.
- [ ] Status chips fit Thai labels at mobile width.
- [ ] Forms expose visible labels, focus rings, and at least 44px touch targets for primary actions.
- [ ] Thai-first helper, validation, and disclaimer copy is visible.

## Verification checklist

Run these checks from `src/frontend` after implementation:

```bash
npx tsc --noEmit
npm test -- --run src/__tests__/benefit-claims-store.test.ts src/__tests__/benefit-workflow-surfaces.test.tsx
npm test -- --run src/__tests__/benefit-referrals-store.test.ts src/__tests__/benefit-referral-surfaces.test.tsx src/__tests__/benefit-referral-routes.test.tsx
npm test -- --run src/__tests__/tax-planning.test.ts src/__tests__/benefit-tax-planning-store.test.ts src/__tests__/tax-planning-surfaces.test.tsx
npm test -- --run src/__tests__/benefit-deferred-requests-projection.test.tsx src/__tests__/benefit-referral-inbox.test.tsx src/__tests__/admin-benefit-deferred-services.test.tsx
npm run lint
npm run build
```

Manual browser smoke should include:

- `/th/profile/me?tab=benefits`
- `/th/profile/me?tab=benefits&service=referral`
- `/th/profile/me?tab=tax&mode=planning`
- `/th/hospital-referral`
- `/th/requests`
- `/th/spd/inbox`
- `/th/admin/benefits`

## Integration notes for the leader

- This review/doc pass intentionally does not edit `.omx/plans/*`; those files remain the approved PRD/test-spec source of truth.
- The doc records current code risks observed in worker-3 and should be rechecked against implementation branches before merge.
- If implementation branches already add referral/tax stores and tests, use this checklist as the review rubric rather than as evidence that the integrated branch is incomplete.
