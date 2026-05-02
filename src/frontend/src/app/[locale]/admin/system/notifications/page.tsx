'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Bell, Mail, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardEyebrow, DataTable, Capability } from '@/components/humi';
import type { DataTableColumn } from '@/components/humi';
import { MOCK_NOTIFICATION_TEMPLATES, type NotificationTemplate, type NotificationChannel } from '@/data/notifications/mock';

const CHANNEL_ICON: Record<NotificationChannel, React.ReactNode> = {
  in_app: <Bell size={14} aria-hidden />,
  email:  <Mail size={14} aria-hidden />,
  sms:    <MessageSquare size={14} aria-hidden />,
};

const CHANNEL_LABEL: Record<NotificationChannel, { th: string; en: string }> = {
  in_app: { th: 'In-App', en: 'In-App' },
  email:  { th: 'อีเมล', en: 'Email' },
  sms:    { th: 'SMS', en: 'SMS' },
};

export default function NotificationTemplatesPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const [templates, setTemplates] = useState<NotificationTemplate[]>(MOCK_NOTIFICATION_TEMPLATES);

  function toggleStatus(id: string) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' }
          : t,
      ),
    );
  }

  const columns: DataTableColumn<NotificationTemplate>[] = [
    {
      id: 'id',
      header: isTh ? 'รหัส' : 'ID',
      className: 'w-24',
      cell: (row) => (
        <span className="font-mono text-xs text-ink-muted">{row.id}</span>
      ),
    },
    {
      id: 'trigger',
      header: isTh ? 'เหตุการณ์' : 'Trigger',
      cell: (row) => (
        <span className="text-sm text-ink">
          {isTh ? row.triggerLabelTh : row.triggerLabelEn}
        </span>
      ),
    },
    {
      id: 'channel',
      header: isTh ? 'ช่องทาง' : 'Channel',
      className: 'w-28',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas-soft px-2.5 py-0.5 text-xs font-medium text-ink-soft">
          {CHANNEL_ICON[row.channel]}
          {isTh ? CHANNEL_LABEL[row.channel].th : CHANNEL_LABEL[row.channel].en}
        </span>
      ),
    },
    {
      id: 'status',
      header: isTh ? 'สถานะ' : 'Status',
      className: 'w-28',
      cell: (row) =>
        row.status === 'active' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <CheckCircle size={11} aria-hidden />
            {isTh ? 'เปิดใช้งาน' : 'Active'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-canvas-soft px-2.5 py-0.5 text-xs font-medium text-ink-muted">
            <XCircle size={11} aria-hidden />
            {isTh ? 'ปิดใช้งาน' : 'Inactive'}
          </span>
        ),
    },
    {
      id: 'actions',
      header: isTh ? 'การดำเนินการ' : 'Actions',
      className: 'w-28',
      cell: (row) => (
        <Capability action="editFoundation">
          <button
            type="button"
            onClick={() => toggleStatus(row.id)}
            className="text-xs font-medium text-accent hover:underline focus-visible:outline-none"
          >
            {row.status === 'active'
              ? (isTh ? 'ปิดใช้งาน' : 'Disable')
              : (isTh ? 'เปิดใช้งาน' : 'Enable')}
          </button>
        </Capability>
      ),
    },
  ];

  const activeCount = templates.filter((t) => t.status === 'active').length;

  return (
    <Capability action="editFoundation" fallback={
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-ink-muted">
          {isTh ? 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' : 'You do not have access to this page.'}
        </p>
      </div>
    }>
      <div className="space-y-6">
        <header>
          <CardEyebrow>
            {isTh ? 'ระบบ · การแจ้งเตือน' : 'System · Notifications'}
          </CardEyebrow>
          <h1 className="font-display text-[28px] font-semibold text-ink">
            {isTh ? 'เทมเพลตการแจ้งเตือน' : 'Notification Templates'}
          </h1>
          <p className="mt-2 text-small text-ink-muted">
            {isTh
              ? `จัดการเทมเพลตการแจ้งเตือนสำหรับ in-app, อีเมล และ SMS — ใช้งานอยู่ ${activeCount} / ${templates.length}`
              : `Manage notification templates for in-app, email, and SMS — ${activeCount} of ${templates.length} active`}
          </p>
        </header>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {(['in_app', 'email', 'sms'] as NotificationChannel[]).map((ch) => {
            const count = templates.filter((t) => t.channel === ch && t.status === 'active').length;
            return (
              <span
                key={ch}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-ink-soft"
              >
                {CHANNEL_ICON[ch]}
                {isTh ? CHANNEL_LABEL[ch].th : CHANNEL_LABEL[ch].en}
                <span className="rounded-full bg-canvas-soft px-1.5 py-0.5 text-xs text-ink-muted">{count}</span>
              </span>
            );
          })}
        </div>

        <Card variant="raised" flush>
          <DataTable
            caption={isTh ? 'เทมเพลตการแจ้งเตือน' : 'Notification templates'}
            captionVisuallyHidden
            rows={templates}
            columns={columns}
            rowKey={(row) => row.id}
          />
        </Card>
      </div>
    </Capability>
  );
}
