'use client';

// manager/payroll-summary/layout.tsx — route guard for /{locale}/manager/payroll-summary
//   - Not signed in                         → redirect to /login
//   - Signed in, no payroll-team-summary    → render <AccessDenied> IN PLACE (no redirect)
//
// P3 — READ-ONLY team comp rollup. Manager is admitted for READ only
// (MODULE_ACCESS['payroll-team-summary'] = manager/hr_admin/hr_manager).
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

  // Module gate (manager/hr_admin/hr_manager). hasAnyRole fallback keeps the
  // guard resilient if the module key is ever renamed.
  const canView =
    canAccessModule([...roles], 'payroll-team-summary') ||
    hasAnyRole([...roles], ['manager', 'hr_admin', 'hr_manager']);

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
        reasonTh="หน้านี้สำหรับผู้จัดการดูสรุปค่าตอบแทนทีม (อ่านอย่างเดียว) และฝ่ายบุคคล"
        reason="For managers viewing their team's compensation summary (read-only) and HR"
      />
    );
  }

  return <>{children}</>;
}
