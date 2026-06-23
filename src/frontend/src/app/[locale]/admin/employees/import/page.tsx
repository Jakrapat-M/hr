'use client';

// admin/employees/import — legacy entry, now a redirect into the unified Bulk
// Import hub (STA-136). The employee bulk-import flow lives at
// /admin/import?subject=employee-change; this route is kept so old deep-links /
// bookmarks still resolve. Redirect is locale-prefixed (preserve active locale).

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';

export default function EmployeesImportRedirectPage() {
  const locale = useLocale();
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const loc = params?.locale ?? locale ?? 'th';

  useEffect(() => {
    router.replace(`/${loc}/admin/import?subject=employee-change`);
  }, [router, loc]);

  return null;
}
