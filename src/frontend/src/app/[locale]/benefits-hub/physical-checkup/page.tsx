import { redirect } from 'next/navigation';

// Old route preserved as redirect to unified claim page (option A unification).
export default async function PhysicalCheckupRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/benefits-hub/claim?planId=BE-PHY-001`);
}
