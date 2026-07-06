/* ============================================================
   whiteboardTemplates
   Deterministic reference-architecture templates for the Elastic Whiteboard.

   A template is a canonical, pre-arranged block: its node positions are FIXED
   (computed from the fill, never from a layout algorithm), it carries its own
   internal edges, and it draws a zone box around its members. Templates own all
   layout — the AI (or the user) only chooses which templates exist and what
   goes in their slots.

   Each builder returns local coordinates (origin 0,0); instantiateTemplate
   offsets them to a placement origin and assigns stable ids. placeSections
   arranges multiple templates in a fixed lane order (collect -> ... -> serve).
   ============================================================ */

import { TYPES } from "./whiteboardTypes";

const dim = (type) => ({ w: TYPES[type]?.w || 180, h: TYPES[type]?.h || 72 });
const stageOf = (type) => TYPES[type]?.flow || TYPES[type]?.stage || "ops";

/* Fixed left-to-right lane per functional stage (used to place whole sections). */
const STAGE_LANE = { collect: 0, process: 1, store: 2, serve: 3, ops: 4 };

const COL_GAP = 60;           // gap between the two columns of a data zone
const ROW_GAP = 26;           // vertical gap between stacked nodes

/* ---------- builders (local coords, origin 0,0) ---------- */

/* Elastic Production Cluster: tiers Hot->Warm->Cold->Frozen stacked with ILM
   flow; Ingest alone in a left column; Coordinating -> ML -> Master stacked in a
   right column (closest to Kibana); optional Object Storage below (outside the
   zone). */
function clusterTemplate(fill = {}) {
  const tierKey = { hot: "tier_hot", warm: "tier_warm", cold: "tier_cold", frozen: "tier_frozen" };
  const order = ["hot", "warm", "cold", "frozen"].filter((t) =>
    fill.tiers && fill.tiers.length ? fill.tiers.includes(t) : true);
  const wantIngest = fill.ingest !== false;
  const wantCoord = fill.coord !== false;
  const wantMaster = fill.master !== false;
  const wantML = !!fill.ml;

  // Fixed geometry tuned so the zone is 968x696 with all three columns, 656
  // wide with two, and 344 wide with tiers only (see zonePad below).
  const CG = 64;                         // gap between columns
  const RG = 64;                         // gap between stacked rows
  const nodes = [], edges = [];
  const colTw = Math.max(248, ...order.map((t) => dim(tierKey[t]).w));
  const rowPitch = dim("tier_hot").h + RG;   // 96 + 64 = 160
  const leftW = wantIngest ? dim("node_ingest").w : 0;   // left column holds Ingest only
  const tierX = wantIngest ? leftW + CG : 0;

  let y = 0;
  for (const t of order) {
    const d = dim(tierKey[t]);
    nodes.push({ key: t, type: tierKey[t], x: tierX + (colTw - d.w) / 2, y });
    y += d.h + RG;
  }
  const hotY = 0;
  for (let i = 0; i < order.length - 1; i++) edges.push({ from: order[i], to: order[i + 1], lbl: "ILM" });

  // left column: Ingest feeds Hot; sits on the second row (aligned with Warm)
  if (wantIngest) {
    const d = dim("node_ingest");
    nodes.push({ key: "ingest", type: "node_ingest", x: (leftW - d.w) / 2, y: hotY + rowPitch });
    edges.push({ from: "ingest", to: order[0] });
  }

  // right column (closest to Kibana): Coordinating -> ML -> Master, stacked
  const rightX = tierX + colTw + CG;
  if (wantCoord || wantML || wantMaster) {
    let ry = hotY;
    if (wantCoord) {
      nodes.push({ key: "coord", type: "node_coord", x: rightX, y: ry });
      edges.push({ from: "coord", to: order[0] });
      if (order.includes("warm")) edges.push({ from: "coord", to: "warm" });
      ry += rowPitch;
    }
    if (wantML) {
      nodes.push({ key: "ml", type: "node_ml", x: rightX, y: ry });
      // tiers feed the ML node (data flows into ML for inference)
      for (const t of ["hot", "warm", "cold"]) if (order.includes(t)) edges.push({ from: t, to: "ml" });
      ry += rowPitch;
    }
    if (wantMaster) {
      nodes.push({ key: "master", type: "node_master", x: rightX, y: ry });
      // the elected master publishes cluster state to, and coordinates with,
      // every other node type (data tiers, ingest, coordinating, ML) — bidirectional
      const targets = [...order,
        ...(wantIngest ? ["ingest"] : []),
        ...(wantCoord ? ["coord"] : []),
        ...(wantML ? ["ml"] : [])];
      // Hot is two rows up, so its auto-route would cut across under the other
      // nodes; steer it up the whitespace gutter between the tier and right
      // columns instead (all other master edges route cleanly on their own).
      const gutterX = tierX + colTw + CG / 2;
      const masterCY = ry + dim("node_master").h / 2;
      for (const t of targets) {
        const edge = { from: "master", to: t, bi: true };
        if (t === "hot") edge.pts = [{ x: gutterX, y: masterCY }, { x: gutterX, y: hotY + dim("tier_hot").h / 2 }];
        edges.push(edge);
      }
    }
  }

  if (fill.objectStorage && order.includes("frozen")) {
    const fz = nodes.find((n) => n.key === "frozen");
    const d = dim("storage");
    nodes.push({ key: "objstore", type: "storage", x: fz.x + (colTw - d.w) / 2, y: y + 40, outsideZone: true });
    edges.push({ from: "frozen", to: "objstore", lbl: "snapshots" });
  }
  return { label: fill.label || "Elastic Production Cluster", color: "#FEC514", nodes, edges,
           zonePad: { x: 48, top: 64, bottom: 56 } };
}

