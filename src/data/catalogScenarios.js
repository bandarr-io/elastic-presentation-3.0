/**
 * Audience scenario packs for search-catalog (How Search Works).
 * Teaching structure is fixed; nouns / examples swap per pack.
 */

export const DEFAULT_CATALOG_SCENARIO_ID = 'dib'

const DIB = {
  id: 'dib',
  label: 'Defense Industrial Base',
  unit: { singular: 'document', plural: 'documents' },
  queryTerm: 'avionics',
  queryTermDisplay: 'AVIONICS',
  // 0-based spine indices for docs 3, 7, 11 (same posting list as the hit term)
  scanHitIndices: [2, 6, 10],
  indexRows: [
    { term: 'antenna', docs: '2, 11' },
    { term: 'avionics', docs: '3, 7, 11', hit: true },
    { term: 'radar', docs: '1, 7' },
    { term: 'sortie', docs: '3, 9' },
    { term: 'wiring', docs: '7, 11' },
  ],
  rawSentence: '"The AVIONICS were FAILING on the sortie!"',
  tokens: [
    { text: 'The', stop: true },
    { text: 'AVIONIC', stem: 'S' },
    { text: 'were', stop: true },
    { text: 'FAIL', stem: 'ING' },
    { text: 'on', stop: true },
    { text: 'the', stop: true },
    { text: 'sortie', stop: false },
  ],
  analyzeLabels: [
    'Break into words',
    'Make them lowercase',
    'Drop the boring words',
    'Trim the endings',
  ],
  scoreDocs: [
    { id: 'Doc 7', h: 100, count: 40, detail: 'avionics ×40', best: true },
    { id: 'Doc 3', h: 36, count: 5, detail: 'avionics ×5' },
    { id: 'Doc 11', h: 19, count: 2, detail: 'avionics ×2' },
  ],
  rarityCoins: [
    { common: 'the', commonNote: 'in every document → worth nothing' },
    { rare: 'avionics', rareNote: 'in 3 documents → worth a lot' },
  ],
  relatedTerm: 'radar',
  shardResults: [
    { name: 'Shard 1', lines: ['d7 · 9.2', 'd3 · 4.1'] },
    { name: 'Shard 2', lines: ['d11 · 3.0'] },
    { name: 'Shard 3', lines: ['d22 · 6.5'] },
  ],
  mergedHits: [
    { label: 'Doc 7', score: '9.2' },
    { label: 'Doc 22', score: '6.5' },
    { label: 'Doc 3', score: '4.1' },
    { label: 'Doc 11', score: '3.0' },
  ],
  closingExample: 'avionics → 3, 7, 11',
  corpusHint: 'tech pubs · specs · maintenance manuals',
}

const GOVERNMENT = {
  id: 'government',
  label: 'Government',
  unit: { singular: 'document', plural: 'documents' },
  queryTerm: 'eligibility',
  queryTermDisplay: 'ELIGIBILITY',
  scanHitIndices: [2, 6, 10],
  indexRows: [
    { term: 'benefit', docs: '2, 11' },
    { term: 'eligibility', docs: '3, 7, 11', hit: true },
    { term: 'regulation', docs: '1, 7' },
    { term: 'filing', docs: '3, 9' },
    { term: 'deadline', docs: '7, 11' },
  ],
  rawSentence: '"The ELIGIBILITY rules were CHANGING this quarter!"',
  tokens: [
    { text: 'The', stop: true },
    { text: 'ELIGIBILITY', stem: '' },
    { text: 'rules', stop: false },
    { text: 'were', stop: true },
    { text: 'CHANG', stem: 'ING' },
    { text: 'this', stop: true },
    { text: 'quarter', stop: false },
  ],
  analyzeLabels: [
    'Break into words',
    'Make them lowercase',
    'Drop the boring words',
    'Trim the endings',
  ],
  scoreDocs: [
    { id: 'Doc 7', h: 100, count: 40, detail: 'eligibility ×40', best: true },
    { id: 'Doc 3', h: 36, count: 5, detail: 'eligibility ×5' },
    { id: 'Doc 11', h: 19, count: 2, detail: 'eligibility ×2' },
  ],
  rarityCoins: [
    { common: 'the', commonNote: 'in every document → worth nothing' },
    { rare: 'eligibility', rareNote: 'in 3 documents → worth a lot' },
  ],
  relatedTerm: 'regulation',
  shardResults: [
    { name: 'Shard 1', lines: ['d7 · 9.2', 'd3 · 4.1'] },
    { name: 'Shard 2', lines: ['d11 · 3.0'] },
    { name: 'Shard 3', lines: ['d22 · 6.5'] },
  ],
  mergedHits: [
    { label: 'Doc 7', score: '9.2' },
    { label: 'Doc 22', score: '6.5' },
    { label: 'Doc 3', score: '4.1' },
    { label: 'Doc 11', score: '3.0' },
  ],
  closingExample: 'eligibility → 3, 7, 11',
  corpusHint: 'policies · FOIA · grant filings · guidance',
}

