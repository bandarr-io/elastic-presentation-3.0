import HeroScene from '../scenes/HeroScene'
import AgendaScene from '../scenes/AgendaScene'
import AboutScene from '../scenes/AboutScene'
import BusinessValueScene from '../scenes/BusinessValueScene'
import ProblemPatternsScene from '../scenes/ProblemPatternsScene'
import TeamScene from '../scenes/TeamScene'
import UnifiedStrategyScene from '../scenes/UnifiedStrategyScene'
import ElasticExplodedLogo3D from '../scenes/ElasticExplodedLogo3D'
import DataExplosionSceneV2 from '../scenes/DataExplosionSceneV2'
import CrossClusterScene from '../scenes/CrossClusterScene'
import SecurityScene from '../scenes/SecurityScene'
import SchemaScene from '../scenes/SchemaScene'
import AccessControlSceneDev from '../scenes/AccessControlSceneDev'
import DataMeshScene from '../scenes/DataMeshScene'
import LicensingScene from '../scenes/LicensingScene'
import PricingRomScene from '../scenes/PricingRomScene'
import DataTieringScene from '../scenes/DataTieringScene'
import ConsolidationScene from '../scenes/ConsolidationScene'
import ESQLScene from '../scenes/ESQLScene'
import ServicesScene from '../scenes/ServicesScene'
import NextStepsScene from '../scenes/NextStepsScene'
import PanelScene from '../scenes/PanelScene'
import LogsDBScene from '../scenes/LogsDBScene'
import AIAssistantScene from '../scenes/AIAssistantScene'
import CustomerArchitectScene from '../scenes/CustomerArchitectScene'
import SecurityNarrativeVisualScene from '../scenes/SecurityNarrativeVisualScene'
import SecuritySOCModelScene from '../scenes/SecuritySOCModelScene'
import SecurityCapabilitiesScene from '../scenes/SecurityCapabilitiesScene'
import SecurityUseCasesScene from '../scenes/SecurityUseCasesScene'
import ElasticValueScene from '../scenes/ElasticValueScene'
import PlatformOperationsScene from '../scenes/PlatformOperationsScene'
import PlatformValueScene from '../scenes/PlatformValueScene'
import ValueByTeamScene from '../scenes/ValueByTeamScene'
import AIScaleScene from '../scenes/AIScaleScene'
import HeritageScene from '../scenes/HeritageScene'
import ThreeLayersScene from '../scenes/ThreeLayersScene'
import PillarsScene from '../scenes/PillarsScene'
import SignalsScene from '../scenes/SignalsScene'
import NightshiftScene from '../scenes/NightshiftScene'
import StreamsScene from '../scenes/StreamsScene'
import OtelScene from '../scenes/OtelScene'
import KubernetesScene from '../scenes/KubernetesScene'
import KubernetesMCPScene from '../scenes/KubernetesMCPScene'
import AgenticScene from '../scenes/AgenticScene'
import DiscoveryScene from '../scenes/DiscoveryScene'
import SurfacesScene from '../scenes/SurfacesScene'
import NightshiftArchScene from '../scenes/NightshiftArchScene'
import CoreComponentsScene from '../scenes/CoreComponentsScene'
import NodeTypesScene from '../scenes/NodeTypesScene'
import ElasticOverviewScene from '../scenes/ElasticOverviewScene'
import EnterpriseDeploymentScene from '../scenes/EnterpriseDeploymentScene'
import WhiteboardScene from '../scenes/WhiteboardScene'
import VectorSearchScene from '../scenes/VectorSearchScene'
import CardCatalogScene from '../scenes/CardCatalogScene'
import SearchChallengeScene from '../scenes/SearchChallengeScene'
import VectorScaleScene from '../scenes/VectorScaleScene'
import GpuVectorPipelineScene from '../scenes/GpuVectorPipelineScene'
import SearchInferenceScene from '../scenes/SearchInferenceScene'
import SearchContextScene from '../scenes/SearchContextScene'

/**
 * Canonical scene registry for the deck. Shared by the main presentation
 * (AppContent) and the presenter view, so both resolve the same components
 * and metadata for a given scene id.
 */
