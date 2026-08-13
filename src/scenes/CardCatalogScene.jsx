import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { CatalogAtmosphere, CatalogBeatStage } from '../components/catalog/CatalogStage'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { resolveCatalogScenario } from '../data/catalogScenarios'

function buildBeats(s) {
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

function CardCatalogScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { prefersReducedMotion } = useReducedMotion()
  const rootRef = useRef(null)
  const timersRef = useRef([])

  const scenario = useMemo(() => resolveCatalogScenario(metadata), [metadata])
  const defaultBeats = useMemo(() => buildBeats(scenario), [scenario])
  const beats = (metadata.beats || defaultBeats).map((b, i) => ({ ...(defaultBeats[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]
  const key = current?.key || 'scan'

  const [phase, setPhase] = useState(0)
  const [scanAt, setScanAt] = useState(-1)
  const [scanProgress, setScanProgress] = useState(-1)
  const rafRef = useRef(null)

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const danger = isDark ? '#F04E98' : '#DC2626'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'
  const panel = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/90 border-elastic-dev-blue/12 shadow-sm'
  const eyebrow = metadata.eyebrow || 'Search · How Search Works'

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const schedule = (ms, fn) => {
    const id = setTimeout(fn, prefersReducedMotion ? Math.min(ms, 80) : ms)
    timersRef.current.push(id)
  }

  const runScan = () => {
    if (key !== 'scan' || scanAt >= 0 || phase >= 1) return
    clearTimers()
    const last = 11
    if (prefersReducedMotion) {
      setScanAt(last)
      setScanProgress(last)
      setPhase(1)
      return
    }
    const perDoc = 380
    let i = 0
    const step = () => {
      setScanAt(i)
      setScanProgress(i)
      if (i < last) {
        i += 1
        schedule(perDoc, step)
      } else {
        schedule(280, () => setPhase(1))
      }
    }
    step()
  }

  const runInvertLookup = () => {
    if (key !== 'invert' || phase >= 2) return
    clearTimers()
    setPhase(2)
    if (prefersReducedMotion) {
      setPhase(3)
      return
    }
    schedule(2000, () => setPhase(3))
  }

  const advanceAnalyze = () => {
    if (key !== 'analyze' || phase >= 4) return
    setPhase((p) => Math.min(4, p + 1))
  }

  const advanceScore = () => {
    if (key !== 'score' || phase >= 7) return
    setPhase((p) => Math.min(7, p + 1))
  }

  const advanceLucene = () => {
    if (key !== 'lucene' || phase >= 3) return
    setPhase((p) => Math.min(3, p + 1))
  }

  const advanceShards = () => {
    if (key !== 'shards' || phase >= 4) return
    setPhase((p) => Math.min(4, p + 1))
  }

  const advanceScatter = () => {
    if (key !== 'scatter' || phase >= 3) return
    setPhase((p) => Math.min(3, p + 1))
  }

  const advanceReplicas = () => {
    if (key !== 'replicas' || phase >= 3) return
    setPhase((p) => Math.min(3, p + 1))
  }

  const advanceLibrary = () => {
    if (key !== 'library' || phase >= 3) return
    setPhase((p) => Math.min(3, p + 1))
  }

  useEffect(() => {
    clearTimers()
    setPhase(0)
    setScanAt(-1)
    setScanProgress(-1)

    if (key === 'scan') {
      // Wait for presenter to push Full scan
    } else if (key === 'invert') {
      // Wait for presenter to push Look up — then card, then books after 2s
      setPhase(1)
    } else if (key === 'analyze') {
      // Wait for presenter to click each wash step
      setPhase(0)
    } else if (key === 'score') {
      // Wait for presenter to click each scoring step
      setPhase(0)
    } else if (key === 'lucene') {
      // Wait for presenter to click each Lucene capability
      setPhase(0)
    } else if (key === 'shards') {
      // Wait for presenter to click through the split
      setPhase(0)
    } else if (key === 'scatter') {
      // Wait for presenter to click through scatter/gather
      setPhase(0)
    } else if (key === 'replicas') {
      // Wait for presenter to click through failover
      setPhase(0)
    } else if (key === 'library') {
      // Wait for presenter to click Lucene → Elasticsearch → punchline
      setPhase(0)
    }

    return clearTimers
  }, [key, playKey, scenario, prefersReducedMotion])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: prefersReducedMotion ? 1 : 420,
      delay: prefersReducedMotion ? 0 : stagger(45),
      easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey, prefersReducedMotion])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden relative">
      <CatalogAtmosphere isDark={isDark} accent={accent} />
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

          <div className="reveal flex-1 min-h-0 flex items-center justify-center mt-2 overflow-hidden">
            <CatalogBeatStage
              beatKey={key}
              scenario={scenario}
              phase={phase}
              scanAt={scanAt}
              scanProgress={scanProgress}
              accent={accent}
              danger={danger}
              isDark={isDark}
              headText={headText}
              mutedText={mutedText}
              panel={panel}
              prefersReducedMotion={prefersReducedMotion}
              onLookup={runInvertLookup}
              onAnalyzeStep={advanceAnalyze}
              onScoreStep={advanceScore}
              onLuceneStep={advanceLucene}
              onShardsStep={advanceShards}
              onScatterStep={advanceScatter}
              onReplicasStep={advanceReplicas}
              onLibraryStep={advanceLibrary}
              onScan={runScan}
            />
          </div>
        </div>

        <div className="shrink-0 relative z-20">
          <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
        </div>
      </div>
    </div>
  )
}

export default CardCatalogScene
