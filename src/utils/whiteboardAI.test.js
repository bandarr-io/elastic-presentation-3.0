import { describe, it, expect } from 'vitest'
import { summaryPrompt, describeDoc } from './whiteboardAI'
import { TYPES } from '../data/whiteboardTypes'

const totals = {
  count: 8, cpu: 128, mem: 512, storageTB: 40,
  tiers: [{ label: 'Hot', count: 6, storageTB: 12 }, { label: 'Frozen', count: 2, storageTB: 28 }],
}

describe('summaryPrompt', () => {
  it('leads with the board name and its description', () => {
    const prompt = summaryPrompt({ boardName: 'Acme SIEM', board: 'Zones:\n  "Cluster": Hot Tier' })
    expect(prompt.startsWith('BOARD: Acme SIEM')).toBe(true)
    expect(prompt).toContain('"Cluster": Hot Tier')
  })

  it('includes the sizing rollup and the tier breakdown', () => {
    const prompt = summaryPrompt({ board: '', totals })
    expect(prompt).toContain('8 nodes, 128 vCPU, 512 GB RAM')
    expect(prompt).toContain('Hot: 6 nodes, Frozen: 2 nodes')
    expect(prompt).toContain('40.0 TB')
  })

  it('leaves the sizing section out when nothing is sized', () => {
    expect(summaryPrompt({ board: '', totals: { count: 0, tiers: [] } })).not.toContain('SIZING')
    expect(summaryPrompt({ board: '' })).not.toContain('SIZING')
  })

  it('passes the review findings through with their level', () => {
    const prompt = summaryPrompt({
      board: '',
      warnings: [{ level: 'warn', title: 'Only 1 master', detail: 'Needs three.' }],
    })
    expect(prompt).toContain('[warn] Only 1 master: Needs three.')
  })

  it('omits the findings section when the review is clean', () => {
    expect(summaryPrompt({ board: '', warnings: [] })).not.toContain('REVIEW FINDINGS')
  })

  it('names an untitled board rather than leaving a blank', () => {
    expect(summaryPrompt({ board: '' })).toContain('BOARD: Untitled')
  })
})

describe('describeDoc', () => {
  it('reports an empty board plainly', () => {
    expect(describeDoc({}, TYPES)).toBe('(the board is currently empty)')
  })

  it('groups nodes under the zone that contains them', () => {
    const doc = {
      zones: [{ id: 'z', x: 0, y: 0, w: 400, h: 400, label: 'Cluster' }],
      nodes: [{ id: 'n', type: 'tier_hot', x: 10, y: 10 }, { id: 'o', type: 'kibana', x: 900, y: 900 }],
      edges: [{ s: 'n', e: 'o', lbl: 'queries' }],
    }
    const out = describeDoc(doc, TYPES)
    expect(out).toContain('"Cluster": Hot Tier')
    expect(out).toContain('Ungrouped nodes: Kibana')
    expect(out).toContain('Hot Tier -> Kibana (queries)')
  })
})
