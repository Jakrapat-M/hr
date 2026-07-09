# Benefits/Profile Entry-point IA Cleanup — Review + Documentation Handoff

Status: **review/documentation pass for task 3**  
Source context: `.omx/context/benefits-profile-entrypoint-ia-cleanup-20260430T091000Z.md`  
Review worktree: `worker-3` on 2026-04-30

## Canonical destination contract

The product model is now documented as one destination per user intent:

| Intent | Canonical destination | Notes |
| --- | --- | --- |
| View/update personal profile | `/th/profile/me` | Bare profile URL resets the profile store to the Personal tab. |
| Review/use self-service benefits | `/th/profile/me?tab=benefits` | Owns reimbursement claims plus referral/tax launch cards. |
| Start hospital referral/ePatient request | `/th/profile/me?tab=benefits&service=referral` | Deep link opens the referral panel inside Profile Benefits. |
| Open tax planning estimator | `/th/profile/me?tab=tax&mode=planning` | Deep link opens the tax planning panel without mixing with reimbursement. |
| Browse/learn salary and benefits content | `/th/benefits-hub` | Hub keeps plan browsing, docs, policies, pay, and educational claim context. |
| Legacy benefits shortcuts | `/th/benefits`, `/th/profile/benefits`, `/th/employees/me/benefits` | Redirect to `/th/profile/me?tab=benefits`. |
| Legacy referral shortcut | `/th/hospital-referral` | Redirects to `/th/profile/me?tab=benefits&service=referral`. |

`src/frontend/src/lib/benefit-routes.ts` is the source of truth for the benefit-related route helpers. New benefit entry points should use those helpers instead of handwritten query strings.

## Code review findings

### Routes and redirects

- Legacy benefit routes are compatibility routes only; they call `redirect(...)` and do not render duplicate journeys.
- `/hospital-referral` now uses the shared referral route helper, so referral route changes have one update point.
- `BenefitServicesPanel` uses route helpers for referral and tax planning deep links.
- The profile tab resolver preserves the required defaults: no query means Personal, `tab=benefits` means Benefits, `service=referral` implies Benefits, and `mode=planning` implies the tax/activity panel.

### UI/copy information architecture

- Profile Benefits copy frames the page as the self-service action surface: enrolled plans, balances, and actions from the same profile page.
- The Profile Benefits link to `/benefits-hub` is labeled as a learning hub shortcut, not a second benefits action destination.
- Benefits Hub claim copy continues to send users back to Profile Benefits before starting reimbursement work, keeping the hub in a browse/learn role.
- The service cards keep reimbursement, hospital referral, and tax planning separated with explicit labels and helper copy.

### Domain boundaries preserved

- Reimbursement remains in `benefit-claims.ts` and the reimbursement modal.
- Hospital referral remains in `benefit-referrals.ts` plus referral panels; it does not require reimbursement receipt/amount fields.
- Tax planning remains in `benefit-tax-planning.ts` and the tax panel; selectors expose masked/safe tax data and do not create reimbursement or request rows.
- Cnext tokens/primitives are preserved; no new hardcoded legacy danger/red utility styling was introduced.

## Regression coverage added/confirmed

- `benefit-journey-canonical.test.tsx` covers legacy benefits redirects and now covers `/hospital-referral` redirecting into the canonical profile referral service shortcut.
- `benefit-deferred-services-profile.test.tsx` covers separate reimbursement/referral/tax service cards and now asserts referral/tax links use the canonical query routes.
- Existing profile tests cover bare `/profile/me` resolving to Personal and `/profile/me?tab=benefits` resolving to Benefits.

## Maintenance notes

- Keep new benefit navigation centralized in `benefit-routes.ts`.
- Do not add a second rendered benefits/referral page for compatibility paths; use redirects or clearly labeled shortcuts to the canonical profile route.
- Keep `/benefits-hub` educational/browse-first. Any CTA that starts work should route to Profile Benefits first.
- Do not commit local platform artifacts such as `src/.DS_Store` when staging task changes.
