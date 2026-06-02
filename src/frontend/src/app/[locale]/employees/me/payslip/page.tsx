import { redirect } from 'next/navigation';

// Legacy payslip deep link — now resolves to the standalone /payslip page.
export default async function EmployeePayslipRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/payslip`);
}
