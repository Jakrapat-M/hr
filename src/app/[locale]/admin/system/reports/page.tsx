'use client'

// admin/system/reports/page.tsx — Reporting hub landing
// BRD #193, #196, #206, #207, #164 — Part E Wave 2a

import Link from 'next/link'
import { Star, ClipboardCheck } from 'lucide-react'
import { useDataManagement } from '@/lib/admin/store/useDataManagement'
import { formatCron } from '@/lib/admin/utils/cronFormat'
import { useSelectPendingApprovals } from '@/lib/approval-registry'

const REPORT_TOOLS = [
  { href: '/th/admin/system/reports/builder',    label: 'สร้างรายงาน',          labelEn: 'Report Builder' },
  { href: '/th/admin/system/reports/schedule',   label: 'กำหนดเวลารายงาน',      labelEn: 'Schedule Report' },
  { href: '/th/admin/system/reports/automation', label: 'งานอัตโนมัติ',          labelEn: 'Report Automation' },
  { href: '/th/admin/system/reports/favourites', label: 'รายงานโปรด',           labelEn: 'Favourite Reports' },
] as const

export default function ReportsHubPage() {
  const { reports, favouriteReports, scheduledJobs, toggleFavourite } = useDataManagement()
  // PR-2 (AC-2.2): live pending-approvals figure derived from the canonical
  // approval queue. Decrements in-session when a request is approved/rejected
  // in /quick-approve (StatePropagationVerified).
  const pendingApprovals = useSelectPendingApprovals().filter((q) => q.status === 'pending').length

  const recentReports = [...reports]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">รายงาน</h2>
        <p className="mt-1 text-sm text-ink-muted">สร้าง กำหนดเวลา และจัดการรายงาน</p>
      </div>

      {/* Live operational figures */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-hairline-soft bg-surface px-4 py-3">
          <div className="flex items-center gap-2 text-ink-muted">
            <ClipboardCheck size={16} />
            <p className="text-xs font-medium">คำขอรออนุมัติ</p>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{pendingApprovals}</p>
          <p className="text-xs text-ink-muted">Pending Approvals</p>
        </div>
      </div>

      {/* Quick links to sub-tools */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {REPORT_TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-lg border border-accent-soft bg-accent-soft px-4 py-3 text-center hover:bg-accent-soft transition-colors"
          >
            <p className="text-sm font-medium text-accent-ink">{tool.label}</p>
            <p className="text-xs text-accent">{tool.labelEn}</p>
          </Link>
        ))}
      </div>

      {/* Recent reports list */}
      <div>
        <h3 className="text-sm font-semibold text-ink-soft mb-3">รายงานล่าสุด</h3>
        <div className="rounded-lg border border-hairline-soft bg-surface overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-canvas-soft">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">ชื่อรายงาน</th>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">ประเภท</th>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">โมดูล</th>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">รันล่าสุด</th>
                <th className="px-4 py-2 text-center font-medium text-ink-muted">โปรด</th>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">กำหนดเวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentReports.map((rpt) => {
                const isFav = favouriteReports.includes(rpt.id)
                const job = scheduledJobs.find((j) => j.reportId === rpt.id && j.isActive)
                const lastRun = rpt.lastRun
                  ? new Date(rpt.lastRun).toLocaleDateString('th-TH')
                  : '-'
                return (
                  <tr key={rpt.id} className="hover:bg-canvas-soft">
                    <td className="px-4 py-2.5 text-ink whitespace-nowrap">{rpt.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-xs text-ink-muted whitespace-nowrap">
                        {rpt.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted whitespace-nowrap">{rpt.module}</td>
                    <td className="px-4 py-2.5 text-ink-muted whitespace-nowrap">{lastRun}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => toggleFavourite(rpt.id)}
                        aria-label={isFav ? 'ยกเลิกโปรด' : 'เพิ่มโปรด'}
                        className="text-lg leading-none hover:scale-110 transition-transform"
                      >
                        <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted text-xs whitespace-nowrap">
                      {job ? formatCron(job.cron) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
