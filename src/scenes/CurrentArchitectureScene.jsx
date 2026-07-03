import { animate, stagger } from 'animejs'
import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { normalizeArchitecture } from './currentArchitecture/defaults'
import DashboardLayout from './currentArchitecture/DashboardLayout'
import LayeredLayout from './currentArchitecture/LayeredLayout'
import HybridLayout from './currentArchitecture/HybridLayout'
import StoryLayout from './currentArchitecture/StoryLayout'

const LAYOUTS = {
  dashboard: DashboardLayout,
  layered: LayeredLayout,
  hybrid: HybridLayout,
  story: StoryLayout,
}

function CurrentArchitectureScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const model = normalizeArchitecture(metadata)
  const { header } = model
  const Layout = LAYOUTS[model.layout] || DashboardLayout

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const zones = el.querySelectorAll('.zone')
    if (!zones.length) return
    animate(zones, {
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 520,
      delay: stagger(90),
      easing: 'easeOutQuad',
    })
  }, [model.layout])

  // The Story layout manages its own beat-driven headline, so it runs full-bleed
  // without the shared static header.
  if (model.layout === 'story') {
    return (
      <div ref={rootRef} className="flex flex-col h-full w-full px-8 pt-3 pb-4 overflow-hidden">
        <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
          <Layout model={model} isDark={isDark} />
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="flex flex-col h-full w-full px-8 pt-3 pb-4 overflow-hidden">
      <div className="max-w-[1600px] mx-auto w-full">
        <div className="text-center mb-3">
          <p className={`text-sm font-semibold uppercase tracking-eyebrow mb-1 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
            {header.eyebrow}
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold leading-headline">
            <span className={isDark ? 'text-white' : 'text-elastic-dark-ink'}>{header.titlePart1}</span>
            <span className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'}>{header.titlePart2}</span>
          </h2>
          <p className={`text-sm md:text-base max-w-5xl mx-auto mt-1 ${isDark ? 'text-elastic-light-grey/80' : 'text-elastic-ink'}`}>
            {header.subtitle}
          </p>
        </div>

        <Layout model={model} isDark={isDark} />
      </div>
    </div>
  )
}

export default CurrentArchitectureScene
