'use client';

// manager/payroll-summary/layout.tsx — route guard for /{locale}/manager/payroll-summary
//   - Not signed in                         → redirect to /login
//   - Signed in, no payroll-team-summary    → render <AccessDenied> IN PLACE (no redirect)
//
// READ-ONLY team comp rollup, HR comp roles only. Manager is NOT admitted —
// line managers must not see per-person team comp (privacy/data-minimization)
// (MODULE_ACCESS['payroll-team-summary'] = hr_admin/hr_manager).
// Mirrors manager/team/layout.tsx hydration/auth gating. Denial renders in
// place (URL stays /manager/payroll-summary) per the route-denial rule.

import { useEffect, type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { canAccessModule, hasAnyRole } from '@/lib/rbac';
import { AccessDenied } from '@/components/shared/access-denied';

export default function ManagerPayrollSummaryLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const { isAuthenticated, roles, _hasHydrated } = useAuthStore();

  // Module gate (hr_admin/hr_manager). hasAnyRole fallback keeps the
  // guard resilient if the module key is ever renamed.
  const canView =
    canAccessModule([...roles], 'payroll-team-summary') ||
    hasAnyRole([...roles], ['hr_admin', 'hr_manager']);

  useEffect(() => {
    // Wait for Zustand persist rehydration before redirecting — prevents flash
    // on a fresh tab while the store is still in default (logged-out) state.
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [_hasHydrated, isAuthenticated, locale, router]);

  if (!_hasHydrated) return null;
  if (!isAuthenticated) return null;

  if (!canView) {
    return (
      <AccessDenied
        reasonTh="หน้านี้สำหรับฝ่ายบุคคลดูสรุปค่าตอบแทน (อ่านอย่างเดียว) เท่านั้น"
        reason="For HR viewing the compensation summary (read-only) only"
      />
    );
  }

  return <>{children}</>;
}
