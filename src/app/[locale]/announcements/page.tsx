'use client';

// ════════════════════════════════════════════════════════════
// /announcements — Cnext team/company feed
// 1:1 port of docs/design-ref/shelfly-bundle/project/screens/announcements.jsx
// Adapted retail → generic HR (departments/functions, not stores).
// AppShell owns sidebar+topbar.
// c3-announcements-functional: filter tabs + pin toggle via Zustand persist
// ════════════════════════════════════════════════════════════

import { useTranslations } from 'next-intl';
import {
  Plus,
  Megaphone,
  Smile,
  Paperclip,
  Send,
  Pin,
  MoreHorizontal,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/cnext';
import {
  CNEXT_ANNOUNCEMENTS,
  CNEXT_CHANNELS,
  CNEXT_MY_PROFILE,
} from '@/lib/cnext-mock-data';
import {
  useCnextAnnouncementsStore,
  type AnnouncementFilter,
} from '@/stores/cnext-announcements-slice';

const AVATAR_TONE_MAP = {
  teal: 'cnext-avatar cnext-avatar--teal',
  sage: 'cnext-avatar cnext-avatar--sage',
  butter: 'cnext-avatar cnext-avatar--butter',
  ink: 'cnext-avatar cnext-avatar--ink',
} as const;

const CHANNEL_DOT_COLOR = {
  teal: 'var(--color-accent)',
  butter: 'var(--color-butter)',
  sage: 'var(--color-sage)',
} as const;

export default function CnextAnnouncementsPage() {
  const t = useTranslations('cnextAnnouncements');
  const { pinned, activeFilter, togglePin, setFilter } = useCnextAnnouncementsStore();

  // Filter posts by active tab
  const baseFiltered =
    activeFilter === 'all'
      ? CNEXT_ANNOUNCEMENTS
      : CNEXT_ANNOUNCEMENTS.filter((p) => p.kind === activeFilter);

  // Pinned posts sort to top (optimistic — uses slice pinned set)
  const filtered = [
    ...baseFiltered.filter((p) => pinned.includes(p.id) || p.pinned),
    ...baseFiltered.filter((p) => !pinned.includes(p.id) && !p.pinned),
  ];

  const filters: Array<[AnnouncementFilter, string]> = [
    ['all', t('filterAll')],
    ['ops', t('filterOps')],
    ['policy', t('filterPolicy')],
    ['recog', t('filterRecog')],
  ];

  return (
    <div className="pb-8">
      <h1 className="sr-only">{t('pageTitle')}</h1>
      {/* Top action bar */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="text-small text-ink-muted">{t('subtitle')}</div>
        <Button variant="primary" leadingIcon={<Plus size={16} />}>
          {t('newPost')}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Feed column */}
        <div>
          {/* Composer */}
          <div className="cnext-card mb-4" style={{ padding: 16 }}>
            <div className="cnext-row" style={{ alignItems: 'flex-start' }}>
              <span
                className={AVATAR_TONE_MAP[CNEXT_MY_PROFILE.avatarTone]}
                aria-hidden
              >
                {CNEXT_MY_PROFILE.initials}
              </span>
              <div style={{ flex: 1 }}>
                <button
                  type="button"
                  className="block w-full cursor-text rounded-xl bg-canvas-soft px-3.5 py-2.5 text-left text-body text-ink-muted hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t('composerPlaceholder')}
                </button>
                <div
                  className="cnext-row"
                  style={{ marginTop: 10, gap: 6, flexWrap: 'wrap' }}
                >
                  <Button variant="ghost" size="sm" leadingIcon={<Megaphone size={13} />}>
                    {t('composerAnnounce')}
                  </Button>
                  <Button variant="ghost" size="sm" leadingIcon={<Smile size={13} />}>
                    {t('composerPraise')}
                  </Button>
                  <Button variant="ghost" size="sm" leadingIcon={<Paperclip size={13} />}>
                    {t('composerAttach')}
                  </Button>
                  <span className="cnext-spacer" />
                  <Button variant="primary" size="sm" leadingIcon={<Send size={12} />}>
                    {t('composerSubmit')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Filter row */}
          <div className="mb-3.5 flex items-center gap-2">
            <div
              className="overflow-x-auto"
              style={{ WebkitOverflowScrolling: 'touch', flex: 1 }}
            >
              <div
                className="cnext-tabs flex-nowrap"
                role="tablist"
                aria-label={t('filterAll')}
                style={{ width: 'max-content' }}
              >
                {filters.map(([k, l]) => (
                  <button
                    type="button"
                    key={k}
                    role="tab"
                    aria-selected={activeFilter === k}
                    onClick={() => setFilter(k)}
                    className={cn('cnext-tab min-h-[44px]', activeFilter === k && 'cnext-tab--active')}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <span className="cnext-spacer" />
            <Button variant="ghost" size="sm" leadingIcon={<Filter size={13} />}>
              {t('filterScope')}
            </Button>
          </div>

          {/* Posts */}
          {filtered.map((p) => {
            const isPinned = pinned.includes(p.id) || p.pinned;
            return (
              <article
                key={p.id}
                className={cn('cnext-post', isPinned && 'cnext-post--pin')}
                style={{ marginBottom: 12 }}
              >
              <div className="cnext-row">
                <span className={AVATAR_TONE_MAP[p.authorTone]} aria-hidden>
                  {p.authorInitials}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--color-ink)' }}>
                    <b>{p.author}</b>{' '}
                    <span style={{ color: 'var(--color-ink-muted)' }}>
                      · {p.channel} · {p.timeLabel}
                    </span>
                  </div>
                </div>
                {isPinned && (
                  <span className="cnext-tag cnext-tag--ink">
                    <Pin size={11} /> {t('pinnedTag')}
                  </span>
                )}
                {/* Pin toggle button */}
                <button
                  type="button"
                  aria-label={isPinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
                  aria-pressed={isPinned}
                  className="cnext-icon-btn h-11 w-11"
                  onClick={() => togglePin(p.id)}
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: isPinned ? 'var(--color-accent)' : 'var(--color-ink-soft)',
                  }}
                >
                  <Pin size={14} />
                </button>
                <button
                  type="button"
                  aria-label="ตัวเลือกเพิ่มเติม"
                  className="cnext-icon-btn h-11 w-11"
                  style={{
                    background: 'transparent',
                    border: 0,
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
              <h3
                style={{
                  fontSize: 22,
                  marginTop: 12,
                  letterSpacing: '-0.015em',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  color: 'var(--color-ink-soft)',
                  fontSize: 14,
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                {p.body}
              </p>
              <div
                className="cnext-row"
                style={{ marginTop: 14, gap: 8, flexWrap: 'wrap' }}
              >
                <div className="cnext-reacts">
                  {p.reactions.map((x) => (
                    <span key={x} className="cnext-r">
                      {x}
                    </span>
                  ))}
                  <span className="cnext-r" aria-label="เพิ่มรีแอคชัน">
                    <Smile size={12} />
                  </span>
                </div>
                <span className="cnext-spacer" />
                <span
                  style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}
                >
                  {t('commentsLabel', { n: p.comments })}
                </span>
              </div>
              </article>
            );
          })}
        </div>

        {/* Right column */}
        <aside className="cnext-col" style={{ gap: 16 }}>
          <div className="cnext-card">
            <div className="cnext-eyebrow">{t('channelsEyebrow')}</div>
            <div className="cnext-col" style={{ gap: 6, marginTop: 10 }}>
              {CNEXT_CHANNELS.map((ch) => (
                <div
                  key={ch.id}
                  className="cnext-row"
                  style={{ padding: '8px 4px', borderRadius: 8 }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: CHANNEL_DOT_COLOR[ch.tone],
                    }}
                    aria-hidden
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--color-ink)',
                    }}
                  >
                    # {ch.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>
                    {ch.size}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="cnext-card"
            style={{
              background: 'var(--color-warning-soft)',
              border: 0,
            }}
          >
            <div className="cnext-eyebrow" style={{ color: '#6B4E14' }}>
              {t('draftEyebrow')}
            </div>
            <h3 className="mt-1.5 font-display text-lg font-semibold leading-[1.2] tracking-tight text-ink">
              {t('draftTitle')}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: 'var(--color-ink-soft)',
                marginTop: 6,
              }}
            >
              {t('draftMeta')}
            </p>
            <div style={{ marginTop: 12 }}>
              <Button variant="primary">{t('draftContinue')}</Button>
            </div>
          </div>

          <div className="cnext-card">
            <div className="cnext-eyebrow">{t('guideEyebrow')}</div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--color-ink-soft)',
                marginTop: 8,
                lineHeight: 1.6,
              }}
            >
              {t('guideBody')}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