const COMMERCIAL = {
  id: 'commercial',
  label: 'Commercial',
  unit: { singular: 'document', plural: 'documents' },
  queryTerm: 'refund',
  queryTermDisplay: 'REFUND',
  scanHitIndices: [2, 6, 10],
  indexRows: [
    { term: 'invoice', docs: '2, 11' },
    { term: 'refund', docs: '3, 7, 11', hit: true },
    { term: 'warranty', docs: '1, 7' },
    { term: 'sku', docs: '3, 9' },
    { term: 'ticket', docs: '7, 11' },
  ],
  rawSentence: '"The REFUNDS were PENDING for the order!"',
  tokens: [
    { text: 'The', stop: true },
    { text: 'REFUND', stem: 'S' },
    { text: 'were', stop: true },
    { text: 'PEND', stem: 'ING' },
    { text: 'for', stop: true },
    { text: 'the', stop: true },
    { text: 'order', stop: false },
  ],
  analyzeLabels: [
    'Break into words',
    'Make them lowercase',
    'Drop the boring words',
    'Trim the endings',
  ],
  scoreDocs: [
    { id: 'Doc 7', h: 100, count: 40, detail: 'refund ×40', best: true },
    { id: 'Doc 3', h: 36, count: 5, detail: 'refund ×5' },
    { id: 'Doc 11', h: 19, count: 2, detail: 'refund ×2' },
  ],
  rarityCoins: [
    { common: 'the', commonNote: 'in every document → worth nothing' },
    { rare: 'refund', rareNote: 'in 3 documents → worth a lot' },
  ],
  relatedTerm: 'warranty',
  shardResults: [
    { name: 'Shard 1', lines: ['d7 · 9.2', 'd3 · 4.1'] },
    { name: 'Shard 2', lines: ['d11 · 3.0'] },
    { name: 'Shard 3', lines: ['d22 · 6.5'] },
  ],
  mergedHits: [
    { label: 'Doc 7', score: '9.2' },
    { label: 'Doc 22', score: '6.5' },
    { label: 'Doc 3', score: '4.1' },
    { label: 'Doc 11', score: '3.0' },
  ],
  closingExample: 'refund → 3, 7, 11',
  corpusHint: 'product docs · tickets · knowledge base · contracts',
}

export const CATALOG_SCENARIOS = {
  dib: DIB,
  government: GOVERNMENT,
  commercial: COMMERCIAL,
}

/**
 * Resolve scenario from scene metadata.
 * Order: full `metadata.scenario` object → `scenarioId` lookup → default dib.
 */
