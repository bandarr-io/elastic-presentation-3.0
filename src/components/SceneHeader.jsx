import { useTheme } from '../context/ThemeContext'

// Minor words kept lowercase in Title Case unless they lead/close the title.
const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor',
  'of', 'off', 'on', 'onto', 'or', 'over', 'per', 'so', 'the', 'to', 'up', 'via',
  'vs', 'with', 'yet',
])

// Title-case a single word while preserving brand/acronym casing (any word with
// an uppercase letter beyond the first char — ES|QL, OpenTelemetry, AI, SRE, 5B+).
function titleCaseWord(word, isEdge) {
  if (/[A-Z]/.test(word.slice(1))) return word
  const lower = word.toLowerCase()
  const bare = lower.replace(/[^a-z]/g, '')
  if (!isEdge && MINOR_WORDS.has(bare)) return lower
  return lower.replace(/[a-z]/, (c) => c.toUpperCase())
}

// Convert a heading segment to Title Case, preserving all whitespace (including
// the trailing space that separates the plain and accent segments).
function toTitleCase(str) {
  if (!str || typeof str !== 'string') return str
  const tokens = str.split(/(\s+)/)
  const contentIdx = tokens.reduce((acc, t, i) => (/\S/.test(t) ? [...acc, i] : acc), [])
  const first = contentIdx[0]
  const last = contentIdx[contentIdx.length - 1]
  return tokens.map((t, i) => (/\S/.test(t) ? titleCaseWord(t, i === first || i === last) : t)).join('')
}

/**
 * Standard scene header: eyebrow + two-tone title + subtitle.
 *
 * Centralizes the eyebrow/title/subtitle styling so every scene shares the
 * same type scale and spacing.
 *
 * Props:
 * - eyebrow, titlePlain, titleAccent, subtitle: content (subtitle accepts a node)
 * - reveal: tag each line with the `reveal` class used by anime.js entrances
 * - accentFirst: render the accent segment before the plain segment
 * - subtitleMaxWidth: tailwind max-w-* class for the subtitle
 * - titleMaxWidth: optional tailwind max-w-* class to control title wrapping
 * - align: 'center' (default) or 'left' for document-mode scenes (F-pattern)
 */
function SceneHeader({
  eyebrow,
  titlePlain = '',
  titleAccent = '',
  subtitle,
  reveal = false,
  accentFirst = false,
  subtitleMaxWidth = 'max-w-5xl',
  titleMaxWidth = '',
  align = 'center',
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const r = reveal ? 'reveal ' : ''
  const isLeft = align === 'left'

  const plainSpan = titlePlain && (
    <span className={isDark ? 'text-white' : 'text-elastic-dark-ink'}>{toTitleCase(titlePlain)}</span>
  )
  const accentSpan = titleAccent && (
    <span className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'}>{toTitleCase(titleAccent)}</span>
  )

  const subtitleAlign = isLeft ? '' : 'mx-auto'
  const titleAlignWidth = titleMaxWidth ? `${titleMaxWidth} ${isLeft ? '' : 'mx-auto'}` : ''

  return (
    <div className={`flex-shrink-0 ${isLeft ? 'text-left' : 'text-center'}`}>
      <p className={`${r}text-sm font-semibold uppercase tracking-eyebrow pt-8 mb-4 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
        {eyebrow}
      </p>
      <h2 className={`${r}font-headline text-4xl md:text-5xl font-extrabold leading-headline mb-4 [text-wrap:balance] ${titleAlignWidth}`}>
        {accentFirst ? <>{accentSpan}{plainSpan}</> : <>{plainSpan}{accentSpan}</>}
      </h2>
      {subtitle && (
        <p className={`${r}leading-paragraph text-lg md:text-xl ${subtitleMaxWidth} ${subtitleAlign} pb-6 ${isDark ? 'text-elastic-light-grey' : 'text-elastic-ink'}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default SceneHeader
