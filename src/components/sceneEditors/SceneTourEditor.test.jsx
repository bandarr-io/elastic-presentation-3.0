// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, screen } from '@testing-library/react'
import SceneTourEditor, {
  currentPages,
  movePage,
  setPage,
  removePage,
  addPage,
  groupAvailable,
} from './SceneTourEditor'
import { DEFAULT_TOUR_PAGES, TOUR_PAGE_GROUPS, TOUR_PAGE_REGISTRY } from '../../data/tourPageRegistry'

afterEach(() => {
  cleanup()
})

function renderEditorView(sceneMetadata = {}) {
  const onUpdateSceneMetadata = vi.fn()
  const view = render(
    <SceneTourEditor
      sceneMetadata={{ 'scene-tour': sceneMetadata }}
      onUpdateSceneMetadata={onUpdateSceneMetadata}
      isDark={false}
      inputClass="input"
    />,
  )
  return { onUpdateSceneMetadata, container: view.container }
}

function renderEditor(sceneMetadata = {}) {
  return renderEditorView(sceneMetadata).onUpdateSceneMetadata
}

describe('currentPages', () => {
  it('returns the default list when no pages are configured', () => {
    expect(currentPages({})).toEqual(DEFAULT_TOUR_PAGES)
  })

  it('returns configured pages when at least one has a sceneId', () => {
    const pages = [{ sceneId: 'about' }, { sceneId: 'search-context', enabled: false }]
    expect(currentPages({ pages })).toBe(pages)
  })

  it('shows legacy index-only overrides merged onto the defaults', () => {
    const pages = currentPages({ pages: [{ enabled: false }, { hold: 5000 }] })
    expect(pages).toHaveLength(DEFAULT_TOUR_PAGES.length)
    expect(pages[0]).toEqual({ ...DEFAULT_TOUR_PAGES[0], enabled: false })
    expect(pages[1]).toEqual({ ...DEFAULT_TOUR_PAGES[1], hold: 5000 })
    expect(pages[2]).toEqual(DEFAULT_TOUR_PAGES[2])
  })
})

describe('list helpers', () => {
  const list = [{ sceneId: 'a' }, { sceneId: 'b' }, { sceneId: 'c' }]

  it('movePage swaps neighbours and returns a new array', () => {
    const next = movePage(list, 1, -1)
    expect(next.map((p) => p.sceneId)).toEqual(['b', 'a', 'c'])
    expect(list.map((p) => p.sceneId)).toEqual(['a', 'b', 'c'])
  })

  it('movePage keeps the order when out of range', () => {
    expect(movePage(list, 0, -1).map((p) => p.sceneId)).toEqual(['a', 'b', 'c'])
    expect(movePage(list, 2, 1).map((p) => p.sceneId)).toEqual(['a', 'b', 'c'])
  })

  it('setPage merges the patch into one entry', () => {
    const next = setPage(list, 1, { title: 'Bee' })
    expect(next[1]).toEqual({ sceneId: 'b', title: 'Bee' })
    expect(next[0]).toBe(list[0])
  })

  it('setPage removes keys patched with undefined', () => {
    const next = setPage([{ sceneId: 'a', hold: 3000 }], 0, { hold: undefined })
    expect(next[0]).toEqual({ sceneId: 'a' })
    expect('hold' in next[0]).toBe(false)
  })

  it('removePage drops the entry at index', () => {
    expect(removePage(list, 1).map((p) => p.sceneId)).toEqual(['a', 'c'])
  })

  it('addPage appends a sceneId', () => {
    expect(addPage([{ sceneId: 'a' }], 'b')).toEqual([{ sceneId: 'a' }, { sceneId: 'b' }])
  })
})

describe('groupAvailable', () => {
  const registry = {
    a: { title: 'A', group: 'Value' },
    b: { title: 'B', group: 'Opening' },
    c: { title: 'C', group: 'Opening' },
    d: { title: 'D', group: 'Search' },
    e: { title: 'E', group: 'Mystery' },
  }
  const groups = ['Opening', 'Value', 'Platform', 'Search']

  it('follows the order of groups and omits empty groups', () => {
    const result = groupAvailable(registry, groups, [])
    expect(result.map((g) => g.group)).toEqual(['Opening', 'Value', 'Search', 'Other'])
    expect(result[0].ids).toEqual(['b', 'c'])
  })

  it('excludes ids that are already used', () => {
    const result = groupAvailable(registry, groups, ['b', 'a'])
    expect(result).toEqual([
      { group: 'Opening', ids: ['c'] },
      { group: 'Search', ids: ['d'] },
      { group: 'Other', ids: ['e'] },
    ])
  })

  it('puts slides with an unknown group into a trailing Other group', () => {
    const result = groupAvailable({ x: { title: 'X', group: 'Nope' } }, groups, [])
    expect(result).toEqual([{ group: 'Other', ids: ['x'] }])
  })

  it('returns nothing when every slide is used', () => {
    expect(groupAvailable(registry, groups, Object.keys(registry))).toEqual([])
  })
})

