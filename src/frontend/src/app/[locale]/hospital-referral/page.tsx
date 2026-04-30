import { redirect } from 'next/navigation';
import { benefitReferralRoute } from '@/lib/benefit-routes';

export default async function HospitalReferralCompatibilityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(benefitReferralRoute(locale ?? 'th'));
}
