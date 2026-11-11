import ErrorBoundary from '../components/ErrorBoundary'
import { SceneMotionProvider } from '../context/SceneMotionContext'
import { SceneMotionFollow } from '../context/SceneMotionFollowContext'
import { buildPreviewProps } from '../presenter/buildPreviewProps'
import { slidePages } from './slidePages'

// Renders the deck's enabled scenes, one per printed page, on the deck's own
// stage so colours and layouts match the screen. Pure: scene list and saved
// scene edits in, markup out. Nothing here mutates either.
//
// SceneMotionFollow pins each slide to a fixed beat with no autoplay, and keeps
// it from registering with the presenter bridge. Each page gets its own
// SceneMotionProvider so the steppers cannot fight over the global controls.
function Slide({ page, Scene, previewContext }) {
  return (
    <section className="print-slide" data-scene-id={page.sceneId}>
      <div className="print-slide-box">
        <div className="print-slide-stage bg-elastic-light-grey dark:bg-elastic-dev-blue">
          {Scene ? (
            <ErrorBoundary>
              <SceneMotionProvider>
                <SceneMotionFollow beat={page.beat}>
                  <Scene {...buildPreviewProps(page.sceneId, previewContext)} />
                </SceneMotionFollow>
              </SceneMotionProvider>
            </ErrorBoundary>
          ) : (
            <p className="print-missing" data-print-missing="true">{`Slide not found: ${page.sceneId}`}</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default function PrintSlides({ scenes = [], orderedScenes = scenes, sceneMetadata = {}, customDurations = {} }) {
  const byId = new Map(scenes.map((scene) => [scene.id, scene.component]))
  const previewContext = { sceneMetadata, orderedScenes, customDurations, enabledScenes: scenes }
  return (
    <div className="print-slides">
      {slidePages(scenes).map((page) => (
        <Slide key={page.key} page={page} Scene={byId.get(page.sceneId)} previewContext={previewContext} />
      ))}
    </div>
  )
}
