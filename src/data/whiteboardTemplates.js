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
import { nodeAutoHeight } from "../utils/nodeMetrics";

const dim = (type) => ({ w: TYPES[type]?.w || 180, h: TYPES[type]?.h || 72 });
/* Effective footprint of a placed node: type width, content-driven height. */
const edim = (n) => ({ w: n.w != null ? n.w : dim(n.type).w, h: nodeAutoHeight(n) });
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
      /* The tiers sit in another column and mostly on other rows, so their
         auto-routes would cut across the diagram. Run every master<->tier edge
         up one lane in the whitespace gutter between the two columns: a single
         spine with a branch per tier, and no crossings by construction. The
         other master edges (ingest, coordinating, ML) route cleanly on their
         own. `gutterX` is a routing intent, not waypoints — instantiateTemplate
         resolves it once content has grown the nodes to their final size. */
      const gutterX = tierX + colTw + CG / 2;
      for (const t of targets)
        edges.push({ from: "master", to: t, bi: true, ...(order.includes(t) ? { gutterX } : {}) });
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
      // data lands at ingest, else coordinating, else straight on the hot tier
      in: (k) => (k.ingest ? "ingest" : k.coord ? "coord" : k.hot ? "hot" : null),
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
      { kind: "checkset", key: "tiers", label: "Data tiers", def: ["hot", "cold", "frozen"],
        options: [["hot", "Hot"], ["warm", "Warm"], ["cold", "Cold"], ["frozen", "Frozen"]] },
      { kind: "toggle", key: "ingest", label: "Ingest node", def: false },
      { kind: "toggle", key: "coord", label: "Coordinating node", def: false },
      { kind: "toggle", key: "master", label: "Master node", def: false },
      { kind: "toggle", key: "ml", label: "ML node", def: false },
      // Frozen is in the default tier set, and frozen implies object storage.
      { kind: "toggle", key: "objectStorage", label: "Object storage", def: true },
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
    const d = edim(m);
    x0 = Math.min(x0, m.x); y0 = Math.min(y0, m.y);
    x1 = Math.max(x1, m.x + d.w); y1 = Math.max(y1, m.y + d.h);
  }
  if (!isFinite(x0)) return null;
  return { x: x0 - p.x, y: y0 - p.top, w: x1 - x0 + p.x * 2, h: y1 - y0 + p.top + p.bottom };
}

/* Builders position nodes from their static type heights; content (titles,
   props chips) can make them taller. Re-open each vertical stack so every
   node keeps its designed gap below the node above it: for any pair that
   overlaps horizontally, the lower one shifts down by however much the upper
   one (and its own shift) outgrew the original layout. */
function relaxStacks(nodes) {
  const items = nodes
    .map((n) => ({ n, w: edim(n).w, h0: dim(n.type).h, h1: edim(n).h, dy: 0 }))
    .sort((a, b) => a.n.y - b.n.y);
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < i; j++) {
      const above = items[j], b = items[i];
      const xOverlap = above.n.x < b.n.x + b.w && b.n.x < above.n.x + above.w;
      if (!xOverlap) continue;
      const gap0 = b.n.y - (above.n.y + above.h0);
      if (gap0 < 0) continue;                       // side-by-side or overlapping by design
      b.dy = Math.max(b.dy, above.n.y + above.dy + above.h1 + gap0 - b.n.y);
    }
  }
  for (const it of items) if (it.dy > 0) it.n.y += it.dy;
}

/* Instantiate one template at an origin, returning absolute nodes/edges, a zone
   (unless the template is zone-less), and a key->id map for edge resolution.
   `propsByKey` lands node props (counts, hardware…) before layout is final, so
   stacks and the zone box grow around the content they'll actually show. */
