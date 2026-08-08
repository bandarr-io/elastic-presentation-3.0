/* ============================================================
   whiteboardKnowledge
   Retrieval over the passages the AI is allowed to cite: Elastic's own
   guidance, curated into the repo, and whatever documents the user attached
   to the board.

   The point is provenance. The model can already talk about Elastic from
   training, but nothing it says that way can be checked. Everything here
   comes back carrying a `source`, so a claim in the chat can be traced to a
   passage someone wrote on purpose.

   BM25 over term frequencies, which at this corpus size beats anything more
   elaborate on effort-per-result and — more usefully — needs no dependency,
   no network, and no model. Pure functions over plain data, so it unit tests
   like the rest of src/utils.
   ============================================================ */

/* A passage is { id, title, source, tags, text }. `source` is what gets
   cited, so nothing enters the corpus without one. `tags` carry the scope
   ("elastic" for curated guidance, "customer" for an attached document) plus
   whatever topic labels the author added. */

/* Words carrying no retrieval signal. Deliberately short: an aggressive list
   would strip terms that matter here — "no" in "no replicas", "up" in
   "scale up" — and the IDF weighting already discounts anything common. */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "has",
  "have", "how", "in", "is", "it", "its", "of", "on", "or", "that", "the",
  "their", "then", "there", "these", "they", "this", "to", "was", "were",
  "what", "when", "which", "will", "with", "you", "your",
]);

/* Lowercase alphanumeric terms, keeping the interior punctuation Elastic
   names depend on: `data_hot`, `semantic_text` and `_cat/nodes` have to
   survive as single terms or a query for one matches every passage
   mentioning "data". A lone letter is noise, but a lone digit is not —
   "3 masters" and "7 nodes" are exactly what someone searches for. */
export function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((term) => (term.length > 1 || /[0-9]/.test(term)) && !STOPWORDS.has(term));
}

/* ---------------- chunking ---------------- */

/* Chunk sizes in characters. A passage wants to be small enough that several
   fit in a turn without crowding out the board snapshot, and large enough to
   carry a whole idea — a paragraph or two of prose. */
export const CHUNK_TARGET = 900;
export const CHUNK_MAX = 1600;

const MD_HEADING = /^ {0,3}#{1,6}\s+(.*)$/;
/* A bare line in title case with no terminating punctuation, the way a pasted
   document that isn't Markdown tends to mark its sections. */
const BARE_HEADING = /^[A-Z][^.!?]{2,70}$/;

const isHeading = (line) => {
  const md = MD_HEADING.exec(line);
  if (md) return md[1].trim();
  const bare = line.trim();
  return bare && BARE_HEADING.test(bare) && bare.split(/\s+/).length <= 10 ? bare : null;
};

/* Split prose into paragraphs, each tagged with the heading it fell under, so
   a chunk can be titled by its section rather than by the document alone. */
function paragraphsWithHeadings(text) {
  const out = [];
  let heading = "";
  let buffer = [];
  const flush = () => {
    const body = buffer.join(" ").trim();
    if (body) out.push({ heading, body });
    buffer = [];
  };
  for (const line of String(text ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    if (!line.trim()) { flush(); continue; }
    const found = isHeading(line);
    /* A heading closes the paragraph above it and titles everything below. */
    if (found) { flush(); heading = found; continue; }
    buffer.push(line.trim());
  }
  flush();
  return out;
}

/* Break an over-long paragraph on sentence boundaries. A wall of text with no
   blank lines still has to become passages, and cutting mid-sentence would
   put half a claim in front of the model. */
function splitLong(body) {
  if (body.length <= CHUNK_MAX) return [body];
  const sentences = body.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [body];
  const out = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > CHUNK_TARGET) { out.push(current.trim()); current = ""; }
    current += sentence;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/* Whether a file read as text is really text. PDFs and Office documents pass
   `file.text()` without erroring, but arrive as compressed streams full of
   control characters — attaching that would fill the knowledge base with
   noise the model can't cite. NUL settles it outright; otherwise a sample is
   judged by its share of control characters that no text format uses. */
export function looksBinaryText(text) {
  const sample = String(text ?? "").slice(0, 4000);
  if (!sample) return false;
  if (sample.includes("\u0000")) return true;
  let control = 0;
  for (const ch of sample) {
    const code = ch.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) control++;
  }
  return control > sample.length * 0.02;
}

/* Turn a document into passages: paragraphs grouped under their heading up to
   CHUNK_TARGET, never crossing a heading, never exceeding CHUNK_MAX.

   `meta` supplies what every passage has to carry — an id prefix, the source
   to cite, and the tags that scope it. */
