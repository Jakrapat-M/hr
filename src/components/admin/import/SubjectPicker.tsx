'use client';

// SubjectPicker — Step 0 of the Bulk Import hub. Renders the IMPORT_SUBJECTS as
// Cnext Card radio-cards. Selecting an enabled card calls onSelect(key); a
// disabled subject renders a non-selectable "Coming soon" card.
//
// NO-RED: selection uses the teal accent ring (ring-accent-soft); disabled uses
// muted/neutral tokens. No danger styling here.

import { useTranslations } from 'next-intl';
import { Card, CardEyebrow } from '@/components/cnext';
import { cn } from '@/lib/utils';
import { IMPORT_SUBJECTS } from '@/components/admin/import/subject-registry';

export function SubjectPicker({
  isTh,
  onSelect,
}: {
  isTh: boolean;
  onSelect: (key: string) => void;
}) {
  const t = useTranslations('admin.bulkImport');

  return (
    <Card variant="raised" size="lg">
      <CardEyebrow>{t('eyebrow')}</CardEyebrow>
      <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
      <p className="mt-2 max-w-2xl text-small text-ink-muted">{t('subtitle')}</p>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-widest text-ink-muted">
        {t('step0Prompt')}
      </h2>
      <p className="mt-1 text-small text-ink-muted">{t('step0Hint')}</p>

      <div
        role="radiogroup"
        aria-label={t('step0Prompt')}
        className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {IMPORT_SUBJECTS.map((subject) => {
          const Icon = subject.icon;
          const label = isTh ? subject.labelTh : subject.labelEn;
          const desc = isTh ? subject.descTh : subject.descEn;
          const disabled = !!subject.disabled;

          return (
            <button
              key={subject.key}
              type="button"
              role="radio"
              aria-checked={false}
              aria-disabled={disabled}
              disabled={disabled}
              data-subject={subject.key}
              data-disabled={disabled ? 'true' : 'false'}
              onClick={() => !disabled && onSelect(subject.key)}
              className={cn(
                'group block w-full rounded-[var(--radius-lg)] text-left transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:shadow-[var(--shadow-card)]',
              )}
            >
              <Card
                variant="flat"
                size="md"
                className={cn(
                  'h-full',
                  !disabled && 'group-hover:ring-2 group-hover:ring-accent-soft',
                )}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
                  >
                    <Icon size={20} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-ink">{label}</p>
                      {disabled && (
                        <span className="inline-flex items-center rounded-full bg-canvas-soft px-2 py-0.5 text-xs font-medium text-ink-muted">
                          {t('comingSoon')}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-small text-ink-muted">{desc}</p>
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
