'use client';

// quick-approve/layout.tsx — role guard for /{locale}/quick-approve
//   - Not signed in     → redirect to /login
//   - Signed in, no module access → render <AccessDenied> IN PLACE (no redirect)
// Gated by MODULE_ACCESS['quick-approve'] (manager+) via canAccessModule.
// Mirrors the hydration/auth gating of manager/layout.tsx.

import { useEffect, type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { canAccessModule } from '@/lib/rbac';
import { AccessDenied } from '@/components/shared/access-denied';

export default function QuickApproveLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const { isAuthenticated, roles, _hasHydrated } = useAuthStore();
  const canApprove = canAccessModule(roles, 'quick-approve');

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

  // Signed in but no approval access → explicit denial surface in place (no redirect).
  if (!canApprove) {
    return (
      <AccessDenied
        reasonTh="หน้านี้สำหรับผู้อนุมัติ (หัวหน้า/HR/People Partner)"
        reason="For approvers (manager / HR / People Partner)"
      />
    );
  }

  return <>{children}</>;
}
