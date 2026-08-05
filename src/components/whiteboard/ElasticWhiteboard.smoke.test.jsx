// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { webcrypto } from 'node:crypto'
import ElasticWhiteboard from '../ElasticWhiteboard'
import { ThemeProvider } from '../../context/ThemeContext'

/* jsdom's crypto has no SubtleCrypto, which the Bedrock request signer needs */
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

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
    fireEvent.click(btn('Size…'))
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

  it('draws the sizing calculator output as a full architecture', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Size…'))
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
    fireEvent.click(btn('Size…'))
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
    fireEvent.click(btn('Size…'))
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

  const hwInputs = (label) => {
    const row = [...root.querySelectorAll('.ew-hw-row')].find((r) => r.textContent.includes(label))
    if (!row) throw new Error(`no hardware row for ${label}`)
    return row.querySelectorAll('input')   // [instance, cpu, ram, disk]
  }

  it('sizes against ECH instance configurations by default, snapping RAM to the ladder', () => {
    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Size…'))

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
    fireEvent.click(btn('Size…'))

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
    fireEvent.click(btn('Size…'))

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
    fireEvent.click(btn('Size…'))
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
    fireEvent.click(btn('Size…'))
    fireEvent.change(sizingField('Agents'), { target: { value: '0' } })
    fireEvent.change(sizingField('Kibana users'), { target: { value: '0' } })
    fireEvent.click(sizingField('Logstash'))
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
    fireEvent.click(btn('Size…'))
    expect(sizingField('Machine learning').checked).toBe(false)
    fireEvent.click(btn('Draw it'))
    expect(text('.ew-node').join(' ')).not.toContain('ML Node')

    // a second blank board with ML switched on: the ML node lands with its count
    fireEvent.click(btn(/New board ▾/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Size…'))
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
    fireEvent.click(btn('Size…'))
    fireEvent.click(btn('Draw it'))

    fireEvent.click(root.querySelector('.ew-totals'))
    fireEvent.click(btn('Copy quote lines'))
    expect(writeText).toHaveBeenCalledOnce()

    // three tier lines plus the masters/support rollup
    const rows = writeText.mock.calls[0][0].split('\n')
    expect(rows).toHaveLength(4)
    for (const row of rows) {
      // SKU | Description | Qty | Unit Price | Discount% | Bold label — the 6th
      // column makes a pasted row look like the builder's own template rows.
      const cols = row.split('\t')
      expect(cols).toHaveLength(6)
      expect(cols[0]).toContain('Resource Unit')
      expect(Number(cols[2])).toBeGreaterThan(0)
      expect(cols[3]).toBe('')   // unit price left blank for the SA
      expect(cols[5]).toBe('Software Licensing:')
    }
  })

  it('sends sized quote lines straight into the Pricing / ROM builder as a new option', () => {
    // a quote already in the deck config must survive the handoff untouched
    const existing = { label: 'Option A', yearLabels: ['Year 1'], rows: [{ sku: 'Existing SKU', quantity: '1', unitPrice: '10' }] }
    localStorage.setItem('presentation-scene-config', JSON.stringify({ sceneMetadata: { 'pricing-rom': { scenarios: [existing] } } }))

    mount()
    fireEvent.click(btn(/My board/))
    fireEvent.click(btn('+ New blank board'))
    fireEvent.click(btn('Size…'))
    fireEvent.click(btn('Draw it'))

    fireEvent.click(root.querySelector('.ew-totals'))
    fireEvent.click(btn('Send to Pricing'))

    const scenarios = JSON.parse(localStorage.getItem('presentation-scene-config')).sceneMetadata['pricing-rom'].scenarios
    // the original option is preserved and the whiteboard lands as a new one
    expect(scenarios).toHaveLength(2)
    expect(scenarios[0]).toEqual(existing)

    const added = scenarios[1]
    expect(added.label).toContain('Whiteboard')
    expect(added.rows.length).toBeGreaterThan(0)
    expect(added.rows[0].sku).toContain('Resource Unit')
    expect(added.rows[0].descLead).toBe('Software Licensing:')
    expect(added.rows[0].unitPrice).toBe('')   // still awaiting the SA's price
    // detail the flat text paste can't carry rides along on the handoff
    expect(added.rows[0].ramGB).toBeGreaterThan(0)
    expect(added.rows[0].nodes).toBeGreaterThan(0)

    expect(root.querySelector('.ew-seednote').textContent).toContain('Sent')
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
    await vi.waitFor(() => expect(root.querySelector('.ew-modal textarea')).toBeTruthy())

    expect(root.querySelector('.ew-modal-h b').textContent).toBe('Follow-up note')
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
    fireEvent.click(btn('✦ AI'))

    const input = root.querySelector('.ew-chat-input')
    fireEvent.change(input, { target: { value: 'draw a SIEM cluster with monitoring' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // the props survived the apply path and landed on the node
    await vi.waitFor(() => expect(nodeNamed('Hot Tier').textContent).toContain('7 nodes'))
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

  it('offers a retry when the model call fails', async () => {
    localStorage.setItem('ew-aws-key-id', 'AKIDEXAMPLE')
    localStorage.setItem('ew-aws-secret', 'test-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 403, json: async () => ({ message: 'The security token included in the request is invalid.' }),
    }))

    mount()
    fireEvent.click(root.querySelector('.ew-totals'))
    fireEvent.click(btn('✦ Write it up'))
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
    fireEvent.click(btn('✦ AI'))
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
    expect(imported.nodes.find((n) => n.type === 'node_master').props.nodes).toBe(3)
    expect(imported.nodes.find((n) => n.type === 'tier_hot').props.nodes).toBe(1)
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
    const hot = imported.nodes.find((n) => n.type === 'tier_hot')
    expect(hot.props.nodes).toBe(2)
    expect(hot.props.mem).toBe(63)
    expect(hot.props.capacity).toBe('2 TB')
    // the two hot nodes are also master-eligible but only the three dedicated
    // masters are drawn as a master box — counts reconcile with the six pasted
    expect(imported.nodes.find((n) => n.type === 'node_master').props.nodes).toBe(3)
    expect(imported.nodes.find((n) => n.type === 'tier_warm').props.nodes).toBe(1)
    // the drawn node carries its hardware into the inspector chips
    expect(nodeNamed('Hot Tier').textContent).toContain('63 GB RAM')
    expect(nodeNamed('Hot Tier').textContent).toContain('2 TB')
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
})
