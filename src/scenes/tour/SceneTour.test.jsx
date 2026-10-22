// @vitest-environment jsdom
import { useEffect } from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import SceneTour from './SceneTour'
import { ThemeProvider } from '../../context/ThemeContext'
import { SceneMotionProvider } from '../../context/SceneMotionContext'

const REGISTRY = {
  a: { title: 'Alpha', component: () => <div>alpha-body</div> },
  b: { title: 'Beta', component: () => <div>beta-body</div> },
  c: { title: 'Gamma', component: () => <div>gamma-body</div> },
}

const DEFAULT_PAGES = [{ sceneId: 'a' }, { sceneId: 'b' }, { sceneId: 'c' }]

function renderTour(props = {}) {
  return render(
    <ThemeProvider>
      <SceneMotionProvider>
        <SceneTour registry={REGISTRY} defaultPages={DEFAULT_PAGES} {...props} />
      </SceneMotionProvider>
    </ThemeProvider>,
  )
}

// One step per call: React flushes the state update at the end of `act`, so the
// next dwell timer is only scheduled once this one has been applied.
const advanceOneStep = (ms) => act(() => vi.advanceTimersByTime(ms))

afterEach(cleanup)

describe('SceneTour engine', () => {
  it('renders the default eyebrow and every pill, and opens on the first page', () => {
    const { container, getByText } = renderTour()

    expect(container.textContent).toContain('Tour')
    expect(getByText('Alpha')).toBeTruthy()
    expect(getByText('Beta')).toBeTruthy()
    expect(getByText('Gamma')).toBeTruthy()
    expect(container.textContent).toContain('alpha-body')
  })

  it('lets metadata.eyebrow override the eyebrow prop', () => {
    const { container } = renderTour({
      eyebrow: 'Prop Eyebrow',
      metadata: { eyebrow: 'Override' },
    })

    expect(container.textContent).toContain('Override')
    expect(container.textContent).not.toContain('Prop Eyebrow')
  })

  it('uses metadata.pages list mode: order, renames, and disabled entries', () => {
    const { container, getByText, queryByText } = renderTour({
      metadata: {
        pages: [{ sceneId: 'c' }, { sceneId: 'a', title: 'Renamed' }, { sceneId: 'b', enabled: false }],
      },
    })

    const pills = Array.from(container.querySelectorAll('button')).map((b) => b.textContent)
    expect(pills).toEqual(['Gamma', 'Renamed'])
    expect(queryByText('Beta')).toBeNull()
    expect(getByText('Renamed')).toBeTruthy()
    expect(container.textContent).toContain('gamma-body')
  })

  it('jumps to a page when its pill is clicked', () => {
    const { container, getByText } = renderTour({
      metadata: {
        pages: [{ sceneId: 'c' }, { sceneId: 'a', title: 'Renamed' }, { sceneId: 'b', enabled: false }],
      },
    })

    fireEvent.click(getByText('Renamed'))
    expect(container.textContent).toContain('alpha-body')
  })

  it('moves to the next page once the pageHold has elapsed', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderTour({ metadata: { pageHold: 6000 } })
      expect(container.textContent).toContain('alpha-body')

      advanceOneStep(6000)
      expect(container.textContent).toContain('beta-body')
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders nothing without throwing when there are no pages', () => {
    const { container } = renderTour({ registry: {}, defaultPages: [] })
    expect(container.textContent).toBe('')
  })

  it('passes a page its per-page metadata, keyed by sceneId', () => {
    const registry = {
      a: {
        title: 'Alpha',
        component: ({ metadata }) => <div>{metadata.label}</div>,
      },
    }
    const { container } = renderTour({
      registry,
      defaultPages: [{ sceneId: 'a' }],
      metadata: { pageMetadata: { a: { label: 'hello-meta' } } },
    })

    expect(container.textContent).toContain('hello-meta')
  })

  it('shows the deck copy for an embedded slide', () => {
    const registry = {
      a: { title: 'Alpha', component: ({ metadata }) => <div>{metadata.label}</div> },
    }
    const { container } = renderTour({
      registry,
      defaultPages: [{ sceneId: 'a' }],
      sceneMetadata: { a: { label: 'from-deck' } },
    })

    expect(container.textContent).toContain('from-deck')
  })

  it('layers the tour pageMetadata override over the deck copy', () => {
    const registry = {
      a: {
        title: 'Alpha',
        component: ({ metadata }) => <div>{`${metadata.label}|${metadata.extra}`}</div>,
      },
    }
    const { container } = renderTour({
      registry,
      defaultPages: [{ sceneId: 'a' }],
      sceneMetadata: { a: { label: 'from-deck', extra: 'x' } },
      metadata: { pageMetadata: { a: { label: 'override' } } },
    })

    expect(container.textContent).toContain('override|x')
  })

  it('hands the page the same metadata object across an unrelated re-render', () => {
    const seen = []
    const registry = {
      a: {
        title: 'Alpha',
        component: ({ metadata }) => {
          seen.push(metadata)
          return <div>alpha-body</div>
        },
      },
    }
    const sceneMetadata = { a: { label: 'from-deck' } }
    const tree = (metadata) => (
      <ThemeProvider>
        <SceneMotionProvider>
          <SceneTour
            registry={registry}
            defaultPages={[{ sceneId: 'a' }]}
            metadata={metadata}
            sceneMetadata={sceneMetadata}
          />
        </SceneMotionProvider>
      </ThemeProvider>
    )

    const { rerender } = render(tree({}))
    rerender(tree({}))

    expect(seen.length).toBeGreaterThan(1)
    expect(seen.every((m) => m === seen[0])).toBe(true)
  })

  it('updates the shown copy when the deck copy changes, without remounting', () => {
    const mounts = { count: 0 }
    const registry = {
      a: {
        title: 'Alpha',
        component: ({ metadata }) => {
          useEffect(() => { mounts.count += 1 }, [])
          return <div>{metadata.label}</div>
        },
      },
    }
    const tree = (sceneMetadata) => (
      <ThemeProvider>
        <SceneMotionProvider>
          <SceneTour registry={registry} defaultPages={[{ sceneId: 'a' }]} sceneMetadata={sceneMetadata} />
        </SceneMotionProvider>
      </ThemeProvider>
    )

    const { container, rerender } = render(tree({ a: { label: 'before' } }))
    expect(container.textContent).toContain('before')

    rerender(tree({ a: { label: 'after' } }))
    expect(container.textContent).toContain('after')
    expect(container.textContent).not.toContain('before')
    expect(mounts.count).toBe(1)
  })

  it('steps through the beats the deck copy defines, not the registry list', () => {
    vi.useFakeTimers()
    try {
      const registry = {
        a: {
          title: 'Alpha',
          component: () => <div>alpha-body</div>,
          beats: [{ key: 'x', hold: 6000 }, { key: 'y', hold: 6000 }],
        },
        b: { title: 'Beta', component: () => <div>beta-body</div> },
      }
      // The copy trims the scene to a single beat, so the tour must not wait
      // for a second one before moving on.
      const { container } = renderTour({
        registry,
        defaultPages: [{ sceneId: 'a' }, { sceneId: 'b' }],
        sceneMetadata: { a: { beats: [{ hold: 6000 }] } },
      })

      advanceOneStep(6000)
      expect(container.textContent).toContain('beta-body')
    } finally {
      vi.useRealTimers()
    }
  })

  it('remounts a page when the loop wraps back to its first step', () => {
    vi.useFakeTimers()
    try {
      const mounts = { count: 0 }
      const registry = {
        a: {
          title: 'Alpha',
          component: ({ verdictSignal }) => {
            useEffect(() => { mounts.count += 1 }, [])
            return <div>{`signal-${verdictSignal}`}</div>
          },
          stepProps: [{ verdictSignal: 0 }, { verdictSignal: 1 }],
          hold: 6000,
        },
      }
      const { container } = renderTour({ registry, defaultPages: [{ sceneId: 'a' }] })
      expect(container.textContent).toContain('signal-0')

      advanceOneStep(6000)
      expect(container.textContent).toContain('signal-1')
      expect(mounts.count).toBe(1)

      // Wrapping the loop on this lone page must reset the reveal.
      advanceOneStep(6000)
      expect(container.textContent).toContain('signal-0')
      expect(mounts.count).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
