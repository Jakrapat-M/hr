// BE-MED-001 chosen as the most general simple-claim plan (general medical OPD reimbursement).
import { redirect } from 'next/navigation';

// Old route preserved as redirect to unified claim page (option A unification).
export default async function ReimbursementRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/benefits-hub/claim?planId=BE-MED-001`);
}
