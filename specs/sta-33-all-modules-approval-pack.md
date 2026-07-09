# STA-33 — All Modules HR Demo Approval Pack

สถานะเอกสาร: Executive storyboard / approval artifact
Linear: STA-33 — HR Demo All Modules storyboard and approval pack
วันที่จัดทำ: 2026-05-16
ขอบเขต: doc-only ก่อน backend implementation

## 1. Executive Summary

เอกสารนี้รวม 4-module HR demo approval pack สำหรับให้ HR leadership และ HR functions ลงนามก่อนเริ่ม backend:

1. Employee Center
2. Time
3. Payroll
4. Benefit

นี่คือ **UI/design/storyboard approval only**. ทุกหน้าจอ, field, status, action, routing, และ persona journey ใน pack นี้ใช้เพื่อ approve ทิศทาง demo และ decision boundary เท่านั้น ไม่ใช่คำสั่งให้สร้าง backend, database, integration, workflow engine, production security, payroll calculation, payment, tax filing, insurer sync, หรือ audit log

**Backend block gate:** backend implementation remains blocked until HR leadership และ owner ของแต่ละ module ลงนามใน checklist ของเอกสารนี้ หรือ successor approval artifact ที่อ้างอิง STA-33 โดยตรง

ผลลัพธ์ที่ต้องการจาก review:

- HR เห็น demo story เดียวข้าม 4 modules โดยไม่สับสนว่าอะไรเป็น mock
- HR owner เห็นว่าแต่ละ persona เห็นอะไร, approve อะไร, read-only ตรงไหน
- Missing pieces ถูกยกเป็น RAID/TBD และ follow-up seed/Linear recommendation ไม่ถูกซ่อนไว้เป็น assumption
- Backend-later boundary ถูก lock ก่อนทีม engineering เริ่ม implement

## 2. Demo Storyboard Order

ลำดับ demo สำหรับ executive walkthrough ควรเล่าเป็น employee lifecycle story จาก master data ไป time, payroll, และ benefit:

| Order | Module | Suggested walkthrough | Presenter notes |
| --- | --- | --- | --- |
| 1 | Employee Center | เริ่มจาก `/[locale]/home` -> `/[locale]/profile/me` -> `/[locale]/quick-approve` -> `/[locale]/admin/employees` -> lifecycle action เช่น transfer/probation/terminate | ตั้ง narrative ว่า Employee Center คือ source-of-truth UI: profile, lifecycle, approvals. ย้ำว่า lifecycle action เป็น mock/click-through และ backend/SF writeback ยัง blocked |
| 2 | Time | `/[locale]/time` -> clock/schedule/timesheet/correction -> `/[locale]/timeoff` -> `/[locale]/overtime` -> manager quick approve | เล่า attendance/leave/OT/correction เป็น operational signals ที่จะ feed payroll later. ย้ำว่า policy numbers, geofence, balance, OT rate เป็น illustrative |
| 3 | Payroll | `/[locale]/payroll` -> setup -> processing 4-stage run -> reports -> tax review -> employee payslip canonical self-view at `/[locale]/profile/me?tab=employment#pay-statements` | เล่า full payroll cycle แต่ไม่รับรอง calculation/tax correctness. ใช้ masking discipline ในทุก shared view |
| 4 | Benefit | `/[locale]/benefits-hub` -> reimbursement/referral/history -> manager benefit view -> admin benefits -> `/[locale]/spd/inbox` | เล่า entitlement, claim/referral, HR Admin rules, HRBP/SPD handoff, payment preview. ย้ำ insurer/payment/document storage เป็น backend-later |

Presenter close:

- ขอ approve เฉพาะ UI/storyboard, field/status/action taxonomy, และ persona boundary
- เปิด RAID/TBD list แล้วให้ owner mark: approve now / revise before demo / backlog / backend-later
- ยืนยันว่า backend cannot start until backend block gate ใน section 10 ผ่าน

## 3. Module One-Page Sections

### 3.1 Employee Center

Approval story: Employee Center เป็น master/profile/lifecycle hub สำหรับ employee data และ HR lifecycle actions

