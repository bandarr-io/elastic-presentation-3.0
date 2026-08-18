import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import VectorSpaceCanvas, { ASSETS, buildPoints } from '../components/VectorSpaceCanvas'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt, faArrowRight } from '@fortawesome/free-solid-svg-icons'

const BEATS = [
  {
    key: 'embed',
    step: 'Embed',
    titlePlain: 'Find by Meaning, ',
    titleAccent: 'Not Keywords',
    subtitle: 'Content becomes vectors — similar ideas cluster together so search understands intent.',
    hold: 5200,
  },
  {
    key: 'search',
    step: 'Search',
    titlePlain: 'Ask Naturally. ',
    titleAccent: 'Retrieve What Matters',
    subtitle: 'The query joins the same space, and the nearest neighbors rise to the top.',
    hold: 5600,
  },
]

const DEFAULT_QUERY = 'floating runway for military aircraft'
const POINTS = buildPoints(42)

function VectorSearchScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]

  const [placedCount, setPlacedCount] = useState(0)
  const [vectorizing, setVectorizing] = useState(false)
  const [activeAsset, setActiveAsset] = useState(null)
  const [query, setQuery] = useState('')
  const [queryVisible, setQueryVisible] = useState(false)
  const [queryLanding, setQueryLanding] = useState(false)
  const [knnRevealed, setKnnRevealed] = useState(0)
  const [searchPhase, setSearchPhase] = useState('idle') // idle | typing | embedding | neighbours | done
  const timersRef = useRef([])

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-ink'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const panel = isDark ? 'bg-[#0A1220] border-white/10' : 'bg-white border-elastic-dev-blue/15 shadow-sm'
  const inputCls = isDark
    ? 'bg-black/30 border-white/15 text-white placeholder:text-white/35'
    : 'bg-white border-elastic-dev-blue/20 text-elastic-dark-ink'
  const busy = searchPhase !== 'idle' && searchPhase !== 'done'
  const searchQuery = metadata.query || DEFAULT_QUERY

  const clearTimers = () => {
    timersRef.current.forEach((id) => {
      clearTimeout(id)
      clearInterval(id)
    })
    timersRef.current = []
  }

  const runIngest = () => {
    clearTimers()
    setVectorizing(true)
    setPlacedCount(0)
    setActiveAsset(POINTS[0])
    /* Deliberate placement — slightly quicker so the room still follows. */
    POINTS.forEach((p, i) => {
      const id = setTimeout(() => {
        setActiveAsset(p)
        setPlacedCount(i + 1)
        if (i === POINTS.length - 1) setVectorizing(false)
      }, 350 + i * 520)
      timersRef.current.push(id)
    })
  }

  const KNN_TOTAL = 5

  const startNeighbourReveal = () => {
    setSearchPhase('neighbours')
    for (let i = 1; i <= KNN_TOTAL; i++) {
      timersRef.current.push(setTimeout(() => {
        setKnnRevealed(i)
        if (i === KNN_TOTAL) setSearchPhase('done')
      }, i * 750))
    }
  }

  const startQueryEmbed = () => {
    setSearchPhase('embedding')
    setQueryLanding(false)
    setQueryVisible(false)
    /* Hold on the model, then land the query vector in the space. */
    timersRef.current.push(setTimeout(() => {
      setQueryVisible(true)
      setQueryLanding(true)
      timersRef.current.push(setTimeout(() => {
        setQueryLanding(false)
        startNeighbourReveal()
      }, 1100))
    }, 1400))
  }

  const runSearch = () => {
    if (busy) return
    clearTimers()
    setQuery('')
    setQueryVisible(false)
    setQueryLanding(false)
    setKnnRevealed(0)
    setSearchPhase('typing')

    const full = searchQuery
    let idx = 0
    const id = setInterval(() => {
      idx++
      setQuery(full.slice(0, idx))
      if (idx >= full.length) {
        clearInterval(id)
        /* Brief beat after typing finishes, then embed through the model. */
        timersRef.current.push(setTimeout(() => startQueryEmbed(), 450))
      }
    }, 55)
    timersRef.current.push(id)
  }

  useEffect(() => {
    clearTimers()
    if (beat === 0) {
      setQuery('')
      setQueryVisible(false)
      setQueryLanding(false)
      setKnnRevealed(0)
      setSearchPhase('idle')
      setPlacedCount(0)
      setActiveAsset(null)
      setVectorizing(false)
    } else {
      setPlacedCount(25)
      setVectorizing(false)
      setActiveAsset(POINTS[POINTS.length - 1])
      setQuery('')
      setQueryVisible(false)
      setQueryLanding(false)
      setKnnRevealed(0)
      setSearchPhase('idle')
    }
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, playKey])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 400,
      delay: stagger(45),
      easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey])

  const placedVectors = useMemo(() => {
    if (!placedCount) return []
    /* Newest first so the list grows downward as embeddings land. */
    return POINTS.slice(0, placedCount).reverse()
  }, [placedCount])

  const listRef = useRef(null)
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = 0
  }, [placedCount])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader
              eyebrow={metadata.eyebrow || 'Search · Vector Search'}
              titlePlain={current.titlePlain}
              titleAccent={current.titleAccent}
              subtitle={current.subtitle}
            />
          </div>

          <div className="flex-1 min-h-0 mt-1 grid grid-cols-1 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.45fr)] gap-4">
            <div className={`reveal rounded-2xl border p-4 flex flex-col min-h-0 overflow-hidden ${panel}`}>
              <div className={`text-[11px] font-semibold tracking-[0.12em] uppercase mb-3 ${mutedText}`}>
                Data &amp; Ingestion
              </div>

              {beat === 0 && placedCount === 0 && !vectorizing ? (
                <>
                  <div className={`text-xs font-semibold tracking-wider uppercase mb-2 ${mutedText}`}>
                    25 asset images
                  </div>
                  <div className="grid grid-cols-5 gap-2 flex-1 content-start overflow-auto min-h-0">
                    {ASSETS.map((a) => (
                      <div
                        key={a.id}
                        className={`aspect-square rounded-lg flex items-center justify-center text-3xl md:text-4xl border ${
                          isDark ? 'bg-white border-white/20' : 'bg-white border-elastic-dev-blue/10'
                        }`}
                        title={a.label}
                      >
                        <span aria-hidden>{a.icon}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={runIngest}
                    className="mt-3 w-full rounded-xl border py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ borderColor: accent, color: accent }}
                  >
                    <FontAwesomeIcon icon={faBolt} />
                    Vectorize &amp; Ingest Images
                  </button>
                </>
              ) : null}

              {beat === 0 && (vectorizing || placedCount > 0) ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex justify-center mb-3">
                    <div
                      className={`w-16 h-16 rounded-lg border flex items-center justify-center text-3xl ${
                        isDark ? 'bg-white/95 border-white/20' : 'bg-white border-elastic-dev-blue/10'
                      }`}
                    >
                      {activeAsset?.icon || '🖼️'}
                    </div>
                  </div>
                  <div className={`flex justify-center text-sm mb-2 ${mutedText}`}>↓</div>
                  <div
                    className="rounded-xl border px-3 py-2.5 mb-2 text-center"
                    style={{ borderColor: `${accent}88` }}
                  >
                    <div className="text-sm font-bold tracking-wide" style={{ color: accent }}>
                      JINA V5 OMNI MODEL
                    </div>
                    <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                      jina-embeddings-v5-omni-small — first 64 dims
                    </div>
                    <div className="text-xs mt-1.5" style={{ color: accent }}>
                      {vectorizing ? '• • • embedding' : 'embedded'}
                    </div>
                  </div>
                  <div className={`flex justify-center text-sm mb-2 ${mutedText}`}>↓</div>
                  <div className={`text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${mutedText}`}>
                    Vector embeddings → 3D space
                  </div>
                  <div
                    ref={listRef}
                    className={`flex-1 min-h-0 overflow-auto rounded-lg border p-2 font-mono text-[11px] leading-relaxed ${
                    isDark ? 'bg-black/25 border-white/10' : 'bg-elastic-light-grey border-elastic-dev-blue/15 text-elastic-dark-ink'
                  }`}>
                    {placedVectors.map((p) => (
                      <div key={p.id} className="mb-1 truncate">
                        <span className={headText}>{p.label}</span>{' '}
                        <span style={{ color: accent }}>[{p.dims.join(' ')}…]</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold" style={{ color: accent }}>
                      {placedCount} / 25 vectors placed
                    </div>
                    {placedCount === 25 && (
                      <button
                        type="button"
                        onClick={() => goTo(1)}
                        className="rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5"
                        style={{ backgroundColor: accent, color: isDark ? '#0B1628' : '#FFFFFF' }}
                      >
                        Ready for Search
                        <FontAwesomeIcon icon={faArrowRight} />
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {beat === 1 ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex justify-center mb-4">
                    <div
                      className={`w-16 h-16 rounded-lg border flex items-center justify-center text-3xl ${
                        isDark ? 'bg-white/95 border-white/20' : 'bg-white border-elastic-dev-blue/10'
                      }`}
                    >
                      🛳️
                    </div>
                  </div>
                  <div className={`text-[11px] font-semibold tracking-wider uppercase mb-2 ${mutedText}`}>
                    Multimodal search query
                  </div>
                  <div className="flex gap-2 mb-3">
                    <div
                      className={`flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-sm flex items-center ${inputCls}`}
                      aria-label="Search query"
                    >
                      {query ? (
                        <span className="whitespace-pre">
                          {query}
                          {searchPhase === 'typing' && (
                            <span
                              className="inline-block w-[2px] h-[1em] ml-0.5 align-[-0.1em] animate-pulse"
                              style={{ backgroundColor: accent }}
                            />
                          )}
                        </span>
                      ) : (
                        <span className={mutedText}>
                          {searchPhase === 'typing' ? (
                            <span
                              className="inline-block w-[2px] h-[1em] align-[-0.1em] animate-pulse"
                              style={{ backgroundColor: accent }}
                            />
                          ) : (
                            'Click Search to type the query…'
                          )}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={runSearch}
                      disabled={busy}
                      className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
                      style={{ backgroundColor: accent, color: isDark ? '#0B1628' : '#FFFFFF' }}
                    >
                      {searchPhase === 'typing' && 'Typing…'}
                      {searchPhase === 'embedding' && 'Embedding…'}
                      {searchPhase === 'neighbours' && 'Searching…'}
                      {(searchPhase === 'idle' || searchPhase === 'done') && 'Search'}
                    </button>
                  </div>
                  <div className={`rounded-xl border px-3 py-3 flex items-start gap-3 ${
                    isDark ? 'bg-black/25 border-white/10' : 'bg-elastic-light-grey border-elastic-dev-blue/10'
                  }`}>
                    <span className="text-elastic-yellow text-lg leading-none mt-0.5">
                      <FontAwesomeIcon icon={faBolt} />
                    </span>
                    <div>
                      <div className={`text-sm font-bold ${headText}`}>Jina v5 Omni Model</div>
                      <div className={`text-xs mt-0.5 ${mutedText}`}>
                        {searchPhase === 'idle' && 'ready for query → first 64 dims'}
                        {searchPhase === 'typing' && 'waiting for query…'}
                        {searchPhase === 'embedding' && (queryVisible ? 'placing query in vector space…' : '• • • embedding query')}
                        {searchPhase === 'neighbours' && `finding neighbours — ${knnRevealed} / ${KNN_TOTAL}`}
                        {searchPhase === 'done' && 'query → first 64 dims'}
                      </div>
                    </div>
                  </div>
                  {(queryVisible || knnRevealed > 0) && (
                    <p className={`reveal text-xs leading-relaxed mt-4 ${mutedText}`}>
                      {searchPhase === 'embedding' && <>Query embedded — landing in vector space.</>}
                      {searchPhase === 'neighbours' && (
                        <>Query &ldquo;{searchQuery}&rdquo; → revealing nearest neighbours ({knnRevealed} / {KNN_TOTAL}).</>
                      )}
                      {searchPhase === 'done' && (
                        <>Query &ldquo;{searchQuery}&rdquo; → top {KNN_TOTAL} nearest neighbours shown. Dotted lines = cosine distance in 64-dim space.</>
                      )}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="reveal min-h-0 flex flex-col">
              <div className={`text-[11px] font-semibold tracking-[0.12em] uppercase mb-2 text-center ${mutedText}`}>
                3D simplification of vector space
              </div>
              <VectorSpaceCanvas
                isDark={isDark}
                placedCount={beat === 0 ? placedCount : 25}
                showQuery={beat === 1 && queryVisible}
                queryLanding={beat === 1 && queryLanding}
                knnK={beat === 1 ? knnRevealed : 0}
                highlightId={beat === 0 && vectorizing ? activeAsset?.id : null}
                className={`flex-1 border ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/15 shadow-sm'}`}
              />
            </div>
          </div>
        </div>

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
  )
}

export default VectorSearchScene