/* One stacked column of nodes; returns { nodes, width, height }. */
function stackColumn(items, x0, keyPrefix) {
  const w = Math.max(0, ...items.map((it) => dim(it.type).w));
  const nodes = [];
  let y = 0;
  items.forEach((it, i) => {
    const d = dim(it.type);
    nodes.push({ key: `${keyPrefix}${i}`, type: it.type, x: x0 + (w - d.w) / 2, y, ...(it.title ? { title: it.title } : {}) });
    y += d.h + ROW_GAP;
  });
  return { nodes, width: w, height: Math.max(0, y - ROW_GAP) };
}

const asItems = (arr, fallbackType) =>
  (arr || []).map((it) => (typeof it === "string"
    ? (TYPES[it] ? { type: it } : { type: fallbackType, title: it })
    : { type: it.type || fallbackType, title: it.title }));

/* Data Zone: data sources stacked in a left column, collectors/shippers stacked
   in a right column; each source fans into the first collector. */
function dataZoneTemplate(fill = {}) {
  const sources = asItems(fill.sources, "source");
  const collectors = asItems(fill.collectors, "agent");
  const left = stackColumn(sources, 0, "src");
  const rightX = left.width + COL_GAP;
  const right = stackColumn(collectors, rightX, "col");
  const nodes = [...left.nodes, ...right.nodes];
  const edges = [];
  if (collectors.length) for (let i = 0; i < sources.length; i++) edges.push({ from: `src${i}`, to: "col0" });
  return { label: fill.label || "Data Sources", color: "#4B9FEA", nodes, edges };
}

/* Shared Ingestion Tools: a single centered vertical column. */
function sharedIngestionTemplate(fill = {}) {
  const tools = asItems(fill.tools && fill.tools.length ? fill.tools : ["agent", "logstash", "kafka"], "agent");
  const col = stackColumn(tools, 0, "tool");
  return { label: fill.label || "Shared Ingestion Tools", color: "#19C2B4", nodes: col.nodes, edges: [] };
}

