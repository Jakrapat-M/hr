import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scrollToSection } from './scroll-to-section'

describe('scrollToSection', () => {
  beforeEach(() => {
    // Synchronous rAF so the retry loop runs within one call stack.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('scrolls (smooth/start) and focuses with preventScroll when the target exists', () => {
    const el = document.createElement('div')
    el.scrollIntoView = vi.fn()
    const focusSpy = vi.spyOn(el, 'focus')
    vi.spyOn(document, 'getElementById').mockReturnValue(el)

    scrollToSection('emp-actions')

    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(el.getAttribute('tabindex')).toBe('-1')
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('retries via rAF and resolves when the target appears late', () => {
    const el = document.createElement('div')
    el.scrollIntoView = vi.fn()
    const getById = vi
      .spyOn(document, 'getElementById')
      .mockReturnValueOnce(null) // attempt 0 — not mounted yet
      .mockReturnValueOnce(null) // attempt 1 — still not mounted
      .mockReturnValue(el) // attempt 2 — now available

    scrollToSection('emp-late')

    expect(getById).toHaveBeenCalledTimes(3)
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('gives up after 10 retries without throwing when the target never appears', () => {
    const getById = vi.spyOn(document, 'getElementById').mockReturnValue(null)

    expect(() => scrollToSection('emp-missing')).not.toThrow()
    // initial call (attempt 0) + retries for attempts 1..10 = 11 lookups
    expect(getById).toHaveBeenCalledTimes(11)
  })
})