export function chunkDocument(text, { id = "doc", title = "", source = "", tags = [] } = {}) {
  const paragraphs = paragraphsWithHeadings(text);
  const chunks = [];
  let current = null;

  const close = () => { if (current?.text.trim()) chunks.push(current); current = null; };

  for (const { heading, body } of paragraphs) {
    for (const piece of splitLong(body)) {
      const sameSection = current && current.heading === heading;
      if (sameSection && current.text.length + piece.length + 2 <= CHUNK_TARGET) {
        current.text += `\n\n${piece}`;
        continue;
      }
      close();
      current = { heading, text: piece };
    }
  }
  close();

  /* A document made entirely of "headings" — short capitalized lines, which
     is exactly how a vision model transcribes a diagram's labels — must still
     become a passage. Attached-with-0-passages looks attached but is
     invisible to every search, which reads as the AI going blind. */
  if (!chunks.length) {
    const whole = String(text ?? "").replace(/\r\n?/g, "\n").trim();
    for (const piece of splitLong(whole)) if (piece.trim()) chunks.push({ heading: "", text: piece });
  }

  return chunks.map((chunk, i) => ({
    id: `${id}#${i + 1}`,
    title: [title, chunk.heading].filter(Boolean).join(" — ") || title || source,
    source,
    tags,
    text: chunk.text,
  }));
}

/* ---------------- scoring ---------------- */

/* BM25's usual constants: k1 damps the gain from repeating a term, b controls
   how hard a long passage is penalised for its length. */
const K1 = 1.2;
const B = 0.6;
/* A passage containing the query verbatim is almost always the one wanted,
   and term-at-a-time scoring can't see word order on its own. */
const PHRASE_BOOST = 1.6;
/* A term in the title is worth more than one buried in the body. */
const TITLE_WEIGHT = 2;

const termCounts = (terms) => {
  const counts = new Map();
  for (const term of terms) counts.set(term, (counts.get(term) || 0) + 1);
  return counts;
};

/* Tokenise every passage once and record the document frequencies BM25 needs.
   Worth holding onto when the same corpus is searched repeatedly, which is
   what happens across a chat session. */
export function buildIndex(passages = []) {
  const docs = passages.map((passage) => {
    const terms = [
      ...tokenize(passage.title),
      /* the title is counted twice rather than scored separately, which keeps
         one length normalisation instead of two competing ones */
      ...tokenize(passage.title).flatMap((t) => Array(TITLE_WEIGHT - 1).fill(t)),
      ...tokenize(passage.text),
      ...tokenize((passage.tags || []).join(" ")),
    ];
    return { passage, counts: termCounts(terms), length: terms.length, haystack: `${passage.title} ${passage.text}`.toLowerCase() };
  });

  const df = new Map();
  for (const doc of docs) for (const term of doc.counts.keys()) df.set(term, (df.get(term) || 0) + 1);

  const avgLength = docs.length ? docs.reduce((sum, d) => sum + d.length, 0) / docs.length : 0;
  return { docs, df, avgLength, size: docs.length };
}

const idf = (df, size, term) => {
  const n = df.get(term) || 0;
  return Math.log(1 + (size - n + 0.5) / (n + 0.5));
};

function scoreDoc(doc, queryTerms, phrase, index) {
  let score = 0;
  for (const term of queryTerms) {
    const f = doc.counts.get(term);
    if (!f) continue;
    const norm = f + K1 * (1 - B + (B * doc.length) / (index.avgLength || 1));
    score += idf(index.df, index.size, term) * ((f * (K1 + 1)) / norm);
  }
  if (score && phrase && doc.haystack.includes(phrase)) score *= PHRASE_BOOST;
  return score;
}

/* ---------------- retrieval ---------------- */

export const SEARCH_LIMIT = 4;

/* Rank passages against a query. `scope` filters by tag before scoring, which
   is how "only what the customer told us" and "only Elastic's guidance" stay
   separable — a requirement and a recommendation must never be cited as the
   same kind of thing.

   Takes either a passage array or a prebuilt index. Returns passages with
   their score attached, best first, never anything that scored zero. */
export function searchPassages(source, query, { limit = SEARCH_LIMIT, scope } = {}) {
  const queryTerms = tokenize(query);
  if (!queryTerms.length) return [];

  const full = Array.isArray(source) ? buildIndex(source) : source;
  const docs = scope && scope !== "all"
    ? full.docs.filter((doc) => (doc.passage.tags || []).includes(scope))
    : full.docs;
  if (!docs.length) return [];

  /* Rescoring against the filtered subset would make a term's weight depend on
     which scope was asked for; the corpus-wide statistics are the honest ones. */
  const phrase = String(query).trim().toLowerCase();
  return docs
    .map((doc) => ({ ...doc.passage, score: scoreDoc(doc, queryTerms, phrase, full) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/* ---------------- rendering ---------------- */

/* Retrieved passages as the model sees them. Numbered so a reply can refer to
   [1] and mean something, and the source is on its own line so citing it is
   the obvious thing to do. */
export function renderPassages(hits = []) {
  if (!hits.length) return "No passages matched.";
  return hits
    .map((hit, i) => `[${i + 1}] ${hit.title}\nSource: ${hit.source}\n${hit.text}`)
    .join("\n\n");
}

/* The distinct sources behind a set of hits, in the order they were ranked —
   what the citation line under a reply lists. */
export const citedSources = (hits = []) => [...new Set(hits.map((h) => h.source).filter(Boolean))];
