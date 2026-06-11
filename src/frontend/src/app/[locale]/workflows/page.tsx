import { redirect } from 'next/navigation';

// /workflows index is redundant — the canonical approval queue lives at /quick-approve.
// All /workflows/<type>/[id] detail routes remain unchanged.

export default async function WorkflowsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/quick-approve`);
}
