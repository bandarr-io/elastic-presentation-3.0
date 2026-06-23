import { animate, stagger } from 'animejs'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass, faClock, faBolt, faPlay, faRotate,
  faCode, faCheck,
  faShieldHalved, faServer, faGlobe, faBug,
} from '@fortawesome/free-solid-svg-icons'

// ─── Stage Config ─────────────────────────────────────────────────────────────

const stages = [
  { id: 'comparison', label: 'Schema Comparison', icon: faMagnifyingGlass },
  { id: 'ecs-power',  label: 'ECS in Practice',   icon: faCode            },
]

// ─── Lego data ────────────────────────────────────────────────────────────────

const COLORS = {
  blue:   '#0B64DD',
  teal:   '#48EFCF',
  pink:   '#F04E98',
  yellow: '#FEC514',
  orange: '#FF957D',
  purple: '#9B59B6',
}
const COLOR_KEYS   = Object.keys(COLORS)
const COLOR_ORDER  = COLOR_KEYS
const SHAPES       = ['square', 'rectangle', 'small']

function generateRandomPieces(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    x: Math.random() * 65 + 5,
    y: Math.random() * 55 + 25,
    rotation: Math.random() * 360,
  }))
}

// Generate read bins once (24 bins)
const READ_BINS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  label: `Hour ${i + 1}`,
  pieces: generateRandomPieces(6),
}))

// ─── LegoPiece ────────────────────────────────────────────────────────────────

function LegoPiece({ piece, isHighlighted, isBeingExamined, isScanned }) {
  const base = piece.shape === 'small' ? 10 : piece.shape === 'square' ? 13 : 17
  const h    = piece.shape === 'rectangle' ? 8 : base

  let scale   = 1
  let shadow  = '1px 1px 2px rgba(0,0,0,0.3)'
  let opacity = 1
  let border  = '1px solid rgba(0,0,0,0.2)'

  if (isHighlighted) {
    scale  = 1.35
    shadow = `0 0 8px 2px ${COLORS[piece.color]}`
  } else if (isBeingExamined) {
    scale  = 1.2
    shadow = '0 0 6px 2px rgba(255,255,255,0.8)'
    border = '1px solid rgba(255,255,255,0.9)'
  } else if (isScanned && piece.color !== 'blue') {
    opacity = 0.5
  }

  return (
    <div
      className="absolute rounded-sm transition-all duration-150"
      style={{
        left:            `${piece.x}%`,
        top:             `${piece.y}%`,
        width:           base,
        height:          h,
        backgroundColor: COLORS[piece.color],
        border,
        transform:       `rotate(${piece.rotation}deg) scale(${scale})`,
        boxShadow:       shadow,
        opacity,
      }}
    />
  )
}

// ─── Bin (Schema on Read) ─────────────────────────────────────────────────────

