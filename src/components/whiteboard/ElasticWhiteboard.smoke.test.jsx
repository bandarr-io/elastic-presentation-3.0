// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import ElasticWhiteboard from '../ElasticWhiteboard'
import { ThemeProvider } from '../../context/ThemeContext'

/* Mounting smoke tests for the whiteboard: they don't assert pixels, they
   assert that the board renders, the new panels open, and the editing gestures
   don't throw. jsdom has no layout engine, so viewport measurements are
   stubbed; queries go through the DOM directly because testing-library's role
   queries call getComputedStyle, which jsdom can't evaluate against this
   component's stylesheet. */

let root

const mount = () => {
  root = render(<ThemeProvider><ElasticWhiteboard /></ThemeProvider>).container
  return root
}
const buttons = () => [...root.querySelectorAll('button')]
const btn = (label) => {
  const match = buttons().find((b) => (label instanceof RegExp
    ? label.test(b.textContent) : b.textContent.trim() === label))
  if (!match) throw new Error(`no button matching ${label}; saw: ${buttons().map((b) => b.textContent.trim()).join(' | ')}`)
  return match
}
const text = (selector) => [...root.querySelectorAll(selector)].map((el) => el.textContent.trim())
const boardIndex = () => JSON.parse(localStorage.getItem('ew-boards'))
const storedBoard = (id) => JSON.parse(localStorage.getItem(`ew-board-${id}`))

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1200 })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 800 })
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})
afterEach(cleanup)

