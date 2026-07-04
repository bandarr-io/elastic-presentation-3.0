import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";

/* ============================================================
   ElasticWhiteboard
   Drag-and-drop Elastic architecture canvas. No dependencies
   beyond React.

   Canvas:      drag empty space pans · wheel zooms · Fit button
   Palette:     drag a component onto the canvas (search box filters)
   Nodes:       drag moves (multi-select drags together) · corner
                grip resizes · double-click renames · shift-click
                multi-selects · shift-drag marquee-selects ·
                ⌘/Ctrl+D duplicates · Del removes
   Connections: hover a node, drag a ring onto another node ·
                click a line to select (label / reverse / delete)
   Zones:       + Zone adds a labeled container · drag its pill to
                move it with its contents · grip resizes
   History:     ⌘/Ctrl+Z undo · ⌘/Ctrl+Shift+Z redo
   Export:      JSON (round-trips) · SVG · PNG
   ============================================================ */

/* Data-flow stages mapped to the Elastic brand palette, per theme. Dark uses
   the bright brand hues; light darkens them for contrast on a pale canvas
   (mirrors the deck's light-mode flow legend). */
const STAGE_PALETTES = {
  dark:  { collect: "#4C8DFF", process: "#FEC514", store: "#48EFCF", serve: "#F04E98", ops: "#8A9BB4" },
  light: { collect: "#0B64DD", process: "#B7791F", store: "#0E8C7F", serve: "#F04E98", ops: "#64748B" },
};

/* Canvas surface colors (backgrounds, panels, lines, text) per theme. Mirrored
   into CSS variables on the root and reused by the SVG / PNG export so exported
   diagrams match whichever theme is active. */
const SURFACES = {
  dark:  { bg: "#0C1530", panel: "#16213F", panel2: "#0F1A38", line: "#2A3556", ink: "#E8EDF4", muted: "#94A3C4" },
  light: { bg: "#F5F7FA", panel: "#FFFFFF", panel2: "#EEF2F7", line: "#D6DEEA", ink: "#1C1E23", muted: "#5B6472" },
};

const CATS = [
  "Core & UI", "Nodes", "Ingest & Processing", "OpenTelemetry (EDOT)", "Beats",
  "Security", "ML & NLP", "Maps & Geo", "Clients & Tooling", "Orchestration",
  "Air-Gapped Services", "Custom", "General",
];

/* Typed node registry. `flow` overrides the color of connections leaving
   a type; `ops:true` renders its connections dashed (control-plane /
   optional); `color` overrides the accent; `fields` are type-specific
   settings rendered generically in the inspector.                      */
