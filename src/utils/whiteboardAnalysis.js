/* Board analysis: layout tidying, architecture validation, and capacity
   rollups. All pure functions over the board document so they can be unit
   tested without React or the DOM. */

import { TYPES } from "../data/whiteboardTypes";

const isAnn = (n) => !!(TYPES[n.type] && TYPES[n.type].annotation);
const known = (n) => !!TYPES[n.type];
/* Data flows left to right through these lanes; `flow` overrides the lane a
   type sits in (e.g. a generic Data Source is an ops type that feeds collect). */
export const LANES = ["collect", "process", "store", "serve", "ops"];
export const laneOf = (n) => {
  const t = TYPES[n.type];
  if (!t) return "ops";
  const lane = t.flow || t.stage || "ops";
  return LANES.includes(lane) ? lane : "ops";
};

const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
const prop = (n, key) => (n.props ? n.props[key] : undefined);

/* ---------------- tidy layout ---------------- */

const LANE_GAP = 120;   // horizontal space between lanes
const ROW_GAP = 34;     // vertical space between nodes in a lane
const BLOCK_GAP = 64;   // vertical space between zones / free nodes at the top level
/* Multiples of the grid so wrapped content stays snapped; proportions match
   the template zones (whiteboardTemplates' ZONE_PAD). */
const TIDY_ZONE_PAD = { x: 32, top: 48, bottom: 32 };
const SNAP = 8;
const snap = (v) => Math.round(v / SNAP) * SNAP;

/* Stack pre-sorted { key, lane, w, h } items into left-to-right lane columns,
   each lane vertically centred against the tallest — the shared core of both
   levels of the tidy. Returns { [key]: {x, y} }. */
function stackLanes(items, origin, gap) {
  const byLane = new Map(LANES.map((l) => [l, []]));
  for (const it of items) byLane.get(it.lane).push(it);
  const lanes = LANES.map((l) => byLane.get(l)).filter((list) => list.length);
  const heights = lanes.map((list) =>
    list.reduce((sum, it) => sum + it.h, 0) + gap * (list.length - 1));
  const tallest = Math.max(...heights);

  const out = {};
  let x = origin.x;
  lanes.forEach((list, i) => {
    const width = Math.max(...list.map((it) => it.w));
    let y = origin.y + (tallest - heights[i]) / 2;
    for (const it of list) {
      out[it.key] = { x: snap(x + (width - it.w) / 2), y: snap(y) };
      y += it.h + gap;
    }
    x += width + LANE_GAP;
  });
  return out;
}

/* ---- straighten: alignment nudges, not layout ----
   The user's arrangement is the layout; this only trues it up. Nodes whose
   centres are within a tolerance were meant to share a row (or a column), so
   each such cluster is aligned to its mean centre line. Nothing changes
   order, changes lanes, or moves further than the tolerance. Tolerances stay
   well under one node-plus-gap, so intentionally distinct rows and columns
   can never merge. */
const ALIGN_ROW_TOL = 56;
const ALIGN_COL_TOL = 96;

/* Cluster along one axis by centre, gap-based: a break wherever consecutive
   centres are further apart than the tolerance. Returns { id: alignedCentre }. */
function alignAxis(items, centreOf, tol) {
  const sorted = [...items].sort((a, b) => centreOf(a) - centreOf(b));
  const out = {};
  let cluster = [];
  const flush = () => {
    if (!cluster.length) return;
    const mean = cluster.reduce((sum, n) => sum + centreOf(n), 0) / cluster.length;
    for (const n of cluster) out[n.id] = mean;
    cluster = [];
  };
  for (const n of sorted) {
    if (cluster.length && centreOf(n) - centreOf(cluster[cluster.length - 1]) > tol) flush();
    cluster.push(n);
  }
  flush();
  return out;
}

/* Straighten near-rows and near-columns. Returns patches for what should
   move: { nodes: { [id]: {x, y} }, zones: { [id]: {x, y, w, h} } } — zones
   only grow, and only when an aligned member would otherwise poke out of its
   frame. Annotations stay where the user put them. */
