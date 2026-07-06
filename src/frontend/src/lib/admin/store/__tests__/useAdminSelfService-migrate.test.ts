// useAdminSelfService-migrate.test.ts — STA-246
// A pre-existing v3 snapshot (version 0, quickActions WITHOUT `size`) must rehydrate
// with `size:'1x1'` backfilled onto every quick action while every OTHER persisted
// domain survives byte-for-byte (no key rename → no wipe).

import { describe, it, expect, beforeEach, vi } from 'vitest'

const STORAGE_KEY = 'admin-ss-config-v3'

// A complete OLD published snapshot: all six domains, quickActions with NO size.
const OLD_PUBLISHED = {
  fieldConfig: [
    { id: 'f1', label: 'ชื่อ', scope: 'Person', fieldType: 'text', defaultValue: null, isSystem: true },
  ],
  visibility: { f1: { Employee: true, Manager: false, HRBP: true, SPD: false } },
  mandatory: { f1: { Employee: false, Manager: false, HRBP: true, SPD: true } },
  readonly: { f1: { Employee: true, Manager: true, HRBP: false, SPD: false } },
  quickActions: [
    { id: 'qa1', label: 'ขอลาหยุด', icon: 'CalendarPlus', href: '/th/timeoff', enabled: true, order: 1, tone: 'teal' },
    { id: 'qa2', label: 'สลิปเงินเดือน', icon: 'FileText', href: '/th/payslip', enabled: false, order: 2 },
  ],
  tiles: [
    { id: 't1', label: 'ผังองค์กร', icon: 'Network', size: 'M', enabled: true, order: 1, visibleTo: ['Employee'] },
  ],
}

const OLD_AUDIT = [
  { id: 'a1', timestamp: '2026-01-01T00:00:00.000Z', adminUser: 'x', editor: 'quick-actions', action: 'Published quick-actions', targetEntity: 'qa1', before: null, after: null },
]

describe('useAdminSelfService — STA-246 migrate', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('backfills size:1x1 on published.quickActions and preserves every other domain', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { published: OLD_PUBLISHED, audit: OLD_AUDIT }, version: 0 }),
    )

    const { useAdminSelfService } = await import('../useAdminSelfService')
    await useAdminSelfService.persist.rehydrate()

    const published = useAdminSelfService.getState().published

    // Non-quickActions domains survive byte-for-byte.
    expect(published.fieldConfig).toEqual(OLD_PUBLISHED.fieldConfig)
    expect(published.visibility).toEqual(OLD_PUBLISHED.visibility)
    expect(published.mandatory).toEqual(OLD_PUBLISHED.mandatory)
    expect(published.readonly).toEqual(OLD_PUBLISHED.readonly)
    expect(published.tiles).toEqual(OLD_PUBLISHED.tiles)

    // Every quick action gains size:'1x1'; all other fields untouched.
    expect(published.quickActions).toHaveLength(2)
    published.quickActions.forEach((qa) => {
      expect(qa.size).toBe('1x1')
    })
    expect(published.quickActions[0]).toMatchObject({ id: 'qa1', enabled: true, order: 1, tone: 'teal' })
    expect(published.quickActions[1]).toMatchObject({ id: 'qa2', enabled: false, order: 2 })
  })
})
