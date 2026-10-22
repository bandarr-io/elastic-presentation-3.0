import HeroScene from '../scenes/HeroScene'
import ProblemPatternsScene from '../scenes/ProblemPatternsScene'
import ElasticExplodedLogo3D from '../scenes/ElasticExplodedLogo3D'
import ElasticValueScene from '../scenes/ElasticValueScene'
import ValueByTeamScene from '../scenes/ValueByTeamScene'
import SecurityUseCasesScene from '../scenes/SecurityUseCasesScene'
import AIAssistantScene from '../scenes/AIAssistantScene'
import CustomerArchitectScene from '../scenes/CustomerArchitectScene'
import PlatformOperationsScene from '../scenes/PlatformOperationsScene'
import PlatformValueScene from '../scenes/PlatformValueScene'
import CoreComponentsScene from '../scenes/CoreComponentsScene'
import NodeTypesScene from '../scenes/NodeTypesScene'
import AIScaleScene from '../scenes/AIScaleScene'
import HeritageScene from '../scenes/HeritageScene'
import ThreeLayersScene from '../scenes/ThreeLayersScene'
import PillarsScene from '../scenes/PillarsScene'
import OtelScene from '../scenes/OtelScene'
import AgenticScene from '../scenes/AgenticScene'
import AboutScene from '../scenes/AboutScene'
import UnifiedStrategyScene from '../scenes/UnifiedStrategyScene'
import DataExplosionSceneV2 from '../scenes/DataExplosionSceneV2'
import SearchChallengeScene, { BEATS as SEARCH_CHALLENGE_BEATS } from '../scenes/SearchChallengeScene'
import SearchContextScene, { BEATS as SEARCH_CONTEXT_BEATS } from '../scenes/SearchContextScene'
import VideoKnowledgeScene, { DEFAULT_BEATS as VIDEO_KNOWLEDGE_BEATS } from '../scenes/VideoKnowledgeScene'
import VectorScaleScene, { BEATS as VECTOR_SCALE_BEATS } from '../scenes/VectorScaleScene'
import VectorSearchScene, { BEATS as VECTOR_SEARCH_BEATS } from '../scenes/VectorSearchScene'
import GpuVectorPipelineScene, { BEATS as GPU_VECTOR_PIPELINE_BEATS } from '../scenes/GpuVectorPipelineScene'
import SearchInferenceScene, { BEATS as SEARCH_INFERENCE_BEATS } from '../scenes/SearchInferenceScene'
import SecurityNarrativeVisualScene, { BEATS as SECURITY_NARRATIVE_VISUAL_BEATS } from '../scenes/SecurityNarrativeVisualScene'
import SecuritySOCModelScene, { BEATS as SECURITY_SOC_MODEL_BEATS } from '../scenes/SecuritySOCModelScene'
import SecurityCapabilitiesScene, { BEATS as SECURITY_CAPABILITIES_BEATS } from '../scenes/SecurityCapabilitiesScene'
import SignalsScene, { BEATS as SIGNALS_BEATS } from '../scenes/SignalsScene'
import NightshiftScene, { BEATS as NIGHTSHIFT_BEATS } from '../scenes/NightshiftScene'
import StreamsScene, { BEATS as STREAMS_BEATS } from '../scenes/StreamsScene'
import SurfacesScene, { BEATS as SURFACES_BEATS } from '../scenes/SurfacesScene'
import NightshiftArchScene, { BEATS as NIGHTSHIFT_ARCH_BEATS } from '../scenes/NightshiftArchScene'
import KubernetesMCPScene, { BEATS as KUBERNETES_MCP_BEATS } from '../scenes/KubernetesMCPScene'
import DiscoveryScene, { BEATS as DISCOVERY_BEATS } from '../scenes/DiscoveryScene'
import KubernetesScene from '../scenes/KubernetesScene'

/**
 * Display order of the groups in the Scene Tour editor's dropdown.
 */
