// VALIDATION_EXEMPT: admin landing/audit page — filter inputs only, no submit form (per design-gates Track C 2026-04-26)
'use client'

// security/traffic/page.tsx — Traffic Report (BRD #200)
// AC: date-range filter + login activity table + CSV export (reuse csvExport)

import { useState, useMemo } from 'react'
import { useDataManagement } from '@/lib/admin/store/useDataManagement'
import { exportToCSV, type CsvColumn } from '@/lib/admin/utils/csvExport'
import type { TrafficEntry } from '@/lib/admin/types/dataManagement'
import { Button, DataTable, type DataTableColumn } from '@/components/humi'

const TRAFFIC_CSV_COLUMNS: CsvColumn<TrafficEntry>[] = [
  { header: 'รหัสพนักงาน',     accessor: 'employeeId' },
  { header: 'ชื่อผู้ใช้',       accessor: 'employeeName' },
  { header: 'IP Address',      accessor: 'ipAddress' },
  { header: 'User Agent',      accessor: 'userAgent' },
  { header: 'เวลาเข้าสู่ระบบ', accessor: 'loginAt' },
  { header: 'เวลาออกจากระบบ', accessor: (r) => r.logoutAt ?? '-' },
  { header: 'สำเร็จ',          accessor: (r) => (r.isSuccess ? 'ใช่' : 'ไม่') },
  { header: 'สาเหตุที่ล้มเหลว', accessor: (r) => r.failureReason ?? '-' },
  { header: 'สถานที่',          accessor: (r) => r.location ?? '-' },
]

// 7 วันย้อนหลัง default
function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 7)
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

export default function TrafficPage() {
  const trafficLog = useDataManagement((s) => s.trafficLog)
  const [range, setRange] = useState(defaultDateRange)
  const [showFailed, setShowFailed] = useState(false)

  const filtered = useMemo(() => {
    return trafficLog.filter((entry) => {
      const loginDate = entry.loginAt.slice(0, 10)
      const inRange = loginDate >= range.from && loginDate <= range.to
      const passedFilter = showFailed ? !entry.isSuccess : true
      return inRange && passedFilter
    })
  }, [trafficLog, range, showFailed])

  function handleExport() {
    if (filtered.length === 0) {
      console.warn('[Traffic] handleExport: ไม่มีข้อมูลในช่วงวันที่เลือก — ไม่ export')
      return
    }
    exportToCSV(filtered, TRAFFIC_CSV_COLUMNS, `traffic-report-${range.from}-${range.to}`)
  }

  const failedCount = filtered.filter((e) => !e.isSuccess).length

  const columns: DataTableColumn<TrafficEntry>[] = useMemo(() => [
    {
      id: 'employeeId',
      header: 'รหัส',
      sortAccessor: (r) => r.employeeId,
      cell: (r) => <span className="font-mono text-sm text-ink-muted">{r.employeeId}</span>,
    },
    {
      id: 'employeeName',
      header: 'ชื่อ',
      sortAccessor: (r) => r.employeeName,
      cell: (r) => <span className="text-sm text-ink">{r.employeeName}</span>,
    },
    {
      id: 'ipAddress',
      header: 'IP',
      sortAccessor: (r) => r.ipAddress,
      cell: (r) => <span className="font-mono text-sm text-ink-muted">{r.ipAddress}</span>,
    },
    {
      id: 'loginAt',
      header: 'เวลาเข้า',
      sortAccessor: (r) => r.loginAt,
      cell: (r) => (
        <span className="text-sm text-ink-muted whitespace-nowrap">
          {new Date(r.loginAt).toLocaleString('th-TH')}
        </span>
      ),
    },
    {
      id: 'isSuccess',
      header: 'สถานะ',
      sortAccessor: (r) => (r.isSuccess ? '1' : '0'),
      cell: (r) =>
        r.isSuccess ? (
          <span className="inline-flex px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-semibold uppercase tracking-[0.08em] bg-success-soft text-success whitespace-nowrap">
            สำเร็จ
          </span>
        ) : (
          <span
            className="inline-flex px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-semibold uppercase tracking-[0.08em] bg-danger-soft text-danger-ink whitespace-nowrap"
            title={r.failureReason ?? undefined}
          >
            ล้มเหลว
          </span>
        ),
    },
    {
      id: 'location',
      header: 'สถานที่',
      sortAccessor: (r) => r.location ?? '',
      cell: (r) => (
        <span className="text-sm text-ink-muted">
          {r.location ?? <span className="text-ink-muted/50">—</span>}
        </span>
      ),
    },
  ], [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink font-display">Traffic Report</h1>
        <p className="mt-1 text-sm text-ink-muted">
          รายงาน login activity — ดูและ export ข้อมูลการเข้าใช้งานระบบ
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label htmlFor="date-from" className="text-sm text-ink-muted whitespace-nowrap">จากวันที่</label>
          <input
            id="date-from"
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="text-sm border border-hairline rounded-[var(--radius-md)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-surface text-ink"
            aria-label="วันที่เริ่มต้น"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="date-to" className="text-sm text-ink-muted whitespace-nowrap">ถึงวันที่</label>
          <input
            id="date-to"
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="text-sm border border-hairline rounded-[var(--radius-md)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-surface text-ink"
            aria-label="วันที่สิ้นสุด"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showFailed}
            onChange={(e) => setShowFailed(e.target.checked)}
            className="w-4 h-4 rounded border-hairline text-danger focus:ring-accent"
          />
          เฉพาะ login ล้มเหลว
        </label>
        <div className="ml-auto flex items-center gap-2">
          {failedCount > 0 && (
            <span className="text-xs text-danger-ink font-medium bg-danger-soft px-2 py-1 rounded-full">
              {failedCount} ล้มเหลว
            </span>
          )}
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={filtered.length === 0}
            aria-label="Export CSV"
          >
            Export CSV ({filtered.length})
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-hairline-soft rounded-xl shadow-[var(--shadow-sm)] overflow-hidden">
        <DataTable<TrafficEntry>
          caption="Login Activity"
          captionVisuallyHidden
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.id}
          showAllRows
        />
        <div className="px-4 py-2 border-t border-hairline-soft bg-canvas-soft text-xs text-ink-faint">
          แสดง {filtered.length} จาก {trafficLog.length} รายการ
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        Traffic Report; CSV export UTF-8 BOM + Thai headers (เปิดได้ใน Excel)
      </p>
    </div>
  )
}
