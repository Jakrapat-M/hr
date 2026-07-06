'use client'

// layout.tsx — Self-Service Config sub-navigation
// แสดง sub-nav bar ด้านบน + slot children ด้านล่าง
// BRD #178-183 — HRIS Admin actor
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminSelfService } from '@/lib/admin/store/useAdminSelfService'

// 6 editor links ตาม BRD #178-183
const SS_EDITORS = [
  { href: '/th/admin/self-service',              labelTh: 'ภาพรวม',             brd: ''     },
  { href: '/th/admin/self-service/field-config', labelTh: 'รายการฟิลด์',        brd: '#178' },
  { href: '/th/admin/self-service/visibility',   labelTh: 'การมองเห็นฟิลด์',    brd: '#179' },
  { href: '/th/admin/self-service/mandatory',    labelTh: 'ฟิลด์บังคับกรอก',    brd: '#180' },
  { href: '/th/admin/self-service/readonly',     labelTh: 'ฟิลด์อ่านอย่างเดียว', brd: '#181' },
  { href: '/th/admin/self-service/quick-actions',labelTh: 'ทางลัดเมนูด่วน',     brd: '#182' },
  { href: '/th/admin/self-service/tiles',        labelTh: 'ไทล์หน้าแรก',        brd: '#183' },
] as const

export default function SelfServiceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDirty  = useAdminSelfService((s) => s.isDirty)

  return (
    <div className="flex flex-col min-h-full">
      {/* Sub-nav bar */}
      <nav
        className="bg-surface border-b border-hairline overflow-x-auto"
        aria-label="Self-Service Config navigation"
      >
        <ul className="flex gap-1 px-4 whitespace-nowrap">
          {SS_EDITORS.map(({ href, labelTh }) => {
            // exact match สำหรับ overview, prefix match สำหรับ editors
            const isActive = href === '/th/admin/self-service'
              ? pathname === href
              : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-accent text-accent'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-hairline',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {labelTh}
                  {/* dirty indicator — แสดงเมื่อ draft ยังไม่ publish */}
                  {isActive && isDirty && !href.endsWith('/self-service') && (
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400"
                      aria-label="มีการแก้ไขที่ยังไม่ได้ Publish"
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Editor content */}
      <div className="flex-1 p-4 md:p-6">
        {children}
      </div>
    </div>
  )
}
