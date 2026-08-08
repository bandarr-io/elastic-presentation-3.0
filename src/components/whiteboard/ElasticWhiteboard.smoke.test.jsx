// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { webcrypto } from 'node:crypto'
import ElasticWhiteboard from '../ElasticWhiteboard'
import { ThemeProvider } from '../../context/ThemeContext'
import { projectCell, formatCurrency } from '../../utils/pricing'
import { RU_LIST_PRICE, RU_GB } from '../../utils/whiteboardSizing'

/* jsdom's crypto has no SubtleCrypto, which the Bedrock request signer needs */
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

/* The browser-side PDF parser, stubbed: pdf.js wants a worker and a canvas,
   neither of which jsdom has. What the tests exercise is the routing and the
   attach that follows, not Mozilla's parsing. */
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({
          items: [{ str: '## Retention' }, { str: 'Thirteen months, searchable.' }],
        }),
      }),
    }),
  }),
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/pdf.worker.js' }))

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
const inspectorField = (label) => {
  const row = [...root.querySelectorAll('.ew-inspector .ew-frow')]
    .find((r) => r.querySelector('.ew-flabel').textContent.trim() === label)
  if (!row) throw new Error(`no inspector field labelled ${label}`)
  return row.querySelector('input, select')
}
const reviewField = (label) => {
  const row = [...root.querySelectorAll('.ew-review .ew-frow')]
    .find((r) => r.querySelector('.ew-flabel').textContent.trim() === label)
  if (!row) throw new Error(`no capacity-panel field labelled ${label}`)
  return row.querySelector('input, select')
}
const sizingField = (label) => {
  const field = [...root.querySelectorAll('.ew-size-f')]
    .find((f) => f.querySelector('span').textContent.trim() === label)
  if (!field) throw new Error(`no sizing field labelled ${label}`)
  return field.querySelector('input, select')
}
const nodeNamed = (label) => {
  const match = [...root.querySelectorAll('.ew-node')].find((n) => n.textContent.includes(label))
  if (!match) throw new Error(`no node containing ${label}`)
  return match
}
/* the open-a-board and compare-with lists hold the same names, so compare
   targets are picked out by their own class */
const compareWith = (name) => {
  const match = [...root.querySelectorAll('.ew-cmp')].find((b) => b.textContent.trim() === name)
  if (!match) throw new Error(`no compare target named ${name}`)
  return match
}
const boardIndex = () => JSON.parse(localStorage.getItem('ew-boards'))
const storedBoard = (id) => JSON.parse(localStorage.getItem(`ew-board-${id}`))
/* Write it up opens on the choice of artifact; each option carries its label
   and a line about what you get, so it's matched on the label alone */
const pickGenre = (label) => {
  const match = [...root.querySelectorAll('.ew-genre')]
    .find((g) => g.querySelector('b').textContent.trim() === label)
  if (!match) throw new Error(`no artifact option labelled ${label}`)
  fireEvent.click(match)
}
/* Presenting, annotation, chat, and context all live behind toolbar menus now —
   these helpers walk the two clicks so the tests read as one gesture. */
/* The button reads "✎ Present ▾" while a draw tool is active, hence the regex. */
const presentMenu = () => fireEvent.click(btn(/Present ▾/))
const startPresenting = () => {
  presentMenu()
  fireEvent.click(btn('Start presenting'))
}
const toggleChat = () => {
  fireEvent.click(btn('✦ AI ▾'))
  fireEvent.click(btn('AI chat'))
}
/* Attach a customer document to the board through the Context panel, and
   close it again — the panel is the only way in, so the tests go that way. */
