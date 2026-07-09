# STA-32 — Benefit Demo Scope Approval Pack

สถานะเอกสาร: Approval contract / Seed execution artifact
Linear: STA-32 — HR Demo Benefit roll-up scope for design approval before backend
Seed: `/Users/tachongrak/.ouroboros/seeds/seed_79a7d2e0d47c.yaml`
Q00 context: `/tmp/sta32_q00_context.md`
วันที่จัดทำ: 2026-05-16

## 1. Executive Scope Statement

Benefit demo scope นี้เป็นงาน UI/design approval เท่านั้น เพื่อให้ HR Benefit, HR Admin, HRBP, SPD, Manager และ Employee stakeholders ตรวจและเซ็นรับรอง flow, field, status, policy visibility และ handoff boundary ก่อนเริ่ม backend implementation.

Backend remains blocked until HR sign-off. ห้ามใช้เอกสารนี้เป็นคำสั่งให้เริ่มสร้าง backend, integration, production authorization model, entitlement engine, payroll deduction integration, insurer/payment integration หรือ production document storage.

เป้าหมายของ STA-32 คือรวบ scope ที่กระจายอยู่ใน STA-25, STA-26, STA-27 และ STA-28 ให้กลายเป็น approval story เดียว ไม่ใช่การแทนที่ issue เหล่านั้น และไม่ใช่ backend spec.

## 2. Approval Story By Persona

### Employee

Employee เห็น Benefit Work Zone เพื่อเริ่มและติดตามงานสวัสดิการของตนเอง:

| Area | Approval story | Demo evidence |
| --- | --- | --- |
| Entitlements | พนักงานเห็นสิทธิ์, plan, annual limit, remaining amount, coverage และ eligibility summary โดยอ้างอิงข้อมูลจาก Employee Center/Profile | `src/frontend/src/app/[locale]/benefits-hub/page.tsx`, `src/frontend/src/components/benefits/BenefitServicesPanel.tsx`, `src/frontend/src/data/benefits/plan-registry.ts` |
| Reimbursement / medical claim | พนักงานเลือก claim type, กรอก receipt, date, amount, hospital/store, dependent เมื่อเกี่ยวข้อง และแนบเอกสาร | `src/frontend/src/app/[locale]/benefits-hub/reimbursement/page.tsx`, `src/frontend/src/components/benefits/templates/SimpleClaimForm.tsx`, `src/frontend/src/stores/benefit-claims.ts` |
| Referral / hospital claim | พนักงานขอใบส่งตัว/ePatient referral หรือ hospital claim โดยแยกจาก reimbursement claim | `src/frontend/src/app/[locale]/benefits-hub/referral/page.tsx`, `src/frontend/src/app/[locale]/benefits-hub/hospital-claim/page.tsx`, `src/frontend/src/components/benefits/referral/ReferralRequestPanel.tsx`, `src/frontend/src/components/benefits/templates/HospitalClaimForm.tsx` |
| Beneficiary | พนักงานเห็นข้อมูลผู้รับผลประโยชน์และคำแนะนำว่าการแก้ไขเป็น HR-controlled record | `src/frontend/src/app/[locale]/benefits-hub/beneficiary/page.tsx`, `src/frontend/src/app/[locale]/admin/benefits/beneficiaries/page.tsx` |
| Life / accident | พนักงานเห็น coverage summary ที่เป็น computed/read-only และไม่ต้อง submit claim | `src/frontend/src/app/[locale]/benefits-hub/life-accident/page.tsx`, `src/frontend/src/components/benefits/templates/RecordsComputedView.tsx` |
| Documents / policies | พนักงานเห็นเอกสาร, policy, download/sign action และเงื่อนไขก่อนเริ่มงาน benefit | `src/frontend/src/app/[locale]/benefits-hub/page.tsx`, `src/frontend/src/app/[locale]/me/documents/page.tsx` |
| Status / history | พนักงานติดตาม status และประวัติ claim/request | `src/frontend/src/app/[locale]/benefits-hub/history/page.tsx`, `src/frontend/src/lib/benefit-routes.ts` |

Employee sign-off question: หน้าจอปัจจุบันเพียงพอให้พนักงานรู้ว่า “มีสิทธิ์อะไร, ต้องยื่นอะไร, อยู่สถานะไหน, ต้องอ่านเอกสารใด” หรือไม่

### Manager

Manager มีสอง topology:

| Topology | Approval story | Demo evidence |
| --- | --- | --- |
| Sequential approval | Manager มี approval inbox/action buttons สำหรับ flow ที่ต้องผ่าน Manager ก่อน HR/SPD เช่น claim ที่มี `pending_manager_approval` และ action triad: Approve, Send back, Update | `src/frontend/src/stores/benefit-claims.ts`, `src/frontend/src/components/manager/quick-approve-page.tsx`, `src/frontend/src/components/manager/benefits/ApproveTriadButtons.tsx` |
| Parallel read-only visibility | Manager ดูภาพรวมทีม, utilization, spend, pending approvals, throughput แต่ไม่แก้ข้อมูล entitlement/policy | `src/frontend/src/app/[locale]/manager/benefits/team/page.tsx`, `src/frontend/src/app/[locale]/manager/benefits/reports/page.tsx`, `src/frontend/src/components/manager/team-benefits-matrix.tsx`, `src/frontend/src/lib/team-benefits-mock.ts` |

