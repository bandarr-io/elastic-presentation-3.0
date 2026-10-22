import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faVideo,
  faMicrophoneLines,
  faImage,
  faFileLines,
  faMagnifyingGlass,
  faPlay,
  faLayerGroup,
  faArrowRightLong,
  faQuoteLeft,
  faShieldHalved,
  faCloud,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import ClusterMark from '../components/ClusterMark'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { resolveIcon } from '../data/iconOptions'

const MONO = { fontFamily: 'Space Mono, ui-monospace, monospace' }

// Three pages for a ministerial audience: the gap today, the shift, then the
// close that names Elastic and hands over to the live demo.
// Keywords sit inside the visual so the speaker reads prompts, not paragraphs.
export const DEFAULT_BEATS = [
  {
    key: 'today',
    step: 'Today',
    titlePlain: 'Recorded in full. ',
    titleAccent: 'Searchable in name only.',
    subtitle: 'Separate archives for video, audio, images and text. To find one moment, someone still watches the footage.',
    hold: 6500,
  },
  {
    key: 'shift',
    step: 'The shift',
    titlePlain: 'Ask in plain words. ',
    titleAccent: 'Get the moment, with proof.',
    subtitle: 'One question across every format, answered with the clip, the timestamp, and the evidence behind it.',
    hold: 9000,
  },
  {
    key: 'close',
    step: 'Over to the demo',
    titlePlain: 'One Elastic index. ',
    titleAccent: 'Not four products.',
    subtitle: 'Words, meaning, vision, audio, record metadata and access control in one place, this is why the answer can carry its own evidence.',
    hold: 8000,
  },
]

// The close: what makes this Elastic rather than a generic AI claim. Each line
// is a platform capability, not a demo detail.
const DEFAULT_PLATFORM = [
  {
    id: 'index',
    icon: faLayerGroup,
    title: 'Every format, one index',
    desc: 'Words, meaning, vision, audio and record metadata answer the same question.',
  },
  {
    id: 'cite',
    icon: faQuoteLeft,
    title: 'Answers that cite',
    desc: 'Agent Builder replies with the clip and timestamp it actually used.',
  },
  {
    id: 'access',
    icon: faShieldHalved,
    title: 'Cleared eyes only',
    desc: 'Role, document and field-level access on that same index.',
  },
  {
    id: 'choice',
    icon: faCloud,
    title: 'Your cloud, your models',
    desc: 'Any embedding model; serverless, hosted or self-managed.',
  },
]

const DEFAULT_SOURCES = [
  { id: 'video', label: 'Video', icon: faVideo, examples: 'Chamber · Committees · Field cameras' },
  { id: 'audio', label: 'Audio', icon: faMicrophoneLines, examples: 'Hearings · Calls · Interviews' },
  { id: 'image', label: 'Image', icon: faImage, examples: 'Scans · Photos · Screens' },
  { id: 'text', label: 'Text', icon: faFileLines, examples: 'Hansard · Briefs · Case files' },
]

// Real clips from the ASD Cybercrime by the Numbers report in the government
// index, so the slide previews exactly what the demo then shows. Positions are
// the true fraction of that 59-second recording.
const DEFAULT_MOMENTS = [
  { at: '0:08', pos: 14, title: 'The scale, spoken', matched: 'Spoken words' },
  { at: '0:24', pos: 41, title: 'ReportCyber on screen', matched: 'On-screen text' },
  { at: '0:48', pos: 81, title: 'Attributed to ASD’s ACSC', matched: 'Agency on screen' },
]

const DEFAULT_COSTS = [
  { title: 'Hours of review', line: 'Someone scrubs the footage to find one line.' },
  { title: 'Evidence missed', line: 'What was shown on screen is never searched.' },
  { title: 'Slow to brief', line: 'The answer arrives after it was needed.' },
]

// Ministerial keywords (on-slide) and the deeper terms to pivot on if the room
// turns technical. Both are per-beat so the prompt matches the page.
const DEFAULT_KEYWORDS = {
  today: ['Kept, not searched', 'Watch it to find it', 'Four archives, four searches', 'Nothing for AI to stand on'],
  shift: ['Answers, not archives', 'Shows its source', 'One layer, people and AI', 'Your cloud, your models'],
  close: [],
}

const DEFAULT_PIVOTS = {
  today: ['No common index', 'Unstructured & siloed', 'Transcripts catch words only', 'No grounding for AI'],
  shift: [
    'Multimodal embeddings',
    'Hybrid retrieval · kNN + BM25 + RRF',
    'Timestamped clip index',
    'Agent Builder grounding',
    'Role & field-level access',
    'Any model · sovereign inference',
  ],
  close: [
    'One index, many modalities',
    'RRF hybrid retrieval',
    'Agent Builder · MCP',
    'RBAC · document & field level',
    '_inference · any provider',
    'Serverless · hosted · self-managed',
  ],
}

