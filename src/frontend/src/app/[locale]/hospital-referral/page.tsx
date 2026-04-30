import { redirect } from 'next/navigation';

export default async function HospitalReferralCompatibilityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale ?? 'th'}/profile/me?tab=benefits&service=referral`);
}
