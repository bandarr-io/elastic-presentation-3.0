import ElasticWhiteboard from '../components/ElasticWhiteboard'

/**
 * WhiteboardScene
 *
 * Full-bleed wrapper around the interactive ElasticWhiteboard tool — a
 * drag-and-drop architecture canvas for whiteboarding Elastic deployments live.
 *
 * The whiteboard follows the app's light/dark theme (via useTheme inside the
 * component) and is rebranded to the Elastic palette. It fills the entire scene
 * area to maximize canvas space; its own toolbar carries the title and controls.
 */
function WhiteboardScene() {
  return (
    <div className="h-full w-full overflow-hidden">
      <ElasticWhiteboard height="100%" />
    </div>
  )
}

export default WhiteboardScene
