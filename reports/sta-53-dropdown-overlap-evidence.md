# STA-53 dropdown overlap evidence

Date inspected: 2026-05-17

## Scope

June feedback #6 asked to investigate dropdown overlap risk for the STA-24 pay-rate-change route.

Inspected source:
- `src/frontend/src/app/[locale]/admin/employees/[id]/pay-rate-change/page.tsx`
- `src/frontend/src/components/admin/lifecycle/ReasonPicker.tsx`

## Evidence

The pay-rate-change route uses native browser controls for every dropdown in the form:

- Event Reason is rendered by `ReasonPicker`, which returns a native `<select>`.
- Reason for Salary Adjust is a native `<select>` rendered only for `PRCHG_SALADJ`.
- Pay Group is a native `<select>`.
- Pay Component is a native `<select>`.
- Currency is a native `<select>`.
- Recurring payment row Pay Component and Currency are native `<select>` controls.

There is no custom absolutely-positioned dropdown menu, popover, portal, or route-local z-index layer for those controls in the inspected route. Native select option popups are handled by the browser/OS rather than by route DOM stacking contexts, so the reported overlap source is not present in this route implementation.

## Decision

No code change is required for dropdown overlap in STA-53. A z-index or portal fix would be speculative here because there is no custom menu surface to layer.
