// /reports/builder — subject-selectable report builder (open route, persona-scoped).
// Reachable by manager/hrbp/hr_admin per the 'reports' sidebar leaf. No AccessDenied
// here: like /reports + /roster, the data is scoped to the persona instead of denied.
// MOCKUP ONLY — aggregates derive client-side from existing mock seeds.

'use client';

import { SubjectReportBuilder } from '@/components/reports/SubjectReportBuilder';

export default function ReportBuilderPage() {
  return (
    <div className="pb-8">
      <SubjectReportBuilder />
    </div>
  );
}
