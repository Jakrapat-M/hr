# Team Alpha — Single Requirements Brief (Humi Token Design)

สถานะเอกสาร: Consolidated requirement brief for Team Alpha  
วันที่จัดทำ: 2026-05-20  
Scope: UI/design/storyboard requirement summary across HR modules  
Design system: Humi tokens from `design.md`, `docs/design-system-humi.md`, and `src/frontend/src/app/globals.css`

---

## 1. Executive Requirement

Team Alpha ต้อง build / polish HR demo ให้เป็น **single coherent HR lifecycle experience** โดยใช้ Humi design token system เดียวกันทุก module:

1. **Employee Center** — master profile, self-service change, HR lifecycle actions, manager/HR approvals
2. **Time** — attendance, leave/time-off, overtime, correction, manager approval
3. **Payroll** — setup, run, review, approve, payslip, tax/reporting with masking
4. **Benefit** — entitlement, claim/referral, beneficiary, admin rules, HRBP/SPD handoff, payment preview

เอกสารนี้เป็น requirement summary สำหรับทีม Alpha เท่านั้น ไม่ใช่ backend authorization. Backend remains blocked until HR/module-owner sign-off และ follow-up backend issues/seeds ถูกสร้างพร้อม AC แยกต่างหาก

## 2. Humi Design Token Contract

ทุกหน้าที่ Team Alpha แตะต้องต้องใช้ Humi token utility / CSS variable ตามนี้ ห้าม hardcode visual identity ใหม่

### Visual baseline

| Design axis | Required token behavior |
| --- | --- |
| Page background | `bg-canvas` / `--color-canvas: #F6F1E8` |
| Surface/card | `bg-surface`, `bg-canvas-soft`, `border-hairline`, `shadow-[var(--shadow-card)]` |
| Text | `text-ink`, `text-ink-soft`, `text-ink-muted` |
| Primary action | `bg-accent`, `ring-accent-soft`, `--color-accent: #1FA8A0` |
| Secondary/info | `--color-accent-alt`, `--color-info`, indigo only |
| Danger/error | `--color-danger: #FB923C`, `--color-danger-soft`, `--color-danger-ink`; no red family |
| Radius | `--radius-md`, `--radius-lg`, `--radius-xl`; soft rounded surfaces |
| Typography | `font-sans`, `font-display`, `font-mono`; CPN + Anuphan + Geist Mono |

### Mandatory UI rules

- Start from existing Humi primitives: `Card`, `Button`, `FormField`, `FileUploadField`, `DataTable`, shell/navigation components
- Do not use hardcoded hex, route-local legacy card styles, Tailwind `red-*`, Central retail red, clay/coral red, or raw gradient classes
- Focus ring = teal halo via `ring-4 ring-accent-soft`
- Tables/lists use `border-hairline-soft`, `text-ink`, and tokenized hover/selected state
- Forms must keep label/helper/error anatomy tied to the input; attachments are fields too
- Product UI must not show implementation notes such as `SF: ...`, source mapping, or mock internals unless explicitly approved

## 3. Cross-Module Product Principles

| Principle | Requirement for Alpha |
| --- | --- |
| One journey | Demo order should read: Employee Center → Time → Payroll → Benefit |
| Persona clarity | Every screen must make clear who acts: Employee, Manager, HR Admin, HRBP, SPD, Payroll/Finance |
| Mock clarity | Mock/read-only/preview-only actions must be visibly distinguishable in demo copy and script |
| Masking first | Salary, bank, Tax ID, benefit/payment sensitive data masked by default unless role-specific review requires otherwise |
| No backend implication | UI buttons can demo approve/export/save but must not imply real persistence/integration/payment/tax filing |
| No dead end | Every demo path must have a back/next/result state; no blank terminal screens |
| Humi compliance | Any route touched for demo polish must pass no raw hex / no red utility / no legacy surface check |

## 4. Persona Requirements

| Persona | Needs to see | Allowed action in demo | Boundary |
| --- | --- | --- | --- |
| Employee | Own profile, pending changes, time clock/timesheet, leave/OT/correction, payslip/pay statements, benefit entitlement/claims/referrals/history | Submit/resubmit/withdraw own requests where policy allows | Own data only; sensitive values masked by default; no production persistence |
| Manager | Team context, quick approve inbox, probation/change requests, leave/OT approvals, selected benefit sequential approvals, team benefit dashboard | Approve/reject/send-back assigned items | Read-only outside assigned approval action; no full HR Admin power |
| HR Admin | Employee directory/detail/lifecycle, benefit setup/rules/records/payment/reports, reporting context | HR lifecycle mock actions, benefit admin records/exceptions, final HR review where assigned | Save/export/import/admin actions are mock/preview until backend approval |
| HRBP | Policy-sensitive employee/business context, benefit exceptions, HRBP approval stage | Review/recommend/approve/send-back where stage exists | HRBP/SPD split needs explicit sign-off; STA-27 dependency remains |
| SPD | Benefit claims/referrals inbox, hospital/ePatient context, referral letter preview | Start review, approve, reject, send back, issue referral letter | No real hospital/ePatient/insurer sync; letter issue is demo state |
| Payroll/Finance | Payroll setup/run/review/reports, payment preview, tax review, benefit payment seam | Payroll run approval, mock report generation, tax review decision | No real calculation, bank file, tax filing, GL posting, or payment execution |