describe('ElasticWhiteboard', () => {
  it('renders the reference board with its toolbar', () => {
    mount()
    expect(root.querySelector('.ew-title').textContent).toBe('Elastic Whiteboard')
    expect(root.querySelectorAll('.ew-node').length).toBeGreaterThan(0)
    expect(btn('Tidy')).toBeTruthy()
    expect(btn('Present')).toBeTruthy()
  })

  it('seeds a named board into storage on first run', () => {
    mount()
    const index = boardIndex()
    expect(index.boards).toHaveLength(1)
    expect(index.boards[0].name).toBe('My board')
    expect(storedBoard(index.activeId).nodes.length).toBeGreaterThan(0)
  })

  it('creates and switches boards without losing the original', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    expect(root.querySelectorAll('.ew-node')).toHaveLength(0)
    expect(btn(/New board/)).toBeTruthy()

    fireEvent.click(btn(/New board ▾/))
    fireEvent.click(btn(/My board/))
    expect(root.querySelectorAll('.ew-node').length).toBeGreaterThan(0)

    const index = boardIndex()
    expect(index.boards.map((b) => b.name)).toEqual(['My board', 'New board'])
    const original = index.boards.find((b) => b.name === 'My board')
    expect(storedBoard(original.id).nodes.length).toBeGreaterThan(0)
  })

  it('offers the annotation primitives in the palette', () => {
    mount()
    const labels = text('.ew-pitem b')
    expect(labels).toContain('Sticky note')
    expect(labels).toContain('Text')
  })

  it('opens the capacity and review panel from the totals button', () => {
    mount()
    fireEvent.click(root.querySelector('.ew-totals'))
    expect(root.querySelector('.ew-review')).toBeTruthy()
    expect(text('.ew-review-stats span')).toContain('—storage')
  })

  it('enters and leaves presentation mode, hiding the editing chrome', () => {
    mount()
    fireEvent.click(btn('Present'))
    expect(root.querySelector('.ew-title')).toBeNull()
    expect(root.querySelector('.ew-palette')).toBeNull()

    fireEvent.click(btn('← Edit'))
    expect(root.querySelector('.ew-title')).toBeTruthy()
    expect(root.querySelector('.ew-palette')).toBeTruthy()
  })

  it('records a freehand stroke drawn with the pen, and clears it', () => {
    mount()
    fireEvent.click(btn(/Pen/))
    const viewport = root.querySelector('.ew-viewport')
    fireEvent.pointerDown(viewport, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(viewport, { clientX: 160, clientY: 140 })
    fireEvent.pointerMove(viewport, { clientX: 220, clientY: 100 })
    fireEvent.pointerUp(viewport, { clientX: 220, clientY: 100 })
    expect(root.querySelectorAll('.ew-inkpath')).toHaveLength(1)

    fireEvent.click(btn('Clear ink'))
    expect(root.querySelectorAll('.ew-inkpath')).toHaveLength(0)
  })

  it('tags a node with a build step and steps through it while presenting', () => {
    mount()
    const node = root.querySelector('.ew-node')
    fireEvent.pointerDown(node, { clientX: 200, clientY: 200 })
    fireEvent.pointerUp(node, { clientX: 200, clientY: 200 })

    const inspector = root.querySelector('.ew-inspector')
    expect(inspector).toBeTruthy()
    const stepButtons = [...inspector.querySelectorAll('.ew-stepbtns .ew-btn')]
    expect(stepButtons.map((b) => b.textContent)).toEqual(['Base', '1'])
    fireEvent.click(stepButtons[1])

    const revealed = root.querySelectorAll('.ew-node').length
    fireEvent.click(btn('Present'))
    expect(root.querySelector('.ew-steps b').textContent).toBe('Base / 1')
    // the tagged node is held back on the base step, then appears on step 1
    expect(root.querySelectorAll('.ew-node').length).toBe(revealed - 1)
    fireEvent.click(btn('›'))
    expect(root.querySelector('.ew-steps b').textContent).toBe('Step 1 / 1')
    expect(root.querySelectorAll('.ew-node').length).toBe(revealed)
  })

  it('traces the flow hop by hop while presenting', () => {
    mount()
    fireEvent.click(btn('Present'))
    fireEvent.click(btn('Flow'))

    const hopLabel = () => root.querySelector('.ew-steps b').textContent
    expect(hopLabel()).toMatch(/^1 \/ \d+$/)
    // only the active leg stays lit; everything else fades back
    expect(root.querySelectorAll('.ew-edge.on').length).toBeGreaterThan(0)
    expect(root.querySelectorAll('.ew-edge.dim').length).toBeGreaterThan(0)

    fireEvent.click(btn('Flow'))
    expect(root.querySelector('.ew-steps b')).toBeNull()
  })

  it('draws the sizing calculator output onto the board', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Size…'))
    expect(root.querySelector('.ew-modal-preview').textContent).toContain('nodes')

    fireEvent.click(btn('Draw it'))
    expect(root.querySelector('.ew-modal')).toBeNull()

    const tiers = [...root.querySelectorAll('.ew-node')]
    // the default policy is hot / cold / frozen, wired together by ILM
    expect(tiers).toHaveLength(3)
    expect(text('.ew-elbl')).toEqual(['ILM', 'ILM'])
    expect(root.querySelector('.ew-zlabel').textContent).toContain('GB/day')
  })

  it('copies quote lines the pricing builder can parse', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })

    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Size…'))
    fireEvent.click(btn('Draw it'))

    fireEvent.click(root.querySelector('.ew-totals'))
    fireEvent.click(btn('Copy quote lines'))
    expect(writeText).toHaveBeenCalledOnce()

    const rows = writeText.mock.calls[0][0].split('\n')
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      const cols = row.split('\t')
      expect(cols).toHaveLength(5)
      expect(cols[0]).toContain('Resource Unit')
      expect(Number(cols[2])).toBeGreaterThan(0)
    }
  })

  it('imports a pasted cluster into its own board', () => {
    mount()
    fireEvent.click(btn(/^File/))
    fireEvent.click(btn('Import a real cluster…'))
    fireEvent.change(root.querySelector('.ew-modal-input'), {
      target: { value: 'name node.role\nhot-1 hir\nmaster-1 mr\nmaster-2 mr\nmaster-3 mr' },
    })
    expect(root.querySelector('.ew-modal-preview').textContent).toContain('4 nodes')
    fireEvent.click(btn('Create board'))

    const index = boardIndex()
    expect(index.boards).toHaveLength(2)
    const imported = storedBoard(index.activeId)
    expect(imported.nodes.find((n) => n.type === 'node_master').props.nodes).toBe(3)
    expect(imported.nodes.find((n) => n.type === 'tier_hot').props.nodes).toBe(1)
  })
})
