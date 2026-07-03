'use client';

// ClockResultModal — the 3 result popups for a clock punch.
//   success → within the geofence (accent/teal)
//   warning → punched but outside the geofence, supervisor notified (amber)
//   error   → blocked (GPS off / denied), offers Try Again (pumpkin — NO RED)
//
// Built on the Humi Modal (portal + Esc/backdrop close). All copy comes from the
// `clock` next-intl namespace so the popups stay TH/EN in parity.

import { useTranslations } from 'next-intl';
import { CheckCircle2, AlertTriangle, MapPinOff } from 'lucide-react';
import { Modal, Button } from '@/components/humi';
import type { PunchType } from '@/stores/clock-punches';

export type ClockResultVariant = 'success' | 'warning' | 'error';

export interface ClockResultModalProps {
  open: boolean;
  variant: ClockResultVariant;
  punchType: PunchType;
  /** Formatted punch time (already localised by the caller). */
  time: string;
  /** Simulated distance from the work location, in metres. */
  distanceM?: number | null;
  onClose: () => void;
  onRetry?: () => void;
}

export function ClockResultModal({
  open,
  variant,
  punchType,
  time,
  distanceM,
  onClose,
  onRetry,
}: ClockResultModalProps) {
  const t = useTranslations('clock');

  const successTitle = punchType === 'in' ? t('successInTitle') : t('successOutTitle');
  const title =
    variant === 'success'
      ? successTitle
      : variant === 'warning'
        ? t('warningTitle')
        : t('errorTitle');

  const hasDistance = typeof distanceM === 'number';
  const distanceText = hasDistance ? `${distanceM} ${t('distanceUnit')}` : null;

  return (
    <Modal open={open} onClose={onClose} title={title} widthClass="max-w-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Variant icon badge */}
        <div
          className={
            variant === 'success'
              ? 'flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent'
              : variant === 'warning'
                ? 'flex h-16 w-16 items-center justify-center rounded-full bg-warning-soft text-warning'
                : 'flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger'
          }
        >
          {variant === 'success' ? (
            <CheckCircle2 size={32} aria-hidden />
          ) : variant === 'warning' ? (
            <AlertTriangle size={32} aria-hidden />
          ) : (
            <MapPinOff size={32} aria-hidden />
          )}
        </div>

        {variant === 'error' ? (
          <p className="text-body text-ink-muted">{t('errorBody')}</p>
        ) : (
          <div className="w-full space-y-2">
            {/* Time row */}
            <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-canvas-soft px-4 py-2.5 text-sm">
              <span className="text-ink-muted">{t('timeLabel')}</span>
              <span className="font-semibold tabular-nums text-ink">{time}</span>
            </div>
            {/* Geofence status row */}
            <div
              className={
                variant === 'success'
                  ? 'flex items-center justify-between rounded-[var(--radius-md)] bg-accent-soft px-4 py-2.5 text-sm text-accent'
                  : 'flex items-center justify-between rounded-[var(--radius-md)] bg-warning-soft px-4 py-2.5 text-sm text-warning'
              }
            >
              <span className="font-medium">
                {variant === 'success' ? t('withinLabel') : t('outsideLabel')}
              </span>
              {distanceText && <span className="font-semibold tabular-nums">{distanceText}</span>}
            </div>
            {variant === 'warning' && (
              <p className="pt-1 text-sm text-ink-muted">{t('notified')}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex w-full flex-col gap-2 pt-2">
          {variant === 'error' && onRetry && (
            <Button variant="danger" block onClick={onRetry} data-testid="clock-retry">
              {t('tryAgain')}
            </Button>
          )}
          <Button
            variant={variant === 'error' ? 'secondary' : 'primary'}
            block
            onClick={onClose}
            data-testid="clock-result-close"
          >
            {t('close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