export function alignLayout(nodes, zones, sizeOf) {
  const laid = nodes.filter((n) => known(n) && !isAnn(n));
  if (!laid.length) return { nodes: {}, zones: {} };
  const size = Object.fromEntries(laid.map((n) => [n.id, sizeOf(n)]));
  const cx = (n) => n.x + size[n.id].w / 2;
  const cy = (n) => n.y + size[n.id].h / 2;

  // zone membership by centre, read before anything moves
  const zoneList = Array.isArray(zones) ? zones : [];
  const memberOf = {};
  for (const n of laid)
    for (const z of zoneList)
      if (cx(n) >= z.x && cx(n) <= z.x + z.w && cy(n) >= z.y && cy(n) <= z.y + z.h) memberOf[n.id] = z.id;

  const colCentre = alignAxis(laid, cx, ALIGN_COL_TOL);
  const rowCentre = alignAxis(laid, cy, ALIGN_ROW_TOL);

  const moved = {};
  const rectAfter = {};
  for (const n of laid) {
    const s = size[n.id];
    const x = snap(colCentre[n.id] - s.w / 2);
    const y = snap(rowCentre[n.id] - s.h / 2);
    rectAfter[n.id] = { x, y, w: s.w, h: s.h };
    if (x !== n.x || y !== n.y) moved[n.id] = { x, y };
  }

  // a nudge near a frame edge must not orphan the node outside its zone
  const EDGE = 16;
  const outZones = {};
  for (const z of zoneList) {
    let { x: zx0, y: zy0 } = z;
    let zx1 = z.x + z.w, zy1 = z.y + z.h;
    for (const n of laid) {
      if (memberOf[n.id] !== z.id) continue;
      const r = rectAfter[n.id];
      zx0 = Math.min(zx0, snap(r.x - EDGE));
      zy0 = Math.min(zy0, snap(r.y - EDGE));
      zx1 = Math.max(zx1, snap(r.x + r.w + EDGE));
      zy1 = Math.max(zy1, snap(r.y + r.h + EDGE));
    }
    if (zx0 !== z.x || zy0 !== z.y || zx1 - zx0 !== z.w || zy1 - zy0 !== z.h)
      outZones[z.id] = { x: zx0, y: zy0, w: zx1 - zx0, h: zy1 - zy0 };
  }
  return { nodes: moved, zones: outZones };
}

/* Arrange the board into left-to-right lanes by data-flow stage, in two
   levels. A zone travels as one block: its members are lane-stacked inside
   it, the frame is refitted around them, and the whole thing takes a slot in
   the lane where most of its members flow. Free nodes take their own slots.
   Annotations keep their position — they're commentary, anchored where the
   user put them — and an empty zone frame is the user's business.
   Returns { nodes: { [id]: {x, y} }, zones: { [id]: {x, y, w, h} } }. */
export function tidyLayout(nodes, zones, sizeOf, origin = { x: 80, y: 80 }) {
  const laid = nodes.filter((n) => known(n) && !isAnn(n));
  if (!laid.length) return { nodes: {}, zones: {} };
  const zoneList = Array.isArray(zones) ? zones : [];

  /* Zone membership by node centre — the same rule a zone drag uses. The
     last zone containing the centre wins, matching draw order. */
  const memberOf = {};
  for (const n of laid) {
    const s = sizeOf(n);
    const cx = n.x + s.w / 2, cy = n.y + s.h / 2;
    for (const z of zoneList)
      if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) memberOf[n.id] = z.id;
  }

  // keep current top-to-bottom order at both levels so tidying feels stable
  const stableOrder = (a, b) => a.sortY - b.sortY || a.sortX - b.sortX;

  const blocks = [];
  const innerPos = {};                       // zoneId -> member positions, zone-relative
  for (const z of zoneList) {
    const members = laid.filter((n) => memberOf[n.id] === z.id)
      .map((n) => ({ key: n.id, lane: laneOf(n), sortY: n.y, sortX: n.x, ...sizeOf(n) }))
      .sort(stableOrder);
    if (!members.length) continue;
    const pos = stackLanes(members, { x: 0, y: 0 }, ROW_GAP);
    let w = 0, h = 0;
    for (const m of members) { w = Math.max(w, pos[m.key].x + m.w); h = Math.max(h, pos[m.key].y + m.h); }
    // the zone sits in the lane most of its members flow through (ties go earliest)
    const tally = {};
    for (const m of members) tally[m.lane] = (tally[m.lane] || 0) + 1;
    let lane = "ops", best = 0;
    for (const l of LANES) if ((tally[l] || 0) > best) { best = tally[l]; lane = l; }
    innerPos[z.id] = pos;
    blocks.push({ key: z.id, zone: true, lane, sortY: z.y, sortX: z.x,
                  w: w + TIDY_ZONE_PAD.x * 2, h: h + TIDY_ZONE_PAD.top + TIDY_ZONE_PAD.bottom });
  }
  for (const n of laid) {
    if (memberOf[n.id]) continue;
    blocks.push({ key: n.id, lane: laneOf(n), sortY: n.y, sortX: n.x, ...sizeOf(n) });
  }
  blocks.sort(stableOrder);

  const placed = stackLanes(blocks, origin, BLOCK_GAP);
  const outNodes = {}, outZones = {};
  for (const b of blocks) {
    const p = placed[b.key];
    if (!b.zone) { outNodes[b.key] = p; continue; }
    outZones[b.key] = { ...p, w: b.w, h: b.h };
    for (const [id, ip] of Object.entries(innerPos[b.key]))
      outNodes[id] = { x: p.x + TIDY_ZONE_PAD.x + ip.x, y: p.y + TIDY_ZONE_PAD.top + ip.y };
  }
  return { nodes: outNodes, zones: outZones };
}

