'use client';

// PersonaSwitcher — demo-only role proxy. Lets Ken walk the persona/approval
// chain in a single browser session without logout.
// - Trigger pill (Topbar) opens a @/components/humi Modal (Req4), not a dropdown.
// - Rows show avatar + name + "{role} · {empId}" + tier chips (A/B/C/D).
// - Switching swaps the active persona (auth store) + routes to its landing.
// - Exit (when proxying) drops the proxy layer and returns to /home (MF-4 —
//   converges with the LoginAsRibbon "Switch back to admin" target).
// - Persists nothing beyond the auth store (originalUser is saved there).

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronDown, UserCog, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
  DEMO_USERS,
  PERSONA_ORDER,
  PERSONA_BADGE,
  landingForDemoUser,
} from '@/lib/demo-users';
import { personaTiers } from '@/lib/persona-tiers';
import { Modal } from '@/components/humi/Modal';
import { cn } from '@/lib/utils';

export function PersonaSwitcher() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const isTh = locale !== 'en';
  const currentEmail = useAuthStore((s) => s.email);
  const originalUser = useAuthStore((s) => s.originalUser);
  const switchPersona = useAuthStore((s) => s.switchPersona);
  const exitPersona = useAuthStore((s) => s.exitPersona);

  const [open, setOpen] = useState(false);

  const activeBadge = currentEmail ? PERSONA_BADGE[currentEmail] : null;
  const inProxy = originalUser !== null;

  function swapTo(email: string) {
    const user = DEMO_USERS[email];
    if (!user) return;
    switchPersona({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    });
    setOpen(false);
    router.push(landingForDemoUser(email, locale));
  }

  function handleExit() {
    if (!originalUser) return;
    exitPersona();
    setOpen(false);
    router.push(`/${locale}/home`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'humi-row inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-small font-medium whitespace-nowrap flex-shrink-0 max-w-[240px]',
          'transition-colors duration-[var(--dur-fast)]',
          'hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          inProxy
            ? 'border-accent bg-accent-soft/40 text-ink'
            : 'border-hairline bg-surface text-ink',
        )}
        aria-label={isTh ? 'สลับบทบาท' : 'Switch persona'}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <UserCog size={14} aria-hidden className="flex-shrink-0" />
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">
          {inProxy ? (isTh ? 'สวมบทบาท' : 'Acting') : isTh ? 'เลือก Persona' : 'Persona'}
          {activeBadge && (
            <>
              {' · '}
              <span className="font-semibold">{activeBadge.label}</span>
            </>
          )}
        </span>
        <ChevronDown size={14} aria-hidden className="flex-shrink-0" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={isTh ? 'สลับบทบาท' : 'Switch persona'}>
        <div className="humi-eyebrow mb-3">{isTh ? 'RBAC · 4 ระดับ' : 'RBAC · 4 tiers'}</div>

        <div className="flex flex-col gap-1">
          {PERSONA_ORDER.map((email) => {
            const user = DEMO_USERS[email];
            const badge = PERSONA_BADGE[email];
            const isActive = email === currentEmail;
            const tiers = personaTiers(user.roles);
            const initials = user.name.trim().slice(0, 2);
            return (
              <button
                key={email}
                type="button"
                onClick={() => !isActive && swapTo(email)}
                disabled={isActive}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left',
                  'transition-colors duration-[var(--dur-fast)]',
                  isActive ? 'bg-accent-soft/40 cursor-default' : 'hover:bg-canvas-soft',
                )}
              >
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-canvas-soft text-small font-semibold text-ink"
                  aria-hidden
                >
                  {initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium text-ink">{user.name}</span>
                  <span className="block truncate text-small text-ink-muted">
                    {badge.label} · {user.id}
                  </span>
                </span>
                <span className="flex flex-shrink-0 items-center gap-1" aria-hidden>
                  {tiers.map((t) => (
                    <span
                      key={t}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-canvas-soft text-xs font-semibold text-ink-muted"
                    >
                      {t}
                    </span>
                  ))}
                </span>
                {isActive && (
                  <span className="flex-shrink-0 text-small font-medium text-accent">
                    {isTh ? 'ใช้อยู่' : 'Active'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {inProxy && (
          <button
            type="button"
            onClick={handleExit}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-hairline px-2.5 py-2 text-small font-medium text-ink transition-colors hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <LogOut size={14} aria-hidden />
            {isTh ? `กลับไปที่ ${originalUser?.username ?? 'บัญชีเดิม'}` : `Back to ${originalUser?.username ?? 'original account'}`}
          </button>
        )}

        <p className="mt-4 border-t border-hairline pt-3 text-small text-ink-muted">
          {isTh
            ? 'บังคับใช้ RBAC — เห็นเฉพาะสิทธิ์ของแต่ละบทบาท'
            : 'RBAC enforced — you only see what each persona may access.'}
        </p>
      </Modal>
    </>
  );
}
