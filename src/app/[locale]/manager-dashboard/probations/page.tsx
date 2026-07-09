import { redirect } from 'next/navigation';

// Retired: the divergent inline-modal probation surface has been replaced by the
// unified, agreed journey at /workflows/probation (ref Claude design · ProbationInbox).
// Kept as a redirect so any bookmarks / stale links land on the canonical surface.
export default async function ManagerProbationsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/workflows/probation`);
}
