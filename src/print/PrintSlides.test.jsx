// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { ThemeProvider } from '../context/ThemeContext'
import PrintSlides from './PrintSlides'
import { slidePages } from './slidePages'

afterEach(cleanup)

const Stub = ({ metadata }) => <div data-testid="stub">{metadata?.title || 'stub'}</div>
const Boom = () => { throw new Error('boom') }
const withTheme = (ui) => <ThemeProvider>{ui}</ThemeProvider>

describe('slidePages', () => {
  const scenes = [{ id: 'a' }, { id: 'b' }, { id: 'a-copy' }]

  it('makes one page per scene, in order, pinned to beat 0', () => {
    expect(slidePages(scenes).map((p) => [p.sceneId, p.beat])).toEqual([['a', 0], ['b', 0], ['a-copy', 0]])
  })

  it('has unique keys, is deterministic and does not mutate its input', () => {
    const before = structuredClone(scenes)
    const first = slidePages(scenes)
    expect(slidePages(scenes)).toEqual(first)
    expect(new Set(first.map((p) => p.key)).size).toBe(first.length)
    expect(scenes).toEqual(before)
  })

  it('handles an empty deck', () => {
    expect(slidePages([])).toEqual([])
    expect(slidePages()).toEqual([])
  })
})

describe('PrintSlides', () => {
  it('renders one section per scene with saved metadata applied', () => {
    const scenes = [{ id: 'a', component: Stub }, { id: 'b', component: Stub }]
    const { container } = render(withTheme(
      <PrintSlides scenes={scenes} sceneMetadata={{ a: { title: 'Edited' } }} />,
    ))
    expect(container.querySelectorAll('section.print-slide')).toHaveLength(2)
    expect(screen.getByText('Edited')).toBeTruthy()
  })

  it('shows a placeholder for a scene without a component', () => {
    const { container } = render(withTheme(<PrintSlides scenes={[{ id: 'gone' }]} />))
    expect(container.querySelector('[data-print-missing="true"]')).toBeTruthy()
  })

  it('contains a crashing scene instead of dropping the page', () => {
    const scenes = [{ id: 'bad', component: Boom }, { id: 'ok', component: Stub }]
    const { container } = render(withTheme(<PrintSlides scenes={scenes} />))
    expect(container.querySelectorAll('section.print-slide')).toHaveLength(2)
    expect(screen.getByTestId('stub')).toBeTruthy()
  })
})
