'use client'

// admin/system/reports/builder/page.tsx — Report Builder (admin entry).
// Now renders the shared, subject-selectable SubjectReportBuilder so admin and the
// open /reports/builder route share one implementation (no forked second builder).
// This route still sits behind the /admin hr_admin gate (admin/layout.tsx); the
// open /reports/builder is the HRBP/Manager-reachable surface.

import { SubjectReportBuilder } from '@/components/reports/SubjectReportBuilder'

export default function ReportBuilderPage() {
  return <SubjectReportBuilder />
}