const TYPES = {
  /* --- Core & UI --- */
  es:     { cat: "Core & UI", label: "Elasticsearch", sub: "Distributed search & analytics", stage: "store", w: 220, h: 80,
    fields: [
      { key: "masters", label: "Master nodes", kind: "number", min: 1, max: 9,   def: 3, unit: "masters" },
      { key: "data",    label: "Data nodes",   kind: "number", min: 1, max: 200, def: 3, unit: "data" },
      { key: "version", label: "Version",      kind: "text", placeholder: "8.x", pre: "v" },
      { key: "ml",      label: "ML nodes",     kind: "toggle" },
    ] },
  kibana: { cat: "Core & UI", label: "Kibana", sub: "Stack UI · dashboards · management", stage: "serve", w: 200, h: 76,
    fields: [{ key: "instances", label: "Instances", kind: "number", min: 1, max: 20, def: 2, unit: "inst" }] },
  remote: { cat: "Core & UI", label: "Remote Cluster", sub: "Cross-cluster search & replication", stage: "store", w: 200, h: 76,
    fields: [
      { key: "mode",   label: "Mode", kind: "select", options: ["CCS", "CCR", "CCS + CCR"], def: "CCS" },
      { key: "region", label: "Region", kind: "text", placeholder: "e.g. us-east-1" },
    ] },

  /* --- Nodes (tiers & roles) --- */
  tier_hot:    { cat: "Nodes", label: "Hot Tier",    sub: "Indexing & recent data · fast SSD", stage: "store", color: "#ef6a5a", w: 172, h: 64,
    fields: [
      { key: "nodes",    label: "Nodes",    kind: "number", min: 1, max: 50, def: 2, unit: "nodes" },
      { key: "capacity", label: "Capacity", kind: "text", placeholder: "e.g. 2 TB" },
    ] },
  tier_warm:   { cat: "Nodes", label: "Warm Tier",   sub: "Read-mostly · older data", stage: "store", color: "#f09c3e", w: 172, h: 64,
    fields: [
      { key: "nodes",    label: "Nodes",    kind: "number", min: 1, max: 50, def: 2, unit: "nodes" },
      { key: "capacity", label: "Capacity", kind: "text", placeholder: "e.g. 10 TB" },
    ] },
  tier_cold:   { cat: "Nodes", label: "Cold Tier",   sub: "Infrequent access · cheaper HW", stage: "store", color: "#58a8e8", w: 172, h: 64,
    fields: [
      { key: "nodes",    label: "Nodes",    kind: "number", min: 1, max: 50, def: 1, unit: "nodes" },
      { key: "capacity", label: "Capacity", kind: "text", placeholder: "e.g. 40 TB" },
    ] },
  tier_frozen: { cat: "Nodes", label: "Frozen Tier", sub: "Searchable snapshots · object store", stage: "store", color: "#9aa5b1", w: 172, h: 64,
    fields: [
      { key: "nodes",    label: "Nodes",    kind: "number", min: 1, max: 50, def: 1, unit: "nodes" },
      { key: "capacity", label: "Capacity", kind: "text", placeholder: "object store size" },
    ] },
  node_master: { cat: "Nodes", label: "Master Node", sub: "Cluster state · quorum", stage: "store", color: "#e2c766", w: 182, h: 64,
    fields: [{ key: "nodes", label: "Nodes", kind: "number", min: 1, max: 9, def: 3, unit: "nodes" }] },
  node_ml:     { cat: "Nodes", label: "ML Node", sub: "Anomaly detection · model inference", stage: "store", color: "#b48ce8", w: 182, h: 64,
    fields: [{ key: "nodes", label: "Nodes", kind: "number", min: 1, max: 50, def: 2, unit: "nodes" }] },
  node_ingest: { cat: "Nodes", label: "Ingest Node", sub: "Ingest pipelines · enrichment", stage: "store", w: 182, h: 64,
    fields: [{ key: "nodes", label: "Nodes", kind: "number", min: 1, max: 50, def: 2, unit: "nodes" }] },
  node_coord:  { cat: "Nodes", label: "Coordinating Node", sub: "Request routing · reduce phase", stage: "store", color: "#7f96ad", w: 196, h: 64,
    fields: [{ key: "nodes", label: "Nodes", kind: "number", min: 1, max: 50, def: 2, unit: "nodes" }] },

  /* --- Ingest & Processing --- */
  agent:    { cat: "Ingest & Processing", label: "Elastic Agent", sub: "Logs · metrics · APM · endpoint", stage: "collect", w: 190, h: 72,
    fields: [
      { key: "count",  label: "Agent count", kind: "number", min: 1, max: 100000, unit: "agents" },
      { key: "policy", label: "Policy",      kind: "text", placeholder: "e.g. prod-linux" },
    ] },
  fleet:    { cat: "Ingest & Processing", label: "Fleet Server", sub: "Central Agent management", stage: "collect", ops: true, w: 180, h: 72,
    fields: [{ key: "instances", label: "Instances", kind: "number", min: 1, max: 20, def: 2, unit: "inst" }] },
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
  osquerybeat: { cat: "Beats", label: "Osquerybeat", sub: "Osquery results",          stage: "collect", w: 160, h: 62 },
  cloudbeat:   { cat: "Beats", label: "Cloudbeat",   sub: "Cloud posture (CSPM)",     stage: "collect", w: 160, h: 62 },

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
  firewall:   { cat: "General", label: "Firewall / Proxy", sub: "Network boundary", stage: "ops", ops: true, color: "#FF957D", w: 186, h: 68,
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

const tagOf = (t, stages) => t.color || stages[t.stage];

/* ---------------- templates ---------------- */

const SEEDS = {
  reference: {
    zones: [],
    nodes: [
      { id: "n1",  type: "source",     x: 40,   y: 80,  title: "Knowledge Bases" },
      { id: "n2",  type: "source",     x: 40,   y: 200, title: "Servers" },
      { id: "n3",  type: "source",     x: 40,   y: 320, title: "Endpoints" },
      { id: "n4",  type: "source",     x: 40,   y: 440, title: "Databases" },
      { id: "n5",  type: "connectors", x: 300,  y: 78 },
      { id: "n6",  type: "beats",      x: 300,  y: 202 },
      { id: "n7",  type: "agent",      x: 300,  y: 322 },
      { id: "n8",  type: "fleet",      x: 300,  y: 560 },
      { id: "n9",  type: "logstash",   x: 580,  y: 360 },
      { id: "n10", type: "kafka",      x: 580,  y: 490 },
      { id: "n11", type: "es",         x: 860,  y: 170 },
      { id: "n12", type: "kibana",     x: 1180, y: 80 },
      { id: "n13", type: "cloud",      x: 1180, y: 230 },
      { id: "n14", type: "thirdparty", x: 1180, y: 370 },
      { id: "n15", type: "lb",         x: 1470, y: 84 },
      { id: "n16", type: "users",      x: 1470, y: 210 },
      { id: "n17", type: "storage",    x: 860,  y: 520 },
      { id: "n18", type: "monitoring", x: 1180, y: 520 },
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
      { id: "z1", x: 40,   y: 90, w: 1010, h: 640, label: "Air-gapped enclave", color: "#FEC514" },
      { id: "z2", x: 1340, y: 90, w: 380,  h: 340, label: "External / Internet", color: "#FF957D" },
    ],
    nodes: [
      { id: "a1",  type: "source",       x: 80,   y: 150, title: "Servers" },
      { id: "a2",  type: "source",       x: 80,   y: 270, title: "Endpoints" },
      { id: "a3",  type: "agent",        x: 330,  y: 160 },
      { id: "a4",  type: "fleet",        x: 330,  y: 310 },
      { id: "a5",  type: "es",           x: 620,  y: 150 },
      { id: "a6",  type: "kibana",       x: 620,  y: 310 },
      { id: "a12", type: "mapserver",    x: 838,  y: 310 },
      { id: "a8",  type: "epr",          x: 80,   y: 590 },
      { id: "a9",  type: "artifactreg",  x: 330,  y: 590 },
      { id: "a10", type: "endpointrepo", x: 570,  y: 590 },
      { id: "a11", type: "docsbundle",   x: 820,  y: 590 },
      { id: "a13", type: "firewall",     x: 1120, y: 220 },
      { id: "a14", type: "ems",          x: 1380, y: 150, props: { access: "Via firewall" } },
      { id: "a15", type: "llm",          x: 1380, y: 300 },
    ],
    edges: [
      ["a1","a3"],["a2","a3"],["a3","a5"],["a4","a3"],["a5","a6"],
      ["a6","a8"],["a4","a9"],["a4","a10"],["a6","a11"],["a6","a12"],
      ["a6","a13"],["a13","a14"],["a13","a15"],
    ],
  },
};

/* ---------------- pure geometry ---------------- */

const rectOf = (n) => ({
  x: n.x, y: n.y,
  w: n.w != null ? n.w : TYPES[n.type].w,
  h: n.h != null ? n.h : TYPES[n.type].h,
});
const nodeTag = (n, stages) => n.color || tagOf(TYPES[n.type], stages);
const nodeSub = (n) => (n.sub !== undefined ? n.sub : TYPES[n.type].sub);
const fieldChips = (n) => {
  const out = [];
  for (const f of TYPES[n.type].fields || []) {
    const v = n.props && n.props[f.key] !== undefined ? n.props[f.key] : f.def;
    if (v === undefined || v === "" || v === false) continue;
    out.push(f.kind === "toggle" ? f.label : (f.pre || "") + v + (f.unit ? " " + f.unit : ""));
  }
  return out;
};

function anchor(r, side, t = 0.5) {
  switch (side) {
    case "l": return { x: r.x,           y: r.y + r.h * t };
    case "r": return { x: r.x + r.w,     y: r.y + r.h * t };
    case "t": return { x: r.x + r.w * t, y: r.y };
    case "b": return { x: r.x + r.w * t, y: r.y + r.h };
    default:  return { x: r.x, y: r.y };
  }
}
function autoSides(ra, rb) {
  const dx = rb.x + rb.w / 2 - (ra.x + ra.w / 2);
  const dy = rb.y + rb.h / 2 - (ra.y + ra.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ["r", "l"] : ["l", "r"];
  return dy >= 0 ? ["b", "t"] : ["t", "b"];
}
function edgePolyline(ra, rb) {
  const [sS, eS] = autoSides(ra, rb);
  const A = anchor(ra, sS), B = anchor(rb, eS);
  const hOut = sS === "l" || sS === "r";
  if (hOut) {
    if (Math.abs(A.y - B.y) < 14) return [A, B];
    const mx = (A.x + B.x) / 2;
    return [A, { x: mx, y: A.y }, { x: mx, y: B.y }, B];
  }
  if (Math.abs(A.x - B.x) < 14) return [A, B];
  const my = (A.y + B.y) / 2;
  return [A, { x: A.x, y: my }, { x: B.x, y: my }, B];
}
function roundedPath(pl, R = 12) {
  let d = `M ${pl[0].x} ${pl[0].y}`;
  for (let q = 1; q < pl.length - 1; q++) {
    const pv = pl[q - 1], p = pl[q], nx = pl[q + 1];
    const l1 = Math.hypot(p.x - pv.x, p.y - pv.y);
    const l2 = Math.hypot(nx.x - p.x, nx.y - p.y);
    const r = Math.min(R, l1 / 2, l2 / 2);
    const u1 = { x: (p.x - pv.x) / (l1 || 1), y: (p.y - pv.y) / (l1 || 1) };
    const u2 = { x: (nx.x - p.x) / (l2 || 1), y: (nx.y - p.y) / (l2 || 1) };
    d += ` L ${p.x - u1.x * r} ${p.y - u1.y * r} Q ${p.x} ${p.y} ${p.x + u2.x * r} ${p.y + u2.y * r}`;
  }
  d += ` L ${pl[pl.length - 1].x} ${pl[pl.length - 1].y}`;
  return d;
}
function plMid(pl) {
  const lens = [];
  let total = 0;
  for (let i = 0; i < pl.length - 1; i++) {
    const l = Math.hypot(pl[i + 1].x - pl[i].x, pl[i + 1].y - pl[i].y);
    lens.push(l); total += l;
  }
  let target = total / 2;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i]) {
      const f = lens[i] ? target / lens[i] : 0;
      return { x: pl[i].x + (pl[i + 1].x - pl[i].x) * f,
               y: pl[i].y + (pl[i + 1].y - pl[i].y) * f, total };
    }
    target -= lens[i];
  }
  return { ...pl[pl.length - 1], total };
}

const snap = (v) => Math.round(v / 8) * 8;
const stageKeyOf = (srcNode) => {
  const t = TYPES[srcNode.type];
  return t.flow || t.stage;
};
const edgeDashed = (a, b) => TYPES[a.type].ops || TYPES[b.type].ops;
const clone = (x) => JSON.parse(JSON.stringify(x));

let UID = 1000;
const uid = (p) => `${p}${UID++}`;

/* ---------------- component ---------------- */