/* ---------------- validation ---------------- */

const count = (nodes, type) => nodes.filter((n) => n.type === type).length;
/* A type's node count comes from its `nodes` prop when set, else one box is
   one node. */
const instances = (nodes, type) =>
  nodes.filter((n) => n.type === type).reduce((sum, n) => sum + (num(prop(n, "nodes")) || 1), 0);

/* Best-practice checks an Elastic SA would raise in a design review. Returns
   [{ id, level: 'warn'|'info', title, detail }]. Deliberately advisory: a
   whiteboard is often a sketch, so nothing here blocks anything. */
export function validateBoard(nodes = [], edges = [], zones = []) {
  const real = nodes.filter((n) => known(n) && !isAnn(n));
  const out = [];
  const has = (type) => real.some((n) => n.type === type);
  const add = (id, level, title, detail) => out.push({ id, level, title, detail });

  const dataish = real.some((n) => n.type.startsWith("tier_") || n.type === "es" || n.type === "node_data");
  if (!dataish) return out;                 // not a cluster diagram; stay quiet

  /* Master-eligible nodes, however the board expresses them: a dedicated
     Master Node box, the generic Elasticsearch box's master count, or — the
     common shape in a small cluster — a data node whose roles include
     `master`. Missing that last case would warn about a quorum that exists. */
  const roleMasters = real.filter(
    (n) => n.type !== "node_master" && (prop(n, "roles") || []).includes?.("master"));
  const masters = instances(real, "node_master")
    + real.filter((n) => n.type === "es").reduce((s, n) => s + num(prop(n, "masters")), 0)
    + roleMasters.reduce((s, n) => s + (num(prop(n, "nodes")) || 1), 0);
  if (masters === 0) {
    add("masters-missing", "info", "No master nodes shown",
        "Add master-eligible nodes to make the control plane explicit in the diagram.");
  } else if (masters < 3) {
    add("masters-few", "warn", `Only ${masters} master-eligible node${masters > 1 ? "s" : ""}`,
        "Production clusters need 3 master-eligible nodes to tolerate the loss of one and keep a quorum.");
  } else if (masters % 2 === 0) {
    add("masters-even", "warn", `${masters} master-eligible nodes is an even number`,
        "Use an odd count (3, 5, 7) so a quorum can always be formed after a split.");
  }

  // --- frozen tier needs an object store ---
  if (has("tier_frozen") && !has("storage") && !has("cloud")) {
    add("frozen-no-store", "warn", "Frozen tier without object storage",
        "The frozen tier reads searchable snapshots from S3, Azure Blob, GCS, or MinIO. Add the object store it depends on.");
  }

  // --- tier ordering sanity ---
  if (has("tier_warm") && !has("tier_hot")) {
    add("warm-no-hot", "warn", "Warm tier without a hot tier",
        "Data is indexed into the hot tier first; ILM then rolls it to warm.");
  }
  if ((has("tier_cold") || has("tier_frozen")) && !has("tier_hot")) {
    add("cold-no-hot", "info", "Cold/frozen tiers without a hot tier",
        "Check the lifecycle story — indexing normally lands on hot before ageing down.");
  }

  // --- cross-cluster replication needs a remote ---
  const ccrEdge = edges.some((e) => /ccr|replicat|cross.?cluster/i.test(e.lbl || ""));
  if (ccrEdge && !has("remote")) {
    add("ccr-no-remote", "warn", "Cross-cluster flow without a remote cluster",
        "A connection is labelled as replication or cross-cluster, but no Remote Cluster is on the board.");
  }

  // --- monitoring ---
  if (!has("monitoring")) {
    add("no-monitoring", "info", "No monitoring cluster",
        "Self-managed deployments should ship stack monitoring to a separate cluster so it survives an outage of the production one.");
  }

  // --- single points of failure ---
  const dataNodes = ["tier_hot", "tier_warm", "tier_cold", "tier_frozen", "node_data"]
    .reduce((s, t) => s + instances(real, t), 0);
  if (dataNodes === 1) {
    add("single-data-node", "warn", "Single data node",
        "One data node means no replica shards and no fault tolerance. Set node counts on the tiers to show the real topology.");
  }

  // --- Kibana / entry point ---
  if (!has("kibana") && !has("observability") && !has("security")) {
    add("no-kibana", "info", "No Kibana or solution UI",
        "Show how users reach the cluster — most designs need an entry point.");
  }
  if (count(real, "kibana") > 1 && !has("lb")) {
    add("kibana-no-lb", "info", "Multiple Kibana instances without a load balancer",
        "Put a load balancer in front so the diagram shows a single entry point.");
  }

  // --- orphans ---
  const linked = new Set();
  for (const e of edges) { linked.add(e.s); linked.add(e.e); }
  /* Edges may attach to a zone rather than a node; everything sitting inside
     a connected zone shares its flow, so none of it is an orphan. */
  const linkedZones = zones.filter((z) => linked.has(z.id));
  const inLinkedZone = (n) => linkedZones.some((z) =>
    n.x >= z.x && n.x <= z.x + z.w && n.y >= z.y && n.y <= z.y + z.h);
  const orphans = real.filter((n) => !linked.has(n.id) && !inLinkedZone(n));
  if (orphans.length && real.length > 2) {
    add("orphans", "info", `${orphans.length} unconnected component${orphans.length > 1 ? "s" : ""}`,
        `Nothing flows in or out of: ${orphans.slice(0, 4).map((n) => n.title || TYPES[n.type].label).join(", ")}${orphans.length > 4 ? "…" : ""}.`);
  }

  return out;
}