/* Management Components: a single centered vertical column of orchestration /
   management nodes (Fleet, ECK, ECE, ...). */
function managementTemplate(fill = {}) {
  const tools = asItems(fill.tools && fill.tools.length ? fill.tools : ["fleet"], "fleet");
  const col = stackColumn(tools, 0, "mgmt");
  return { label: fill.label || "Management Components", color: "#8A9BB4", nodes: col.nodes, edges: [] };
}

/* User Space: Kibana anchors a column with the IdP stacked above it and
   Third-Party below it; the serving row (Users -> LB -> Kibana) extends to the
   right of Kibana. Without a Kibana consumer it degrades to a plain serving row. */
function userSpaceTemplate(fill = {}) {
  const chosen = (fill.consumers && fill.consumers.length ? fill.consumers : ["kibana", "lb", "users"])
    .filter((t) => TYPES[t]);
  const nodes = [], edges = [];
  const HGAP = 68, VGAP = 72;

  if (!chosen.includes("kibana")) {
    let x = 0;
    for (const type of chosen) { const d = dim(type); nodes.push({ key: type, type, x, y: 0 }); x += d.w + HGAP; }
    for (let i = chosen.length - 1; i > 0; i--) edges.push({ from: chosen[i], to: chosen[i - 1] });
    return { label: fill.label || "User Space", color: "#F45C9C", nodes, edges };
  }

  const kd = dim("kibana");
  const rowPitch = kd.h + VGAP;
  const hasIdp = !!fill.idp;
  const hasThird = chosen.includes("thirdparty");
  const kibY = hasIdp ? rowPitch : 0;   // reserve the top row for the IdP

  nodes.push({ key: "kibana", type: "kibana", x: 0, y: kibY });
  if (hasIdp) {
    const d = dim("idp");
    nodes.push({ key: "idp", type: "idp", x: (kd.w - d.w) / 2, y: kibY - rowPitch });
    edges.push({ from: "kibana", to: "idp" });
  }
  if (hasThird) {
    const d = dim("thirdparty");
    nodes.push({ key: "thirdparty", type: "thirdparty", x: (kd.w - d.w) / 2, y: kibY + rowPitch });
    edges.push({ from: "kibana", to: "thirdparty" });
  }

  // serving row extends right from Kibana; flow reads right-to-left toward it
  const rowTypes = chosen.filter((t) => t !== "kibana" && t !== "thirdparty");
  let x = kd.w + HGAP;
  for (const type of rowTypes) { const d = dim(type); nodes.push({ key: type, type, x, y: kibY }); x += d.w + HGAP; }
  const chain = ["kibana", ...rowTypes];
  for (let i = chain.length - 1; i > 0; i--) edges.push({ from: chain[i], to: chain[i - 1] });

  return { label: fill.label || "User Space", color: "#F45C9C", nodes, edges };
}

/* A single ungrouped node (no zone) for components that don't belong to a
   canonical block (e.g. a lone buffer or firewall between zones). */
function singleTemplate(fill = {}) {
  const type = TYPES[fill.type] ? fill.type : "source";
  return { noZone: true, nodes: [{ key: "n", type, x: 0, y: 0, ...(fill.title ? { title: fill.title } : {}) }], edges: [] };
}

/* `ports` pick the node a cross-section flow should attach to by direction
   (`in` = this section is the target, `out` = this section is the source).
   Each returns a slot key present on the instance, or null to fall back to the
   whole zone. Only clusters and user space attach at node level; sources and
   ingestion stay zone-level so their representative flow reads cleanly. */
