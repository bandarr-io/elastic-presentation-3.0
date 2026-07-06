/* Whiteboard data registry: theme palettes, component TYPES, category order,
   and seed templates. Extracted from ElasticWhiteboard.jsx so the component
   stays focused on behaviour and this data can be tested/reused. */

/* Data-flow stages mapped to the Elastic brand palette, per theme. Dark uses
   the bright brand hues; light darkens them for contrast on a pale canvas. */
export const STAGE_PALETTES = {
  dark:  { collect: "#4C8DFF", process: "#FEC514", store: "#48EFCF", serve: "#F04E98", ops: "#8A9BB4" },
  light: { collect: "#0B64DD", process: "#B7791F", store: "#0E8C7F", serve: "#F04E98", ops: "#64748B" },
};

/* Canvas surface colors (backgrounds, panels, lines, text) per theme. */
export const SURFACES = {
  dark:  { bg: "#0C1530", panel: "#16213F", panel2: "#0F1A38", line: "#2A3556", ink: "#E8EDF4", muted: "#94A3C4" },
  light: { bg: "#F5F7FA", panel: "#FFFFFF", panel2: "#EEF2F7", line: "#D6DEEA", ink: "#1C1E23", muted: "#5B6472" },
};

export const CATS = [
  "Core & UI", "Nodes", "Ingest & Processing", "OpenTelemetry (EDOT)", "Beats",
  "Security", "ML & NLP", "Maps & Geo", "Clients & Tooling", "Orchestration",
  "Air-Gapped Services", "Custom", "General",
];

/* One Elastic-brand accent per category so a node's colour reads as its role.
   Drawn from Elastic's core brand hues + the EUI visualization palette. Data
   tiers are intentional exceptions (they keep their own semantic colours via
   the per-type `color` below). Tweak these hexes to taste. */
export const CAT_COLORS = {
  "Core & UI":            "#00BFB3", // Elastic teal
  "Nodes":                "#FEC514", // Elastic yellow
  "Ingest & Processing":  "#1BA9F5", // Elastic blue
  "OpenTelemetry (EDOT)": "#9170B8", // purple
  "Beats":                "#54B399", // green
  "Security":             "#E7664C", // alerting red-orange
  "ML & NLP":             "#F04E98", // Elastic pink
  "Maps & Geo":           "#6DCCB1", // mint
  "Clients & Tooling":    "#6092C0", // muted blue
  "Orchestration":        "#8A9BB4", // slate (control plane)
  "Air-Gapped Services":  "#FF957D", // coral
  "Custom":               "#D6BF57", // gold
  "General":              "#98A2B3", // neutral grey
};

/* Typed node registry. `flow` overrides the color of connections leaving
   a type; `ops:true` renders its connections dashed (control-plane /
   optional); `color` overrides the accent; `fields` are type-specific
   settings rendered generically in the inspector.                      */
export const TYPES = {
  /* --- Core & UI --- */
  kibana: { cat: "Core & UI", label: "Kibana", sub: "Stack UI · dashboards · management", stage: "serve", w: 200, h: 76,
    fields: [{ key: "instances", label: "Instances", kind: "number", min: 1, max: 20, unit: "inst" }] },
  security:      { cat: "Core & UI", label: "Elastic Security", sub: "SIEM · XDR · endpoint", stage: "serve", w: 208, h: 76 },
  observability: { cat: "Core & UI", label: "Elastic Observability", sub: "Logs · metrics · traces · APM", stage: "serve", w: 224, h: 76 },
  remote: { cat: "Core & UI", label: "Remote Cluster", sub: "Cross-cluster search & replication", stage: "store", w: 200, h: 76,
    fields: [
      { key: "mode",   label: "Mode", kind: "select", options: ["CCS", "CCR", "CCS + CCR"], def: "CCS" },
      { key: "region", label: "Region", kind: "text", placeholder: "e.g. us-east-1" },
    ] },

  /* --- Nodes (tiers & roles) --- */
  es:     { cat: "Nodes", label: "Elasticsearch", sub: "Distributed search & analytics", stage: "store", w: 220, h: 80,
    fields: [
      { key: "masters", label: "Master nodes", kind: "number", min: 1, max: 9,   unit: "masters" },
      { key: "data",    label: "Data nodes",   kind: "number", min: 1, max: 200, unit: "data" },
      { key: "version", label: "Version",      kind: "text", placeholder: "8.x", pre: "v" },
      { key: "ml",      label: "ML nodes",     kind: "toggle" },
    ] },
  tier_hot:    { cat: "Nodes", label: "Hot Tier",    sub: "Indexing & recent data · fast SSD", stage: "store", color: "#ef6a5a", w: 248, h: 96,
    fields: [
      { key: "nodes",    label: "Nodes",    kind: "number", min: 1, max: 50, unit: "nodes" },
      { key: "capacity", label: "Capacity", kind: "text", placeholder: "e.g. 2 TB" },
    ] },
  tier_warm:   { cat: "Nodes", label: "Warm Tier",   sub: "Read-mostly · older data", stage: "store", color: "#f09c3e", w: 248, h: 96,
    fields: [
      { key: "nodes",    label: "Nodes",    kind: "number", min: 1, max: 50, unit: "nodes" },
      { key: "capacity", label: "Capacity", kind: "text", placeholder: "e.g. 10 TB" },
    ] },
  tier_cold:   { cat: "Nodes", label: "Cold Tier",   sub: "Infrequent access · cheaper HW", stage: "store", color: "#58a8e8", w: 248, h: 96,
    fields: [
      { key: "nodes",    label: "Nodes",    kind: "number", min: 1, max: 50, unit: "nodes" },
      { key: "capacity", label: "Capacity", kind: "text", placeholder: "e.g. 40 TB" },
    ] },
  tier_frozen: { cat: "Nodes", label: "Frozen Tier", sub: "Searchable snapshots · object store", stage: "store", color: "#9aa5b1", w: 248, h: 96,
    fields: [
      { key: "nodes",    label: "Nodes",    kind: "number", min: 1, max: 50, unit: "nodes" },
      { key: "capacity", label: "Capacity", kind: "text", placeholder: "object store size" },
    ] },
  node_master: { cat: "Nodes", label: "Master Node", sub: "Cluster state · quorum", stage: "store", w: 248, h: 96,
    fields: [{ key: "nodes", label: "Nodes", kind: "number", min: 1, max: 9, unit: "nodes" }] },
  node_ml:     { cat: "Nodes", label: "ML Node", sub: "Anomaly detection · model inference", stage: "store", w: 248, h: 96,
    fields: [{ key: "nodes", label: "Nodes", kind: "number", min: 1, max: 50, unit: "nodes" }] },
  node_ingest: { cat: "Nodes", label: "Ingest Node", sub: "Ingest pipelines · enrichment", stage: "store", w: 248, h: 96,
    fields: [{ key: "nodes", label: "Nodes", kind: "number", min: 1, max: 50, unit: "nodes" }] },
  node_coord:  { cat: "Nodes", label: "Coordinating Node", sub: "Request routing · reduce phase", stage: "store", w: 248, h: 96,
    fields: [{ key: "nodes", label: "Nodes", kind: "number", min: 1, max: 50, unit: "nodes" }] },

  /* --- Ingest & Processing --- */
  agent:    { cat: "Ingest & Processing", label: "Elastic Agent", sub: "Logs · metrics · APM · endpoint", stage: "collect", w: 190, h: 72,
    fields: [
      { key: "count",  label: "Agent count", kind: "number", min: 1, max: 100000, unit: "agents" },
      { key: "policy", label: "Policy",      kind: "text", placeholder: "e.g. prod-linux" },
    ] },
  fleet:    { cat: "Orchestration", label: "Fleet Server", sub: "Central Agent management", stage: "collect", ops: true, w: 180, h: 72,
    fields: [{ key: "instances", label: "Instances", kind: "number", min: 1, max: 20, unit: "inst" }] },
  streams:  { cat: "Ingest & Processing", label: "Streams", sub: "AI-powered log parsing & routing", stage: "process", w: 196, h: 72 },
  logstash: { cat: "Ingest & Processing", label: "Logstash", sub: "Ingest/transform · plugin ecosystem", stage: "process", w: 196, h: 76,
    fields: [
      { key: "pipelines", label: "Pipelines", kind: "number", min: 1, max: 50, def: 1, unit: "pipelines" },
      { key: "workers",   label: "Workers",   kind: "number", min: 1, max: 64 },
    ] },
  apm:      { cat: "Ingest & Processing", label: "APM Server", sub: "Standalone or Agent integration", stage: "collect", w: 186, h: 72,
    fields: [{ key: "mode", label: "Mode", kind: "select", options: ["Agent integration", "Standalone"], def: "Agent integration" }] },
  eshadoop: { cat: "Ingest & Processing", label: "ES-Hadoop", sub: "Hadoop / Spark connectors", stage: "process", w: 176, h: 68 },

  /* --- OpenTelemetry (EDOT) --- */
  otel_collector: { cat: "OpenTelemetry (EDOT)", label: "EDOT Collector", sub: "OTLP traces · metrics · logs", stage: "collect", w: 198, h: 70,
    fields: [
      { key: "mode",     label: "Mode", kind: "select", options: ["Agent", "Gateway"], def: "Agent" },
      { key: "replicas", label: "Replicas", kind: "number", min: 1, max: 50, unit: "replicas" },
    ] },
  otel_sdk: { cat: "OpenTelemetry (EDOT)", label: "EDOT SDK", sub: "Instrumented application", stage: "collect", w: 182, h: 66,
    fields: [{ key: "lang", label: "Language", kind: "select",
               options: ["Java", ".NET", "Node.js", "Python", "PHP", "Android", "iOS"] }] },
  otel_operator: { cat: "OpenTelemetry (EDOT)", label: "OTel Operator", sub: "K8s auto-instrumentation", stage: "ops", ops: true, w: 182, h: 66 },

  /* --- Beats (standalone shippers) --- */
  beats:       { cat: "Beats", label: "Beats",       sub: "Standalone shippers (generic)", stage: "collect", w: 176, h: 66 },
  filebeat:    { cat: "Beats", label: "Filebeat",    sub: "Log files & journals",     stage: "collect", w: 160, h: 62 },
  metricbeat:  { cat: "Beats", label: "Metricbeat",  sub: "System & service metrics", stage: "collect", w: 160, h: 62 },
  heartbeat:   { cat: "Beats", label: "Heartbeat",   sub: "Uptime monitoring",        stage: "collect", w: 160, h: 62 },
  auditbeat:   { cat: "Beats", label: "Auditbeat",   sub: "Audit framework data",     stage: "collect", w: 160, h: 62 },
  packetbeat:  { cat: "Beats", label: "Packetbeat",  sub: "Network packet analytics", stage: "collect", w: 160, h: 62 },
  winlogbeat:  { cat: "Beats", label: "Winlogbeat",  sub: "Windows event logs",       stage: "collect", w: 160, h: 62 },

  /* --- Security solution --- */
  defend: { cat: "Security", label: "Elastic Defend", sub: "Endpoint security via Agent + Fleet", stage: "collect", w: 196, h: 68,
    fields: [{ key: "mode", label: "Protection", kind: "select", options: ["Detect", "Prevent"], def: "Detect" }] },
  rules:  { cat: "Security", label: "Detection Rules", sub: "Via Kibana/Fleet or local artifact repo", stage: "ops", ops: true, w: 196, h: 68 },

  /* --- ML & NLP --- */
  mlmodel:   { cat: "ML & NLP", label: "Trained ML Models", sub: "Anomaly detection · NLP", stage: "process", w: 190, h: 66,
    fields: [{ key: "model", label: "Model", kind: "text", placeholder: "e.g. anomaly-hosts" }] },
  elser:     { cat: "ML & NLP", label: "ELSER", sub: "Sparse encoder · semantic search", stage: "process", w: 180, h: 66,
    fields: [{ key: "model", label: "Model version", kind: "text", placeholder: "e.g. .elser_model_2" }] },
  pytorch:   { cat: "ML & NLP", label: "PyTorch NLP Models", sub: "Via Eland · air-gapped installs", stage: "process", w: 196, h: 66,
    fields: [{ key: "model", label: "Model", kind: "text", placeholder: "e.g. dslim/bert-base-NER" }] },
  jina:      { cat: "ML & NLP", label: "Jina AI Embedding Models", sub: "Dense embeddings · semantic search", stage: "process", w: 216, h: 66,
    fields: [
      { key: "model",      label: "Model",      kind: "text",   placeholder: "e.g. jina-embeddings-v3" },
      { key: "dimensions", label: "Dimensions", kind: "number", min: 32, max: 8192, unit: "dims" },
    ] },
  inference: { cat: "ML & NLP", label: "Inference Service", sub: "_inference API endpoints", stage: "process", w: 190, h: 66,
    fields: [{ key: "service", label: "Service", kind: "select", options: ["ELSER", "E5", "Rerank", "Embedding", "Custom"] }] },
  llm:       { cat: "ML & NLP", label: "LLM Provider", sub: "External model API", stage: "serve", ops: true, w: 182, h: 66,
    fields: [{ key: "provider", label: "Provider", kind: "select",
               options: ["OpenAI", "Azure OpenAI", "AWS Bedrock", "Google Vertex", "Anthropic", "Self-hosted"] }] },

  /* --- Maps & Geo --- */
  ems:       { cat: "Maps & Geo", label: "Elastic Maps Service", sub: "Hosted tiles & vector layers (EMS)", stage: "serve", ops: true, w: 204, h: 68,
    fields: [{ key: "access", label: "Access", kind: "select", options: ["Hosted", "Via firewall", "Self-hosted tiles", "Disabled"], def: "Hosted" }] },
  mapserver: { cat: "Maps & Geo", label: "Elastic Maps Server", sub: "Self-hosted EMS · ECK contexts", stage: "serve", w: 200, h: 68 },

  /* --- Clients & Tooling --- */
  client: { cat: "Clients & Tooling", label: "Elasticsearch Client", sub: "Java · JS · Py · .NET · Go · Ruby · PHP", stage: "collect", w: 212, h: 68,
    fields: [{ key: "lang", label: "Language", kind: "select", options: ["Java", "JavaScript", "Python", ".NET", "Go", "Ruby", "PHP"] }] },
  eland:  { cat: "Clients & Tooling", label: "Eland", sub: "ML/NLP model management tooling", stage: "process", w: 176, h: 66 },
  odbc:   { cat: "Clients & Tooling", label: "SQL ODBC Driver", sub: "BI & SQL connectivity", stage: "collect", w: 180, h: 64 },

  /* --- Orchestration --- */
  eck:  { cat: "Orchestration", label: "ECK Operator", sub: "Elastic Cloud on Kubernetes", stage: "ops", ops: true, w: 186, h: 68 },
  ece:  { cat: "Orchestration", label: "ECE", sub: "Clusters at scale · VMs / bare metal", stage: "ops", ops: true, w: 176, h: 68 },
  helm: { cat: "Orchestration", label: "Helm Charts", sub: "eck-stack & individual charts", stage: "ops", ops: true, w: 180, h: 66 },

  /* --- Air-Gapped Services --- */
  epr:          { cat: "Air-Gapped Services", label: "Package Registry (EPR)", sub: "Local integration packages for Fleet", stage: "ops", ops: true, w: 208, h: 68 },
  artifactreg:  { cat: "Air-Gapped Services", label: "Artifact Registry", sub: "Agent & integration binaries", stage: "ops", ops: true, w: 196, h: 66 },
  endpointrepo: { cat: "Air-Gapped Services", label: "Endpoint Artifact Repo", sub: "Defend artifacts & rule updates", stage: "ops", ops: true, w: 204, h: 66 },
  docsbundle:   { cat: "Air-Gapped Services", label: "Docs Bundle", sub: "Local docs for Kibana AI assistants", stage: "ops", ops: true, w: 190, h: 66 },

  /* --- Custom --- */
  integration: { cat: "Custom", label: "Integration", sub: "Configurable · name & logo", stage: "serve", configurable: true, w: 196, h: 70,
    fields: [{ key: "protocol", label: "Protocol", kind: "select", options: ["HTTP", "TCP", "Kafka", "Webhook", "Syslog"] }] },

  /* --- General diagramming --- */
  source:     { cat: "General", label: "Data Source", sub: "Servers · endpoints · DBs", stage: "ops", flow: "collect", w: 176, h: 76 },
  k8s:        { cat: "General", label: "Kubernetes Cluster", sub: "Workloads · kube-state", stage: "ops", flow: "collect", w: 196, h: 70 },
  cloudsvc:   { cat: "General", label: "Cloud Services", sub: "CloudWatch · Azure Monitor · GCP Ops", stage: "ops", flow: "collect", w: 200, h: 70 },
  syslog:     { cat: "General", label: "Syslog Devices", sub: "Network & appliance logs", stage: "ops", flow: "collect", w: 184, h: 68 },
  saas:       { cat: "General", label: "SaaS Apps", sub: "Audit & activity logs", stage: "ops", flow: "collect", w: 168, h: 68 },
  connectors: { cat: "General", label: "Connectors & Crawler", sub: "Content sync · SDKs", stage: "collect", w: 204, h: 80 },
  kafka:      { cat: "General", label: "Kafka", sub: "Buffer / queue", stage: "process", w: 172, h: 72,
    fields: [{ key: "partitions", label: "Partitions", kind: "number", min: 1, max: 500, unit: "partitions" }] },
  firewall:   { cat: "General", label: "Firewall / Proxy", sub: "Network boundary", stage: "ops", ops: true, w: 186, h: 68,
    fields: [{ key: "kind", label: "Kind", kind: "select", options: ["Firewall", "Forward proxy", "Reverse proxy", "Air gap"], def: "Firewall" }] },
  idp:        { cat: "General", label: "Identity Provider", sub: "SSO · directory services", stage: "ops", ops: true, w: 190, h: 68,
    fields: [{ key: "protocol", label: "Protocol", kind: "select", options: ["SAML", "OIDC", "LDAP", "Active Directory"] }] },
  lb:         { cat: "General", label: "Load Balancer", sub: "HA entry point", stage: "serve", w: 172, h: 68,
    fields: [{ key: "layer", label: "Type", kind: "select", options: ["L4", "L7", "DNS"] }] },
  users:      { cat: "General", label: "Users", sub: "Analysts · apps", stage: "serve", w: 152, h: 68 },
  cloud:      { cat: "General", label: "Cloud Hosting", sub: "AWS · Azure · GCP", stage: "store", w: 192, h: 72 },
  thirdparty: { cat: "General", label: "Third-Party", sub: "Slack · Teams · ServiceNow", stage: "serve", w: 204, h: 76 },
  storage:    { cat: "General", label: "Remote Storage", sub: "S3 · Blob · MinIO", stage: "ops", ops: true, w: 184, h: 72,
    fields: [{ key: "backend", label: "Backend", kind: "select", options: ["S3", "Azure Blob", "GCS", "MinIO", "NFS"] }] },
  monitoring: { cat: "General", label: "Monitoring Cluster", sub: "Separate ES + Kibana", stage: "ops", ops: true, w: 212, h: 76,
    fields: [{ key: "retention", label: "Retention", kind: "text", placeholder: "e.g. 30d" }] },
};

/* Uniform node footprint: every component renders at the same 248x96 size,
   so any per-type w/h above is superseded here. Change these two numbers to
   resize the whole palette at once. */
export const NODE_W = 248, NODE_H = 96;
for (const k of Object.keys(TYPES)) { TYPES[k].w = NODE_W; TYPES[k].h = NODE_H; }

/* instance type on all Nodes-category types (tiers & node roles) */
const INSTANCE = { key: "instance", label: "Instance type", kind: "text",
                   placeholder: "e.g. m5.2xlarge / r6gd.4xlarge" };
for (const k of ["tier_hot", "tier_warm", "tier_cold", "tier_frozen",
                 "node_master", "node_ml", "node_ingest", "node_coord"])
  TYPES[k].fields = [...(TYPES[k].fields || []), INSTANCE];

/* shared hardware sizing fields, attached to infrastructure-class types */
const HW = [
  { key: "cpu",  label: "CPU",    kind: "number", min: 1, max: 512,  unit: "vCPU" },
  { key: "mem",  label: "Memory", kind: "number", min: 1, max: 4096, unit: "GB RAM" },
  { key: "disk", label: "Disk",   kind: "text", placeholder: "e.g. 2 TB NVMe", pre: "disk " },
];
for (const k of [
  "es", "kibana", "logstash", "kafka", "fleet", "apm", "mapserver", "monitoring",
  "tier_hot", "tier_warm", "tier_cold", "tier_frozen",
  "node_master", "node_ml", "node_ingest", "node_coord", "otel_collector",
]) TYPES[k].fields = [...(TYPES[k].fields || []), ...HW];

/* accent color for a type given the active stage palette */
/* Accent for a type: explicit per-type `color` (data tiers) wins, then the
   category colour, then the stage palette as a final fallback. */
export const tagOf = (t, stages) => t.color || CAT_COLORS[t.cat] || (stages && stages[t.stage]);

/* ---------------- templates ---------------- */

export const SEEDS = {
  reference: {
    zones: [],
    nodes: [
      { id: "n1",  type: "source",     x: 40,   y: 80,  title: "Knowledge Bases" },
      { id: "n2",  type: "source",     x: 40,   y: 216, title: "Servers" },
      { id: "n3",  type: "source",     x: 40,   y: 352, title: "Endpoints" },
      { id: "n4",  type: "source",     x: 40,   y: 488, title: "Databases" },
      { id: "n5",  type: "connectors", x: 360,  y: 80 },
      { id: "n6",  type: "beats",      x: 360,  y: 216 },
      { id: "n7",  type: "agent",      x: 360,  y: 352 },
      { id: "n8",  type: "fleet",      x: 360,  y: 624 },
      { id: "n9",  type: "logstash",   x: 680,  y: 216 },
      { id: "n10", type: "kafka",      x: 680,  y: 352 },
      { id: "n11", type: "es",         x: 1000, y: 280 },
      { id: "n12", type: "kibana",     x: 1320, y: 80 },
      { id: "n13", type: "cloud",      x: 1320, y: 216 },
      { id: "n14", type: "thirdparty", x: 1320, y: 352 },
      { id: "n15", type: "lb",         x: 1640, y: 80 },
      { id: "n16", type: "users",      x: 1640, y: 216 },
      { id: "n17", type: "storage",    x: 1000, y: 624 },
      { id: "n18", type: "monitoring", x: 1320, y: 624 },
    ],
    edges: [
      ["n1","n5"],["n2","n6"],["n2","n7"],["n2","n9"],["n3","n6"],["n3","n7"],["n3","n9"],["n4","n9"],
      ["n5","n11"],["n6","n11"],["n7","n11"],["n6","n9"],["n7","n9"],["n8","n7"],
      ["n9","n11"],["n9","n10"],["n10","n11"],
      ["n11","n12"],["n11","n13"],["n11","n14"],["n12","n15"],["n15","n16"],["n14","n16"],
      ["n11","n17"],["n11","n18"],["n18","n16"],
    ],
  },
  airgap: {
    zones: [
      { id: "z1", x: 40,   y: 88, w: 1288, h: 520, label: "Air-gapped enclave", color: "#FEC514" },
      { id: "z2", x: 1680, y: 88, w: 328,  h: 336, label: "External / Internet", color: "#FF957D" },
    ],
    nodes: [
      { id: "a1",  type: "source",       x: 80,   y: 152, title: "Servers" },
      { id: "a2",  type: "source",       x: 80,   y: 288, title: "Endpoints" },
      { id: "a3",  type: "agent",        x: 400,  y: 152 },
      { id: "a4",  type: "fleet",        x: 400,  y: 288 },
      { id: "a5",  type: "es",           x: 720,  y: 152 },
      { id: "a6",  type: "kibana",       x: 720,  y: 288 },
      { id: "a12", type: "mapserver",    x: 1040, y: 288 },
      { id: "a8",  type: "epr",          x: 720,  y: 472 },
      { id: "a9",  type: "artifactreg",  x: 400,  y: 472 },
      { id: "a10", type: "endpointrepo", x: 80,   y: 472 },
      { id: "a11", type: "docsbundle",   x: 1040, y: 472 },
      { id: "a13", type: "firewall",     x: 1400, y: 248 },
      { id: "a14", type: "ems",          x: 1720, y: 152, props: { access: "Via firewall" } },
      { id: "a15", type: "llm",          x: 1720, y: 288 },
    ],
    edges: [
      ["a1","a3"],["a2","a3"],["a3","a5"],["a4","a3"],["a5","a6"],
      ["a6","a8"],["a4","a9"],["a4","a10"],["a6","a11"],["a6","a12"],
      ["a6","a13"],["a13","a14"],["a13","a15"],
    ],
  },
  multitenant: {
    zones: [
      { id: "tenant0__zone", x: 32, y: 8, w: 616, h: 418, label: "Tenant A", color: "#4B9FEA" },
      { id: "tenant1__zone", x: 32, y: 464, w: 616, h: 418, label: "Tenant B", color: "#4B9FEA" },
      { id: "tenant2__zone", x: 32, y: 920, w: 616, h: 418, label: "Tenant C", color: "#4B9FEA" },
      { id: "ingest__zone", x: 880, y: 464, w: 308, h: 418, label: "Shared Ingestion Tools", color: "#19C2B4" },
      { id: "siem__zone", x: 1392, y: 400, w: 968, h: 536, label: "SIEM Cluster", color: "#FEC514" },
      { id: "sec1003__zone", x: 2528, y: 248, w: 940, h: 510, label: "User Space", color: "#F45C9C" },
    ],
    nodes: [
      { id: "tenant0__src0", type: "source", x: 64, y: 56 },
      { id: "tenant0__src1", type: "syslog", x: 64, y: 184 },
      { id: "tenant0__src2", type: "saas", x: 64, y: 304 },
      { id: "tenant0__col0", type: "agent", x: 368, y: 56 },
      { id: "tenant1__src0", type: "source", x: 56, y: 512 },
      { id: "tenant1__src1", type: "syslog", x: 56, y: 632 },
      { id: "tenant1__src2", type: "saas", x: 56, y: 760 },
      { id: "tenant1__col0", type: "agent", x: 368, y: 512 },
      { id: "tenant2__src0", type: "source", x: 56, y: 968 },
      { id: "tenant2__src1", type: "syslog", x: 56, y: 1088 },
      { id: "tenant2__src2", type: "saas", x: 56, y: 1208 },
      { id: "tenant2__col0", type: "agent", x: 368, y: 968 },
      { id: "ingest__tool0", type: "agent", x: 912, y: 512 },
      { id: "ingest__tool1", type: "logstash", x: 912, y: 632 },
      { id: "ingest__tool2", type: "kafka", x: 912, y: 752 },
      { id: "siem__hot", type: "tier_hot", x: 1752, y: 464 },
      { id: "siem__cold", type: "tier_cold", x: 1752, y: 624 },
      { id: "siem__frozen", type: "tier_frozen", x: 1752, y: 784 },
      { id: "siem__ingest", type: "node_ingest", x: 1440, y: 624 },
      { id: "siem__master", type: "node_master", x: 2064, y: 624 },
      { id: "sec1003__kibana", type: "kibana", x: 2560, y: 464 },
      { id: "sec1003__idp", type: "idp", x: 2560, y: 296 },
      { id: "sec1003__thirdparty", type: "thirdparty", x: 2560, y: 632 },
      { id: "sec1003__lb", type: "lb", x: 2872, y: 464 },
      { id: "sec1003__users", type: "users", x: 3192, y: 464 },
    ],
    edges: [
      ["tenant0__src0", "tenant0__col0"],
      ["tenant0__src1", "tenant0__col0"],
      ["tenant0__src2", "tenant0__col0"],
      ["tenant1__src0", "tenant1__col0"],
      ["tenant1__src1", "tenant1__col0"],
      ["tenant1__src2", "tenant1__col0"],
      ["tenant2__src0", "tenant2__col0"],
      ["tenant2__src1", "tenant2__col0"],
      ["tenant2__src2", "tenant2__col0"],
      ["siem__hot", "siem__cold", "ILM"],
      ["siem__cold", "siem__frozen", "ILM"],
      ["siem__ingest", "siem__hot"],
      { s: "siem__master", e: "siem__hot", bi: true },
      { s: "siem__master", e: "siem__cold", bi: true },
      { s: "siem__master", e: "siem__frozen", bi: true },
      { s: "siem__master", e: "siem__ingest", bi: true },
      ["tenant0__zone", "ingest__zone"],
      ["tenant1__zone", "ingest__zone"],
      ["tenant2__zone", "ingest__zone"],
      ["ingest__zone", "siem__ingest", "normalized events"],
      ["sec1003__kibana", "sec1003__idp"],
      ["sec1003__kibana", "sec1003__thirdparty"],
      ["sec1003__users", "sec1003__lb"],
      ["sec1003__lb", "sec1003__kibana"],
      ["sec1003__kibana", "siem__hot"],
    ],
  },
};
