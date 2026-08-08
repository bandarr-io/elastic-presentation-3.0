import { describe, it, expect } from 'vitest'
import { buildFollowupHtml, followupMarkdown } from './whiteboardFollowup'

const capacity = { count: 9, cpu: 72, mem: 288, storageTB: 42.5 }
const warnings = [{ title: 'Single master', detail: 'Quorum needs 3.' }]

describe('buildFollowupHtml', () => {
  it('is a self-contained document with the image and recap embedded', () => {
    const html = buildFollowupHtml({
      title: 'Acme SIEM', dateStr: '7 Aug 2026', account: 'Acme Corp',
      pngDataUrl: 'data:image/png;base64,AAA',
      bodyHtml: '<h2>What we walked through</h2><p>Logs flow left to right.</p>',
      capacity, warnings,
    })
    expect(html).toContain('<title>Acme SIEM</title>')
    expect(html).toContain('Acme Corp · 7 Aug 2026')
    expect(html).toContain('src="data:image/png;base64,AAA"')
    expect(html).toContain('Logs flow left to right.')
    expect(html).toContain('42.5 TB')
    expect(html).toContain('Single master')
    expect(html).not.toMatch(/src="http/)             // nothing fetched from anywhere
  })

  it('escapes text fields but trusts the rendered body', () => {
    const html = buildFollowupHtml({
      title: 'A <b>bold</b> & "quoted" name',
      warnings: [{ title: '<script>x</script>', detail: 'a & b' }],
      bodyHtml: '<p>kept as-is</p>',
    })
    expect(html).toContain('A &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot; name')
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;')
    expect(html).toContain('<p>kept as-is</p>')
  })

  it('drops sections it has nothing for', () => {
    const html = buildFollowupHtml({ title: 'Bare board' })
    expect(html).not.toContain('img class="board"')
    expect(html).not.toContain('Capacity at a glance')
    expect(html).not.toContain('Review findings')
  })
})

describe('followupMarkdown', () => {
  it('mirrors the package as plain markdown', () => {
    const md = followupMarkdown({
      title: 'Acme SIEM', dateStr: '7 Aug 2026', account: 'Acme Corp',
      opportunity: 'Acme Expansion FY27',
      bodyMd: '## Decisions\n\n- Warm tier moves to searchable snapshots.',
      capacity, warnings,
    })
    expect(md).toContain('# Acme SIEM')
    expect(md).toContain('_Acme Corp · Acme Expansion FY27 · 7 Aug 2026_')
    expect(md).toContain('- Warm tier moves to searchable snapshots.')
    expect(md).toContain('| Nodes | vCPU | RAM | Storage |')
    expect(md).toContain('| 9 | 72 | 288 GB | 42.5 TB |')
    expect(md).toContain('- **Single master** — Quorum needs 3.')
  })

  it('skips the capacity table when the board has no numbers', () => {
    const md = followupMarkdown({ title: 'T', capacity: { count: 0, tiers: [] } })
    expect(md).not.toContain('Capacity at a glance')
  })
})