export const TEMPLATES = {
  dataZone: { label: "Data Sources", lane: 0, build: dataZoneTemplate },
  sharedIngestion: { label: "Shared Ingestion Tools", lane: 1, build: sharedIngestionTemplate },
  management: { label: "Management Components", lane: 4, build: managementTemplate },
  cluster: {
    label: "Elastic Production Cluster", lane: 2, build: clusterTemplate,
    ports: {
      in: (k) => (k.ingest ? "ingest" : k.coord ? "coord" : null),   // data lands at ingest
      out: (k) => (k.coord ? "coord" : k.hot ? "hot" : null),        // serving leaves via coordinating
    },
  },
  userSpace: {
    label: "User Space", lane: 3, build: userSpaceTemplate,
    ports: { in: (k) => (k.kibana ? "kibana" : null), out: (k) => (k.kibana ? "kibana" : null) },
  },
  single: { label: "Component", lane: (fill) => STAGE_LANE[stageOf(fill.type)] ?? 4, build: singleTemplate },
};

/* Declarative control schema for the Patterns config popover. `checkset` values
   are arrays of catalog type keys (kept in option order for determinism);
   `toggle` values are booleans. These map straight onto the builder fills. */
export const TEMPLATE_CONFIG = {
  dataZone: {
    label: "Data Sources",
    controls: [
      { kind: "checkset", key: "sources", label: "Sources", def: ["source", "syslog", "saas"],
        options: [["source", "Servers / DBs"], ["syslog", "Syslog"], ["cloudsvc", "Cloud Services"], ["saas", "SaaS Apps"], ["k8s", "Kubernetes"]] },
      { kind: "checkset", key: "collectors", label: "Collectors", optional: true, def: ["agent"],
        options: [["agent", "Elastic Agent"], ["logstash", "Logstash"], ["beats", "Beats"], ["otel_collector", "EDOT Collector"], ["connectors", "Connectors / Crawler"]] },
    ],
  },
  sharedIngestion: {
    label: "Ingestion Tools",
    controls: [
      { kind: "checkset", key: "tools", label: "Tools", def: ["agent", "logstash", "kafka"],
        options: [["agent", "Elastic Agent"], ["apm", "APM Server"], ["logstash", "Logstash"], ["streams", "Streams"], ["kafka", "Kafka"], ["otel_collector", "EDOT Collector"]] },
    ],
  },
  management: {
    label: "Management Components",
    controls: [
      { kind: "checkset", key: "tools", label: "Components", def: ["fleet"],
        options: [["fleet", "Fleet Server"], ["eck", "ECK Operator"], ["ece", "ECE"], ["helm", "Helm Charts"], ["monitoring", "Monitoring Cluster"]] },
    ],
  },
  cluster: {
    label: "Elastic Cluster",
    controls: [
      { kind: "checkset", key: "tiers", label: "Data tiers", def: ["hot", "warm", "cold", "frozen"],
        options: [["hot", "Hot"], ["warm", "Warm"], ["cold", "Cold"], ["frozen", "Frozen"]] },
      { kind: "toggle", key: "ingest", label: "Ingest node", def: true },
      { kind: "toggle", key: "coord", label: "Coordinating node", def: true },
      { kind: "toggle", key: "master", label: "Master node", def: true },
      { kind: "toggle", key: "ml", label: "ML node", def: false },
      { kind: "toggle", key: "objectStorage", label: "Object storage", def: false },
    ],
  },
  userSpace: {
    label: "User Space",
    controls: [
      { kind: "checkset", key: "consumers", label: "Consumers", def: ["kibana", "lb", "users"],
        options: [["kibana", "Kibana"], ["lb", "Load Balancer"], ["users", "Users"], ["thirdparty", "Third-Party"]] },
      { kind: "toggle", key: "idp", label: "Identity Provider", def: true },
    ],
  },
};

/* Ordered list of insertable patterns (labels come from the config). */
export const TEMPLATE_MENU = ["dataZone", "sharedIngestion", "cluster", "userSpace", "management"]
  .map((id) => ({ id, label: TEMPLATE_CONFIG[id].label }));

