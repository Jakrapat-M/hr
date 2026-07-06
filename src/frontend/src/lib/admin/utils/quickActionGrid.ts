// quickActionGrid.ts — STA-246 pure grid math for admin Quick Actions.
// Fixed 4-column grid; a tile's WxH span comes from SIZE_SPAN.
// packRows mirrors CSS `grid-auto-flow: row` (forward-only, non-dense): the
// placement cursor never scans rows earlier than its current row, so trailing
// gaps are NOT backfilled. This makes the JS guard match the painted layout and
// keeps the result order-sensitive (the admin's drag order is respected).

import { SIZE_SPAN, type QuickActionTile } from '../types/adminSelfService'

export const GRID_COLS = 4
export const MAX_ROWS = 4

// Forward-only first-fit packer. Returns the number of grid rows the enabled,
// ordered tiles occupy when flowed left-to-right, top-to-bottom.
export function packRows(tiles: QuickActionTile[]): number {
  if (tiles.length === 0) return 0

  // occupied[row] = Set of occupied column indices in that row.
  const occupied: Array<Set<number>> = []
  const rowAt = (r: number): Set<number> => {
    while (occupied.length <= r) occupied.push(new Set<number>())
    return occupied[r]
  }
  const blockFree = (r: number, c: number, w: number, h: number): boolean => {
    for (let dr = 0; dr < h; dr++) {
      const row = rowAt(r + dr)
      for (let dc = 0; dc < w; dc++) {
        if (row.has(c + dc)) return false
      }
    }
    return true
  }

  let cursorR = 0
  let cursorC = 0
  let maxRow = 0

  for (const tile of tiles) {
    const { cols: w, rows: h } = SIZE_SPAN[tile.size ?? '1x1']

    // Wrap if the tile can't start at the current column.
    if (cursorC + w > GRID_COLS) {
      cursorR++
      cursorC = 0
    }
    // Advance forward-only until the w×h block is entirely free.
    while (!blockFree(cursorR, cursorC, w, h)) {
      cursorC++
      if (cursorC + w > GRID_COLS) {
        cursorR++
        cursorC = 0
      }
    }
    // Mark occupied.
    for (let dr = 0; dr < h; dr++) {
      const row = rowAt(cursorR + dr)
      for (let dc = 0; dc < w; dc++) row.add(cursorC + dc)
    }
    maxRow = Math.max(maxRow, cursorR + h - 1)

    // Advance cursor past the tile on its start row.
    cursorC += w
    if (cursorC >= GRID_COLS) {
      cursorR++
      cursorC = 0
    }
  }

  return maxRow + 1
}

// true when the enabled, ordered tiles pack into at most MAX_ROWS rows.
export function fitsCap(enabledOrdered: QuickActionTile[]): boolean {
  return packRows(enabledOrdered) <= MAX_ROWS
}
