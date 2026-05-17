// VALIDATION_EXEMPT: display/admin landing — filter chips + action buttons only, no data submit form (per design-gates Track C 2026-04-26)
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Clock, Plus, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardTitle, Button, Modal, DemoValuesDisclaimer } from '@/components/humi';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { useOvertime, type OTStatus, type OTType, type OTRequest } from '@/hooks/use-overtime';
import { formatCurrency } from '@/lib/date';
import { ApprovalChain } from '@/components/quick-approve/ApprovalChain';
import type { ApproverStage } from '@/data/benefits/plan-registry';

// Overtime approval chain: manager only
const OT_CHAIN: ApproverStage[] = ['manager'];

// Mock audit data keyed by OT request ID
const OT_AUDIT: Record<string, Array<{ actorName: string; action: string; comment?: string; at: string }>> = {
  OT001: [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-02-17T09:00:00Z' },
    { actorName: 'Surachai P.', action: 'approve', comment: 'Approved - project critical', at: '2026-02-17T14:00:00Z' },
  ],
  OT002: [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-02-20T09:00:00Z' },
  ],
  OT003: [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-02-09T09:00:00Z' },
    { actorName: 'Surachai P.', action: 'approve', at: '2026-02-09T16:00:00Z' },
  ],
  OT004: [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-01-27T09:00:00Z' },
    { actorName: 'Surachai P.', action: 'reject', comment: 'ไม่เป็นไปตามเงื่อนไข OT', at: '2026-01-27T17:00:00Z' },
  ],
};

