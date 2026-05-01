import { redirect } from 'next/navigation';
import { benefitsHubRoute } from '@/lib/benefit-routes';

export default async function BenefitsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(benefitsHubRoute(locale));
}
