/**
 * Living inverted-index stage for search-catalog.
 * Each beat is one clear visual idea; scenario strings drive the nouns.
 */

import { useEffect, useRef, useState } from 'react'
import { animate, createMotionPath } from 'animejs'

const MONO = { fontFamily: 'Space Mono, ui-monospace, monospace' }
const DOC_COUNT = 12
const SPINE_COLORS = ['#48EFCF', '#0B64DD', '#F04E98', '#FEC514', '#FF957D', '#00BFB3', '#7EE787', '#60A5FA']

function makeShardBricks(shardId, count = 8) {
  const base = (shardId - 1) * 10
  return Array.from({ length: count }, (_, bi) => {
    const n = base + bi
    return {
      key: `${shardId}-${n}`,
      color: SPINE_COLORS[n % SPINE_COLORS.length],
      h: 12 + (n % 5) * 3,
    }
  })
}

/** Mini Lucene shard chip — L badge + brick bars + role label (Shards/Scatter continuity). */
function ShardLuceneChip({
  shardId,
  role,
  accent,
  danger,
  isDark,
  softInk,
  tone = 'primary',
  className = '',
  style = {},
}) {
  const bricks = makeShardBricks(shardId)
  const dead = tone === 'dead'
  const ghost = tone === 'ghost'
  const promote = tone === 'promote'
  const waiting = tone === 'waiting'
  const replica = tone === 'replica'
  const inkColor = dead || ghost
    ? softInk
    : promote || waiting || tone === 'primary'
      ? accent
      : danger
  const bg = promote
    ? `${accent}30`
    : waiting
      ? `${accent}18`
      : dead
        ? 'rgba(128,128,128,0.12)'
        : ghost
          ? isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
          : replica
            ? isDark ? 'rgba(240,78,152,0.12)' : 'rgba(220,38,38,0.08)'
            : `${accent}20`

  return (
    <div
      className={`relative rounded-xl px-3 py-2.5 ${className}`}
      style={{
        background: bg,
        boxShadow: promote
          ? `0 0 0 1px ${accent}, 0 0 18px ${accent}33`
          : waiting
            ? `0 0 0 1px ${accent}66`
            : undefined,
        opacity: ghost ? 0.35 : 1,
        ...style,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{
            borderColor: inkColor,
            background: `${inkColor}18`,
            filter: dead ? 'grayscale(1)' : 'none',
          }}
        >
          <span className="text-[10px] sm:text-xs font-bold" style={{ color: inkColor, ...MONO }}>
            L
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="flex items-end gap-[2px] mb-1"
            style={{ height: 20, opacity: ghost ? 0.35 : dead ? 0.45 : 0.92 }}
            aria-hidden
          >
            {bricks.map((b) => (
              <div
                key={b.key}
                style={{
                  width: 7,
                  height: b.h,
                  flexShrink: 0,
                  borderRadius: 1.5,
                  background: dead || ghost ? softInk : b.color,
                  boxShadow: isDark ? '0 0 0 1px rgba(0,0,0,0.25)' : '0 0 0 1px rgba(0,0,0,0.08)',
                }}
              />
            ))}
          </div>
          <div
            className="text-sm sm:text-base font-bold leading-tight truncate"
            style={{
              color: inkColor,
              textDecoration: dead ? 'line-through' : 'none',
              ...MONO,
            }}
          >
            Shard {shardId} · {role}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CatalogAtmosphere({ isDark, accent }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 80% 60% at 50% 40%, ${accent}14 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(240,78,152,0.06) 0%, transparent 50%)`
            : `radial-gradient(ellipse 80% 60% at 50% 35%, ${accent}10 0%, transparent 55%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)'
            : 'linear-gradient(rgba(11,100,221,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(11,100,221,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 75%)',
        }}
      />
    </div>
  )
}

function Tag({ children, accent, mono }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
      style={{ background: `${accent}18`, color: accent, ...(mono ? MONO : {}) }}
    >
      {children}
    </span>
  )
}

/** Shared 12-spine shelf — Scan sweeps it; Index lights hits from a lookup. */
function DocShelf({
  hitIndices = [],
  accent,
  isDark,
  mutedText,
  reduce,
  /** 'scan' | 'index' */
  mode = 'scan',
  scanAt = -1,
  phase = 0,
  height = 340,
  showHitBadges = true,
}) {
  const hitOrder = new Map(hitIndices.map((idx, order) => [idx, order]))
  const sweeping = mode === 'scan' && phase < 1 && scanAt >= 0
  const revealHits = mode === 'scan' ? phase >= 1 : phase >= 3

  return (
    <div
      className="relative rounded-2xl border px-5 pb-2"
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(11,100,221,0.12)',
        background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
        // Room for hit lift; avoid clipping animated spines
        paddingTop: mode === 'index' ? 18 : 20,
        overflow: mode === 'index' ? 'visible' : 'hidden',
      }}
    >
      <div
        className="relative flex items-end justify-center gap-2.5 sm:gap-3.5"
        style={{ height }}
      >
        {Array.from({ length: DOC_COUNT }).map((_, i) => {
          const probed = mode === 'scan' && i <= scanAt
          const hit = revealHits && hitOrder.has(i)
          const order = hitOrder.get(i) ?? 0
          const active = sweeping && i === scanAt
          const color = SPINE_COLORS[i % SPINE_COLORS.length]
          const spineH = Math.round(height * 0.62) + (i % 3) * 12
          const hitDelay = reduce ? '0ms' : `${order * (mode === 'index' ? 220 : 140)}ms`
          const indexWaiting = mode === 'index' && !revealHits

          let opacity = 1
          if (mode === 'scan') {
            opacity = probed && !hit && !active ? (phase >= 1 ? 0.28 : 0.32) : 1
          } else if (indexWaiting) {
            opacity = 0.32
          } else if (!hit) {
            opacity = 0.22
          }

          return (
            <div
              key={i}
              className="relative flex flex-col items-center justify-end h-full"
              style={{
                transform: hit
                  ? 'translateY(-8px) scale(1.03)'
                  : active
                    ? 'translateY(-8px)'
                    : 'none',
                transition: reduce
                  ? 'none'
                  : `transform ${mode === 'index' ? '0.55s' : '0.35s'} cubic-bezier(.22,.8,.24,1) ${hit ? hitDelay : '0ms'}, opacity ${mode === 'index' ? '0.5s' : '0.35s'} ease`,
                opacity,
              }}
            >
              {hit && showHitBadges && (
                <div
                  className={`mb-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full z-10 shrink-0 ${reduce ? '' : 'catalog-beacon'}`}
                  style={{
                    color: isDark ? '#041018' : '#fff',
                    background: accent,
                    '--catalog-accent-glow': `${accent}66`,
                    transitionDelay: hitDelay,
                    ...MONO,
                  }}
                >
                  hit
                </div>
              )}
              <div
                className="w-9 sm:w-10 rounded-sm relative overflow-hidden shrink-0"
                style={{
                  height: spineH,
                  maxHeight: hit && showHitBadges ? 'calc(100% - 2rem)' : 'calc(100% - 1.25rem)',
                  background: `linear-gradient(180deg, ${color}${hit || active ? 'ee' : '55'}, ${color}${hit || active ? '55' : '18'})`,
                  boxShadow: hit
                    ? `0 0 0 2px ${accent}, 0 12px 28px ${accent}55`
                    : active
                      ? `0 0 0 2px ${accent}, 0 0 22px ${accent}66`
                      : isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)',
                  filter: hit || active
                    ? 'saturate(1.2) brightness(1.12)'
                    : probed || indexWaiting || (mode === 'index' && !hit)
                      ? 'saturate(0.45) brightness(0.78)'
                      : 'none',
                  transition: reduce
                    ? 'none'
                    : `box-shadow ${mode === 'index' ? '0.55s' : '0.35s'} ease ${hit ? hitDelay : '0ms'}, background ${mode === 'index' ? '0.55s' : '0.35s'} ease ${hit ? hitDelay : '0ms'}, filter ${mode === 'index' ? '0.55s' : '0.35s'} ease ${hit ? hitDelay : '0ms'}`,
                }}
              >
                {[28, 48, 68, 88, 108, 128, 148].map((y) => (
                  <div key={y} className="absolute left-1.5 right-1.5 h-px" style={{ top: y, background: 'rgba(255,255,255,0.35)' }} />
                ))}
              </div>
              <div className={`mt-1.5 text-[10px] shrink-0 ${mutedText}`} style={MONO}>{i + 1}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScanBeat({ scenario, scanAt, phase, accent, isDark, headText, mutedText, reduce, onScan }) {
  const hitIndices = scenario.scanHitIndices || []
  const docsOpened = scanAt < 0 ? 0 : scanAt + 1
  const hitCount = hitIndices.length
  const idle = scanAt < 0 && phase < 1
  const sweeping = scanAt >= 0 && phase < 1

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-6 px-1">
        {idle ? (
          <button
            type="button"
            onClick={() => onScan?.()}
            className="rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-transform hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: accent,
              color: isDark ? '#041018' : '#fff',
              boxShadow: `0 8px 24px ${accent}44`,
              ...MONO,
            }}
          >
            Full scan
          </button>
        ) : (
          <Tag accent={accent} mono>{sweeping ? 'scanning…' : 'full scan'}</Tag>
        )}
        <div className="text-right">
          <div className="text-4xl font-bold tabular-nums leading-none" style={{ color: accent, ...MONO }}>
            {docsOpened}
            <span className={`text-lg font-medium ${mutedText}`}> / {DOC_COUNT}</span>
          </div>
          <div className={`text-xs mt-1 uppercase tracking-wider ${mutedText}`} style={MONO}>
            {scenario.unit.plural} opened
            {phase >= 1 && (
              <span style={{ color: accent }}> · {hitCount} contain “{scenario.queryTerm}”</span>
            )}
          </div>
        </div>
      </div>

      <DocShelf
        mode="scan"
        hitIndices={hitIndices}
        scanAt={scanAt}
        phase={phase}
        accent={accent}
        isDark={isDark}
        mutedText={mutedText}
        reduce={reduce}
        height={340}
      />

      <p className={`mt-5 text-center text-base max-w-xl mx-auto ${headText}`}>
        Twelve looks for twelve docs. A million docs means{' '}
        <span style={{ color: accent }}>a million looks</span>.
      </p>
    </div>
  )
}

