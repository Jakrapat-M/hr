import { redirect } from 'next/navigation';

// Old route preserved as redirect to unified claim page (option A unification).
export default async function HospitalClaimRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/benefits-hub/claim?planId=BE-MED-002`);
}