export const SCENE_REGISTRY = [
  // ── Act 1 — Open & reconnect ────────────────────────────────────────────
  {
    id: 'hero',
    component: HeroScene,
    title: 'Hero',
    duration: '2 min',
    description: ''
  },
  {
    id: 'agenda',
    component: AgendaScene,
    title: 'Agenda',
    duration: '5 min',
    description: ''
  },
  {
    id: 'team',
    component: TeamScene,
    title: 'Team Introductions',
    duration: '4 min',
    description: 'The people here to support you'
  },
  {
    id: 'about',
    component: AboutScene,
    title: 'About Elastic',
    duration: '3 min',
    description: 'Who we are and what we do'
  },
  // ── Act 2 — Where the customer is today ─────────────────────────────────
  {
    id: 'business-value',
    component: BusinessValueScene,
    title: 'Desired Outcomes',
    duration: '4 min',
    description: 'Key areas where Elastic delivers value'
  },
  {
    id: 'elastic-value',
    component: ElasticValueScene,
    title: 'Metrics Dashboard',
    duration: '3 min',
    description: 'Configurable layout \u2014 hero stat cards, a stat grid, and a bottom-line banner'
  },
  {
    id: 'value-by-team',
    component: ValueByTeamScene,
    title: 'Card Grid',
    duration: '4 min',
    description: 'Configurable layout \u2014 a grid of icon cards with an impact banner'
  },
  {
    id: 'security-use-cases',
    component: SecurityUseCasesScene,
    title: 'Visual Gallery',
    duration: '5 min',
    description: 'Configurable layout — a grid of image cards with an expandable lightbox view'
  },
  // ── Act 3 — Platform (bridge to partner deep-dive) ──────────────────────
  {
    id: 'elastic-exploded',
    component: ElasticExplodedLogo3D,
    title: 'Exploded Platform',
    duration: '2 min',
    description: 'Teardown of the Elastic logo — click to explode it into seven capability parts along one assembly axis, then reassemble'
  },
  {
    id: 'search-catalog',
    component: CardCatalogScene,
    title: 'How Search Works',
    duration: '5 min',
    description: 'Lexical foundations — full scan to inverted index, analysis, BM25, Lucene, shards, replicas, rebalance (audience scenario packs)',
    defaultDisabled: true,
  },
  {
    id: 'search-challenge',
    component: SearchChallengeScene,
    title: 'Unstructured Challenge',
    duration: '2 min',
    description: '80% of data is unstructured — the retrieval gap above and below the waterline',
    defaultDisabled: true,
  },
  {
    id: 'search-vector-scale',
    component: VectorScaleScene,
    title: 'Vector Database Scale',
    duration: '4 min',
    description: 'Elasticsearch as a vector DB — scaling factors and DiskBBQ',
    defaultDisabled: true,
  },
  {
    id: 'search-vector',
    component: VectorSearchScene,
    title: 'Vector Search',
    duration: '4 min',
    description: 'Multimodal vector search — image embeddings into 3D space, then text kNN (Jina v5 Omni narrative)',
    defaultDisabled: true,
  },
  {
    id: 'search-gpu',
    component: GpuVectorPipelineScene,
    title: 'GPU Vector Pipeline',
    duration: '3 min',
    description: 'CPU indexing bottleneck → NVIDIA cuVS GPU acceleration',
    defaultDisabled: true,
  },
  {
    id: 'search-inference',
    component: SearchInferenceScene,
    title: 'Inference Any Model',
    duration: '3 min',
    description: 'Model-agnostic inference providers and sovereign /_inference topology',
    defaultDisabled: true,
  },
  {
    id: 'search-context',
    component: SearchContextScene,
    title: 'Context Layer',
    duration: '4 min',
    description: 'The missing context layer — Agent Builder, Context Engine, sources to benefits',
    defaultDisabled: true,
  },
  {
    id: 'unified-strategy',
    component: UnifiedStrategyScene,
    title: 'Platform Overview',
    duration: '4 min',
    description: 'All your data, real-time, at scale'
  },
  // ── Act 4 — AI & Security (the differentiation peak) ────────────────────
  {
    id: 'ai-assistant',
    component: AIAssistantScene,
    title: 'AI Capability Map',
    duration: '4 min',
    description: 'Reactive today, agentic now, autonomous next'
  },
  {
    id: 'security-narrative-visual',
    component: SecurityNarrativeVisualScene,
    title: 'Security: Why Now',
    duration: '3 min',
    description: 'Count-up threat stats, attack-path kill-chain, and bolt-on vs native SOC models'
  },
  {
    id: 'security-soc-model',
    component: SecuritySOCModelScene,
    title: 'Pyramid \u2192 Diamond',
    duration: '2 min',
    description: 'The SOC operating model shift: the triage pyramid morphs into the diamond model'
  },
  {
    id: 'security-capabilities',
    component: SecurityCapabilitiesScene,
    title: 'Senses \u00b7 Brain \u00b7 Hands',
    duration: '3 min',
    description: 'Deep-dive on the three native platform layers \u2014 data & visibility, machine-speed reasoning, and fast response \u2014 with competitive call-outs'
  },
  {
    id: 'security',
    component: SecurityScene,
    title: 'Security',
    duration: '4 min',
    description: 'AI-driven security operations: attack discovery, investigation, and automated response'
  },
  // ── Act 5 — Commercials & close ─────────────────────────────────────────
  {
    id: 'licensing',
    component: LicensingScene,
    title: 'Licensing',
    duration: '3 min',
    description: 'Subscription tiers and what comes with each'
  },
  {
    id: 'pricing-rom',
    component: PricingRomScene,
    title: 'Pricing / ROM',
    duration: '4 min',
    description: 'Customizable rough-order-of-magnitude quote \u2014 line items, quantities, and discounts with live-computed totals'
  },
  {
    id: 'customer-architect',
    component: CustomerArchitectScene,
    title: 'Customer Architect',
    duration: '3 min',
    description: 'Your dedicated Customer Architect — we walk this journey with you',
  },
  {
    id: 'services',
    component: ServicesScene,
    title: 'Services',
    duration: '4 min',
    description: 'Transform faster with Elastic Professional Services',
  },
  {
    id: 'next-steps',
    component: NextStepsScene,
    title: 'Next Steps',
    duration: '2 min',
    description: "Close the conversation and drive to action",
  },
  // ── Disabled by default — platform/data deep-dives handed to a partner deck,
  //    plus Run On-Prem. Toggle any of these on in Scene Settings. ─────────
  {
    id: 'panel',
    component: PanelScene,
    title: 'Panel',
    duration: '2 min',
    description: 'Featured panel discussion',
    defaultDisabled: true
  },
  {
    id: 'problem-patterns',
    component: ProblemPatternsScene,
    title: 'Problem Patterns',
    duration: '5 min',
    description: 'Common challenges teams solve with Elastic',
    defaultDisabled: true
  },
  {
    id: 'data-explosion',
    component: DataExplosionSceneV2,
    title: 'Data Explosion',
    duration: '3 min',
    description: 'The unprecedented scale of modern data',
    defaultDisabled: true
  },
  {
    id: 'logsdb',
    component: LogsDBScene,
    title: 'LogsDB',
    duration: '3 min',
    description: 'More data, lower cost, better visibility',
    defaultDisabled: true
  },
  {
    id: 'data-mesh',
    component: DataMeshScene,
    title: 'Data Mesh',
    duration: '4 min',
    description: 'From data chaos to clarity — the Elastic data mesh story',
    defaultDisabled: true
  },
  {
    id: 'cross-cluster',
    component: CrossClusterScene,
    title: 'Cross-Cluster',
    duration: '3 min',
    description: 'Distributed search and replication across environments',
    defaultDisabled: true
  },
  {
    id: 'schema',
    component: SchemaScene,
    title: 'Schema',
    duration: '2 min',
    description: 'Schema on Read vs Schema on Write — why ECS matters',
    defaultDisabled: true
  },
  {
    id: 'access-control',
    component: AccessControlSceneDev,
    title: 'Access Control',
    duration: '3 min',
    description: 'Role and attribute-based controls — every user sees exactly what they need',
    defaultDisabled: true
  },
  {
    id: 'data-tiering',
    component: DataTieringScene,
    title: 'Data Tiering',
    duration: '3 min',
    description: 'Hot, warm, cold, and frozen — intelligent lifecycle management for your data',
    defaultDisabled: true
  },
  {
    id: 'consolidation',
    component: ConsolidationScene,
    title: 'Consolidation',
    duration: '3 min',
    description: 'Replace fragmented tooling with a unified Elastic platform',
    defaultDisabled: true
  },
  {
    id: 'esql',
    component: ESQLScene,
    title: 'ES|QL',
    duration: '4 min',
    description: 'One pipeline from raw data to answers — ES|QL query language',
    defaultDisabled: true
  },
  {
    id: 'platform-operations',
    component: PlatformOperationsScene,
    title: 'Deployment Models',
    duration: '4 min',
    description: 'Self-Managed, Cloud Hosted, and Serverless \u2014 each with its own benefits, switchable via side nav',
    defaultDisabled: true
  },
  {
    id: 'platform-value',
    component: PlatformValueScene,
    title: 'Platform Value',
    duration: '2 min',
    description: 'Closing hero \u2014 the value of the Elastic platform as a whole',
    defaultDisabled: true
  },
  // ── Observability story — "from datastore to autonomous SRE" (rebuilt from
  //    the company-preso source deck). Toggle on in Scene Settings or use the
  //    Observability deck preset. ─────────────────────────────────────────
  {
    id: 'obs-ai-scale',
    component: AIScaleScene,
    title: 'The AI-Scale Challenge',
    duration: '3 min',
    description: 'AI multiplies every observability problem — dev \u00d7100, staging \u00d710, prod ?\u00d7',
    defaultDisabled: true
  },
  {
    id: 'obs-heritage',
    component: HeritageScene,
    title: 'Track Record',
    duration: '3 min',
    description: 'From the ELK Stack to the Agentic Era — a proven track record of innovation',
    defaultDisabled: true
  },
  {
    id: 'obs-three-layers',
    component: ThreeLayersScene,
    title: 'Three Layers',
    duration: '3 min',
    description: 'Elasticsearch \u2192 AI Index \u2192 Nightshift: Data \u2192 AI Index \u2192 Agent \u2192 Action',
    defaultDisabled: true
  },
  {
    id: 'obs-pillars',
    component: PillarsScene,
    title: 'Three Pillars',
    duration: '3 min',
    description: 'Streams, Signals, and Nightshift define the Observability roadmap',
    defaultDisabled: true
  },
  {
    id: 'obs-signals',
    component: SignalsScene,
    title: 'Signals & Efficiency',
    duration: '4 min',
    description: 'Five signals on one platform, plus best-in-class datastore efficiency benchmarks',
    defaultDisabled: true
  },
  {
    id: 'nightshift-sre',
    component: NightshiftScene,
    title: 'Nightshift: AI SRE',
    duration: '4 min',
    description: 'The autonomous AI SRE — detect, investigate, remediate, audit. The end of on-call.',
    defaultDisabled: true
  },
  {
    id: 'obs-streams',
    component: StreamsScene,
    title: 'Streams',
    duration: '3 min',
    description: 'Five-stage telemetry pipeline — from raw data to agent-ready significant events',
    defaultDisabled: true
  },
  {
    id: 'obs-otel',
    component: OtelScene,
    title: 'OpenTelemetry',
    duration: '3 min',
    description: 'EDOT — the #1 OTel contributor — collects everything, from everywhere',
    defaultDisabled: true
  },
  {
    id: 'obs-kubernetes',
    component: KubernetesScene,
    title: 'Kubernetes',
    duration: '3 min',
    description: 'OOTB Kubernetes dashboards plus autonomous root-cause analysis',
    defaultDisabled: true
  },
  {
    id: 'obs-mcp-app',
    component: KubernetesMCPScene,
    title: 'MCP App for Kubernetes',
    duration: '3 min',
    description: 'Claude drives Elastic via MCP: health \u2192 anomalies \u2192 explainer \u2192 blast radius',
    defaultDisabled: true
  },
  {
    id: 'obs-agentic',
    component: AgenticScene,
    title: 'Agentic Observability',
    duration: '3 min',
    description: 'Four-quadrant strategy: infer, discover, remediate, and meet teams anywhere',
    defaultDisabled: true
  },
  {
    id: 'obs-discovery',
    component: DiscoveryScene,
    title: 'Knowledge & Discovery',
    duration: '4 min',
    description: 'Knowledge Indicators \u2192 Significant Events \u2192 the agent\u2019s live system model',
    defaultDisabled: true
  },
  {
    id: 'obs-surfaces',
    component: SurfacesScene,
    title: 'Meet Where They Are',
    duration: '3 min',
    description: 'One Skills layer across every surface — plus plain-English investigation via MCP',
    defaultDisabled: true
  },
  {
    id: 'nightshift-arch',
    component: NightshiftArchScene,
    title: 'Inside Nightshift',
    duration: '4 min',
    description: 'Architecture, the Elastic Brain, and the token-efficiency funnel that makes it viable',
    defaultDisabled: true
  },
  // ── Reference architecture — platform/deployment diagrams for technical
  //    deep-dives. Toggle on in Scene Settings. ────────────────────────────
  {
    id: 'core-components',
    component: CoreComponentsScene,
    title: 'Core Components',
    duration: '3 min',
    description: 'The Elastic stack, layer by layer — from data collection to solutions',
    defaultDisabled: true
  },
  {
    id: 'node-types',
    component: NodeTypesScene,
    title: 'Node Types',
    duration: '3 min',
    description: 'Elasticsearch node roles — master, data, ingest, coordinating, and ML',
    defaultDisabled: true
  },
  {
    id: 'elastic-overview',
    component: ElasticOverviewScene,
    title: 'Elastic Overview',
    duration: '3 min',
    description: 'The visualization, data, and ETL planes — with an optional management plane',
    defaultDisabled: true
  },
  {
    id: 'enterprise-deployment',
    component: EnterpriseDeploymentScene,
    title: 'Enterprise Deployment',
    duration: '4 min',
    description: 'Full reference architecture — sources, ingest, tiered cluster, consumers, and monitoring',
    defaultDisabled: true
  },
  {
    id: 'whiteboard',
    component: WhiteboardScene,
    title: 'Architecture Whiteboard',
    duration: '5 min',
    description: 'Interactive drag-and-drop canvas for whiteboarding Elastic architectures live — palette of typed components, connections, zones, and JSON/SVG/PNG export',
    defaultDisabled: true
  },
]
