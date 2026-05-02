'use client'

// admin/system/layout.tsx — sub-nav สำหรับ 4 hubs: Reporting / Integration / System / Security
// Part E Wave 2a — BRD #193-207

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

const SUB_HUBS = [
  { href: '/th/admin/system/reports',     label: 'รายงาน',    labelEn: 'Reporting' },
  { href: '/th/admin/system/integration', label: 'การเชื่อมต่อ', labelEn: 'Integration' },
  { href: '/th/admin/system/system-features',    label: 'ฟีเจอร์ระบบ', labelEn: 'System' },
  { href: '/th/admin/system/security',    label: 'ความปลอดภัย', labelEn: 'Security' },
] as const

export default function SystemLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-full">
      {/* Sub-hub nav */}
      <nav
        aria-label="เมนูย่อยระบบ"
        className="border-b border-hairline-soft bg-surface px-6"
      >
        <ul className="flex gap-1" role="tablist">
          {SUB_HUBS.map((hub) => {
            const isActive = pathname === hub.href || pathname.startsWith(hub.href + '/')
            return (
              <li key={hub.href} role="presentation">
                <Link
                  href={hub.href}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-accent text-accent-ink'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-hairline',
                  ].join(' ')}
                >
                  {hub.label}
                  <span className="text-xs text-ink-faint hidden lg:inline">({hub.labelEn})</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Hub content */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
