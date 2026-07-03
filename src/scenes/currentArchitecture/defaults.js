// Shipped defaults for the Current Architecture scene. Every value is
// overridable via scene metadata; these preserve the current on-screen look
// when no overrides are present.

export const DEFAULT_INFRA = {
  onPremPct: '70%',
  onPremLabel: 'On-Prem (Primary Data Centers)',
  onPremItems: ['VMware · Virtual Machines', 'Cisco UCS', 'Compute · Network · Storage'],
  cloudPct: '30%',
  cloudLabel: 'Cloud (Multi-Cloud)',
  cloudItems: ['Microsoft Azure', 'AWS', 'Google Cloud', 'Oracle Cloud'],
  networkNote: 'Hybrid Network (MPLS / SD-WAN) — Cisco UCS Fabric',
}

// Grouped into rows so the stack reads as Languages / Platforms / Data.
export const DEFAULT_APP_STACK = [
  ['.NET', 'Java', 'SQL', 'PHP'],
  ['Linux / Red Hat', 'OpenShift', 'Kubernetes (on-prem)'],
  ['Databricks — confirmed', 'Snowflake — evaluation'],
]

export const DEFAULT_CURRENT_STACK = [
  { name: 'AppDynamics', role: 'APM' },
  { name: 'ThousandEyes', role: 'Network Monitoring' },
  { name: 'SecureApp', role: 'RASP' },
  { name: 'Splunk', role: 'Log Management & SIEM', logoOnly: true, logoSize: 58 },
  { name: 'ServiceNow', role: 'ITSM' },
]

export const DEFAULT_PIPELINE = {
  sources: ['Infrastructure — servers, network, cloud, containers', 'Applications & Services', 'Security Tools & Platforms'],
  criblStages: ['Collect', 'Route', 'Transform', 'Enrich'],
  elasticComponents: ['Elasticsearch', 'Kibana', 'Beats / Agents', 'Elastic Security'],
  consumers: ['Security Team', 'Ops / NOC', 'IT / Dev Teams'],
  caption: 'Your team runs licensed Elastic in production today — data routing is already in place.',
}

export const DEFAULT_PROGRAM = [
  { value: '00', label: 'Certified Champions', sub: 'Enablement scorecard' },
  { value: '00', label: 'Monitoring Tools', sub: 'Under consolidation review' },
  { value: '$0M', label: 'Cost Avoidance Target', sub: 'Consolidation goal' },
  { value: 'POC', label: 'SIEM POC', sub: 'Running in parallel' },
]

export const DEFAULT_HERO = {
  title: 'Existing Elastic + Cribl Deployment',
  badge: 'Licensed · In Production Today',
  sourcesTitle: 'Production Data Sources',
  elasticTitle: 'Elastic',
  consumersTitle: 'Consumers',
}

export const DEFAULT_SECTIONS = {
  infrastructure: true,
  appStack: true,
  incumbents: true,
  program: true,
  router: true,
}

// Narrative beats for the animated Story layout. The presenter advances through
// these; each reveals the next stage of the "Elastic is already at the center"
// argument. Overridable via metadata.story.beats.
export const DEFAULT_STORY_BEATS = [
  { title: 'Your world today', caption: 'Data sprawls across infrastructure, applications, and a stack of overlapping point tools.' },
  { title: 'Elastic is already here', caption: 'Licensed and running in production — sitting at the center of your environment.' },
  { title: 'Everything already flows through it', caption: 'Your sources route into Elastic and back out to every team, in real time.' },
  { title: 'The consolidation opportunity', caption: 'Retire redundant point tools and unify on the platform you already own.' },
  { title: 'Where we expand next', caption: 'New use cases light up on the same platform — no new silos.' },
]

// Maps raw scene metadata (which keeps its historical shape for backward
// compatibility) into a single normalized model consumed by every layout.
export function normalizeArchitecture(metadata = {}) {
  const infra = { ...DEFAULT_INFRA, ...(metadata.infrastructure || {}) }

  const appStackRaw = metadata.appStack || DEFAULT_APP_STACK
  // Support both a flat list (single row) and grouped rows (array of arrays).
  const appStackRows = Array.isArray(appStackRaw[0]) ? appStackRaw : [appStackRaw]

  const incumbents = (metadata.currentStack || DEFAULT_CURRENT_STACK).map((item, i) => ({
    ...(DEFAULT_CURRENT_STACK[i] || {}),
    ...item,
  }))

  const pipeline = { ...DEFAULT_PIPELINE, ...(metadata.pipeline || {}) }
  const hero = { ...DEFAULT_HERO, ...(metadata.hero || {}) }
  const sections = { ...DEFAULT_SECTIONS, ...(metadata.sections || {}) }

  const routerMeta = metadata.router || {}
  const router = {
    enabled: routerMeta.enabled !== undefined ? routerMeta.enabled : sections.router,
    label: routerMeta.label || 'Cribl',
    stages: routerMeta.stages || pipeline.criblStages,
  }

  return {
    layout: metadata.layout || 'dashboard',
    sections,
    header: {
      eyebrow: metadata.eyebrow || 'Where Elastic Already Sits',
      titlePart1: metadata.titlePart1 || 'Your Environment Today,',
      titlePart2: metadata.titlePart2 || ' Elastic Already Inside',
      subtitle:
        metadata.subtitle ||
        'This is not a greenfield evaluation — it is a question of scope, expansion, and consolidation.',
    },
    hero: {
      title: hero.title,
      badge: hero.badge,
      caption: pipeline.caption,
      sourcesTitle: hero.sourcesTitle,
      elasticTitle: hero.elasticTitle,
      consumersTitle: hero.consumersTitle,
    },
    infrastructure: infra,
    appStackRows,
    incumbents,
    sources: pipeline.sources,
    router,
    elastic: { title: hero.elasticTitle, components: pipeline.elasticComponents },
    consumers: pipeline.consumers,
    program: metadata.programStatus || DEFAULT_PROGRAM,
    story: { beats: metadata.story?.beats || DEFAULT_STORY_BEATS },
  }
}
