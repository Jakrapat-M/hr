'use client';

// STA-28 PR-A — manager/layout.tsx
// Role guard for /{locale}/manager/**
//   - Not signed in → redirect to /login
//   - Signed in, not manager/hr_admin/hr_manager → redirect to /home
// Mirrors admin/layout.tsx exactly: hydration-guarded, no flash.

import { useEffect, type ReactNode } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function ManagerLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const pathname = usePathname() ?? '';
  const locale = params?.locale ?? 'th';
  const { isAuthenticated, roles, _hasHydrated } = useAuthStore();

  // Manager persona: any of manager / hr_admin / hr_manager may access /manager/**
  const isManager =
    roles.includes('manager') ||
    roles.includes('hr_admin') ||
    roles.includes('hr_manager');

  // P2 — /manager/team has its OWN guard (manager/team/layout.tsx) that admits
  // People-Partners too and renders <AccessDenied> IN PLACE (no redirect, URL
  // stays /manager/team). Defer entirely to that nested layout so we don't
  // redirect hrbp/spd to /home before the child can gate them.
  const isTeamSubtree = /\/manager\/team(\/|$)/.test(pathname);

  useEffect(() => {
    // Wait for Zustand persist rehydration before redirecting — prevents flash
    // on fresh tab while the store is still in default (logged-out) state.
    if (!_hasHydrated) return;
    if (isTeamSubtree) return; // child layout owns this subtree's gating
    if (!isAuthenticated) {
      router.replace(`/${locale}/login`);
    } else if (!isManager) {
      // Signed in but wrong persona — send to /home, not /login
      router.replace(`/${locale}/home`);
    }
  }, [_hasHydrated, isAuthenticated, isManager, isTeamSubtree, locale, router]);

  // Show nothing until hydrated (avoids flash-redirect)
  if (!_hasHydrated) return null;

  // Team subtree: pass through to the nested guard regardless of persona.
  if (isTeamSubtree) return <>{children}</>;

  if (!isAuthenticated || !isManager) {
    return null;
  }

  return <>{children}</>;
}
