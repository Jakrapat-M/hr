'use client';

// admin/layout.tsx — role guard for /{locale}/admin/**
//   - Not signed in       → redirect to /login
//   - Signed in, not admin → render <AccessDenied> IN PLACE (no redirect, no
//     flash-then-bounce; the persona switcher swapping roles must not feel like
//     a logout). Uses hasRole() so hr_manager (top of hierarchy) is admitted.
// Server-side enforcement is the Keycloak/NextAuth layer in src/lib/auth.ts
// once /api/auth/[...nextauth] is activated.

import { useEffect, type ReactNode } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { hasRole } from '@/lib/rbac';
import { AccessDenied } from '@/components/shared/access-denied';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const pathname = usePathname();
  const locale = params?.locale ?? 'th';
  const { isAuthenticated, roles, _hasHydrated } = useAuthStore();
  const isAdmin = hasRole(roles, 'hr_admin');
  const canUseEmployeeAdmin = hasRole(roles, 'spd') && pathname.includes('/admin/employees');

  useEffect(() => {
    // Wait for Zustand persist rehydration before redirecting — otherwise
    // a fresh tab flashes to /login while the store is still default-state.
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [_hasHydrated, isAuthenticated, locale, router]);

  // show nothing until hydrated (avoids flash-redirect)
  if (!_hasHydrated) return null;

  // Unauthenticated → the effect above redirects to /login; render nothing meanwhile.
  if (!isAuthenticated) return null;

  // Signed in but not admin → explicit denial surface in place (no redirect).
  if (!isAdmin && !canUseEmployeeAdmin) {
    return (
      <AccessDenied
        reasonTh="ต้องมีสิทธิ์ HR Admin หรือ SPD สำหรับข้อมูลพนักงาน"
        reason="Requires HR Admin, or SPD for employee data"
      />
    );
  }

  return <>{children}</>;
}
