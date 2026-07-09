'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { scrollToSection } from '@/lib/scroll-to-section'

export interface JumpItem {
  id: string
  label: string
  /** Runs before scrolling — e.g. expand a collapsed section. */
  onActivate?: () => void
  /** Emphasized chip (teal fill) — used for the terminal "Actions" chip. */
  emphasis?: boolean
}

interface SectionJumpNavProps {
  items: JumpItem[]
  ariaLabel: string
  className?: string
}

export function SectionJumpNav({ items, ariaLabel, className }: SectionJumpNavProps) {
  // Deferred scroll target. We NEVER scroll in the same tick a section is
  // un-hidden — the `hidden` removal must commit first so geometry is real.
  // A monotonically-increasing nonce (not the id) drives the effect so that
  // re-clicking the SAME chip still re-triggers a scroll, and no setState is
  // needed inside the effect body.
  const pendingScrollId = useRef<string | null>(null)
  const [scrollNonce, setScrollNonce] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Post-commit scroll: runs after React has flushed onActivate's state change
  // (the section is now un-hidden), so scrollToSection reads the real position.
  useEffect(() => {
    if (scrollNonce === 0) return // skip initial mount
    const id = pendingScrollId.current
    if (id != null) scrollToSection(id)
  }, [scrollNonce])

  // Best-effort active-section highlight — ship-or-degrade. Guarded for jsdom.
  // Stable dependency: the parent passes an inline array literal, so `items`
  // has a fresh identity every render. Key the observer effect on the joined
  // ids so it only re-subscribes when the sections actually change (avoids
  // tear-down/re-observe churn that flickers the aria-current highlight).
  const itemIds = items.map((i) => i.id).join(',')
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        // Topmost intersecting section wins.
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        setActiveId(visible[0].target.id)
      },
      // Bias the observation band below the sticky topbar + chip strip.
      { rootMargin: '-140px 0px -55% 0px', threshold: 0 },
    )

    for (const id of itemIds.split(',')) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [itemIds])

  const handleClick = (item: JumpItem) => {
    item.onActivate?.()
    pendingScrollId.current = item.id
    setScrollNonce((n) => n + 1)
  }

  return (
    <nav aria-label={ariaLabel} className={className}>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full border border-hairline px-3 py-1.5 text-small font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                item.emphasis
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : isActive
                    ? 'bg-accent-soft text-accent'
                    : 'bg-surface text-ink-soft hover:bg-canvas-soft',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
