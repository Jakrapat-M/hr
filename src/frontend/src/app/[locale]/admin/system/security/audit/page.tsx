'use client';

import { useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { ShieldCheck, Filter, X } from 'lucide-react';
import { Card, CardEyebrow, DataTable, Capability } from '@/components/humi';
import type { DataTableColumn } from '@/components/humi';
import { MOCK_AUDIT_LOG, type AuditEntry, type AuditCategory } from '@/data/audit/mock';
import { cn } from '@/lib/utils';

const CATEGORY_LABEL: Record<AuditCategory, { th: string; en: string }> = {
  persona:  { th: 'Persona',   en: 'Persona' },
  workflow: { th: 'Workflow',  en: 'Workflow' },
  employee: { th: 'พนักงาน',   en: 'Employee' },
  system:   { th: 'ระบบ',      en: 'System' },
};

const CATEGORY_COLOR: Record<AuditCategory, string> = {
  persona:  'bg-accent-soft text-accent-ink border border-accent-soft',
  workflow: 'bg-green-50 text-green-700 border border-green-200',
  employee: 'bg-amber-50 text-amber-700 border border-amber-200',
  system:   'bg-canvas-soft text-ink-muted border border-hairline',
};

function formatTs(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === 'th' ? 'th-TH' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditLogPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const [activeCategory, setActiveCategory] = useState<AuditCategory | 'all'>('all');
  const [actorFilter, setActorFilter] = useState('');

  const categories: (AuditCategory | 'all')[] = ['all', 'persona', 'workflow', 'employee', 'system'];

  const filtered = useMemo(() => {
    let rows = MOCK_AUDIT_LOG;
    if (activeCategory !== 'all') {
      rows = rows.filter((r) => r.category === activeCategory);
    }
    if (actorFilter.trim()) {
      const q = actorFilter.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.actor.toLowerCase().includes(q) ||
          r.actorRole.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [activeCategory, actorFilter]);

  const columns: DataTableColumn<AuditEntry>[] = [
    {
      id: 'timestamp',
      header: isTh ? 'เวลา' : 'Time',
      className: 'w-36',
      cell: (row) => (
        <span className="font-mono text-xs text-ink-muted">{formatTs(row.timestamp, locale)}</span>
      ),
    },
    {
      id: 'actor',
      header: isTh ? 'ผู้ดำเนินการ' : 'Actor',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium text-ink">{row.actor}</p>
          <p className="text-xs text-ink-muted">{row.actorRole}</p>
        </div>
      ),
    },
    {
      id: 'action',
      header: isTh ? 'การกระทำ' : 'Action',
      className: 'w-28',
      cell: (row) => (
        <span className="text-sm text-ink">
          {isTh ? row.actionLabelTh : row.actionLabelEn}
        </span>
      ),
    },
    {
      id: 'target',
      header: isTh ? 'เป้าหมาย' : 'Target',
      cell: (row) => (
        <div>
          <p className="text-sm text-ink">
            {isTh ? row.targetEntityTh : row.targetEntity}
          </p>
          <p className="font-mono text-xs text-ink-faint">{row.targetId}</p>
        </div>
      ),
    },
    {
      id: 'category',
      header: isTh ? 'หมวดหมู่' : 'Category',
      className: 'w-28',
      cell: (row) => (
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', CATEGORY_COLOR[row.category])}>
          {isTh ? CATEGORY_LABEL[row.category].th : CATEGORY_LABEL[row.category].en}
        </span>
      ),
    },
    {
      id: 'ip',
      header: 'IP',
      className: 'w-28',
      cell: (row) => (
        <span className="font-mono text-xs text-ink-muted">{row.ip}</span>
      ),
    },
  ];

  return (
    <Capability action="view" fallback={
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-ink-muted">
          {isTh ? 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' : 'You do not have access to this page.'}
        </p>
      </div>
    }>
      <div className="space-y-6">
        <header>
          <CardEyebrow>
            {isTh ? 'ระบบ · ความปลอดภัย' : 'System · Security'}
          </CardEyebrow>
          <h1 className="font-display text-[28px] font-semibold text-ink">
            {isTh ? 'บันทึกการตรวจสอบ' : 'Audit Log'}
          </h1>
          <p className="mt-2 text-small text-ink-muted">
            {isTh
              ? `ประวัติการดำเนินการในระบบ — ${filtered.length} รายการ`
              : `System action history — ${filtered.length} entries`}
          </p>
        </header>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label={isTh ? 'กรองตามหมวดหมู่' : 'Filter by category'}
          >
            {categories.map((cat) => {
              const isActive = cat === activeCategory;
              const label =
                cat === 'all'
                  ? (isTh ? 'ทั้งหมด' : 'All')
                  : (isTh ? CATEGORY_LABEL[cat].th : CATEGORY_LABEL[cat].en);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={isActive}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    isActive
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-hairline bg-surface text-ink-soft hover:border-accent hover:text-ink',
                  )}
                >
                  <Filter size={10} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <input
              type="text"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              placeholder={isTh ? 'ค้นหาผู้ดำเนินการ...' : 'Search actor...'}
              className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {actorFilter && (
              <button
                type="button"
                onClick={() => setActorFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                aria-label={isTh ? 'ล้างการค้นหา' : 'Clear search'}
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </div>
        </div>

        <Card variant="raised" flush>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <ShieldCheck size={36} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
              <p className="mt-3 text-sm font-medium text-ink">
                {isTh ? 'ไม่พบรายการที่ตรงกัน' : 'No matching entries'}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {isTh ? 'ลองเปลี่ยนตัวกรอง' : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <DataTable
              caption={isTh ? 'บันทึกการตรวจสอบ' : 'Audit log'}
              captionVisuallyHidden
              rows={filtered}
              columns={columns}
              rowKey={(row) => row.id}
            />
          )}
        </Card>
      </div>
    </Capability>
  );
}
