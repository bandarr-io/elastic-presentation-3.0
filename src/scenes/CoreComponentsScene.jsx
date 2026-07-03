import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { resolveIcon } from '../data/iconOptions'
import { faLayerGroup, faChartColumn, faDatabase, faFilter, faSatelliteDish } from '@fortawesome/free-solid-svg-icons'

// Source: "Core Components Overview" reference diagram — the Elastic stack shown
// as layers (solutions on top, data collection at the base) with a plain-language
// description of each layer alongside.
const COLORS = {
  solutions: '#8A9BB4',
  kibana: '#F04E98',
  elasticsearch: '#48EFCF',
  logstash: '#FEC514',
  collection: '#0B64DD',
}

const DEFAULT_LAYERS = [
  {
    id: 'solutions',
    icon: faLayerGroup,
    color: COLORS.solutions,
    boxes: ['Elastic Security', 'Elastic Observability', 'Elastic Search'],
    title: 'Elastic Solutions',
    description: 'Out-of-the-box capabilities for security, observability, and search.',
  },
  {
    id: 'kibana',
    icon: faChartColumn,
    color: COLORS.kibana,
    boxes: ['Kibana'],
    title: 'Kibana',
    description: 'The visualization layer — dashboards and interfaces for searching and analyzing data.',
  },
  {
    id: 'elasticsearch',
    icon: faDatabase,
    color: COLORS.elasticsearch,
    boxes: ['Elasticsearch'],
    title: 'Elasticsearch',
    description: 'A distributed, RESTful search engine that stores, searches, and analyzes large volumes of data in near real-time.',
  },
  {
    id: 'logstash',
    icon: faFilter,
    color: COLORS.logstash,
    boxes: ['Logstash'],
    title: 'Logstash',
    description: 'An ingest pipeline that collects, processes, and forwards data to Elasticsearch.',
  },
  {
    id: 'collection',
    icon: faSatelliteDish,
    color: COLORS.collection,
    boxes: ['Connectors · Web Crawler · Language Clients', 'Beats', 'Elastic Agent'],
    title: 'Data Collection',
    description: 'Elastic Agent unifies collection from sources and endpoints; Beats ship logs and metrics; Connectors, Language Clients, and the Web Crawler pull in third-party, application, and web content.',
  },
]

function CoreComponentsScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'The Elastic Stack'
  const titlePlain = metadata.titlePlain || 'Core components '
  const titleAccent = metadata.titleAccent || 'overview'
  const subtitle =
    metadata.subtitle ||
    'From data collection at the base to solutions on top — every layer of the platform, and what it does.'

  const layers = (metadata.layers || DEFAULT_LAYERS).map((l, i) => {
    const merged = { ...(DEFAULT_LAYERS[i] || {}), ...l }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_LAYERS[i]?.icon || faLayerGroup) }
  })

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

        <div className="flex-1 min-h-0 flex flex-col gap-2.5">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className="reveal grid gap-4 items-stretch flex-1 min-h-0"
              style={{ gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 4fr)' }}
            >
              {/* Layer boxes */}
              <div className={`grid gap-2 ${layer.boxes.length === 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {layer.boxes.map((box, i) => (
                  <div
                    key={i}
                    className="rounded-xl border flex items-center justify-center text-center px-3 py-2"
                    style={{ borderColor: `${layer.color}66`, background: `${layer.color}1c` }}
                  >
                    <span
                      className={`font-bold leading-tight ${layer.boxes.length === 1 ? 'text-xl md:text-2xl' : 'text-xs md:text-sm'} ${headText}`}
                    >
                      {box}
                    </span>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div
                className="rounded-xl border flex items-center gap-3 px-4 py-2.5"
                style={{ borderColor: `${layer.color}44`, background: cardBg }}
              >
                <span
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base"
                  style={{ backgroundColor: `${layer.color}22`, color: layer.color }}
                >
                  <FontAwesomeIcon icon={layer.icon} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight" style={{ color: layer.color }}>
                    {layer.title}
                  </p>
                  <p className={`text-xs md:text-sm leading-snug ${mutedText}`}>{layer.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CoreComponentsScene
