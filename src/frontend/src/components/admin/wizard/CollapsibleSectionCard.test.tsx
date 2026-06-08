import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { User2 } from 'lucide-react'
import fs from 'node:fs'
import path from 'node:path'
import { CollapsibleSectionCard } from './CollapsibleSectionCard'

function StatefulChild() {
  return <input aria-label="child input" defaultValue="kept" />
}

describe('CollapsibleSectionCard', () => {
  it('renders header copy and children with an accessible button toggle', () => {
    const onToggle = vi.fn()
    render(
      <CollapsibleSectionCard
        id="who.identity"
        icon={User2}
        eyebrow="Eyebrow"
        title="Identity"
        sub="Subtitle"
        collapsed={false}
        onToggle={onToggle}
      >
        <StatefulChild />
      </CollapsibleSectionCard>,
    )

    const toggle = screen.getByRole('button', { name: /ย่อ/i })
    expect(screen.getByText('Eyebrow')).toBeInTheDocument()
    expect(screen.getByText('Identity')).toBeInTheDocument()
    expect(screen.getByText('Subtitle')).toBeInTheDocument()
    expect(toggle).toHaveAttribute('type', 'button')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', 'who.identity-content')
    expect(screen.getByLabelText('child input')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('hides collapsed content without unmounting child state', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <CollapsibleSectionCard id="job.assignment" icon={User2} eyebrow="E" title="Job" sub="S" onToggle={() => {}}>
        <StatefulChild />
      </CollapsibleSectionCard>,
    )

    const input = screen.getByLabelText('child input')
    await user.clear(input)
    await user.type(input, 'still mounted')

    rerender(
      <CollapsibleSectionCard id="job.assignment" icon={User2} eyebrow="E" title="Job" sub="S" collapsed onToggle={() => {}}>
        <StatefulChild />
      </CollapsibleSectionCard>,
    )

    const content = document.getElementById('job.assignment-content')
    expect(content).toHaveAttribute('hidden')
    expect(screen.getByLabelText('child input')).toHaveValue('still mounted')
  })

  it('honours locale-aware expand/collapse labels and is collapsed-on-mount when collapsed', () => {
    // collapsed → expand label shown, aria-expanded=false, content hidden (AC2 mechanism)
    const { rerender } = render(
      <CollapsibleSectionCard
        id="benefits" icon={User2} eyebrow="E" title="Current Benefits" sub="S"
        collapsed onToggle={() => {}} expandLabel="Expand" collapseLabel="Collapse"
      >
        <StatefulChild />
      </CollapsibleSectionCard>,
    )
    const toggle = screen.getByRole('button', { name: 'Expand' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('benefits-content')).toHaveAttribute('hidden')

    // expanded → collapse label shown, aria-expanded=true
    rerender(
      <CollapsibleSectionCard
        id="benefits" icon={User2} eyebrow="E" title="Current Benefits" sub="S"
        collapsed={false} onToggle={() => {}} expandLabel="Expand" collapseLabel="Collapse"
      >
        <StatefulChild />
      </CollapsibleSectionCard>,
    )
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('defaults to Thai labels when expand/collapse labels are omitted (back-compat)', () => {
    render(
      <CollapsibleSectionCard id="bc" icon={User2} eyebrow="E" title="T" sub="S" collapsed onToggle={() => {}}>
        <StatefulChild />
      </CollapsibleSectionCard>,
    )
    expect(screen.getByRole('button', { name: 'ขยาย' })).toBeInTheDocument()
  })

  it('does not introduce forbidden red utility classes or hardcoded hex colors', () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'CollapsibleSectionCard.tsx'), 'utf8')

    expect(source).not.toMatch(/\b(?:bg|text|border|ring)-red-/)
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