Manager sign-off question: Manager ควร approve เฉพาะ sequential claim flow และดู read-only dashboard สำหรับ informational benefits ใช่หรือไม่

### HR Admin

HR Admin เป็น owner ของ plan setup, records, lifecycle, exception, payment/reimbursement oversight และ reports:

| Area | Approval story | Demo evidence |
| --- | --- | --- |
| Plans setup | Admin เห็น plan catalog, category, record type, template, annual limit, approval chain และ setup tabs | `src/frontend/src/app/[locale]/admin/benefits/plans/page.tsx`, `src/frontend/src/components/benefits/PlanConfiguratorShell.tsx`, `src/frontend/src/components/benefits/Tab1IdentityFields.tsx` |
| Rules setup | Admin เห็น entitlement/business rule management as demo surface | `src/frontend/src/app/[locale]/admin/benefits/rules/page.tsx`, `src/frontend/src/app/[locale]/admin/benefits/rules/_components/EntitlementRulesManager.tsx`, `src/frontend/src/data/benefits/rules-registry.ts` |
| Records | Admin บันทึก admin-only records เช่น funeral, wreath, gift, beneficiary, life, lifecycle | `src/frontend/src/app/[locale]/admin/benefits/records/page.tsx`, `src/frontend/src/app/[locale]/admin/benefits/records/[planId]/page.tsx`, `src/frontend/src/components/benefits/templates/RecordsFlatForm.tsx`, `src/frontend/src/components/benefits/templates/RecordsDependentForm.tsx` |
| Lifecycle | Admin จัดการ onboarding, change, offboarding, annual enrollment | `src/frontend/src/app/[locale]/admin/benefits/lifecycle/page.tsx`, `src/frontend/src/components/benefits/templates/LifecycleAdminForm.tsx` |
| Exceptions | Admin ดูและบันทึก exception/override flow สำหรับ case ที่ไม่ใช่ straight-through | `src/frontend/src/app/[locale]/admin/benefits/exception/page.tsx` |
| Payment / reimbursement oversight | Admin เห็น payment dashboard/export preview โดยไม่เปิด real payment/bank run | `src/frontend/src/app/[locale]/admin/benefits/payment/page.tsx`, `src/frontend/src/app/[locale]/admin/benefits/page.tsx` |
| Reports/import | Admin เห็น standard report cards, story report handoff และ import preview | `src/frontend/src/app/[locale]/admin/benefits/reports/page.tsx`, `src/frontend/src/app/[locale]/admin/benefits/import/page.tsx` |

HR Admin sign-off question: Plan/rule/record/lifecycle/exception/payment/report surfaces ครบพอสำหรับ demo approval หรือยัง โดยยอมรับว่า save/export/integration หลายส่วนเป็น disabled/read-only preview

### HRBP

HRBP เป็น distinct persona จาก SPD:

- HRBP ตรวจ policy/business context, employee eligibility edge case, manager/team context และ exception recommendation
- HRBP อาจเป็น approval stage ใน `approvalChain` ของ plan registry (`hrbp -> spd -> hr_admin`)
- HRBP scope ยังผูกกับ STA-27 backlog/dependency จึงต้องถูกใส่ใน approval story แต่ไม่ถือว่า implemented ครบใน STA-32

HRBP sign-off question: HRBP ควรเห็นอะไร, act ที่จุดใด, และ handoff ให้ SPD/HR Admin อย่างไรใน demo scope

### SPD

SPD เป็น distinct persona จาก HRBP และเป็น Benefit service/operations owner:

- SPD ตรวจ reimbursement, referral, hospital claim และ issue referral letter
- SPD inbox มี approve, reject, send back, start review และ issue letter actions
- SPD เห็น ePatient/hospital integration preview แต่ real API sync ยัง blocked

Demo evidence:

- `src/frontend/src/app/[locale]/spd/inbox/page.tsx`
- `src/frontend/src/components/workflow/BenefitClaimsInbox.tsx`
- `src/frontend/src/components/workflow/BenefitReferralInbox.tsx`
- `src/frontend/src/stores/benefit-referrals.ts`

SPD sign-off question: SPD action set และ field visibility เพียงพอสำหรับ design approval ก่อน backend หรือไม่

## 3. Screen / Route Inventory With Repo Evidence

### Employee Routes