const FRAME_COUNT = 52

function perBeatList(override, defaults, beatKey) {
  if (Array.isArray(override)) return override
  return override?.[beatKey] || defaults[beatKey] || []
}

// A frame lights up when it sits inside a matched moment, and glows faintly
// just outside it, so the strip reads as "these seconds, not that hour".
function frameHeat(pos, moments) {
  return moments.reduce((heat, m) => {
    const distance = Math.abs(pos - m.pos)
    if (distance <= 1.6) return Math.max(heat, 1)
    if (distance <= 4.5) return Math.max(heat, 0.45)
    return heat
  }, 0)
}

function SourceRail({ sources, footer, answered, accent, isDark }) {
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/50' : 'text-elastic-dark-ink/55'

  return (
    <div
      className="reveal rounded-2xl border flex flex-col gap-2 p-4 min-h-0"
      style={{
        borderColor: answered ? `${accent}55` : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(16,28,63,0.12)',
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
      }}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-eyebrow ${mutedText}`}>
        What government already holds
      </p>

      {sources.map((s) => (
        <div key={s.id} className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 transition-colors duration-500"
            style={{
              backgroundColor: answered ? `${accent}1f` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,28,63,0.05)',
              color: answered ? accent : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(16,28,63,0.45)',
            }}
          >
            <FontAwesomeIcon icon={s.icon} />
          </span>
          <div className="min-w-0">
            <p className={`font-headline font-extrabold text-lg leading-none ${headText}`}>{s.label}</p>
            <p className={`text-xs leading-tight truncate ${mutedText}`}>{s.examples}</p>
          </div>
        </div>
      ))}

      <div
        className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2"
        style={{
          backgroundColor: answered ? `${accent}14` : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(16,28,63,0.04)',
        }}
      >
        <FontAwesomeIcon
          icon={answered ? faLayerGroup : faArrowRightLong}
          className="text-xs shrink-0"
          style={{ color: answered ? accent : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(16,28,63,0.4)' }}
        />
        <p
          className="text-xs font-semibold leading-tight"
          style={{ color: answered ? accent : isDark ? 'rgba(255,255,255,0.55)' : 'rgba(16,28,63,0.55)' }}
        >
          {footer}
        </p>
      </div>
    </div>
  )
}

function AskBar({ question, caption, answered, accent, isDark }) {
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'

  return (
    <div
      className="reveal shrink-0 rounded-2xl border flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-500"
      style={{
        borderColor: answered ? `${accent}80` : isDark ? 'rgba(255,255,255,0.14)' : 'rgba(16,28,63,0.14)',
        background: answered
          ? `${accent}0f`
          : isDark
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(255,255,255,0.8)',
      }}
    >
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="text-sm shrink-0"
        style={{ color: answered ? accent : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(16,28,63,0.4)' }}
      />
      <p className={`flex-1 min-w-[260px] text-base md:text-lg font-semibold leading-snug ${headText}`}>
        “{question}”
      </p>
      <span
        className="text-[11px] font-semibold rounded-full px-3 py-1 shrink-0"
        style={{
          ...MONO,
          backgroundColor: answered ? `${accent}1f` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,28,63,0.05)',
          color: answered ? accent : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(16,28,63,0.5)',
        }}
      >
        {caption}
      </span>
    </div>
  )
}

function Filmstrip({ moments, answered, caption, accent, isDark, reduced, playKey }) {
  const sweepRef = useRef(null)
  const trackRef = useRef(null)

  // Unanswered: a search light crawls the archive and finds nothing.
  useEffect(() => {
    if (answered || reduced) return undefined
    const sweep = sweepRef.current
    const track = trackRef.current
    if (!sweep || !track) return undefined
    const anim = animate(sweep, {
      translateX: [0, track.offsetWidth],
      duration: 3200,
      ease: 'inOutQuad',
      loop: true,
      alternate: true,
    })
    return () => anim?.pause?.()
  }, [answered, reduced, playKey])

  const idleFrame = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.12)'

  return (
    <div className="reveal shrink-0">
      {/* Timestamp pins, only once the question has an answer */}
      <div className="relative h-7">
        {answered &&
          moments.map((m) => (
            <span
              key={m.at}
              className="absolute -translate-x-1/2 text-[11px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap"
              style={{ ...MONO, left: `${m.pos}%`, backgroundColor: accent, color: isDark ? '#04140f' : '#ffffff' }}
            >
              {m.at}
            </span>
          ))}
      </div>

      <div
        ref={trackRef}
        className="relative overflow-hidden rounded-xl border flex items-stretch gap-[3px] px-2 py-2 h-[86px]"
        style={{
          borderColor: answered ? `${accent}45` : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(16,28,63,0.12)',
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(16,28,63,0.03)',
        }}
      >
        {Array.from({ length: FRAME_COUNT }).map((_, i) => {
          const pos = ((i + 0.5) / FRAME_COUNT) * 100
          const heat = answered ? frameHeat(pos, moments) : 0
          return (
            <span
              key={i}
              className="flex-1 rounded-[3px] transition-all duration-700"
              style={{
                background: heat ? accent : idleFrame,
                opacity: heat ? 0.35 + heat * 0.65 : 1,
                transform: heat === 1 ? 'scaleY(1)' : 'scaleY(0.72)',
              }}
            />
          )
        })}

        {!answered && (
          <>
            <span
              ref={sweepRef}
              className="absolute top-0 bottom-0 left-0 w-[2px] pointer-events-none"
              style={{ background: accent, opacity: 0.55 }}
              aria-hidden
            />
            <span
              className="absolute inset-0 flex items-center justify-center text-xs font-semibold pointer-events-none"
              style={{ ...MONO, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(16,28,63,0.45)' }}
            >
              somewhere in here
            </span>
          </>
        )}
      </div>

      {answered && caption && (
        <p
          className="pt-1.5 text-center text-[11px]"
          style={{ ...MONO, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(16,28,63,0.45)' }}
        >
          {caption}
        </p>
      )}
    </div>
  )
}

function MomentCards({ moments, accent, isDark }) {
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'

  return (
    <div className="reveal shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
      {moments.map((m) => (
        <div
          key={m.at}
          className="rounded-xl border px-3 py-2.5"
          style={{ borderColor: `${accent}45`, borderLeftWidth: '3px', borderLeftColor: accent, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <FontAwesomeIcon icon={faPlay} className="text-[10px]" style={{ color: accent }} />
            <span className="text-[11px] font-bold" style={{ ...MONO, color: accent }}>{m.at}</span>
          </div>
          <p className={`text-sm font-semibold leading-tight ${headText}`}>{m.title}</p>
          <p className={`text-xs leading-tight mt-0.5 ${mutedText}`}>Matched on {m.matched}</p>
        </div>
      ))}
    </div>
  )
}

function CostCards({ costs, danger, isDark }) {
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'

  return (
    <div className="reveal shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
      {costs.map((c) => (
        <div
          key={c.title}
          className="rounded-xl border px-3 py-2.5"
          style={{ borderColor: `${danger}40`, borderLeftWidth: '3px', borderLeftColor: danger, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)' }}
        >
          <p className={`text-sm font-semibold leading-tight ${headText}`}>{c.title}</p>
          <p className={`text-xs leading-tight mt-0.5 ${mutedText}`}>{c.line}</p>
        </div>
      ))}
    </div>
  )
}

function ClosePage({ platform, outcome, demoCue, accent, isDark }) {
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-center gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {platform.map((p) => (
          <div
            key={p.id}
            className="reveal rounded-2xl border flex flex-col gap-2 p-4"
            style={{
              borderColor: `${accent}45`,
              borderTopWidth: '3px',
              borderTopColor: accent,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
            }}
          >
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: `${accent}1f`, color: accent }}
            >
              <FontAwesomeIcon icon={p.icon} />
            </span>
            <h3 className={`font-headline font-extrabold text-lg leading-tight ${headText}`}>{p.title}</h3>
            <p className={`text-sm leading-snug ${mutedText}`}>{p.desc}</p>
          </div>
        ))}
      </div>

      <div
        className="reveal rounded-2xl border flex items-center gap-4 px-5 py-4"
        style={{
          borderColor: `${accent}45`,
          background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
        }}
      >
        <ClusterMark color={accent} className="w-9 h-9 shrink-0" />
        <p className={`font-headline font-extrabold text-xl md:text-2xl leading-snug ${headText}`}>
          {outcome}
        </p>
      </div>

      <div className="reveal flex justify-center">
        <span
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold"
          style={{ backgroundColor: accent, color: isDark ? '#04140f' : '#ffffff' }}
        >
          <FontAwesomeIcon icon={faPlay} className="text-[11px]" />
          {demoCue}
        </span>
      </div>
    </div>
  )
}

function VideoKnowledgeScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { prefersReducedMotion } = useReducedMotion()
  const rootRef = useRef(null)

  const beats = (metadata.beats || DEFAULT_BEATS).map((b, i) => ({ ...(DEFAULT_BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat] || DEFAULT_BEATS[0]
  const isClose = current.key === 'close'
  const answered = current.key !== 'today'

  const eyebrow = metadata.eyebrow || 'Government · Knowledge From Video'
  const question = metadata.question
    || 'criminals stealing money from Australians online'
  const askCaption = answered
    ? metadata.askCaptionShift || 'answered with evidence'
    : metadata.askCaptionToday || 'someone watches the recordings'
  const sourceCaption = metadata.sourceCaption
    || 'ASD Cybercrime by the Numbers 2024–25 · 59 seconds · 15 clips indexed'
  const railFooter = answered
    ? metadata.railFooterShift || 'One searchable knowledge layer.'
    : metadata.railFooterToday || 'Four archives. Four searches.'
  const sources = (metadata.sources || DEFAULT_SOURCES).map((s, i) => {
    const merged = { ...(DEFAULT_SOURCES[i] || {}), ...s }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_SOURCES[i]?.icon || faVideo) }
  })
  const moments = (metadata.moments || DEFAULT_MOMENTS).map((m, i) => ({ ...(DEFAULT_MOMENTS[i] || {}), ...m }))
  const platform = (metadata.platform || DEFAULT_PLATFORM).map((p, i) => {
    const merged = { ...(DEFAULT_PLATFORM[i] || {}), ...p }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_PLATFORM[i]?.icon || faLayerGroup) }
  })
  const outcome = metadata.outcome
    || 'Answers while the question is still live, evidence that stands up, and one knowledge layer every agency that every assistant can reuse.'
  const demoCue = metadata.demoCue || 'Over to the demo -> one question, real government video'
  const costs = (metadata.costs || DEFAULT_COSTS).map((c, i) => ({ ...(DEFAULT_COSTS[i] || {}), ...c }))
  // Overrides may be per-beat (keyed by beat key) or one flat list for both.
  const keywords = perBeatList(metadata.keywords, DEFAULT_KEYWORDS, current.key)
  const pivots = perBeatList(metadata.pivots, DEFAULT_PIVOTS, current.key)
  const pivotLabel = metadata.pivotLabel || 'Technical pivot'

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const danger = isDark ? '#F04E98' : '#DC2626'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const subtleText = isDark ? 'text-white/45' : 'text-elastic-dark-ink/50'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: prefersReducedMotion ? 1 : 440,
      delay: prefersReducedMotion ? 0 : stagger(60),
      easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey, prefersReducedMotion])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden relative">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 65% 55% at 65% 50%, rgba(72,239,207,0.07) 0%, transparent 58%)'
            : 'radial-gradient(ellipse 65% 55% at 65% 50%, rgba(11,100,221,0.06) 0%, transparent 58%)',
        }}
        aria-hidden
      />

      <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0 relative z-10">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal shrink-0">
            <SceneHeader
              eyebrow={eyebrow}
              titlePlain={current.titlePlain}
              titleAccent={current.titleAccent}
              subtitle={current.subtitle}
            />
          </div>

          {isClose ? (
            <ClosePage
              platform={platform}
              outcome={outcome}
              demoCue={demoCue}
              accent={accent}
              isDark={isDark}
            />
          ) : (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-4">
              <SourceRail
                sources={sources}
                footer={railFooter}
                answered={answered}
                accent={accent}
                isDark={isDark}
              />

              <div className="flex flex-col justify-center gap-3 min-h-0">
                <AskBar
                  question={question}
                  caption={askCaption}
                  answered={answered}
                  accent={accent}
                  isDark={isDark}
                />
                <Filmstrip
                  moments={moments}
                  answered={answered}
                  caption={sourceCaption}
                  accent={accent}
                  isDark={isDark}
                  reduced={prefersReducedMotion}
                  playKey={playKey}
                />
                {answered
                  ? <MomentCards moments={moments} accent={accent} isDark={isDark} />
                  : <CostCards costs={costs} danger={danger} isDark={isDark} />}
              </div>
            </div>
          )}

          {keywords.length > 0 && (
            <div className="reveal shrink-0 flex flex-wrap items-center justify-center gap-2 pt-3">
              {keywords.map((k) => (
                <span
                  key={k}
                  className={`text-sm font-semibold rounded-full border px-3 py-1 ${headText}`}
                  style={{
                    borderColor: answered ? `${accent}66` : isDark ? 'rgba(255,255,255,0.16)' : 'rgba(16,28,63,0.16)',
                    backgroundColor: answered ? `${accent}12` : 'transparent',
                  }}
                >
                  {k}
                </span>
              ))}
            </div>
          )}

          <div className="reveal shrink-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-2">
            <span className={`text-[11px] font-semibold uppercase tracking-eyebrow ${subtleText}`}>
              {pivotLabel}
            </span>
            {pivots.map((p) => (
              <span key={p} className={`text-xs ${subtleText}`} style={MONO}>
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="shrink-0 relative z-20">
          <SceneStepper
            beats={beats}
            beat={beat}
            onGo={goTo}
            onReplay={replay}
            isPlaying={isPlaying}
            onTogglePlay={toggleAutoplay}
          />
        </div>
      </div>
    </div>
  )
}

export default VideoKnowledgeScene
