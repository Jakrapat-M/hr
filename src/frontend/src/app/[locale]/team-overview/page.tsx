// /team-overview → /team/time-management (STA-255). The manager time surface
// moved; this shell is a locale-preserving permanent redirect so old links,
// bookmarks, and deep-links keep working.

import { redirect } from 'next/navigation';

export default async function TeamOverviewRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/team/time-management`);
}
