'use client';

// /workflows index is redundant — the canonical approval queue lives at /quick-approve.
// All /workflows/<type>/[id] detail routes remain unchanged.
//
// NOTE: server-side redirect() at a route-segment index triggers a Next.js 16
// Router hook-count bug (React error #310). Using a client-side useEffect redirect
// avoids the RSC redirect payload that causes the Router component to re-render
// with a mismatched useMemo call count.

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function WorkflowsIndexPage() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  useEffect(() => {
    router.replace(`/${locale}/quick-approve`);
  }, [router, locale]);
  return null;
}
