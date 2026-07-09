'use client'

// EditorShell.tsx — shared header wrapper สำหรับทุก Self-Service editor
// ประกอบด้วย: title + dirty indicator + Draft/Publish/Reset buttons + tab switcher
// AC-7: 3 buttons ครบ — บันทึกร่าง / เผยแพร่ / รีเซ็ต
import { useState } from 'react'
import { useAdminSelfService } from '@/lib/admin/store/useAdminSelfService'
import type { EditorName } from '@/lib/admin/types/adminSelfService'
import { Button } from '@/components/humi'
import { AuditLogTab } from './AuditLogTab'

interface EditorShellProps {
  editor:   EditorName
  titleTh:  string
  children: React.ReactNode  // เนื้อหา Config tab
}

type TabKey = 'config' | 'audit'

export function EditorShell({ editor, titleTh, children }: EditorShellProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('config')

  const isDirty     = useAdminSelfService((s) => s.isDirty)
  const saveDraft   = useAdminSelfService((s) => s.saveDraft)
  const publish     = useAdminSelfService((s) => s.publish)
  const resetDraft  = useAdminSelfService((s) => s.resetDraft)

  // confirm dialog ก่อน reset (AC-7)
  function handleReset() {
    const ok = window.confirm('รีเซ็ต draft กลับเป็นค่าที่ Publish ล่าสุดใช่หรือไม่?')
    if (ok) resetDraft()
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[length:var(--text-display-h3)] font-semibold text-ink whitespace-nowrap">{titleTh}</h1>
            {isDirty && (
              <span className="inline-flex items-center gap-1 text-small text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                ยังไม่ได้ Publish
              </span>
            )}
          </div>
          <p className="text-small text-ink-muted mt-0.5">HRIS Admin</p>
        </div>

        {/* Action buttons (AC-7) */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={saveDraft} disabled={!isDirty}>
            บันทึกร่าง
          </Button>
          <Button variant="primary" onClick={() => publish(editor)} disabled={!isDirty}>
            เผยแพร่
          </Button>
          <Button variant="danger" onClick={handleReset} disabled={!isDirty}>
            รีเซ็ต
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-hairline mb-5">
        <nav className="flex gap-0" aria-label={`${titleTh} tabs`}>
          {([['config', 'ตั้งค่า'], ['audit', 'ประวัติการแก้ไข']] as [TabKey, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={[
                'px-4 py-2.5 text-body font-medium border-b-2 transition-colors',
                activeTab === key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink hover:border-hairline',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'config' ? (
        <div role="tabpanel" aria-label="ตั้งค่า">
          {children}
        </div>
      ) : (
        <div role="tabpanel" aria-label="ประวัติการแก้ไข">
          <AuditLogTab editor={editor} />
        </div>
      )}
    </div>
  )
}