function InvertBeat({ scenario, phase, accent, isDark, headText, mutedText, panel, reduce, onLookup }) {
  const hitIndices = scenario.scanHitIndices || []
  const hitRow = scenario.indexRows.find((r) => r.hit) || scenario.indexRows[0]
  const docIds = (hitRow?.docs || '').split(',').map((s) => s.trim()).filter(Boolean)
  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,100,221,0.14)'
  const waiting = phase < 2
  const looking = phase >= 2

  return (
    <div className="w-full max-w-5xl h-full min-h-0 mx-auto flex flex-col justify-center gap-3 overflow-visible">
      <div className="w-full flex justify-between items-end px-1 shrink-0">
        <Tag accent={accent} mono>inverted index</Tag>
        <div
          className="text-right"
          style={{
            opacity: phase >= 3 ? 1 : 0.35,
            transition: reduce ? 'none' : 'opacity 0.4s',
            ...MONO,
          }}
        >
          <div className="text-4xl font-bold tabular-nums leading-none" style={{ color: accent }}>
            0
            <span className={`text-lg font-medium ${mutedText}`}> / {DOC_COUNT}</span>
          </div>
          <div className={`text-xs mt-1 uppercase tracking-wider ${mutedText}`}>
            {scenario.unit.plural} opened
            {phase >= 3 && (
              <span style={{ color: accent }}> · 1 word looked up</span>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-3 relative z-10 shrink-0">
        {waiting ? (
          <button
            type="button"
            onClick={() => onLookup?.()}
            className="rounded-full px-7 py-3 text-base font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: accent,
              color: isDark ? '#041018' : '#fff',
              boxShadow: `0 10px 28px ${accent}44`,
              ...MONO,
            }}
          >
            Look up “{scenario.queryTerm}”
          </button>
        ) : (
          <div
            className="rounded-full px-6 py-2.5 text-base font-semibold"
            style={{
              background: accent,
              color: isDark ? '#041018' : '#fff',
              ...MONO,
            }}
          >
            look up: {scenario.queryTerm}
          </div>
        )}

        {/* Extra top padding reserves space for the pulled card — no layout jump / clip */}
        <div
          className={`relative w-full rounded-2xl border px-4 pb-4 ${panel}`}
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transition: reduce ? 'none' : 'opacity 0.45s ease',
            paddingTop: looking ? 52 : 36,
            overflow: 'visible',
          }}
        >
          <div className={`absolute top-3 left-4 text-xs uppercase tracking-wider ${mutedText}`} style={MONO}>
            card catalog
          </div>
          <div className="flex items-end justify-center gap-3 sm:gap-3.5">
            {scenario.indexRows.map((row, i) => {
              const selected = looking && row.hit
              const dim = looking && !row.hit
              return (
                <div
                  key={row.term}
                  className="relative flex-1 max-w-[9rem] rounded-2xl border px-3 pt-3.5 pb-3 text-center"
                  style={{
                    background: selected
                      ? isDark ? 'rgba(72,239,207,0.12)' : 'rgba(11,100,221,0.08)'
                      : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)',
                    borderColor: selected ? accent : border,
                    boxShadow: selected
                      ? `0 0 0 1px ${accent}, 0 14px 28px ${accent}28`
                      : isDark ? '0 4px 12px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,0,0,0.06)',
                    transform: selected
                      ? 'translateY(-22px) scale(1.05)'
                      : phase >= 1
                        ? 'translateY(0)'
                        : 'translateY(12px)',
                    opacity: phase < 1 ? 0 : dim ? 0.4 : 1,
                    zIndex: selected ? 5 : 1,
                    transition: reduce ? 'none' : `all 0.75s cubic-bezier(.22,.8,.24,1) ${i * 55}ms`,
                    ...MONO,
                  }}
                >
                  <div
                    className="text-sm font-bold uppercase tracking-wider truncate"
                    style={{ color: selected ? accent : undefined }}
                  >
                    <span className={selected ? '' : headText}>{row.term}</span>
                  </div>
                  {selected ? (
                    <div className="mt-2.5 flex justify-center gap-2">
                      {docIds.map((id, di) => {
                        const color = SPINE_COLORS[(Number(id) - 1) % SPINE_COLORS.length]
                        return (
                          <div
                            key={id}
                            className="flex flex-col items-center"
                            style={{
                              opacity: looking ? 1 : 0,
                              transform: looking ? 'none' : 'translateY(6px)',
                              transition: reduce ? 'none' : `all 0.5s ease ${200 + di * 120}ms`,
                            }}
                          >
                            <div
                              className="w-4 h-10 rounded-[2px]"
                              style={{
                                background: `linear-gradient(180deg, ${color}ee, ${color}44)`,
                                boxShadow: `0 0 0 1px ${accent}88`,
                              }}
                            />
                            <span className="text-xs mt-1 font-bold" style={{ color: accent }}>{id}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className={`text-sm mt-2 ${mutedText}`}>{row.docs}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className="w-full min-h-0 shrink"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transition: reduce ? 'none' : 'opacity 0.45s ease 0.1s',
          maxHeight: 220,
        }}
      >
        <DocShelf
          mode="index"
          hitIndices={hitIndices}
          phase={phase}
          accent={accent}
          isDark={isDark}
          mutedText={mutedText}
          reduce={reduce}
          height={180}
          showHitBadges={false}
        />
      </div>

      <p
        className={`text-center text-base shrink-0 ${mutedText}`}
        style={{
          opacity: phase >= 3 ? 1 : 0,
          minHeight: '1.5rem',
          transition: reduce ? 'none' : 'opacity 0.4s',
        }}
      >
        Same three hits — without opening a single {scenario.unit.singular}.
      </p>
    </div>
  )
}

function AnalyzeBeat({ scenario, phase, accent, danger, isDark, mutedText, panel, reduce, onAnalyzeStep }) {
  const labels = scenario.analyzeLabels || []
  const nextLabel = phase < 4 ? labels[phase] : null
  const showSentence = phase < 1
  const showTokens = phase >= 1
  const q = scenario.queryTerm.toLowerCase()
  const queryTok = scenario.tokens.find((t) => {
    if (t.stop) return false
    const full = `${t.text}${t.stem || ''}`.toLowerCase()
    return full === q || t.text.toLowerCase() === q || q.startsWith(t.text.toLowerCase())
  })
  // After stemming, show the form left on the chip (e.g. avionic — not avionics)
  const matchedForm = (queryTok?.text || scenario.queryTerm).toLowerCase()

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-7">
      {/* Raw sentence — only before the first click */}
      {showSentence && (
        <div
          className={`w-full rounded-2xl border px-8 py-7 text-center text-2xl sm:text-3xl ${panel}`}
          style={{
            ...MONO,
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)',
            lineHeight: 1.35,
          }}
        >
          {scenario.rawSentence}
        </div>
      )}

      {/* Token chips */}
      <div
        className="relative flex flex-wrap justify-center gap-3.5 min-h-[7rem] items-center px-2 w-full"
        style={{
          opacity: showTokens ? 1 : 0,
          pointerEvents: showTokens ? 'auto' : 'none',
          transition: reduce ? 'none' : 'opacity 0.4s ease',
        }}
      >
        {scenario.tokens.map((tok, i) => {
          const gone = phase >= 3 && tok.stop
          const stemmed = phase >= 4 && tok.stem
          const kept = phase >= 4 && !tok.stop
          const lower = phase >= 2
          return (
            <span
              key={i}
              className="rounded-2xl border px-5 py-3.5 text-xl sm:text-2xl font-medium relative"
              style={{
                opacity: gone ? 0 : showTokens ? 1 : 0,
                transform: gone
                  ? `translateY(64px) rotate(${(i % 2 ? 1 : -1) * 14}deg) scale(0.85)`
                  : kept
                    ? 'translateY(-6px) scale(1.06)'
                    : 'none',
                transition: reduce ? 'opacity 0.2s' : 'all 0.55s cubic-bezier(.2,.9,.2,1)',
                transitionDelay: `${i * 40}ms`,
                background: kept ? `${accent}28` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                borderColor: kept ? accent : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                boxShadow: kept ? `0 10px 32px ${accent}33` : 'none',
                textTransform: lower ? 'lowercase' : 'none',
                color: isDark ? '#fff' : '#1a1a1a',
                ...MONO,
              }}
            >
              {tok.text}
              {tok.stem ? (
                <em
                  className="not-italic"
                  style={{
                    color: danger,
                    display: 'inline-block',
                    maxWidth: stemmed ? 0 : '6ch',
                    opacity: stemmed ? 0 : 1,
                    overflow: 'hidden',
                    transition: '0.45s',
                    verticalAlign: 'bottom',
                  }}
                >
                  {tok.stem}
                </em>
              ) : null}
            </span>
          )
        })}
      </div>

      {nextLabel ? (
        <button
          type="button"
          onClick={() => onAnalyzeStep?.()}
          className="rounded-full px-8 py-3.5 text-lg font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: accent,
            color: isDark ? '#041018' : '#fff',
            boxShadow: `0 10px 28px ${accent}44`,
            ...MONO,
          }}
        >
          {nextLabel}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3 mt-1">
          <p className={`text-xl sm:text-2xl text-center max-w-2xl leading-snug ${mutedText}`}>
            Searching <span style={{ color: accent }}>{matchedForm}</span> still finds the variants.
          </p>
        </div>
      )}
    </div>
  )
}

function Bm25Formula({ accent, isDark, headText, panel, plain }) {
  const ink = isDark ? '#fff' : '#1a1a1a'
  const soft = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)'
  const rule = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'

  return (
    <div className={`w-full rounded-2xl border px-5 sm:px-7 py-6 sm:py-8 ${panel}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-6 lg:gap-10 items-center">
        {/* Left: BM25 + plain-English key */}
        <div className="flex flex-col gap-4 lg:pr-2">
          <div
            className="font-bold tracking-tight leading-none"
            style={{
              color: accent,
              fontSize: 'clamp(3.5rem, 9vw, 6rem)',
              ...MONO,
            }}
          >
            BM25
          </div>
          <div className={`flex flex-col gap-2 text-sm sm:text-base ${headText}`} style={MONO}>
            <div><span style={{ color: accent }}>f</span> = how often the word appears</div>
            <div><span style={{ color: accent }}>IDF</span> = how rare it is</div>
            <div><span style={{ color: accent }}>|D|</span> = document length</div>
          </div>
        </div>

        {/* Right: math formula OR plain-English rewrite */}
        {plain ? (
          <div className="flex flex-col gap-4 max-w-xl" style={{ ...MONO }}>
            <div
              className="text-xl sm:text-2xl lg:text-3xl font-medium leading-snug"
              style={{ color: ink }}
            >
              <span style={{ color: accent }}>How often</span> the word appears in this document
              <span style={{ color: soft }}> × </span>
              <span style={{ color: accent }}>how rare</span> it is across all documents.
            </div>
            <p className={`text-sm sm:text-base leading-relaxed ${headText}`}>
              How often it shows up here, times how rare it is across the whole library.
              Frequency separates the matches. Rarity decides whether the word is worth counting.
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col items-start justify-center gap-4 text-lg sm:text-xl lg:text-2xl font-medium"
            style={{ color: ink, ...MONO }}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span>
                score(<span style={{ color: accent }}>D</span>, <span style={{ color: accent }}>Q</span>)
              </span>
              <span style={{ color: soft }}>=</span>
              <span>
                Σ<sub className="text-sm" style={{ color: soft }}>i</sub>
              </span>
              <span style={{ color: soft }}>IDF(q<sub className="text-sm">i</sub>)</span>
              <span style={{ color: soft }}>·</span>
            </div>
            <div className="inline-flex flex-col items-stretch text-base sm:text-lg lg:text-xl leading-tight w-full max-w-xl">
              <div className="px-1 pb-2 text-center">
                f(q<sub className="text-sm">i</sub>, D)·(k<sub className="text-sm">1</sub>+1)
              </div>
              <div className="w-full" style={{ borderTop: `2.5px solid ${rule}` }} />
              <div className="px-1 pt-2 text-center">
                f(q<sub className="text-sm">i</sub>, D)+k<sub className="text-sm">1</sub>·(1−b+b·|D|/avgdl)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreBeat({ scenario, phase, accent, danger, isDark, headText, panel, reduce, onScoreStep }) {
  const steps = [
    'Said Plainly…',
    'Show the matches',
    'Count the hits',
    'Pick the winner',
    'Try a common word',
    'Factor in rarity',
    'Score the rare word',
  ]
  const nextLabel = phase < 7 ? steps[phase] : null
  const showFormula = phase === 0
  const showPlain = phase === 1
  const showArena = phase >= 2
  const scoring = phase >= 3
  const crowned = phase >= 4
  const rarity = phase >= 5
  // 0 off · 1 common TF (tall) · 2 common IDF crush · 3 rare term restored
  const rarityStage = phase < 5 ? 0 : Math.min(3, phase - 4)
  const term = scenario.queryTerm
  const common = scenario.rarityCoins.find((c) => c.common)?.common || 'the'
  // Common words appear everywhere — nearly the same count in every doc
  const commonHits = Object.fromEntries(
    scenario.scoreDocs.map((d, i) => [d.id, 118 - i * 4]),
  )

  const fillOrder = [...scenario.scoreDocs].sort((a, b) => a.h - b.h).map((d) => d.id)
  const fillDelayMs = (id) => Math.max(0, fillOrder.indexOf(id)) * 520

  const [counts, setCounts] = useState(() =>
    Object.fromEntries(scenario.scoreDocs.map((d) => [d.id, 0])),
  )
  const [filling, setFilling] = useState(false)

  useEffect(() => {
    if (!scoring) {
      setCounts(Object.fromEntries(scenario.scoreDocs.map((d) => [d.id, 0])))
      setFilling(false)
      return undefined
    }
    if (reduce) {
      setCounts(Object.fromEntries(scenario.scoreDocs.map((d) => [d.id, d.count ?? 0])))
      setFilling(false)
      return undefined
    }
    setCounts(Object.fromEntries(scenario.scoreDocs.map((d) => [d.id, 0])))
    setFilling(true)
    const duration = 1500
    const start = performance.now()
    let raf = 0
    const tick = (now) => {
      const next = {}
      let done = true
      for (const d of scenario.scoreDocs) {
        const local = Math.max(0, now - start - fillDelayMs(d.id))
        const t = Math.min(1, local / duration)
        const eased = 1 - (1 - t) ** 3
        next[d.id] = Math.round((d.count ?? 0) * eased)
        if (t < 1) done = false
      }
      setCounts(next)
      if (!done) raf = requestAnimationFrame(tick)
      else setFilling(false)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [scoring, reduce, scenario])

  const ink = isDark ? '#fff' : '#1a1a1a'
  const softInk = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const ease = reduce ? 'none' : '0.9s cubic-bezier(.22,.8,.24,1)'
  const fillEase = reduce ? 'none' : '1.1s cubic-bezier(.22,.8,.24,1)'
  const showingCommon = rarity && rarityStage > 0 && rarityStage < 3
  const idfCrushed = rarityStage === 2
  const idfRare = rarityStage === 3
  const rankingActive = crowned && (!rarity || idfRare)

  const story = (() => {
    if (phase === 2) {
      return {
        lead: 'Three documents matched.',
        body: 'Hits alone aren’t a ranking yet — BM25 turns them into a score.',
      }
    }
    if (phase === 3) {
      return {
        lead: 'Ingredient 1 — how often.',
        body: `Count “${term}” inside each document. More mentions → a higher score.`,
      }
    }
    if (phase === 4) {
      return {
        lead: 'Frequency picked a winner.',
        body: 'But every match got the same treatment so far. Rarity is the missing multiplier.',
      }
    }
    if (phase === 5) {
      return {
        lead: `What if we scored on “${common}” instead?`,
        body: 'It shows up everywhere. The counts look huge — and almost the same. Frequency can’t separate them.',
      }
    }
    if (phase === 6) {
      return {
        lead: 'Ingredient 2 — how rare.',
        body: `“${common}” is in nearly every document, so rarity ≈ 0. Multiply the hits by almost nothing — and the score collapses.`,
      }
    }
    if (phase >= 7) {
      return {
        lead: `“${term}” is rare — so rarity is high.`,
        body: 'Same multiplier for every match. Doc 7 still wins because it said the word more often — rarity only decides whether the word matters.',
      }
    }
    return null
  })()

  return (
    <div className="w-full max-w-5xl mx-auto h-full min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
      {(showFormula || showPlain) && (
        <div className="w-full shrink-0">
          <Bm25Formula
            accent={accent}
            isDark={isDark}
            headText={headText}
            panel={panel}
            plain={showPlain}
          />
        </div>
      )}

      {showArena && (
        <div className="w-full min-h-0 flex-1 flex flex-col items-center justify-center gap-3 overflow-hidden">
          {/* Two-factor reminder once scoring starts */}
          {scoring && (
            <div
              className="text-sm font-medium tracking-wide text-center shrink-0"
              style={{ color: softInk, ...MONO }}
            >
              score ≈{' '}
              <span style={{ color: !showingCommon || idfRare ? accent : softInk }}>how often</span>
              {' × '}
              <span style={{ color: rarityStage >= 2 ? accent : softInk }}>how rare</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
            <div
              className="rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider"
              style={{
                background: idfRare ? `${accent}22` : accent,
                color: idfRare ? accent : (isDark ? '#041018' : '#fff'),
                border: idfRare ? `1px solid ${accent}` : '1px solid transparent',
                transition: ease,
                ...MONO,
              }}
            >
              {showingCommon
                ? `scoring “${common}”`
                : idfRare
                  ? `scoring “${term}”`
                  : `query · “${term}”`}
            </div>
            {rarityStage === 1 && (
              <div
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: softInk,
                  ...MONO,
                }}
              >
                frequency only
              </div>
            )}
            {rarityStage >= 2 && (
              <div
                className="rounded-full px-5 py-2 text-sm font-bold"
                style={{
                  background: idfRare ? accent : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: idfRare ? (isDark ? '#041018' : '#fff') : softInk,
                  transform: idfRare ? 'scale(1.04)' : 'scale(1)',
                  transition: ease,
                  ...MONO,
                }}
              >
                {idfRare ? 'rarity × 4.2 · worth a lot' : 'rarity × 0.1 · almost nothing'}
              </div>
            )}
          </div>

          <div
            className="relative w-full flex items-end justify-center gap-5 sm:gap-8 min-h-0"
            style={{ paddingTop: 36, flex: '1 1 auto', maxHeight: 280 }}
          >
            {scoring && !crowned && (
              <div
                className="pointer-events-none absolute inset-x-10 bottom-20 top-16 rounded-full opacity-30"
                style={{
                  background: `radial-gradient(ellipse 65% 50% at 50% 100%, ${accent}28, transparent 72%)`,
                }}
                aria-hidden
              />
            )}

            {scenario.scoreDocs.map((d) => {
              const isWinner = Boolean(d.best)
              const avionicsCount = counts[d.id] ?? 0
              const displayCount = showingCommon ? (commonHits[d.id] ?? 90) : avionicsCount
              const displayTerm = showingCommon ? common : term
              const progress = (d.count ?? 0) > 0 ? avionicsCount / d.count : (scoring ? 1 : 0)
              // IDF is per-term — same multiplier for every matching doc
              const idfMul = !rarity ? 1 : idfCrushed ? 0.08 : idfRare ? 1 : 1
              const baseH = showingCommon ? 90 : d.h
              const fillProgress = showingCommon ? 1 : (filling || !reduce ? progress : 1)
              const fillPct = scoring ? Math.min(100, baseH * fillProgress * idfMul) : 0
              const delay = fillDelayMs(d.id)
              const isChamp = rankingActive && isWinner
              const isGhost = rankingActive && !isWinner
              const rain = filling && !crowned && !reduce && !rarity

              return (
                <div
                  key={d.id}
                  className="relative flex flex-col items-center"
                  style={{
                    width: 132,
                    transform: isChamp ? 'translateY(-8px)' : 'translateY(0)',
                    opacity: isGhost ? 0.32 : 1,
                    transition: reduce
                      ? 'none'
                      : 'transform 0.75s cubic-bezier(.22,.8,.24,1), opacity 0.55s ease',
                    zIndex: isChamp ? 4 : 1,
                    ...MONO,
                  }}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 -mt-9 h-8" aria-hidden />

                  {rain && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-20 h-12 overflow-hidden pointer-events-none"
                      style={{ top: -4 }}
                      aria-hidden
                    >
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="catalog-chip-fall"
                          style={{
                            position: 'absolute',
                            left: `${20 + i * 22}%`,
                            animationDelay: `${delay + i * 320}ms`,
                            animationDuration: `${1.05 + i * 0.12}s`,
                            background: accent,
                            color: isDark ? '#041018' : '#fff',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 5px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {term.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    className="relative w-full rounded-2xl border overflow-hidden"
                    style={{
                      height: 200,
                      borderColor: isChamp
                        ? accent
                        : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,100,221,0.14)',
                      background: isDark
                        ? 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.28))'
                        : 'linear-gradient(180deg, #fff, rgba(11,100,221,0.05))',
                      boxShadow: isChamp
                        ? `0 18px 48px ${accent}38`
                        : isDark ? 'inset 0 0 24px rgba(0,0,0,0.28)' : 'inset 0 0 16px rgba(11,100,221,0.04)',
                      transition: reduce ? 'none' : 'border-color 0.45s ease, box-shadow 0.55s ease',
                    }}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-2.5"
                      style={{
                        height: `${fillPct}%`,
                        background: idfCrushed
                          ? `linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)'}, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'})`
                          : `linear-gradient(180deg, ${accent} 0%, ${accent}cc 55%, ${accent}88 100%)`,
                        transition: reduce || filling
                          ? 'background 0.45s ease'
                          : `height ${fillEase}, background 0.55s ease`,
                      }}
                    >
                      {isChamp && (
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{
                            background: isDark ? '#041018' : '#fff',
                            color: accent,
                            boxShadow: `0 6px 16px ${accent}33`,
                            ...MONO,
                          }}
                        >
                          #1 relevant
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-x-0 top-0 pt-4 flex flex-col items-center pointer-events-none">
                      <div
                        className="text-3xl font-bold tabular-nums leading-none"
                        style={{ color: ink, ...MONO }}
                      >
                        {scoring ? displayCount : 0}
                      </div>
                      <div
                        className="text-[10px] uppercase tracking-wider mt-1"
                        style={{ color: softInk, ...MONO }}
                      >
                        {idfCrushed ? 'hits × ~0' : 'hits'}
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-3 text-lg font-bold tracking-tight"
                    style={{ color: isChamp ? accent : ink }}
                  >
                    {d.id}
                  </div>
                  <div
                    className={`text-sm mt-0.5 ${headText}`}
                    style={{ opacity: scoring ? 1 : 0.45, transition: 'opacity 0.35s', ...MONO }}
                  >
                    {scoring ? `${displayTerm} ×${displayCount}` : 'awaiting score'}
                  </div>
                </div>
              )
            })}
          </div>

          {story && (
            <div className="text-center max-w-2xl px-2 shrink-0">
              <p
                className="text-base sm:text-lg font-semibold leading-snug"
                style={{ color: ink, ...MONO }}
              >
                {story.lead}
              </p>
              <p className={`mt-1 text-sm sm:text-base leading-snug ${headText}`}>
                {story.body}
              </p>
            </div>
          )}
        </div>
      )}

      {nextLabel ? (
        <button
          type="button"
          onClick={() => onScoreStep?.()}
          className="shrink-0 rounded-full px-7 py-3 text-base font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: accent,
            color: isDark ? '#041018' : '#fff',
            boxShadow: `0 10px 28px ${accent}44`,
            ...MONO,
          }}
        >
          {nextLabel}
        </button>
      ) : null}
    </div>
  )
}

function LuceneBeat({ phase, accent, isDark, headText, mutedText, panel, reduce, onLuceneStep }) {
  const caps = [
    {
      label: 'Cleans the words',
      detail: 'Break apart, lowercase, drop noise, trim endings — so variants still match.',
      button: 'It cleans the words',
    },
    {
      label: 'Manages the index.',
      detail: 'A backwards list from word → documents. Look it up. Don’t open every file.',
      button: 'It manages the index',
    },
    {
      label: 'Scores every match',
      detail: 'How often × how rare. The best document rises to the top.',
      button: 'It scores every match',
    },
  ]
  const nextLabel = phase < 3 ? caps[phase].button : null
  const ink = isDark ? '#fff' : '#1a1a1a'
  const softInk = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const lit = phase >= 1

  return (
    <div className="w-full max-w-6xl mx-auto h-full min-h-0 flex flex-col items-center justify-center gap-4 overflow-hidden">
      <div className="w-full min-h-0 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-14">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 shrink-0">
          <div
            className={`absolute inset-0 rounded-full border-2 ${lit && !reduce ? 'catalog-pulse' : ''}`}
            style={{ borderColor: `${accent}44`, boxShadow: `0 0 64px ${accent}22` }}
          />
          <div
            className="absolute inset-10 rounded-full border flex items-center justify-center"
            style={{
              borderColor: lit ? `${accent}88` : `${accent}33`,
              background: lit
                ? `radial-gradient(circle, ${accent}33 0%, transparent 70%)`
                : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              transition: reduce ? 'none' : '0.5s',
            }}
          >
            <div className="text-center px-2">
              <div className="text-4xl sm:text-5xl font-bold" style={{ color: accent, ...MONO }}>
                Lucene
              </div>
              <div
                className="text-xs uppercase tracking-wider mt-2"
                style={{ color: softInk, ...MONO }}
              >
                one search engine
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl space-y-2 min-h-0">
          {caps.map((cap, i) => {
            const on = phase >= i + 1
            return (
              <div
                key={cap.label}
                className={`rounded-2xl border px-4 py-3 ${panel}`}
                style={{
                  opacity: on ? 1 : 0.22,
                  transform: on || reduce ? 'none' : 'translateX(10px)',
                  transition: reduce ? 'opacity 0.2s' : 'all 0.45s cubic-bezier(.22,.8,.24,1)',
                  borderColor: on ? `${accent}55` : undefined,
                  boxShadow: on ? `0 10px 28px ${accent}18` : 'none',
                  minHeight: 72,
                  ...MONO,
                }}
              >
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span
                    className="text-xs font-bold uppercase tracking-wider shrink-0"
                    style={{ color: on ? accent : softInk }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="text-base sm:text-lg font-semibold"
                    style={{ color: on ? ink : softInk }}
                  >
                    {cap.label}
                  </span>
                </div>
                <p
                  className={`mt-1 text-sm leading-snug ${headText}`}
                  style={{
                    opacity: on ? 1 : 0,
                    maxHeight: on ? 48 : 0,
                    overflow: 'hidden',
                    transition: reduce ? 'opacity 0.2s' : 'opacity 0.35s ease',
                  }}
                >
                  {cap.detail}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {phase >= 3 ? (
        <p className={`text-center text-base max-w-xl shrink-0 ${headText}`}>
          That’s the whole package — still just one process on one machine.
        </p>
      ) : (
        <p className={`text-center text-sm shrink-0 ${mutedText}`}>
          Everything you just watched, wrapped into one name.
        </p>
      )}

      {nextLabel ? (
        <button
          type="button"
          onClick={() => onLuceneStep?.()}
          className="shrink-0 rounded-full px-7 py-3 text-base font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: accent,
            color: isDark ? '#041018' : '#fff',
            boxShadow: `0 10px 28px ${accent}44`,
            ...MONO,
          }}
        >
          {nextLabel}
        </button>
      ) : null}
    </div>
  )
}

function ShardsBeat({ scenario, phase, accent, isDark, headText, mutedText, panel, reduce, onShardsStep }) {
  const steps = [
    'Split into three shards',
    'Each shard is Lucene',
    'Elasticsearch ties them together',
    'Search in parallel',
  ]
  const nextLabel = phase < 4 ? steps[phase] : null
  const ink = isDark ? '#fff' : '#1a1a1a'
  const softInk = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const cracked = phase >= 1
  const stamped = phase >= 2
  const connected = phase >= 3
  const live = phase >= 4
  const unit = scenario.unit.plural
  const ease = reduce ? 'none' : '0.55s cubic-bezier(.22,.8,.24,1)'

  const allBricks = Array.from({ length: 30 }, (_, n) => ({
    key: n,
    color: SPINE_COLORS[n % SPINE_COLORS.length],
    h: 40 + (n % 5) * 10,
    shard: Math.floor(n / 10),
  }))
  const shards = [0, 1, 2].map((s) => ({
    id: s + 1,
    bricks: allBricks.filter((b) => b.shard === s),
  }))

  const story = live
    ? {
        lead: 'Now search can scale.',
        body: 'Elasticsearch asks every Lucene at once — each shard works its own slice.',
      }
    : connected
      ? {
          lead: 'Elasticsearch holds them together.',
          body: 'One front desk. Three Lucene drawers. That’s the cluster.',
        }
      : stamped
        ? {
            lead: 'Each shard is still Lucene.',
            body: 'Same cleaning. Same index. Same scoring. Just a smaller slice of the pile.',
          }
        : cracked
          ? {
              lead: 'The pile is partitioned.',
              body: `Three shards. Roughly a third of the ${unit} in each.`,
            }
          : {
              lead: 'One Lucene isn’t enough.',
              body: 'Split the pile. Each piece gets its own Lucene.',
            }

  return (
    <div className="w-full max-w-5xl mx-auto h-full min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
      {!cracked && (
        <div className="shrink-0 flex flex-col items-center px-4 py-1">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <div
              className={`absolute inset-1 rounded-full border-2 ${!reduce ? 'catalog-pulse' : ''}`}
              style={{ borderColor: `${accent}55`, boxShadow: `0 0 28px ${accent}28` }}
              aria-hidden
            />
            <div
              className="relative w-28 h-28 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: accent, background: `${accent}18` }}
            >
              <span className="text-3xl font-bold" style={{ color: accent, ...MONO }}>L</span>
            </div>
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider" style={{ color: softInk, ...MONO }}>
            one Lucene
          </div>
        </div>
      )}

      {!cracked && (
        <div className="w-full max-w-3xl flex flex-col items-center shrink-0">
          <div
            className="w-full rounded-2xl overflow-hidden px-4 py-3"
            style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,100,221,0.14)'}`,
              boxShadow: `0 12px 28px ${accent}14`,
            }}
          >
            <div className="flex items-end justify-center gap-[3px]" style={{ minHeight: 120 }}>
              {allBricks.map((b) => (
                <div
                  key={b.key}
                  style={{
                    width: 14,
                    height: b.h,
                    flexShrink: 0,
                    borderRadius: 2,
                    background: b.color,
                    opacity: 0.9,
                    boxShadow: isDark ? '0 0 0 1px rgba(0,0,0,0.3)' : '0 0 0 1px rgba(0,0,0,0.1)',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="mt-2.5 text-center" style={MONO}>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color: accent }}>
              1,000,000,000
            </div>
            <div className="text-xs mt-0.5" style={{ color: softInk }}>
              {unit} · won’t fit
            </div>
          </div>
        </div>
      )}

      {cracked && (
        <div className="relative w-full shrink-0 flex flex-col items-center">
          <div className="w-full flex flex-col items-center" style={{ maxWidth: 904 }}>
            <div
              className={`flex flex-col items-center relative z-10 ${!reduce && connected ? 'catalog-hit-pop' : ''}`}
              style={{
                opacity: connected ? 1 : 0,
                maxHeight: connected ? 120 : 0,
                overflow: 'hidden',
                transform: connected ? 'none' : 'translateY(8px)',
                transition: ease,
              }}
            >
              <div
                className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-xl border-2 ${
                  isDark
                    ? 'bg-elastic-dev-blue border-elastic-teal/40'
                    : 'bg-white border-elastic-blue/30 shadow-md'
                }`}
              >
                <img
                  src="/logo-elastic-glyph-color.png"
                  alt="Elastic"
                  className="w-9 h-9 object-contain"
                />
                <div>
                  <div
                    className="text-sm font-bold leading-tight"
                    style={{ color: ink, ...MONO }}
                  >
                    Elasticsearch
                  </div>
                  <div className="text-xs leading-tight" style={{ color: softInk, ...MONO }}>
                    cluster
                  </div>
                </div>
              </div>
            </div>

            <div
              className="relative w-full"
              style={{
                height: connected ? 52 : 0,
                opacity: connected ? 1 : 0,
                transition: ease,
              }}
              aria-hidden
            >
              <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 52" preserveAspectRatio="none">
                {[16.67, 50, 83.33].map((x) => (
                  <path
                    key={x}
                    d={`M 50 0 C 50 ${52 * 0.45} ${x} ${52 * 0.55} ${x} 52`}
                    fill="none"
                    stroke={isDark ? 'rgba(72,239,207,0.28)' : 'rgba(11,100,221,0.18)'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            </div>

            <div className="relative w-full flex justify-center items-end gap-6 sm:gap-8">
              {shards.map((shard, sIdx) => (
                <div
                  key={shard.id}
                  className="flex flex-col items-center flex-1"
                  style={{
                    maxWidth: 280,
                    transform: live ? 'translateY(-4px)' : 'none',
                    transition: ease,
                  }}
                >
                  <div
                    className="relative w-full rounded-2xl overflow-hidden px-4 py-5"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
                      border: `1px solid ${
                        connected || live || stamped
                          ? `${accent}88`
                          : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,100,221,0.14)'
                      }`,
                      boxShadow: connected
                        ? `0 0 0 1px ${accent}55, 0 16px 40px ${accent}30`
                        : live
                          ? `0 0 0 1px ${accent}44, 0 14px 36px ${accent}28`
                          : stamped
                            ? `0 10px 24px ${accent}14`
                            : `0 10px 24px ${accent}10`,
                      transition: ease,
                    }}
                  >
                    <div
                      className={`absolute top-3 left-3 z-10 w-11 h-11 rounded-full border-2 flex items-center justify-center ${stamped && !reduce ? 'catalog-pulse' : ''}`}
                      style={{
                        borderColor: accent,
                        background: isDark ? 'rgba(4,16,24,0.85)' : 'rgba(255,255,255,0.92)',
                        boxShadow: live || stamped ? `0 0 18px ${accent}55` : 'none',
                        opacity: stamped ? 1 : 0,
                        transform: stamped ? 'scale(1)' : 'scale(0.85)',
                        transition: ease,
                        transitionDelay: reduce ? '0ms' : `${sIdx * 90}ms`,
                      }}
                    >
                      <span className="text-sm font-bold" style={{ color: accent, ...MONO }}>L</span>
                    </div>

                    {live && (
                      <div
                        className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                        style={{
                          background: accent,
                          color: isDark ? '#041018' : '#fff',
                          ...MONO,
                        }}
                      >
                        live
                      </div>
                    )}

                    <div className="flex items-end justify-center gap-[4px]" style={{ minHeight: 140 }}>
                      {shard.bricks.map((b, bi) => (
                        <div
                          key={b.key}
                          className={live && !reduce ? 'catalog-brick-scan' : ''}
                          style={{
                            width: 14,
                            height: b.h,
                            flexShrink: 0,
                            borderRadius: 2,
                            background: live ? accent : b.color,
                            opacity: live ? undefined : 0.9,
                            boxShadow: live
                              ? `0 0 10px ${accent}66`
                              : isDark ? '0 0 0 1px rgba(0,0,0,0.3)' : '0 0 0 1px rgba(0,0,0,0.1)',
                            animationDelay: live && !reduce ? `${bi * 120}ms` : undefined,
                            transition: 'background 0.35s, box-shadow 0.35s',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-2.5 text-center" style={MONO}>
                    <div className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: accent }}>
                      ~333M
                    </div>
                    <div className="text-base font-semibold mt-0.5" style={{ color: ink }}>
                      Shard {shard.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-center max-w-2xl px-2 shrink-0">
        <p className="text-base sm:text-lg font-semibold leading-snug" style={{ color: ink, ...MONO }}>
          {story.lead}
        </p>
        <p className={`mt-1 text-sm leading-snug ${headText}`}>
          {story.body}
        </p>
      </div>

      {nextLabel ? (
        <button
          type="button"
          onClick={() => onShardsStep?.()}
          className="shrink-0 rounded-full px-6 py-2.5 text-sm sm:text-base font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: accent,
            color: isDark ? '#041018' : '#fff',
            boxShadow: `0 8px 22px ${accent}44`,
            ...MONO,
          }}
        >
          {nextLabel}
        </button>
      ) : null}
    </div>
  )
}

function ScatterBeat({ scenario, phase, accent, isDark, headText, mutedText, panel, reduce, onScatterStep }) {
  const steps = ['Send the query', 'Each shard answers', 'Merge the winners']
  const nextLabel = phase < 3 ? steps[phase] : null
  const ink = isDark ? '#fff' : '#1a1a1a'
  const softInk = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const ease = reduce ? 'none' : '0.55s cubic-bezier(.22,.8,.24,1)'
  const term = scenario.queryTerm
  const sent = phase >= 1
  const answered = phase >= 2
  const merged = phase >= 3
  const scanning = sent && !merged

  const zoneRef = useRef(null)
  const pathRefs = useRef([])
  const outBallRefs = useRef([])
  const animsRef = useRef([])

  const shardCards = scenario.shardResults.map((s, i) => ({
    ...s,
    bricks: Array.from({ length: 10 }, (_, bi) => {
      const n = i * 10 + bi
      return {
        key: n,
        color: SPINE_COLORS[n % SPINE_COLORS.length],
        h: 36 + (n % 5) * 7,
      }
    }),
    hits: s.lines.map((line) => {
      const [rawId, score] = line.split('·').map((part) => part.trim())
      const num = rawId.replace(/^d/i, '')
      return { label: `Doc ${num}`, score }
    }),
  }))

  const story = merged
    ? {
        lead: 'One ranked list. Best score on top.',
        body: 'Elasticsearch gathers every shard’s hits and sorts them together.',
      }
    : answered
      ? {
          lead: 'Each shard answers on its own slice.',
          body: 'Local scores pop out — only the best hits from each Lucene.',
        }
      : sent
        ? {
            lead: 'Elasticsearch fans the query out.',
            body: `“${term}” hits every Lucene at once. Watch them search.`,
          }
        : {
            lead: 'The shards are ready.',
            body: 'Elasticsearch asks them all at once — then brings the answers home.',
          }

  useEffect(() => {
    const zone = zoneRef.current
    if (!zone) return undefined

    const layoutPaths = () => {
      const W = zone.clientWidth
      const H = zone.clientHeight
      if (!W || !H) return false
      const midX = W / 2
      ;[W * (1 / 6), W * 0.5, W * (5 / 6)].forEach((endX, i) => {
        pathRefs.current[i]?.setAttribute(
          'd',
          `M ${midX} 0 C ${midX} ${H * 0.45} ${endX} ${H * 0.55} ${endX} ${H}`,
        )
      })
      return true
    }

    const clearAnims = () => {
      animsRef.current.forEach((a) => a?.pause?.())
      animsRef.current = []
      outBallRefs.current.forEach((ball) => {
        if (ball) ball.style.opacity = '0'
      })
    }

    const fanOut = () => {
      if (!layoutPaths()) return
      pathRefs.current.forEach((pathEl, i) => {
        const ball = outBallRefs.current[i]
        if (!pathEl || !ball) return
        ball.style.opacity = '0'
        const a = animate(ball, {
          ...createMotionPath(pathEl),
          opacity: [0, 1, 1, 0],
          duration: 900,
          delay: i * 90,
          easing: 'easeInCubic',
          onComplete: () => {
            if (ball) ball.style.opacity = '0'
          },
        })
        animsRef.current.push(a)
      })
    }

    let raf = requestAnimationFrame(() => {
      layoutPaths()
      if (!sent || reduce) {
        clearAnims()
        return
      }
      clearAnims()
      fanOut()
    })

    const onResize = () => layoutPaths()
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      clearAnims()
      window.removeEventListener('resize', onResize)
    }
  }, [sent, reduce, isDark])

  return (
    <div className="w-full max-w-5xl mx-auto h-full min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
      <div className="w-full flex flex-col items-center shrink-0" style={{ maxWidth: 904 }}>
        <div
          className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-xl border-2 relative z-10 ${
            isDark
              ? 'bg-elastic-dev-blue border-elastic-teal/40'
              : 'bg-white border-elastic-blue/30 shadow-md'
          }`}
          style={{
            opacity: merged ? 0.55 : 1,
            transition: ease,
          }}
        >
          <img
            src="/logo-elastic-glyph-color.png"
            alt="Elastic"
            className="w-9 h-9 object-contain"
          />
          <div>
            <div className="text-sm font-bold leading-tight" style={{ color: ink, ...MONO }}>
              Elasticsearch
            </div>
            <div
              className="mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold"
              style={{
                background: sent ? `${accent}22` : accent,
                color: sent ? accent : (isDark ? '#041018' : '#fff'),
                border: sent ? `1px solid ${accent}` : '1px solid transparent',
                transition: ease,
                ...MONO,
              }}
            >
              query · “{term}”
            </div>
          </div>
        </div>

        <div
          ref={zoneRef}
          className="relative w-full"
          style={{ height: 56 }}
          aria-hidden
        >
          <svg className="absolute inset-0 w-full h-full overflow-visible">
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                ref={(el) => { pathRefs.current[i] = el }}
                fill="none"
                stroke={
                  scanning
                    ? (isDark ? 'rgba(72,239,207,0.55)' : 'rgba(11,100,221,0.4)')
                    : (isDark ? 'rgba(72,239,207,0.28)' : 'rgba(11,100,221,0.18)')
                }
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="6 4"
              />
            ))}
          </svg>
          {[0, 1, 2].map((i) => (
            <div
              key={`orb-${i}`}
              ref={(el) => { outBallRefs.current[i] = el }}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 12,
                height: 12,
                left: 0,
                top: 0,
                marginLeft: -6,
                marginTop: -6,
                backgroundColor: accent,
                boxShadow: isDark
                  ? '0 0 10px 3px rgba(72,239,207,0.65)'
                  : '0 0 10px 3px rgba(11,100,221,0.55)',
                opacity: 0,
                zIndex: 5,
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 sm:gap-5 w-full">
          {shardCards.map((s, i) => (
            <div key={s.name} className="flex flex-col items-center">
              <div
                className={`relative w-full rounded-2xl overflow-hidden px-3 py-3 ${panel}`}
                style={{
                  borderColor: answered || scanning
                    ? `${accent}77`
                    : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,100,221,0.14)',
                  boxShadow: scanning || answered ? `0 12px 32px ${accent}18` : 'none',
                  transition: ease,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: accent,
                      background: `${accent}18`,
                      boxShadow: scanning ? `0 0 14px ${accent}44` : 'none',
                    }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: accent, ...MONO }}>L</span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: ink, ...MONO }}>
                    {s.name}
                  </div>
                </div>

                <div className="flex items-end justify-center gap-[3px]" style={{ minHeight: 64 }}>
                  {s.bricks.map((b, bi) => (
                    <div
                      key={b.key}
                      className={scanning && !reduce ? 'catalog-brick-scan' : ''}
                      style={{
                        width: 11,
                        height: b.h,
                        flexShrink: 0,
                        borderRadius: 2,
                        background: scanning ? accent : b.color,
                        opacity: scanning ? undefined : 0.88,
                        boxShadow: scanning
                          ? `0 0 8px ${accent}55`
                          : isDark ? '0 0 0 1px rgba(0,0,0,0.3)' : '0 0 0 1px rgba(0,0,0,0.1)',
                        animationDelay: scanning && !reduce ? `${bi * 110}ms` : undefined,
                        transition: 'background 0.35s',
                      }}
                    />
                  ))}
                </div>

                <div
                  className="mt-2.5 flex flex-col gap-1 min-h-[3.25rem]"
                  style={{
                    opacity: answered && !merged ? 1 : answered && merged ? 0.25 : 0,
                    transition: ease,
                  }}
                >
                  {s.hits.map((h, hi) => (
                    <div
                      key={`${s.name}-${h.label}`}
                      className={`flex justify-between items-center text-[11px] px-2 py-1 rounded-lg ${answered && !merged && !reduce ? 'catalog-hit-pop' : ''}`}
                      style={{
                        background: `${accent}18`,
                        animationDelay: reduce ? undefined : `${i * 60 + hi * 90}ms`,
                        ...MONO,
                      }}
                    >
                      <span style={{ color: ink }}>{h.label}</span>
                      <span style={{ color: accent, fontWeight: 700 }}>{h.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`w-full rounded-2xl border p-3 sm:p-4 shrink-0 ${panel}`}
        style={{
          opacity: merged ? 1 : answered ? 0.35 : 0.15,
          transform: merged ? 'none' : 'translateY(6px)',
          transition: ease,
          borderColor: merged ? `${accent}66` : undefined,
          boxShadow: merged ? `0 14px 36px ${accent}18` : 'none',
          minHeight: 88,
          maxWidth: 904,
        }}
      >
        <div className="text-[10px] uppercase tracking-wider mb-2.5" style={{ color: accent, ...MONO }}>
          {merged ? 'one ranked list' : 'gather · waiting for hits'}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {scenario.mergedHits.map((h, i) => {
            const isWinner = i === 0
            const landDelay = (scenario.mergedHits.length - 1 - i) * 160
            return (
              <div
                key={h.label}
                className={`flex justify-between items-center text-sm px-3 py-2.5 rounded-xl ${merged && !reduce ? 'catalog-hit-land' : ''}`}
                style={{
                  background: merged
                    ? `${accent}${isWinner ? '33' : '14'}`
                    : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  boxShadow: merged && isWinner ? `0 0 0 1px ${accent}, 0 8px 22px ${accent}33` : undefined,
                  transform: merged && isWinner ? 'scale(1.03)' : undefined,
                  animationDelay: merged && !reduce ? `${landDelay}ms` : undefined,
                  opacity: merged ? 1 : 0.35,
                  ...MONO,
                }}
              >
                <span style={{ color: ink, fontWeight: isWinner && merged ? 700 : 500 }}>
                  {isWinner && merged ? `#1 ${h.label}` : h.label}
                </span>
                <span style={{ color: accent, fontWeight: 700 }}>{h.score}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="text-center max-w-2xl px-2 shrink-0">
        <p className="text-base sm:text-lg font-semibold leading-snug" style={{ color: ink, ...MONO }}>
          {story.lead}
        </p>
        <p className={`mt-1 text-sm leading-snug ${headText}`}>
          {story.body}
        </p>
      </div>

      {nextLabel ? (
        <button
          type="button"
          onClick={() => onScatterStep?.()}
          className="shrink-0 rounded-full px-6 py-2.5 text-sm sm:text-base font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: accent,
            color: isDark ? '#041018' : '#fff',
            boxShadow: `0 8px 22px ${accent}44`,
            ...MONO,
          }}
        >
          {nextLabel}
        </button>
      ) : null}
    </div>
  )
}

function ReplicasBeat({ phase, accent, danger, isDark, headText, mutedText, panel, reduce, onReplicasStep }) {
  const steps = ['Distribute copies', 'A node fails', 'Promote a replica']
  const nextLabel = phase < 3 ? steps[phase] : null
  const ink = isDark ? '#fff' : '#1a1a1a'
  const softInk = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const ease = reduce ? 'none' : '0.55s cubic-bezier(.22,.8,.24,1)'
  const showCopies = phase >= 1
  const failed = phase >= 2
  const recovered = phase >= 3

  // A: P1 + R2 · B: P2 + R3 (dies) · C: P3 + R1
  // When B dies, R2 on A becomes the new primary for shard 2
  const nodes = [
    {
      id: 'A',
      primary: { shardId: 1, role: 'primary' },
      replica: { shardId: 2, role: 'replica', promotes: true },
      dead: false,
    },
    {
      id: 'B',
      primary: { shardId: 2, role: 'primary' },
      replica: { shardId: 3, role: 'replica', promotes: false },
      dead: true,
    },
    {
      id: 'C',
      primary: { shardId: 3, role: 'primary' },
      replica: { shardId: 1, role: 'replica', promotes: false },
      dead: false,
    },
  ]

  const story = recovered
    ? {
        lead: 'Search never stopped.',
        body: 'Elasticsearch promoted the spare. Users didn’t notice.',
      }
    : failed
      ? {
          lead: 'Node B is gone.',
          body: 'Shard 2’s primary just vanished. Without a spare, that slice goes dark.',
        }
      : showCopies
        ? {
            lead: 'Elasticsearch keeps spare copies.',
            body: 'Primaries do the work. Replicas are live copies on other nodes — ready.',
          }
        : {
            lead: 'Scale isn’t enough. You need resilience.',
            body: 'Right now each shard lives in only one place. That’s a single point of failure.',
          }

  return (
    <div className="w-full max-w-5xl mx-auto h-full min-h-0 flex flex-col items-center justify-center gap-6 sm:gap-8 overflow-hidden">
      <div className="grid grid-cols-3 gap-4 sm:gap-5 w-full shrink-0">
        {nodes.map((n, i) => {
          const isDown = n.dead && failed
          const promoteHere = recovered && n.replica.promotes
          const waitingSpare = failed && !recovered && n.replica.promotes
          return (
            <div
              key={n.id}
              className={`relative rounded-2xl border p-4 sm:p-5 ${panel} ${
                isDown && !reduce ? 'catalog-node-die' : ''
              }`}
              style={{
                borderColor: isDown
                  ? `${danger}99`
                  : promoteHere
                    ? `${accent}88`
                    : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,100,221,0.14)',
                boxShadow: isDown
                  ? `0 0 28px ${danger}33`
                  : promoteHere
                    ? `0 14px 36px ${accent}22`
                    : `0 10px 28px ${accent}10`,
                filter: isDown ? 'grayscale(0.7) brightness(0.75)' : 'none',
                transform: promoteHere ? 'translateY(-4px)' : 'none',
                transition: ease,
                transitionDelay: reduce ? '0ms' : `${i * 60}ms`,
              }}
            >
              {isDown && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
                  aria-hidden
                >
                  <div
                    className="absolute left-[-10%] right-[-10%] top-1/2 h-[3px] -rotate-12"
                    style={{ background: danger, opacity: 0.85, boxShadow: `0 0 12px ${danger}` }}
                  />
                </div>
              )}

              <div className="relative flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src="/logo-elastic-glyph-color.png"
                    alt=""
                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
                    style={{ opacity: isDown ? 0.45 : 1, filter: isDown ? 'grayscale(1)' : 'none' }}
                  />
                  <div className="text-base sm:text-lg font-bold" style={{ color: ink, ...MONO }}>
                    Node {n.id}
                  </div>
                </div>
                {isDown && (
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: danger, color: '#fff', ...MONO }}
                  >
                    lost
                  </span>
                )}
                {promoteHere && (
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      !reduce ? 'catalog-hit-pop' : ''
                    }`}
                    style={{ background: accent, color: isDark ? '#041018' : '#fff', ...MONO }}
                  >
                    saved it
                  </span>
                )}
              </div>

              <ShardLuceneChip
                shardId={n.primary.shardId}
                role={n.primary.role}
                accent={accent}
                danger={danger}
                isDark={isDark}
                softInk={softInk}
                tone={isDown ? 'dead' : 'primary'}
                className="mb-2"
                style={{ transition: ease }}
              />

              <ShardLuceneChip
                shardId={n.replica.shardId}
                role={
                  promoteHere
                    ? 'now primary'
                    : waitingSpare
                      ? 'replica · ready'
                      : showCopies
                        ? n.replica.role
                        : '—'
                }
                accent={accent}
                danger={danger}
                isDark={isDark}
                softInk={softInk}
                tone={
                  promoteHere
                    ? 'promote'
                    : waitingSpare
                      ? 'waiting'
                      : isDown
                        ? 'dead'
                        : showCopies
                          ? 'replica'
                          : 'ghost'
                }
                className={
                  showCopies && !reduce
                    ? promoteHere
                      ? 'catalog-promote'
                      : 'catalog-replica-in'
                    : ''
                }
                style={{
                  animationDelay: reduce || !showCopies ? undefined : `${i * 90}ms`,
                  transform: showCopies ? undefined : 'translateY(6px)',
                  transition: ease,
                }}
              />
            </div>
          )
        })}
      </div>

      {recovered && (
        <div
          className={`text-base sm:text-lg font-semibold px-6 py-3 rounded-full shrink-0 ${!reduce ? 'catalog-beacon' : ''}`}
          style={{
            background: `${accent}22`,
            color: accent,
            '--catalog-accent-glow': `${accent}44`,
            ...MONO,
          }}
        >
          search keeps working · nobody notices
        </div>
      )}

      <div className="text-center max-w-2xl px-2 shrink-0">
        <p className="text-lg sm:text-xl font-semibold leading-snug" style={{ color: ink, ...MONO }}>
          {story.lead}
        </p>
        <p className={`mt-1.5 text-base leading-snug ${headText}`}>
          {story.body}
        </p>
      </div>

      {nextLabel ? (
        <button
          type="button"
          onClick={() => onReplicasStep?.()}
          className="shrink-0 rounded-full px-7 py-3 text-base sm:text-lg font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: phase === 1 ? danger : accent,
            color: phase === 1 ? '#fff' : (isDark ? '#041018' : '#fff'),
            boxShadow: phase === 1 ? `0 8px 22px ${danger}44` : `0 8px 22px ${accent}44`,
            ...MONO,
          }}
        >
          {nextLabel}
        </button>
      ) : null}
    </div>
  )
}

function LibraryBeat({ scenario, phase, accent, isDark, headText, mutedText, panel, reduce, onLibraryStep }) {
  const steps = ['One drawer', 'A catalog of drawers', 'Close the loop']
  const nextLabel = phase < 3 ? steps[phase] : null
  const ink = isDark ? '#fff' : '#1a1a1a'
  const softInk = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const ease = reduce ? 'none' : '0.55s cubic-bezier(.22,.8,.24,1)'
  const showLucene = phase >= 1
  const showEs = phase >= 2
  const punchline = phase >= 3
  const term = scenario.queryTerm
  const docs = (scenario.indexRows?.find((r) => r.hit)?.docs
    || scenario.closingExample?.split('→')[1]
    || '3, 7, 11').toString().replace(/\s/g, '')

  const luceneCaps = [
    'manages the index',
    'washes the words',
    'scores the matches',
    'one drawer — alone',
  ]
  const esCaps = [
    'many drawers · shards',
    'spare drawers · replicas',
    'one front desk · JSON',
    'asks every drawer at once',
  ]

  const story = punchline
    ? {
        lead: 'That’s the difference.',
        body: 'One drawer can’t hold a billion docs or survive a crash. A catalog of them can.',
      }
    : showEs
      ? {
          lead: 'Elasticsearch is the card catalog.',
          body: 'Shards, scatter/gather, replicas — everything you just watched outside one Lucene.',
        }
      : showLucene
        ? {
            lead: 'Lucene is one drawer.',
            body: 'Everything from the start of this story — the list, the wash, the score — lives in a single drawer.',
          }
        : {
            lead: '',
            body: 'Lucene is the drawer. Elasticsearch is the catalog that runs many of them.',
          }

  const CatalogCard = ({ size = 'md', label, dimmed = false }) => {
    const big = size === 'lg'
    return (
      <div
        className="rounded-2xl border text-center"
        style={{
          width: big ? 168 : 108,
          padding: big ? '16px 14px' : '10px 8px',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)',
          borderColor: dimmed
            ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')
            : accent,
          boxShadow: dimmed ? 'none' : `0 10px 28px ${accent}22`,
          opacity: dimmed ? 0.45 : 1,
          transition: ease,
          ...MONO,
        }}
      >
        <div
          className="mx-auto rounded-full border-2 flex items-center justify-center mb-2"
          style={{
            width: big ? 40 : 28,
            height: big ? 40 : 28,
            borderColor: accent,
            background: `${accent}18`,
          }}
        >
          <span
            className="font-bold"
            style={{ color: accent, fontSize: big ? 16 : 11 }}
          >
            L
          </span>
        </div>
        <div
          className="font-bold uppercase tracking-wider truncate"
          style={{ color: accent, fontSize: big ? 14 : 10 }}
        >
          {term}
        </div>
        <div
          className="mt-1.5 flex justify-center gap-1"
          aria-hidden
        >
          {makeShardBricks(1, big ? 8 : 5).map((b) => (
            <div
              key={b.key}
              style={{
                width: big ? 7 : 5,
                height: big ? b.h + 6 : Math.max(8, b.h - 2),
                borderRadius: 1.5,
                background: b.color,
              }}
            />
          ))}
        </div>
        {label && (
          <div
            className="mt-2 uppercase tracking-wider"
            style={{ color: softInk, fontSize: big ? 10 : 8 }}
          >
            {label}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto h-full min-h-0 flex flex-col items-center justify-center gap-5 sm:gap-7 overflow-hidden">
      {!showLucene && (
        <div className="shrink-0 flex flex-col items-center gap-3">
          <CatalogCard size="lg" label="one drawer" />
          <div className="text-xs sm:text-sm" style={{ color: softInk, ...MONO }}>
            “{term}” → {docs}
          </div>
        </div>
      )}

      {showLucene && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full shrink-0">
          <div
            className={`rounded-2xl border p-5 sm:p-6 ${panel} ${!reduce ? 'catalog-hit-pop' : ''}`}
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,100,221,0.14)',
              boxShadow: `0 12px 32px ${accent}12`,
              transition: ease,
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <CatalogCard size="md" label="alone" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: softInk, ...MONO }}>
                  one drawer
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold leading-none" style={{ color: ink }}>
                  Lucene
                </h3>
              </div>
            </div>

            <ul className="space-y-2.5">
              {luceneCaps.map((t, i) => (
                <li
                  key={t}
                  className={`flex items-start gap-2 text-sm sm:text-base ${!reduce ? 'catalog-hit-pop' : ''}`}
                  style={{
                    color: ink,
                    animationDelay: reduce ? undefined : `${80 + i * 70}ms`,
                    ...MONO,
                  }}
                >
                  <span style={{ color: accent }}>▸</span> {t}
                </li>
              ))}
            </ul>
          </div>

          <div
            className={`rounded-2xl border p-5 sm:p-6 relative overflow-hidden ${panel}`}
            style={{
              opacity: showEs ? 1 : 0.22,
              transform: showEs ? 'none' : 'translateY(8px)',
              transition: ease,
              borderColor: showEs ? `${accent}66` : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,100,221,0.1)'),
              boxShadow: showEs ? `0 16px 48px ${accent}18` : 'none',
            }}
          >
            {showEs && (
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{ background: `radial-gradient(circle at 80% 0%, ${accent}33, transparent 50%)` }}
                aria-hidden
              />
            )}
            <div className="relative">
              <div className="mb-3">
                <div
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: showEs ? accent : softInk, ...MONO }}
                >
                  a catalog of drawers
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src="/logo-elastic-glyph-color.png"
                    alt=""
                    className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0"
                    style={{ opacity: showEs ? 1 : 0.35 }}
                  />
                  <h3
                    className="text-2xl sm:text-3xl font-bold leading-none"
                    style={{ color: showEs ? accent : softInk }}
                  >
                    Elasticsearch
                  </h3>
                </div>
              </div>

              {showEs ? (
                <>
                  <div className={`flex justify-center gap-2 sm:gap-3 mb-3 ${!reduce ? 'catalog-hit-pop' : ''}`}>
                    {[1, 2, 3].map((id) => (
                      <div key={id} className="flex flex-col items-center gap-1">
                        <div
                          className="rounded-xl border px-2 py-2 text-center"
                          style={{
                            width: 88,
                            background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                            borderColor: accent,
                            ...MONO,
                          }}
                        >
                          <div
                            className="mx-auto w-6 h-6 rounded-full border-2 flex items-center justify-center mb-1"
                            style={{ borderColor: accent, background: `${accent}18` }}
                          >
                            <span className="text-[10px] font-bold" style={{ color: accent }}>L</span>
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: accent }}>
                            {term}
                          </div>
                          <div className="mt-1 flex justify-center gap-[2px]" aria-hidden>
                            {makeShardBricks(id, 5).map((b) => (
                              <div
                                key={b.key}
                                style={{
                                  width: 4,
                                  height: Math.max(7, b.h - 3),
                                  borderRadius: 1,
                                  background: b.color,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-[9px] font-bold" style={{ color: softInk, ...MONO }}>
                          drawer {id}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    {[1, 2, 3].map((id) => (
                      <div
                        key={`r-${id}`}
                        className="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-center"
                        style={{
                          background: isDark ? 'rgba(240,78,152,0.12)' : 'rgba(220,38,38,0.08)',
                          color: isDark ? '#F04E98' : '#DC2626',
                          ...MONO,
                        }}
                      >
                        spare · D{id}
                      </div>
                    ))}
                  </div>

                  <ul className="space-y-2.5">
                    {esCaps.map((t, i) => (
                      <li
                        key={t}
                        className={`flex items-start gap-2 text-sm sm:text-base ${!reduce ? 'catalog-hit-pop' : ''}`}
                        style={{
                          color: ink,
                          animationDelay: reduce ? undefined : `${100 + i * 70}ms`,
                          ...MONO,
                        }}
                      >
                        <span style={{ color: accent }}>▸</span> {t}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm sm:text-base" style={{ color: softInk, ...MONO }}>
                  waiting for the catalog…
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {punchline && (
        <div
          className={`text-base sm:text-lg font-semibold px-6 py-3 rounded-full text-center max-w-xl shrink-0 ${!reduce ? 'catalog-beacon' : ''}`}
          style={{
            background: `${accent}22`,
            color: accent,
            '--catalog-accent-glow': `${accent}44`,
            ...MONO,
          }}
        >
          drawer = Lucene · catalog = Elasticsearch
        </div>
      )}

      <div className="text-center max-w-2xl px-2 shrink-0">
        {story.lead ? (
          <p className="text-lg sm:text-xl font-semibold leading-snug" style={{ color: ink, ...MONO }}>
            {story.lead}
          </p>
        ) : null}
        <p className={`text-base leading-snug ${headText} ${story.lead ? 'mt-1.5' : ''}`}>
          {story.body}
        </p>
      </div>

      {nextLabel ? (
        <button
          type="button"
          onClick={() => onLibraryStep?.()}
          className="shrink-0 rounded-full px-7 py-3 text-base sm:text-lg font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: accent,
            color: isDark ? '#041018' : '#fff',
            boxShadow: `0 8px 22px ${accent}44`,
            ...MONO,
          }}
        >
          {nextLabel}
        </button>
      ) : null}
    </div>
  )
}

export function CatalogBeatStage({
  beatKey,
  scenario,
  phase,
  scanAt,
  scanProgress = -1,
  accent,
  danger,
  isDark,
  headText,
  mutedText,
  panel,
  prefersReducedMotion: reduce,
  onLookup,
  onAnalyzeStep,
  onScoreStep,
  onLuceneStep,
  onShardsStep,
  onScatterStep,
  onReplicasStep,
  onLibraryStep,
  onScan,
}) {
  const shared = { scenario, phase, accent, danger, isDark, headText, mutedText, panel, reduce }

  switch (beatKey) {
    case 'scan':
      return <ScanBeat {...shared} scanAt={scanAt} onScan={onScan} />
    case 'invert':
      return <InvertBeat {...shared} onLookup={onLookup} />
    case 'analyze':
      return <AnalyzeBeat {...shared} onAnalyzeStep={onAnalyzeStep} />
    case 'score':
      return (
        <div className="h-full w-full min-h-0 flex items-center justify-center">
          <ScoreBeat {...shared} onScoreStep={onScoreStep} />
        </div>
      )
    case 'lucene':
      return (
        <div className="h-full w-full min-h-0 flex items-center justify-center">
          <LuceneBeat {...shared} onLuceneStep={onLuceneStep} />
        </div>
      )
    case 'shards':
      return (
        <div className="h-full w-full min-h-0 flex items-center justify-center">
          <ShardsBeat {...shared} onShardsStep={onShardsStep} />
        </div>
      )
    case 'scatter':
      return (
        <div className="h-full w-full min-h-0 flex items-center justify-center">
          <ScatterBeat {...shared} onScatterStep={onScatterStep} />
        </div>
      )
    case 'replicas':
      return (
        <div className="h-full w-full min-h-0 flex items-center justify-center">
          <ReplicasBeat {...shared} onReplicasStep={onReplicasStep} />
        </div>
      )
    case 'library':
      return (
        <div className="h-full w-full min-h-0 flex items-center justify-center">
          <LibraryBeat {...shared} onLibraryStep={onLibraryStep} />
        </div>
      )
    default:
      return null
  }
}