| Area | Demo approval scope | Key personas | Known TBDs from STA-29 |
| --- | --- | --- | --- |
| Employee master/profile | Employee self-service profile 6 tabs, pending change request, documents/tax/activity anchor | Employee, Manager, HR Admin, HRBP | Field schema final per tab, Thai validation copy, pending change withdraw/cancel rule |
| Lifecycle | Hire, edit, transfer, acting, pay-rate change, probation, terminate, rehire, contract renewal, promotion candidate | HR Admin, HRBP, Manager as lightweight approver | Seed says 8 routes, list/repo imply 9-10 surfaces; promotion inclusion decision; effective-date preview; eligibility rules |
| Approvals | Quick approve, probation workflow, pending personal-data changes | Manager, HRBP, HR Admin | Field-level diff view, reject reason taxonomy, approval chain for comp/pay-rate |
| Read-only context | Manager can inspect team context without full HR portal | Manager | Sensitive field mask/RBAC rule for manager read-only view |

Decision request: HR approves Employee Center as the canonical HR master/lifecycle demo surface, with all writes mock-only until backend/SF integration approval

### 3.2 Time

Approval story: Time module covers attendance, leave/time-off, overtime, correction, and manager approval as UI demo

| Area | Demo approval scope | Key personas | Known TBDs from STA-30 |
| --- | --- | --- | --- |
| Attendance | Clock in/out, live clock, shift progress, location/geofence display, schedule, timesheet | Employee, Manager, HR Admin | Time Cnext cleanup: raw hex/gradient/red class risks in `time-page.tsx`; device/geofence production rule backend-later |
| Leave/time-off | Request form, balance KPIs, history, approval tab, team coverage, policy callout | Employee, Manager, HR | Leave type mismatch: seed requires 8 types but `/timeoff` exposes 3 tiles; 5 policy configs in settings; half-day parity check |
| OT | OT request, estimated amount, audit trail, status chips, approval chain | Employee, Manager, Payroll/HR | OT rate/multiplier/cut-off/max hours are mock and need HR/Payroll decision |
| Corrections | Time correction modal: date/type/original/corrected/reason/status | Employee, Manager/HR | Whether correction enters unified approval queue is TBD |
| Reporting | Team attendance mock data exists but no confirmed HR/Admin reporting route | HR Admin | HR/Admin attendance reporting: decide required before demo or backlog |

Decision request: HR approves Time storyboard while explicitly deferring policy calculation, reporting backend, workflow routing, geofence, and payroll posting

### 3.3 Payroll

Approval story: Payroll demo shows setup -> run -> review/approval -> payslip -> tax/reporting with strict masking

| Area | Demo approval scope | Key personas | Known TBDs from STA-31 |
| --- | --- | --- | --- |
| Setup | Pay period, payment day, SSO/PF default rates, Thai PIT bracket view, bank indicator | Payroll/Finance, HR Admin | Confirm cut-off calendar, payment day, role labels, policy source/year |
| Run/review | 4-stage wizard: period selection, calculation loading, review table, approval/export mock | Payroll/Finance | Real calculation engine, reject/send-back path, anomaly taxonomy backend-later |
| Approval/export | Mock approve and export flow | Payroll/Finance | Approval authority and audit evidence not production-ready |
| Payslip | Canonical employee self-view is Profile employment pay statements; legacy payslip links redirect | Employee, Payroll/Finance | Payroll payslip canonical self-view decision; detail breakdown depth before implementation |
| Tax/reporting | PND1, PND1 Kor, SSO, PVD mock reports; tax planning/review with masked Tax ID | Payroll/Finance | Tax submission/report formats backend-later |
| Sensitive masking | Employee self-view masked by default, bank account masked, Tax ID masked in review | Employee, Payroll/Finance, HR/Security | Sensitive masking policy and reveal/re-auth rules must be approved |

Decision request: HR/Payroll/Finance approves demo journey and masking model, while keeping real calculation, bank/tax/SSO/PVD/GL integration blocked

### 3.4 Benefit

Approval story: Benefit module covers entitlement, claims/referrals, beneficiaries, admin rules, exceptions/reports, HRBP/SPD boundaries

| Area | Demo approval scope | Key personas | Known TBDs from STA-32 |
| --- | --- | --- | --- |
| Entitlement | Benefit hub, plan/limit/remaining/eligibility summary, documents/policies | Employee, HR Admin | Entitlement engine and Employee Center sync backend-later |
| Claims/referrals | Reimbursement, hospital claim, referral/ePatient request, history/status | Employee, Manager, HRBP, SPD | Manager approval coverage, send-back SLA, withdraw rules |
| Beneficiaries | Employee view-only beneficiary info; HR Admin owns records | Employee, HR Admin | Whether beneficiary self-service is ever allowed |
| Admin rules | Plans, rules, records, lifecycle, exceptions, import/report/payment previews | HR Admin, HRBP, SPD, Payroll/Finance | Benefit policy/payment boundaries; exception authority; document policy |
| HRBP/SPD | HRBP policy/context review; SPD service operations and referral letter issue | HRBP, SPD | STA-27 HRBP/SPD backlog remains dependency; distinct action rights need approval |
| Reports/payment | Payment dashboard/export preview and reports | HR Admin, Payroll/Finance | Real insurer/payment/payroll integration blocked |

Decision request: HR Benefit, HRBP, SPD, HR Admin, and Payroll approve persona split and flow topology while keeping STA-25/26/27/28 ownership de-duplicated

## 4. Persona Matrix Across Modules

| Persona | Sees what | Approves what | Read-only/mock boundary |
| --- | --- | --- | --- |
| Employee | Own profile, pending changes, time clock/timesheet, leave/OT/correction requests, payslip/pay statements, benefit entitlement/claims/referrals/history | Own submissions only; can submit/resubmit/withdraw where policy allows | All data is mock/client/demo; payslip and sensitive fields masked by default; no real persistence |
| Manager | Team/subordinate context, quick approve inbox, probation/change requests, leave/OT approvals, selected benefit sequential approvals, team benefit dashboard | Manager approval/reject/send-back for assigned workflow items | Team/profile/benefit dashboards are read-only unless approval action is explicitly in story; no production authority |
| HR Admin | Employee directory/lifecycle, admin benefits setup/rules/records/payment/reports, HR reporting context | HR lifecycle actions, admin benefit records/exceptions, final HR review where assigned | Save/export/import/admin actions are mock or preview unless explicitly marked backend-later |
| HRBP | Employee/business context, policy-sensitive lifecycle and benefit cases, HRBP review stage where applicable | HRBP review/recommend/approve/send-back only after owner confirms stage | HRBP/SPD split is not fully implemented; STA-27 backlog remains dependency |
| SPD | Benefit claims/referrals inbox, service operations fields, referral letter preview, hospital/ePatient context | Start review, approve, reject, send back, issue referral letter in demo | No real hospital/ePatient/insurer sync; letter issue is demo state only |
| Payroll/Finance | Payroll setup/run/review/reports, payment preview handoffs, tax review, benefit payment seam | Payroll run approval, report generation mock, tax review decisions, finance acceptance of masking/payment boundary | No real calculation, bank file, tax filing, SSO/PVD submission, GL posting, or payment execution |

## 5. Route / Screen Inventory Summary

| Module | Current repo anchors | Input pack reference |
| --- | --- | --- |
| Employee Center | `/[locale]/profile/me`, `/[locale]/ess/workflows`, `/[locale]/quick-approve`, `/[locale]/workflows/probation`, `/[locale]/admin/hire`, `/[locale]/admin/employees`, `/[locale]/admin/employees/[id]/*`, `/[locale]/reports`, `/[locale]/hrbp` | STA-29 pack at `specs/sta-29-employee-center-demo-scope.md` |
| Time | `/[locale]/time`, `src/frontend/src/components/time/time-page.tsx`, `/[locale]/timeoff`, `/[locale]/overtime`, `/[locale]/quick-approve`, `/[locale]/quick-approve/[id]`, `/[locale]/quick-approve/bulk` | STA-30 pack at `specs/sta-30-time-demo-scope.md` |
| Payroll | `/[locale]/payroll`, `/[locale]/payroll/setup`, `/[locale]/payroll/processing`, `/[locale]/payroll/reports`, `/[locale]/payroll/tax-review`, `/[locale]/payroll/tax-planning`, `/[locale]/payslip`, `/[locale]/employees/me/payslip`, `/[locale]/profile/me?tab=employment#pay-statements` | STA-31 pack at `specs/sta-31-payroll-demo-scope.md` |
| Benefit | `/[locale]/benefits-hub`, `/[locale]/benefits-hub/reimbursement`, `/[locale]/benefits-hub/referral`, `/[locale]/benefits-hub/hospital-claim`, `/[locale]/benefits-hub/beneficiary`, `/[locale]/benefits-hub/life-accident`, `/[locale]/benefits-hub/history`, `/[locale]/admin/benefits/*`, `/[locale]/manager/benefits/team`, `/[locale]/manager/benefits/reports`, `/[locale]/spd/inbox` | STA-32 pack at `specs/sta-32-benefit-demo-scope.md` |

Inventory note: These are approval anchors, not a commitment that every route is visually final. Visual cleanup and missing route decisions are tracked in RAID/TBD below

## 6. Unified Backend-Later Boundary

STA-33 does not authorize backend work. The following remain blocked until signed approval and separate implementation issues exist:

- APIs and production API contracts
- database schema, persistence, migrations, seed data loaders
- workflow engine, queue assignment, notifications, SLA timers, approval audit evidence
- external integrations: SuccessFactors, SSO/Keycloak, biometric/device, geofence provider, payroll providers, banks, Revenue Department, SSO/PVD, insurers, hospitals, ePatient, document center
- RBAC/server security, row-level security, sensitive reveal re-auth/PIN, production authorization
- payroll calculation engine, tax calculations, bank transfer files, accounting/GL posting
- insurer/payment execution, benefit reimbursement payment, payroll deduction posting
- production document storage, retention, signature/acknowledgement, download controls
- immutable audit logs, legal/audit reporting, data retention
- production import/export/report-builder persistence

Approved UI decisions may become backend requirements only after Product/Engineering creates follow-up backend seeds/issues with explicit acceptance criteria and owner sign-off

## 7. Unified RAID / TBD / Decision List

| Priority | Item | Module | Decision / risk | Recommended follow-up seed or Linear action |
| --- | --- | --- | --- | --- |
| High | Time Cnext cleanup | Time | `time-page.tsx` has raw hex/gradient/red-class risks; executive demo polish may be blocked | Create cleanup-before-demo UI task scoped to Time Cnext token compliance; do not duplicate STA-30 |
| High | Leave type mismatch | Time | Seed requires 8 leave types, current `/timeoff` request tiles expose 3; settings has 5 policies | Create Time demo parity seed for 8 visible leave types or explicit HR-approved reduced demo set |
| High | HR/Admin attendance reporting | Time | Team attendance mock data exists but no confirmed HR/Admin reporting route | Create Time reporting storyboard issue only if HR marks required for demo; otherwise backlog |
| High | Payroll payslip canonical self-view | Payroll | Employee payslip redirects to Profile employment tab; detail breakdown depth needs approval | Create Payroll self-view decision seed for canonical payslip/pay statement fields and route policy |
| High | Sensitive masking | Payroll / Cross-module | Salary, bank, Tax ID, benefit/payment data must remain masked in shared/demo views | Create cross-module masking policy seed covering employee self-view, presenter mode, HR/payroll role reveal |
| High | Benefit HRBP/SPD backlog | Benefit | HRBP and SPD are distinct personas but STA-27 remains dependency | Create STA-27-linked approval clarification seed; do not replace STA-27 |
| High | Benefit policy/payment boundary | Benefit / Payroll | Approved claim/payment preview must not imply real payment, payroll posting, or bank integration | Create Benefit-Payroll boundary seed after HR Admin/Payroll agree handoff wording |
| High | Employee Center 8 TBDs | Employee Center | Field schema, validation copy, withdraw/cancel, field diff, reject taxonomy, manager sensitive mask, lifecycle count/promotion, comp approval chain/effective-date | Create one EC approval-closure seed listing the 8 decisions; reference STA-29 rather than duplicating it |
| Medium | Approval chain taxonomy | Cross-module | Manager-only vs Manager -> HRBP vs SPD differs by request type | Create workflow taxonomy seed after module owners agree chain per request |
| Medium | Mock numbers and policies | Time / Payroll / Benefit | Leave balances, OT rates, payroll/tax values, entitlement limits are illustrative | Add approval note to demo script and any deck export; backend policy seed only after owner signs |
| Medium | Route visual readiness | Cross-module | Some modules are design-approved but may need Cnext cleanup before executive visual demo | Create per-module visual readiness checklist, not backend issue |
| Medium | Document storage and attachments | Employee Center / Benefit / Time | Attachments shown as fields but no production storage/signature | Create Document Center boundary seed if HR requires attachment-heavy demo |