| Route path | Purpose | Evidence / implementation notes |
| --- | --- | --- |
| `/[locale]/benefits-hub` | Benefit Work Zone: entitlements, service actions, tabs for benefits/claims/docs/policies | `src/frontend/src/app/[locale]/benefits-hub/page.tsx` |
| `/[locale]/benefits-hub/reimbursement` | Receipt-based reimbursement claim | `src/frontend/src/app/[locale]/benefits-hub/reimbursement/page.tsx` |
| `/[locale]/benefits-hub/referral` | Hospital referral/ePatient request and referral history | `src/frontend/src/app/[locale]/benefits-hub/referral/page.tsx` |
| `/[locale]/benefits-hub/hospital-claim` | IPD/dependent hospital claim template | `src/frontend/src/app/[locale]/benefits-hub/hospital-claim/page.tsx` |
| `/[locale]/benefits-hub/physical-checkup` | Physical checkup benefit surface | `src/frontend/src/app/[locale]/benefits-hub/physical-checkup/page.tsx` |
| `/[locale]/benefits-hub/beneficiary` | Employee view of beneficiary information with HR update boundary | `src/frontend/src/app/[locale]/benefits-hub/beneficiary/page.tsx` |
| `/[locale]/benefits-hub/life-accident` | Read-only computed life/accident coverage | `src/frontend/src/app/[locale]/benefits-hub/life-accident/page.tsx` |
| `/[locale]/benefits-hub/history` | Claim/request history and status list | `src/frontend/src/app/[locale]/benefits-hub/history/page.tsx` |
| `/[locale]/profile/benefits` and `/[locale]/employees/me/benefits` | Profile benefit tab / Employee Center anchor | `src/frontend/src/app/[locale]/profile/benefits/page.tsx`, `src/frontend/src/app/[locale]/employees/me/benefits/page.tsx`, `src/frontend/src/components/profile/tabs/benefits.tsx` |

### Manager Routes

| Route path | Purpose | Evidence / implementation notes |
| --- | --- | --- |
| `/[locale]/manager/benefits/team` | Team benefits matrix, read-only usage/enrollment/pending count | `src/frontend/src/app/[locale]/manager/benefits/team/page.tsx`, `src/frontend/src/components/manager/team-benefits-matrix.tsx` |
| `/[locale]/manager/benefits/reports` | Manager benefit reports: pending, throughput, utilization, spend | `src/frontend/src/app/[locale]/manager/benefits/reports/page.tsx`, `src/frontend/src/components/manager/reports/*` |
| Manager quick approve surface | Sequential approval bridge for `pending_manager_approval` claims | `src/frontend/src/components/manager/quick-approve-page.tsx`, `src/frontend/src/components/manager/benefits/ApproveTriadButtons.tsx` |

### HR Admin / SPD Routes

| Route path | Purpose | Evidence / implementation notes |
| --- | --- | --- |
| `/[locale]/admin/benefits` | Admin overview: master data, eligibility, amount rules, field config, workflow/cutoff, referral preview, disabled integrations | `src/frontend/src/app/[locale]/admin/benefits/page.tsx` |
| `/[locale]/admin/benefits/plans` | Plan catalog and configuration shell | `src/frontend/src/app/[locale]/admin/benefits/plans/page.tsx` |
| `/[locale]/admin/benefits/rules` | Entitlement rules manager | `src/frontend/src/app/[locale]/admin/benefits/rules/page.tsx` |
| `/[locale]/admin/benefits/records` | HR-only benefit records landing | `src/frontend/src/app/[locale]/admin/benefits/records/page.tsx` |
| `/[locale]/admin/benefits/records/[planId]` | Per-plan HR record form | `src/frontend/src/app/[locale]/admin/benefits/records/[planId]/page.tsx` |
| `/[locale]/admin/benefits/lifecycle` | Benefit lifecycle events | `src/frontend/src/app/[locale]/admin/benefits/lifecycle/page.tsx` |
| `/[locale]/admin/benefits/exception` | Exception/override handling | `src/frontend/src/app/[locale]/admin/benefits/exception/page.tsx` |
| `/[locale]/admin/benefits/payment` | Payment/reimbursement oversight preview | `src/frontend/src/app/[locale]/admin/benefits/payment/page.tsx` |
| `/[locale]/admin/benefits/reports` | Benefit reports / report builder handoff | `src/frontend/src/app/[locale]/admin/benefits/reports/page.tsx` |
| `/[locale]/admin/benefits/import` | Import preview and validation mock | `src/frontend/src/app/[locale]/admin/benefits/import/page.tsx` |
| `/[locale]/admin/benefits/beneficiaries` | HR-admin beneficiary records | `src/frontend/src/app/[locale]/admin/benefits/beneficiaries/page.tsx` |
| `/[locale]/spd/inbox` | SPD claims/referrals inbox | `src/frontend/src/app/[locale]/spd/inbox/page.tsx`, `src/frontend/src/components/workflow/BenefitClaimsInbox.tsx`, `src/frontend/src/components/workflow/BenefitReferralInbox.tsx` |

### Relevant Stores, Hooks, Libraries, Components

| Type | Evidence | Approval relevance |
| --- | --- | --- |
| Store | `src/frontend/src/stores/benefit-claims.ts` | Claim statuses, claim fields, attachment rules, approval actions |
| Store | `src/frontend/src/stores/benefit-referrals.ts` | Referral statuses, hospital network, covered people, letter issue action |
| Store | `src/frontend/src/stores/cnext-benefits-slice.ts` | Benefits hub tab state |
| Hook | `src/frontend/src/hooks/use-medical-claims.ts` | Legacy/mock medical claim model with manager/HR steps |
| Hook | `src/frontend/src/hooks/use-hospital-referral.ts` | Legacy/mock hospital referral model with letter issue statuses |
| Lib | `src/frontend/src/lib/benefit-routes.ts` | Canonical localized route helpers |
| Lib | `src/frontend/src/lib/benefit-referral-adapters.ts` | Referral validity/adapter helper |
| Lib | `src/frontend/src/lib/team-benefits-mock.ts` | Deterministic manager team benefit matrix data |
| Data | `src/frontend/src/data/benefits/plan-registry.ts` | 28 plans, templates, approval chains, payroll integration placeholders |
| Data | `src/frontend/src/data/benefits/rules-registry.ts` | 76 SF-derived benefit business rule references |
| Component | `src/frontend/src/components/benefits/templates/*` | Reusable benefit form/view templates |
| Component | `src/frontend/src/components/workflow/*Benefit*Inbox.tsx` | SPD approval/referral inbox |
| Component | `src/frontend/src/components/manager/benefits/*` | Manager approval/report UI primitives |

## 4. Existing Linear Issue Traceability

| Linear issue | Status/context | STA-32 treatment |
| --- | --- | --- |
| STA-25 | Done / base benefit structure | Treat as foundation. STA-32 references base surfaces and does not reopen or replace it. |
| STA-26 | In progress / benefit implementation context | Keep implementation work in STA-26. STA-32 only clarifies approval scope and gap split. |
| STA-28 | In progress / manager benefit quick approve, team reports, related implementation context | Keep manager implementation work in STA-28. STA-32 de-duplicates manager approval/read-only topology into one approval story. |
| STA-27 | Backlog / HRBP and SPD persona dependency | Explicit dependency. STA-32 includes HRBP and SPD as distinct approval personas but does not claim STA-27 is fully implemented. |
| STA-32 | Current issue | Create consolidated approval pack only. Stop before backend implementation. |

Gap handling rule: ถ้า gap อยู่ใน STA-26, STA-27 หรือ STA-28 ให้ reference และ de-duplicate ไม่สร้าง scope ใหม่ที่แทน issue เดิม เว้นแต่เป็น wording/checklist สำหรับ HR approval ในเอกสารนี้.

## 5. Exemplar Flows

### Flow A: Reimbursement / Medical Claim

Purpose: ยืนยัน pattern สำหรับ receipt-based claim เช่น medical OPD, dental, gasoline, mobile, physical checkup และ dependent claim ที่ใช้ claim template.

1. Employee เปิด `/[locale]/benefits-hub/reimbursement`
2. Employee เลือก benefit plan จาก claimable plans
3. Screen แสดง entitlement context: plan name, annual limit, eligibility, required docs
4. Employee กรอก visible fields:
   - benefit type / benefit code
   - receipt no.
   - receipt date
   - receipt amount
   - total claim amount
   - hospital/store
   - dependent name/relationship เมื่อเกี่ยวข้อง
   - attachment metadata
5. Employee submit แล้ว request เข้าสู่ `Submitted` / `Pending Review`
6. Sequential topology:
   - ถ้าต้องผ่าน Manager: `Pending Manager Review` แล้ว Manager action: Approve / Send back / Update visibility
   - หลัง Manager approve: `Pending HR/SPD Review`
   - ถ้าไม่ต้องผ่าน Manager ใน demo plan: เข้าสู่ `Pending HR/SPD Review` โดยตรง
7. SPD/HR ตรวจที่ inbox:
   - Approve
   - Send back พร้อม correction reason
   - Reject พร้อม rejection reason
8. เมื่อ Approved แล้ว payment/reimbursement oversight เห็นรายการเป็น `Approved`
9. Payment/finance export เป็น preview เท่านั้น; real payment status จบที่ `Paid/Closed` เฉพาะ demo state

Approval decisions to confirm:

| Decision | Default for demo | Owner |
| --- | --- | --- |
| Claim types covered by reusable form | Medical, dental, gasoline, mobile, physical checkup, dependent | HR Benefit / SPD |
| Manager required for which claim types | Sequential for claim flows where business wants line-manager review; otherwise direct SPD | HRBP / SPD |
| Required attachment policy | Medical requires at least one attachment; max/format is demo guard only | SPD |
| Payment handoff | Approved claim appears for payment oversight; no bank/payroll integration | HR Admin / Payroll |

### Flow B: Referral / Hospital Claim

Purpose: แยก referral/ePatient letter flow ออกจาก reimbursement claim เพื่อไม่ให้ HR sign-off สับสนระหว่าง “ขอใบส่งตัว” กับ “เบิกย้อนหลัง”.

1. Employee เปิด `/[locale]/benefits-hub/referral`
2. Employee เลือก covered person และ hospital/network
3. Employee กรอก service reason, preferred visit date, contact phone, document note, notes to SPD
4. System validates demo input: covered person exists, hospital exists, service reason is filled, preferred visit date exists
5. Request status becomes `Submitted` / `Pending Review`
6. Approval chain shown as HRBP -> SPD -> HR Admin in demo UI where route uses referral chain; STA-27 owns final HRBP/SPD separation backlog
7. SPD inbox actions:
   - Start review
   - Approve
   - Send back
   - Reject
   - Issue letter after approved
8. Letter issue produces demo fields: referral number, ePatient reference, valid from/until, issued by, issued at
9. Hospital/ePatient API sync remains disabled/backend-later