export const TOUR_PAGE_GROUPS = ['Opening', 'Value', 'Platform', 'Search', 'Security', 'Observability']

/**
 * Registry of scenes that can be embedded in a tour, keyed by scene id.
 *
 * Each entry has:
 * - `title`: label shown for the page.
 * - `component`: the scene component to render.
 * - `group`: the editor dropdown group. One of TOUR_PAGE_GROUPS.
 * - `beats`: the embedded scene's own beat list. The tour steps through it and
 *   reuses each beat's `hold`, so page timing never drifts from the scene.
 * - `stepProps`: for a scene with no beats but a one-shot reveal to trigger.
 *   One entry per step, merged into the scene's props.
 * - `hold`: dwell in ms for a page that has neither beats nor stepProps.
 *
 * Inclusion rule: only scenes that work with a `metadata` prop alone belong
 * here, because the tour renders them standalone with default metadata. Scenes
 * that need lifted state from App.jsx (business-value, data-mesh, security,
 * schema, esql, services, elastic-overview, data-tiering, agenda, team) do not.
 *
 * To make another scene embeddable in a tour, add an entry here.
 */
export const TOUR_PAGE_REGISTRY = {
  hero: {
    title: 'Hero',
    component: HeroScene,
    group: 'Opening',
  },
  about: {
    title: 'About Elastic',
    component: AboutScene,
    group: 'Opening',
  },
  'problem-patterns': {
    title: 'Problem Patterns',
    component: ProblemPatternsScene,
    group: 'Value',
  },
  'elastic-value': {
    // Ships with placeholder copy: fill it in on the slide first.
    title: 'Metrics Dashboard (template)',
    component: ElasticValueScene,
    group: 'Value',
  },
  'value-by-team': {
    // Ships with placeholder copy: fill it in on the slide first.
    title: 'Value by Team (template)',
    component: ValueByTeamScene,
    group: 'Value',
  },
  'ai-assistant': {
    title: 'AI Capability Map',
    component: AIAssistantScene,
    group: 'Value',
  },
  'customer-architect': {
    title: 'Customer Architect',
    component: CustomerArchitectScene,
    group: 'Value',
  },
  'unified-strategy': {
    title: 'Platform Overview',
    component: UnifiedStrategyScene,
    group: 'Platform',
    hold: 14000,
  },
  'data-explosion': {
    title: 'Data Explosion',
    component: DataExplosionSceneV2,
    group: 'Platform',
    // The verdict panel renders hidden until `verdictSignal` fires, so the page
    // runs as two steps: the chart and counters land, then the verdict.
    stepProps: [{ verdictSignal: 0 }, { verdictSignal: 1 }],
    hold: 7500,
  },
  'elastic-exploded': {
    title: 'Exploded Platform',
    component: ElasticExplodedLogo3D,
    group: 'Platform',
  },
  'platform-operations': {
    title: 'Deployment Models',
    component: PlatformOperationsScene,
    group: 'Platform',
  },
  'platform-value': {
    title: 'Platform Value',
    component: PlatformValueScene,
    group: 'Platform',
  },
  'core-components': {
    title: 'Core Components',
    component: CoreComponentsScene,
    group: 'Platform',
  },
  'node-types': {
    title: 'Node Types',
    component: NodeTypesScene,
    group: 'Platform',
  },
  'search-challenge': {
    title: 'Unstructured Challenge',
    component: SearchChallengeScene,
    group: 'Search',
    beats: SEARCH_CHALLENGE_BEATS,
  },
  'search-context': {
    title: 'Context Layer',
    component: SearchContextScene,
    group: 'Search',
    beats: SEARCH_CONTEXT_BEATS,
  },
  'video-knowledge': {
    title: 'Knowledge From Video',
    component: VideoKnowledgeScene,
    group: 'Search',
    beats: VIDEO_KNOWLEDGE_BEATS,
  },
  'search-vector-scale': {
    title: 'Vector Database Scale',
    component: VectorScaleScene,
    group: 'Search',
    beats: VECTOR_SCALE_BEATS,
  },
  'search-vector': {
    title: 'Vector Search',
    component: VectorSearchScene,
    group: 'Search',
    beats: VECTOR_SEARCH_BEATS,
  },
  'search-gpu': {
    title: 'GPU Vector Pipeline',
    component: GpuVectorPipelineScene,
    group: 'Search',
    beats: GPU_VECTOR_PIPELINE_BEATS,
  },
  'search-inference': {
    title: 'Inference Any Model',
    component: SearchInferenceScene,
    group: 'Search',
    beats: SEARCH_INFERENCE_BEATS,
  },
  'security-use-cases': {
    // Ships with placeholder copy: fill it in on the slide first.
    title: 'Security Use Cases (template)',
    component: SecurityUseCasesScene,
    group: 'Security',
  },
  'security-narrative-visual': {
    title: 'Security: Why Now',
    component: SecurityNarrativeVisualScene,
    group: 'Security',
    beats: SECURITY_NARRATIVE_VISUAL_BEATS,
  },
  'security-soc-model': {
    title: 'Pyramid \u2192 Diamond',
    component: SecuritySOCModelScene,
    group: 'Security',
    beats: SECURITY_SOC_MODEL_BEATS,
  },
  'security-capabilities': {
    title: 'Senses \u00b7 Brain \u00b7 Hands',
    component: SecurityCapabilitiesScene,
    group: 'Security',
    beats: SECURITY_CAPABILITIES_BEATS,
  },
  'obs-ai-scale': {
    title: 'The AI-Scale Challenge',
    component: AIScaleScene,
    group: 'Observability',
  },
  'obs-heritage': {
    title: 'Track Record',
    component: HeritageScene,
    group: 'Observability',
  },
  'obs-three-layers': {
    title: 'Three Layers',
    component: ThreeLayersScene,
    group: 'Observability',
  },
  'obs-pillars': {
    title: 'Three Pillars',
    component: PillarsScene,
    group: 'Observability',
  },
  'obs-otel': {
    title: 'OpenTelemetry',
    component: OtelScene,
    group: 'Observability',
  },
  'obs-agentic': {
    title: 'Agentic Observability',
    component: AgenticScene,
    group: 'Observability',
  },
  'obs-signals': {
    title: 'Signals & Efficiency',
    component: SignalsScene,
    group: 'Observability',
    beats: SIGNALS_BEATS,
  },
  'nightshift-sre': {
    title: 'Nightshift: AI SRE',
    component: NightshiftScene,
    group: 'Observability',
    beats: NIGHTSHIFT_BEATS,
  },
  'obs-streams': {
    title: 'Streams',
    component: StreamsScene,
    group: 'Observability',
    beats: STREAMS_BEATS,
  },
  'obs-surfaces': {
    title: 'Meet Where They Are',
    component: SurfacesScene,
    group: 'Observability',
    beats: SURFACES_BEATS,
  },
  'nightshift-arch': {
    title: 'Inside Nightshift',
    component: NightshiftArchScene,
    group: 'Observability',
    beats: NIGHTSHIFT_ARCH_BEATS,
  },
  'obs-mcp-app': {
    title: 'MCP App for Kubernetes',
    component: KubernetesMCPScene,
    group: 'Observability',
    beats: KUBERNETES_MCP_BEATS,
  },
  'obs-discovery': {
    title: 'Knowledge & Discovery',
    component: DiscoveryScene,
    group: 'Observability',
    beats: DISCOVERY_BEATS,
  },
  'obs-kubernetes': {
    title: 'Kubernetes',
    component: KubernetesScene,
    group: 'Observability',
  },
}

/**
 * The default Scene Tour running order, as scene ids from TOUR_PAGE_REGISTRY.
 */
export const DEFAULT_TOUR_PAGES = [
  'about',
  'unified-strategy',
  'data-explosion',
  'search-challenge',
  'search-context',
  'video-knowledge',
].map((sceneId) => ({ sceneId }))
