import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { SCENE_REGISTRY } from '../data/sceneRegistry'
import { useSceneConfiguration } from '../components/SceneSettings'
import PrintSlides from './PrintSlides'
import { slidePages } from './slidePages'
import { waitForPrintReady } from './printReady'
import './print.css'

// Route: /print. Prints the currently configured deck (enabled scenes, order,
// saved edits). Rendered instead of the deck, so deck keyboard shortcuts and
// presenter sync are not mounted here.
const STAGE_WIDTH = 1920

// On screen, fit the 1920 px slide to the window. Printing ignores this.
function useFitScale() {
  const compute = () => Math.max(0.2, Math.min(1, (window.innerWidth - 32) / STAGE_WIDTH))
  const [scale, setScale] = useState(compute)
  useEffect(() => {
    const onResize = () => setScale(compute())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}

export default function PrintPage() {
  const { theme, toggleTheme } = useTheme()
  const { enabledScenes, orderedScenes, sceneMetadata, customDurations } = useSceneConfiguration(SCENE_REGISTRY)
  const scale = useFitScale()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState({ text: '', warn: false })
  const slidesRef = useRef(null)

  const pageCount = slidePages(enabledScenes).length

  const onPrint = async () => {
    if (busy) return
    setBusy(true)
    setStatus({ text: 'Preparing...', warn: false })
    try {
      const { failed } = await waitForPrintReady(slidesRef.current)
      setStatus(failed > 0
        ? { text: `${failed} image(s) could not load and show a placeholder.`, warn: true }
        : { text: '', warn: false })
      window.print()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="print-root" style={{ '--print-scale': scale }}>
      <div className="print-toolbar">
        <button type="button" className="print-primary" onClick={onPrint} disabled={busy}>
          Print or save as PDF
        </button>
        <button type="button" onClick={toggleTheme}>{theme === 'dark' ? 'Dark slides' : 'Light slides'}</button>
        <span>{`${pageCount} pages`}</span>
        <Link to="/">Back to deck</Link>
        <span className="print-status" data-warn={status.warn} role="status">{status.text}</span>
      </div>
      <div ref={slidesRef}>
        <PrintSlides
          scenes={enabledScenes}
          orderedScenes={orderedScenes}
          sceneMetadata={sceneMetadata}
          customDurations={customDurations}
        />
      </div>
    </div>
  )
}