## 5. Module Requirements

### 5.1 Employee Center

Alpha outcome: Employee Center becomes the canonical master/profile/lifecycle demo surface.

Required flows:

- Employee self-service profile with 6-tab experience: personal, employment, emergency/contact, benefits, documents, tax/activity/pending changes
- Employee can submit profile change request, see pending state, and withdraw where policy allows
- Manager can access lightweight approval/review paths without entering full HR Admin portal
- HR Admin/HRBP can search employee, open detail, see timeline, and walk lifecycle action surfaces as mock/click-through
- Lifecycle surfaces must cover: hire, edit, transfer, acting, pay-rate change/promotion taxonomy, probation, terminate, rehire, contract renewal
- Quick approve / workflow state must support pending employee-change and probation review demo

Open decisions / blockers:

- Final count and naming of lifecycle surfaces: seed says 8, evidence shows 9+candidate promotion surface
- Field schema per profile tab and lifecycle action
- Thai validation copy and reject/send-back reason taxonomy
- Manager sensitive-field mask/RBAC
- Effective-date preview and compensation approval chain
- Document storage/signature remains backend-later

### 5.2 Time

Alpha outcome: Time module clearly demonstrates employee attendance operations and manager approval, with Humi cleanup completed before HR presentation.

Required flows:

- Time landing with entries for Timesheet, Time Off, Overtime, and Manager Approvals
- Clock in/out hero with live clock, shift progress, geofence/location label, weekly attendance heatmap, schedule, timesheet rows
- Time correction request modal with date, correction type, original/corrected time, reason, and status history
- Leave request with 8 visible leave types: annual, sick, personal, maternity, paternity, ordination, military, unpaid
- Half-day leave behavior: full day / morning / afternoon for single-day leave
- Leave balances, history, approval state, team coverage/policy callout as demo values
- Overtime request with date, start/end, total hours, OT type, reason/project, estimated amount, status, audit trail
- Manager review through unified `/quick-approve` and detail action drawer (`RejectReturnDrawer`)

Open decisions / blockers:

- High priority: Time Humi cleanup — remove raw hex, hardcoded gradients, and red-ish legacy classes in Time screens
- Leave type mismatch: current visible `/timeoff` shows 3, hook has 8, settings has 5; Alpha must align demo story or document explicit reduced set
- HR/Admin attendance reporting route: decide required for demo or backlog
- Device/geofence, schedule engine, leave balance formula, OT multipliers/cut-off, payroll posting all backend-later

### 5.3 Payroll

Alpha outcome: Payroll demo covers setup → run → review → approve → payslip → report while protecting sensitive data.

Required flows:

- Payroll hub cards for setup, processing, reports, and tax review
- Setup UI: pay period, payment day, SSO rate, PVD/PF default rate, tax brackets, bank transfer display
- Processing wizard: period selection, calculation loading, review table, approval/export mock
- Review table: employee name, department, gross, tax, SSO, PF/PVD, deductions, net pay, anomaly indicator
- Payslip canonical employee self-view via `/profile/me?tab=employment#pay-statements`; legacy payslip routes redirect there
- Government reports: PND1, PND1 Kor, SSO, PVD preview/download mock actions
- Tax planning/review: masked Tax ID, safe estimate summary, start/send-back/approve/reject/cancel actions
- Compensation, bank account, Tax ID masking by default; reveal remains demo-only and backend re-auth is later

Open decisions / blockers:

- Payroll payslip canonical self-view and detail breakdown depth need explicit approval
- Sensitive masking policy across presenter mode, HR/Payroll role reveal, and employee self-view
- Reject/return path for payroll approval if required by HR/Finance
- Real payroll calculation, tax logic, bank transfer, government submission, GL posting, production audit all backend-later

### 5.4 Benefit

Alpha outcome: Benefit demo consolidates entitlement, claim/referral, admin rules, manager visibility, HRBP/SPD operation, and payment preview into one approval story.

Required flows:

- Employee Benefit Work Zone: entitlement summary, plan/limit/remaining, eligibility, documents/policies, status/history
- Reimbursement/medical claim: claim type, receipt, date, amount, hospital/store, dependent when relevant, attachment metadata
- Referral / hospital claim: covered person, hospital/network, service reason, preferred visit date, SPD notes, referral letter preview
- Beneficiary and life/accident surfaces as read-only or HR-controlled records where applicable
- Manager topology split:
  - sequential approval for assigned claims
  - read-only team benefits matrix/reports for visibility