/* Build the default fill object for a template from its control schema. */
export function defaultFill(templateId) {
  const conf = TEMPLATE_CONFIG[templateId];
  if (!conf) return {};
  const fill = {};
  for (const c of conf.controls) fill[c.key] = c.kind === "toggle" ? !!c.def : [...(c.def || [])];
  return fill;
}

/* ---------- placement ---------- */

let SEQ = 1;
const nextSeq = () => SEQ++;

const ZONE_PAD = { x: 30, top: 48, bottom: 30 };
function zoneRect(members, pad = ZONE_PAD) {
  const p = { ...ZONE_PAD, ...(pad || {}) };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const m of members) {
    const d = dim(m.type);
    x0 = Math.min(x0, m.x); y0 = Math.min(y0, m.y);
    x1 = Math.max(x1, m.x + d.w); y1 = Math.max(y1, m.y + d.h);
  }
  if (!isFinite(x0)) return null;
  return { x: x0 - p.x, y: y0 - p.top, w: x1 - x0 + p.x * 2, h: y1 - y0 + p.top + p.bottom };
}

/* Instantiate one template at an origin, returning absolute nodes/edges, a zone
   (unless the template is zone-less), and a key->id map for edge resolution. */
export function instantiateTemplate(templateId, fill = {}, origin = { x: 0, y: 0 }, sectionId) {
  const tpl = TEMPLATES[templateId];
  if (!tpl) return null;
  const built = tpl.build(fill || {});
  const pfx = sectionId || `${templateId}${nextSeq()}`;
  const nid = (key) => `${pfx}__${key}`;
  const nodes = built.nodes.map((n) => ({
    id: nid(n.key), type: n.type, x: origin.x + n.x, y: origin.y + n.y,
    ...(n.title ? { title: n.title } : {}), ...(n.props ? { props: n.props } : {}),
  }));
  const edges = built.edges.map((e, i) => ({
    id: `${pfx}__e${i}`, s: nid(e.from), e: nid(e.to),
    ...(e.lbl ? { lbl: e.lbl } : {}),
    ...(e.bi ? { bi: true } : {}),
    ...(e.pts ? { pts: e.pts.map((p) => ({ x: origin.x + p.x, y: origin.y + p.y })) } : {}),
  }));
  const keys = Object.fromEntries(built.nodes.map((n) => [n.key, nid(n.key)]));

  let zone = null;
  if (!built.noZone) {
    const members = built.nodes.filter((n) => !n.outsideZone).map((n) => ({ x: origin.x + n.x, y: origin.y + n.y, type: n.type }));
    const rect = zoneRect(members, built.zonePad);
    if (rect) zone = { id: `${pfx}__zone`, x: rect.x, y: rect.y, w: rect.w, h: rect.h, label: built.label, color: built.color };
  }
  const bbox = (() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodes) { const d = dim(n.type); x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + d.w); y1 = Math.max(y1, n.y + d.h); }
    if (zone) { x0 = Math.min(x0, zone.x); y0 = Math.min(y0, zone.y); x1 = Math.max(x1, zone.x + zone.w); y1 = Math.max(y1, zone.y + zone.h); }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  })();
  return { nodes, edges, zone, keys, prefix: pfx, bbox, templateId };
}

const laneOf = (section) => {
  const tpl = TEMPLATES[section.template];
  if (!tpl) return 4;
  return typeof tpl.lane === "function" ? tpl.lane(section.fill || {}) : tpl.lane;
};

/* Place a list of sections in fixed lane order (left-to-right by stage), each
   lane stacked vertically. Returns combined nodes/edges/zones + a placed map
   (sectionId -> instance) for cross-section edge resolution. */
