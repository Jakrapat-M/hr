'use client';

// ════════════════════════════════════════════════════════════
// LoginAsRibbon — persistent "Logged in as" strip beneath the Topbar.
//
// Always visible while authenticated (ถาวร), showing the active identity
// + persona badge. When impersonating (originalUser !== null) it takes on
// an accent emphasis and appends an exit button that drops the proxy layer
// and returns to /home. Supersedes the old <ActingBadge/> Topbar chip.
// ════════════════════════════════════════════════════════════

import { useRouter, useParams } from 'next/navigation';
import { UserCog, Eye } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { PERSONA_BADGE } from '@/lib/demo-users';

export function LoginAsRibbon() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const isTh = locale !== 'en';

  const username = useAuthStore((s) => s.username);
  const email = useAuthStore((s) => s.email);
  const originalUser = useAuthStore((s) => s.originalUser);
  const exitPersona = useAuthStore((s) => s.exitPersona);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  // Wait for Zustand persist rehydration so SSR/first paint matches client.
  if (!hasHydrated) return null;
  // Not authenticated → nothing to announce.
  if (!username) return null;

  const inProxy = originalUser !== null;
  const badge = email ? PERSONA_BADGE[email] : null;

  function handleExit() {
    exitPersona();
    router.push(`/${locale}/home`);
  }

  return (
    <div
      role="status"
      aria-label={isTh ? 'สถานะการเข้าใช้งาน' : 'Active session'}
      className={
        'flex items-center gap-2 border-b px-4 py-1.5 text-xs text-ink-muted ' +
        (inProxy
          ? 'bg-accent-soft/40 border-accent'
          : 'bg-canvas-soft border-hairline')
      }
    >
      {inProxy ? (
        <UserCog size={14} aria-hidden className="flex-shrink-0 text-accent" />
      ) : (
        <Eye size={14} aria-hidden className="flex-shrink-0" />
      )}
      <span className="min-w-0 truncate">
        {isTh ? 'เข้าใช้งานในฐานะ: ' : 'Logged in as: '}
        <span className="font-semibold text-ink">{username}</span>
        {badge && (
          <>
            {' · '}
            <span className={'humi-tag ' + badge.tone}>{badge.label}</span>
          </>
        )}
      </span>

      {inProxy && originalUser && (
        <button
          type="button"
          onClick={handleExit}
          className="ml-auto flex-shrink-0 rounded-full border border-accent bg-surface px-2.5 py-0.5 text-xs font-medium text-ink whitespace-nowrap transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {isTh
            ? `← กลับสู่ ${originalUser.username}`
            : `← Back to ${originalUser.username}`}
        </button>
      )}
    </div>
  );
}