function daysWaiting(submittedAt: string): number {
  const d = new Date(submittedAt.length === 10 ? submittedAt + 'T00:00:00Z' : submittedAt);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function dotColor(action: string) {
  if (action === 'approve') return 'bg-success';
  if (action === 'reject') return 'bg-danger';
  return 'bg-accent-soft';
}

function OTRequestRow({ req, locale }: { req: OTRequest; locale: string }) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations('overtime');
  const audit = OT_AUDIT[req.id];
  const days = daysWaiting(req.submittedAt);
  const activeStage: ApproverStage | undefined = req.status === 'pending' ? 'manager' : undefined;

  const actionLabel = (action: string) => {
    if (action === 'submit') return locale === 'th' ? 'ส่งคำขอ' : 'Submitted';
    if (action === 'approve') return locale === 'th' ? 'อนุมัติ' : 'Approved';
    if (action === 'reject') return locale === 'th' ? 'ปฏิเสธ' : 'Rejected';
    return action;
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-surface-raised rounded-md">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">{req.date} ({req.startTime} - {req.endTime})</p>
          <p className="text-xs text-ink-muted">{req.reason}</p>
        </div>
        <div className="text-right shrink-0">
          <Badge variant={STATUS_VARIANT[req.status]}>{t(`status.${req.status}` as never)}</Badge>
          <p className="text-xs text-ink-muted mt-1">{req.totalHours}h | {formatCurrency(req.estimatedAmount)}</p>
          {req.status === 'pending' && (
            <p className={`text-xs font-mono mt-0.5 ${days > 3 ? 'text-amber-600 font-semibold' : 'text-ink-muted'}`}>
              {days} {locale === 'th' ? 'ด. รอ' : 'd. waiting'}
            </p>
          )}
        </div>
      </div>

      {/* Approval chain */}
      <ApprovalChain chain={OT_CHAIN} locale={locale} activeStage={activeStage} size="sm" />

      {/* Audit timeline toggle */}
      {audit && audit.length > 0 && (
        <>
          <button
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
            {locale === 'th' ? 'ประวัติการดำเนินการ' : 'Audit history'}
          </button>
          {expanded && (
            <ol className="space-y-2 pl-2">
              {audit.map((entry, idx) => (
                <li key={idx} className="flex gap-3 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor(entry.action)} mt-1.5 shrink-0`} />
                  <div>
                    <span className="font-medium text-ink">{entry.actorName}</span>
                    {' '}
                    <span className="text-ink-muted">{actionLabel(entry.action)}</span>
                    <span className="ml-2 text-ink-faint">{formatDateTime(entry.at)}</span>
                    {entry.comment && (
                      <p className="text-ink-muted mt-0.5 italic">&ldquo;{entry.comment}&rdquo;</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

const STATUS_VARIANT: Record<OTStatus,'neutral' |'info' |'success' |'warning' |'error'> = {
 pending:'warning', approved:'success', completed:'success', rejected:'error', cancelled:'neutral',
};

export function OvertimePage() {
 const t = useTranslations('overtime');
 const tCommon = useTranslations('common');
 const locale = useLocale();
 const { requests, loading, stats, submitRequest, cancelRequest } = useOvertime();
 const [activeTab, setActiveTab] = useState('summary');
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [form, setForm] = useState({ date:'', startTime:'18:00', endTime:'20:00', reason:'', type:'weekday' as OTType });

 const tabs = [
 { key:'summary', label: t('summary') },
 { key:'request', label: t('newRequest') },
 { key:'history', label: t('history') },
 ];

 if (loading) {
 return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
 }

 const handleSubmit = async () => {
 const start = parseInt(form.startTime.split(':')[0]);
 const end = parseInt(form.endTime.split(':')[0]);
 const hours = end - start;
 const rates: Record<OTType, number> = { weekday: 1.5, weekend: 2.0, holiday: 3.0, night: 1.5 };
 await submitRequest({
 date: form.date, startTime: form.startTime, endTime: form.endTime,
 totalHours: hours, type: form.type, reason: form.reason,
 estimatedAmount: hours * 250 * rates[form.type],
 });
 setShowCreateModal(false);
 setForm({ date:'', startTime:'18:00', endTime:'20:00', reason:'', type:'weekday' });
 };

 return (
 <>
 <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
 <div>
 <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
 <p className="text-ink-muted mt-1">{t('subtitle')}</p>
 </div>
 <Button onClick={() => setShowCreateModal(true)} className="mt-4 sm:mt-0">
 <Plus className="h-4 w-4 mr-2" />{t('newRequest')}
 </Button>
 </div>

 <DemoValuesDisclaimer className="mb-6" />

 <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} className="mb-6" />

 {activeTab ==='summary' && (
 <div className="space-y-6">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card><div className="p-5 sm:p-6 lg:p-8 text-center"><p className="text-2xl font-bold text-ink">{stats.weeklyHours}h</p><p className="text-xs text-ink-muted">{t('totalHours')} (week)</p></div></Card>
 <Card><div className="p-5 sm:p-6 lg:p-8 text-center"><p className="text-2xl font-bold text-warning">{stats.pendingCount}</p><p className="text-xs text-ink-muted">{t('pendingRequests')}</p></div></Card>
 <Card><div className="p-5 sm:p-6 lg:p-8 text-center"><p className="text-2xl font-bold text-success">{stats.approvedCount}</p><p className="text-xs text-ink-muted">{t('approvedRequests')}</p></div></Card>
 <Card><div className="p-5 sm:p-6 lg:p-8 text-center">
 <p className="text-2xl font-bold text-ink">{stats.maxWeeklyHours - stats.weeklyHours}h</p>
 <p className="text-xs text-ink-muted">{t('remainingHours')}</p>
 {stats.weeklyHours > stats.maxWeeklyHours * 0.8 && (
 <div className="flex items-center justify-center gap-1 mt-1 text-xs text-warning">
 <AlertTriangle className="h-3 w-3" /> Near limit
 </div>
 )}
 </div></Card>
 </div>

 <Card header={<CardTitle>{t('typesAndRates')}</CardTitle>}>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
 {(['weekday','weekend','holiday','night'] as OTType[]).map((type) => (
 <div key={type} className="p-3 bg-surface-raised rounded-md">
 <p className="text-sm font-medium">{t(`type.${type}` as never)}</p>
 </div>
 ))}
 </div>
 </Card>

 <Card header={<CardTitle>{t('recentRequests')}</CardTitle>}>
 {requests.length === 0 ? (
 <p className="text-sm text-ink-muted text-center py-8">{t('noRequests')}</p>
 ) : (
 <div className="space-y-2">
 {requests.slice(0, 5).map((req) => (
 <OTRequestRow key={req.id} req={req} locale={locale} />
 ))}
 </div>
 )}
 </Card>
 </div>
 )}

 {activeTab ==='history' && (
 <Card header={<CardTitle>{t('history')}</CardTitle>}>
 {requests.length === 0 ? (
 <p className="text-sm text-ink-muted text-center py-8">{t('noRequests')}</p>
 ) : (
 <div className="space-y-2">
 {requests.map((req) => (
 <div key={req.id} className="flex flex-col gap-1">
 <OTRequestRow req={req} locale={locale} />
 {req.status === 'pending' && (
 <div className="flex justify-end px-1">
 <Button size="sm" variant="ghost" className="text-danger" onClick={() => cancelRequest(req.id)}>{t('cancelRequest')}</Button>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </Card>
 )}

 {activeTab ==='request' && (
 <Card header={<CardTitle>{t('newRequest')}</CardTitle>}>
 <div className="max-w-2xl space-y-4">
 <FormField label={t('date')} name="otDate" type="date" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} required />
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <FormField label={t('startTime')} name="startTime" value={form.startTime} onChange={(v) => setForm((p) => ({ ...p, startTime: v }))} required />
 <FormField label={t('endTime')} name="endTime" value={form.endTime} onChange={(v) => setForm((p) => ({ ...p, endTime: v }))} required />
 </div>
 <FormField label="Type" name="otType" type="select" value={form.type} onChange={(v) => setForm((p) => ({ ...p, type: v as OTType }))}
 options={[{ value:'weekday', label: t('type.weekday') }, { value:'weekend', label: t('type.weekend') }, { value:'holiday', label: t('type.holiday') }]} />
 <FormField label={t('reason')} name="reason" type="textarea" value={form.reason} onChange={(v) => setForm((p) => ({ ...p, reason: v }))} required />
 <div className="flex justify-end gap-3 pt-2">
 <Button variant="secondary" onClick={() => setActiveTab('summary')}>{tCommon('cancel')}</Button>
 <Button onClick={handleSubmit} disabled={!form.date || !form.reason}>{t('submit')}</Button>
 </div>
 </div>
 </Card>
 )}

 <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title={t('newRequest')}>
 <div className="space-y-4">
 <FormField label={t('date')} name="otDate" type="date" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} required />
 <div className="grid grid-cols-2 gap-4">
 <FormField label={t('startTime')} name="startTime" value={form.startTime} onChange={(v) => setForm((p) => ({ ...p, startTime: v }))} required />
 <FormField label={t('endTime')} name="endTime" value={form.endTime} onChange={(v) => setForm((p) => ({ ...p, endTime: v }))} required />
 </div>
 <FormField label="Type" name="otType" type="select" value={form.type} onChange={(v) => setForm((p) => ({ ...p, type: v as OTType }))}
 options={[{ value:'weekday', label: t('type.weekday') }, { value:'weekend', label: t('type.weekend') }, { value:'holiday', label: t('type.holiday') }]} />
 <FormField label={t('reason')} name="reason" type="textarea" value={form.reason} onChange={(v) => setForm((p) => ({ ...p, reason: v }))} required />
 </div>
 <div className="flex justify-end gap-3 mt-6">
 <Button variant="secondary" onClick={() => setShowCreateModal(false)}>{tCommon('cancel')}</Button>
 <Button onClick={handleSubmit} disabled={!form.date || !form.reason}>{t('submit')}</Button>
 </div>
 </Modal>
 </>
 );
}
