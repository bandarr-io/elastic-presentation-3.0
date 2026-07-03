import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { resolveIcon } from '../data/iconOptions'
import { faServer, faDatabase, faFilter, faShuffle, faBrain } from '@fortawesome/free-solid-svg-icons'

// Source: "Architectural Design Considerations (Node Types)" reference diagram.
// Dark theme gives each node role a distinct brand accent so the diagram reads as
// a legend (like the hand-drawn original); light theme collapses every role to the
// elastic-blue accent to stay in line with the rest of the deck.
const COLORS = {
  master: '#8A9BB4',
  data: '#FEC514',
  ingest: '#48EFCF',
  coordinating: '#FF957D',
  ml: '#0B64DD',
}

const DEFAULT_NODES = [
  {
    id: 'master',
    label: 'Master Nodes',
    icon: faServer,
    color: COLORS.master,
    description:
      "Manage the cluster's metadata and coordinate operations, ensuring cluster stability and consistency.",
  },
  {
    id: 'data',
    label: 'Data Nodes',
    icon: faDatabase,
    color: COLORS.data,
    description:
      'Store and retrieve data, handling indexing and search operations. They manage shards and replicas to balance load and provide redundancy.',
  },
  {
    id: 'ingest',
    label: 'Ingest Nodes',
    icon: faFilter,
    color: COLORS.ingest,
    description:
      'Preprocess data through pipelines, performing transformations and enrichments before data reaches the data nodes for indexing.',
  },
  {
    id: 'coordinating',
    label: 'Coordinating Nodes',
    icon: faShuffle,
    color: COLORS.coordinating,
    description:
      'Receive client requests, distribute tasks across data nodes, and aggregate results, optimizing performance and scalability.',
  },
  {
    id: 'ml',
    label: 'Machine Learning Nodes',
    icon: faBrain,
    color: COLORS.ml,
    description:
      'Analyze data stored within the cluster, performing tasks like anomaly detection to enhance data insights.',
  },
]

function NodeTypesScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Architectural Design Considerations'
  const titlePlain = metadata.titlePlain || 'Elasticsearch '
  const titleAccent = metadata.titleAccent || 'node types'
  const subtitle =
    metadata.subtitle ||
    'A distributed system composed of several node types, each fulfilling specialized roles.'
  const bannerLabel = metadata.bannerLabel || 'Elasticsearch'
  const footnote =
    metadata.footnote ||
    'Multiple roles can be fulfilled by a single node depending upon the size of the cluster.'
  const callout =
    metadata.callout ||
    'These nodes work collaboratively to form a resilient, scalable, and efficient search and analytics platform.'

  const nodes = (metadata.nodes || DEFAULT_NODES).map((n, i) => {
    const merged = { ...(DEFAULT_NODES[i] || {}), ...n }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_NODES[i]?.icon || faServer) }
  })

  const teal = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 460,
      delay: stagger(70),
      easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-5 overflow-hidden">
      <div ref={rootRef} className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        {/* Elasticsearch banner */}
        <div
          className="reveal shrink-0 rounded-2xl border flex items-center justify-center py-3 mb-3"
          style={{ borderColor: `${teal}55`, background: `${teal}14` }}
        >
          <span className="font-headline font-extrabold text-2xl md:text-3xl" style={{ color: teal }}>
            {bannerLabel}
          </span>
        </div>

        {/* Node rows */}
        <div className="flex-1 min-h-0 flex flex-col gap-2.5">
          {nodes.map((n) => {
            const accent = isDark ? n.color : '#0B64DD'
            return (
              <div
                key={n.id}
                className="reveal relative rounded-2xl border flex items-center gap-5 px-5 py-2 flex-1 min-h-0 overflow-hidden"
                style={{ borderColor: `${accent}55`, background: cardBg, borderLeftWidth: '5px', borderLeftColor: accent }}
              >
                {/* Label chip — stretches to the row height so its content never
                    overflows when rows shrink to share the available space. */}
                <div
                  className="shrink-0 w-52 self-stretch rounded-xl px-4 flex items-center gap-3"
                  style={{ backgroundColor: `${accent}1f` }}
                >
                  <NodeGlyph color={accent} icon={n.icon} />
                  <span className={`font-bold text-sm md:text-base leading-tight ${headText}`}>{n.label}</span>
                </div>

                {/* Description */}
                <p className={`flex-1 text-sm md:text-base leading-snug ${mutedText}`}>{n.description}</p>
              </div>
            )
          })}
        </div>

        {/* Footer callout + footnote */}
        <div className="reveal shrink-0 mt-3 flex flex-col gap-1.5">
          <p className={`text-center text-base md:text-lg font-semibold ${headText}`}>{callout}</p>
          <p className={`text-center text-xs md:text-sm ${isDark ? 'text-white/45' : 'text-elastic-dark-ink/50'}`}>
            * {footnote}
          </p>
        </div>
      </div>
    </div>
  )
}

// Small "stacked node" glyph echoing the source diagram: a server icon over two status dots.
function NodeGlyph({ color, icon }) {
  return (
    <span className="shrink-0 w-9 h-9 rounded-lg flex flex-col items-center justify-center gap-0.5" style={{ backgroundColor: `${color}22`, color }}>
      <FontAwesomeIcon icon={icon} className="text-sm" />
      <span className="flex gap-1">
        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
      </span>
    </span>
  )
}

export default NodeTypesScene