Hospital claim variant:

1. Employee เปิด `/[locale]/benefits-hub/hospital-claim`
2. Employee เลือก hospital claim plan
3. Visible fields include OPD/IPD, hospital name, transfer/referral doc no., dependent when required, receipt fields only when plan requires receipt, attachments
4. Approval follows same review state model but field set differs from receipt-based reimbursement

Approval decisions to confirm:

| Decision | Default for demo | Owner |
| --- | --- | --- |
| Referral vs reimbursement separation | Separate routes and fields | SPD |
| HRBP stage | Shown as intended stage but STA-27 backlog controls implementation completeness | HRBP / SPD |
| ePatient integration | Preview only, no real API | SPD / IT |
| Letter validity | Demo validity window only | SPD |

### Flow C: Beneficiary / Life & Accident

Purpose: ยืนยัน pattern สำหรับ informational/admin-record benefits ที่ไม่ใช่ reimbursement claim.

Beneficiary:

1. Employee เปิด `/[locale]/benefits-hub/beneficiary`
2. Employee เห็น beneficiary information และ instruction ให้ติดต่อ HR เพื่อแก้ไข
3. HR Admin เปิด `/[locale]/admin/benefits/beneficiaries`
4. HR Admin ดู/search/add/edit beneficiary records ตาม role capability
5. Employee side remains view-only; HR side owns record maintenance

Life & Accident:

1. Employee เปิด `/[locale]/benefits-hub/life-accident`
2. Employee เห็น coverage summary ที่เป็น computed/read-only
3. No claim submission, no manager approval
4. Manager may see aggregate/read-only visibility in team benefits/reports
5. HR Admin owns plan/record setup and lifecycle updates

Approval decisions to confirm:

| Decision | Default for demo | Owner |
| --- | --- | --- |
| Beneficiary edit owner | HR Admin only | HR Admin |
| Employee action | View instructions, not self-edit | HR Benefit / Legal |
| Life/accident calculation | Display-only mock/computed view | HR Admin / Payroll |
| Manager role | Read-only visibility only | HRBP |

### Reusable Pattern For Remaining Benefit Types

Remaining benefit types must map to one of the existing templates instead of bespoke screens:

| Template | Used for | Demo route/owner |
| --- | --- | --- |
| `simple-claim` | Receipt-based reimbursement: medical OPD, dental, gasoline, mobile, physical checkup | Employee claim routes + SPD review |
| `hospital-claim` | IPD, dependent medical, hospital/referral-related claim | Employee hospital claim + SPD review |
| `records-flat` | HR-owned records such as beneficiary, funeral, gift, wreath | HR Admin records |
| `records-dependent` | Records tied to dependents/family members | HR Admin records |
| `records-computed` | Read-only computed benefit such as life/accident | Employee view + HR Admin plan source |
| `lifecycle-admin` | Onboard/change/offboard/annual enrollment | HR Admin lifecycle |

## 6. Lightweight Demo State Model

Canonical demo state model:

`Draft -> Submitted -> Pending Review -> Sent Back -> Approved -> Rejected -> Withdrawn -> Paid/Closed`

State mapping to current repo labels:

| Canonical state | Current/demo labels seen in repo | Persona action boundary |
| --- | --- | --- |
| Draft | `draft` | Employee can create/edit before submit; HR Admin can create admin records depending on record type |
| Submitted | `submitted`, submittedAt present | Employee has submitted; edit becomes limited to withdraw or respond if sent back |
| Pending Review | `pending_manager_approval`, `pending_spd`, `spd_reviewing`, `pending_manager`, `pending_hr` | Manager acts only on manager queue; SPD/HR acts only on SPD/HR queue |
| Sent Back | `send_back` | Employee can revise/resubmit; approver must provide reason/comment |
| Approved | `approved`, `letter_issued` for completed referral letter | HR Admin/SPD can move to payment/closed or issue letter, depending on flow |
| Rejected | `rejected`, `cancelled` when equivalent terminal non-approval | No further approval; new request required unless HR defines reopen rule |
| Withdrawn | Not fully represented in current benefit claim store; should remain demo/TBD | Employee-only before terminal state unless HR policy says otherwise |
| Paid/Closed | Payment dashboard/export preview, closed operational state | HR Admin/Payroll handoff; no real payment integration in STA-32 |

Flow topology:

| Topology | Applies to | Persona boundaries |
| --- | --- | --- |
| Sequential Manager -> HR/SPD | Claim flows that require line-manager review before SPD/HR | Employee submits; Manager approves/sends back; SPD/HR approves/rejects/sends back; HR Admin handles payment oversight |
| Sequential HRBP -> SPD -> HR Admin | Referral or policy-sensitive benefit flow where HRBP business review is needed | Employee submits; HRBP reviews context; SPD validates benefit operations; HR Admin finalizes record/letter/admin closeout |
| Parallel read-only visibility | Informational benefits, life/accident, team dashboard, reports | Employee/Manager/HRBP can view according to RBAC; only HR Admin/SPD own operational changes |

## 7. Field / Status / Action Inventory