- HR Admin admin surfaces: plans, rules, records, lifecycle, exceptions, payment preview, reports, import, beneficiaries
- HRBP policy/business-context review and exception recommendation
- SPD inbox for claim/referral review, send-back/reject/approve, start review, issue letter
- Payment/reimbursement oversight remains preview/export only

Open decisions / blockers:

- HRBP/SPD action rights and handoff boundary remain STA-27 dependency
- Benefit policy/payment boundary with Payroll/Finance must be approved before backend
- Beneficiary self-service decision: view-only vs editable by employee
- Real insurer/payment/payroll integration, document storage, hospital/ePatient API all backend-later

## 6. Cross-Module Acceptance Criteria for Team Alpha

Alpha is complete only when the consolidated demo can pass these checks:

1. **Storyboard continuity** — reviewer can walk Employee Center → Time → Payroll → Benefit without unexplained dead ends
2. **Persona boundaries** — every action clearly belongs to Employee, Manager, HR Admin, HRBP, SPD, or Payroll/Finance
3. **Humi token compliance** — touched screens use `bg-canvas`, `bg-surface`, `text-ink`, `border-hairline`, `ring-accent-soft`, `shadow-[var(--shadow-card)]`; no forbidden raw red/legacy styling
4. **Mock transparency** — mock/save/export/payment/report/tax actions are marked as demo/preview where needed
5. **Sensitive masking** — salary, bank, Tax ID, benefit/payment data masked in shared or employee-facing contexts
6. **Approval readiness** — each module has owner sign-off question and unresolved decisions listed as explicit TBD/RAID
7. **Backend gate preserved** — no API/database/workflow/integration/payment/calculation work is started from this brief
8. **Route traceability** — each module requirement maps back to existing route/spec anchors or is marked as new follow-up decision

## 7. Alpha Execution Priorities

| Priority | Workstream | Required action |
| --- | --- | --- |
| P0 | Humi compliance | Clean visible Time/demo surfaces first: no raw hex, no red utility, no legacy card mix |
| P0 | Demo narrative | Lock one walkthrough order and persona script across all modules |
| P0 | Masking | Confirm and enforce masking copy/defaults for Payroll and cross-module sensitive data |
| P1 | Time parity | Resolve 8 leave types vs visible 3/5 mismatch before HR presentation |
| P1 | Employee Center closure | Resolve lifecycle count/naming and manager sensitive visibility |
| P1 | Benefit handoff | Clarify HRBP/SPD action rights and payment preview boundary |
| P2 | Reports | Decide whether HR/Admin attendance reporting is demo-required or backlog |
| P2 | Documents | Clarify attachment/document storage messaging as backend-later |

## 8. Explicit Backend-Later Boundary

The following are **not** authorized by this Alpha brief:

- API contracts, persistence, migrations, seed loaders, production data writes
- Workflow engine, queues, notifications, SLA timers, immutable audit logs
- SuccessFactors/FO, SSO/Keycloak, biometric/device, geofence, insurer, hospital/ePatient integrations
- Payroll calculation engine, tax calculation, bank file, Revenue Department, SSO/PVD submission, GL posting
- Benefit reimbursement payment, payroll deduction posting, insurer/payment execution
- Production document storage, signature, retention, download control
- Server RBAC/RLS, sensitive reveal re-auth, legal/audit reporting

Backend work can start only after signed HR/module-owner approval and separate implementation issues with AC are created

## 9. Source Traceability

Primary inputs:

- `design.md` — Humi Design Tokens Compact
- `docs/design-system-humi.md` — Humi token/no-red design rules
- `docs/humi-components.md` — Humi primitive usage
- `specs/sta-33-all-modules-approval-pack.md` — consolidated all-module approval pack
- `specs/sta-29-employee-center-demo-scope.md` — Employee Center
- `specs/sta-30-time-demo-scope.md` — Time
- `specs/sta-31-payroll-demo-scope.md` — Payroll
- `specs/sta-32-benefit-demo-scope.md` — Benefit

## 10. Sign-Off Questions for Alpha Review

| Area | Question | Decision |
| --- | --- | --- |
| Storyboard | Employee Center → Time → Payroll → Benefit is the approved single demo order? | [ ] Approved / [ ] Revise |
| Design | Humi token contract is mandatory for all Alpha-touched screens? | [ ] Approved / [ ] Revise |
| Persona | Persona boundaries across Employee, Manager, HR Admin, HRBP, SPD, Payroll/Finance are acceptable? | [ ] Approved / [ ] Revise |
| Mock boundary | Demo/preview/read-only labels are sufficient to avoid backend misunderstanding? | [ ] Approved / [ ] Revise |
| Masking | Sensitive data masking model is acceptable for demo and presenter mode? | [ ] Approved / [ ] Revise |
| Backend gate | Backend remains blocked until separate signed implementation contracts exist? | [ ] Approved / [ ] Revise |
