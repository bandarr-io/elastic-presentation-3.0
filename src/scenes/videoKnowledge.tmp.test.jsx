// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import VideoKnowledgeScene from './VideoKnowledgeScene'
import { ThemeProvider } from '../context/ThemeContext'

afterEach(cleanup)

describe('video-knowledge scene', () => {
  it('previews the real demo search on all three pages', () => {
    const { container, getByText } = render(
      <ThemeProvider>
        <VideoKnowledgeScene />
      </ThemeProvider>,
    )
    expect(container.textContent).toContain('criminals stealing money from Australians online')
    expect(container.textContent).toContain('somewhere in here')

    fireEvent.click(getByText('The shift'))
    for (const needle of ['0:08', '0:24', '0:48', 'ReportCyber on screen', 'Agency on screen',
      'ASD Cybercrime by the Numbers 2024–25 · 59 seconds · 15 clips indexed']) {
      expect(container.textContent).toContain(needle)
    }

    fireEvent.click(getByText('Over to the demo'))
    expect(container.textContent).toContain('Every format, one index')
    expect(container.querySelector('svg[aria-label="Elasticsearch"]')).not.toBeNull()
  })
})