| Persona | Benefit type | Route path | Visible fields | Document / policy fields | Approval state | Approval action | Handoff action | Payment / closed status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Employee | Entitlement summary | `/[locale]/benefits-hub`, profile benefits | plan, eligibility, annual limit, remaining, coverage, dependent summary | docs/policies tabs, required docs labels | View-only / active entitlement | None | Start claim/referral or open profile | Not applicable |
| Employee | Reimbursement / medical claim | `/[locale]/benefits-hub/reimbursement` | claim type, benefit code, receipt no/date/amount, total claim amount, hospital/store, dependent, remaining amount | attachments, required docs, policy hints | Draft, Submitted, Pending Review, Sent Back | Submit, resubmit, withdraw when allowed | To Manager or SPD/HR | Paid/Closed after HR/Admin handoff only |
| Employee | Referral | `/[locale]/benefits-hub/referral` | covered person, hospital, branch/province, service reason, preferred date, contact phone, notes | document note, ePatient/referral letter preview | Draft, Pending Review, Approved, Letter Issued, Sent Back, Rejected | Submit/resubmit/cancel | To HRBP/SPD/HR Admin | Closed after letter issued |
| Employee | Hospital claim | `/[locale]/benefits-hub/hospital-claim` | OPD/IPD, hospital, transfer doc no., dependent, receipt fields when required | attachments, required docs | Draft, Submitted, Pending Review, Sent Back, Approved, Rejected | Submit/resubmit | To Manager or SPD/HR | Paid/Closed preview |
| Employee | Beneficiary | `/[locale]/benefits-hub/beneficiary` | beneficiary summary, relationship, HR instruction | ID/relationship proof instruction | View-only | None | Contact HR | Closed as HR-owned record |
| Employee | Life/accident | `/[locale]/benefits-hub/life-accident` | coverage amount/summary, plan, salary-driven note | policy/coverage documents | View-only | None | None | Not applicable |
| Employee | History/status | `/[locale]/benefits-hub/history` | request id, benefit type, receipt no, amount, status, submitted date | attachment count when surfaced | All visible states | None | Open request/status center | Shows closed/paid when available |
| Manager | Sequential approvals | quick approve surface | employee, benefit type, request id, amount, submitted date, status | attachment/notes summary when surfaced | Pending Manager Review | Approve, Send back, Update visibility | To HR/SPD | Not applicable |
| Manager | Team visibility | `/[locale]/manager/benefits/team` | employee, plan, enrolled, usage, pending count | None | Read-only | None | Escalate outside system if needed | Not applicable |
| Manager | Reports | `/[locale]/manager/benefits/reports` | pending approvals, throughput, utilization, spend | None | Read-only | None | None | Not applicable |
| HR Admin | Plans | `/[locale]/admin/benefits/plans` | plan id, name, category, record type, template, annual limit, approval chain | required docs, eligibility, coverage/claim rules | Setup active/inactive | Configure/save when enabled | To rules/workflow/RBAC later | Not applicable |
| HR Admin | Rules | `/[locale]/admin/benefits/rules` | rule id, base object, description, scenario | policy/business rules | Setup preview | Review/configure when enabled | To entitlement engine later | Not applicable |
| HR Admin | Records | `/[locale]/admin/benefits/records`, `/records/[planId]` | employee, plan, event/record fields, effective date, amount when relevant | supporting record docs | HR-owned record state | Add/edit when capability allows | To Document Center later | Closed as HR record |
| HR Admin | Lifecycle | `/[locale]/admin/benefits/lifecycle` | onboard/change/offboard/annual enrollment event fields | policy notices | Lifecycle active/closed | Run/update when enabled | To Employee Center/Payroll later | Closed after lifecycle event |
| HR Admin | Exception | `/[locale]/admin/benefits/exception` | exception source, claim/record, reason, as-of date | exception proof | Exception open/resolved | Approve/log/resolve when enabled | To rules/payment later | Closed as exception |
| HR Admin | Payment | `/[locale]/admin/benefits/payment` | approved claims, payment period, amount, export preview | payment docs when applicable | Approved, Paid/Closed | Mark/export when enabled | To Payroll/Finance later | Paid/Closed preview |
| HR Admin | Reports/import | `/[locale]/admin/benefits/reports`, `/import` | report cards, import rows, validation severity | source file metadata | Preview | Open builder/validate mock | To Report Builder/storage later | Not applicable |
| HRBP | Policy/context review | STA-27 backlog persona surfaces | employee/business context, exception recommendation, team context | policy rationale | Pending HRBP Review | Approve/send back/recommend | To SPD/HR Admin | Not applicable |
| SPD | Claims inbox | `/[locale]/spd/inbox` | request id, employee, benefit code, receipt, amount, hospital, disease/treatment details | attachments, comments/reasons | Pending SPD, reviewing, sent back, approved, rejected | Start review, approve, reject, send back | To payment/HR Admin | Approved -> payment preview |
| SPD | Referral inbox | `/[locale]/spd/inbox` | employee, covered person, hospital, ePatient code, visit date, service reason, contact phone | document note, referral letter fields | Pending SPD, reviewing, approved, letter issued, rejected | Start review, approve, reject, send back, issue letter | To hospital/ePatient later | Letter issued/closed |

