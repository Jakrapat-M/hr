'use client';

// hrbp/doc-review/layout.tsx — route guard for /{locale}/hrbp/doc-review
//   - Not signed in                              → redirect to /login
//   - Signed in, not SPD / HR-admin (+ above)    → render <AccessDenied> IN PLACE (no redirect)
// P2 follow-up (PR-4): splits the SPD document-review surface out of /admin/documents.
// /admin/documents is gated hr_admin+ by admin/layout, so SPD could never reach it.
// This view lives OUTSIDE the admin/layout subtree (under /hrbp) so its own guard can
// admit spd + hr_admin + hr_manager. Mirrors hrbp/employees/layout.tsx.

import { useEffect, type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole } from '@/lib/rbac';
import { AccessDenied } from '@/components/shared/access-denied';

export default function HrbpDocReviewLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const { isAuthenticated, roles, _hasHydrated } = useAuthStore();
  // Document review = SPD (+ HR-admins above). hrbp is intentionally excluded —
  // SPD owns the doc-review queue; HR Admin reaches the full queue via /admin/documents.
  const canView = hasAnyRole([...roles], ['spd', 'hr_admin', 'hr_manager']);

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

  // Signed in but not SPD / HR-admin → explicit denial surface in place (no redirect).
  if (!canView) {
    return (
      <AccessDenied
        reasonTh="หน้านี้สำหรับ SPD (ผู้ตรวจเอกสาร) และผู้ดูแลระบบบุคคล"
        reason="For SPD (document reviewers) and HR administrators"
      />
    );
  }

  return <>{children}</>;
}