export function placeSections(sections = []) {
  const byLane = new Map();
  sections.forEach((s, i) => {
    const id = s.id || `${s.template}${i}`;
    const lane = laneOf(s);
    if (!byLane.has(lane)) byLane.set(lane, []);
    byLane.get(lane).push({ ...s, id });
  });
  const lanes = [...byLane.keys()].sort((a, b) => a - b);
  const out = { nodes: [], edges: [], zones: [], placed: {} };
  const LANE_GAP = 150, STACK_GAP = 90, ROW_GAP = 80, TOP = 60;
  let laneX = 60;
  const place = (s, x, y) => {
    const inst = instantiateTemplate(s.template, s.fill, { x, y }, s.id);
    if (!inst) return null;
    out.nodes.push(...inst.nodes);
    out.edges.push(...inst.edges);
    if (inst.zone) out.zones.push(inst.zone);
    out.placed[s.id] = inst;
    return inst;
  };
  for (const lane of lanes) {
    const items = byLane.get(lane);
    // sections flagged `row` (e.g. tenants) sit side-by-side on one line;
    // everything else in the lane stacks vertically below them.
    const rowItems = items.filter((s) => s.row);
    const stackItems = items.filter((s) => !s.row);
    let right = laneX, rowBottom = TOP, rx = laneX;
    for (const s of rowItems) {
      const inst = place(s, rx, TOP);
      if (!inst) continue;
      right = Math.max(right, inst.bbox.x + inst.bbox.w);
      rowBottom = Math.max(rowBottom, inst.bbox.y + inst.bbox.h);
      rx = inst.bbox.x + inst.bbox.w + ROW_GAP;
    }
    let y = rowItems.length ? rowBottom + STACK_GAP : TOP;
    for (const s of stackItems) {
      const inst = place(s, laneX, y);
      if (!inst) continue;
      right = Math.max(right, inst.bbox.x + inst.bbox.w);
      y = inst.bbox.y + inst.bbox.h + STACK_GAP;
    }
    laneX = right + LANE_GAP;
  }
  return out;
}

/* Build a whole board from AI-chosen sections + cross-section edges. Cross edges
   reference a section id (attaches to that section's zone) or "sectionId.key"
   (attaches to a specific node). */
/* Resolve a cross-section edge endpoint to a concrete node or zone id.
   `dir` is "out" when the section is the flow's source, "in" when the target.
   `metaById` maps sectionId -> { template, keys, zoneId }. An explicit
   "sectionId.slot" wins; otherwise the template's semantic port picks a node;
   otherwise it attaches to the whole zone. */
export function sectionEndpoint(ref, dir, metaById) {
  if (ref == null) return null;
  const [sid, key] = String(ref).split(".");
  const meta = metaById[sid] || metaById[ref];
  if (!meta) return null;
  if (key && meta.keys[key]) return meta.keys[key];
  const port = TEMPLATES[meta.template]?.ports?.[dir];
  if (port) { const k = port(meta.keys); if (k && meta.keys[k]) return meta.keys[k]; }
  if (meta.zoneId) return meta.zoneId;
  return Object.values(meta.keys)[0] || null;
}

/* Build a whole board from sections + cross-section flows. Returns the board
   plus `meta` (sectionId -> { template, fill, keys, zoneId }) for incremental
   editing later. */
export function buildFromSections(sections = [], crossEdges = []) {
  const withIds = sections.map((s, i) => ({ ...s, id: s.id || `${s.template}${i}` }));
  const { nodes, edges, zones, placed } = placeSections(withIds);
  const meta = {};
  for (const s of withIds) {
    const inst = placed[s.id];
    if (inst) meta[s.id] = { template: s.template, fill: s.fill || {}, keys: inst.keys, zoneId: inst.zone ? inst.zone.id : null };
  }
  const cross = [];
  (crossEdges || []).forEach((e, i) => {
    const s = sectionEndpoint(e.source, "out", meta), t = sectionEndpoint(e.target, "in", meta);
    if (s && t && s !== t) cross.push({ id: `x${i}_${nextSeq()}`, s, e: t, ...(e.label ? { lbl: e.label } : {}) });
  });
  return { nodes, edges: [...edges, ...cross], zones, meta };
}