describe('SceneTourEditor', () => {
  it('shows the slide section heading and the Add slide select', () => {
    renderEditor()
    expect(screen.getByRole('heading', { name: 'Slides' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Pages' })).toBeNull()
  })

  it('groups unused slides into optgroups labelled by group', () => {
    const { container } = renderEditorView({ pages: [{ sceneId: 'about' }] })
    const optgroups = Array.from(container.querySelectorAll('optgroup'))
    const unused = Object.keys(TOUR_PAGE_REGISTRY).filter((id) => id !== 'about')
    const expectedGroups = TOUR_PAGE_GROUPS.filter((g) => unused.some((id) => TOUR_PAGE_REGISTRY[id].group === g))
    expect(optgroups.map((o) => o.label)).toEqual(expectedGroups)
    const expectedIds = TOUR_PAGE_GROUPS.flatMap((g) => unused.filter((id) => TOUR_PAGE_REGISTRY[id].group === g))
    const offered = optgroups.flatMap((o) => Array.from(o.querySelectorAll('option')).map((opt) => opt.value))
    expect(offered).toEqual(expectedIds)
  })

  it('appends the chosen slide from an optgroup option', () => {
    const { container, onUpdateSceneMetadata } = renderEditorView({ pages: [{ sceneId: 'about' }] })
    const option = container.querySelector('optgroup option[value="search-context"]')
    expect(option).toBeTruthy()
    expect(option.textContent).toBe(TOUR_PAGE_REGISTRY['search-context'].title)
    fireEvent.change(screen.getByLabelText('Add slide'), { target: { value: 'search-context' } })
    expect(onUpdateSceneMetadata).toHaveBeenCalledWith('scene-tour', {
      pages: [{ sceneId: 'about' }, { sceneId: 'search-context' }],
    })
  })

  it('renders a card per default page with registry titles', () => {
    renderEditor()
    expect(screen.getByText('About Elastic')).toBeTruthy()
    expect(screen.getByText('Platform Overview')).toBeTruthy()
    expect(screen.getAllByRole('checkbox')).toHaveLength(DEFAULT_TOUR_PAGES.length)
  })

  it('moves the first page down and swaps the first two sceneIds', () => {
    const onUpdate = renderEditor()
    fireEvent.click(screen.getByLabelText('Move down About Elastic'))
    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [id, patch] = onUpdate.mock.calls[0]
    expect(id).toBe('scene-tour')
    expect(patch.pages[0].sceneId).toBe('unified-strategy')
    expect(patch.pages[1].sceneId).toBe('about')
  })

  it('writes enabled: false when a page is unchecked', () => {
    const onUpdate = renderEditor()
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    const patch = onUpdate.mock.calls[0][1]
    expect(patch.pages[0]).toEqual({ sceneId: 'about', enabled: false })
  })

  it('writes title when typing into the title input', () => {
    const onUpdate = renderEditor()
    fireEvent.change(screen.getByPlaceholderText(TOUR_PAGE_REGISTRY.about.title), {
      target: { value: 'Intro' },
    })
    expect(onUpdate.mock.calls[0][1].pages[0]).toEqual({ sceneId: 'about', title: 'Intro' })
  })

  it('writes hold in ms for a page without beats', () => {
    const onUpdate = renderEditor()
    const holdInputs = screen.getAllByLabelText('Hold (seconds)')
    expect(holdInputs[0].disabled).toBe(false)
    fireEvent.change(holdInputs[0], { target: { value: '8' } })
    expect(onUpdate.mock.calls[0][1].pages[0].hold).toBe(8000)
  })

  it('disables the hold input for a page with beats', () => {
    renderEditor()
    const searchChallengeIndex = DEFAULT_TOUR_PAGES.findIndex((p) => p.sceneId === 'search-challenge')
    const holdInput = screen.getAllByLabelText('Hold (seconds)')[searchChallengeIndex]
    expect(holdInput.disabled).toBe(true)
    expect(screen.getAllByText("Timing follows the scene's own beats").length).toBeGreaterThan(0)
  })

  it('adds a page picked from the select after one was removed', () => {
    const onUpdate = renderEditor({ pages: [{ sceneId: 'about' }] })
    const select = screen.getByLabelText('Add slide')
    fireEvent.change(select, { target: { value: 'search-context' } })
    expect(onUpdate.mock.calls[0][1].pages).toEqual([
      { sceneId: 'about' },
      { sceneId: 'search-context' },
    ])
  })

  it('does not let the last enabled page be switched off', () => {
    renderEditor({ pages: [{ sceneId: 'about' }, { sceneId: 'unified-strategy', enabled: false }] })
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes[0].disabled).toBe(true)
    expect(boxes[1].disabled).toBe(false)
  })

  it('clears the hold when zero, a negative number or under one second is typed', () => {
    for (const typed of ['0', '-2', '0.5']) {
      const onUpdate = renderEditor({ pages: [{ sceneId: 'about', hold: 9000 }] })
      fireEvent.change(screen.getByLabelText('Hold (seconds)'), { target: { value: typed } })
      expect(onUpdate.mock.calls[0][1].pages).toEqual([{ sceneId: 'about' }])
      cleanup()
    }
  })

  it('reset sends pages as an own undefined key so the merge clears it', () => {
    const onUpdate = renderEditor({ eyebrow: 'Custom', pages: [{ sceneId: 'about' }] })
    fireEvent.click(screen.getByText('Reset to defaults'))
    expect(onUpdate).toHaveBeenCalledWith('scene-tour', { pages: undefined })
    const patch = onUpdate.mock.calls[0][1]
    expect(Object.prototype.hasOwnProperty.call(patch, 'pages')).toBe(true)
    expect(patch.pages).toBeUndefined()
    expect(patch).not.toHaveProperty('eyebrow')
  })

  it('disables Remove on the only enabled page, but not on a disabled page', () => {
    renderEditor({
      pages: [
        { sceneId: 'hero' },
        { sceneId: 'about', enabled: false },
        { sceneId: 'problem-patterns', enabled: false },
      ],
    })
    const removeEnabled = screen.getByLabelText(`Remove ${TOUR_PAGE_REGISTRY.hero.title}`)
    const removeDisabledPage = screen.getByLabelText(`Remove ${TOUR_PAGE_REGISTRY.about.title}`)
    expect(removeEnabled.disabled).toBe(true)
    expect(removeDisabledPage.disabled).toBe(false)
  })
})
