/**
 * assertDemoModeSafe — boot-time defense-in-depth guard.
 *
 * Throws at startup if NEXT_PUBLIC_DEMO_MODE is accidentally set in a
 * production build. Demo mode must never reach production — it bypasses
 * auth-store persona gates and exposes role-switching UI.
 *
 * Call this once at the root layout level (app/[locale]/layout.tsx).
 */
export function assertDemoModeSafe(): void {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  ) {
    throw new Error(
      'NEXT_PUBLIC_DEMO_MODE=true is forbidden in production builds. ' +
        'Remove it from your .env.production* files.',
    );
  }
}
