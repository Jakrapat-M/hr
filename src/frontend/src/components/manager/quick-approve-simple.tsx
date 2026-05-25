'use client';

// ════════════════════════════════════════════════════════════
// QuickApproveSimple — simplified approvals queue (PR-5 Req7)
// Unified inbox at /quick-approve. DataTable + segmented filter.
// Local state only — mockup, no persistence.
// Danger = --color-danger (pumpkin). No Tailwind red/rose/pink. No hex.
// ════════════════════════════════════════════════════════════

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/humi';
import { Button } from '@/components/humi';
import { DataTable, type DataTableColumn } from '@/components/humi';
import { MOCK_PENDING_REQUESTS } from '@/components/quick-approve/mock-requests';
import type { PendingRequest } from '@/lib/quick-approve-api';

// ── Types ────────────────────────────────────────────────────

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

interface RowStatus {
  id: string;
  overrideStatus: 'approved' | 'rejected' | null;
}

// ── Helpers ──────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} · ${time}`;
}

function typeLabel(type: PendingRequest['type']): string {
  const map: Record<PendingRequest['type'], string> = {
    leave: 'ลา',
    overtime: 'ล่วงเวลา',
    claim: 'เบิกค่าใช้จ่าย',
    transfer: 'โอนย้าย',
    change_request: 'แก้ไขข้อมูล',
    probation: 'ทดลองงาน',
  };
  return map[type] ?? type;
}

// Seed a REQ-#### display ref from the WF id.
function displayRef(id: string): string {
  const num = id.replace(/[^0-9]/g, '').padStart(4, '0');
  return `REQ-${num}`;
}

// ── Component ────────────────────────────────────────────────

export function QuickApproveSimple() {
  const t = useTranslations('quickApprove.simple');

  // Local override map: id → 'approved' | 'rejected' | null (still pending).
  const [overrides, setOverrides] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Derive effective status for each request.
  function effectiveStatus(req: PendingRequest): 'pending' | 'approved' | 'rejected' {
    return overrides[req.id] ?? 'pending';
  }

  // Tab counts.
  const pendingCount  = MOCK_PENDING_REQUESTS.filter((r) => !overrides[r.id]).length;
  const approvedCount = Object.values(overrides).filter((v) => v === 'approved').length;
  const rejectedCount = Object.values(overrides).filter((v) => v === 'rejected').length;

  // Filtered rows.
  const visibleRows = MOCK_PENDING_REQUESTS.filter((r) => {
    const status = effectiveStatus(r);
    if (activeTab === 'all')      return true;
    if (activeTab === 'pending')  return status === 'pending';
    if (activeTab === 'approved') return status === 'approved';
    if (activeTab === 'rejected') return status === 'rejected';
    return true;
  });

  function handleApprove(id: string) {
    setOverrides((prev) => ({ ...prev, [id]: 'approved' }));
  }

  function handleReject(id: string) {
    setOverrides((prev) => ({ ...prev, [id]: 'rejected' }));
  }

  // ── Columns ──────────────────────────────────────────────

  const columns: DataTableColumn<PendingRequest>[] = [
    {
      id: 'ref',
      header: t('columns.ref'),
      cell: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ink-muted)' }}>
          {displayRef(row.id)}
        </span>
      ),
      className: 'w-28',
    },
    {
      id: 'employee',
      header: t('columns.employee'),
      cell: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="humi-avatar humi-avatar--teal"
            style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}
            aria-hidden
          >
            {row.requester.name.slice(0, 2)}
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
              {row.requester.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>
              {row.requester.department}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      header: t('columns.type'),
      cell: (row) => (
        <span className="humi-tag" style={{ fontSize: 12 }}>
          {typeLabel(row.type)}
        </span>
      ),
      className: 'w-32',
    },
    {
      id: 'filed',
      header: t('columns.filed'),
      cell: (row) => (
        <span style={{ fontSize: 12, color: 'var(--color-ink-muted)', whiteSpace: 'nowrap' }}>
          {formatDateTime(row.submittedAt)}
        </span>
      ),
      className: 'w-36',
      sortAccessor: (row) => row.submittedAt,
    },
    {
      id: 'detail',
      header: t('columns.detail'),
      cell: (row) => (
        <span style={{ fontSize: 13, color: 'var(--color-ink-soft)', maxWidth: 260, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.description}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('columns.status'),
      cell: (row) => {
        const status = effectiveStatus(row);
        const badgeClass =
          status === 'approved' ? 'humi-tag humi-tag--accent' :
          status === 'rejected' ? 'humi-tag' :
          'humi-tag humi-tag--butter';
        return <span className={badgeClass} style={{ fontSize: 12 }}>{t(`status.${status}`)}</span>;
      },
      className: 'w-28',
    },
    {
      id: 'actions',
      header: '',
      headerVisuallyHidden: true,
      cell: (row) => {
        const status = effectiveStatus(row);
        if (status !== 'pending') {
          return (
            <Link
              href={`/th/quick-approve/${row.id}`}
              className="humi-button humi-button--ghost"
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              {t('actions.view')}
            </Link>
          );
        }
        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleApprove(row.id)}
            >
              {t('actions.approve')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-danger text-danger"
              style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: 'none' }}
              onClick={() => handleReject(row.id)}
            >
              {t('actions.reject')}
            </Button>
            <Link
              href={`/th/quick-approve/${row.id}`}
              className="humi-button humi-button--ghost"
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              {t('actions.view')}
            </Link>
          </div>
        );
      },
      className: 'w-56',
    },
  ];

  // ── Render ───────────────────────────────────────────────

  const tabs: { key: FilterTab; count: number }[] = [
    { key: 'all',      count: MOCK_PENDING_REQUESTS.length },
    { key: 'pending',  count: pendingCount },
    { key: 'approved', count: approvedCount },
    { key: 'rejected', count: rejectedCount },
  ];

  return (
    <div className="pb-8">
      {/* Breadcrumb */}
      <div className="humi-eyebrow" style={{ marginBottom: 6 }}>
        {t('breadcrumb')}
      </div>

      {/* Title + subtitle */}
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink" style={{ marginBottom: 4 }}>
        {t('title')}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', marginBottom: 20 }}>
        {t('subtitlePending', { n: pendingCount })}
      </p>

      {/* Segmented filter tabs */}
      <div
        role="tablist"
        aria-label={t('title')}
        style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}
      >
        {tabs.map(({ key, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-hairline)',
              background: activeTab === key ? 'var(--color-accent-soft)' : 'var(--color-canvas-soft)',
              color: activeTab === key ? 'var(--color-accent)' : 'var(--color-ink-soft)',
              fontWeight: activeTab === key ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background var(--dur-base)',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            {t(`filter.${key}`)}
            <span
              style={{
                background: 'var(--color-hairline)',
                borderRadius: 99,
                fontSize: 11,
                padding: '0 6px',
                lineHeight: '18px',
              }}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <DataTable<PendingRequest>
          caption={t('title')}
          captionVisuallyHidden
          columns={columns}
          rows={visibleRows}
          rowKey={(row) => row.id}
          dense
        />
      </Card>
    </div>
  );
}
