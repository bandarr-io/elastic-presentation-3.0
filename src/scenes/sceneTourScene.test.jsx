// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import SceneTourScene, { buildTourSteps } from './SceneTourScene'
import { ThemeProvider } from '../context/ThemeContext'
import { SceneMotionProvider } from '../context/SceneMotionContext'

function renderTour() {
  return render(
    <ThemeProvider>
      <SceneMotionProvider>
        <SceneTourScene />
      </SceneMotionProvider>
    </ThemeProvider>,
  )
}

// One step per call: React flushes the state update at the end of `act`, so the
// next dwell timer is only scheduled once this one has been applied.
const advanceOneStep = (ms) => act(() => vi.advanceTimersByTime(ms))

afterEach(cleanup)

describe('scene tour scene', () => {
  it('opens on About Elastic and jumps to a page when its pill is clicked', () => {
    const { container, getByText } = renderTour()
    expect(container.textContent).toContain('5B+')

    fireEvent.click(getByText('Knowledge From Video'))
    expect(container.textContent).toContain('criminals stealing money from Australians online')

    // Pages land on their first beat, whatever the tour was showing before.
    fireEvent.click(getByText('Unstructured Challenge'))
    expect(container.textContent).toContain('Relational databases')
  })

  it('starts itself and steps a page through its own beats before moving on', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderTour()

      advanceOneStep(12000)
      expect(container.textContent).toContain('All Your Data')

      advanceOneStep(14000)
      expect(container.textContent).toContain('An Unprecedented Data Explosion')

      // Two steps on this page: the counters land, then the verdict is revealed.
      advanceOneStep(7500)
      expect(container.textContent).toContain('An Unprecedented Data Explosion')

      advanceOneStep(7500)
      expect(container.textContent).toContain('Relational databases')

      // The page's second beat arrives without the tour leaving the page.
      advanceOneStep(5000)
      expect(container.textContent).toContain('PDFs')
    } finally {
      vi.useRealTimers()
    }
  })

  it('holds every step between 5s and 15s', () => {
    for (const step of buildTourSteps([
      { id: 'single', title: 'Single', component: () => null },
      { id: 'fast', title: 'Fast', component: () => null, beats: [{ hold: 1200 }] },
      { id: 'slow', title: 'Slow', component: () => null, beats: [{ hold: 40000 }] },
    ])) {
      expect(step.hold).toBeGreaterThanOrEqual(5000)
      expect(step.hold).toBeLessThanOrEqual(15000)
    }
  })

  it('gives a page one step per beat of the scene it embeds', () => {
    const steps = buildTourSteps([
      { id: 'a', title: 'A', component: () => null, beats: [{}, {}, {}] },
      { id: 'b', title: 'B', component: () => null, stepProps: [{}, {}] },
      { id: 'c', title: 'C', component: () => null },
    ])
    expect(steps.map((s) => `${s.pageIndex}:${s.stepIndex}`)).toEqual([
      '0:0', '0:1', '0:2', '1:0', '1:1', '2:0',
    ])
  })
})