function Bin({ bin, isCurrentScan, scanPieceIndex, isScannedBin, highlightColor }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className={`relative overflow-hidden rounded-lg border ${isDark ? 'bg-white/5 border-white/20' : 'bg-white/50 border-elastic-dev-blue/20'}`}
      style={{ height: 65 }}
    >
      <div className={`absolute top-1 left-1 font-mono text-[9px] z-10 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
        {bin.label}
      </div>
      {bin.pieces.map(piece => (
        <LegoPiece
          key={piece.id}
          piece={piece}
          isHighlighted={!!highlightColor && piece.color === highlightColor}
          isBeingExamined={isCurrentScan && scanPieceIndex === piece.id}
          isScanned={isScannedBin && !highlightColor}
        />
      ))}
    </div>
  )
}

// ─── OrganizedBin (Schema on Write) ───────────────────────────────────────────

function OrganizedBin({ label, highlightColor, isSearching }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className={`relative overflow-hidden rounded-lg border ${isDark ? 'bg-white/5 border-white/20' : 'bg-white/50 border-elastic-dev-blue/20'}`}
      style={{ height: 65 }}
    >
      <div className={`absolute top-1 left-1 font-mono text-[9px] z-10 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
        {label}
      </div>
      <div className="absolute inset-0 pt-4 px-0.5 pb-0.5 grid grid-cols-3 grid-rows-2 gap-0.5">
        {COLOR_ORDER.map(color => {
          const isHit = highlightColor === color
          return (
            <div
              key={color}
              className="rounded-sm transition-all duration-200"
              style={{
                backgroundColor: COLORS[color],
                border:          '1px solid rgba(0,0,0,0.2)',
                boxShadow:       isHit ? `0 0 6px 2px ${COLORS[color]}` : '1px 1px 2px rgba(0,0,0,0.3)',
                transform:       isHit ? 'scale(1.05)' : 'scale(1)',
                opacity:         isSearching && !isHit ? 0.25 : 1,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Stage 1: ECS Search Demo ─────────────────────────────────────────────────

const ECS_SOURCES = [
  { id: 'firewall', label: 'Firewall',       icon: faShieldHalved, rawField: 'src_ip',          chipColor: 'text-elastic-pink',   chipBg: 'bg-elastic-pink/10',   hitCount: 14 },
  { id: 'windows',  label: 'Host Events', icon: faServer,       rawField: 'source_address',   chipColor: 'text-elastic-yellow', chipBg: 'bg-elastic-yellow/10', hitCount: 31 },
  { id: 'web',      label: 'Server Logs',     icon: faGlobe,        rawField: 'client.ip',        chipColor: 'text-purple-400',     chipBg: 'bg-purple-400/10',     hitCount: 7  },
  { id: 'edr',      label: 'EDR',            icon: faBug,          rawField: 'RemoteIP',         chipColor: 'text-elastic-teal',   chipBg: 'bg-elastic-teal/10',   hitCount: 5  },
]

// ── Row inside the left panel ─────────────────────────────────────────────────
function SourceRow({ source, isScanning, isHit, isDark }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
      isHit      ? isDark ? 'bg-white/[0.06]' : 'bg-elastic-blue/[0.06]'
      : isScanning ? isDark ? 'bg-white/[0.04]' : 'bg-elastic-dev-blue/[0.04]'
      :              isDark ? 'bg-white/[0.02]' : 'bg-elastic-dev-blue/[0.02]'
    }`}>
      {isScanning && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 animate-pulse" style={{ backgroundColor: isDark ? '#48EFCF' : '#0B64DD' }} />
      )}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? source.chipBg : 'bg-elastic-blue/10'}`}>
        <FontAwesomeIcon icon={source.icon} className={`text-xs ${isDark ? source.chipColor : 'text-elastic-blue'}`} />
      </div>
      <div className={`text-xs font-medium w-24 flex-shrink-0 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>
        {source.label}
      </div>
      <div className={`font-mono text-xs font-bold flex-1 transition-all duration-200 ${
        isScanning ? (isDark ? source.chipColor : 'text-elastic-blue') :
        isHit      ? (isDark ? source.chipColor : 'text-elastic-blue') :
                     isDark ? 'text-white/25' : 'text-elastic-dev-blue/25'
      }`}>
        {source.rawField}
        <span className={`font-normal ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/60'}`}> == "10.0.1.45"</span>
      </div>
      <div className={`text-xs font-bold flex-shrink-0 transition-all duration-300 ${isHit ? (isDark ? source.chipColor : 'text-elastic-blue') : 'opacity-0'}`}>
        {source.hitCount} hits
      </div>
    </div>
  )
}

function ECSSearchDemo({ isDark, sources = ECS_SOURCES }) {
  const TOTAL_HITS = sources.reduce((sum, s) => sum + s.hitCount, 0)
  const [phase,   setPhase]   = useState('idle')
  const [rawIdx,  setRawIdx]  = useState(-1)
  const [rawTime, setRawTime] = useState(0)
  const [ecsTime, setEcsTime] = useState(0)
  const timerRef = useRef(null)

  const SOURCE_MS = 7500  // 4 sources × 7500ms ≈ 30s, matching stage 0 read timing

  const runRawSearch = () => {
    if (phase === 'searching-raw') return
    clearTimeout(timerRef.current)
    setPhase('searching-raw')
    setRawIdx(0)
    setRawTime(0)
    const startTime = Date.now()
    const step = idx => {
      setRawIdx(idx)
      setRawTime(Date.now() - startTime)
      if (idx + 1 < sources.length) {
        timerRef.current = setTimeout(() => step(idx + 1), SOURCE_MS)
      } else {
        timerRef.current = setTimeout(() => {
          setRawTime(Date.now() - startTime)
          setRawIdx(-1)
          setPhase('done-raw')
        }, SOURCE_MS)
      }
    }
    timerRef.current = setTimeout(() => step(0), 50)
  }

  const runEcsSearch = () => {
    if (phase === 'searching-ecs') return
    clearTimeout(timerRef.current)
    setPhase('searching-ecs')
    setEcsTime(0)
    timerRef.current = setTimeout(() => {
      setEcsTime(500)
      setPhase('done-ecs')
    }, 500)
  }

  const reset = () => {
    clearTimeout(timerRef.current)
    setPhase('idle')
    setRawIdx(-1)
    setRawTime(0)
    setEcsTime(0)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const rawComplete = phase === 'done-raw' || phase === 'searching-ecs' || phase === 'done-ecs'
  const ecsComplete = phase === 'done-ecs'
  const speedup     = rawTime > 0 && ecsTime > 0 ? Math.round(rawTime / ecsTime) : null

  const cardBase = `flex-1 rounded-2xl border px-4 py-4 flex flex-col gap-3`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4">

        {/* ── LEFT: Schema on Read ───────────────────────────────────── */}
        <div className={`${cardBase} ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/50 border-elastic-dev-blue/10'}`}>
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Schema on Read</div>
              <div className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Each source uses a different field name</div>
            </div>
          </div>

          {/* OR query — each condition on its own line */}
          <div className={`px-3 py-2.5 rounded-xl font-mono text-xs leading-6 ${isDark ? 'bg-white/5' : 'bg-elastic-dev-blue/5'}`}>
            <div className="flex items-start gap-2">
              <FontAwesomeIcon icon={faMagnifyingGlass} className={`flex-shrink-0 mt-1 ${isDark ? 'text-orange-400' : 'text-elastic-blue'}`} />
              <div>
                {sources.map((s, i) => (
                  <div key={s.id}>
                    <span className={`font-bold ${isDark ? s.chipColor : 'text-elastic-blue'}`}>{s.rawField}</span>
                    <span className={isDark ? 'text-white/40' : 'text-elastic-dev-blue/50'}> == </span>
                    <span className={isDark ? 'text-elastic-yellow/70' : 'text-elastic-blue/90'}>"10.0.1.45"</span>
                    {i < sources.length - 1 && (
                      <span className={`font-bold ${isDark ? 'text-white/25' : 'text-elastic-dev-blue/60'}`}> OR</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Source rows */}
          <div className="flex flex-col gap-1.5 flex-1">
            {sources.map((source, idx) => (
              <SourceRow
                key={source.id}
                source={source}
                isScanning={phase === 'searching-raw' && rawIdx === idx}
                isHit={rawComplete || (phase === 'searching-raw' && idx < rawIdx)}
                isDark={isDark}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between flex-shrink-0 pt-1">
            <button
              onClick={runRawSearch}
              disabled={phase === 'searching-raw'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-xs transition-all ${
                phase === 'searching-raw'
                  ? 'bg-elastic-blue/50 text-white cursor-not-allowed'
                  : 'bg-elastic-blue text-white hover:scale-105'
              }`}
            >
              <FontAwesomeIcon icon={phase === 'searching-raw' ? faMagnifyingGlass : faPlay} className={phase === 'searching-raw' ? 'animate-pulse' : ''} />
              Search
            </button>
            <div className="flex items-center gap-3">
              {(rawTime > 0 || ecsTime > 0) && phase !== 'searching-raw' && phase !== 'searching-ecs' && (
                <button onClick={reset} className={`text-xs flex items-center gap-1 ${isDark ? 'text-white/30 hover:text-white/60' : 'text-elastic-dev-blue/30 hover:text-elastic-dev-blue/60'}`}>
                  <FontAwesomeIcon icon={faRotate} className="text-[10px]" /> Reset
                </button>
              )}
              <FontAwesomeIcon icon={faClock} className={`text-xs ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`} />
              <span className={`font-mono text-sm font-bold ${rawTime > 0 ? (isDark ? 'text-orange-400' : 'text-elastic-blue') : isDark ? 'text-white/20' : 'text-elastic-dev-blue/20'}`}>
                {(rawTime / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Schema on Write / ECS ───────────────────────────── */}
        <div className={`${cardBase} transition-all duration-500 ${
          ecsComplete
            ? isDark ? 'bg-elastic-teal/[0.06] border-elastic-teal/30' : 'bg-elastic-blue/[0.05] border-elastic-blue/30'
            : isDark  ? 'bg-white/[0.02] border-white/10' : 'bg-white/50 border-elastic-dev-blue/10'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Schema on Write (ECS)</div>
              <div className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>One field name across every source</div>
            </div>
          </div>

          {/* Hero query — single, large, prominent */}
          <div className={`px-4 py-3 rounded-xl transition-all duration-500 ${
            ecsComplete
              ? isDark ? 'bg-elastic-teal/15 border-2 border-elastic-teal/40' : 'bg-elastic-blue/10 border-2 border-elastic-blue/30'
              : isDark ? 'bg-white/5 border border-white/10' : 'bg-elastic-dev-blue/5 border border-elastic-dev-blue/10'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faBolt} className={`text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
              <span className={`font-mono text-base font-bold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
                source.ip == "10.0.1.45"
              </span>
            </div>
            <div className={`text-xs ${isDark ? 'text-white/35' : 'text-elastic-dev-blue/65'}`}>
              1 query · 1 field name · all {sources.length} sources
            </div>
          </div>

          {/* Bridge label */}
          <div className={`flex items-center gap-2 flex-shrink-0 ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
            <div className={`flex-1 border-t border-dashed ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`} />
            <span className="text-xs font-medium">matched across</span>
            <div className={`flex-1 border-t border-dashed ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`} />
          </div>

          {/* Source icons — 2×2 grid, larger, with source.ip label */}
          <div className="grid grid-cols-2 gap-2 flex-1">
            {sources.map(source => (
              <div key={source.id} className={`flex flex-col items-center gap-1.5 py-3 px-3 rounded-xl transition-all duration-500 ${
                ecsComplete
                  ? isDark ? `${source.chipBg} border border-elastic-teal/20` : 'bg-elastic-blue/[0.06] border border-elastic-blue/20'
                  : isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-elastic-dev-blue/[0.02] border border-elastic-dev-blue/5'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  ecsComplete ? (isDark ? source.chipBg : 'bg-elastic-blue/15') : isDark ? 'bg-white/5' : 'bg-elastic-dev-blue/5'
                }`}>
                  <FontAwesomeIcon icon={source.icon} className={`text-lg transition-all duration-500 ${ecsComplete ? (isDark ? source.chipColor : 'text-elastic-blue') : isDark ? 'text-white/20' : 'text-elastic-dev-blue/20'}`} />
                </div>
                <div className={`text-xs font-medium text-center leading-tight ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>{source.label}</div>
                <div className={`font-mono text-[9px] transition-all duration-500 ${ecsComplete ? (isDark ? 'text-elastic-teal/70' : 'text-elastic-blue/60') : 'opacity-0'}`}>
                  source.ip
                </div>
                <div className={`text-xs font-bold transition-all duration-500 ${ecsComplete ? (isDark ? source.chipColor : 'text-elastic-blue') : 'opacity-0'}`}>
                  {source.hitCount} hits
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between flex-shrink-0 pt-1">
            <button
              onClick={runEcsSearch}
              disabled={phase === 'searching-ecs'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-xs transition-all ${
                phase === 'searching-ecs'
                  ? 'bg-elastic-blue/50 text-white cursor-not-allowed'
                  : 'bg-elastic-blue text-white hover:scale-105'
              }`}
            >
              <FontAwesomeIcon icon={phase === 'searching-ecs' ? faBolt : faPlay} className={phase === 'searching-ecs' ? 'animate-pulse' : ''} />
              Search
            </button>
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faClock} className={`text-xs ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`} />
              <span className={`font-mono text-sm font-bold ${ecsTime > 0 ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : isDark ? 'text-white/20' : 'text-elastic-dev-blue/20'}`}>
                {(ecsTime / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Punchline row ─────────────────────────────────────────────── */}
      {(rawComplete || ecsComplete) && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-500 ${isDark ? 'bg-white/[0.03]' : 'bg-white/70'}`}>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Without ECS</span>
            <span className={`font-mono text-sm font-bold ${isDark ? 'text-white/70' : 'text-elastic-dark-ink'}`}>
              {rawComplete ? `1 complex query · ${sources.length} field names to know · ${(rawTime / 1000).toFixed(1)}s` : '—'}
            </span>
            {rawComplete && (
              <span className={`text-xs ${isDark ? 'text-white/35' : 'text-elastic-dev-blue/35'}`}>
                · {TOTAL_HITS} events found
              </span>
            )}
          </div>
          {speedup && (
            <div className={`text-base font-extrabold px-4 py-1.5 rounded-full ${isDark ? 'bg-elastic-teal/15 text-elastic-teal' : 'bg-elastic-blue/10 text-elastic-blue'}`}>
              {speedup}× faster with ECS
            </div>
          )}
          <div className="flex items-center gap-3">
            {ecsComplete && (
              <span className={`text-xs ${isDark ? 'text-white/35' : 'text-elastic-dev-blue/35'}`}>
                {TOTAL_HITS} events found ·
              </span>
            )}
            <span className={`font-mono text-sm font-bold ${isDark ? (ecsComplete ? 'text-elastic-teal' : 'text-white/70') : (ecsComplete ? 'text-elastic-blue' : 'text-elastic-dark-ink')}`}>
              {ecsComplete ? `1 query · 1 field name · ${(ecsTime / 1000).toFixed(1)}s` : '—'}
            </span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>With ECS</span>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function SchemaScene({ externalStage, onStageChange, playSignal = 0, metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // ── Stage ──────────────────────────────────────────────────────────────
  const [stage, setStage] = useState(0)
  useEffect(() => { if (externalStage !== undefined) setStage(externalStage) }, [externalStage])
  const changeStage = useCallback(s => { setStage(s); onStageChange?.(s) }, [onStageChange])

  // ── Stage 0 search state ───────────────────────────────────────────────
  const [phase,          setPhase]          = useState('idle')
  const [readTime,       setReadTime]        = useState(0)
  const [writeTime,      setWriteTime]       = useState(0)
  const [readBinIndex,   setReadBinIndex]    = useState(-1)
  const [scanPieceIndex, setScanPieceIndex]  = useState(-1)
  const readTimerRef   = useRef(null)
  const writeTimerRef  = useRef(null)

  // ── Refs for entrance animations ───────────────────────────────────────
  const stageContentRef = useRef(null)
  // Stage content cross-fade
  useEffect(() => {
    if (stageContentRef.current) {
      animate(stageContentRef.current, { opacity: [0, 1], duration: 400, easing: 'easeOutCubic' })
    }
  }, [stage])

  // ── Search functions ────────────────────────────────────────────────────

  const runReadSearch = () => {
    if (phase === 'searching-read') return
    clearTimeout(readTimerRef.current)
    clearTimeout(writeTimerRef.current)
    setPhase('searching-read')
    setReadTime(0)
    setReadBinIndex(-1)
    setScanPieceIndex(-1)

    const PIECE_MS   = 208  // 24 bins × 6 pieces × 208ms ≈ 30s total
    const PIECES_PER = READ_BINS[0].pieces.length
    const startTime  = Date.now()

    const step = (binIdx, pieceIdx) => {
      setReadBinIndex(binIdx)
      setScanPieceIndex(pieceIdx)
      setReadTime(Date.now() - startTime)

      const nextPiece = pieceIdx + 1
      if (nextPiece < PIECES_PER) {
        readTimerRef.current = setTimeout(() => step(binIdx, nextPiece), PIECE_MS)
      } else {
        const nextBin = binIdx + 1
        if (nextBin < READ_BINS.length) {
          readTimerRef.current = setTimeout(() => step(nextBin, 0), PIECE_MS)
        } else {
          // All bins scanned
          readTimerRef.current = setTimeout(() => {
            setReadTime(Date.now() - startTime)
            setReadBinIndex(-1)
            setScanPieceIndex(-1)
            setPhase('found-read')
          }, PIECE_MS)
        }
      }
    }

    readTimerRef.current = setTimeout(() => step(0, 0), 50)
  }

  const runWriteSearch = () => {
    if (phase === 'searching-write') return
    clearTimeout(readTimerRef.current)
    clearTimeout(writeTimerRef.current)
    setPhase('searching-write')
    setWriteTime(0)
    writeTimerRef.current = setTimeout(() => {
      setWriteTime(500)
      setPhase('found-write')
    }, 500)
  }

  const reset = () => {
    clearTimeout(readTimerRef.current)
    clearTimeout(writeTimerRef.current)
    setPhase('idle')
    setReadTime(0)
    setWriteTime(0)
    setReadBinIndex(-1)
    setScanPieceIndex(-1)
  }

  useEffect(() => () => { clearTimeout(readTimerRef.current); clearTimeout(writeTimerRef.current) }, [])

  const showHighlight    = phase === 'found-read' || phase === 'found-write' || phase === 'complete'
  const showWriteHit     = phase === 'searching-write' || phase === 'found-write' || phase === 'complete'
  const speedup          = readTime > 0 && writeTime > 0 ? Math.round(readTime / writeTime) : null

  return (
    <div className="h-full w-full flex flex-col px-6 pt-4 pb-2 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <SceneHeader
          eyebrow={metadata.eyebrow ?? 'Elastic Common Schema'}
          titlePlain={metadata.titlePart1 ?? 'Schema on Read vs '}
          titleAccent={metadata.titlePart2 ?? 'Schema on Write'}
          subtitle={
            <>
              {stage === 0 && (metadata.subtitle0 ?? 'How you organize data determines how fast you can find it')}
              {stage === 1 && (metadata.subtitle1 ?? 'One field name. Any source. Zero guesswork.')}
            </>
          }
        />

        {/* ── Main row: stage content + right-side navigator ─────────── */}
        <div className="flex gap-3">

          {/* ── Stage Container ──────────────────────────────────────── */}
          <div
            ref={stageContentRef}
            style={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >

            {/* ═══════════════════════════════════════════════════════ */}
            {/* STAGE 0: Lego bins comparison (stacked layout)          */}
            {/* ═══════════════════════════════════════════════════════ */}
            {stage === 0 && (
              <div className="flex flex-col gap-2">

                {/* ── Schema on Read (top) ──────────────────────────── */}
                <div
                  className={`flex-1 rounded-2xl border px-4 py-3 flex flex-col ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/50 border-elastic-dev-blue/10'}`}
                >
                  {/* Row: label + query + timer */}
                  <div className="flex items-center gap-4 mb-2 flex-shrink-0">
                    <div className="flex-shrink-0">
                      <div className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>Schema on Read</div>
                      <div className={`text-xs ${isDark ? 'text-white/45' : 'text-elastic-dev-blue/45'}`}>Organize when searching</div>
                    </div>
                    <button
                      onClick={runReadSearch}
                      disabled={phase === 'searching-read'}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-xs transition-all flex-shrink-0 ${
                        phase === 'searching-read'
                          ? (isDark ? 'bg-orange-500/50 text-white cursor-not-allowed' : 'bg-elastic-blue/50 text-white cursor-not-allowed')
                          : (isDark ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:scale-105' : 'bg-elastic-blue text-white hover:scale-105')
                      }`}
                    >
                      <FontAwesomeIcon icon={phase === 'searching-read' ? faMagnifyingGlass : faPlay} className={phase === 'searching-read' ? 'animate-pulse' : ''} />
                      Search Read
                    </button>
                    <div className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-white/5' : 'bg-elastic-dev-blue/5'}`}>
                      <FontAwesomeIcon icon={faMagnifyingGlass} className={`flex-shrink-0 ${isDark ? 'text-orange-400' : 'text-elastic-blue'}`} />
                      <span className={`font-medium ${isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}`}>"Find all blue squares"</span>
                      <span className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>— must scan every bin, piece by piece</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <FontAwesomeIcon icon={faClock} className={`text-sm ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`} />
                      <span className={`text-sm ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>Search time:</span>
                      <span className={`text-xl font-mono font-bold ${showHighlight ? (isDark ? 'text-orange-400' : 'text-elastic-blue') : isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                        {(readTime / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  {/* 24-bin grid — 8 cols × 3 rows, bins wider with full-width panel */}
                  <div className="grid grid-cols-8 gap-1.5 flex-1 content-start">
                    {READ_BINS.map((bin, idx) => (
                      <Bin
                        key={bin.id}
                        bin={bin}
                        isCurrentScan={phase === 'searching-read' && readBinIndex === idx}
                        scanPieceIndex={scanPieceIndex}
                        isScannedBin={phase === 'searching-read' && idx < readBinIndex}
                        highlightColor={showHighlight ? 'blue' : null}
                      />
                    ))}
                  </div>

                </div>

                {/* ── Divider with optional speedup badge ──────────── */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />
                  {speedup && (
                    <div className={`flex items-baseline gap-1 px-3 py-0.5 rounded-full text-sm font-bold ${isDark ? 'bg-elastic-teal/10 text-elastic-teal' : 'bg-elastic-blue/10 text-elastic-blue'}`}>
                      {speedup}× <span className={`text-xs font-normal ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>faster</span>
                    </div>
                  )}
                  {(readTime > 0 || writeTime > 0) && phase !== 'searching-read' && phase !== 'searching-write' && (
                    <button onClick={reset} className={`text-xs flex items-center gap-1 ${isDark ? 'text-white/40 hover:text-white/60' : 'text-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'}`}>
                      <FontAwesomeIcon icon={faRotate} className="text-[10px]" /> Reset
                    </button>
                  )}
                  <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />
                </div>

                {/* ── Schema on Write (bottom) ──────────────────────── */}
                <div
                  className={`flex-1 rounded-2xl border px-4 py-3 flex flex-col ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/50 border-elastic-dev-blue/10'}`}
                >
                  {/* Row: label + query + timer */}
                  <div className="flex items-center gap-4 mb-2 flex-shrink-0">
                    <div className="flex-shrink-0">
                      <div className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>Schema on Write</div>
                      <div className={`text-xs ${isDark ? 'text-white/45' : 'text-elastic-dev-blue/45'}`}>Organize before storing</div>
                    </div>
                    <button
                      onClick={runWriteSearch}
                      disabled={phase === 'searching-write'}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-xs transition-all flex-shrink-0 ${
                        phase === 'searching-write'
                          ? (isDark ? 'bg-elastic-teal/50 text-white cursor-not-allowed' : 'bg-elastic-blue/50 text-white cursor-not-allowed')
                          : (isDark ? 'bg-gradient-to-r from-elastic-teal to-elastic-blue text-white hover:scale-105' : 'bg-elastic-blue text-white hover:scale-105')
                      }`}
                    >
                      <FontAwesomeIcon icon={phase === 'searching-write' ? faBolt : faPlay} className={phase === 'searching-write' ? 'animate-pulse' : ''} />
                      Search Write
                    </button>
                    <div className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-white/5' : 'bg-elastic-dev-blue/5'}`}>
                      <FontAwesomeIcon icon={faBolt} className={`flex-shrink-0 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                      <span className={`font-medium ${isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}`}>"Find all blue squares"</span>
                      <span className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>— data pre-sorted by color, jump directly to blue bins</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <FontAwesomeIcon icon={faClock} className={`text-sm ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`} />
                      <span className={`text-sm ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>Search time:</span>
                      <span className={`text-xl font-mono font-bold ${showWriteHit ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                        {(writeTime / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  {/* 24 organized bins — 8 cols × 3 rows */}
                  <div className="grid grid-cols-8 gap-1.5 flex-1 content-start">
                    {Array.from({ length: 24 }, (_, i) => (
                      <OrganizedBin
                        key={i}
                        label={`Hour ${i + 1}`}
                        isSearching={phase === 'searching-write'}
                        highlightColor={showWriteHit ? 'blue' : null}
                      />
                    ))}
                  </div>

                </div>

              </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* STAGE 1: Lego analogy + ES|QL example                   */}
            {/* ═══════════════════════════════════════════════════════ */}
            {stage === 1 && (
              <div className="flex flex-col gap-3">
                <ECSSearchDemo isDark={isDark} sources={
                  ECS_SOURCES.map((s, i) => ({
                    ...s,
                    label:    metadata.sources?.[i]?.label    ?? s.label,
                    rawField: metadata.sources?.[i]?.rawField ?? s.rawField,
                    hitCount: metadata.sources?.[i]?.hitCount != null
                      ? Number(metadata.sources[i].hitCount)
                      : s.hitCount,
                  }))
                } />
              </div>
            )}

          </div>{/* /Stage Container */}

          {/* ── Right-side stage navigator (matches SecurityScene) ───── */}
          <div className="w-12 flex-shrink-0 flex flex-col items-center justify-center relative select-none">
            <div className={`absolute w-px top-[20%] bottom-[20%] ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />
            <div
              className={`absolute w-px top-[20%] transition-all duration-700 ease-out ${isDark ? 'bg-elastic-teal/50' : 'bg-elastic-blue/40'}`}
              style={{ height: `${(stage / (stages.length - 1)) * 60}%` }}
            />
            {stages.map((s, i) => {
              const isActive = i === stage
              const isDone   = i < stage
              return (
                <button key={s.id} onClick={() => changeStage(i)} className="relative z-10 group flex flex-col items-center py-7" title={s.label}>
                  <span className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs px-2.5 py-1.5 rounded-lg pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100 border shadow-lg ${isDark ? 'bg-elastic-dev-blue/95 text-white/80 border-white/10' : 'bg-white/95 text-elastic-dark-ink/80 border-elastic-dev-blue/10'}`}>
                    {s.label}
                  </span>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                    isActive
                      ? isDark ? 'bg-elastic-dev-blue border-elastic-teal text-elastic-teal scale-110 shadow-[0_0_14px_rgba(72,239,207,0.3)]'
                               : 'bg-elastic-light-grey border-elastic-blue text-elastic-blue scale-110 shadow-[0_0_14px_rgba(11,100,221,0.2)]'
                      : isDone
                        ? isDark ? 'bg-elastic-dev-blue border-elastic-teal/40 text-elastic-teal/70'
                                 : 'bg-elastic-light-grey border-elastic-blue/30 text-elastic-blue/60'
                        : isDark ? 'bg-elastic-dev-blue border-white/15 text-white/25 hover:border-white/30 hover:text-white/50'
                                 : 'bg-elastic-light-grey border-black/10 text-black/25 hover:border-elastic-blue/30 hover:text-elastic-blue/50'
                  }`}>
                    {isDone ? <FontAwesomeIcon icon={faCheck} className="text-[10px]" /> : <FontAwesomeIcon icon={s.icon} className="text-xs" />}
                  </div>
                </button>
              )
            })}
          </div>

        </div>{/* /Main row */}


      </div>
    </div>
  )
}

export default SchemaScene
