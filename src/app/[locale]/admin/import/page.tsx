'use client';

// admin/import — the single "Bulk Import" hub (MOCKUP).
//
// Step 0 = a registry-driven subject picker (SubjectPicker). Selecting an
// enabled subject mounts the shared, UNCHANGED ModuleImportWizard with that
// subject's config. A ?subject=<key> deep-link to an enabled subject skips
// Step 0; an unknown / missing / disabled key falls back to the picker.
//
// Inherits the hr_admin+ guard from admin/layout.tsx (this route sits under
// /admin/), so it needs no own guard.

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/cnext';
import { ModuleImportWizard } from '@/components/admin/import/ModuleImportWizard';
import { SubjectPicker } from '@/components/admin/import/SubjectPicker';
import { getImportSubject, type ImportSubject } from '@/components/admin/import/subject-registry';

export default function BulkImportHubPage() {
  const locale = useLocale();
  const params = useParams<{ locale: string }>();
  const isTh = (params?.locale ?? locale ?? 'th') !== 'en';
  const t = useTranslations('admin.bulkImport');
  const searchParams = useSearchParams();

  // A valid ENABLED ?subject= preselects + skips Step 0; anything else → picker.
  const deepLinked = getImportSubject(searchParams?.get('subject'));
  const initial = deepLinked && !deepLinked.disabled ? deepLinked.key : null;

  const [selectedKey, setSelectedKey] = useState<string | null>(initial);
  const selected = getImportSubject(selectedKey);
  const active: ImportSubject | undefined = selected && !selected.disabled ? selected : undefined;

  if (!active) {
    return (
      <div className="space-y-6">
        <SubjectPicker isTh={isTh} onSelect={setSelectedKey} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setSelectedKey(null)}>
        <ChevronLeft size={16} aria-hidden />
        {t('changeType')}
      </Button>
      <MountedWizard subject={active} isTh={isTh} />
    </div>
  );
}

// MountedWizard isolates the subject's useConfig() hook call so that switching
// subjects (and thus which store hook runs) remounts cleanly via the key.
function MountedWizard({ subject, isTh }: { subject: ImportSubject; isTh: boolean }) {
  const useConfig = subject.useConfig!;
  const config = useConfig();
  return <ModuleImportWizard key={subject.key} config={config} isTh={isTh} />;
}
