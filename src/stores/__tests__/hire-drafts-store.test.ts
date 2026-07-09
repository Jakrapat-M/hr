// hire-drafts-store.test.ts — STA-114 "Save Draft + Draft Form tray"
// Covers the plan's 8-case Test Plan:
//   1. save → tray → resume restores fields+step → delete removes it
//   2. submit removes the correct draft among ≥2 (AC13)
//   3. rename-in-session re-save overwrites the same row (AC4 / D1)
//   4. same normalized name re-save overwrites, no duplicate (AC4 / D2)
//   5. distinct candidates coexist as separate rows (AC6)
//   6. F5 after resume loads the resumed draft, not a stale scratchpad (D5)
//   7. stale-version snapshot upgrades via migrateHireState, no crash (AC8)
//   8. Save Draft disabled with empty name, enabled after first name (AC2)

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import {
  useHireWizard,
  migrateHireState,
  HIRE_WIZARD_VERSION,
  type HireWizardDraftSnapshot,
} from '@/lib/admin/store/useHireWizard'
import {
  useHireDraftsStore,
  normalizeDraftName,
  type HireDraft,
} from '@/stores/hire-drafts-store'

// Use jsdom's built-in localStorage (the same engine the persist stores bound to
// at import time). Clearing it in beforeEach keeps tests isolated. Replacing the
// global here would NOT work: persist captured its storage at store-creation.

// Helper: build a tray draft from the current wizard state.
function buildDraftFromWizard(): HireDraft {
  const s = useHireWizard.getState()
  const first = s.formData.biographical.firstNameLocal.trim() || s.formData.identity.firstNameEn.trim()
  const last = s.formData.biographical.lastNameLocal.trim() || s.formData.identity.lastNameEn.trim()
  const candidateName = `${first} ${last}`.trim()
  return {
    draftId: s.ensureDraftId(),
    candidateName,
    nameKey: normalizeDraftName(candidateName),
    savedAt: Date.now(),
    step: s.currentStep,
    snapshot: s.formData,
    candidateContext: s.candidateContext,
    schemaVersion: HIRE_WIZARD_VERSION,
  }
}

// Mirror the page's onClick reconcile so the wizard draftId tracks the adopted row.
function saveDraftFromWizard(): HireDraft {
  const draft = buildDraftFromWizard()
  useHireDraftsStore.getState().saveDraft(draft)
  const persisted = useHireDraftsStore.getState().drafts.find((d) => d.nameKey === draft.nameKey)
  if (persisted && persisted.draftId !== draft.draftId) {
    useHireWizard.getState().setDraftId(persisted.draftId)
  }
  return persisted ?? draft
}

beforeEach(() => {
  globalThis.localStorage.clear()
  act(() => {
    useHireWizard.getState().reset()
    useHireDraftsStore.setState({ drafts: [] })
  })
})

