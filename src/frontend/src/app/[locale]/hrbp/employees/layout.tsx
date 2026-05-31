'use client';

// hrbp/employees/layout.tsx — route guard for /{locale}/hrbp/employees
//   - Not signed in              → redirect to /login
//   - Signed in, not a People-Partner (+ above) → render <AccessDenied> IN PLACE (no redirect)
// People-Partner BU-scoped employee registry (P2 Item 1). Restores the leaf
// that PR-3 cut from hrbp/spd off the dead /admin/employees entry.
// Mirrors the hydration/auth gating of quick-approve/layout.tsx + admin/layout.tsx.

import { useEffect, type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole } from '@/lib/rbac';
import { AccessDenied } from '@/components/shared/access-denied';

export default function HrbpEmployeesLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const { isAuthenticated, roles, _hasHydrated } = useAuthStore();
  // People-Partner personas (hrbp, spd) + above (hr_admin, hr_manager).
  const canView = hasAnyRole([...roles], ['hrbp', 'spd', 'hr_admin', 'hr_manager']);

  useEffect(() => {
    // Wait for Zustand persist rehydration before redirecting — prevents flash
    // on a fresh tab while the store is still in default (logged-out) state.
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [_hasHydrated, isAuthenticated, locale, router]);

  // Show nothing until hydrated (avoids flash-redirect)
  if (!_hasHydrated) return null;

  // Unauthenticated → the effect above redirects to /login; render nothing meanwhile.
  if (!isAuthenticated) return null;

  // Signed in but not a People-Partner → explicit denial surface in place (no redirect).
  if (!canView) {
    return (
      <AccessDenied
        reasonTh="หน้านี้สำหรับ People Partner (HRBP/SPD) และผู้ดูแลระบบบุคคล"
        reason="For People Partners (HRBP / SPD) and HR administrators"
      />
    );
  }

  return <>{children}</>;
}