/* ---------------- capacity ---------------- */

const TIERS = [
  { type: "tier_hot",    label: "Hot" },
  { type: "tier_warm",   label: "Warm" },
  { type: "tier_cold",   label: "Cold" },
  { type: "tier_frozen", label: "Frozen" },
];

/* Parse a free-text capacity like "40 TB", "1.5PB", "900gb" into TB. Bare
   numbers are read as TB, which is how people write them on a whiteboard. */
export function parseCapacityTB(text) {
  if (typeof text === "number") return isFinite(text) ? text : 0;
  const m = String(text || "").trim().match(/^([\d.]+)\s*(pb|tb|gb|mb)?$/i);
  if (!m) return 0;
  const value = parseFloat(m[1]);
  if (!isFinite(value)) return 0;
  const unit = (m[2] || "tb").toLowerCase();
  return value * ({ pb: 1024, tb: 1, gb: 1 / 1024, mb: 1 / (1024 * 1024) })[unit];
}

/* Sum node counts, hardware, and per-tier storage across the board. Capacity
   is per node, so a tier's storage is capacity x node count. */
export function capacityTotals(nodes = []) {
  const real = nodes.filter((n) => known(n) && !isAnn(n));
  const totals = { count: 0, cpu: 0, mem: 0, storageTB: 0, logstashMem: 0, tiers: [] };

  for (const n of real) {
    const mult = num(prop(n, "nodes")) || 0;
    if (mult) totals.count += mult;
    const each = mult || 1;
    totals.cpu += num(prop(n, "cpu")) * each;
    const mem = num(prop(n, "mem")) * each;
    totals.mem += mem;
    /* Kept out of the licensed rollup: Elastic counts Logstash memory for
       information only, so a quote shouldn't bill resource units for it. */
    if (n.type === "logstash") totals.logstashMem += mem;
  }

  for (const { type, label } of TIERS) {
    const tierNodes = real.filter((n) => n.type === type);
    if (!tierNodes.length) continue;
    let count = 0, storageTB = 0, mem = 0;
    for (const n of tierNodes) {
      const nodeCount = num(prop(n, "nodes")) || 1;
      count += nodeCount;
      storageTB += parseCapacityTB(prop(n, "capacity")) * nodeCount;
      mem += num(prop(n, "mem")) * nodeCount;
    }
    totals.tiers.push({ type, label, count, storageTB, mem });
    totals.storageTB += storageTB;
  }

  return totals;
}

/* Round to a sane number of decimals for display (TB values are often < 1). */
const trim = (v) => v.replace(/\.0$/, "");
export const formatTB = (tb) => {
  if (!tb) return "0 TB";
  if (tb >= 1024) return `${trim((tb / 1024).toFixed(tb / 1024 >= 10 ? 0 : 1))} PB`;
  if (tb >= 10) return `${Math.round(tb)} TB`;
  return `${trim(tb.toFixed(1))} TB`;
};
