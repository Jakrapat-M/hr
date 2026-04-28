import { redirect } from 'next/navigation';

// Legacy manager-dashboard deep links should land on the live Humi home page.
export default async function ManagerDashboardRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/home`);
}
