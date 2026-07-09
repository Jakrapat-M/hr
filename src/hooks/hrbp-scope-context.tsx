'use client';

/**
 * hrbp-scope-context — STA-64
 *
 * Page-colocated React context that carries the active HRBP persona's scope
 * for the benefits reports surface. The reports page's persona switcher writes
 * the active `BenefitScope`; `useHrbpScope()` reads it. This keeps a SINGLE
 * scope source per surface (the switcher) without touching the auth store or
 * adding a per-report `scope` prop.
 *
 * Consumers outside the provider (e.g. ExceptionDetailModal, which only needs
 * `hrbpName`) fall back to the default admin scope — a safe, render-free bypass.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BenefitScope } from '@/lib/benefit-scope-filter';

const DEFAULT_SCOPE: BenefitScope = { kind: 'admin' };

interface HrbpScopeContextValue {
  scope: BenefitScope;
  setScope: (scope: BenefitScope) => void;
}

const HrbpScopeContext = createContext<HrbpScopeContextValue | null>(null);

export function HrbpScopeProvider({
  initialScope = DEFAULT_SCOPE,
  children,
}: {
  initialScope?: BenefitScope;
  children: ReactNode;
}) {
  const [scope, setScope] = useState<BenefitScope>(initialScope);
  const value = useMemo<HrbpScopeContextValue>(() => ({ scope, setScope }), [scope]);
  return <HrbpScopeContext.Provider value={value}>{children}</HrbpScopeContext.Provider>;
}

/** Read the active HRBP benefit scope. Defaults to admin (all) outside a provider. */
export function useHrbpScopeContext(): BenefitScope {
  return useContext(HrbpScopeContext)?.scope ?? DEFAULT_SCOPE;
}

/** Write the active HRBP benefit scope. No-op outside a provider. */
export function useSetHrbpScope(): (scope: BenefitScope) => void {
  return useContext(HrbpScopeContext)?.setScope ?? (() => {});
}