describe('STA-114 hire-drafts tray', () => {
  it('1. save → tray → resume restores fields+step → delete removes it', () => {
    act(() => {
      useHireWizard.getState().setStepData('identity', { firstNameEn: 'Somchai', lastNameEn: 'Jaidee' })
      useHireWizard.getState().jumpToUrl(2)
    })
    const saved = saveDraftFromWizard()

    expect(useHireDraftsStore.getState().drafts).toHaveLength(1)
    expect(saved.candidateName).toBe('Somchai Jaidee')
    expect(saved.step).toBe(2)

    // Resume into a fresh wizard
    act(() => {
      useHireWizard.getState().reset()
      useHireWizard.getState().hydrateFromDraft({
        draftId: saved.draftId,
        formData: saved.snapshot,
        step: saved.step,
        candidateContext: saved.candidateContext,
        schemaVersion: saved.schemaVersion,
      })
    })
    expect(useHireWizard.getState().formData.identity.firstNameEn).toBe('Somchai')
    expect(useHireWizard.getState().currentStep).toBe(2)
    expect(useHireWizard.getState().draftId).toBe(saved.draftId)

    // Delete
    act(() => useHireDraftsStore.getState().removeDraft(saved.draftId))
    expect(useHireDraftsStore.getState().drafts).toHaveLength(0)
  })

  it('2. submit removes the correct draft among ≥2 (AC13)', () => {
    // Draft A
    act(() => useHireWizard.getState().setStepData('identity', { firstNameEn: 'Anan', lastNameEn: 'A' }))
    const a = saveDraftFromWizard()
    // Draft B (fresh candidate)
    act(() => {
      useHireWizard.getState().reset()
      useHireWizard.getState().setStepData('identity', { firstNameEn: 'Bee', lastNameEn: 'B' })
    })
    const b = saveDraftFromWizard()

    expect(useHireDraftsStore.getState().drafts.map((d) => d.draftId).sort())
      .toEqual([a.draftId, b.draftId].sort())

    // Simulate the submit hook: remove the active draftId (B) before reset()
    const activeDraftId = useHireWizard.getState().draftId
    expect(activeDraftId).toBe(b.draftId)
    act(() => {
      if (activeDraftId) useHireDraftsStore.getState().removeDraft(activeDraftId)
      useHireWizard.getState().reset()
    })

    const remaining = useHireDraftsStore.getState().drafts
    expect(remaining).toHaveLength(1)
    expect(remaining[0].draftId).toBe(a.draftId)
  })

  it('3. rename-in-session re-save overwrites the same row (AC4 / D1)', () => {
    act(() => useHireWizard.getState().setStepData('identity', { firstNameEn: 'Kanya', lastNameEn: 'Old' }))
    const first = saveDraftFromWizard()
    // Rename in the same session (draftId unchanged)
    act(() => useHireWizard.getState().setStepData('identity', { lastNameEn: 'New' }))
    const second = saveDraftFromWizard()

    expect(useHireDraftsStore.getState().drafts).toHaveLength(1)
    expect(second.draftId).toBe(first.draftId)
    expect(useHireDraftsStore.getState().drafts[0].candidateName).toBe('Kanya New')
  })

  it('4. same normalized name re-save overwrites, no duplicate (AC4 / D2)', () => {
    // Two independent wizard sessions, same name → adopt the existing row's id.
    act(() => useHireWizard.getState().setStepData('identity', { firstNameEn: 'Dao', lastNameEn: 'Star' }))
    const a = saveDraftFromWizard()

    act(() => {
      useHireWizard.getState().reset() // new draftId on next ensure
      useHireWizard.getState().setStepData('identity', { firstNameEn: '  Dao ', lastNameEn: 'Star  ' })
    })
    const b = saveDraftFromWizard()

    expect(useHireDraftsStore.getState().drafts).toHaveLength(1)
    // adopted the original row's id
    expect(b.draftId).toBe(a.draftId)
  })

  it('5. distinct candidates coexist as separate rows (AC6)', () => {
    act(() => useHireWizard.getState().setStepData('identity', { firstNameEn: 'Echo', lastNameEn: 'One' }))
    saveDraftFromWizard()
    act(() => {
      useHireWizard.getState().reset()
      useHireWizard.getState().setStepData('identity', { firstNameEn: 'Foxtrot', lastNameEn: 'Two' })
    })
    saveDraftFromWizard()

    const names = useHireDraftsStore.getState().drafts.map((d) => d.candidateName).sort()
    expect(names).toEqual(['Echo One', 'Foxtrot Two'])
  })

  it('6. F5 after resume loads the resumed draft, not a stale scratchpad (D5)', () => {
    act(() => {
      useHireWizard.getState().setStepData('identity', { firstNameEn: 'Grace', lastNameEn: 'Resume' })
      useHireWizard.getState().jumpToUrl(2)
    })
    const saved = saveDraftFromWizard()

    // New session: reset, then resume the saved draft (writes the persist scratchpad)
    act(() => {
      useHireWizard.getState().reset()
      useHireWizard.getState().hydrateFromDraft({
        draftId: saved.draftId,
        formData: saved.snapshot,
        step: saved.step,
        candidateContext: saved.candidateContext,
        schemaVersion: saved.schemaVersion,
      })
    })

    // Zustand persist flushes synchronously → the 'hire-wizard-draft' envelope
    // now holds the resumed draft. Simulate F5 by reading it back.
    const raw = globalThis.localStorage.getItem('hire-wizard-draft')
    expect(raw).toBeTruthy()
    const envelope = JSON.parse(raw as string)
    expect(envelope.state.formData.identity.firstNameEn).toBe('Grace')
    expect(envelope.state.currentStep).toBe(2)
    expect(envelope.state.draftId).toBe(saved.draftId)
  })

  it('7. stale-version snapshot upgrades via migrateHireState, no crash (AC8)', () => {
    // A genuinely stale snapshot: pre-v11 shape, missing review + draftId, old version.
    const staleSnapshot = {
      formData: {
        identity: { firstNameEn: 'Helga', lastNameEn: 'Stale' },
        biographical: { firstNameLocal: '', lastNameLocal: '', nationality: null },
        // review intentionally omitted (older build) — migrate must backfill it
      },
      candidateContext: null,
      currentStep: 1,
    }

    // Pure helper upgrades without throwing and backfills the review slice.
    const upgraded = migrateHireState(staleSnapshot, 8) as { formData: Record<string, unknown>; draftId: unknown }
    expect(upgraded.formData.review).toBeDefined()
    expect((upgraded.formData.review as Record<string, unknown>).firstNameEnReview).toBe('')
    expect(upgraded.draftId).toBeNull()

    // hydrateFromDraft runs the same upgrade for a stale tray draft — no crash.
    const draft: HireWizardDraftSnapshot & { draftId: string } = {
      draftId: 'stale-1',
      formData: staleSnapshot.formData as unknown as HireWizardDraftSnapshot['formData'],
      step: 1,
      candidateContext: null,
      schemaVersion: 8,
    }
    act(() => {
      useHireWizard.getState().hydrateFromDraft(draft)
    })
    const fd = useHireWizard.getState().formData
    expect(fd.identity.firstNameEn).toBe('Helga')
    expect(fd.review).toBeDefined()
    expect(useHireWizard.getState().draftId).toBe('stale-1')
  })

  it('8. Save Draft disabled with empty name, enabled after first name (AC2)', () => {
    // Mirror the page gate: (firstNameLocal || firstNameEn).trim() !== ''
    const gate = () => {
      const s = useHireWizard.getState().formData
      return (s.biographical.firstNameLocal || s.identity.firstNameEn).trim() !== ''
    }
    expect(gate()).toBe(false)
    act(() => useHireWizard.getState().setStepData('identity', { firstNameEn: 'Ivy' }))
    expect(gate()).toBe(true)
  })
})
