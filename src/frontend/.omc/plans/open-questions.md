# Open Questions

## 7-Part Shell/IA UI Feature Set - 2026-05-25
- [ ] Req2 ribbon: render a quiet identity strip when NOT impersonating, or nothing at all? — Blueprint shows amber only during impersonation; affects always-visible vs proxy-only behavior.
- [ ] Req5 `probation` sidebar leaf: repoint to a real `/workflows/probation` list route or keep the `/manager-dashboard` stub? — Need to verify a probation list route exists before repointing.
- [ ] Req7: replace the heavy 861-line `quick-approve-page.tsx` as the default page, or feature-flag the simplified table alongside it? — Affects whether old workspace tests stay or migrate.
- [ ] Req3: physically remove calendar i18n keys (`humiHero.calendar*`, `prevMonth`, `nextMonth`) + `HUMI_CAL_EVENTS`/`CAL_DAYS_TH`, or leave as dead code? — Dead-code cleanup vs minimal-diff.
- [ ] Req4 access-tier mapping (A/B/C/D ← roles): confirm the tier definitions with the blueprint before coding `persona-tiers.ts`. — A=admin, B=hrbp/spd, C=manager, D=employee is a recommendation, not verified.
- [ ] Linear coverage: Reqs 1/3/4/6 have NO matching ticket. Create UI-mockup tickets per req, or attach to an umbrella? — Required before PRs per the validate-requirement-in-Linear rule. Also re-run search against live endpoint `https://mcp.linear.app/mcp` (the `/sse` MCP transport intermittently rejected during planning).

## Sidebar Menu Simplification - 2026-05-25
- [ ] Notifications System leaf: keep `/admin/system/notifications` as a 5th System menu item, or leave it reachable only via `/admin/system`? — Default in plan = cut (cleanest, System = 4 leaves); a real page exists so it is a judgment call.
- [x] RESOLVED (ralplan iter-2, MF-2): System `docreview` vs HR `hr-docs` both → `/admin/documents`. Verified NO distinct doc-review-queue route exists (`/admin/system/security/consent` = consent mgmt; `/admin/system/system-features/edocuments` = feature toggle — neither is a review queue). DECISION: keep `docreview → /admin/documents` as a documented Principle-1 exception (same screen, two persona contexts), encoded in AC-DEDUPE. No longer open.
- [ ] `probation` href target: plan uses `/manager-dashboard/probations`; an alternative `/workflows/probation` list route also exists — confirm which is the canonical probation surface for the manager grouping.
- [ ] Timesheet h1 relabel depth: keep h1 `บันทึกเวลางาน`/`Timesheet` and only fix the eyebrow (minimal diff), or also expand h1 to `บันทึกชั่วโมงงานรายโครงการ` for maximum clarity? — Plan default = eyebrow-only.

### Resolved during ralplan iteration 2 (no longer open)
- [x] Req1 token check — VERIFIED: `--color-accent-alt: #5B6CE0` + `--color-accent-alt-soft: #E1E4FB` exist (globals.css:45-46); `--color-warning-soft: #FEF3C7` (58). `--color-warning-tint` does NOT exist — plan now uses `bg-warning-soft` everywhere (MF-1).
- [x] Req6 inbox icon — DECIDED: lucide `Mail` (envelope) per the reference image; no further confirmation needed (MF-6 smaller-item).
- [x] Proxy-exit destination — DECIDED: canonical `/${locale}/home` for BOTH the ribbon and the PersonaSwitcher modal; PersonaSwitcher's old `/${locale}/admin` exit is changed (MF-4).