Decision rule: follow-up recommendations must not duplicate existing STA-25, STA-26, STA-27, STA-28, STA-29, STA-30, STA-31, or STA-32. They should reference the existing issue as source and narrow only the unresolved approval decision

## 8. HR Sign-Off Checklist

### Module Gates

| Module | Acceptance gate | Owner sign-off | Decision |
| --- | --- | --- | --- |
| Employee Center | HR approves employee profile, lifecycle action list, manager/HR approval boundaries, and STA-29 TBD closure path | HR Admin / HRBP | [ ] Approved / [ ] Revise |
| Time | HR approves attendance, leave, OT, correction, manager approval story, and explicitly resolves or defers leave type/reporting/Cnext blockers | HR / Manager owner / Payroll for OT | [ ] Approved / [ ] Revise |
| Payroll | HR/Payroll/Finance approve setup/run/review/report/tax/payslip story, masking model, and mock-only numeric values | Payroll / Finance / HR Security | [ ] Approved / [ ] Revise |
| Benefit | HR Benefit/HRBP/SPD/HR Admin approve entitlement, claims/referrals, beneficiaries, admin rules, exceptions/reports, and policy/payment handoffs | HR Benefit / HRBP / SPD / HR Admin | [ ] Approved / [ ] Revise |

### Cross-Module Gates

| Gate | Acceptance question | Required before backend |
| --- | --- | --- |
| Persona model | Are Employee, Manager, HR Admin, HRBP, SPD, and Payroll/Finance boundaries acceptable across all modules? | Yes |
| Storyboard order | Does the walkthrough order Employee Center -> Time -> Payroll -> Benefit tell the right executive story? | Yes |
| Mock/read-only clarity | Does every stakeholder understand which actions are mock, read-only, disabled, or preview-only? | Yes |
| Sensitive data | Are masking, presenter mode, and role-context visibility accepted? | Yes |
| Policy values | Are demo values explicitly non-binding and deferred to backend/policy seeds? | Yes |
| Route inventory | Are current route anchors enough for storyboard approval, with known blockers listed? | Yes |
| Follow-up issue shape | Are missing pieces converted to non-duplicative follow-up seed/Linear recommendations? | Yes |
| Backend block | Do all owners agree no backend starts until signed approval and separate implementation issues exist? | Yes, hard gate |

Backend block sign-off:

- HR leadership:
- Employee Center owner:
- Time owner:
- Payroll/Finance owner:
- Benefit owner:
- HRBP owner:
- SPD owner:
- Product/Engineering owner:
- Decision date:
- Conditions before executive demo:
- Conditions before backend:

## 9. Appendix — Input Pack References And Traceability

| Issue / source | Role in STA-33 | Reference |
| --- | --- | --- |
| STA-33 | Current consolidated all-module approval pack | This file: `specs/sta-33-all-modules-approval-pack.md` |
| Q00 context | Mission, acceptance criteria, input seed list | Original execution context; not persisted in repo |
| STA-29 | Employee Center module approval input | `specs/sta-29-employee-center-demo-scope.md` |
| STA-30 | Time module approval input | `specs/sta-30-time-demo-scope.md` |
| STA-31 | Payroll module approval input | `specs/sta-31-payroll-demo-scope.md` |
| STA-32 | Benefit module approval input | `specs/sta-32-benefit-demo-scope.md` |
| STA-25 / STA-26 / STA-27 / STA-28 | Existing Benefit implementation/backlog/dependency issues | Referenced through STA-32; STA-33 does not duplicate or replace them |
| STA-29 / STA-30 / STA-31 / STA-32 | Module-level approval packs | STA-33 consolidates, does not supersede module details |

Knowledge sources consulted:

- `AGENTS.md`
- `specs/sta-29-employee-center-demo-scope.md`
- `specs/sta-30-time-demo-scope.md`
- `specs/sta-31-payroll-demo-scope.md`
- `specs/sta-32-benefit-demo-scope.md`
- `omx_wiki/index.md`: none found in this worktree; no wiki canary applicable
- `.omx/context/*.md`: none found by preflight
- `.omx/plans/*.md`: none found by preflight
