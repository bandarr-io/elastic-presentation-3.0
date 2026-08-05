import { describe, it, expect } from 'vitest'
import { parsePaste, projectCell, computeScenario, BLANK_ROW } from './pricing'
import { romRows, romTSV, RU_SKU, RU_LEAD } from './whiteboardSizing'

describe('parsePaste — delimiter detection', () => {
  it('keeps a tab-shaped row whose description contains commas intact', () => {
    // The whiteboard's own descriptions carry commas; a tab paste must not be
    // re-split on them.
    const rows = parsePaste('Enterprise Resource Unit\tHot tier — 6 nodes, 12 TB storage\t6\t\t')
    expect(rows).toHaveLength(1)
    expect(rows[0].sku).toBe('Enterprise Resource Unit')
    expect(rows[0].description).toBe('Hot tier — 6 nodes, 12 TB storage')
    expect(rows[0].quantity).toBe('6')
  })

  it('still parses a genuine 5-column comma paste from a CSV', () => {
    const rows = parsePaste('ERU 64GB,20TB Ingest,85,13400,10')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ sku: 'ERU 64GB', description: '20TB Ingest', quantity: '85', unitPrice: '13400', discount: '10' })
  })

  it('parses a multi-row comma paste with a blank trailing discount', () => {
    const rows = parsePaste('ERU 64GB,20TB Ingest,85,13400,\nFlex Consulting,Services,90,3300')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ quantity: '85', unitPrice: '13400', discount: '' })
    expect(rows[1]).toMatchObject({ sku: 'Flex Consulting', quantity: '90', unitPrice: '3300' })
  })

  it('does not shred a tab-shaped row that lost its tabs and only has commas', () => {
    // Hand-retyped with commas instead of tabs: the description's own commas
    // would otherwise land "12 TB storage" in the quantity column. Because that
    // cell is not clean-numeric, the line stays whole and fails visibly.
    const rows = parsePaste('Enterprise Resource Unit,Hot tier — 6 nodes, 12 TB storage,6,,')
    expect(rows).toHaveLength(1)
    expect(rows[0].sku).toBe('Enterprise Resource Unit,Hot tier — 6 nodes, 12 TB storage,6,,')
    expect(rows[0].quantity).toBe('')
  })

  it('reads the optional 6th column as the bold lead label', () => {
    const rows = parsePaste('ERU 64GB\tHot tier\t6\t\t\tSoftware Licensing:')
    expect(rows[0].descLead).toBe('Software Licensing:')
  })

  it('leaves the bold lead empty for a plain 5-column paste', () => {
    const rows = parsePaste('ERU 64GB\tHot tier\t6\t13400\t10')
    expect(rows[0].descLead).toBe('')
  })

  it('gives each parsed row its own overrides object', () => {
    const rows = parsePaste('A\tone\t1\nB\ttwo\t2')
    expect(rows[0].overrides).not.toBe(rows[1].overrides)
    expect(rows[0].overrides).not.toBe(BLANK_ROW.overrides)
  })
})

describe('parsePaste + romRows round trip', () => {
  it('preserves SKU, description, and quantity through romRows → romTSV → parsePaste', () => {
    const totals = {
      mem: 400,
      tiers: [{ label: 'Hot', count: 6, storageTB: 12, mem: 384 }],
    }
    const rows = romRows(totals)
    const parsed = parsePaste(romTSV(rows))
    expect(parsed).toHaveLength(rows.length)
    parsed.forEach((p, i) => {
      expect(p.sku).toBe(rows[i].sku)
      expect(p.description).toBe(rows[i].description)
      expect(p.quantity).toBe(String(rows[i].quantity))
      expect(p.descLead).toBe(RU_LEAD)
    })
    expect(parsed[0].sku).toBe(RU_SKU)
  })
})

describe('projectCell — priced vs. zero', () => {
  const scenario = { yearLabels: ['Year 1'] }

  it('treats a blank unit price as not priced, not a $0 line', () => {
    const cell = projectCell({ ...BLANK_ROW, quantity: '6', unitPrice: '' }, 0, scenario)
    expect(cell.priced).toBe(false)
    expect(cell.lineTotal).toBe(0)
  })

  it('treats an explicit zero unit price as priced (a real $0)', () => {
    const cell = projectCell({ ...BLANK_ROW, quantity: '6', unitPrice: '0' }, 0, scenario)
    expect(cell.priced).toBe(true)
    expect(cell.lineTotal).toBe(0)
  })

  it('is priced once a unit price is set', () => {
    const cell = projectCell({ ...BLANK_ROW, quantity: '6', unitPrice: '13400' }, 0, scenario)
    expect(cell.priced).toBe(true)
    expect(cell.lineTotal).toBe(80400)
  })
})

describe('computeScenario — unpriced count', () => {
  it('counts real line items still awaiting a unit price', () => {
    const scenario = {
      yearLabels: ['Year 1'],
      rows: [
        { ...BLANK_ROW, sku: RU_SKU, description: 'Hot tier', quantity: '6', unitPrice: '' },
        { ...BLANK_ROW, sku: RU_SKU, description: 'Cold tier', quantity: '2', unitPrice: '13400' },
      ],
    }
    expect(computeScenario(scenario).unpricedCount).toBe(1)
  })

  it('does not count a wholly blank row as awaiting a price', () => {
    const scenario = { yearLabels: ['Year 1'], rows: [{ ...BLANK_ROW }] }
    expect(computeScenario(scenario).unpricedCount).toBe(0)
  })
})
