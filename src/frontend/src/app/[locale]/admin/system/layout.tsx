'use client'

// admin/system/layout.tsx — sub-nav สำหรับ 4 hubs: Reporting / Integration / System / Security
// Part E Wave 2a — BRD #193-207

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

// Bare routes (no locale prefix) + per-locale label. The sub-nav renders ONLY
// the active locale's label — the previous "TH (EN)" doubled text added a third
// stack of bilingual chrome on top of the rail + leaf panel (IA simplification
// 2026-06-10). Hrefs are built with the active locale below so EN visitors stay
// on /en (the old hardcoded /th hrefs sent them back to Thai).
const SUB_HUBS = [
  { path: '/admin/system/reports',          labelTh: 'รายงาน',       labelEn: 'Reporting' },
  { path: '/admin/system/integration',      labelTh: 'การเชื่อมต่อ', labelEn: 'Integration' },
  { path: '/admin/system/system-features',  labelTh: 'ฟีเจอร์ระบบ',  labelEn: 'System' },
  { path: '/admin/system/security',         labelTh: 'ความปลอดภัย',  labelEn: 'Security' },
] as const

export default function SystemLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'th'
  const isTh = locale === 'th'

  return (
    <div className="flex flex-col min-h-full">
      {/* Sub-hub nav */}
      <nav
        aria-label="เมนูย่อยระบบ"
        className="border-b border-hairline-soft bg-surface px-6"
      >
        <ul className="flex gap-1" role="tablist">
          {SUB_HUBS.map((hub) => {
            const href = `/${locale}${hub.path}`
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={hub.path} role="presentation">
                <Link
                  href={href}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-accent text-accent-ink'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-hairline',
                  ].join(' ')}
                >
                  {isTh ? hub.labelTh : hub.labelEn}
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
