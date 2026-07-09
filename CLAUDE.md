@AGENTS.md

This file adds Claude-specific context on top of AGENTS.md.

## Current Project Phase (2026-07-09)

**Phase: UI Mockup — building toward HR Team sign-off before production-grade implementation begins.**

- 🎯 **Goal**: Deliver a complete, clickable UI mockup that HR Team can demo end-to-end and approve before any production-grade implementation begins.
- ⏭️ **Backend: SKIP for now** — workflow-engine endpoints, API contracts, real persistence, auth wiring, payroll integration: all out of scope at this stage. Do NOT spend cycles wiring real POST/PUT handlers.
- ✅ **In scope**: clickable flows (modals open, tables render, filters work, navigation between screens, state transitions visible), realistic static/registry-backed data, Cnext design conformance, bilingual TH/EN parity.
- ❌ **Out of scope**: real API integration, optimistic-vs-pessimistic update logic, retry/error UX beyond basic states, observability, RBAC enforcement against a real IAM.
- 🚫 **Mockup data caveat**: internal registry artifacts (TTT codes, template names, schemaVersion, etc.) should not leak into user-facing **input forms** by default. This does NOT mean stripping realistic seed data from tables/lists — that's how HR judges the design. Use existing registry/static seeds freely. Where a specific ticket's acceptance criteria explicitly requires an internal artifact as a user-input field (e.g. an admin configurator tab), that ticket's AC wins over this default.
- ✅ **Definition of done for this phase**: HR Team can step through every admin/employee flow without dead ends, and signs off on the visual + interaction direction.
- 🔁 When in doubt: prioritize *finishing* missing screens + interactions over *backend correctness*. After HR sign-off, a separate phase will re-scope each screen for real backend wiring.

## Specs & Slash Commands

- `specs/` — feature specs and chore plans (see `specs/README.md`).
- `.claude/commands/*.md` — reusable slash commands: `/chore`, `/implement`, `/plan`, `/build`, `/prime`, `/test_e2e`, etc.
- Outputs from agent workflows land under `agents/{id}/`.

## Communication style (สำคัญ — ผู้ใช้ต้องการ)

- **สรุปสั้น กระชับ** อย่า dump ข้อความยาว ตอบเป็น bullet สั้นๆ: สถานะ / กำลังทำ / รออะไร
- เก็บ forensic/log/timeline ไว้ในใจ โชว์เฉพาะข้อสรุป + next step
- ตัดสินใจ → ถามสั้น ตรงประเด็น ไม่อธิบายยาว
