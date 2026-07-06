// makeAdminQuickActions.test.tsx — STA-246
// Guards the whitelist-drop silent no-op: a published 2x2 / 4x2 tile must round-trip
// through the home mapper with its `size` intact (else the home grid never paints spans).

import { describe, it, expect } from 'vitest'
import { makeAdminQuickActions } from '../page'

describe('makeAdminQuickActions — STA-246 size threading', () => {
  it('carries 2x2 and 4x2 sizes through the mapper', () => {
    const result = makeAdminQuickActions([
      { id: 'qa1', label: 'กลาง', icon: 'User', href: '/th/a', enabled: true, order: 1, tone: 'teal', size: '2x2' },
      { id: 'qa2', label: 'ใหญ่', icon: 'Bell', href: '/th/b', enabled: true, order: 2, tone: 'amber', size: '4x2' },
    ])
    expect(result).toHaveLength(2)
    expect(result[0].size).toBe('2x2')
    expect(result[1].size).toBe('4x2')
  })

  it('defaults a size-less tile to 1x1', () => {
    const result = makeAdminQuickActions([
      { id: 'qa3', label: 'เล็ก', icon: 'FileText', href: '/th/c', enabled: true, order: 1 },
    ])
    expect(result[0].size).toBe('1x1')
  })
})
