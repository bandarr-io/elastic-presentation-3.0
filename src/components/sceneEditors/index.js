import HeroEditor from './HeroEditor'
import AboutEditor from './AboutEditor'
import BusinessValueEditor from './BusinessValueEditor'
import ElasticValueEditor from './ElasticValueEditor'
import ValueByTeamEditor from './ValueByTeamEditor'
import SecurityUseCasesEditor from './SecurityUseCasesEditor'
import ElasticExplodedEditor from './ElasticExplodedEditor'
import SearchCatalogEditor from './SearchCatalogEditor'
import SearchChallengeEditor from './SearchChallengeEditor'
import SearchVectorScaleEditor from './SearchVectorScaleEditor'
import SearchVectorEditor from './SearchVectorEditor'
import SearchGpuEditor from './SearchGpuEditor'
import SearchInferenceEditor from './SearchInferenceEditor'
import SearchContextEditor from './SearchContextEditor'
import UnifiedStrategyEditor from './UnifiedStrategyEditor'
import AIAssistantEditor from './AIAssistantEditor'
import SecurityNarrativeVisualEditor from './SecurityNarrativeVisualEditor'
import SecurityEditor from './SecurityEditor'
import LicensingEditor from './LicensingEditor'
import PricingRomEditor from './PricingRomEditor'
import CustomerArchitectEditor from './CustomerArchitectEditor'
import ServicesEditor from './ServicesEditor'
import NextStepsEditor from './NextStepsEditor'
import PanelEditor from './PanelEditor'
import ProblemPatternsEditor from './ProblemPatternsEditor'
import DataExplosionEditor from './DataExplosionEditor'
import LogsDBEditor from './LogsDBEditor'
import DataMeshEditor from './DataMeshEditor'
import CrossClusterEditor from './CrossClusterEditor'
import SchemaEditor from './SchemaEditor'
import AccessControlEditor from './AccessControlEditor'
import DataTieringEditor from './DataTieringEditor'
import ConsolidationEditor from './ConsolidationEditor'
import EsqlEditor from './EsqlEditor'
import PlatformOperationsEditor from './PlatformOperationsEditor'
import PlatformValueEditor from './PlatformValueEditor'
import EnterpriseDeploymentEditor from './EnterpriseDeploymentEditor'

// Scene id → content editor. Looked up by the Settings Content tab and the
// Deck Builder inspector. Missing ids are valid: those scenes have no
// editable content fields yet.
export const MODULAR_SCENE_EDITORS = {
  hero: HeroEditor,
  about: AboutEditor,
  'business-value': BusinessValueEditor,
  'elastic-value': ElasticValueEditor,
  'value-by-team': ValueByTeamEditor,
  'security-use-cases': SecurityUseCasesEditor,
  'elastic-exploded': ElasticExplodedEditor,
  'search-catalog': SearchCatalogEditor,
  'search-challenge': SearchChallengeEditor,
  'search-vector-scale': SearchVectorScaleEditor,
  'search-vector': SearchVectorEditor,
  'search-gpu': SearchGpuEditor,
  'search-inference': SearchInferenceEditor,
  'search-context': SearchContextEditor,
  'unified-strategy': UnifiedStrategyEditor,
  'ai-assistant': AIAssistantEditor,
  'security-narrative-visual': SecurityNarrativeVisualEditor,
  security: SecurityEditor,
  licensing: LicensingEditor,
  'pricing-rom': PricingRomEditor,
  'customer-architect': CustomerArchitectEditor,
  services: ServicesEditor,
  'next-steps': NextStepsEditor,
  panel: PanelEditor,
  'problem-patterns': ProblemPatternsEditor,
  'data-explosion': DataExplosionEditor,
  logsdb: LogsDBEditor,
  'data-mesh': DataMeshEditor,
  'cross-cluster': CrossClusterEditor,
  schema: SchemaEditor,
  'access-control': AccessControlEditor,
  'data-tiering': DataTieringEditor,
  consolidation: ConsolidationEditor,
  esql: EsqlEditor,
  'platform-operations': PlatformOperationsEditor,
  'platform-value': PlatformValueEditor,
  'enterprise-deployment': EnterpriseDeploymentEditor,
}
