'use client';

// ════════════════════════════════════════════════════════════
// LoginAsRibbon — amber "Acting as …" band shown ABOVE the Topbar.
//
// Renders ONLY while impersonating (originalUser !== null). When not in a
// proxy session it renders nothing — the topbar PersonaSwitcher is the entry
// point into impersonation, this band is the persistent exit affordance.
// Supersedes the old <ActingBadge/> Topbar chip (deleted in this change).
//
// Copy (Req2): "Acting as {Name} · EMP-{id} · {SCOPE} · Switch back to admin".
//   - {Name}  = active persona username (auth-store)
//   - EMP-{id} = active persona empId (auth-store userId, = DEMO_USERS[email].id)
//   - {SCOPE} = persona badge label + tier chips (A/B/C/D) via persona-tiers
//   - Switch back → exitPersona() then router.push(`/${locale}/home`)
//
// TOKENS: solid burnt-orange band = var(--imp-bg) #C2410C on var(--imp-fg) cream,
// matching the `.imp` ribbon in the Humi prototype (humi-prototype.jsx). No icon;
// the exit affordance is an underlined text link pushed to the right (no pill).
// Cream-opacity tiers via color-mix; pure-white target via the `white` keyword.
// The i18n source of truth lives in messages/{th,en}.json shell.ribbon.* —
// rendered inline here as TH/EN literals to match the sibling shell components
// (PersonaSwitcher, Topbar) which also use the `isTh` ternary pattern.
// ════════════════════════════════════════════════════════════

import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { PERSONA_BADGE } from '@/lib/demo-users';
import { personaTiers } from '@/lib/persona-tiers';

export function LoginAsRibbon() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const isTh = locale !== 'en';

  const username = useAuthStore((s) => s.username);
  const email = useAuthStore((s) => s.email);
  const userId = useAuthStore((s) => s.userId);
  const roles = useAuthStore((s) => s.roles);
  const originalUser = useAuthStore((s) => s.originalUser);
  const exitPersona = useAuthStore((s) => s.exitPersona);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  // Wait for Zustand persist rehydration so SSR/first paint matches client.
  if (!hasHydrated) return null;
  // Band shows ONLY during impersonation; otherwise nothing.
  if (!originalUser || !username) return null;

  const badge = email ? PERSONA_BADGE[email] : null;
  const tiers = personaTiers(roles);
  // SCOPE band text mirrors the prototype: "SCOPE · A + B" (access tiers joined
  // by " + "); falls back to the persona label when no tiers are present.
  const scopeLabel = badge?.label ?? (isTh ? 'พนักงาน' : 'Employee');
  const scope = tiers.length ? tiers.join(' + ') : scopeLabel;

  function handleExit() {
    exitPersona();
    router.push(`/${locale}/home`);
  }

  return (
    <div
      role="status"
      aria-label={isTh ? 'กำลังดูในชื่อผู้อื่น' : 'Impersonation active'}
      className="flex items-center gap-2.5"
      style={{
        background: 'var(--imp-bg)',
        color: 'var(--imp-fg)',
        minHeight: 30,
        padding: '0 24px',
        fontSize: 12.5,
      }}
    >
      {/* label */}
      <span
        style={{
          color: 'color-mix(in srgb, var(--imp-fg) 75%, transparent)',
          fontWeight: 500,
        }}
      >
        {isTh ? 'กำลังดูในชื่อ' : 'Acting as'}
      </span>

      {/* target — pure-white name + muted mono empId */}
      <span className="min-w-0 truncate" style={{ color: 'white', fontWeight: 600 }}>
        {username}
        <small
          style={{
            fontWeight: 400,
            color: 'color-mix(in srgb, var(--imp-fg) 65%, transparent)',
            fontSize: 11.5,
            fontFamily: 'var(--font-mono)',
            marginLeft: 6,
            letterSpacing: '.02em',
          }}
        >
          EMP-{userId}
        </small>
      </span>

      {/* scope — mono, uppercase, dimmed */}
      <span
        className="hidden sm:inline"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: 'color-mix(in srgb, var(--imp-fg) 55%, transparent)',
          marginLeft: 8,
        }}
      >
        SCOPE · {scope}
      </span>

      {/* exit — underlined text link pushed right (no pill) */}
      <button
        type="button"
        onClick={handleExit}
        style={{
          marginLeft: 'auto',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          background: 'transparent',
          color: 'var(--imp-fg)',
          border: 0,
          padding: 0,
          fontWeight: 500,
          fontSize: 12.5,
          cursor: 'pointer',
          textDecoration: 'underline',
          textDecorationColor: 'color-mix(in srgb, var(--imp-fg) 40%, transparent)',
          textUnderlineOffset: 3,
        }}
      >
        {isTh ? 'กลับสู่ผู้ดูแลระบบ' : 'Switch back to admin'}
      </button>
    </div>
  );
}