export default function ElasticWhiteboard({ height = "100%" }) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const stages = isDark ? STAGE_PALETTES.dark : STAGE_PALETTES.light;
  const surface = isDark ? SURFACES.dark : SURFACES.light;

  const [nodes, setNodes] = useState(clone(SEEDS.reference.nodes));
  const [edges, setEdges] = useState(SEEDS.reference.edges.map(([s, e], i) => ({ id: `e${i}`, s, e })));
  const [zones, setZones] = useState([]);
  const [view, setView]   = useState({ x: 30, y: 20, k: 0.85 });
  const [sel, setSel]     = useState(null);      // {kind:'nodes',ids} | {kind:'edge'|'zone',id}
  const [hover, setHover] = useState(null);
  const [connect, setConnect] = useState(null);  // {from,cx,cy} world coords
  const [ghost, setGhost] = useState(null);      // palette drag {type,cx,cy} client coords
  const [editing, setEditing] = useState(null);  // node id being renamed
  const [marquee, setMarquee] = useState(null);  // {x0,y0,x1,y1} world coords
  const [q, setQ] = useState("");
  const [styleClip, setStyleClip] = useState(null); // copied node style {color,w,h}
  const [openCats, setOpenCats] = useState(() => new Set(CATS.filter((c) => c !== "General")));
  const [, bumpHist] = useState(0);
  const viewportRef = useRef(null);
  const fileRef = useRef(null);
  const dragRef = useRef(null);
  const lastClickRef = useRef({ id: null, t: 0 });
  const histRef = useRef({ undo: [], redo: [] });
  const snapKeyRef = useRef({ k: null, t: 0 });

  const nodeById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const docRef = useRef(null);
  docRef.current = { nodes, edges, zones };

  /* ---------- history ---------- */
  const snapshot = () => {
    const h = histRef.current;
    h.undo.push(clone(docRef.current));
    if (h.undo.length > 60) h.undo.shift();
    h.redo = [];
    bumpHist((t) => t + 1);
  };
  /* one snapshot per continuous edit target (e.g. typing in a field) */
  const snapGuard = (key) => {
    const now = Date.now();
    if (snapKeyRef.current.k !== key || now - snapKeyRef.current.t > 1200) snapshot();
    snapKeyRef.current = { k: key, t: now };
  };
  const restore = (doc) => { setNodes(doc.nodes); setEdges(doc.edges); setZones(doc.zones); setSel(null); };
  const undo = () => {
    const h = histRef.current;
    if (!h.undo.length) return;
    h.redo.push(clone(docRef.current));
    restore(h.undo.pop());
    bumpHist((t) => t + 1);
  };
  const redo = () => {
    const h = histRef.current;
    if (!h.redo.length) return;
    h.undo.push(clone(docRef.current));
    restore(h.redo.pop());
    bumpHist((t) => t + 1);
  };

  /* ---------- coords ---------- */
  const toWorld = (clientX, clientY) => {
    const r = viewportRef.current.getBoundingClientRect();
    return { x: (clientX - r.left - view.x) / view.k, y: (clientY - r.top - view.y) / view.k };
  };

  /* ---------- wheel zoom ---------- */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      setView((v) => {
        const k = Math.min(2, Math.max(0.3, v.k * Math.exp(-e.deltaY * 0.0012)));
        const r = el.getBoundingClientRect();
        const cx = e.clientX - r.left, cy = e.clientY - r.top;
        return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (e.key === "Escape") {
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") document.activeElement.blur();
        setSel(null); setConnect(null); setEditing(null); setMarquee(null); dragRef.current = null;
        return;
      }
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSel(); return; }
      if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (sel && sel.kind === "nodes" && sel.ids.length) copyStyle(nodeById[sel.ids[0]]);
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (sel && sel.kind === "nodes") applyStyle(sel.ids);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        deleteSel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // re-bound every render so handlers see fresh state

  const deleteSel = () => {
    if (!sel) return;
    snapshot();
    if (sel.kind === "nodes") {
      setNodes((ns) => ns.filter((n) => !sel.ids.includes(n.id)));
      setEdges((es) => es.filter((ed) => !sel.ids.includes(ed.s) && !sel.ids.includes(ed.e)));
    } else if (sel.kind === "edge") {
      setEdges((es) => es.filter((ed) => ed.id !== sel.id));
    } else if (sel.kind === "zone") {
      setZones((zs) => zs.filter((z) => z.id !== sel.id));
    }
    setSel(null);
  };

  /* copy a node's visual style (accent + effective size); apply it to any
     node selection. A null color means "inherit the type's stage color". */
  const copyStyle = (n) => {
    if (!n) return;
    const r = rectOf(n);
    setStyleClip({ color: n.color ?? null, w: r.w, h: r.h });
  };
  const applyStyle = (ids) => {
    if (!styleClip || !ids || !ids.length) return;
    snapshot();
    setNodes((ns) => ns.map((m) => (ids.includes(m.id)
      ? { ...m, color: styleClip.color ?? undefined, w: styleClip.w, h: styleClip.h }
      : m)));
  };

  const duplicateSel = () => {
    if (!sel || sel.kind !== "nodes") return;
    snapshot();
    const clones = [];
    setNodes((ns) => {
      const out = [...ns];
      for (const id of sel.ids) {
        const n = ns.find((x) => x.id === id);
        if (!n) continue;
        const c = clone(n);
        c.id = uid("n"); c.x += 24; c.y += 24;
        clones.push(c.id); out.push(c);
      }
      return out;
    });
    if (clones.length) setSel({ kind: "nodes", ids: clones });
  };

  /* ---------- gestures ---------- */

  const startPan = (e) => {
    if (e.button !== 0) return;
    if (e.shiftKey) {                                  /* marquee select */
      const w = toWorld(e.clientX, e.clientY);
      dragRef.current = { mode: "marquee", x0: w.x, y0: w.y };
      setMarquee({ x0: w.x, y0: w.y, x1: w.x, y1: w.y });
    } else {
      dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, v0: view };
      setSel(null);
    }
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const startMove = (e, id) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey) {                                  /* toggle multi-selection */
      setSel((prev) => {
        const ids = prev && prev.kind === "nodes" ? [...prev.ids] : [];
        const i = ids.indexOf(id);
        if (i >= 0) ids.splice(i, 1); else ids.push(id);
        return ids.length ? { kind: "nodes", ids } : null;
      });
      return;
    }
    /* manual double-click detection (pointer capture retargets clicks) */
    const now = Date.now();
    if (lastClickRef.current.id === id && now - lastClickRef.current.t < 350) {
      e.preventDefault();                              /* keep focus on the rename input */
      lastClickRef.current = { id: null, t: 0 };
      setEditing(id);
      return;
    }
    lastClickRef.current = { id, t: now };

    const w = toWorld(e.clientX, e.clientY);
    const already = sel && sel.kind === "nodes" && sel.ids.includes(id);
    const ids = already ? sel.ids : [id];
    if (!already) setSel({ kind: "nodes", ids: [id] });
    const starts = {};
    for (const i2 of ids) { const n = nodeById[i2]; if (n) starts[i2] = { x: n.x, y: n.y }; }
    dragRef.current = { mode: "move", ids, starts, px: w.x, py: w.y, snapped: false };
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const startResize = (e, id) => {
    e.stopPropagation();
    const r = rectOf(nodeById[id]);
    const w0 = toWorld(e.clientX, e.clientY);
    dragRef.current = { mode: "resize", id, w: r.w, h: r.h, px: w0.x, py: w0.y, snapped: false };
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const startConnect = (e, id) => {
    e.stopPropagation();
    const w = toWorld(e.clientX, e.clientY);
    dragRef.current = { mode: "connect", from: id };
    viewportRef.current.setPointerCapture(e.pointerId);
    setConnect({ from: id, cx: w.x, cy: w.y });
  };

  const startZoneMove = (e, id) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSel({ kind: "zone", id });
    const z = zones.find((x) => x.id === id);
    const w = toWorld(e.clientX, e.clientY);
    /* zone drags its contents: capture nodes whose centers are inside */
    const nstarts = {};
    for (const n of nodes) {
      const r = rectOf(n);
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h)
        nstarts[n.id] = { x: n.x, y: n.y };
    }
    dragRef.current = { mode: "zmove", id, zx: z.x, zy: z.y, nstarts, px: w.x, py: w.y, snapped: false };
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const startZoneResize = (e, id) => {
    e.stopPropagation();
    const z = zones.find((x) => x.id === id);
    const w = toWorld(e.clientX, e.clientY);
    dragRef.current = { mode: "zresize", id, w: z.w, h: z.h, px: w.x, py: w.y, snapped: false };
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const startPalette = (e, type) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { mode: "palette", type };
    setGhost({ type, cx: e.clientX, cy: e.clientY });
    window.addEventListener("pointermove", paletteMove);
    window.addEventListener("pointerup", paletteUp, { once: true });
  };
  const paletteMove = (e) => setGhost((g) => (g ? { ...g, cx: e.clientX, cy: e.clientY } : g));
  const paletteUp = (e) => {
    window.removeEventListener("pointermove", paletteMove);
    const d = dragRef.current;
    dragRef.current = null;
    setGhost(null);
    if (!d || d.mode !== "palette") return;
    const r = viewportRef.current.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    const w = toWorld(e.clientX, e.clientY);
    const t = TYPES[d.type];
    const id = uid("n");
    snapshot();
    setNodes((ns) => [...ns, { id, type: d.type, x: snap(w.x - t.w / 2), y: snap(w.y - t.h / 2) }]);
    setSel({ kind: "nodes", ids: [id] });
  };

  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const lazySnap = () => { if (!d.snapped) { snapshot(); d.snapped = true; } };
    if (d.mode === "pan") {
      setView({ ...d.v0, x: d.v0.x + (e.clientX - d.sx), y: d.v0.y + (e.clientY - d.sy) });
    } else if (d.mode === "marquee") {
      const w = toWorld(e.clientX, e.clientY);
      setMarquee({ x0: d.x0, y0: d.y0, x1: w.x, y1: w.y });
    } else if (d.mode === "move") {
      lazySnap();
      const w = toWorld(e.clientX, e.clientY);
      const dx = w.x - d.px, dy = w.y - d.py;
      setNodes((ns) => ns.map((n) => d.starts[n.id]
        ? { ...n, x: snap(d.starts[n.id].x + dx), y: snap(d.starts[n.id].y + dy) } : n));
    } else if (d.mode === "resize") {
      lazySnap();
      const w = toWorld(e.clientX, e.clientY);
      const nw = Math.max(96, Math.min(640, snap(d.w + (w.x - d.px))));
      const nh = Math.max(48, Math.min(420, snap(d.h + (w.y - d.py))));
      setNodes((ns) => ns.map((n) => (n.id === d.id ? { ...n, w: nw, h: nh } : n)));
    } else if (d.mode === "zmove") {
      lazySnap();
      const w = toWorld(e.clientX, e.clientY);
      const dx = w.x - d.px, dy = w.y - d.py;
      setZones((zs) => zs.map((z) => (z.id === d.id ? { ...z, x: snap(d.zx + dx), y: snap(d.zy + dy) } : z)));
      setNodes((ns) => ns.map((n) => d.nstarts[n.id]
        ? { ...n, x: snap(d.nstarts[n.id].x + dx), y: snap(d.nstarts[n.id].y + dy) } : n));
    } else if (d.mode === "zresize") {
      lazySnap();
      const w = toWorld(e.clientX, e.clientY);
      const nw = Math.max(160, Math.min(2400, snap(d.w + (w.x - d.px))));
      const nh = Math.max(120, Math.min(1600, snap(d.h + (w.y - d.py))));
      setZones((zs) => zs.map((z) => (z.id === d.id ? { ...z, w: nw, h: nh } : z)));
    } else if (d.mode === "connect") {
      const w = toWorld(e.clientX, e.clientY);
      setConnect((c) => (c ? { ...c, cx: w.x, cy: w.y } : c));
    }
  };

  const onUp = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === "palette") return;                  /* finalized by window paletteUp */
    dragRef.current = null;
    if (d.mode === "connect") {
      const w = toWorld(e.clientX, e.clientY);
      const hit = nodes.find((n) => {
        const r = rectOf(n);
        return w.x >= r.x && w.x <= r.x + r.w && w.y >= r.y && w.y <= r.y + r.h;
      });
      if (hit && hit.id !== d.from &&
          !edges.some((ed) => ed.s === d.from && ed.e === hit.id)) {
        snapshot();
        setEdges((es) => [...es, { id: uid("e"), s: d.from, e: hit.id }]);
      }
      setConnect(null);
    } else if (d.mode === "marquee") {
      const w = toWorld(e.clientX, e.clientY);
      const x0 = Math.min(d.x0, w.x), x1 = Math.max(d.x0, w.x);
      const y0 = Math.min(d.y0, w.y), y1 = Math.max(d.y0, w.y);
      const ids = nodes.filter((n) => {
        const r = rectOf(n);
        return r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0;
      }).map((n) => n.id);
      setSel(ids.length ? { kind: "nodes", ids } : null);
      setMarquee(null);
    }
  };

  /* ---------- toolbar ---------- */

  const loadSeed = (key) => {
    snapshot();
    const s = SEEDS[key];
    setNodes(clone(s.nodes));
    setEdges(s.edges.map(([a, b], i) => ({ id: `e${i}`, s: a, e: b })));
    setZones(clone(s.zones));
    setSel(null);
  };
  const clearAll = () => { snapshot(); setNodes([]); setEdges([]); setZones([]); setSel(null); };

  const addZone = () => {
    snapshot();
    const el = viewportRef.current;
    const cx = (el.clientWidth / 2 - view.x) / view.k;
    const cy = (el.clientHeight / 2 - view.y) / view.k;
    const id = uid("z");
    setZones((zs) => [...zs, { id, x: snap(cx - 220), y: snap(cy - 150), w: 440, h: 300, label: "Zone", color: "#FEC514" }]);
    setSel({ kind: "zone", id });
  };

  const dl = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportJSON = () => {
    dl(new Blob([JSON.stringify({ nodes, edges: edges.map(({ s, e, lbl }) => (lbl ? [s, e, lbl] : [s, e])), zones }, null, 2)],
       { type: "application/json" }), "elastic-whiteboard.json");
  };
  const importJSON = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error("bad shape");
        snapshot();
        setNodes(data.nodes.filter((n) => TYPES[n.type]));
        setEdges(data.edges.map((ed, i) => ({ id: `e${i}`, s: ed[0], e: ed[1], lbl: ed[2] })));
        setZones(Array.isArray(data.zones) ? data.zones : []);
        setSel(null);
      } catch { /* ignore malformed files */ }
    };
    rd.readAsText(f);
    e.target.value = "";
  };

  const zoomBy = (f) =>
    setView((v) => {
      const el = viewportRef.current;
      const k = Math.min(2, Math.max(0.3, v.k * f));
      const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });

  const bbox = () => {
    const boxes = [...zones, ...nodes.map((n) => rectOf(n))];
    if (!boxes.length) return null;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const b of boxes) {
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
    }
    return { x0, y0, x1, y1 };
  };
  const fit = () => {
    const bb = bbox();
    if (!bb) return;
    const el = viewportRef.current;
    const pad = 60, bw = bb.x1 - bb.x0 + pad * 2, bh = bb.y1 - bb.y0 + pad * 2;
    const k = Math.min(1.25, el.clientWidth / bw, el.clientHeight / bh);
    setView({ k, x: (el.clientWidth - (bb.x1 - bb.x0) * k) / 2 - bb.x0 * k,
                 y: (el.clientHeight - (bb.y1 - bb.y0) * k) / 2 - bb.y0 * k });
  };

  /* ---------- image export ---------- */

  const buildSVG = () => {
    const bb = bbox();
    if (!bb) return null;
    const pad = 48;
    const x0 = bb.x0 - pad, y0 = bb.y0 - pad, W = bb.x1 - bb.x0 + pad * 2, H = bb.y1 - bb.y0 + pad * 2;
    const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${W} ${H}" width="${W}" height="${H}" font-family="'Inter',system-ui,sans-serif">`;
    out += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${surface.bg}"/>`;
    out += "<defs>" + Object.entries(stages).map(([k, c]) =>
      `<marker id="xarr-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join("") + "</defs>";
    for (const z of zones) {
      out += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="14" fill="${z.color}" fill-opacity="0.045" stroke="${z.color}" stroke-opacity=".6" stroke-dasharray="7 5"/>`;
      out += `<text x="${z.x + 16}" y="${z.y - 8}" font-family="'Space Mono',monospace" font-size="11" letter-spacing="2" fill="${z.color}">${esc(z.label.toUpperCase())}</text>`;
    }
    for (const ed of edgeGeo) {
      const key = ed.stageKey || "ops";
      out += `<path d="${ed.d}" fill="none" stroke="${ed.color}" stroke-width="1.8" stroke-linecap="round" ${ed.dashed ? 'stroke-dasharray="5 6"' : ""} marker-end="url(#xarr-${key})"/>`;
      if (ed.lbl) out += `<text x="${ed.mid.x}" y="${ed.mid.y - 7}" text-anchor="middle" font-family="'Space Mono',monospace" font-size="11" fill="${surface.muted}" stroke="${surface.bg}" stroke-width="4" paint-order="stroke">${esc(ed.lbl)}</text>`;
    }
    for (const n of nodes) {
      const t = TYPES[n.type], r = rectOf(n), tag = nodeTag(n, stages);
      out += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="10" fill="${surface.panel}" stroke="${surface.line}"/>`;
      out += `<rect x="${r.x - 1}" y="${r.y + 10}" width="3" height="${Math.max(6, r.h - 20)}" rx="2" fill="${tag}"/>`;
      let tx = r.x + 14;
      if (n.logo) { out += `<image x="${tx}" y="${r.y + 11}" width="24" height="24" href="${esc(n.logo)}"/>`; tx += 33; }
      const availW = r.x + r.w - tx - 8;
      out += `<text x="${tx}" y="${r.y + 25}" font-family="'Mier B','Inter',sans-serif" font-size="14" fill="${surface.ink}">${esc((n.title || t.label).slice(0, Math.floor(availW / 7.6)))}</text>`;
      const sub = nodeSub(n);
      if (sub) out += `<text x="${tx}" y="${r.y + 40}" font-size="11" fill="${surface.muted}">${esc(sub.slice(0, Math.floor(availW / 5.7)))}</text>`;
      let cx = tx, cy = r.y + (sub ? 48 : 42);
      for (const c of fieldChips(n)) {
        const w = Math.round(c.length * 5.9) + 14;
        if (cx + w > r.x + r.w - 8 || cy + 15 > r.y + r.h - 4) break;
        out += `<rect x="${cx}" y="${cy}" width="${w}" height="14" rx="7" fill="${surface.panel2}" stroke="${surface.line}"/>`;
        out += `<text x="${cx + 7}" y="${cy + 10.5}" font-family="'Space Mono',monospace" font-size="9.5" fill="${surface.muted}">${esc(c)}</text>`;
        cx += w + 4;
      }
    }
    out += "</svg>";
    return out;
  };
  const exportSVG = () => {
    const svg = buildSVG();
    if (svg) dl(new Blob([svg], { type: "image/svg+xml" }), "elastic-whiteboard.svg");
  };
  const exportPNG = () => {
    const svg = buildSVG();
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        const scale = 2;
        c.width = img.width * scale; c.height = img.height * scale;
        const g = c.getContext("2d");
        g.scale(scale, scale);
        g.drawImage(img, 0, 0);
        c.toBlob((b) => {
          if (b) dl(b, "elastic-whiteboard.png");
          else dl(blob, "elastic-whiteboard.svg");   /* tainted canvas fallback */
          URL.revokeObjectURL(url);
        }, "image/png");
      } catch { dl(blob, "elastic-whiteboard.svg"); URL.revokeObjectURL(url); }
    };
    img.onerror = () => { dl(blob, "elastic-whiteboard.svg"); URL.revokeObjectURL(url); };
    img.src = url;
  };

  /* ---------- derived ---------- */

  const connected = useMemo(() => {
    if (!hover || dragRef.current) return null;
    const keep = new Set([hover]);
    for (const ed of edges) if (ed.s === hover || ed.e === hover) { keep.add(ed.s); keep.add(ed.e); }
    return keep;
  }, [hover, edges]);

  const edgeGeo = edges
    .filter((ed) => nodeById[ed.s] && nodeById[ed.e])
    .map((ed) => {
      const a = nodeById[ed.s], b = nodeById[ed.e];
      const pl = edgePolyline(rectOf(a), rectOf(b));
      const mid = plMid(pl);
      const stageKey = stageKeyOf(a);
      return { ...ed, d: roundedPath(pl), mid, len: mid.total,
               stageKey, color: stages[stageKey], dashed: edgeDashed(a, b) };
    });

  const totals = useMemo(() => {
    const t = { count: 0, cpu: 0, mem: 0 };
    for (const n of nodes) {
      const p = n.props || {};
      const mult = p.nodes || 1;
      if (p.nodes) t.count += p.nodes;
      if (p.cpu) t.cpu += p.cpu * mult;
      if (p.mem) t.mem += p.mem * mult;
    }
    return t;
  }, [nodes]);

  const tempLine = connect && nodeById[connect.from] ? (() => {
    const A = anchor(rectOf(nodeById[connect.from]), "r");
    return `M ${A.x} ${A.y} L ${connect.cx} ${connect.cy}`;
  })() : null;

  const selNodeIds = sel && sel.kind === "nodes" ? sel.ids : [];
  const h = histRef.current;

  /* ---------- render ---------- */
  return (
    <div className={"ew-root" + (isDark ? "" : " ew-light")} style={{ height }}>
      <style>{CSS}</style>

      <div className="ew-toolbar">
        <span className="ew-title">Elastic Whiteboard</span>
        <button onClick={() => loadSeed("reference")}>Reference</button>
        <button onClick={() => loadSeed("airgap")}>Air-gapped</button>
        <button onClick={clearAll}>Clear</button>
        <span className="ew-gap" />
        <button onClick={undo} disabled={!h.undo.length} title="Undo (Ctrl+Z)">↺</button>
        <button onClick={redo} disabled={!h.redo.length} title="Redo (Ctrl+Shift+Z)">↻</button>
        <button onClick={addZone}>+ Zone</button>
        <span className="ew-gap" />
        <button onClick={exportJSON}>JSON</button>
        <button onClick={() => fileRef.current.click()}>Import</button>
        <button onClick={exportSVG}>SVG</button>
        <button onClick={exportPNG}>PNG</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importJSON} />
        <span className="ew-gap" />
        <button onClick={() => zoomBy(1 / 1.2)}>−</button>
        <span className="ew-zoom">{Math.round(view.k * 100)}%</span>
        <button onClick={() => zoomBy(1.2)}>+</button>
        <button onClick={fit}>Fit</button>
        {(totals.cpu > 0 || totals.mem > 0 || totals.count > 0) && (
          <span className="ew-totals" title="Sums per-node CPU/RAM × node counts">
            Σ{totals.count > 0 && ` ${totals.count} nodes`}{totals.cpu > 0 && ` · ${totals.cpu} vCPU`}{totals.mem > 0 && ` · ${totals.mem} GB RAM`}
          </span>
        )}
        <span className="ew-hint">shift-click multi · shift-drag select · ⌘D duplicate · ⌘Z undo · drag ring to connect</span>
      </div>

      <div className="ew-body">
        {/* palette */}
        <div className="ew-palette">
          <input className="ew-search" placeholder="Search components…"
                 value={q} onChange={(e) => setQ(e.target.value)} />
          {!q.trim() && (
            <button className="ew-collapseall"
                    onClick={() => setOpenCats(openCats.size ? new Set() : new Set(CATS))}>
              {openCats.size ? "▾ Collapse all" : "▸ Expand all"}
            </button>
          )}
          {q.trim() ? (
            Object.entries(TYPES)
              .filter(([, t]) => (t.label + " " + t.sub + " " + t.cat).toLowerCase().includes(q.trim().toLowerCase()))
              .map(([key, t]) => <PaletteItem key={key} k={key} t={t} start={startPalette} stages={stages} />)
          ) : (
            CATS.map((cat) => {
              const items = Object.entries(TYPES).filter(([, t]) => t.cat === cat);
              if (!items.length) return null;
              return (
                <details key={cat} open={openCats.has(cat)} className="ew-cat">
                  <summary onClick={(e) => {
                    e.preventDefault();
                    setOpenCats((prev) => {
                      const next = new Set(prev);
                      next.has(cat) ? next.delete(cat) : next.add(cat);
                      return next;
                    });
                  }}>{cat}</summary>
                  {items.map(([key, t]) => <PaletteItem key={key} k={key} t={t} start={startPalette} stages={stages} />)}
                </details>
              );
            })
          )}
        </div>

        {/* canvas */}
        <div className="ew-viewport" ref={viewportRef}
             onPointerDown={startPan} onPointerMove={onMove} onPointerUp={onUp}>
          <div className="ew-world"
               style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.k})` }}>

            {/* zones (behind everything) */}
            {zones.map((z) => {
              const isSel = sel && sel.kind === "zone" && sel.id === z.id;
              return (
                <div key={z.id} className={"ew-zone" + (isSel ? " sel" : "")}
                     style={{ left: z.x, top: z.y, width: z.w, height: z.h, "--zc": z.color }}>
                  <span className="ew-zlabel" onPointerDown={(e) => startZoneMove(e, z.id)}>{z.label}</span>
                  {isSel && <span className="ew-zgrip" onPointerDown={(e) => startZoneResize(e, z.id)} />}
                </div>
              );
            })}

            <svg className="ew-wires" width="4200" height="2800" viewBox="0 0 4200 2800">
              <defs>
                {Object.entries(stages).map(([k, col]) => (
                  <marker key={k} id={`ew-arr-${k}`} viewBox="0 0 10 10" refX="8" refY="5"
                          markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill={col} />
                  </marker>
                ))}
              </defs>
              {edgeGeo.map((ed) => {
                const on = connected && (ed.s === hover || ed.e === hover);
                const dim = connected && !on;
                const isSel = sel && sel.kind === "edge" && sel.id === ed.id;
                return (
                  <g key={ed.id}>
                    <path d={ed.d} className="ew-hit"
                          onPointerDown={(e) => { e.stopPropagation(); setSel({ kind: "edge", id: ed.id }); }} />
                    <path id={`ew-${ed.id}`} d={ed.d}
                          className={"ew-edge" + (ed.dashed ? " ew-dash" : "") + (dim ? " dim" : "") + (on || isSel ? " on" : "")}
                          stroke={ed.color}
                          markerEnd={`url(#ew-arr-${ed.stageKey || "ops"})`} />
                    {ed.lbl && (
                      <text x={ed.mid.x} y={ed.mid.y - 7} textAnchor="middle"
                            className={"ew-elbl" + (dim ? " dim" : "") + (on || isSel ? " on" : "")}>
                        {ed.lbl}
                      </text>
                    )}
                    <circle r="3" fill={ed.color} className={"ew-particle" + (dim ? " dim" : "")}
                            style={{ filter: `drop-shadow(0 0 4px ${ed.color})` }}>
                      <animateMotion dur={`${Math.max(3, ed.len / 95).toFixed(2)}s`} repeatCount="indefinite">
                        <mpath href={`#ew-${ed.id}`} />
                      </animateMotion>
                    </circle>
                  </g>
                );
              })}
              {tempLine && <path d={tempLine} className="ew-temp" />}
            </svg>

            {/* nodes */}
            {nodes.map((n) => {
              const t = TYPES[n.type];
              const r = rectOf(n);
              const isSel = selNodeIds.includes(n.id);
              const dim = connected && !connected.has(n.id);
              return (
                <div key={n.id}
                     className={"ew-node" + (isSel ? " sel" : "") + (dim ? " dim" : "")}
                     style={{ left: n.x, top: n.y, width: r.w, height: r.h, "--tag": nodeTag(n, stages) }}
                     onPointerDown={(e) => startMove(e, n.id)}
                     onPointerEnter={() => setHover(n.id)}
                     onPointerLeave={() => setHover(null)}>
                  {editing === n.id ? (
                    <input autoFocus defaultValue={n.title || t.label}
                           onPointerDown={(e) => e.stopPropagation()}
                           onBlur={(e) => {
                             const v = e.target.value.trim();
                             snapGuard("rename:" + n.id);
                             setNodes((ns) => ns.map((m) => (m.id === n.id ? { ...m, title: v || t.label } : m)));
                             setEditing(null);
                           }}
                           onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
                  ) : (
                    <div className="ew-nbody">
                      {n.logo && <img src={n.logo} alt="" draggable={false}
                                      onError={(e) => { e.target.style.display = "none"; }} />}
                      <div>
                        <b>{n.title || t.label}</b>
                        {nodeSub(n) && <span>{nodeSub(n)}</span>}
                        {fieldChips(n).length > 0 && (
                          <div className="ew-fchips">
                            {fieldChips(n).map((c, i) => <em key={i}>{c}</em>)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {(hover === n.id || isSel) && !editing && ["l", "r", "t", "b"].map((side) => {
                    const a = anchor({ x: 0, y: 0, w: r.w, h: r.h }, side);
                    return (
                      <span key={side} className="ew-port" style={{ left: a.x, top: a.y }}
                            onPointerDown={(e) => startConnect(e, n.id)} />
                    );
                  })}
                  {isSel && selNodeIds.length === 1 && !editing && (
                    <span className="ew-grip" onPointerDown={(e) => startResize(e, n.id)} />
                  )}
                </div>
              );
            })}

            {marquee && (
              <div className="ew-marquee" style={{
                left: Math.min(marquee.x0, marquee.x1), top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0) }} />
            )}
          </div>
        </div>

        {/* docked inspector */}
        {sel && (() => {
          /* --- edge --- */
          if (sel.kind === "edge") {
            const ed = edges.find((x) => x.id === sel.id);
            if (!ed) return null;
            const a = nodeById[ed.s], z = nodeById[ed.e];
            const nm = (x) => (x ? x.title || TYPES[x.type].label : "?");
            return (
              <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
                <div className="ew-ihead">
                  <span className="ew-idot" style={{ background: a ? stages[stageKeyOf(a)] : stages.ops }} />
                  <div className="ew-ititle"><b>Connection</b><small>{nm(a)} → {nm(z)}</small></div>
                  <button className="ew-x" onClick={() => setSel(null)}>×</button>
                </div>
                <div className="ew-iscroll">
                  <section>
                    <div className="ew-frow"><span className="ew-flabel">Label</span>
                      <input value={ed.lbl || ""} placeholder="e.g. logs & metrics"
                             onChange={(e) => {
                               snapGuard("elbl:" + ed.id);
                               setEdges((es) => es.map((x) => (x.id === ed.id ? { ...x, lbl: e.target.value || undefined } : x)));
                             }} /></div>
                    <div className="ew-btnrow">
                      <button className="ew-btn" onClick={() => {
                        snapshot();
                        setEdges((es) => es.map((x) => (x.id === ed.id ? { ...x, s: ed.e, e: ed.s } : x)));
                      }}>⇄ Reverse direction</button>
                      <button className="ew-btn danger" onClick={() => {
                        snapshot();
                        setEdges((es) => es.filter((x) => x.id !== ed.id));
                        setSel(null);
                      }}>Delete connection</button>
                    </div>
                  </section>
                </div>
              </div>
            );
          }
          /* --- zone --- */
          if (sel.kind === "zone") {
            const z = zones.find((x) => x.id === sel.id);
            if (!z) return null;
            const setZ = (patch) => {
              snapGuard("z:" + z.id);
              setZones((zs) => zs.map((m) => (m.id === z.id ? { ...m, ...patch } : m)));
            };
            return (
              <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
                <div className="ew-ihead">
                  <span className="ew-idot" style={{ background: z.color }} />
                  <div className="ew-ititle"><b>{z.label}</b><small>Zone</small></div>
                  <button className="ew-x" onClick={() => setSel(null)}>×</button>
                </div>
                <div className="ew-iscroll">
                  <section>
                    <div className="ew-frow"><span className="ew-flabel">Label</span>
                      <input value={z.label} onChange={(e) => setZ({ label: e.target.value })} /></div>
                    <div className="ew-frow"><span className="ew-flabel">Color</span>
                      <input type="color" value={z.color} onChange={(e) => setZ({ color: e.target.value })} /></div>
                    <div className="ew-frow"><span className="ew-flabel">Size</span>
                      <div className="ew-size">
                        <input type="number" min="160" max="2400" step="8" value={z.w}
                               onChange={(e) => setZ({ w: Math.max(160, Math.min(2400, +e.target.value || z.w)) })} />
                        <i>×</i>
                        <input type="number" min="120" max="1600" step="8" value={z.h}
                               onChange={(e) => setZ({ h: Math.max(120, Math.min(1600, +e.target.value || z.h)) })} />
                      </div></div>
                  </section>
                  <section>
                    <button className="ew-btn danger" onClick={deleteSel}>Delete zone</button>
                  </section>
                </div>
              </div>
            );
          }
          /* --- multiple nodes --- */
          if (sel.ids.length > 1) {
            return (
              <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
                <div className="ew-ihead">
                  <span className="ew-idot" style={{ background: "#8A9BB4" }} />
                  <div className="ew-ititle"><b>{sel.ids.length} nodes selected</b><small>drag any to move all</small></div>
                  <button className="ew-x" onClick={() => setSel(null)}>×</button>
                </div>
                <div className="ew-iscroll">
                  <section>
                    <div className="ew-btnrow">
                      <button className="ew-btn" disabled={!styleClip} onClick={() => applyStyle(sel.ids)}
                              title="Apply the copied style to all selected (⌘⇧V)">
                        Paste style to {sel.ids.length}
                        {styleClip && <span className="ew-swatch" style={{ background: styleClip.color || "var(--muted)" }} />}
                      </button>
                    </div>
                    <div className="ew-btnrow">
                      <button className="ew-btn" onClick={duplicateSel}>Duplicate (⌘D)</button>
                      <button className="ew-btn danger" onClick={deleteSel}>Delete all</button>
                    </div>
                  </section>
                </div>
              </div>
            );
          }
          /* --- single node --- */
          const n = nodeById[sel.ids[0]];
          if (!n) return null;
          const t = TYPES[n.type];
          const r = rectOf(n);
          const set = (patch) => {
            snapGuard("n:" + n.id);
            setNodes((ns) => ns.map((m) => (m.id === n.id ? { ...m, ...patch } : m)));
          };
          const overridden = n.w != null || n.h != null || n.color || n.sub !== undefined;
          return (
            <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
              <div className="ew-ihead">
                <span className="ew-idot" style={{ background: nodeTag(n, stages) }} />
                <div className="ew-ititle"><b>{n.title || t.label}</b><small>{t.label} · {t.cat}</small></div>
                <button className="ew-x" onClick={() => setSel(null)}>×</button>
              </div>
              <div className="ew-iscroll">
                <section>
                  <h5>Identity</h5>
                  <div className="ew-frow"><span className="ew-flabel">Name</span>
                    <input value={n.title || ""} placeholder={t.label}
                           onChange={(e) => set({ title: e.target.value })} /></div>
                  <div className="ew-frow"><span className="ew-flabel">Subtitle</span>
                    <input value={n.sub !== undefined ? n.sub : t.sub} placeholder={t.sub}
                           onChange={(e) => set({ sub: e.target.value })} /></div>
                  <div className="ew-frow"><span className="ew-flabel">Logo</span>
                    <input value={n.logo && !String(n.logo).startsWith("data:") ? n.logo : ""}
                           placeholder={n.logo ? "(uploaded image)" : "https://…"}
                           onChange={(e) => set({ logo: e.target.value || undefined })} /></div>
                  <div className="ew-frow"><span className="ew-flabel" />
                    <div className="ew-btnrow">
                      <label className="ew-btn">Upload…
                        <input type="file" accept="image/*" onChange={(e) => {
                          const f = e.target.files && e.target.files[0];
                          if (!f) return;
                          const rd = new FileReader();
                          rd.onload = () => set({ logo: rd.result });
                          rd.readAsDataURL(f);
                          e.target.value = "";
                        }} />
                      </label>
                      {n.logo && <button className="ew-btn danger" onClick={() => set({ logo: undefined })}>Remove</button>}
                    </div></div>
                </section>
                <section>
                  <h5>Layout</h5>
                  <div className="ew-frow"><span className="ew-flabel">Size</span>
                    <div className="ew-size">
                      <input type="number" min="96" max="640" step="8" value={r.w}
                             onChange={(e) => set({ w: Math.max(96, Math.min(640, +e.target.value || r.w)) })} />
                      <i>×</i>
                      <input type="number" min="48" max="420" step="8" value={r.h}
                             onChange={(e) => set({ h: Math.max(48, Math.min(420, +e.target.value || r.h)) })} />
                    </div></div>
                  <div className="ew-frow"><span className="ew-flabel">Accent</span>
                    <div className="ew-btnrow">
                      <input type="color" value={nodeTag(n, stages)} onChange={(e) => set({ color: e.target.value })} />
                      {overridden && <button className="ew-btn"
                        onClick={() => set({ w: undefined, h: undefined, color: undefined, sub: undefined })}>Reset style</button>}
                    </div></div>
                  <div className="ew-frow"><span className="ew-flabel">Style</span>
                    <div className="ew-btnrow">
                      <button className="ew-btn" onClick={() => copyStyle(n)} title="Copy accent & size (⌘⇧C)">Copy style</button>
                      <button className="ew-btn" disabled={!styleClip} onClick={() => applyStyle([n.id])}
                              title="Apply the copied style (⌘⇧V)">
                        Paste style
                        {styleClip && <span className="ew-swatch" style={{ background: styleClip.color || "var(--muted)" }} />}
                      </button>
                    </div></div>
                </section>
                {t.fields && t.fields.length > 0 && (
                  <section>
                    <h5>Settings</h5>
                    {t.fields.map((f) => {
                      const v = n.props && n.props[f.key] !== undefined ? n.props[f.key]
                              : (f.def !== undefined ? f.def : "");
                      const setP = (val) => set({ props: { ...(n.props || {}), [f.key]: val } });
                      let ctrl;
                      if (f.kind === "select") ctrl = (
                        <select value={v} onChange={(e) => setP(e.target.value)}>
                          {v === "" && <option value="">—</option>}
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>);
                      else if (f.kind === "toggle") ctrl = (
                        <input type="checkbox" checked={!!v} onChange={(e) => setP(e.target.checked)} />);
                      else if (f.kind === "number") ctrl = (
                        <input type="number" min={f.min} max={f.max} value={v}
                               onChange={(e) => setP(e.target.value === "" ? "" : +e.target.value)} />);
                      else ctrl = (
                        <input value={v} placeholder={f.placeholder || ""}
                               onChange={(e) => setP(e.target.value)} />);
                      return (
                        <div className="ew-frow" key={f.key}>
                          <span className="ew-flabel">{f.label}</span>{ctrl}
                        </div>
                      );
                    })}
                  </section>
                )}
                <section>
                  <div className="ew-btnrow">
                    <button className="ew-btn" onClick={duplicateSel}>Duplicate (⌘D)</button>
                    <button className="ew-btn danger" onClick={deleteSel}>Delete node</button>
                  </div>
                </section>
              </div>
            </div>
          );
        })()}
      </div>

      {/* palette drag ghost */}
      {ghost && (
        <div className="ew-ghost" style={{ left: ghost.cx, top: ghost.cy, "--tag": tagOf(TYPES[ghost.type], stages) }}>
          {TYPES[ghost.type].label}
        </div>
      )}
    </div>
  );
}

function PaletteItem({ k, t, start, stages }) {
  /* label only in the dock — the subtitle appears once on the canvas */
  return (
    <div className="ew-pitem" style={{ "--tag": tagOf(t, stages) }} title={t.sub}
         onPointerDown={(e) => start(e, k)}>
      <b>{t.label}</b>
    </div>
  );
}

const CSS = `
.ew-root{
  --bg:#0C1530; --panel:#16213F; --panel2:#0F1A38; --line:#2A3556;
  --ink:#E8EDF4; --muted:#94A3C4; --faint:#5E6C90; --accent:#48EFCF;
  --display:"Mier B","Inter",system-ui,sans-serif;
  --body:"Inter",system-ui,sans-serif;
  --mono:"Space Mono",ui-monospace,monospace;
  display:flex; flex-direction:column; min-height:560px; max-height:100vh;
  background:var(--bg); color:var(--ink); font-family:var(--body);
  overflow:hidden;
}
.ew-toolbar{ display:flex; align-items:center; gap:8px; padding:10px 14px;
  border-bottom:1px solid var(--line); background:var(--panel2); flex:none; flex-wrap:wrap; }
.ew-title{ font-family:var(--display); font-weight:700; font-size:20px; margin-right:8px; }
.ew-toolbar button{ background:var(--panel); color:var(--ink); border:1px solid var(--line);
  border-radius:7px; padding:5px 12px; font-family:var(--mono); font-size:12px; cursor:pointer; }
.ew-toolbar button:hover:not(:disabled){ border-color:var(--accent); }
.ew-toolbar button:disabled{ opacity:.35; cursor:default; }
.ew-gap{ width:10px; }
.ew-zoom{ font-family:var(--mono); font-size:12px; color:var(--muted); min-width:44px; text-align:center; }
.ew-totals{ font-family:var(--mono); font-size:11.5px; color:var(--accent); margin-left:6px; }
.ew-hint{ margin-left:auto; font-family:var(--mono); font-size:10.5px; color:var(--faint); }
.ew-body{ display:flex; flex:1; min-height:0; }
/* Themed scrollbars for the dock panels (palette + inspector). */
.ew-palette, .ew-iscroll{ scrollbar-width:thin; scrollbar-color:var(--line) transparent; }
.ew-palette::-webkit-scrollbar, .ew-iscroll::-webkit-scrollbar{ width:10px; height:10px; }
.ew-palette::-webkit-scrollbar-track, .ew-iscroll::-webkit-scrollbar-track{ background:transparent; }
.ew-palette::-webkit-scrollbar-thumb, .ew-iscroll::-webkit-scrollbar-thumb{
  background:var(--line); border-radius:99px; border:2px solid transparent; background-clip:padding-box; }
.ew-palette::-webkit-scrollbar-thumb:hover, .ew-iscroll::-webkit-scrollbar-thumb:hover{
  background:var(--accent); background-clip:padding-box; }
.ew-palette{ width:264px; flex:none; overflow-y:auto; padding:10px;
  border-right:1px solid var(--line); background:var(--panel2); display:grid; gap:8px; align-content:start; }
.ew-search{ width:100%; box-sizing:border-box; background:var(--panel); color:var(--ink);
  border:1px solid var(--line); border-radius:7px; padding:6px 9px; font-family:var(--mono);
  font-size:12px; margin-bottom:2px; }
.ew-search:focus{ outline:none; border-color:var(--accent); }
.ew-collapseall{ background:none; border:none; color:var(--faint); font-family:var(--mono);
  font-size:10px; letter-spacing:.08em; text-transform:uppercase; cursor:pointer;
  text-align:left; padding:0 2px; }
.ew-collapseall:hover{ color:var(--muted); }
.ew-cat{ border:none; }
.ew-cat summary{ cursor:pointer; font-family:var(--mono); font-size:10.5px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--faint); padding:6px 2px 4px; user-select:none; }
.ew-cat summary:hover{ color:var(--muted); }
.ew-cat[open] summary{ color:var(--muted); }
.ew-cat > .ew-pitem{ margin:0 0 6px; }
.ew-pitem{ border:1px solid var(--line); border-left:3px solid var(--tag); border-radius:8px;
  background:var(--panel); padding:7px 10px; cursor:grab; user-select:none; }
.ew-pitem b{ display:block; font-family:var(--display); font-weight:500; font-size:13px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ew-pitem:hover{ border-color:var(--tag); }
.ew-viewport{ position:relative; flex:1; overflow:hidden; cursor:grab; touch-action:none;
  background-image:radial-gradient(circle, #1b2330 1px, transparent 1px);
  background-size:24px 24px; }
.ew-viewport:active{ cursor:grabbing; }
.ew-world{ position:absolute; left:0; top:0; transform-origin:0 0; }
.ew-wires{ position:absolute; left:0; top:0; overflow:visible; pointer-events:none; }
.ew-edge{ fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;
  opacity:.9; transition:opacity .2s, stroke-width .2s; pointer-events:none; }
.ew-dash{ stroke-dasharray:5 6; }
.ew-edge.dim{ opacity:.15; } .ew-edge.on{ opacity:1; stroke-width:2.6; }
.ew-hit{ fill:none; stroke:transparent; stroke-width:14; pointer-events:stroke; cursor:pointer; }
.ew-particle{ pointer-events:none; transition:opacity .2s; }
.ew-particle.dim{ opacity:.1; }
.ew-elbl{ font-family:var(--mono); font-size:11px; fill:var(--muted); pointer-events:none;
  paint-order:stroke; stroke:#0C1530; stroke-width:4px; stroke-linejoin:round; transition:opacity .2s; }
.ew-elbl.dim{ opacity:.1; } .ew-elbl.on{ fill:var(--ink); }
.ew-temp{ fill:none; stroke:var(--ink); stroke-width:1.6; stroke-dasharray:4 5; pointer-events:none; }
.ew-zone{ position:absolute; border:1.5px dashed var(--zc); border-radius:14px;
  background:color-mix(in srgb, var(--zc) 4%, transparent); pointer-events:none; }
.ew-zone.sel{ border-style:solid; }
.ew-zlabel{ position:absolute; top:-12px; left:14px; pointer-events:auto; cursor:grab; z-index:4;
  background:var(--bg); border:1px solid var(--zc); color:var(--zc); border-radius:99px;
  padding:2px 12px; font-family:var(--mono); font-size:10.5px; letter-spacing:.12em;
  text-transform:uppercase; user-select:none; white-space:nowrap; }
.ew-zgrip{ position:absolute; right:-7px; bottom:-7px; width:14px; height:14px; border-radius:3px;
  background:var(--panel2); border:2px solid var(--zc); cursor:nwse-resize; pointer-events:auto; z-index:4; }
.ew-marquee{ position:absolute; border:1px dashed #4C8DFF; background:rgba(76,141,255,.08);
  pointer-events:none; }
.ew-node{ position:absolute; border:1px solid var(--line); border-radius:10px;
  background:var(--panel); padding:10px 12px; cursor:grab; user-select:none;
  box-shadow:0 2px 10px rgba(0,0,0,.35); transition:opacity .2s, border-color .15s; }
.ew-node::before{ content:""; position:absolute; left:-1px; top:9px; bottom:9px; width:3px;
  border-radius:3px; background:var(--tag); }
.ew-node b{ display:block; font-family:var(--display); font-weight:500; font-size:14.5px; }
.ew-node span{ font-size:11px; color:var(--muted); }
.ew-node.sel{ border-color:var(--tag); box-shadow:0 0 0 2px color-mix(in srgb, var(--tag) 35%, transparent), 0 2px 10px rgba(0,0,0,.35); }
.ew-node.dim{ opacity:.2; }
.ew-node input{ width:100%; background:var(--panel2); color:var(--ink); border:1px solid var(--tag);
  border-radius:6px; padding:4px 6px; font-family:var(--display); font-size:13.5px; }
.ew-nbody{ display:flex; align-items:center; gap:9px; min-width:0; }
.ew-nbody img{ width:24px; height:24px; object-fit:contain; border-radius:5px; flex:none; }
.ew-nbody > div{ min-width:0; }
.ew-fchips{ display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
.ew-fchips em{ font-style:normal; font-family:var(--mono); font-size:9.5px; color:var(--muted);
  border:1px solid var(--line); background:var(--panel2); border-radius:99px; padding:1px 7px;
  white-space:nowrap; }
.ew-port{ position:absolute; width:11px; height:11px; margin:-5.5px; border-radius:99px;
  background:var(--bg); border:2px solid var(--tag); cursor:crosshair; z-index:3; }
.ew-port:hover{ background:var(--tag); }
.ew-grip{ position:absolute; right:-6px; bottom:-6px; width:13px; height:13px; z-index:3;
  border-radius:3px; background:var(--panel2); border:2px solid var(--tag); cursor:nwse-resize; }
.ew-grip:hover{ background:var(--tag); }
.ew-inspector{ width:340px; flex:none; border-left:1px solid var(--line);
  background:var(--panel2); display:flex; flex-direction:column; min-height:0; }
.ew-ihead{ display:flex; align-items:center; gap:10px; padding:12px 14px;
  border-bottom:1px solid var(--line); flex:none; }
.ew-idot{ width:10px; height:10px; border-radius:99px; flex:none; }
.ew-ititle{ min-width:0; }
.ew-ititle b{ display:block; font-family:var(--display); font-weight:500; font-size:14px;
  line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ew-ititle small{ font-family:var(--mono); font-size:10px; color:var(--faint); }
.ew-x{ margin-left:auto; background:none; border:none; color:var(--muted); font-size:18px;
  line-height:1; cursor:pointer; padding:2px 6px; }
.ew-x:hover{ color:var(--ink); }
.ew-iscroll{ overflow-y:auto; padding:2px 14px 14px; }
.ew-iscroll section{ padding:12px 0; border-bottom:1px solid var(--line); display:grid; gap:9px; }
.ew-iscroll section:last-child{ border-bottom:none; }
.ew-iscroll h5{ margin:0; font-family:var(--mono); font-size:10px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--faint); font-weight:400; }
.ew-frow{ display:grid; grid-template-columns:72px 1fr; align-items:center; gap:8px; }
.ew-flabel{ font-size:11.5px; color:var(--muted); }
.ew-frow input:not([type=checkbox]):not([type=color]):not([type=file]), .ew-frow select{
  background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:6px;
  padding:5px 8px; font-size:12.5px; font-family:var(--body); width:100%; box-sizing:border-box; min-width:0; }
.ew-frow input:focus, .ew-frow select:focus{ outline:none; border-color:var(--accent); }
.ew-frow input[type=number]{ font-family:var(--mono); font-size:12px; }
.ew-frow input[type=checkbox]{ accent-color:var(--accent); width:15px; height:15px; justify-self:start; }
.ew-frow input[type=color]{ width:42px; height:26px; padding:1px; background:var(--panel);
  border:1px solid var(--line); border-radius:6px; cursor:pointer; }
.ew-size{ display:flex; align-items:center; gap:6px; }
.ew-size input{ width:64px !important; }
.ew-size i{ color:var(--faint); font-style:normal; }
.ew-btnrow{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.ew-btn{ background:var(--panel); color:var(--muted); border:1px solid var(--line); border-radius:6px;
  padding:5px 10px; font-family:var(--mono); font-size:11px; cursor:pointer; display:inline-block; }
.ew-btn:hover:not(:disabled){ border-color:var(--accent); color:var(--ink); }
.ew-btn.danger:hover:not(:disabled){ border-color:#F04E98; color:#F04E98; }
.ew-btn:disabled{ opacity:.4; cursor:default; }
.ew-btn input[type=file]{ display:none; }
.ew-swatch{ display:inline-block; width:9px; height:9px; border-radius:2px; margin-left:6px;
  vertical-align:middle; border:1px solid color-mix(in srgb, var(--ink) 25%, transparent); }
.ew-ghost{ position:fixed; z-index:99; pointer-events:none; transform:translate(-50%,-50%);
  background:var(--panel); border:1px solid var(--tag); border-left:3px solid var(--tag);
  border-radius:8px; padding:8px 14px; font-family:"Mier B","Inter",sans-serif; font-size:13px;
  color:var(--ink); box-shadow:0 8px 24px rgba(0,0,0,.5); opacity:.92; }
@media (prefers-reduced-motion: reduce){ .ew-particle{ display:none; } }

/* ---- light theme overrides (follows the app's light/dark toggle) ---- */
.ew-light{
  --bg:#F5F7FA; --panel:#FFFFFF; --panel2:#EEF2F7; --line:#D6DEEA;
  --ink:#1C1E23; --muted:#5B6472; --faint:#98A4B8; --accent:#0B64DD;
}
.ew-light .ew-viewport{ background-image:radial-gradient(circle, #d3dcea 1px, transparent 1px); }
.ew-light .ew-node{ box-shadow:0 1px 3px rgba(16,28,63,.10), 0 1px 2px rgba(16,28,63,.06); }
.ew-light .ew-ghost{ box-shadow:0 10px 26px rgba(16,28,63,.18); }
`;