## 8. Cross-Module Boundary Contracts Only

These are seams, not implementation tasks.

| Boundary | Benefit module output | Receiving module | Contract declaration | Not implemented in STA-32 |
| --- | --- | --- | --- | --- |
| Payroll deduction/payment | Approved claim/payment preview, payment period, amount, payroll income/deduction code where known | Payroll / Finance | Benefit owns approval status and reimbursement intent; Payroll owns real pay run, deduction, bank file, tax treatment posting | Payroll deduction integration, bank file generation, real payment posting |
| Employee Center master data | Employee id, name, company, business unit, employee group, grade, dependents, employment status | Employee Center | Benefit consumes employee master data for entitlement visibility and eligibility context | Master data API, real dependent sync, effective-date backend |
| Document Center storage | Attachment metadata, required docs, policy docs, referral letter preview | Document Center / eDocuments | Benefit references document types and file metadata; Document Center owns production storage, retention, signed documents | Production document storage, real download/signature lifecycle |
| Workflow engine / RBAC | Approval chain, status transitions, actor role, action buttons | Workflow / RBAC | Benefit declares role-action-state matrix; workflow engine owns durable routing and RBAC enforcement | Final authorization model, real queue assignment, audit-grade workflow engine |
| Insurer / hospital / ePatient | Referral letter, ePatient code, hospital network, validity window | Insurer/hospital integration | Benefit shows preview fields and intended outbound payload shape | Real insurer API, ePatient sync, integration queue, error recovery |

## 9. Gap Split

### UI / Design Approval Scope

In scope for STA-32 sign-off:

- Persona story across Employee, Manager, HR Admin, HRBP, SPD
- Route inventory and current demo evidence
- Flow topology: sequential approval vs parallel read-only visibility
- Visible fields, statuses, action buttons, policy/document visibility
- Exemplar flows for reimbursement/medical claim, referral/hospital claim, beneficiary/life-accident
- Cross-module seams as contracts only
- HR sign-off checklist and decision table

### Backend-Later Contracts

Explicitly later, blocked until HR sign-off:

- Insurer/payment integration
- ePatient/hospital API sync
- Entitlement calculation engine
- Payroll deduction/payment integration
- Production document storage
- Final workflow engine/RBAC authorization model
- Durable audit log and production state machine
- Production import/export and report-builder persistence

### Policy / TBD Decisions

| TBD | Decision needed | Proposed owner |
| --- | --- | --- |
| Manager approval coverage | Which benefit types require Manager before HR/SPD | HRBP + SPD |
| HRBP vs SPD split | HRBP decision rights vs SPD operations rights | HRBP + SPD + HR Admin |
| Withdraw rules | Whether Employee can withdraw after Manager/SPD review starts | HR Benefit |
| Send-back SLA | Deadline and reminder rules for Employee correction | SPD |
| Payment close rule | When `Approved` becomes `Paid/Closed` in demo and production | HR Admin + Payroll |
| Beneficiary self-service | Whether Employee can ever self-edit beneficiaries | HR Admin + Legal |
| Document policy | Required document list, retention, signature/acknowledgement | HR Admin + Document Center owner |
| Exception authority | Which roles can approve exceptions beyond standard entitlement | HR Admin + HRBP |

## 10. HR Sign-Off Checklist / Decision Table

| Persona / flow | What HR should approve | Decision | Sign-off owner | Notes |
| --- | --- | --- | --- | --- |
| Employee Benefit Hub | Employee can understand entitlement, documents, policy, request status | Approve / Revise | HR Benefit | Confirm Thai-primary wording and CTA grouping |
| Employee reimbursement | Fields and docs are enough for medical/receipt claim demo | Approve / Revise | SPD | Confirm claim field labels and required docs |
| Employee referral | Referral is clearly separate from reimbursement | Approve / Revise | SPD | Confirm hospital/ePatient wording |
| Employee beneficiary | Employee view-only boundary is correct | Approve / Revise | HR Admin / Legal | Confirm no employee self-edit in demo |
| Employee life/accident | Computed/read-only coverage model is acceptable | Approve / Revise | HR Admin | Confirm salary-driven wording does not imply backend calc ready |
| Manager approval | Manager has action buttons only on sequential flows | Approve / Revise | HRBP | Confirm approve/send-back/update actions |
| Manager dashboard | Manager read-only team benefit view is acceptable | Approve / Revise | HRBP | Confirm no sensitive overexposure |
| HR Admin setup | Plans/rules/records/lifecycle surfaces are sufficient for design approval | Approve / Revise | HR Admin | Confirm disabled edit/export areas are acceptable |
| HR Admin payment/report | Payment/report previews show the intended handoff without implementing finance/backend | Approve / Revise | HR Admin / Payroll | Confirm payroll seam wording |
| HRBP | HRBP is distinct from SPD and tracked under STA-27 | Approve / Revise | HRBP | Confirm backlog dependency is explicit |
| SPD claims | SPD inbox actions and fields match service operations | Approve / Revise | SPD | Confirm send-back/reject reasons |
| SPD referral | SPD can review, approve, and issue referral letter in demo | Approve / Revise | SPD | Confirm letter fields and validity rule |
| Cross-module contracts | Payroll, Employee Center, Document Center, workflow/RBAC seams are declared only | Approve / Revise | HR Admin + IT | Backend remains blocked |

