'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, X } from 'lucide-react';
import type { UrgentAlert } from '@/lib/manager-dashboard-api';
import { Button } from '@/components/cnext';

interface UrgentAlertBannerProps {
  alerts: UrgentAlert[];
}

export function UrgentAlertBanner({ alerts }: UrgentAlertBannerProps) {
  const t = useTranslations('managerDashboard.alerts');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className="flex items-start gap-3 bg-danger-tint rounded-md px-4 py-3"
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-danger">{alert.title}</p>
            <p className="text-xs text-danger/70 mt-0.5">{alert.message}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dismiss(alert.id)}
            aria-label={t('dismiss') ?? 'Dismiss'}
            className="!p-2 hover:bg-danger/10 text-danger/60"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
