import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'
import { SectionJumpNav, type JumpItem } from './SectionJumpNav'

// The 9 chips mirror the page's jump nav (page order, Actions last + emphasized).
const ITEMS: JumpItem[] = [
  { id: 'emp-personal-contact', label: 'Personal' },
  { id: 'emp-employment', label: 'Employment' },
  { id: 'emp-current-benefits', label: 'Benefits' },
  { id: 'emp-benefit-enrollment', label: 'Enrollment' },
  { id: 'emp-claim-history', label: 'Claims' },
  { id: 'emp-budget-reallocation', label: 'Budget' },
  { id: 'emp-timeline', label: 'Timeline' },
  { id: 'emp-compensation-history', label: 'Compensation' },
  { id: 'emp-actions', label: 'Actions', emphasis: true },
]

// Renders the nav plus stub target sections so getElementById resolves.
function renderWithTargets(items: JumpItem[]) {
  return render(
    <div>
      <SectionJumpNav items={items} ariaLabel="Jump to section" />
      {items.map((it) => (
        <div key={it.id} id={it.id}>
          {it.label} section
        </div>
      ))}
    </div>,
  )
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SectionJumpNav', () => {
  it('renders a semantic nav with the given aria-label', () => {
    render(<SectionJumpNav items={ITEMS} ariaLabel="Jump to section" />)
    expect(screen.getByRole('navigation', { name: 'Jump to section' })).toBeInTheDocument()
  })

  it('renders exactly 9 chips with the correct labels, all type=button', () => {
    render(<SectionJumpNav items={ITEMS} ariaLabel="Jump to section" />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(9)
    for (const item of ITEMS) {
      const btn = screen.getByRole('button', { name: item.label })
      expect(btn).toHaveAttribute('type', 'button')
    }
  })

  it('calls onActivate and scrolls to the matching id with smooth/start on click', () => {
    const onActivate = vi.fn()
    const items: JumpItem[] = [
      { id: 'emp-employment', label: 'Employment', onActivate },
    ]
    renderWithTargets(items)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Employment' }))
    })

    expect(onActivate).toHaveBeenCalledTimes(1)
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('runs onActivate before the deferred scroll (expand-then-scroll ordering)', () => {
    const order: string[] = []
    const onActivate = vi.fn(() => order.push('activate'))
    ;(Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>) = vi.fn(() =>
      order.push('scroll'),
    )
    renderWithTargets([{ id: 'emp-employment', label: 'Employment', onActivate }])

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Employment' }))
    })

    expect(order).toEqual(['activate', 'scroll'])
  })

  it('gives the emphasis chip the teal accent fill (no red)', () => {
    render(<SectionJumpNav items={ITEMS} ariaLabel="Jump to section" />)
    const actions = screen.getByRole('button', { name: 'Actions' })
    expect(actions.className).toContain('bg-accent')
    expect(actions.className).toContain('text-white')
    expect(actions.className).not.toMatch(/\b(?:bg|text|border|ring)-red-/)
  })

  it('chips are keyboard-focusable buttons', () => {
    render(<SectionJumpNav items={ITEMS} ariaLabel="Jump to section" />)
    const first = screen.getByRole('button', { name: 'Personal' })
    first.focus()
    expect(first).toHaveFocus()
  })

  it('tracks the in-view section via IntersectionObserver (aria-current)', () => {
    let ioCallback: IntersectionObserverCallback | null = null
    class MockIO {
      constructor(cb: IntersectionObserverCallback) {
        ioCallback = cb
      }
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
      takeRecords = vi.fn(() => [])
      root = null
      rootMargin = ''
      thresholds = []
    }
    vi.stubGlobal('IntersectionObserver', MockIO as unknown as typeof IntersectionObserver)

    renderWithTargets(ITEMS)

    act(() => {
      ioCallback?.(
        [
          {
            isIntersecting: true,
            target: document.getElementById('emp-employment')!,
            boundingClientRect: { top: 10 } as DOMRectReadOnly,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      )
    })

    expect(screen.getByRole('button', { name: 'Employment' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Personal' })).not.toHaveAttribute('aria-current')

    vi.unstubAllGlobals()
  })
})
