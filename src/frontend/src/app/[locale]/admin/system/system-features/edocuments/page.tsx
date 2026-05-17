'use client'

// system-features/edocuments/page.tsx — E-Document library (BRD #197)
// AC: list mock docs + filter by type + view/download mock action

import { useState } from 'react'
import { useDataManagement } from '@/lib/admin/store/useDataManagement'
import type { EDocument } from '@/lib/admin/types/dataManagement'
import { DOCUMENT_STORYBOARD_BOUNDARY_TH } from '@/lib/document-boundary'

const DOC_TYPE_OPTIONS = [
  'ทั้งหมด',
  'สัญญาจ้าง',
  'ใบสมัครงาน',
  'โอนย้าย',
  'ใบลาออก',
  'ใบรับรองเงินเดือน',
  'ใบรับรองการทำงาน',
  'อื่นๆ',
] as const

function StatusBadge({ isTemplate }: { isTemplate: boolean }) {
  return isTemplate ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
      Template
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      บุคคล
    </span>
  )
}

function handleMockAction(doc: EDocument, action: 'view' | 'download') {
  // mock action — log warning ถ้า fileUrl ไม่มี (C6)
  if (!doc.fileUrl) {
    console.warn(`[EDocuments] ${action}: fileUrl ไม่มีสำหรับ doc "${doc.id}" — mock only`)
    return
  }
  console.info(`[EDocuments] ${action}: ${doc.name} → ${doc.fileUrl}`)
  // ใน production จะ redirect/open fileUrl
}

export default function EDocumentsPage() {
  const eDocuments = useDataManagement((s) => s.eDocuments)
  const [filterType, setFilterType] = useState<string>('ทั้งหมด')
  const [search, setSearch] = useState('')

  const filtered = eDocuments.filter((doc) => {
    const matchType = filterType === 'ทั้งหมด' || doc.type === filterType
    const matchSearch =
      search === '' ||
      doc.name.includes(search) ||
      (doc.employeeId ?? '').includes(search)
    return matchType && matchSearch
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">E-Document</h1>
        <p className="mt-1 text-sm text-ink-muted">
          คลังเอกสารดิจิทัล — ดูและดาวน์โหลดเอกสาร HR ({eDocuments.length} รายการ)
        </p>
        <p className="mt-2 max-w-2xl text-small text-ink-muted" data-testid="document-boundary-notice">
          {DOCUMENT_STORYBOARD_BOUNDARY_TH}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-hairline rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="กรองประเภทเอกสาร"
        >
          {DOC_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="ค้นหาชื่อเอกสาร หรือ รหัสพนักงาน..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-hairline rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent min-w-64"
          aria-label="ค้นหาเอกสาร"
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-hairline-soft rounded-xl shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="รายการ E-Document">
            <thead className="bg-canvas-soft">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wide">ชื่อเอกสาร</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wide">ประเภท</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wide">รหัสพนักงาน</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wide">สถานะ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wide">วันที่สร้าง</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wide">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-faint">
                    ไม่พบเอกสารที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-canvas-soft transition-colors">
                    <td className="px-4 py-3 text-sm text-ink font-medium">{doc.name}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted whitespace-nowrap">{doc.type}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted font-mono">
                      {doc.employeeId ?? <span className="text-ink-faint">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isTemplate={doc.isTemplate} />
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted whitespace-nowrap">
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('th-TH') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleMockAction(doc, 'view')}
                          className="text-xs text-accent hover:text-accent-ink font-medium focus:outline-none focus:underline"
                          aria-label={`ดูเอกสาร ${doc.name}`}
                        >
                          ดู
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMockAction(doc, 'download')}
                          className="text-xs text-green-600 hover:text-green-800 font-medium focus:outline-none focus:underline"
                          aria-label={`ดาวน์โหลด ${doc.name}`}
                        >
                          ดาวน์โหลด
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-hairline-soft bg-canvas-soft text-xs text-ink-faint">
          แสดง {filtered.length} จาก {eDocuments.length} รายการ · การดู/ดาวน์โหลดเป็น mock action ไม่ใช่ storage หรือ audit production
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-faint">BRD #197 — การดูและดาวน์โหลดเป็น mock action ในระบบนี้</p>
    </div>
  )
}
