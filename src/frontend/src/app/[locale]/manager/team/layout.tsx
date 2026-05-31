'use client';

// manager/team/layout.tsx — route guard for /{locale}/manager/team
//   - Not signed in                       → redirect to /login
//   - Signed in, not a Manager (+ above)  → render <AccessDenied> IN PLACE (no redirect)
// Manager direct-reports read-only view (P2). Restores the team-directory
// affordance the P1 /admin/employees?scope=team CTA cut from manager-dashboard.
// Mirrors the hydration/auth gating of hrbp/employees/layout.tsx exactly.

import { useEffect, type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole } from '@/lib/rbac';
import { AccessDenied } from '@/components/shared/access-denied';

export default function ManagerTeamLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const { isAuthenticated, roles, _hasHydrated } = useAuthStore();
  // Manager persona (manager) + People-Partners (hrbp, spd) + above (hr_admin, hr_manager).
  const canView = hasAnyRole([...roles], ['manager', 'hrbp', 'spd', 'hr_admin', 'hr_manager']);

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

  // Signed in but not a Manager / People-Partner → explicit denial in place (no redirect).
  if (!canView) {
    return (
      <AccessDenied
        reasonTh="หน้านี้สำหรับผู้จัดการที่มีผู้ใต้บังคับบัญชา และผู้ดูแลทีม"
        reason="For managers with direct reports and team leads"
      />
    );
  }

  return <>{children}</>;
}