Sign-off rule: Backend implementation may start only after the relevant owners approve the persona rows and cross-module boundary rows above, or explicitly document accepted gaps.

## 11. Appendix A — Backend Block Statement

Backend remains blocked until HR sign-off.

This approval pack does not authorize:

- backend implementation
- database schema changes
- API routes
- real entitlement calculation
- payroll/payment/deduction integration
- insurer/hospital/ePatient integration
- production document storage
- final RBAC/workflow authorization
- production import/export/report persistence

Allowed next step after approval: create or update implementation tickets with signed-off UI/design scope, state model, field/action inventory, and explicit backend acceptance criteria. Do not infer backend acceptance from this document alone.

## 12. Appendix B — Seed Acceptance Criteria Mapping

| Seed AC | Mapping in this pack |
| --- | --- |
| Benefits demo scope maps all personas and routes to one consolidated approval story | Sections 2 and 3 |
| Existing Benefit Linear issues are referenced and gaps are de-duplicated | Section 4 |
| UI/demo acceptance is separated from backend/integration acceptance | Sections 1, 8, 9, 11 |
| HR can approve policies, fields, statuses, and handoff boundaries before backend starts | Sections 6, 7, 10 |
| One consolidated HR approval pack with persona-specific subsections/checklists | Sections 2 and 10 |
| HRBP and SPD kept as distinct personas with STA-27 dependency explicitly noted as backlog | Sections 2 and 4 |
| 2-3 detailed exemplar flows plus reusable pattern note | Section 5 |
| Lightweight demo state model included | Section 6 |
| Mixed approval flow topology: sequential Manager -> HR vs parallel read-only visibility | Sections 2 and 6 |
| Cross-module boundary contracts declared for Payroll/Employee Center/Document Center without implementing other side | Section 8 |
| Manager persona has approval inbox/action buttons for sequential flows and read-only dashboard for parallel flows | Sections 2, 3, 7 |

## 13. Knowledge Sources Consulted

Project wiki preflight:

- `omx_wiki/index.md`: none found in this worktree; no wiki canary applicable.
- `.omx/context/*.md`: none found by preflight.
- `.omx/plans/*.md`: none found by preflight.

Guidance and source context:

- `AGENTS.md`
- `/Users/tachongrak/.ouroboros/seeds/seed_79a7d2e0d47c.yaml`
- `/tmp/sta32_q00_context.md`

Repo evidence:

- `src/frontend/src/app/[locale]/benefits-hub/page.tsx`
- `src/frontend/src/app/[locale]/benefits-hub/reimbursement/page.tsx`
- `src/frontend/src/app/[locale]/benefits-hub/referral/page.tsx`
- `src/frontend/src/app/[locale]/benefits-hub/hospital-claim/page.tsx`
- `src/frontend/src/app/[locale]/benefits-hub/physical-checkup/page.tsx`
- `src/frontend/src/app/[locale]/benefits-hub/beneficiary/page.tsx`
- `src/frontend/src/app/[locale]/benefits-hub/life-accident/page.tsx`
- `src/frontend/src/app/[locale]/benefits-hub/history/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/plans/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/rules/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/rules/_components/EntitlementRulesManager.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/records/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/records/[planId]/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/lifecycle/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/exception/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/payment/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/reports/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/import/page.tsx`
- `src/frontend/src/app/[locale]/admin/benefits/beneficiaries/page.tsx`
- `src/frontend/src/app/[locale]/manager/benefits/team/page.tsx`
- `src/frontend/src/app/[locale]/manager/benefits/reports/page.tsx`
- `src/frontend/src/app/[locale]/spd/inbox/page.tsx`
- `src/frontend/src/stores/benefit-claims.ts`
- `src/frontend/src/stores/benefit-referrals.ts`
- `src/frontend/src/stores/cnext-benefits-slice.ts`
- `src/frontend/src/hooks/use-medical-claims.ts`
- `src/frontend/src/hooks/use-hospital-referral.ts`
- `src/frontend/src/lib/benefit-routes.ts`
- `src/frontend/src/lib/benefit-referral-adapters.ts`
- `src/frontend/src/lib/team-benefits-mock.ts`
- `src/frontend/src/data/benefits/plan-registry.ts`
- `src/frontend/src/data/benefits/rules-registry.ts`
- `src/frontend/src/components/benefits/BenefitServicesPanel.tsx`
- `src/frontend/src/components/benefits/templates/*`
- `src/frontend/src/components/benefits/reimbursement/ReimbursementRequestPanel.tsx`
- `src/frontend/src/components/benefits/referral/ReferralRequestPanel.tsx`
- `src/frontend/src/components/workflow/BenefitClaimsInbox.tsx`
- `src/frontend/src/components/workflow/BenefitReferralInbox.tsx`
- `src/frontend/src/components/manager/quick-approve-page.tsx`
- `src/frontend/src/components/manager/benefits/ApproveTriadButtons.tsx`
- `src/frontend/src/components/manager/team-benefits-matrix.tsx`
