'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'

// ─── Context ──────────────────────────────────────────────────────────────────

interface SingleOpenDropdownContext {
  openId: string | null
  requestOpen: (id: string) => void
  close: (id: string) => void
}

const Ctx = createContext<SingleOpenDropdownContext | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SingleOpenDropdownProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)

  const requestOpen = useCallback((id: string) => {
    setOpenId(id)
  }, [])

  const close = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : prev))
  }, [])

  return (
    <Ctx.Provider value={{ openId, requestOpen, close }}>
      {children}
    </Ctx.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Coordinates single-open behaviour across a set of dropdowns.
 * Wrap the form (or page) in <SingleOpenDropdownProvider>.
 * Each dropdown calls useSingleOpenDropdown(id) to participate.
 *
 * When requestOpen() is called, any previously open dropdown closes
 * because its isOpen becomes false.
 */
export function useSingleOpenDropdown(id: string) {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSingleOpenDropdown must be used inside <SingleOpenDropdownProvider>')

  const isOpen = ctx.openId === id

  const requestOpen = useCallback(() => ctx.requestOpen(id), [ctx, id])
  const close = useCallback(() => ctx.close(id), [ctx, id])

  return { isOpen, requestOpen, close }
}
