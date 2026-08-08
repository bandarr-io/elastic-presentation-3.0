import { describe, it, expect } from 'vitest'
import { parseEdmRows, mergeCustomer, describeCustomer, hasCustomer,
         EMPTY_CUSTOMER, CustomerParseError } from './whiteboardCustomer'

/* Pastes shaped exactly like `edm <cmd> --json` emits: an envelope object
   with the rows under the command's key. */
const oppsPaste = JSON.stringify({
  sa: 'daniel.barr@elastic.co', scope: 'open',
  opps: [
    { name: 'Acme Expansion FY27', stage_name: 'Negotiate', amount: 250000,
      close_date: '2027-01-31', owner_name_c: 'Jane AE', opportunity_id: '006XX' },
    { name: 'Acme Renewal', stage_name: 'Propose', amount: 90000,
      close_date: '2027-06-30', owner_name_c: 'Jane AE', opportunity_id: '006YY' },
  ],
})

const stakeholdersPaste = JSON.stringify({
  target: 'acme',
  stakeholders: [
    { opp: 'Acme Expansion FY27', contact: 'Priya N', title: 'VP Platform',
      role: 'Economic Buyer', is_primary: true },
    { opp: 'Acme Expansion FY27', contact: 'Sam K', title: 'Staff SRE',
      role: 'Champion', is_primary: false },
  ],
})

const installPaste = JSON.stringify({
  target: 'acme',
  installbase: [
    { account: 'Acme Corp', product: 'Elastic Cloud', nodes: 14, version: '8.15',
      acv: 180000, use_case: 'SIEM', renews: '2026-12-01', status: 'Active' },
  ],
})

describe('parseEdmRows', () => {
  it('reads opps out of the --json envelope, first (soonest-closing) row wins', () => {
    const { kind, patch } = parseEdmRows(oppsPaste)
    expect(kind).toBe('opps')
    expect(patch).toMatchObject({ opportunity: 'Acme Expansion FY27', stage: 'Negotiate',
                                  value: 250000, closeDate: '2027-01-31', ae: 'Jane AE' })
  })

  it('recognizes each command by its distinctive columns', () => {
    expect(parseEdmRows(stakeholdersPaste).kind).toBe('stakeholders')
    expect(parseEdmRows(installPaste).kind).toBe('installbase')
    expect(parseEdmRows(JSON.stringify([{ account: 'Acme', opps: 3, pipeline: 500000 }])).kind).toBe('accounts')
    expect(parseEdmRows(JSON.stringify([{ opp: 'X', altify_pct: 45, champion: 'Sam', eb: 'Priya' }])).kind).toBe('meddpicc')
    expect(parseEdmRows(JSON.stringify([{ account: 'Acme', case_no: '01234', sev: '2',
      status: 'Open', age_d: 12, esc: false, subject: 'Slow queries' }])).kind).toBe('health')
    expect(parseEdmRows(JSON.stringify([{ opp: 'X', qual_notes: 'They want frozen tier.' }])).kind).toBe('notes')
  })

  it('accepts a bare rows array and --csv output too', () => {
    const bare = JSON.stringify([{ name: 'X', stage_name: 'Qualify', amount: 1,
                                   close_date: '2027-01-01', owner_name_c: 'AE' }])
    expect(parseEdmRows(bare).kind).toBe('opps')
    const csv = 'opp,contact,title,role,is_primary\n'
      + '"Acme Expansion FY27","Priya N","VP, Platform",Economic Buyer,true\n'
    const { kind, patch } = parseEdmRows(csv)
    expect(kind).toBe('stakeholders')
    expect(patch.stakeholders[0]).toMatchObject({ name: 'Priya N', title: 'VP, Platform', primary: true })
  })

  it('rejects junk and empty result sets with a plain explanation', () => {
    expect(() => parseEdmRows('not json, not csv')).toThrow(CustomerParseError)
    expect(() => parseEdmRows(JSON.stringify({ sa: 'x', 'opps[0]:': [] }))).toThrow(/no rows/i)
    expect(() => parseEdmRows(JSON.stringify([{ foo: 1, bar: 2 }]))).toThrow(/don't look like/i)
  })
})

describe('mergeCustomer', () => {
  it('accumulates successive pastes without clobbering earlier ones', () => {
    let c = mergeCustomer(EMPTY_CUSTOMER, parseEdmRows(oppsPaste).patch)
    c = mergeCustomer(c, parseEdmRows(stakeholdersPaste).patch)
    c = mergeCustomer(c, parseEdmRows(installPaste).patch)
    expect(c.opportunity).toBe('Acme Expansion FY27')   // survived two later pastes
    expect(c.account).toBe('Acme Corp')                 // arrived with the install base
    expect(c.stakeholders).toHaveLength(2)
    expect(c.installBase).toHaveLength(1)
  })

  it('lets a re-paste refresh its own slot but never blank another', () => {
    const c = mergeCustomer({ ...EMPTY_CUSTOMER, account: 'Acme Corp', stakeholders: [{ name: 'Old' }] },
                            { stakeholders: [{ name: 'New' }] })
    expect(c.account).toBe('Acme Corp')
    expect(c.stakeholders).toEqual([{ name: 'New' }])
  })
})

describe('describeCustomer', () => {
  it('renders the whole picture as plain prompt text', () => {
    let c = mergeCustomer(EMPTY_CUSTOMER, parseEdmRows(oppsPaste).patch)
    c = mergeCustomer(c, parseEdmRows(installPaste).patch)
    c = mergeCustomer(c, parseEdmRows(stakeholdersPaste).patch)
    const text = describeCustomer(c)
    expect(text).toContain('Account: Acme Corp')
    expect(text).toContain('Opportunity: Acme Expansion FY27 — stage Negotiate')
    expect(text).toContain('- Elastic Cloud (8.15, 14 nodes, SIEM, renews 2026-12-01, Active)')
    expect(text).toContain('- Priya N (VP Platform, Economic Buyer, primary)')
  })

  it('is empty for an empty customer, and hasCustomer agrees', () => {
    expect(describeCustomer(EMPTY_CUSTOMER)).toBe('')
    expect(hasCustomer(EMPTY_CUSTOMER)).toBe(false)
    expect(hasCustomer({ ...EMPTY_CUSTOMER, account: 'Acme' })).toBe(true)
  })
})
