'use client';

// TimeTileGrid — STA-255. The /time-hub grouped-tile shortcut idiom as a shared
// component: uppercase eyebrow group headings + a responsive grid of icon cards
// (48px accent-soft icon circle, title + one-line description). Items without a
// route render as a disabled "เร็วๆ นี้ / Coming soon" tile — never a dead link.

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardTitle } from '@/components/humi';

export interface TimeTile {
  key: string;
  icon: LucideIcon;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  /** Locale-relative route (no leading /${locale}); null → coming-soon tile. */
  href: string | null;
}

export interface TimeTileGroupDef {
  key: string;
  labelTh: string;
  labelEn: string;
  tiles: TimeTile[];
}

export function TimeTileGrid({
  groups,
  locale,
  isTh,
}: {
  groups: TimeTileGroupDef[];
  locale: string;
  isTh: boolean;
}) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section
          key={group.key}
          aria-labelledby={`tile-${group.key}-heading`}
          data-testid={`shortcut-group-${group.key}`}
          className="space-y-3"
        >
          <h2
            id={`tile-${group.key}-heading`}
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
          >
            {isTh ? group.labelTh : group.labelEn}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {group.tiles.map((tile) => {
              const inner = (
                <div className="flex items-start gap-4 p-5">
                  <span
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{
                      width: 48,
                      height: 48,
                      background: 'var(--color-accent-soft)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    <tile.icon size={22} aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold transition-colors group-hover:text-accent">
                      {isTh ? tile.titleTh : tile.titleEn}
                    </CardTitle>
                    <p className="mt-1 text-sm text-ink-muted">{isTh ? tile.descTh : tile.descEn}</p>
                  </div>
                </div>
              );
              if (!tile.href) {
                return (
                  <div key={tile.key} data-testid={`shortcut-item-${tile.key}`} aria-disabled="true">
                    <Card className="relative h-full opacity-80">
                      <span className="absolute right-3 top-3 rounded-full bg-canvas-soft px-2 py-0.5 text-xs font-medium text-ink-faint">
                        {isTh ? 'เร็วๆ นี้' : 'Coming soon'}
                      </span>
                      {inner}
                    </Card>
                  </div>
                );
              }
              return (
                <Link
                  key={tile.key}
                  href={`/${locale}/${tile.href.replace(/^\//, '')}`}
                  data-testid={`shortcut-item-${tile.key}`}
                  className="group block no-underline"
                >
                  <Card className="h-full transition-shadow hover:shadow-[var(--shadow-card)]">
                    {inner}
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