export function instantiateTemplate(templateId, fill = {}, origin = { x: 0, y: 0 }, sectionId, propsByKey) {
  const tpl = TEMPLATES[templateId];
  if (!tpl) return null;
  const built = tpl.build(fill || {});
  const pfx = sectionId || `${templateId}${nextSeq()}`;
  const nid = (key) => `${pfx}__${key}`;
  const nodes = built.nodes.map((n) => {
    const props = (n.props || propsByKey?.[n.key])
      ? { ...(n.props || {}), ...(propsByKey?.[n.key] || {}) } : undefined;
    return {
      id: nid(n.key), type: n.type, x: origin.x + n.x, y: origin.y + n.y,
      ...(n.title ? { title: n.title } : {}), ...(props ? { props } : {}),
    };
  });
  relaxStacks(nodes);
  /* An edge's `gutterX` (local) asks for a detour up a vertical lane rather
     than an auto-route. It resolves to waypoints here, after relaxStacks, so
     the lane meets the nodes where they ended up rather than where the builder
     drew them. */
  const placedByKey = new Map(built.nodes.map((n, i) => [n.key, nodes[i]]));
  const midY = (key) => {
    const n = placedByKey.get(key);
    return n ? n.y + edim(n).h / 2 : null;
  };
  const gutterPts = (e) => {
    const from = midY(e.from), to = midY(e.to);
    // level nodes need no detour; waypoints there would only stack drag handles
    if (from == null || to == null || Math.abs(from - to) < 1) return null;
    const x = origin.x + e.gutterX;
    return [{ x, y: from }, { x, y: to }];
  };
  const edges = built.edges.map((e, i) => {
    const pts = e.pts ? e.pts.map((p) => ({ x: origin.x + p.x, y: origin.y + p.y }))
      : e.gutterX != null ? gutterPts(e) : null;
    return {
      id: `${pfx}__e${i}`, s: nid(e.from), e: nid(e.to),
      ...(e.lbl ? { lbl: e.lbl } : {}),
      ...(e.bi ? { bi: true } : {}),
      ...(pts ? { pts } : {}),
    };
  });
  const keys = Object.fromEntries(built.nodes.map((n) => [n.key, nid(n.key)]));

  let zone = null;
  if (!built.noZone) {
    const members = nodes.filter((_, i) => !built.nodes[i].outsideZone);
    const rect = zoneRect(members, built.zonePad);
    if (rect) zone = { id: `${pfx}__zone`, x: rect.x, y: rect.y, w: rect.w, h: rect.h, label: built.label, color: built.color };
  }
  const bbox = (() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodes) { const d = edim(n); x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + d.w); y1 = Math.max(y1, n.y + d.h); }
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
   lane stacked vertically. A section can instead declare `below: <sectionId>`
   to hang off another section rather than take a lane of its own. Returns
   combined nodes/edges/zones + a placed map (sectionId -> instance) for
   cross-section edge resolution. */
export function placeSections(sections = []) {
  const byLane = new Map();
  const ids = new Set(sections.map((s, i) => s.id || `${s.template}${i}`));
  const stacked = [];
  sections.forEach((s, i) => {
    const id = s.id || `${s.template}${i}`;
    // an unresolvable host leaves the section in its own lane
    if (s.below && s.below !== id && ids.has(s.below)) { stacked.push({ ...s, id }); return; }
    const lane = laneOf(s);
    if (!byLane.has(lane)) byLane.set(lane, []);
    byLane.get(lane).push({ ...s, id });
  });
  const lanes = [...byLane.keys()].sort((a, b) => a - b);
  const out = { nodes: [], edges: [], zones: [], placed: {} };
  const LANE_GAP = 150, STACK_GAP = 90, ROW_GAP = 80, TOP = 60, BELOW_GAP = 120;
  let laneX = 60;
  const place = (s, x, y) => {
    const inst = instantiateTemplate(s.template, s.fill, { x, y }, s.id, s.props);
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
  /* Sections pinned below a host land against that host's frame — its zone box,
     or its bounding box when it has none — left-aligned and gapped underneath.
     Templates offset their zone from their origin by their own padding, so the
     origin is derived from where the frame has to end up. */
  for (const s of stacked) {
    const host = out.placed[s.below];
    const probe = host && instantiateTemplate(s.template, s.fill, { x: 0, y: 0 }, s.id, s.props);
    if (!probe) continue;
    const hf = host.zone || host.bbox, sf = probe.zone || probe.bbox;
    place(s, hf.x - sf.x, hf.y + hf.h + BELOW_GAP - sf.y);
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
   plus `meta` (sectionId -> { template, fill, props, keys, zoneId }) for
   incremental editing later. `props` rides along so a re-sent section keeps the
   node counts/hardware it was built with. */
export function buildFromSections(sections = [], crossEdges = []) {
  const withIds = sections.map((s, i) => ({ ...s, id: s.id || `${s.template}${i}` }));
  const { nodes, edges, zones, placed } = placeSections(withIds);
  const meta = {};
  for (const s of withIds) {
    const inst = placed[s.id];
    if (inst) meta[s.id] = { template: s.template, fill: s.fill || {},
      ...(s.props ? { props: s.props } : {}), keys: inst.keys, zoneId: inst.zone ? inst.zone.id : null };
  }
  const cross = [];
  /* `sourceZone` / `targetZone` pin that end of the edge to the section's
     zone box instead of a port node (e.g. stack monitoring watches the whole
     cluster, not one tier). */
  const at = (ref, dir, zoneLevel) => {
    if (zoneLevel) {
      const m = meta[String(ref).split(".")[0]];
      if (m && m.zoneId) return m.zoneId;
    }
    return sectionEndpoint(ref, dir, meta);
  };
  (crossEdges || []).forEach((e, i) => {
    const s = at(e.source, "out", e.sourceZone), t = at(e.target, "in", e.targetZone);
    if (s && t && s !== t) cross.push({ id: `x${i}_${nextSeq()}`, s, e: t, ...(e.label ? { lbl: e.label } : {}) });
  });
  return { nodes, edges: [...edges, ...cross], zones, meta };
}
