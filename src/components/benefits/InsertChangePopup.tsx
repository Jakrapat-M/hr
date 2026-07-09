'use client';

// Shared date-gate pop-up for the benefit Insert flow. Both the Benefit Plan
// catalog and the Eligibility Rule manager open this first when Insert is
// clicked: it asks for the effective date of the new change, then Proceed opens
// the existing detail/edit modal pre-filled and carrying that date. Cnext tokens
// only (NO-RED). Locale is derived internally via next-intl so neither caller
// has to thread an isTh flag.

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Modal, Button, FormField } from '@/components/cnext';

interface InsertChangePopupProps {
  open: boolean;
  /** Benefit/rule display name shown in the pop-up title. */
  benefitName: string;
  /** Optional initial date (defaults to today). */
  defaultDate?: string;
  /** Fires with the chosen effective date (YYYY-MM-DD) when Proceed is clicked. */
  onProceed: (effectiveDate: string) => void;
  onCancel: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function InsertChangePopup({
  open,
  benefitName,
  defaultDate,
  onProceed,
  onCancel,
}: InsertChangePopupProps) {
  const t = useTranslations('admin_benefits_entitlement_rules');
  const [date, setDate] = useState<string>(defaultDate ?? today());

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('insertPopupTitle', { name: benefitName })}
      widthClass="max-w-md"
    >
      <div className="space-y-5">
        <FormField label={t('insertPopupDateLabel')} required>
          {(controlProps) => (
            <input
              {...controlProps}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-body text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          )}
        </FormField>

        <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
          <Button variant="ghost" onClick={onCancel}>{t('cancel')}</Button>
          <Button variant="primary" disabled={!date} onClick={() => date && onProceed(date)}>
            {t('proceed')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
