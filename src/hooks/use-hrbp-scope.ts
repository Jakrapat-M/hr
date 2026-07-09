'use client';

/**
 * use-hrbp-scope — STA-27 PR-A · STA-64 (persona-aware)
 *
 * Returns the active HRBP persona's benefit `scope` (the single scope source for
 * the reports surface) plus the HRBP display name. The active scope comes from
 * the page-colocated `HrbpScopeProvider` that the reports page's persona switcher
 * writes; outside a provider it defaults to admin (all departments), which keeps
 * non-report consumers (e.g. ExceptionDetailModal, which reads `hrbpName`) working.
 *
 * `partneredDepts` is derived from the active scope for backward compatibility.
 * NOT used to filter `/quick-approve` rows — see
 * `docs/sta-27-quick-approve-predicate-audit.md`.
 */

import { useAuthStore } from '@/stores/auth-store';
import { useHrbpScopeContext } from '@/hooks/hrbp-scope-context';
import type { BenefitScope } from '@/lib/benefit-scope-filter';

export interface HrbpScopeResult {
  /** The single benefit scope source for the reports surface (admin → all). */
  scope: BenefitScope;
  /** Departments this HRBP partners with, derived from `scope` (empty for admin). */
  partneredDepts: string[];
  /** Display name for the current HRBP (audit entries, header chips). */
  hrbpName: string;
  /** Always false in mockup phase — kept on shape so backend swap is API-stable. */
  isLoading: false;
  /** Always null in mockup phase. */
  error: null;
}

export function useHrbpScope(): HrbpScopeResult {
  const username = useAuthStore((s) => s.username);
  const scope = useHrbpScopeContext();
  const partneredDepts = scope.kind === 'dept' ? scope.departments : [];
  return {
    scope,
    partneredDepts,
    hrbpName: username ?? 'HRBP Partner',
    isLoading: false,
    error: null,
  };
}
