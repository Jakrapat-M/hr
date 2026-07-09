// quickActionGrid.test.ts — STA-246 pure grid math
// Covers SIZE_SPAN, forward-only packRows (incl. dense-divergence), and fitsCap.

import { describe, it, expect } from 'vitest'
import { SIZE_SPAN, type QuickActionSize, type QuickActionTile } from '../types/adminSelfService'
import { packRows, fitsCap, GRID_COLS, MAX_ROWS } from './quickActionGrid'

// Build a minimal enabled tile with the given size (order set by array position).
function tile(size: QuickActionSize | undefined, order: number): QuickActionTile {
  return {
    id: `t${order}`,
    label: `t${order}`,
    icon: 'Star',
    href: '/th/x',
    enabled: true,
    order,
    ...(size !== undefined ? { size } : {}),
  }
}

function seq(size: QuickActionSize, n: number): QuickActionTile[] {
  return Array.from({ length: n }, (_, i) => tile(size, i + 1))
}

describe('SIZE_SPAN', () => {
  it('maps each size to WxH = cols × rows', () => {
    expect(SIZE_SPAN['1x1']).toEqual({ cols: 1, rows: 1 })
    expect(SIZE_SPAN['2x2']).toEqual({ cols: 2, rows: 2 })
    expect(SIZE_SPAN['4x2']).toEqual({ cols: 4, rows: 2 })
  })

  it('treats a missing size as 1x1 inside packRows', () => {
    // sixteen size-less tiles pack exactly like sixteen 1x1 tiles → 4 rows.
    const sizeless = Array.from({ length: 16 }, (_, i) => tile(undefined, i + 1))
    expect(packRows(sizeless)).toBe(4)
  })

  it('exposes the fixed 4-col / 4-row grid constants', () => {
    expect(GRID_COLS).toBe(4)
    expect(MAX_ROWS).toBe(4)
  })
})

describe('packRows — §6 worked table', () => {
  it('empty → 0 rows', () => {
    expect(packRows([])).toBe(0)
  })

  it('sixteen 1×1 → 4 rows', () => {
    expect(packRows(seq('1x1', 16))).toBe(4)
  })

  it('four 2×2 → 4 rows', () => {
    expect(packRows(seq('2x2', 4))).toBe(4)
  })

  it('two 4×2 → 4 rows (full)', () => {
    expect(packRows(seq('4x2', 2))).toBe(4)
  })

  it('three 4×2 → 6 rows', () => {
    expect(packRows(seq('4x2', 3))).toBe(6)
  })

  it('one 4×2 + five 1×1 → 4 rows', () => {
    const tiles = [tile('4x2', 1), ...Array.from({ length: 5 }, (_, i) => tile('1x1', i + 2))]
    expect(packRows(tiles)).toBe(4)
  })
})

describe('packRows — forward-only vs dense divergence', () => {
  it('[2×2,1×1,1×1,2×2,1×1] → 3 rows (dense would give 2)', () => {
    const tiles = [tile('2x2', 1), tile('1x1', 2), tile('1x1', 3), tile('2x2', 4), tile('1x1', 5)]
    expect(packRows(tiles)).toBe(3)
  })

  it('is order-sensitive: same tiles reordered can occupy more rows', () => {
    // [4×2, 2×2, 2×2] packs into 4 rows; moving the 4×2 into the middle overflows to 6.
    const fits = [tile('4x2', 1), tile('2x2', 2), tile('2x2', 3)]
    const overflow = [tile('2x2', 1), tile('4x2', 2), tile('2x2', 3)]
    expect(packRows(fits)).toBe(4)
    expect(packRows(overflow)).toBe(6)
  })
})

describe('fitsCap', () => {
  it('packs-to-4 → true', () => {
    expect(fitsCap(seq('1x1', 16))).toBe(true)
    expect(fitsCap(seq('2x2', 4))).toBe(true)
    expect(fitsCap(seq('4x2', 2))).toBe(true)
  })

  it('three 4×2 → false', () => {
    expect(fitsCap(seq('4x2', 3))).toBe(false)
  })

  it('empty set fits', () => {
    expect(fitsCap([])).toBe(true)
  })
})