const openContext = () => {
  fireEvent.click(btn('✦ AI ▾'))
  fireEvent.click(btn(/◫ Context/))
}
const attachDoc = (name, body, { keepOpen = false } = {}) => {
  openContext()
  fireEvent.change(root.querySelector('.ew-modal .ew-frow input'), { target: { value: name } })
  fireEvent.change(root.querySelector('.ew-modal textarea'), { target: { value: body } })
  fireEvent.click(btn('Attach'))
  if (!keepOpen) fireEvent.click(root.querySelector('.ew-modal-h .ew-x'))
}

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
    expect(btn('Tidy ▾')).toBeTruthy()
    expect(btn('Present ▾')).toBeTruthy()
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

  it('collapses and reopens the palette from its edge toggle', () => {
    mount()
    expect(root.querySelector('.ew-palette')).toBeTruthy()
    fireEvent.click(root.querySelector('.ew-paltoggle'))
    expect(root.querySelector('.ew-palette')).toBeNull()
    fireEvent.click(root.querySelector('.ew-paltoggle'))
    expect(root.querySelector('.ew-palette')).toBeTruthy()
  })

  it('opens the capacity and review panel from the totals button', () => {
    mount()
    fireEvent.click(root.querySelector('.ew-totals'))
    expect(root.querySelector('.ew-review')).toBeTruthy()
    expect(text('.ew-review-stats span')).toContain('—storage')
  })

  it('enters and leaves presentation mode, hiding the editing chrome', () => {
    mount()
    startPresenting()
    expect(root.querySelector('.ew-title')).toBeNull()
    expect(root.querySelector('.ew-palette')).toBeNull()

    fireEvent.click(btn('← Edit'))
    expect(root.querySelector('.ew-title')).toBeTruthy()
    expect(root.querySelector('.ew-palette')).toBeTruthy()
  })

  it('records a freehand stroke drawn with the pen, and clears it', () => {
    mount()
    presentMenu()
    fireEvent.click(btn('✎ Pen'))
    const viewport = root.querySelector('.ew-viewport')
    fireEvent.pointerDown(viewport, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(viewport, { clientX: 160, clientY: 140 })
    fireEvent.pointerMove(viewport, { clientX: 220, clientY: 100 })
    fireEvent.pointerUp(viewport, { clientX: 220, clientY: 100 })
    expect(root.querySelectorAll('.ew-inkpath')).toHaveLength(1)

    presentMenu()
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
    startPresenting()
    expect(root.querySelector('.ew-steps b').textContent).toBe('Base / 1')
    // the tagged node is held back on the base step, then appears on step 1
    expect(root.querySelectorAll('.ew-node').length).toBe(revealed - 1)
    fireEvent.click(btn('›'))
    expect(root.querySelector('.ew-steps b').textContent).toBe('Step 1 / 1')
    expect(root.querySelectorAll('.ew-node').length).toBe(revealed)
  })

  it('compares the current board against another one', () => {
    mount()
    // a blank board next to the seeded reference: everything counts as dropped
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn(/New board ▾/))
    fireEvent.click(compareWith('My board'))

    const panel = root.querySelector('.ew-diff')
    expect(panel.querySelector('.ew-review-h b').textContent).toBe('vs My board')
    expect(text('.ew-diff-h')).toEqual([expect.stringMatching(/^Dropped · \d+$/)])
    expect(root.querySelectorAll('.ew-node.diff-added')).toHaveLength(0)

    fireEvent.click(panel.querySelector('.ew-x'))
    expect(root.querySelector('.ew-diff')).toBeNull()
  })

  it('marks resized components when comparing', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.click(btn('Draw it'))

    fireEvent.click(btn(/New board ▾/))
    fireEvent.click(btn('Duplicate this board'))

    // bump the node count on one tier, then compare back to the original
    const node = nodeNamed('Hot Tier')
    fireEvent.pointerDown(node, { clientX: 200, clientY: 200 })
    fireEvent.pointerUp(node, { clientX: 200, clientY: 200 })
    fireEvent.change(inspectorField('Nodes'), { target: { value: '9' } })

    fireEvent.click(btn(/copy ▾/))
    fireEvent.click(compareWith('New board'))
    expect(text('.ew-diff-h')).toEqual(['Resized · 1'])
    expect(root.querySelectorAll('.ew-node.diff-changed')).toHaveLength(1)
  })

  it('draws the sizing calculator output as a full architecture', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    // Logstash ships off — agent-direct is the default — so the full drawing
    // needs the toggle, which is also what proves the toggle works
    expect(root.querySelector('.ew-modal-preview').textContent).not.toContain('Logstash')
    fireEvent.click(sizingField('Logstash'))
    const preview = root.querySelector('.ew-modal-preview').textContent
    expect(preview).toContain('nodes')
    expect(preview).toContain('Logstash')
    expect(preview).toContain('Kibana')
    expect(preview).toContain('Dedicated masters')

    fireEvent.click(btn('Draw it'))
    expect(root.querySelector('.ew-modal')).toBeNull()

    // sources -> ingestion (agent + logstash) -> cluster -> kibana, plus monitoring
    const nodeText = text('.ew-node').join(' ')
    for (const piece of ['Elastic Agent', 'Logstash', 'Hot Tier', 'Cold Tier', 'Frozen Tier',
                         'Master Node', 'Remote Storage', 'Kibana', 'Monitoring Cluster'])
      expect(nodeText).toContain(piece)
    // the derived counts land on the nodes: agents, logstash HA pair, kibana pair
    expect(nodeNamed('Elastic Agent').textContent).toContain('100 agents')
    expect(nodeNamed('Logstash').textContent).toContain('2 inst')
    expect(nodeNamed('Kibana').textContent).toContain('2 inst')
    expect(nodeNamed('Users').textContent).toContain('50 users')

    const edgeLabels = text('.ew-elbl')
    expect(edgeLabels.filter((l) => l === 'ILM')).toHaveLength(2)
    for (const lbl of ['snapshots', 'logs & metrics', 'ingest', 'queries', 'stack monitoring'])
      expect(edgeLabels).toContain(lbl)

    const zoneLabels = text('.ew-zlabel')
    expect(zoneLabels.join(' ')).toContain('GB/day')
    // the cluster zone names where it runs: provider · profile · workload
    const clusterZone = zoneLabels.find((l) => l.includes('GB/day'))
    expect(clusterZone).toContain('Elastic Cloud — AWS')
    expect(clusterZone).toContain('Storage Optimized')
    expect(zoneLabels).toContain('Data sources')
    // agents are collectors, so they sit in the ingestion zone
    expect(zoneLabels).toContain('Ingestion')
    expect(zoneLabels).toContain('User Space')

    // the monitoring deployment tucks directly below the User Space
    const user = zoneBox('User Space'), mon = zoneBox('Management')
    expect(mon.x).toBe(user.x)
    expect(mon.y).toBe(user.y + user.h + 120)

    // stack monitoring watches the whole cluster, so it leaves the cluster
    // zone box (one of its side midpoints), not the hot tier node
    const cluster = zoneBox(clusterZone)
    const start = edgeStart('stack monitoring')
    expect(sideMids(cluster)).toContainEqual(start)
    expect(sideMids(nodeBox('Hot Tier'))).not.toContainEqual(start)

    // content-driven sizing: the chip-laden hot tier outgrows its designed 96px
    expect(parseFloat(nodeNamed('Hot Tier').style.height)).toBeGreaterThan(96)
  })

  const zoneBox = (label) => {
    const z = [...root.querySelectorAll('.ew-zone')]
      .find((el) => el.querySelector('.ew-zlabel').textContent.trim() === label)
    if (!z) throw new Error(`no zone labelled ${label}`)
    return { x: parseFloat(z.style.left), y: parseFloat(z.style.top),
             w: parseFloat(z.style.width), h: parseFloat(z.style.height) }
  }
  const nodeBox = (label) => {
    const n = nodeNamed(label)
    return { x: parseFloat(n.style.left), y: parseFloat(n.style.top),
             w: parseFloat(n.style.width), h: parseFloat(n.style.height) }
  }
  /* where an edge attaches: the four side midpoints an anchor can land on */
  const sideMids = (r) => [
    { x: r.x, y: r.y + r.h / 2 }, { x: r.x + r.w, y: r.y + r.h / 2 },
    { x: r.x + r.w / 2, y: r.y }, { x: r.x + r.w / 2, y: r.y + r.h },
  ]
  /* first point of a labelled connection's path (`M x y …`) */
  const edgeStart = (label) => {
    const wrap = [...root.querySelectorAll('.ew-elbl')]
      .find((t) => t.textContent.trim() === label)?.closest('g')
    if (!wrap) throw new Error(`no connection labelled ${label}`)
    const [x, y] = wrap.querySelector('.ew-edge').getAttribute('d').split(' ').slice(1, 3).map(Number)
    return { x, y }
  }

  it('tidies zones as units: members stay inside their refitted frames', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.click(btn('Draw it'))

    fireEvent.click(btn('Tidy ▾'))
    fireEvent.click(btn('Rebuild into flow lanes'))

    // every zone that holds nodes still wraps them after the tidy
    const inside = (nb, zb) => {
      const cx = nb.x + nb.w / 2, cy = nb.y + nb.h / 2
      return cx > zb.x && cx < zb.x + zb.w && cy > zb.y && cy < zb.y + zb.h
    }
    const clusterZone = text('.ew-zlabel').find((l) => l.includes('GB/day'))
    expect(inside(nodeBox('Hot Tier'), zoneBox(clusterZone))).toBe(true)
    expect(inside(nodeBox('Elastic Agent'), zoneBox('Ingestion'))).toBe(true)
    expect(inside(nodeBox('Kibana'), zoneBox('User Space'))).toBe(true)
    expect(inside(nodeBox('Monitoring Cluster'), zoneBox('Management'))).toBe(true)
  })

  it('straightens a nudged node back into its column without re-laying the board out', async () => {
    mount()
    const viewport = root.querySelector('.ew-viewport')
    const xOf = (id) => storedBoard(boardIndex().activeId).nodes.find((n) => n.id === id).x

    // knock Kibana slightly out of the serve-side column it shares with Cloud
    const kibana = nodeNamed('Kibana')
    fireEvent.pointerDown(kibana, { clientX: 200, clientY: 200, button: 0 })
    fireEvent.pointerMove(viewport, { clientX: 230, clientY: 200 })
    fireEvent.pointerUp(viewport, { clientX: 230, clientY: 200 })
    await vi.waitFor(() => expect(xOf('n12')).not.toBe(1320))

    fireEvent.click(btn('Tidy ▾'))
    fireEvent.click(btn('Straighten rows & columns'))

    await vi.waitFor(() => expect(xOf('n12')).toBe(xOf('n13')))
    // alignment only — the sources column stayed exactly where the seed put it
    expect(xOf('n2')).toBe(40)
  })

  it('shows a live guide during a drag and drops the node exactly centre-aligned', () => {
    mount()
    const viewport = root.querySelector('.ew-viewport')

    // a few pixels of drag: close enough for the guide, but the grid alone
    // would round the drop to 1328 — only the guide puts it back on 1320
    fireEvent.pointerDown(nodeNamed('Third-Party'), { clientX: 200, clientY: 200, button: 0 })
    fireEvent.pointerMove(viewport, { clientX: 204, clientY: 200 })
    expect(root.querySelector('.ew-guide')).toBeTruthy()
    fireEvent.pointerUp(viewport, { clientX: 204, clientY: 200 })

    expect(nodeBox('Third-Party').x).toBe(1320)
    expect(root.querySelector('.ew-guide')).toBeNull()
  })

  it('saves a camera view, flies back to it, and steps views while presenting', async () => {
    mount()
    const camera = () => root.querySelector('.ew-world').style.transform

    fireEvent.click(btn('Views ▾'))
    fireEvent.click(btn('+ Save current view'))
    const saved = camera()

    // move the camera away, then recall the saved view from the menu
    fireEvent.click(btn('+'))
    expect(camera()).not.toBe(saved)
    fireEvent.click(btn('Views ▾'))
    fireEvent.click(btn('1 · View 1'))
    await vi.waitFor(() => expect(camera()).toBe(saved))

    // presenting: the bar shows a view stepper, and number keys still fly
    startPresenting()
    expect(root.querySelector('.ew-present-bar').textContent).toContain('View 1')
    fireEvent.click(btn('Fit'))
    expect(camera()).not.toBe(saved)
    fireEvent.keyDown(window, { key: '1' })
    await vi.waitFor(() => expect(camera()).toBe(saved))
  })

  it('shows a minimap that pans the camera and toggles off', () => {
    mount()
    const map = root.querySelector('.ew-minimap')
    expect(map).toBeTruthy()
    // one blip per node, plus the camera rectangle
    expect(map.querySelectorAll('rect')).toHaveLength(19)

    const before = root.querySelector('.ew-world').style.transform
    fireEvent.pointerDown(map, { clientX: 20, clientY: 20 })
    expect(root.querySelector('.ew-world').style.transform).not.toBe(before)

    // the toggle lives in the Views menu
    const mapToggle = () => {
      fireEvent.click(btn('Views ▾'))
      const label = [...root.querySelectorAll('.ew-menu-check')]
        .find((l) => l.textContent.includes('Show the minimap'))
      fireEvent.click(label.querySelector('input'))
      fireEvent.click(root.querySelector('.ew-menu-backdrop'))
    }
    mapToggle()
    expect(root.querySelector('.ew-minimap')).toBeNull()
    mapToggle()
    expect(root.querySelector('.ew-minimap')).toBeTruthy()
  })

  it('sizes ingest from the Data Source nodes on the board', () => {
    mount()
    const select = (label) => {
      const node = nodeNamed(label)
      fireEvent.pointerDown(node, { clientX: 200, clientY: 200 })
      fireEvent.pointerUp(node, { clientX: 200, clientY: 200 })
    }
    // pin an integration and a raw volume on two of the reference sources;
    // the integration comes from the combobox's own scrollable list
    select('Servers')
    const integ = inspectorField('Integration')
    fireEvent.focus(integ)
    expect(root.querySelectorAll('.ew-combo-list button').length).toBeGreaterThan(50)
    fireEvent.change(integ, { target: { value: 'apache' } })
    const options = [...root.querySelectorAll('.ew-combo-list button')]
    expect(options.length).toBeLessThan(10)   // typing filters the list
    fireEvent.click(options.find((b) => b.textContent === 'Apache HTTP Server'))
    fireEvent.change(inspectorField('Raw ingest'), { target: { value: '300' } })
    expect(nodeNamed('Servers').textContent).toContain('Apache HTTP Server')
    expect(nodeNamed('Servers').textContent).toContain('300 GB/day')

    select('Endpoints')
    fireEvent.change(inspectorField('Raw ingest'), { target: { value: '200' } })

    // the sizing dialog can sum those volumes instead of a hand-entered total
    fireEvent.click(btn('Build…'))
    fireEvent.click(sizingField('Sum board sources'))
    expect(sizingField('Ingest').disabled).toBe(true)
    expect(sizingField('Ingest').value).toBe('500')

    fireEvent.click(btn('Draw it'))
    // no duplicate generic sources zone; the real sources feed the new intake
    expect(text('.ew-zlabel')).not.toContain('Data sources')
    expect(text('.ew-elbl').filter((l) => l === 'logs & metrics').length).toBeGreaterThanOrEqual(2)
    // the architecture continues the flow to the right of the wired sources
    const serversRight = parseFloat(nodeNamed('Servers').style.left)
      + parseFloat(nodeNamed('Servers').style.width)
    expect(zoneBox('Ingestion').x).toBeGreaterThan(serversRight)
  })

  it('stacks data sources onto the board from the size modal dialog', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.click(btn('+ Add…'))

    const row = (i) => root.querySelectorAll('.ew-srcrow')[i]
    const rowInputs = (i) => row(i).querySelectorAll('input[type=number]')   // [GB/day, days]
    fireEvent.change(row(0).querySelector('.ew-combo input'), { target: { value: 'Apache HTTP Server' } })
    fireEvent.change(rowInputs(0)[0], { target: { value: '300' } })
    fireEvent.change(rowInputs(0)[1], { target: { value: '30' } })
    fireEvent.click(btn('+ Add row'))
    fireEvent.change(row(1).querySelector('.ew-combo input'), { target: { value: 'Cisco ASA' } })
    fireEvent.change(rowInputs(1)[0], { target: { value: '200' } })
    fireEvent.click(btn('Add to board'))

    // one Data Source node per row, stacked in a single column
    const sources = [...root.querySelectorAll('.ew-node')]
    expect(sources).toHaveLength(2)
    expect(sources.map((n) => n.textContent)).toEqual([
      expect.stringContaining('Apache HTTP Server'),
      expect.stringContaining('Cisco ASA'),
    ])
    // the per-source retention rides along as a chip
    expect(sources[0].textContent).toContain('30 days')
    const lefts = sources.map((n) => parseFloat(n.style.left))
    const tops = sources.map((n) => parseFloat(n.style.top))
    expect(lefts[0]).toBe(lefts[1])
    expect(tops[1]).toBeGreaterThan(tops[0])

    // the size dialog switches to summing them automatically
    expect(sizingField('Ingest').disabled).toBe(true)
    expect(sizingField('Ingest').value).toBe('500')
  })

  /* The dialog body scrolls, which used to clip the integration list to the
     couple of rows that happened to fit under the input. The list is placed
     against the viewport instead, so it has to carry its own measured
     geometry rather than inheriting the row's box. */
  it('opens the integration list outside the dialog body that would clip it', () => {
    mount()
    fireEvent.click(btn('Build…'))
    fireEvent.click(btn('+ Add…'))

    const input = root.querySelector('.ew-srcrow .ew-combo input')
    fireEvent.focus(input)
    const list = root.querySelector('.ew-combo-list')
    expect(list.querySelectorAll('button').length).toBeGreaterThan(50)
    expect(list.style.top || list.style.bottom).toBeTruthy()
    expect(list.style.maxHeight).toBeTruthy()
    expect(list.closest('.ew-modal-body')).toBeNull()
  })

  const hwInputs = (label) => {
    const row = [...root.querySelectorAll('.ew-hw-row')].find((r) => r.textContent.includes(label))
    if (!row) throw new Error(`no hardware row for ${label}`)
    return row.querySelectorAll('input')   // [instance, cpu, ram, disk]
  }

  it('sizes against ECH instance configurations by default, snapping RAM to the ladder', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))

    // the documented Elastic Cloud configs prefill the table (default: AWS)
    expect(sizingField('Provider').value).toBe('aws')
    expect(hwInputs('Hot tier')[0].value).toBe('aws.es.datahot.i8g')
    expect(hwInputs('Cold tier')[0].value).toBe('aws.es.datacold.i3en')
    expect(hwInputs('Masters')[0].value).toBe('aws.es.master.c8gd')

    // ECH has no 20 GB node: the tier lands on 30 GB rungs and scales out
    // (enough ingest that the hot tier is sized by data, not its HA floor)
    fireEvent.change(sizingField('Ingest'), { target: { value: '5000' } })
    const hotNodesBefore = Number(root.querySelector('.ew-modal-preview b').textContent.split(' ')[0])
    fireEvent.change(hwInputs('Hot tier')[2], { target: { value: '20' } })
    expect(Number(root.querySelector('.ew-modal-preview b').textContent.split(' ')[0]))
      .toBeGreaterThan(hotNodesBefore)

    // a manual instance override sticks and lands on the drawn node
    fireEvent.click(sizingField('Logstash'))   // off by default, so switch it on first
    fireEvent.change(hwInputs('Logstash')[0], { target: { value: 'c7g.2xlarge' } })
    fireEvent.click(btn('Draw it'))
    expect(nodeNamed('Hot Tier').textContent).toContain('aws.es.datahot.i8g')
    expect(nodeNamed('Hot Tier').textContent).toContain('30 GB RAM')
    expect(nodeNamed('Logstash').textContent).toContain('c7g.2xlarge')
    expect(nodeNamed('Master Node').textContent).toContain('aws.es.master.c8gd')
  })

  it('narrows hardware to the chosen region', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))

    // Paris offers neither i8g hot nor c8gd masters
    fireEvent.change(sizingField('Region'), { target: { value: 'aws-eu-west-3' } })
    expect(hwInputs('Hot tier')[0].value).toBe('aws.es.datahot.i3en')
    expect(hwInputs('Masters')[0].value).toBe('aws.es.master.c6gd')
    const profileNames = [...sizingField('Hot profile').options].map((o) => o.value)
    expect(profileNames).not.toContain('Storage Optimized')
    expect(profileNames).toContain('Vector Search Optimized')

    fireEvent.click(btn('Draw it'))
    expect(nodeNamed('Hot Tier').textContent).toContain('aws.es.datahot.i3en')
    expect(nodeNamed('Master Node').textContent).toContain('aws.es.master.c6gd')
  })

  it('swaps the hot-tier hardware when a profile is picked', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))

    fireEvent.change(sizingField('Hot profile'), { target: { value: 'CPU Optimized' } })
    expect(hwInputs('Hot tier')[0].value).toBe('aws.es.datahot.c8gd')
    expect(hwInputs('Cold tier')[0].value).toBe('aws.es.datacold.i3en')   // hot-only choice

    fireEvent.click(btn('Draw it'))
    expect(nodeNamed('Hot Tier').textContent).toContain('aws.es.datahot.c8gd')
  })

  it('switches to raw EC2 ladders for self-managed, re-picking on RAM edits', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.change(sizingField('Provider'), { target: { value: 'selfmanaged' } })

    // best-practice picks prefill the table: NVMe hot, dense cold, small masters
    expect(hwInputs('Hot tier')[0].value).toBe('i3en.2xlarge')
    expect(hwInputs('Cold tier')[0].value).toBe('d3en.4xlarge')
    expect(hwInputs('Masters')[0].value).toBe('m6g.large')

    // halving the hot tier's RAM re-picks the instance and grows the node count
    // (enough ingest that the hot tier is sized by data, not its HA floor)
    fireEvent.change(sizingField('Ingest'), { target: { value: '5000' } })
    const hotNodesBefore = Number(root.querySelector('.ew-modal-preview b').textContent.split(' ')[0])
    fireEvent.change(hwInputs('Hot tier')[2], { target: { value: '32' } })
    expect(hwInputs('Hot tier')[0].value).toBe('i3en.xlarge')
    expect(Number(root.querySelector('.ew-modal-preview b').textContent.split(' ')[0]))
      .toBeGreaterThan(hotNodesBefore)

    fireEvent.click(btn('Draw it'))
    expect(nodeNamed('Hot Tier').textContent).toContain('i3en.xlarge')
    expect(nodeNamed('Hot Tier').textContent).toContain('32 GB RAM')
  })

  it('draws only the tier column when the stack pieces are zeroed', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.change(sizingField('Agents'), { target: { value: '0' } })
    fireEvent.change(sizingField('Kibana users'), { target: { value: '0' } })
    expect(sizingField('Logstash').checked).toBe(false)   // already off by default
    fireEvent.click(sizingField('Dedicated masters'))
    fireEvent.click(sizingField('Monitoring cluster'))
    fireEvent.click(btn('Draw it'))

    // tiers plus the object store the frozen tier snapshots into
    expect(root.querySelectorAll('.ew-node')).toHaveLength(4)
    expect(text('.ew-elbl')).toEqual(['ILM', 'ILM', 'snapshots'])
  })

  it('draws dedicated ML nodes only when the machine-learning toggle is on', () => {
    mount()
    // a blank board sized with ML off (the default): no ML node reaches the board
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    expect(sizingField('Machine learning').checked).toBe(false)
    fireEvent.click(btn('Draw it'))
    expect(text('.ew-node').join(' ')).not.toContain('ML Node')

    // a second blank board with ML switched on: the ML node lands with its count
    fireEvent.click(btn(/New board ▾/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.click(sizingField('Machine learning'))
    expect(root.querySelector('.ew-modal-preview').textContent).toContain('Machine learning')
    fireEvent.click(btn('Draw it'))

    const ml = nodeNamed('ML Node')
    expect(ml.textContent).toContain('2 nodes')
    expect(ml.textContent).toContain('aws.es.ml.c5d')
  })

  it('copies quote lines the pricing builder can parse', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })

    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.click(btn('Draw it'))

    fireEvent.click(root.querySelector('.ew-totals'))
    fireEvent.change(reviewField('Licensing'), { target: { value: 'eru' } })
    fireEvent.click(btn('Copy quote lines'))
    expect(writeText).toHaveBeenCalledOnce()

    // the whole deployment bills as one licensed line, not one per tier
    const rows = writeText.mock.calls[0][0].split('\n')
    expect(rows).toHaveLength(1)
    // SKU | Description | Qty | Unit Price | Discount% | Bold label — the 6th
    // column makes a pasted row look like the builder's own template rows.
    const cols = rows[0].split('\t')
    expect(cols).toHaveLength(6)
    expect(cols[0]).toContain('Resource Unit')
    expect(cols[1]).toContain('GB memory')
    expect(Number(cols[2])).toBeGreaterThan(0)
    expect(cols[3]).toBe(String(RU_LIST_PRICE))   // the panel's list price rides along
    expect(cols[5]).toBe('Software Licensing:')
  })

  it('prices the quote line from the panel and totals it the way the builder will', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.click(btn('Draw it'))

    fireEvent.click(root.querySelector('.ew-totals'))
    fireEvent.change(reviewField('Licensing'), { target: { value: 'eru' } })
    fireEvent.change(reviewField('List price'), { target: { value: '10000' } })
    fireEvent.change(reviewField('Discount %'), { target: { value: '25' } })
    fireEvent.click(btn('Send to Pricing'))

    const scenarios = JSON.parse(localStorage.getItem('presentation-scene-config')).sceneMetadata['pricing-rom'].scenarios
    const row = scenarios[scenarios.length - 1].rows[0]
    expect(row.unitPrice).toBe('10000')
    expect(row.discount).toBe('25')

    // (qty x list) less the discount, the same arithmetic the ROM builder runs
    const gross = Number(row.quantity) * 10000
    expect(projectCell(row, 0, {}).lineTotal).toBe(gross - gross * 0.25)
    // and the panel shows that total before anything is sent
    expect(text('.ew-review .ew-ihint').join(' ')).toContain(formatCurrency(gross * 0.75))
  })

  it('sends sized quote lines straight into the Pricing / ROM builder as a new option', () => {
    // a quote already in the deck config must survive the handoff untouched
    const existing = { label: 'Option A', yearLabels: ['Year 1'], rows: [{ sku: 'Existing SKU', quantity: '1', unitPrice: '10' }] }
    localStorage.setItem('presentation-scene-config', JSON.stringify({ sceneMetadata: { 'pricing-rom': { scenarios: [existing] } } }))

    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.click(btn('Draw it'))

    fireEvent.click(root.querySelector('.ew-totals'))
    fireEvent.change(reviewField('Licensing'), { target: { value: 'eru' } })
    fireEvent.click(btn('Send to Pricing'))

    const scenarios = JSON.parse(localStorage.getItem('presentation-scene-config')).sceneMetadata['pricing-rom'].scenarios
    // the original option is preserved and the whiteboard lands as a new one
    expect(scenarios).toHaveLength(2)
    expect(scenarios[0]).toEqual(existing)

    const added = scenarios[1]
    expect(added.label).toContain('Whiteboard')
    // one consolidated licensed line, priced and ready to total
    expect(added.rows).toHaveLength(1)
    expect(added.rows[0].sku).toContain('Resource Unit')
    expect(added.rows[0].descLead).toBe('Software Licensing:')
    expect(added.rows[0].term).toBe('12')
    expect(added.rows[0].unitPrice).toBe(String(RU_LIST_PRICE))
    expect(Number(added.rows[0].quantity)).toBeGreaterThan(0)
    // detail the flat text paste can't carry rides along on the handoff
    expect(added.rows[0].ramGB).toBeGreaterThan(0)
    expect(added.rows[0].nodes).toBeGreaterThan(0)

    expect(root.querySelector('.ew-seednote').textContent).toContain('Sent')
  })

  it('quotes a Cloud deployment in consumption units rather than resource units', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.click(btn('Draw it'))   // default provider is Elastic Cloud on AWS

    fireEvent.click(root.querySelector('.ew-totals'))
    // drawing a Cloud cluster puts the panel on the consumption meter itself
    expect(reviewField('Licensing').value).toBe('ecu')
    // and Cloud has no 64 GB list price to set — the figure is the ECU total
    expect(() => reviewField('List price')).toThrow()

    fireEvent.change(reviewField('ECU total'), { target: { value: '250000' } })
    fireEvent.change(reviewField('Discount %'), { target: { value: '20' } })
    fireEvent.click(btn('Send to Pricing'))

    const scenarios = JSON.parse(localStorage.getItem('presentation-scene-config')).sceneMetadata['pricing-rom'].scenarios
    const row = scenarios[scenarios.length - 1].rows[0]
    expect(row.sku).toContain('Consumption')
    expect(row.quantity).toBe('250000')
    expect(row.unitPrice).toBe('1')   // 1 ECU = $1.00, fixed by Elastic
    expect(projectCell(row, 0, {}).lineTotal).toBe(200000)
  })

  it('leaves Logstash memory out of the licensed resource-unit count', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Build…'))
    fireEvent.change(sizingField('Provider'), { target: { value: 'selfmanaged' } })
    fireEvent.click(sizingField('Logstash'))   // off by default; the hint only exists with it drawn
    fireEvent.click(btn('Draw it'))

    fireEvent.click(root.querySelector('.ew-totals'))
    const hints = text('.ew-review .ew-ihint').join(' ')
    expect(hints).toContain('Logstash')
    expect(hints).toContain('information only')
  })

  it('writes the board up as an editable follow-up note via Bedrock', async () => {
    localStorage.setItem('ew-aws-key-id', 'AKIDEXAMPLE')
    localStorage.setItem('ew-aws-secret', 'test-secret')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output: { message: { content: [{ text: 'The cluster ingests through Logstash.' }] } } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    mount()
    fireEvent.click(root.querySelector('.ew-totals'))
    fireEvent.click(btn('✦ Write it up'))

    // it asks what to write first, and sends nothing until that's answered
    expect(root.querySelector('.ew-modal-h b').textContent).toBe('Write it up')
    expect(root.querySelectorAll('.ew-genre').length).toBe(5)
    expect(fetchMock).not.toHaveBeenCalled()

    pickGenre('Follow-up note')
    await vi.waitFor(() => expect(root.querySelector('.ew-modal textarea')).toBeTruthy())
    expect(root.querySelector('.ew-modal-h b').textContent).toBe('Follow-up note')
    expect(root.querySelector('.ew-genre')).toBeNull()
    expect(root.querySelector('.ew-modal textarea').value).toBe('The cluster ingests through Logstash.')

    // a signed Converse call: right endpoint, SigV4 headers, board facts, no tools
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('bedrock-runtime.us-east-1.amazonaws.com')
    expect(url).toContain('/converse')
    expect(opts.headers.authorization).toContain('AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/')
    const sent = JSON.parse(opts.body)
    expect(sent.messages[0].content[0].text).toContain('BOARD: My board')
    expect(sent.system[0].text).toContain('solutions architect')
    expect(sent.toolConfig).toBeUndefined()

    vi.unstubAllGlobals()
  })

  it('applies an AI tool payload with props, a below section, and a zone-pinned edge', async () => {
    localStorage.setItem('ew-aws-key-id', 'AKIDEXAMPLE')
    localStorage.setItem('ew-aws-secret', 'test-secret')
    const payload = {
      message: 'built',
      sections: [
        { id: 'cluster1', template: 'cluster', fill: { tiers: ['hot', 'frozen'], objectStorage: true },
          props: { hot: { nodes: 7, mem: 64 } } },
        { id: 'user1', template: 'userSpace', fill: { consumers: ['kibana', 'users'] } },
        { id: 'mon1', template: 'management', below: 'user1', fill: { tools: ['monitoring'] } },
      ],
      edges: [{ source: 'cluster1', target: 'mon1', label: 'stack monitoring', sourceZone: true }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output: { message: { content: [{ toolUse: { name: 'edit_whiteboard', input: payload } }] } } }),
    }))

    mount()
    // a blank board so the AI drives the whole first build through applyAI
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    toggleChat()

    const input = root.querySelector('.ew-chat-input')
    fireEvent.change(input, { target: { value: 'draw a SIEM cluster with monitoring' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // the edit is staged first, with what it would do, and the board is untouched
    await vi.waitFor(() => expect(root.querySelector('.ew-apply')).toBeTruthy())
    expect(root.querySelector('.ew-apply b').textContent).toBe('built')
    expect(text('.ew-apply li')[0]).toContain('Adds Elastic Cluster')
    expect(root.querySelectorAll('.ew-node')).toHaveLength(0)

    fireEvent.click(btn('Apply'))
    // the props survived the apply path and landed on the node
    expect(nodeNamed('Hot Tier').textContent).toContain('7 nodes')
    expect(nodeNamed('Hot Tier').textContent).toContain('64 GB RAM')
    expect(text('.ew-node').join(' ')).toContain('Monitoring Cluster')

    // the `below` section tucked directly under the User Space
    const user = zoneBox('User Space'), mon = zoneBox('Management Components')
    expect(mon.x).toBe(user.x)
    expect(mon.y).toBeGreaterThan(user.y + user.h)

    // the zone-pinned flow leaves the cluster zone box, not the hot tier node
    const cluster = zoneBox('Elastic Production Cluster')
    const start = edgeStart('stack monitoring')
    expect(sideMids(cluster)).toContainEqual(start)
    expect(sideMids(nodeBox('Hot Tier'))).not.toContainEqual(start)

    vi.unstubAllGlobals()
  })

  it('draws two alternatives on side boards in one turn, leaving the active board alone', async () => {
    localStorage.setItem('ew-aws-key-id', 'AKIDEXAMPLE')
    localStorage.setItem('ew-aws-secret', 'test-secret')
    const alt = (name, tiers) => ({ toolUse: { toolUseId: `t-${name}`, name: 'edit_whiteboard',
      input: { message: name, board: name,
               sections: [{ id: 'cl', template: 'cluster', fill: { tiers } }] } } })
    const fetchMock = vi.fn()
      // one model turn asks for both boards in parallel; the next wraps up in prose
      .mockResolvedValueOnce({ ok: true, json: async () => ({ output: { message: { content: [
        alt('Option A — hot only', ['hot']),
        alt('Option B — full tiering', ['hot', 'cold', 'frozen']),
      ] } } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ output: { message: { content: [
        { text: 'Both options are drawn — compare them from the boards menu.' },
      ] } } }) })
    vi.stubGlobal('fetch', fetchMock)

    mount()
    const nodesBefore = root.querySelectorAll('.ew-node').length
    toggleChat()
    const input = root.querySelector('.ew-chat-input')
    fireEvent.change(input, { target: { value: 'build me two architectures so we can compare them' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await vi.waitFor(() => expect(text('.ew-msg').join(' ')).toContain('Both options are drawn'))

    // both boards exist, each with the cluster it asked for
    const byName = (name) => boardIndex().boards.find((b) => b.name === name)
    expect(byName('Option A — hot only')).toBeTruthy()
    expect(byName('Option B — full tiering')).toBeTruthy()
    expect(storedBoard(byName('Option A — hot only').id).nodes.some((n) => n.type === 'tier_hot')).toBe(true)
    expect(storedBoard(byName('Option B — full tiering').id).nodes.some((n) => n.type === 'tier_frozen')).toBe(true)

    // the board on screen didn't move: still active, unchanged, nothing staged
    expect(boardIndex().boards.find((b) => b.id === boardIndex().activeId).name).toBe('My board')
    expect(root.querySelectorAll('.ew-node')).toHaveLength(nodesBefore)
    expect(root.querySelector('.ew-apply')).toBeNull()

    vi.unstubAllGlobals()
  })

  it('offers a retry when the model call fails', async () => {
    localStorage.setItem('ew-aws-key-id', 'AKIDEXAMPLE')
    localStorage.setItem('ew-aws-secret', 'test-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 403, json: async () => ({ message: 'The security token included in the request is invalid.' }),
    }))

    mount()
    fireEvent.click(root.querySelector('.ew-totals'))
    fireEvent.click(btn('✦ Write it up'))
    pickGenre('Follow-up note')
    await vi.waitFor(() => expect(root.querySelector('.ew-modal-bad')).toBeTruthy())

    expect(root.querySelector('.ew-modal-bad').textContent).toContain('security token')
    expect(root.querySelector('.ew-modal-bad').textContent).toContain('Settings ⚙')
    expect(btn('Try again')).toBeTruthy()

    vi.unstubAllGlobals()
  })

  it('loads Bedrock credentials from the dev server\'s ~/.aws/credentials endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => [
        '[default]', 'aws_access_key_id = AKIDDEFAULT', 'aws_secret_access_key = secret-default',
        '[work]', 'aws_access_key_id = AKIDWORK', 'aws_secret_access_key = secret-work',
        'aws_session_token = tok', '[profile work]', 'region = us-west-2',
      ].join('\n'),
    })
    vi.stubGlobal('fetch', fetchMock)

    mount()
    toggleChat()
    fireEvent.click(root.querySelector('.ew-chat-gear'))
    fireEvent.click(btn('Load from ~/.aws/credentials'))
    await vi.waitFor(() => expect(root.querySelector('.ew-awsload select')).toBeTruthy())

    expect(fetchMock).toHaveBeenCalledWith('/__aws/credentials', expect.anything())
    // the default profile is applied first…
    const field = (placeholder) => root.querySelector(`.ew-chat-settings input[placeholder*="${placeholder}"]`)
    expect(field('AKIA').value).toBe('AKIDDEFAULT')
    expect(localStorage.getItem('ew-aws-key-id')).toBe('AKIDDEFAULT')

    // …and the picker switches to another profile, session token and region included
    fireEvent.change(root.querySelector('.ew-awsload select'), { target: { value: 'work' } })
    expect(field('AKIA').value).toBe('AKIDWORK')
    expect(field('STS').value).toBe('tok')
    expect(field('us-east-1').value).toBe('us-west-2')

    vi.unstubAllGlobals()
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
    // four nodes is small enough to draw each instance, named as it was pasted
    expect(imported.nodes.map((n) => n.title)).toEqual(['hot-1', 'master-1', 'master-2', 'master-3'])
    expect(imported.nodes.filter((n) => n.type === 'node_master')).toHaveLength(3)
  })

  it('imports a realistic _cat/nodes paste (request line + explicit hardware columns)', () => {
    mount()
    fireEvent.click(btn(/^File/))
    fireEvent.click(btn('Import a real cluster…'))
    // exactly what an SA copies from Dev Tools: the request line, then the table
    fireEvent.change(root.querySelector('.ew-modal-input'), {
      target: { value: [
        'GET _cat/nodes?v&h=name,node.role,ram.max,disk.total',
        'name        node.role ram.max disk.total',
        'es-hot-1    himr      62.9gb  2tb',
        'es-hot-2    himr      62.9gb  2tb',
        'es-warm-1   wmr       31.4gb  8tb',
        'es-master-1 mr        15.7gb  100gb',
        'es-master-2 mr        15.7gb  100gb',
        'es-master-3 mr        15.7gb  100gb',
      ].join('\n') },
    })
    // the request line didn't break parsing, and the hardware columns landed
    expect(root.querySelector('.ew-modal-preview').textContent).toContain('6 nodes')
    fireEvent.click(btn('Create board'))

    const imported = storedBoard(boardIndex().activeId)
    const hot = imported.nodes.filter((n) => n.type === 'tier_hot')
    expect(hot).toHaveLength(2)
    expect(hot[0].title).toBe('es-hot-1')
    expect(hot[0].props).toMatchObject({ nodes: 1, mem: 63, capacity: '2 TB' })
    // the hot nodes are master-eligible as well, which the roles say outright
    expect(hot[0].props.roles).toContain('master')
    // and the three dedicated masters stay their own boxes — six drawn, six pasted
    expect(imported.nodes.filter((n) => n.type === 'node_master')).toHaveLength(3)
    expect(imported.nodes).toHaveLength(6)
    // the drawn node carries its hardware and roles as chips
    const drawn = nodeNamed('es-hot-1').textContent
    expect(drawn).toContain('63 GB RAM')
    expect(drawn).toContain('2 TB')
    expect(drawn).toContain('data_hot')
  })

  /* ---------- the conversational chat ----------
     The model is mocked one Converse response per turn, so a tool call and the
     narration that follows it are two queued bodies. */
  describe('AI chat', () => {
    afterEach(() => vi.unstubAllGlobals())

    const withCreds = () => {
      localStorage.setItem('ew-aws-key-id', 'AKIDEXAMPLE')
      localStorage.setItem('ew-aws-secret', 'test-secret')
    }
    const say = (text, usage) => ({ output: { message: { content: [{ text }] } }, ...(usage ? { usage } : {}) })
    const callTool = (name, input) =>
      ({ output: { message: { content: [{ toolUse: { toolUseId: 't1', name, input } }] } } })
    const converse = (...bodies) => {
      const fetchMock = vi.fn()
      for (const body of bodies) fetchMock.mockResolvedValueOnce({ ok: true, json: async () => body })
      fetchMock.mockResolvedValue({ ok: true, json: async () => say('ok') })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }
    const ask = (text) => {
      const input = root.querySelector('.ew-chat-input')
      fireEvent.change(input, { target: { value: text } })
      fireEvent.keyDown(input, { key: 'Enter' })
    }
    const withElastic = () => {
      localStorage.setItem('ew-elastic-url', 'https://kb.example.com')
      localStorage.setItem('ew-es-url', 'https://es.example.com')
      localStorage.setItem('ew-elastic-key', 'abc123')
      localStorage.setItem('ew-elastic-agent', 'my-agent')
    }
    /* Bedrock and Kibana are two different hosts, so the mock routes on the
       URL and queues the Bedrock turns in order behind it. */
    const converseVia = (elastic, ...bodies) => {
      const queued = [...bodies]
      const mock = vi.fn(async (url) => {
        if (String(url).includes('agent_builder') || String(url).includes('es.example.com'))
          return elastic(String(url))
        return { ok: true, status: 200, json: async () => (queued.shift() || say('ok')) }
      })
      vi.stubGlobal('fetch', mock)
      return mock
    }
    const agentSays = (response) => async () => ({ ok: true, status: 200, json: async () => ({ response, conversation_id: 'c1' }) })
    const agentDown = () => async () => { throw new TypeError('Failed to fetch') }
    const blankBoard = () => {
      fireEvent.click(btn(/My board/))
      fireEvent.click(btn('+ New blank board'))
    }
    const insertCluster = () => {
      fireEvent.click(btn('+ Elastic Cluster'))
      fireEvent.click(btn('Insert block'))
    }
    const staged = () => root.querySelector('.ew-apply')
    const sentBody = (fetchMock, i) => JSON.parse(fetchMock.mock.calls[i][1].body)
    /* What the previous tool returned, as the model was handed it. The turn it
       arrives in grows with the conversation, so it's found rather than
       indexed. */
    const toolResult = (fetchMock, i) => {
      const messages = sentBody(fetchMock, i).messages
      const block = messages[messages.length - 1].content.find((c) => c.toolResult)
      if (!block) throw new Error(`no tool result in call ${i}`)
      return JSON.parse(block.toolResult.content[0].text)
    }

    it('answers a question in one turn and leaves the board alone', async () => {
      withCreds()
      const fetchMock = converse(say('Three master-eligible nodes, so a quorum survives losing one.',
                                     { cacheReadInputTokens: 4200, cacheWriteInputTokens: 0 }))
      mount()
      const before = root.querySelectorAll('.ew-node').length
      toggleChat()
      ask('how many master nodes do I need?')

      await vi.waitFor(() => expect(text('.ew-msg.ai').join(' ')).toContain('quorum'))
      expect(staged()).toBeNull()
      expect(root.querySelectorAll('.ew-node').length).toBe(before)
      // no tool ran, so there was nothing to report back and no second turn
      expect(fetchMock).toHaveBeenCalledTimes(1)
      // the cache counts confirm the cachePoint is earning its keep
      expect(root.querySelector('.ew-chat-usage').textContent).toContain('4,200')
    })

    it('renders the Markdown a reply arrives in, and only for the model', async () => {
      withCreds()
      converse(say('## What I would change\n\n**Missing pieces**\n\n- No Kibana, so nobody can query it.\n- One data node.'))
      mount()
      toggleChat()
      ask('what would you change *here*?')

      await vi.waitFor(() => expect(root.querySelector('.ew-msg.ai .ew-md-h')).toBeTruthy())
      const reply = root.querySelector('.ew-msg.ai')
      expect(reply.querySelector('.ew-md-h').textContent).toBe('What I would change')
      // a bold-only line is how the model usually labels a section, and reads as one
      expect(reply.querySelector('p strong').textContent).toBe('Missing pieces')
      expect(reply.querySelectorAll('ul li').length).toBe(2)
      expect(reply.textContent).not.toContain('**')
      expect(reply.textContent).not.toContain('##')
      // what the user typed is shown as typed, asterisks and all
      expect(text('.ew-msg.user')[0]).toBe('what would you change *here*?')
      expect(root.querySelector('.ew-msg.user em')).toBeNull()
    })

    /* The knowledge layer is the claim the whole thing rests on: an answer
       should come from a passage someone wrote, and say so. */
    it('answers from the repo corpus and shows what it cited', async () => {
      withCreds()
      const fetchMock = converse(
        callTool('search_knowledge', { query: 'how many master nodes for a quorum' }),
        say('Three, so a majority survives losing one.'))
      mount()
      toggleChat()
      ask('how many masters?')

      await vi.waitFor(() => expect(root.querySelector('.ew-cite')).toBeTruthy())
      // the passages went back to the model, carrying their sources
      const result = toolResult(fetchMock, 1)
      expect(result.found).toBeGreaterThan(0)
      expect(result.results).toContain('Source:')
      expect(result.provider).toBe('the repo corpus')
      // and the reply names them, whether or not the model remembered to
      const cited = text('.ew-cite em')
      expect(cited.length).toBeGreaterThan(0)
      expect(cited.join(' ')).toMatch(/Elastic/)
      // nothing was staged: retrieval answers, it doesn't redraw
      expect(staged()).toBeNull()
    })

    it('says so rather than inventing when the board has no customer document', async () => {
      withCreds()
      const fetchMock = converse(
        callTool('search_knowledge', { query: 'retention', scope: 'customer' }),
        say('Nothing is attached, so I can only go on Elastic guidance.'))
      mount()
      toggleChat()
      ask('what retention did they ask for?')

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      const result = toolResult(fetchMock, 1)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('No documents are attached')
      // no citation line, because nothing was retrieved
      expect(root.querySelector('.ew-cite')).toBeNull()
    })

    it('retrieves the attached document and cites it by name', async () => {
      withCreds()
      const fetchMock = converse(
        callTool('search_knowledge', { query: 'retention requirement', scope: 'customer' }),
        say('They asked for 13 months.'))
      mount()
      attachDoc('Acme RFP', '## Retention\n\nAll audit data must remain searchable for 13 months.')
      toggleChat()
      ask('what retention did they ask for?')

      await vi.waitFor(() => expect(root.querySelector('.ew-cite')).toBeTruthy())
      const result = toolResult(fetchMock, 1)
      expect(result.results).toContain('13 months')
      expect(text('.ew-cite em')).toEqual(['Acme RFP'])
    })

    it('checks the board against an attached document from the Context panel', async () => {
      withCreds()
      const fetchMock = converse(
        callTool('search_knowledge', { query: 'anomaly detection machine learning', scope: 'customer' }),
        say('They asked for anomaly detection and the board has no ML nodes.'))
      mount()
      attachDoc(
        'Acme Requirements',
        '## Analytics\n\nAnomaly detection via machine learning is required.',
        { keepOpen: true },
      )
      fireEvent.click(btn('✦ Check the design against it'))

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      expect(text('.ew-msg.user')[0]).toContain('Check this board against')
      expect(toolResult(fetchMock, 1).results).toMatch(/anomaly detection/i)
    })

    /* "What do you see in that image?" shares no words with what the vision
       model wrote about it, so a keyword miss on the customer scope hands the
       documents over instead of telling the model there's nothing there. */
    it('answers a customer-scope query that matches nothing with the documents themselves', async () => {
      withCreds()
      const fetchMock = converse(
        callTool('search_knowledge', { query: 'zzz nothing shared zzz', scope: 'customer' }),
        say('It shows Kafka feeding Logstash.'))
      mount()
      attachDoc('arch.png', 'Kafka feeds Logstash, which feeds an 8-node hot tier.')
      toggleChat()
      ask('what do you see in the attached image?')

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      const result = toolResult(fetchMock, 1)
      expect(result.results).toContain('Kafka feeds Logstash')
      expect(result.note).toMatch(/Nothing matched the query's words/)
    })

    it('designs from an attached document via the Context panel', async () => {
      withCreds()
      const fetchMock = converse(
        callTool('search_knowledge', { query: 'daily ingest volume GB per day', scope: 'customer' }),
        say('Built to the volume in their document.'))
      mount()
      attachDoc(
        'Acme Requirements',
        '## Data volume\n\nApplication logs: 1,100 GB per day at peak.',
        { keepOpen: true },
      )
      fireEvent.click(btn('✦ Design to this'))

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      expect(text('.ew-msg.user')[0]).toContain('Design to the requirements')
      expect(toolResult(fetchMock, 1).results).toContain('1,100 GB per day')
      expect(text('.ew-cite em')).toEqual(['Acme Requirements'])
    })

    it('reruns the design review for the model and reports the findings', async () => {
      withCreds()
      const fetchMock = converse(callTool('review_board', {}), say('The quorum is what to fix.'))
      mount()
      blankBoard()
      insertCluster()   // a cluster with no master-eligible nodes
      toggleChat()
      ask('what is wrong with this?')

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      const result = toolResult(fetchMock, 1)
      expect(result.clean).toBe(false)
      expect(result.findings.map((f) => f.id)).toContain('masters-missing')
      expect(result.findings[0]).toHaveProperty('detail')
    })

    it('looks integration names up in the catalog rather than inventing them', async () => {
      withCreds()
      const fetchMock = converse(callTool('lookup_integrations', { query: 'apache' }), say('Found them.'))
      mount()
      toggleChat()
      ask('do we have an apache integration?')

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      const result = toolResult(fetchMock, 1)
      const titles = result.integrations.map((i) => i.title)
      expect(titles).toContain('Apache HTTP Server')
      expect(titles).toContain('Apache Tomcat')
    })

    it('tells the model to say so when the catalog has nothing', async () => {
      withCreds()
      const fetchMock = converse(callTool('lookup_integrations', { query: 'zx spectrum' }), say('Nothing for that.'))
      mount()
      toggleChat()
      ask('is there a ZX Spectrum integration?')

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      const result = toolResult(fetchMock, 1)
      expect(result.found).toBe(0)
      expect(result.note).toMatch(/rather than inventing one/)
    })

    it('refuses to price a board that carries no memory figures', async () => {
      withCreds()
      const fetchMock = converse(callTool('quote_deployment', {}), say('Nothing to price yet.'))
      mount()
      blankBoard()
      toggleChat()
      ask('what does this cost?')

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      const result = toolResult(fetchMock, 1)
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/carries no memory figures/)
    })

    it('prices a sized board on the same numbers the capacity panel shows', async () => {
      withCreds()
      const fetchMock = converse(
        callTool('size_deployment', { dailyGB: 2000, provider: 'selfmanaged' }), say('Sized it.'),
        callTool('quote_deployment', {}), say('Priced it.'))
      mount()
      blankBoard()
      toggleChat()
      ask('size this for 2 TB a day')
      await vi.waitFor(() => expect(staged()).toBeTruthy())
      fireEvent.click(btn('Apply'))

      ask('what does that cost at list?')
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
      const result = toolResult(fetchMock, 3)
      expect(result.meter).toContain(`${RU_GB} GB`)
      expect(result.quantity).toBeGreaterThan(0)
      expect(result.derivedFrom).toMatch(/licensed memory/)
      expect(result.caveat).toMatch(/not a quote/)

      // the chat and the Σ panel are the same engine, so they cannot disagree
      fireEvent.click(root.querySelector('.ew-totals'))
      expect(text('.ew-review .ew-ihint').join(' ')).toContain(result.quantity.toLocaleString('en-US'))
    })

    it('refuses to invent a cloud consumption figure', async () => {
      withCreds()
      const fetchMock = converse(callTool('quote_deployment', { model: 'ecu' }), say('I need the ECU figure.'))
      mount()
      toggleChat()
      ask('what does this cost on cloud?')

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      const result = toolResult(fetchMock, 1)
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/can't be derived from the diagram/)
    })

    /* While presenting, the trail is the only thing distinguishing a grounded
       answer from a confident guess. */
    it('shows what ran to produce the answer', async () => {
      withCreds()
      converse(
        callTool('search_knowledge', { query: 'master nodes quorum' }),
        callTool('review_board', {}),
        say('Three masters, and the board is short of them.'))
      mount()
      toggleChat()
      ask('is the quorum right here?')

      await vi.waitFor(() => expect(root.querySelector('.ew-trail')).toBeTruthy())
      expect(text('.ew-trail em')).toEqual(['searched the knowledge base', 'ran the design review'])
    })

    it('marks a tool that failed in the trail rather than hiding it', async () => {
      withCreds()
      converse(callTool('quote_deployment', { model: 'ecu' }), say('I need the figure first.'))
      mount()
      toggleChat()
      ask('cost on cloud?')

      await vi.waitFor(() => expect(root.querySelector('.ew-trail')).toBeTruthy())
      expect(text('.ew-trail em')).toEqual(['priced it at list'])
      expect(root.querySelector('.ew-trail em').className).toBe('bad')
    })

    /* The wait itself is legible: while the model reads a tool's result, the
       live feed already shows the step that ran — and it makes way for the
       trail once the reply lands. The narration turn is held open so the test
       can look at the loop mid-flight. */
    it('streams the steps of the turn while the agent works', async () => {
      withCreds()
      let releaseNarration
      const narration = new Promise((resolve) => { releaseNarration = resolve })
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => callTool('search_knowledge', { query: 'retention' }) })
        .mockReturnValueOnce(narration)
      vi.stubGlobal('fetch', fetchMock)
      mount()
      toggleChat()
      ask('how long can hot retention be?')

      await vi.waitFor(() => {
        const live = root.querySelector('.ew-live')
        expect(live).toBeTruthy()
        expect(live.textContent).toContain('searched the knowledge base — “retention”')
        expect(live.textContent).toContain('Thinking…')
      })

      releaseNarration({ ok: true, json: async () => say('As long as the searches on it stay fast.') })
      await vi.waitFor(() => {
        expect(root.querySelector('.ew-live')).toBeNull()
        expect(root.textContent).toContain('As long as the searches on it stay fast.')
      })
    })

    /* Phase 4: the same question, answered by Elastic instead of the repo —
       and the citation says which, because that difference is the whole
       claim. */
    it('routes retrieval to Agent Builder when Elastic is configured', async () => {
      withCreds()
      withElastic()
      const mock = converseVia(
        agentSays('The frozen tier mounts searchable snapshots from object storage.'),
        callTool('search_knowledge', { query: 'frozen tier' }), say('It reads from object storage.'))
      mount()
      toggleChat()
      ask('how does frozen work?')

      await vi.waitFor(() => expect(root.querySelector('.ew-cite')).toBeTruthy())
      // Kibana got the three headers it insists on, and the agent id
      const kibana = mock.mock.calls.find(([url]) => String(url).includes('agent_builder'))
      expect(kibana[0]).toBe('https://kb.example.com/api/agent_builder/converse')
      expect(kibana[1].headers['kbn-xsrf']).toBe('true')
      expect(kibana[1].headers.Authorization).toBe('ApiKey abc123')
      expect(JSON.parse(kibana[1].body).agent_id).toBe('my-agent')

      // and the reply says Elastic answered, not the repo
      expect(text('.ew-cite em')).toEqual(['Elastic Agent Builder — my-agent'])
      const result = toolResult(mock, 2)
      expect(result.provider).toBe('an Elastic Agent Builder agent')
      expect(result.results).toContain('searchable snapshots')
    })

    it('falls back to the repo corpus when Kibana is unreachable, and says so', async () => {
      withCreds()
      withElastic()
      const mock = converseVia(
        agentDown(),
        callTool('search_knowledge', { query: 'master node quorum' }), say('Three.'))
      mount()
      toggleChat()
      ask('how many masters?')

      await vi.waitFor(() => expect(root.querySelector('.ew-cite')).toBeTruthy())
      const result = toolResult(mock, 2)
      // the answer still arrives, from the repo, and the model is told why
      expect(result.provider).toBe('the repo corpus')
      expect(result.found).toBeGreaterThan(0)
      expect(result.note).toMatch(/Agent Builder was unreachable/)
      expect(text('.ew-cite em').join(' ')).not.toContain('Agent Builder')
    })

    it('keeps the customer\'s documents out of Elastic even when it is configured', async () => {
      withCreds()
      withElastic()
      const mock = converseVia(
        agentSays('should not be asked'),
        callTool('search_knowledge', { query: 'retention', scope: 'customer' }), say('13 months.'))
      mount()
      attachDoc('Acme RFP', '## Retention\n\nAudit data must stay searchable for 13 months.')
      toggleChat()
      ask('what did they ask for?')

      await vi.waitFor(() => expect(root.querySelector('.ew-cite')).toBeTruthy())
      expect(mock.mock.calls.some(([url]) => String(url).includes('agent_builder'))).toBe(false)
      expect(text('.ew-cite em')).toEqual(['Acme RFP'])
    })

    it('discards a staged edit without touching the board', async () => {
      withCreds()
      converse(callTool('edit_whiteboard', { message: 'a cluster',
        sections: [{ id: 'c1', template: 'cluster', fill: { tiers: ['hot'] } }] }), say('Staged it.'))
      mount()
      blankBoard()
      toggleChat()
      ask('draw a hot-only cluster')

      await vi.waitFor(() => expect(staged()).toBeTruthy())
      fireEvent.click(btn('Discard'))
      expect(staged()).toBeNull()
      expect(root.querySelectorAll('.ew-node')).toHaveLength(0)
    })

    it('sizes a deployment with the sizing engine, reporting the defaults it filled in', async () => {
      withCreds()
      // only a volume: everything else comes from SIZING_DEFAULTS
      const fetchMock = converse(callTool('size_deployment', { dailyGB: 2000 }), say('Sized it.'))
      mount()
      blankBoard()
      toggleChat()
      ask('size this for 2 TB a day')

      await vi.waitFor(() => expect(staged()).toBeTruthy())
      expect(text('.ew-apply li').join(' ')).toContain('Hot:')

      // the effective input went back to the model, defaults and all
      const result = toolResult(fetchMock, 1)
      expect(result.effectiveInput).toMatchObject(
        { dailyGB: 2000, provider: 'aws', agents: 100, users: 50, logstash: false })
      expect(result.effectiveInput.days.frozen).toBe(358)
      expect(result.tiers[0]).toMatchObject({ tier: 'hot', instance: 'aws.es.datahot.i8g' })
      expect(result.totalNodes).toBeGreaterThan(0)

      fireEvent.click(btn('Apply'))
      // the same architecture the Build dialog draws, node counts and hardware on it
      const drawn = text('.ew-node').join(' ')
      for (const piece of ['Hot Tier', 'Frozen Tier', 'Kibana', 'Monitoring Cluster'])
        expect(drawn).toContain(piece)
      expect(drawn).not.toContain('Logstash')   // agent-direct unless the customer asks
      expect(nodeNamed('Hot Tier').textContent).toContain('aws.es.datahot.i8g')
      expect(nodeNamed('Kibana').textContent).toContain('2 inst')
    })

    it('resizes the cluster already on the board instead of drawing a second one', async () => {
      withCreds()
      converse(callTool('size_deployment', { dailyGB: 500, provider: 'selfmanaged' }), say('Resized it.'))
      mount()
      blankBoard()
      insertCluster()
      const zonesBefore = text('.ew-zlabel').length
      toggleChat()
      ask('size it for 500 GB a day')

      await vi.waitFor(() => expect(staged()).toBeTruthy())
      expect(staged().querySelector('b').textContent).toMatch(/^Resize .* to \d+ nodes$/)

      fireEvent.click(btn('Apply'))
      // the cluster is the same block, resized in place — no second architecture
      expect(text('.ew-zlabel')).toHaveLength(zonesBefore)
      expect(nodeNamed('Hot Tier').textContent).toContain('i3en')
      expect(text('.ew-zlabel').join(' ')).toContain('500 GB/day')
    })

    it('reveals a staged design step by step when the model sets build steps', async () => {
      withCreds()
      converse(callTool('edit_whiteboard', {
        message: 'in two steps',
        sections: [
          { id: 'c1', template: 'cluster', fill: { tiers: ['hot'] } },
          { id: 'u1', template: 'userSpace', fill: { consumers: ['kibana'] }, step: 1 },
        ],
        edges: [{ source: 'c1', target: 'u1' }],
      }), say('Two steps.'))
      mount()
      blankBoard()
      toggleChat()
      ask('build this up in two steps')

      await vi.waitFor(() => expect(staged()).toBeTruthy())
      fireEvent.click(btn('Apply'))

      const total = root.querySelectorAll('.ew-node').length
      startPresenting()
      expect(root.querySelector('.ew-steps b').textContent).toBe('Base / 1')
      // Kibana is held back until step 1
      expect(root.querySelectorAll('.ew-node').length).toBeLessThan(total)
      fireEvent.click(btn('›'))
      expect(root.querySelectorAll('.ew-node').length).toBe(total)
      expect(text('.ew-node').join(' ')).toContain('Kibana')
    })

    it('hands the review findings to the model behind a cachePoint', async () => {
      withCreds()
      const fetchMock = converse(say('The quorum is the thing to fix.'))
      mount()
      blankBoard()
      insertCluster()   // a cluster with no master-eligible nodes, which the review flags
      fireEvent.click(root.querySelector('.ew-totals'))
      fireEvent.click(btn('✦ Fix the findings'))

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
      const sent = sentBody(fetchMock, 0)
      // static instructions, cachePoint, then the board and its findings
      expect(sent.system).toHaveLength(3)
      expect(sent.system[1]).toEqual({ cachePoint: { type: 'default' } })
      expect(sent.system[2].text).toContain('REVIEW FINDINGS')
      expect(sent.system[2].text).toContain('No master nodes shown')
      expect(sent.messages[0].content[0].text).toContain('Fix the review findings')
      // and the chat opened on the turn it sent
      expect(root.querySelector('.ew-chat')).toBeTruthy()
    })

    it('offers openings that follow the board', () => {
      mount()
      blankBoard()
      toggleChat()
      expect(text('.ew-chat-chips button')).toContain('Design a SIEM log ingest pipeline')

      insertCluster()
      const chips = text('.ew-chat-chips button')
      expect(chips).toContain('Size this for 500 GB/day held for a year')
      expect(chips).toContain('Fix the review findings')
      expect(chips).not.toContain('Design a SIEM log ingest pipeline')
    })

    it('turns an imported cluster into a review and a compared target state', async () => {
      withCreds()
      const fetchMock = converse(say('The tier ratios look off.'), say('Proposed a target.'))
      mount()
      fireEvent.click(btn(/^File/))
      fireEvent.click(btn('Import a real cluster…'))
      fireEvent.change(root.querySelector('.ew-modal-input'), {
        target: { value: 'name node.role\nhot-1 hir\nhot-2 hir\nmaster-1 mr' },
      })
      fireEvent.click(btn('Create board'))

      fireEvent.click(root.querySelector('.ew-totals'))
      fireEvent.click(btn('✦ Review this cluster'))
      await vi.waitFor(() => expect(text('.ew-msg.ai').join(' ')).toContain('tier ratios'))
      // read, not redrawn: the imported board is still the one on screen
      expect(sentBody(fetchMock, 0).system[2].text).toContain('hot-1')
      expect(root.querySelector('.ew-apply')).toBeNull()

      const importedName = btn(/▾$/).textContent
      fireEvent.click(btn('✦ Propose a target state'))
      // the target lands on its own board, already held against the import
      await vi.waitFor(() => expect(root.querySelector('.ew-diff')).toBeTruthy())
      expect(root.querySelector('.ew-diff .ew-review-h b').textContent)
        .toBe(`vs ${importedName.replace(/\s*▾$/, '')}`)
      expect(boardIndex().boards.map((b) => b.name).some((n) => n.includes('target'))).toBe(true)

      // the latest turn carries the current state as facts, since the new board is empty
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      const turns = sentBody(fetchMock, 1).messages
      const proposal = turns[turns.length - 1].content[0].text
      expect(proposal).toContain('Propose a target state')
      expect(proposal).toContain('hot-1')
    })

    it('writes a second artifact from the same board facts', async () => {
      withCreds()
      const fetchMock = converse(say('The follow-up note.'), say('Subject: your Elastic design'))
      mount()
      fireEvent.click(root.querySelector('.ew-totals'))
      fireEvent.click(btn('✦ Write it up'))
      pickGenre('Follow-up note')
      await vi.waitFor(() => expect(root.querySelector('.ew-modal textarea')).toBeTruthy())
      expect(root.querySelector('.ew-modal-h b').textContent).toBe('Follow-up note')

      fireEvent.change(root.querySelector('.ew-modal-h select'), { target: { value: 'email' } })
      expect(root.querySelector('.ew-modal-h b').textContent).toBe('Customer email')
      await vi.waitFor(() =>
        expect(root.querySelector('.ew-modal textarea')?.value).toBe('Subject: your Elastic design'))

      // same facts, different brief
      const [first, second] = [sentBody(fetchMock, 0), sentBody(fetchMock, 1)]
      expect(second.messages[0].content[0].text).toBe(first.messages[0].content[0].text)
      expect(second.system[0].text).not.toBe(first.system[0].text)
      expect(second.system[0].text).toMatch(/subject line/i)
    })

    it('writes the artifact that was chosen, not the default one', async () => {
      withCreds()
      const fetchMock = converse(say('Scope: ingest, cluster, serving.'))
      mount()
      fireEvent.click(root.querySelector('.ew-totals'))
      fireEvent.click(btn('✦ Write it up'))
      pickGenre('SoW outline')

      await vi.waitFor(() => expect(root.querySelector('.ew-modal textarea')).toBeTruthy())
      expect(root.querySelector('.ew-modal-h b').textContent).toBe('SoW outline')
      expect(sentBody(fetchMock, 0).system[0].text).toMatch(/statement of work/i)
    })

    it('sends nothing if the picker is closed without a choice', () => {
      withCreds()
      const fetchMock = converse(say('never asked for'))
      mount()
      fireEvent.click(root.querySelector('.ew-totals'))
      fireEvent.click(btn('✦ Write it up'))
      fireEvent.click(btn('Close'))

      expect(root.querySelector('.ew-modal')).toBeNull()
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  it('moves manual edge bends with a zone drag', async () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('+ Elastic Cluster'))
    const masterRow = [...root.querySelectorAll('.ew-pconf-group')]
      .find((g) => g.querySelector('.ew-pconf-label')?.textContent.trim() === 'Master node')
    fireEvent.click(masterRow.querySelector('input[type=checkbox]'))
    fireEvent.click(btn('Insert block'))

    await vi.waitFor(() => {
      const b = storedBoard(boardIndex().activeId)
      expect(b.edges.some((e) => e.pts?.length)).toBe(true)
    })

    const before = storedBoard(boardIndex().activeId)
    const bent = before.edges.find((e) => e.pts?.length)
    const hotBefore = before.nodes.find((n) => n.type === 'tier_hot')
    const ptsBefore = bent.pts.map((p) => ({ ...p }))

    const label = [...root.querySelectorAll('.ew-zlabel')]
      .find((el) => el.textContent.includes('Elastic Production Cluster'))
    const viewport = root.querySelector('.ew-viewport')
    fireEvent.pointerDown(label, { clientX: 200, clientY: 200, button: 0 })
    fireEvent.pointerMove(viewport, { clientX: 268, clientY: 200 })
    fireEvent.pointerUp(viewport, { clientX: 268, clientY: 200 })

    await vi.waitFor(() => {
      const hotAfter = storedBoard(boardIndex().activeId).nodes.find((n) => n.type === 'tier_hot')
      expect(hotAfter.x).not.toBe(hotBefore.x)
    })

    const after = storedBoard(boardIndex().activeId)
    const hotAfter = after.nodes.find((n) => n.type === 'tier_hot')
    const bentAfter = after.edges.find((e) => e.id === bent.id)
    const dx = hotAfter.x - hotBefore.x
    const dy = hotAfter.y - hotBefore.y
    for (let i = 0; i < ptsBefore.length; i++) {
      expect(bentAfter.pts[i].x - ptsBefore[i].x).toBe(dx)
      expect(bentAfter.pts[i].y - ptsBefore[i].y).toBe(dy)
    }
  })

  it('connects from a chosen port and lands on the target\'s nearest connection point', async () => {
    mount()
    const kibana = nodeNamed('Kibana')
    fireEvent.pointerDown(kibana, { clientX: 200, clientY: 200 })
    fireEvent.pointerUp(kibana, { clientX: 200, clientY: 200 })

    // twelve connection points: the quarter points and the midpoint, four sides
    const ports = [...root.querySelectorAll('.ew-port')]
    expect(ports).toHaveLength(12)

    const k = nodeBox('Kibana'), u = nodeBox('Users')
    // world → client under the default view {x:30, y:20, k:0.85}
    const toClient = (wx, wy) => ({ clientX: wx * 0.85 + 30, clientY: wy * 0.85 + 20 })
    const near = (v, w) => Math.abs(v - w) < 0.01
    // grab the upper port on Kibana's right side (side r, t 0.25) …
    const port = ports.find((p) =>
      near(parseFloat(p.style.left), k.w) && near(parseFloat(p.style.top), k.h * 0.25))
    expect(port).toBeTruthy()
    const viewport = root.querySelector('.ew-viewport')
    fireEvent.pointerDown(port, toClient(k.x + k.w, k.y + k.h * 0.25))
    // … and drop just inside Users' top edge, a quarter of the way across
    const drop = toClient(u.x + u.w * 0.25, u.y + 2)
    fireEvent.pointerMove(viewport, drop)
    fireEvent.pointerUp(viewport, drop)

    let drawn
    await vi.waitFor(() => {
      drawn = storedBoard(boardIndex().activeId).edges.find((e) => e.sa && e.ea)
      expect(drawn).toBeTruthy()
    })
    expect(drawn.sa).toEqual({ side: 'r', t: 0.25 })
    expect(drawn.ea).toEqual({ side: 't', t: 0.25 })

    // the drawn line leaves exactly from the grabbed port
    const starts = [...root.querySelectorAll('.ew-edge')]
      .map((p) => p.getAttribute('d').split(' ').slice(1, 3).map(Number))
    expect(starts.some(([x, y]) => near(x, k.x + k.w) && near(y, k.y + k.h * 0.25))).toBe(true)
  })

  it('reattaches an end of a selected connection by dragging its end dot', async () => {
    mount()
    const toClient = (wx, wy) => ({ clientX: wx * 0.85 + 30, clientY: wy * 0.85 + 20 })
    const near = (v, w) => Math.abs(v - w) < 0.01
    const viewport = root.querySelector('.ew-viewport')

    // draw an anchored line from Kibana's right-side upper port onto Users —
    // the quarter port, so its start point is unlike any auto-routed edge's
    const kibana = nodeNamed('Kibana')
    fireEvent.pointerDown(kibana, { clientX: 200, clientY: 200 })
    fireEvent.pointerUp(kibana, { clientX: 200, clientY: 200 })
    const k = nodeBox('Kibana'), u = nodeBox('Users')
    const port = [...root.querySelectorAll('.ew-port')].find((p) =>
      near(parseFloat(p.style.left), k.w) && near(parseFloat(p.style.top), k.h * 0.25))
    fireEvent.pointerDown(port, toClient(k.x + k.w, k.y + k.h * 0.25))
    const firstDrop = toClient(u.x + u.w * 0.25, u.y + 2)
    fireEvent.pointerMove(viewport, firstDrop)
    fireEvent.pointerUp(viewport, firstDrop)

    let drawn
    await vi.waitFor(() => {
      drawn = storedBoard(boardIndex().activeId).edges.find((e) => e.sa && e.ea)
      expect(drawn).toBeTruthy()
    })
    const originalTarget = drawn.e

    // select it by its hit path — the line starts at the grabbed port
    const hit = [...root.querySelectorAll('.ew-edge')]
      .find((p) => {
        const [x, y] = p.getAttribute('d').split(' ').slice(1, 3).map(Number)
        return near(x, k.x + k.w) && near(y, k.y + k.h * 0.25)
      })
      .closest('g').querySelector('.ew-hit')
    fireEvent.pointerDown(hit)

    // two end dots appear; drag the arrow end onto Logstash's left-middle port
    const endDots = [...root.querySelectorAll('.ew-wp-end')]
    expect(endDots).toHaveLength(2)
    const l = nodeBox('Logstash')
    fireEvent.pointerDown(endDots[1], firstDrop)
    const rewire = toClient(l.x + 2, l.y + l.h * 0.5)
    fireEvent.pointerMove(viewport, rewire)
    fireEvent.pointerUp(viewport, rewire)

    await vi.waitFor(() => {
      const moved = storedBoard(boardIndex().activeId).edges.find((e) => e.id === drawn.id)
      expect(moved.e).not.toBe(originalTarget)
      expect(moved.ea).toEqual({ side: 'l', t: 0.5 })
      expect(moved.s).toBe(drawn.s)          // the fixed end stayed put
    })

    // re-anchor on the same node: drag the same end to Logstash's top-quarter port
    const dots = [...root.querySelectorAll('.ew-wp-end')]
    fireEvent.pointerDown(dots[1], rewire)
    const reanchor = toClient(l.x + l.w * 0.25, l.y + 2)
    fireEvent.pointerMove(viewport, reanchor)
    fireEvent.pointerUp(viewport, reanchor)

    await vi.waitFor(() => {
      const moved = storedBoard(boardIndex().activeId).edges.find((e) => e.id === drawn.id)
      expect(moved.ea).toEqual({ side: 't', t: 0.25 })
    })
  })

  /* The customer's own documents, attached to a board. A prospect's RFP is
     sensitive in a way a diagram isn't, so where it goes matters as much as
     what it does. */
  describe('board context', () => {
    it('attaches a pasted document and chunks it into passages', () => {
      mount()
      attachDoc('Acme RFP', '## Retention\n\nThirteen months, searchable.\n\n## Volume\n\nTwo terabytes a day.',
                { keepOpen: true })
      const listed = text('.ew-docs li span')
      expect(listed).toEqual(['Acme RFP'])
      // one passage per heading, which is what makes a citation point somewhere useful
      expect(text('.ew-docs li em')).toEqual(['2 passages'])
    })

    it('attaches an uploaded file through the picker', async () => {
      mount()
      openContext()
      const file = new File(['## Retention\n\nThirteen months, searchable.'], 'acme-rfp.md',
                            { type: 'text/markdown' })
      fireEvent.change(root.querySelector('.ew-modal-foot input[type="file"]'),
                       { target: { files: [file] } })
      await vi.waitFor(() => expect(text('.ew-docs li span')).toEqual(['acme-rfp.md']))
      expect(text('.ew-docs li em')).toEqual(['1 passage'])
    })

    /* PDF with no Elastic configured: parsed by the (stubbed) browser parser,
       and the panel says which machinery did the reading. */
    it('parses an uploaded PDF in the browser when Elastic is not configured', async () => {
      mount()
      openContext()
      const pdf = new File(['%PDF-1.7 fake'], 'acme-rfp.pdf', { type: 'application/pdf' })
      fireEvent.change(root.querySelector('.ew-modal-foot input[type="file"]'),
                       { target: { files: [pdf] } })
      await vi.waitFor(() => expect(text('.ew-docs li span')).toEqual(['acme-rfp.pdf']))
      expect(root.querySelector('.ew-modal-body .ew-ihint').textContent)
        .toMatch(/parsed in this browser/)
    })

    /* PDF with a deployment configured: the attachment processor parses it
       through _simulate — Elastic does the reading, nothing is indexed. */
    it('parses an uploaded PDF through the Elastic attachment processor when configured', async () => {
      localStorage.setItem('ew-es-url', 'https://es.example.com')
      localStorage.setItem('ew-elastic-key', 'abc123')
      const mock = vi.fn(async (url) => {
        if (!String(url).includes('_ingest/pipeline/_simulate')) throw new Error(`unexpected call: ${url}`)
        return { ok: true, status: 200, json: async () => ({ docs: [{ doc: { _source: {
          attachment: { content: '## Retention\n\nThirteen months, searchable.' },
        } } }] }) }
      })
      vi.stubGlobal('fetch', mock)
      mount()
      openContext()
      fireEvent.change(root.querySelector('.ew-modal-foot input[type="file"]'),
                       { target: { files: [new File(['%PDF-1.7 fake'], 'acme-rfp.pdf', { type: 'application/pdf' })] } })

      await vi.waitFor(() => expect(text('.ew-docs li span')).toEqual(['acme-rfp.pdf']))
      expect(text('.ew-docs li em')).toEqual(['1 passage'])
      expect(root.querySelector('.ew-modal-body .ew-ihint').textContent)
        .toMatch(/parsed by your Elastic deployment/)
      const body = JSON.parse(mock.mock.calls[0][1].body)
      expect(body.pipeline.processors[0].attachment.remove_binary).toBe(true)
    })

    /* A mystery binary still gets a sentence saying what to do, not noise. */
    it('turns an unrecognised binary away with paste advice', async () => {
      mount()
      openContext()
      const zip = new File(['PK\u0003\u0004\u0000\u0001\u0002\u0014'], 'export.zip')
      fireEvent.change(root.querySelector('.ew-modal-foot input[type="file"]'),
                       { target: { files: [zip] } })
      await vi.waitFor(() =>
        expect(root.querySelector('.ew-modal-bad')?.textContent).toMatch(/export\.zip.*paste/))
      expect(root.querySelector('.ew-docs')).toBeNull()
    })

    /* An image needs the Jina key; without one the error says so and points
       at settings rather than failing quietly. */
    it('asks for a Jina key before reading an image', async () => {
      mount()
      openContext()
      fireEvent.change(root.querySelector('.ew-modal-foot input[type="file"]'),
                       { target: { files: [new File([new Uint8Array([137, 80])], 'arch.png', { type: 'image/png' })] } })
      await vi.waitFor(() =>
        expect(root.querySelector('.ew-modal-bad')?.textContent).toMatch(/Jina API key/))
      expect(root.querySelector('.ew-docs')).toBeNull()
    })

    it('names an unnamed paste rather than leaving it blank', () => {
      mount()
      attachDoc('', 'Some requirements with no title.', { keepOpen: true })
      expect(text('.ew-docs li span')[0]).toMatch(/Pasted text/)
    })

    it('refuses a document too big for the board to carry', () => {
      mount()
      attachDoc('War and Peace', 'x'.repeat(130_000), { keepOpen: true })
      expect(root.querySelector('.ew-modal-bad').textContent).toMatch(/trim it/)
      expect(root.querySelector('.ew-docs')).toBeNull()
    })

    it('removes a document again', () => {
      mount()
      attachDoc('Acme RFP', 'Thirteen months of retention.', { keepOpen: true })
      expect(root.querySelectorAll('.ew-docs li')).toHaveLength(1)
      fireEvent.click(root.querySelector('.ew-docs li .ew-x'))
      expect(root.querySelector('.ew-docs')).toBeNull()
    })

    it('saves documents with the board and brings them back on a switch', async () => {
      mount()
      attachDoc('Acme RFP', 'Thirteen months of retention.')
      const first = boardIndex().activeId
      await vi.waitFor(() => expect(storedBoard(first).documents).toHaveLength(1))
      expect(storedBoard(first).documents[0].name).toBe('Acme RFP')

      // a new board starts clean…
      fireEvent.click(btn(/My board/))
      fireEvent.click(btn('+ New blank board'))
      openContext()
      expect(root.querySelector('.ew-docs')).toBeNull()
      fireEvent.click(root.querySelector('.ew-modal-h .ew-x'))

      // …and switching back brings the document with it
      fireEvent.click(btn(/New board ▾/))
      fireEvent.click(btn(/My board/))
      openContext()
      expect(text('.ew-docs li span')).toEqual(['Acme RFP'])
    })

    it('keeps a document out of the share link', async () => {
      const writeText = vi.fn().mockResolvedValue()
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
      mount()
      attachDoc('Acme RFP', 'Thirteen months of retention, and a budget of nine hundred thousand.')

      fireEvent.click(btn(/^File/))
      fireEvent.click(btn('Copy share link'))
      await vi.waitFor(() => expect(writeText).toHaveBeenCalled())
      const url = writeText.mock.calls[0][0]
      expect(url).not.toContain('Acme')
      // the diagram still travels; only the customer's document is held back
      const { decodeBoard, boardParamFromHash } = await import('../../utils/whiteboardShare')
      const shared = await decodeBoard(boardParamFromHash(new URL(url).hash))
      expect(shared.nodes.length).toBeGreaterThan(0)
      expect(shared.documents).toBeUndefined()
      expect(JSON.stringify(shared)).not.toContain('nine hundred thousand')
    })
  })

  /* Deal context and the follow-up package: what rides the board beyond the
     diagram, and the one file that leaves the building afterwards. */
  describe('customer details and the follow-up package', () => {
    afterEach(() => vi.unstubAllGlobals())

    const withCreds = () => {
      localStorage.setItem('ew-aws-key-id', 'AKIDEXAMPLE')
      localStorage.setItem('ew-aws-secret', 'test-secret')
    }
    const say = (t) => ({ output: { message: { content: [{ text: t }] } } })
    const converse = (...bodies) => {
      const fetchMock = vi.fn()
      for (const body of bodies) fetchMock.mockResolvedValueOnce({ ok: true, json: async () => body })
      fetchMock.mockResolvedValue({ ok: true, json: async () => say('ok') })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }
    const sentBody = (fetchMock, i) => JSON.parse(fetchMock.mock.calls[i][1].body)
    const ask = (t) => {
      const input = root.querySelector('.ew-chat-input')
      fireEvent.change(input, { target: { value: t } })
      fireEvent.keyDown(input, { key: 'Enter' })
    }

    it('imports pasted edm JSON as customer context and briefs the AI with it', async () => {
      withCreds()
      const fetchMock = converse(say('Designing for Acme.'))
      mount()

      openContext()
      fireEvent.change(root.querySelector('textarea[placeholder^="Paste an edm"]'), {
        target: { value: JSON.stringify({ sa: 'x', scope: 'open', opps: [
          { name: 'Acme Expansion FY27', stage_name: 'Negotiate', amount: 250000,
            close_date: '2027-01-31', owner_name_c: 'Jane AE' }] }) },
      })
      fireEvent.click(btn('Import customer details'))
      expect(root.querySelector('.ew-cust-panel').textContent).toContain('Negotiate')

      // the account arrives by hand — no CLI required for the basics
      const accountRow = [...root.querySelectorAll('.ew-modal .ew-frow')]
        .find((r) => r.querySelector('.ew-flabel').textContent === 'Account')
      fireEvent.change(accountRow.querySelector('input'), { target: { value: 'Acme Corp' } })
      fireEvent.click(root.querySelector('.ew-modal-h .ew-x'))

      toggleChat()
      ask('what should we build?')
      await vi.waitFor(() => expect(text('.ew-msg.ai').join(' ')).toContain('Designing for Acme.'))

      const system = JSON.stringify(sentBody(fetchMock, 0).system)
      expect(system).toContain('CUSTOMER')
      expect(system).toContain('Account: Acme Corp')
      expect(system).toContain('Opportunity: Acme Expansion FY27')
      expect(system).toContain('never volunteer deal value')
    })

    it('packages a follow-up: the model writes the recap, both exits offered', async () => {
      withCreds()
      URL.createObjectURL = vi.fn(() => 'blob:board')
      URL.revokeObjectURL = vi.fn()
      const fetchMock = converse(say('## What we walked through\n\nLogs flow from the agents to the hot tier.'))
      mount()

      fireEvent.click(btn(/^File/))
      fireEvent.click(btn('Follow-up package…'))
      expect(root.querySelector('.ew-modal-hint').textContent).toContain('Packaging')

      // the image capture times out gracefully in jsdom, then the recap lands
      await vi.waitFor(() => expect(root.querySelector('.ew-modal textarea')).toBeTruthy(),
                       { timeout: 5000 })
      expect(root.querySelector('.ew-modal textarea').value).toContain('Logs flow from the agents')
      expect(btn('Download HTML')).toBeTruthy()
      expect(btn('Copy Markdown')).toBeTruthy()

      const body = sentBody(fetchMock, 0)
      expect(JSON.stringify(body.system)).toContain('recap that goes to the customer')
      expect(body.messages[0].content[0].text).toContain('BOARD:')
    })

    it('still packages without Bedrock credentials, saying what is missing', async () => {
      URL.createObjectURL = vi.fn(() => 'blob:board')
      URL.revokeObjectURL = vi.fn()
      vi.stubGlobal('fetch', vi.fn())               // nothing should be called
      mount()

      fireEvent.click(btn(/^File/))
      fireEvent.click(btn('Follow-up package…'))
      await vi.waitFor(() => expect(btn('Download HTML')).toBeTruthy(), { timeout: 5000 })
      expect(root.querySelector('.ew-modal').textContent).toContain('No Bedrock credentials')
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  /* Phase 4/5: the Elastic connection is bring-your-own, browser-direct, and
     the thing most likely to fail on the day is CORS — which the browser
     reports as nothing at all. */
  describe('the Elastic connection', () => {
    afterEach(() => vi.unstubAllGlobals())

    const settingsField = (placeholder) =>
      root.querySelector(`.ew-chat-settings input[placeholder*="${placeholder}"]`)
    /* Idempotent, because a test may already have the chat open. The provider
       blocks are an accordion, so reaching a field means expanding its
       section — pass a label to open one. */
    const openSettings = (section) => {
      if (!root.querySelector('.ew-chat')) toggleChat()
      if (!root.querySelector('.ew-chat-settings')) fireEvent.click(root.querySelector('.ew-chat-gear'))
      if (!section) return
      const head = [...root.querySelectorAll('.ew-sect-h')]
        .find((h) => h.querySelector('b').textContent === section)
      if (head.getAttribute('aria-expanded') !== 'true') fireEvent.click(head)
    }

    it('keeps the endpoint, key, agent and index in this browser', () => {
      mount()
      openSettings('Elastic')
      fireEvent.change(settingsField('kb.us-east-1'), { target: { value: 'https://kb.example.com' } })
      fireEvent.change(settingsField('base64'), { target: { value: 'abc123' } })
      fireEvent.change(settingsField('elastic-ai-agent'), { target: { value: 'my-agent' } })
      fireEvent.change(settingsField('whiteboard-knowledge'), { target: { value: 'kb-index' } })

      expect(localStorage.getItem('ew-elastic-url')).toBe('https://kb.example.com')
      expect(localStorage.getItem('ew-elastic-key')).toBe('abc123')
      expect(localStorage.getItem('ew-elastic-agent')).toBe('my-agent')
      expect(localStorage.getItem('ew-elastic-index')).toBe('kb-index')
    })

    it('defaults the agent id and index rather than leaving them blank', () => {
      mount()
      openSettings('Elastic')
      expect(settingsField('elastic-ai-agent').value).toBe('elastic-ai-agent')
      expect(settingsField('whiteboard-knowledge').value).toBe('whiteboard-knowledge')
    })

    /* The panel is the pre-flight, so what it costs to reach Check AI matters:
       collapsed blocks that still say whether they're configured. */
    it('says which providers are set up without expanding anything', () => {
      localStorage.setItem('ew-aws-key-id', 'AKIDEXAMPLE')
      localStorage.setItem('ew-aws-secret', 'test-secret')
      mount()
      openSettings()

      expect(text('.ew-sect-h b')).toEqual(['Amazon Bedrock', 'Elastic', 'Jina — images'])
      expect(text('.ew-sect-h em')).toEqual(['Key set', 'Off — repo corpus', 'Off — images skip'])
      // nothing expanded, so Check AI is reachable without scrolling past the fields
      expect(root.querySelectorAll('.ew-sect-body')).toHaveLength(0)
      expect(btn('Check AI')).toBeTruthy()
    })

    it('opens on the block that needs filling in when there is no key yet', () => {
      mount()
      openSettings()
      expect(root.querySelectorAll('.ew-sect-body')).toHaveLength(1)
      expect(settingsField('AKIA')).toBeTruthy()
    })

    it('closes one block when the other opens, so the panel stays one screen', () => {
      mount()
      openSettings('Elastic')
      expect(root.querySelectorAll('.ew-sect-body')).toHaveLength(1)
      expect(settingsField('base64')).toBeTruthy()
      expect(settingsField('AKIA')).toBeNull()

      openSettings('Amazon Bedrock')
      expect(root.querySelectorAll('.ew-sect-body')).toHaveLength(1)
      expect(settingsField('base64')).toBeNull()
    })

    it('reports both providers when Check AI passes', async () => {
      localStorage.setItem('ew-aws-key-id', 'AKIDEXAMPLE')
      localStorage.setItem('ew-aws-secret', 'test-secret')
      localStorage.setItem('ew-elastic-url', 'https://kb.example.com')
      localStorage.setItem('ew-es-url', 'https://es.example.com')
      localStorage.setItem('ew-elastic-key', 'abc123')
      vi.stubGlobal('fetch', vi.fn(async (url) => ({
        ok: true,
        status: 200,
        json: async () => (String(url).includes('_count') ? { count: 31 }
          : String(url).includes('agent_builder') ? { response: 'ready' }
            : { output: { message: { content: [{ text: 'ready' }] } } }),
      })))

      mount()
      openSettings()
      fireEvent.click(btn('Check AI'))
      await vi.waitFor(() => expect(root.querySelectorAll('.ew-pf')).toHaveLength(3))
      expect(text('.ew-pf b')).toEqual(['Bedrock', 'Agent Builder', 'Knowledge index'])
      expect([...root.querySelectorAll('.ew-pf')].every((r) => r.className.includes('ok'))).toBe(true)
      expect(text('.ew-pf span').join(' ')).toContain('31 passages')
    })

    /* A blocked preflight arrives as a bare TypeError, so the check has to
       infer it and print the fix. This is the single most valuable thing in
       the panel. */
    it('turns a blocked preflight into the settings that fix it', async () => {
      localStorage.setItem('ew-elastic-url', 'https://kb.example.com')
      localStorage.setItem('ew-elastic-key', 'abc123')
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

      mount()
      openSettings()
      fireEvent.click(btn('Check AI'))
      await vi.waitFor(() => expect(root.querySelector('.ew-pf.bad')).toBeTruthy())
      const cors = root.querySelector('.ew-cors').textContent
      expect(cors).toContain('server.cors.enabled: true')
      expect(cors).toContain(window.location.origin)
    })

    it('separates a bad key from a blocked origin', async () => {
      localStorage.setItem('ew-elastic-url', 'https://kb.example.com')
      localStorage.setItem('ew-elastic-key', 'wrong')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 403, json: async () => ({ message: 'unauthorised' }),
      }))

      mount()
      openSettings()
      fireEvent.click(btn('Check AI'))
      await vi.waitFor(() => expect(root.querySelector('.ew-pf.bad')).toBeTruthy())
      expect(text('.ew-pf span').join(' ')).toMatch(/check the API key/)
      // a 403 is not a CORS problem, so it doesn't print the CORS block
      expect(root.querySelector('.ew-cors')).toBeNull()
    })

    it('pushes the repo corpus into the index, creating it first', async () => {
      localStorage.setItem('ew-elastic-url', 'https://kb.example.com')
      localStorage.setItem('ew-es-url', 'https://es.example.com')
      localStorage.setItem('ew-elastic-key', 'abc123')
      const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) }))
      vi.stubGlobal('fetch', fetchMock)

      mount()
      openSettings()
      fireEvent.click(btn('Push corpus'))
      await vi.waitFor(() => expect(text('.ew-chat-note').join(' ')).toMatch(/Indexed \d+ passages/))

      const [create, bulk] = fetchMock.mock.calls
      expect(create[0]).toBe('https://es.example.com/whiteboard-knowledge')
      expect(create[1].method).toBe('PUT')
      expect(JSON.parse(create[1].body).mappings.properties.content).toEqual({ type: 'semantic_text' })
      expect(bulk[0]).toContain('/_bulk')
      // ndjson, one action line and one document line per passage
      expect(bulk[1].headers['Content-Type']).toBe('application/x-ndjson')
      expect(bulk[1].body.trim().split('\n').length % 2).toBe(0)
    })

    it('only offers to push the board\'s documents once there are some', () => {
      localStorage.setItem('ew-elastic-url', 'https://kb.example.com')
      localStorage.setItem('ew-elastic-key', 'abc123')
      mount()
      openSettings()
      expect(buttons().some((b) => b.textContent.includes('this board’s documents'))).toBe(false)

      attachDoc('Acme RFP', 'Thirteen months of retention.')
      expect(buttons().some((b) => b.textContent.includes('this board’s documents'))).toBe(true)
    })
  })
})
