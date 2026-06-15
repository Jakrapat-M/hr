'use client';

/**
 * hire-drafts-store — STA-114 "Hire Wizard: Save Draft + Draft Form tray"
 *
 * A shared tray of per-candidate hire drafts, persisted to localStorage under
 * the key 'hire-drafts' (orthogonal to the wizard's own 'hire-wizard-draft'
 * scratchpad). The Hire Wizard's explicit "Save Draft" button upserts a row
 * here; the /admin/employees "Draft Form" tab lists them for Resume / Delete;
 * a successful hire submit auto-removes its originating draft.
 *
 * Identity (D1/D2): the primary upsert key is the opaque `draftId` carried by
 * the wizard (stable across a rename-in-session). To honour AC4 ("one draft per
 * candidate, no duplicate row") the upsert also adopts an existing row that has
 * the same normalized name, so re-saving the same person never spawns a 2nd row.
 *
 * Mockup-only persistence — no backend this phase.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { HireWizardDraftSnapshot } from '@/lib/admin/store/useHireWizard';

// ── Types ───────────────────────────────────────────────────────────────────

export interface HireDraft {
  /** opaque upsert key (matches the wizard's top-level draftId) */
  draftId: string;
  /** tray row LABEL — local-first, mirrors handleSubmit's candidateName derivation */
  candidateName: string;
  /** normalized name for the D2 same-candidate dedupe guard */
  nameKey: string;
  /** epoch ms — rendered Thai-BE via lib/date.ts in the tray */
  savedAt: number;
  /** wizard step to resume at */
  step: number;
  /** full wizard form payload */
  snapshot: HireWizardDraftSnapshot['formData'];
  /** candidate context frozen at save time (null for manual/blank hires) */
  candidateContext: HireWizardDraftSnapshot['candidateContext'];
  /** store version at save time — drives the migrateHireState upgrade on resume */
  schemaVersion: number;
}

interface HireDraftsState {
  drafts: HireDraft[];
  /** Upsert a draft per D2 (by draftId → by nameKey → insert). */
  saveDraft: (draft: HireDraft) => void;
  removeDraft: (draftId: string) => void;
  getDraft: (draftId: string) => HireDraft | undefined;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize a candidate name for the D2 dedupe guard (case/space-insensitive). */
export function normalizeDraftName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useHireDraftsStore = create<HireDraftsState>()(
  persist(
    (set, get) => ({
      drafts: [],

      saveDraft: (draft) =>
        set((state) => {
          const byId = state.drafts.findIndex((d) => d.draftId === draft.draftId);
          // 1) existing draftId → overwrite in place (covers rename-in-session)
          if (byId !== -1) {
            const next = state.drafts.slice();
            next[byId] = draft;
            return { drafts: next };
          }
          // 2) same normalized name on a different id → adopt that row's id (no dup)
          const byName = state.drafts.findIndex(
            (d) => d.nameKey === draft.nameKey && d.nameKey !== '',
          );
          if (byName !== -1) {
            const next = state.drafts.slice();
            next[byName] = { ...draft, draftId: state.drafts[byName].draftId };
            return { drafts: next };
          }
          // 3) brand-new candidate → insert
          return { drafts: [...state.drafts, draft] };
        }),

      removeDraft: (draftId) =>
        set((state) => ({ drafts: state.drafts.filter((d) => d.draftId !== draftId) })),

      getDraft: (draftId) => get().drafts.find((d) => d.draftId === draftId),
    }),
    {
      name: 'hire-drafts',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