export function resolveCatalogScenario(metadata = {}) {
  if (metadata.scenario && typeof metadata.scenario === 'object') {
    const base = CATALOG_SCENARIOS[metadata.scenario.id] || DIB
    return { ...base, ...metadata.scenario, unit: { ...base.unit, ...(metadata.scenario.unit || {}) } }
  }
  const id = metadata.scenarioId || DEFAULT_CATALOG_SCENARIO_ID
  return CATALOG_SCENARIOS[id] || DIB
}

/** Header beats for search-catalog. Nouns come from the audience pack. */
export function buildCatalogBeats(scenario) {
  const s = scenario || DIB
  const u = s.unit.plural
  const term = s.queryTermDisplay || s.queryTerm.toUpperCase()
  return [
    {
      key: 'scan',
      step: 'Scan',
      titlePlain: 'Finding the Word ',
      titleAccent: term,
      subtitle: `Open every ${s.unit.singular}. A million ${u} means a million looks — search engines exist to avoid this.`,
      hold: 20000,
    },
    {
      key: 'invert',
      step: 'Index',
      titlePlain: "Don't open the documents. ",
      titleAccent: 'Look up the word.',
      subtitle: `“${s.queryTerm}” already lists which ${u} contain it. One lookup. Zero ${u} opened.`,
      hold: 20000,
    },
    {
      key: 'analyze',
      step: 'Analyze',
      titlePlain: 'Clean the words ',
      titleAccent: 'so they match.',
      subtitle: `Break them apart, make them simple, drop the noise — so searching “${s.queryTerm}” still finds the variants.`,
      hold: 20000,
    },
    {
      key: 'score',
      step: 'Score',
      titlePlain: 'Which match ',
      titleAccent: 'ranks highest?',
      subtitle: 'Score ≈ how often × how rare. Frequency ranks matches; rarity decides if the word matters.',
      hold: 20000,
    },
    {
      key: 'lucene',
      step: 'Lucene',
      titlePlain: 'All of that ',
      titleAccent: 'is Lucene.',
      subtitle: 'Clean the words. Manage the index. Score the matches. One engine.',
      hold: 20000,
    },
    {
      key: 'shards',
      step: 'Shards',
      titlePlain: 'One Lucene ',
      titleAccent: 'can’t hold it all.',
      subtitle: 'A billion documents break a single engine. Elasticsearch splits the pile into shards — each shard is still a Lucene drawer.',
      hold: 20000,
    },
    {
      key: 'scatter',
      step: 'Scatter',
      titlePlain: 'Ask all three ',
      titleAccent: 'at once.',
      subtitle: 'Elasticsearch fans one query to every shard, then gathers the best hits into one ranked list.',
      hold: 20000,
    },
    {
      key: 'replicas',
      step: 'Replicas',
      titlePlain: 'Keep a ',
      titleAccent: 'spare copy.',
      subtitle: 'Elasticsearch puts every shard in more than one place. If a node dies, a replica takes over — search never stops.',
      hold: 20000,
    },
    {
      key: 'library',
      step: 'Close',
      titlePlain: 'One drawer. ',
      titleAccent: 'Or a catalog?',
      subtitle: 'You’ve seen both. Lucene is the drawer. Elasticsearch is the catalog that runs many of them.',
      hold: 20000,
    },
  ]
}

/** Default presenter notes for search-catalog (audience pack lives here, not on-slide). */
export function catalogSpeakerNotes(scenarioOrId) {
  const scenario = typeof scenarioOrId === 'string'
    ? (CATALOG_SCENARIOS[scenarioOrId] || DIB)
    : (scenarioOrId || DIB)
  return [
    `Audience pack: ${scenario.label}`,
    `Corpus: ${scenario.corpusHint}`,
    `Query term: “${scenario.queryTerm}”`,
    '',
    'Teaching arc: full scan → inverted index → analysis → BM25 → Lucene → Elasticsearch (shards → scatter/gather → replicas) → drawer vs library close.',
    '',
    'Switch packs in Settings → Customizations → Search: How Search Works.',
  ].join('\n')
}
