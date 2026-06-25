import { useEffect, useState, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { resolveIcon } from '../data/iconOptions'
import { balancedColumns, gridColumnsStyle } from '../utils/layout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faRightLeft,
  faRobot,
  faShieldHalved,
  faEnvelopeOpenText,
  faTerminal,
  faMagnifyingGlassChart,
  faTableColumns,
  faClipboardCheck,
  faXmark,
  faChevronLeft,
  faChevronRight,
  faExpand,
  faImage,
} from '@fortawesome/free-solid-svg-icons'

// Generic placeholder cards — this scene is intended as a layout template.
// Override via Settings → Customizations → Visual Gallery (add an Image URL
// per card to show a screenshot; otherwise a neutral tile is shown).
const DEFAULT_USE_CASES = [
  { title: 'Card Title One', tag: 'Category · Source', icon: faRightLeft, image: '', points: ['Bullet point placeholder one', 'Bullet point placeholder two', 'Bullet point placeholder three'] },
  { title: 'Card Title Two', tag: 'Category · Source', icon: faRobot, image: '', points: ['Bullet point placeholder one', 'Bullet point placeholder two', 'Bullet point placeholder three'] },
  { title: 'Card Title Three', tag: 'Category · Source', icon: faShieldHalved, image: '', points: ['Bullet point placeholder one', 'Bullet point placeholder two', 'Bullet point placeholder three'] },
  { title: 'Card Title Four', tag: 'Category · Source', icon: faEnvelopeOpenText, image: '', points: ['Bullet point placeholder one', 'Bullet point placeholder two', 'Bullet point placeholder three'] },
  { title: 'Card Title Five', tag: 'Category · Source', icon: faTerminal, image: '', points: ['Bullet point placeholder one', 'Bullet point placeholder two', 'Bullet point placeholder three'] },
  { title: 'Card Title Six', tag: 'Category · Source', icon: faMagnifyingGlassChart, image: '', points: ['Bullet point placeholder one', 'Bullet point placeholder two', 'Bullet point placeholder three'] },
  { title: 'Card Title Seven', tag: 'Category · Source', icon: faTableColumns, image: '', points: ['Bullet point placeholder one', 'Bullet point placeholder two', 'Bullet point placeholder three'] },
  { title: 'Card Title Eight', tag: 'Category · Source', icon: faClipboardCheck, image: '', points: ['Bullet point placeholder one', 'Bullet point placeholder two', 'Bullet point placeholder three'] },
]

function SecurityUseCasesScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [activeIndex, setActiveIndex] = useState(null)

  const useCases = (metadata.useCases || DEFAULT_USE_CASES).map((item, i) => {
    const merged = { ...(DEFAULT_USE_CASES[i] || {}), ...item }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_USE_CASES[i]?.icon) }
  })
  const eyebrow = metadata.eyebrow || 'Eyebrow text'
  const titleAccent = metadata.titleAccent || 'Section Title'
  const titlePlain = metadata.titlePlain || ' Accent'
  const subtitle =
    metadata.subtitle ||
    'Subtitle placeholder — a short supporting sentence describing the cards shown below.'

  const cardCols = balancedColumns(useCases.length, 4)

  const isOpen = activeIndex !== null
  const accent = isDark ? '#48EFCF' : '#0B64DD'

  const close = useCallback(() => setActiveIndex(null), [])
  const next = useCallback(
    () => setActiveIndex((i) => (i === null ? i : (i + 1) % useCases.length)),
    [useCases.length]
  )
  const prev = useCallback(
    () => setActiveIndex((i) => (i === null ? i : (i - 1 + useCases.length) % useCases.length)),
    [useCases.length]
  )

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [isOpen, close, next, prev])

  const active = isOpen ? useCases[activeIndex] : null

  const cardBg = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'

  return (
    <div className="flex flex-col h-full w-full px-8 py-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <SceneHeader
          accentFirst
          eyebrow={eyebrow}
          titleAccent={titleAccent}
          titlePlain={titlePlain}
          subtitle={subtitle}
        />

        <div className="flex-1 min-h-0 grid gap-4 mt-2" style={{ gridTemplateColumns: gridColumnsStyle(cardCols) }}>
          {useCases.map((uc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`group relative flex flex-col text-left rounded-2xl border overflow-hidden transition-all hover:scale-[1.015] hover:shadow-lg ${cardBg}`}
            >
              <div className="relative w-full aspect-video overflow-hidden">
                {uc.image ? (
                  <img
                    src={uc.image}
                    alt={uc.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,100,221,0.05)' }}
                  >
                    <FontAwesomeIcon icon={faImage} className="text-3xl" style={{ color: accent, opacity: 0.35 }} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: accent, color: isDark ? '#0B1628' : '#fff' }}
                >
                  <FontAwesomeIcon icon={faExpand} />
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <FontAwesomeIcon icon={uc.icon} style={{ color: accent }} className="text-sm" />
                  <h3 className={`font-bold text-sm leading-tight ${headText}`}>{uc.title}</h3>
                </div>
                <p className={`text-xs ${mutedText}`}>{uc.tag}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {isOpen && active && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 md:p-10"
          style={{ background: 'rgba(8,12,22,0.92)', backdropFilter: 'blur(6px)' }}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-5 right-5 w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xl" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            aria-label="Previous"
            className="absolute left-4 md:left-6 w-12 h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-2xl" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label="Next"
            className="absolute right-4 md:right-6 w-12 h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-2xl" />
          </button>

          <div
            className="flex flex-col lg:flex-row gap-6 items-center w-full max-w-[1500px] max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 min-w-0 flex items-center justify-center max-h-full">
              {/* Framed + capped below native size: downscaling stays sharper than upscaling a low-res capture */}
              <div className="rounded-xl p-2 bg-white/[0.04] border border-white/[0.12] shadow-2xl">
                {active.image ? (
                  <img
                    src={active.image}
                    alt={active.title}
                    className="block max-w-[800px] max-h-[62vh] object-contain rounded-md"
                  />
                ) : (
                  <div
                    className="flex items-center justify-center rounded-md"
                    style={{ width: 'min(800px, 70vw)', height: '62vh', background: 'rgba(255,255,255,0.04)' }}
                  >
                    <FontAwesomeIcon icon={faImage} className="text-6xl" style={{ color: accent, opacity: 0.3 }} />
                  </div>
                )}
              </div>
            </div>

            <div className="w-full lg:w-[340px] shrink-0 text-white">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${accent}26`, color: accent }}
                >
                  <FontAwesomeIcon icon={active.icon} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  {active.tag}
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-4 leading-tight">{active.title}</h3>
              <ul className="space-y-2.5">
                {active.points.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm leading-snug text-white/85">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 text-xs text-white/40">
                {activeIndex + 1} / {useCases.length} · ← → to navigate · Esc to close
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityUseCasesScene
