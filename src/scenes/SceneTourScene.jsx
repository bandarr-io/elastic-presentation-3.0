import SceneTour from './tour/SceneTour'
import { TOUR_PAGE_REGISTRY, DEFAULT_TOUR_PAGES } from '../data/tourPageRegistry'
export { buildTourSteps } from './tour/tourSteps'

// A new tour is a wrapper like this one: its own registry subset and default pages.
function SceneTourScene({ metadata = {}, sceneMetadata }) {
  return <SceneTour metadata={metadata} sceneMetadata={sceneMetadata} registry={TOUR_PAGE_REGISTRY} defaultPages={DEFAULT_TOUR_PAGES} eyebrow="Elastic · Scene Tour" />
}

export default SceneTourScene
