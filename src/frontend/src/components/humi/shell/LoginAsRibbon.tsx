'use client';

// ════════════════════════════════════════════════════════════
// LoginAsRibbon — subtle "Acting as …" bar shown ABOVE the Topbar.
//
// SF-realignment (di-proxy-sf-2026-05-28):
//   - The previous burnt-orange band (var(--imp-bg) #C2410C) is gone. The bar
//     now uses Humi tokens only: canvas-soft background, hairline bottom border,
//     text-ink copy. No red/orange/clay/crimson — NO-RED guardrail.
//   - Copy reads "You are acting as {persona name}" / "คุณกำลังสวมบทบาทเป็น
//     {persona name}". Original admin name is NOT displayed inline; it survives
//     via the container `title`/`aria-label` for tooltip + screen-reader use.
//   - The exit affordance is now a Humi <Button variant="secondary"> labeled
//     "End Proxy" / "จบการสวมบทบาท" on the right of the bar (no underline link).
//
// Renders ONLY while impersonating (originalUser !== null). When not in a
// proxy session it renders nothing. The Topbar avatar dropdown is the entry
// point into impersonation; this bar is the persistent exit affordance.
// ════════════════════════════════════════════════════════════

import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/humi/Button';

export function LoginAsRibbon() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const isTh = locale !== 'en';

  const username = useAuthStore((s) => s.username);
  const originalUser = useAuthStore((s) => s.originalUser);
  const exitPersona = useAuthStore((s) => s.exitPersona);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  // Wait for Zustand persist rehydration so SSR/first paint matches client.
  if (!hasHydrated) return null;
  // Bar shows ONLY during impersonation; otherwise nothing.
  if (!originalUser || !username) return null;

  function handleExit() {
    exitPersona();
    router.push(`/${locale}/home`);
  }

  const adminName = originalUser.username || (isTh ? 'บัญชีเดิม' : 'original account');
  const a11yLabel = isTh
    ? `กำลังสวมบทบาทเป็น ${username} (จากบัญชีของ ${adminName})`
    : `Acting as ${username} (signed in as ${adminName})`;
  const message = isTh
    ? `คุณกำลังสวมบทบาทเป็น ${username}`
    : `You are acting as ${username}`;

  return (
    <div
      role="status"
      aria-label={a11yLabel}
      title={a11yLabel}
      className="flex items-center gap-3 bg-canvas-soft border-b border-hairline text-ink px-6 py-2"
      style={{
        // Span the full width of the .humi-app grid (sidebar + main) so the bar
        // covers the whole session chrome.
        gridColumn: '1 / -1',
      }}
    >
      <span className="min-w-0 flex-1 truncate text-small font-medium">
        {message}
      </span>

      <Button variant="secondary" size="sm" onClick={handleExit} className="flex-shrink-0">
        {isTh ? 'จบการสวมบทบาท' : 'End Proxy'}
      </Button>
    </div>
  );
}
