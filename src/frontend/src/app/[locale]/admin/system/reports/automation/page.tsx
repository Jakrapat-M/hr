'use client'

// admin/system/reports/automation/page.tsx — Report Automation
// active jobs list + pause/resume — BRD #207 — Part E Wave 2a

import { useDataManagement } from '@/lib/admin/store/useDataManagement'
import { formatCron, parseCronParts } from '@/lib/admin/utils/cronFormat'
import { useState } from 'react'

export default function ReportAutomationPage() {
  const { scheduledJobs, reports } = useDataManagement()

  // Local pause/resume state (mock — store doesn't expose toggle; keep UI minimal per C3)
  const [paused, setPaused] = useState<Set<string>>(new Set())

  function toggleJob(jobId: string) {
    setPaused((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  const allJobs = scheduledJobs.map((job) => ({
    ...job,
    isPaused: paused.has(job.id),
    reportName: reports.find((r) => r.id === job.reportId)?.name ?? job.reportId,
  }))

  const activeCount = allJobs.filter((j) => j.isActive && !j.isPaused).length
  const pausedCount = allJobs.filter((j) => j.isPaused).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">งานอัตโนมัติ</h2>
          <p className="text-sm text-ink-muted mt-1">Report Automation — BRD #207</p>
        </div>
        <div className="flex gap-3 text-center">
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <p className="text-lg font-bold text-green-700">{activeCount}</p>
            <p className="text-xs text-green-600">ทำงาน</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-lg font-bold text-amber-700">{pausedCount}</p>
            <p className="text-xs text-amber-600">หยุดชั่วคราว</p>
          </div>
        </div>
      </div>

      {allJobs.length === 0 ? (
        <div className="rounded-lg border border-hairline-soft bg-surface p-12 text-center">
          <p className="text-ink-faint">ยังไม่มีงานอัตโนมัติ — ไปที่ &quot;กำหนดเวลารายงาน&quot; เพื่อสร้าง</p>
        </div>
      ) : (
        <div className="rounded-lg border border-hairline-soft bg-surface overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-canvas-soft">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-ink-muted">รายงาน</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted">ความถี่</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted">ช่องทาง</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted">รันล่าสุด</th>
                <th className="px-4 py-3 text-center font-medium text-ink-muted">สถานะ</th>
                <th className="px-4 py-3 text-center font-medium text-ink-muted">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allJobs.map((job) => {
                // ตรวจ cron ก่อน format — invalid cron แสดง inline warning chip (ไม่ใช้ console)
                let cronValid = true
                try { parseCronParts(job.cron) } catch { cronValid = false }
                const freq = cronValid ? formatCron(job.cron) : job.cron
                const lastRun = job.lastRunAt
                  ? new Date(job.lastRunAt).toLocaleDateString('th-TH')
                  : '—'
                const isRunning = job.isActive && !job.isPaused

                return (
                  <tr key={job.id} className="hover:bg-canvas-soft">
                    <td className="px-4 py-3 text-ink whitespace-nowrap">{job.reportName}</td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">
                      {cronValid ? (
                        freq
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                          role="status"
                          title="Cron expression ไม่ถูกต้อง — แสดงค่าดิบ"
                        >
                          ⚠ cron ไม่ถูกต้อง: {freq}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{job.delivery}</td>
                    <td className="px-4 py-3 text-ink-faint whitespace-nowrap">{lastRun}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={[
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                          isRunning
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'h-1.5 w-1.5 rounded-full',
                            isRunning ? 'bg-green-500' : 'bg-amber-500',
                          ].join(' ')}
                          aria-hidden
                        />
                        {isRunning ? 'กำลังทำงาน' : 'หยุดชั่วคราว'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleJob(job.id)}
                        className={[
                          'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                          isRunning
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200',
                        ].join(' ')}
                      >
                        {isRunning ? 'หยุด' : 'เริ่ม'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
