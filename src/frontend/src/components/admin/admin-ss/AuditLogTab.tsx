'use client'

// AuditLogTab.tsx — แสดง audit log ≤10 entries filtered by editor (AC-8)
// cols: timestamp / adminUser / target / before → after
import { useAdminSelfService } from '@/lib/admin/store/useAdminSelfService'
import type { EditorName } from '@/lib/admin/types/adminSelfService'

interface AuditLogTabProps {
  editor: EditorName
}

export function AuditLogTab({ editor }: AuditLogTabProps) {
  const audit = useAdminSelfService((s) => s.audit)

  // filter ตาม editor + cap ที่ 10 entries (AC-8)
  const filtered = audit
    .filter((e) => e.editor === editor)
    .slice(-10)
    .reverse()

  if (filtered.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-ink-muted">
        ยังไม่มีประวัติการแก้ไขสำหรับ editor นี้
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="min-w-full text-sm">
        <thead className="bg-canvas-soft border-b border-hairline">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-ink-muted whitespace-nowrap">เวลา</th>
            <th className="px-4 py-3 text-left font-medium text-ink-muted whitespace-nowrap">ผู้แก้ไข</th>
            <th className="px-4 py-3 text-left font-medium text-ink-muted whitespace-nowrap">Target</th>
            <th className="px-4 py-3 text-left font-medium text-ink-muted whitespace-nowrap">ก่อน → หลัง</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline bg-surface">
          {filtered.map((entry) => (
            <tr key={entry.id} className="hover:bg-canvas-soft">
              <td className="px-4 py-3 text-ink-muted tabular-nums whitespace-nowrap text-xs">
                {new Date(entry.timestamp).toLocaleString('th-TH', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </td>
              <td className="px-4 py-3 text-ink whitespace-nowrap">{entry.adminUser}</td>
              <td className="px-4 py-3">
                <code className="text-xs bg-canvas-soft rounded px-1.5 py-0.5 text-ink-muted">
                  {entry.targetEntity}
                </code>
              </td>
              <td className="px-4 py-3 text-ink-muted text-xs">
                <span className="text-red-500">{entry.before ?? '—'}</span>
                <span className="mx-1.5 text-ink-muted">→</span>
                <span className="text-green-600">{entry.after ?? '—'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
