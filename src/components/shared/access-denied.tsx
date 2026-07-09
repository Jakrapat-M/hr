'use client';

import { useParams } from 'next/navigation';
import { ShieldOff } from 'lucide-react';

// Standalone denial surface — NOT coupled to canAccessModule / any module prop.
// Rendered IN PLACE by route guards on deny (no redirect, no toast).
// Bilingual TH/EN per CLAUDE.md parity rule; the locale picks which `reason` shows.
export function AccessDenied({
  reason,
  reasonTh,
}: {
  reason?: string;
  reasonTh?: string;
}) {
  const params = useParams<{ locale: string }>();
  const isTh = (params?.locale ?? 'th') === 'th';

  const body = isTh
    ? reasonTh ?? reason ?? 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'
    : reason ?? reasonTh ?? 'You do not have access to this page.';

  return (
    <div className="max-w-lg mx-auto mt-20 text-center">
      <ShieldOff className="h-16 w-16 text-ink-faint mx-auto mb-4" aria-hidden />
      <h1 className="text-xl font-semibold text-ink mb-2">
        ไม่มีสิทธิ์เข้าถึง · Access Denied
      </h1>
      <p className="text-ink-muted">{body}</p>
    </div>
  );
}
