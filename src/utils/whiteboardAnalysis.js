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
const SNAP = 8;
const snap = (v) => Math.round(v / SNAP) * SNAP;

/* Arrange components into left-to-right lanes by data-flow stage, each lane
   stacked and vertically centred against the tallest one. Annotations keep
   their position — they're commentary, anchored where the user put them.
   Returns { [id]: {x, y} } for the nodes that should move. */
export function tidyLayout(nodes, sizeOf, origin = { x: 80, y: 80 }) {
  const laid = nodes.filter((n) => known(n) && !isAnn(n));
  if (!laid.length) return {};

  const byLane = new Map(LANES.map((l) => [l, []]));
  for (const n of laid) byLane.get(laneOf(n)).push(n);
  // keep each lane in its current top-to-bottom order so tidying feels stable
  for (const list of byLane.values()) list.sort((a, b) => a.y - b.y || a.x - b.x);

  const lanes = LANES.map((l) => byLane.get(l)).filter((list) => list.length);
  const heights = lanes.map((list) =>
    list.reduce((sum, n) => sum + sizeOf(n).h, 0) + ROW_GAP * (list.length - 1));
  const tallest = Math.max(...heights);

  const out = {};
  let x = origin.x;
  lanes.forEach((list, i) => {
    const width = Math.max(...list.map((n) => sizeOf(n).w));
    let y = origin.y + (tallest - heights[i]) / 2;
    for (const n of list) {
      const s = sizeOf(n);
      out[n.id] = { x: snap(x + (width - s.w) / 2), y: snap(y) };
      y += s.h + ROW_GAP;
    }
    x += width + LANE_GAP;
  });
  return out;
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
export function validateBoard(nodes = [], edges = []) {
  const real = nodes.filter((n) => known(n) && !isAnn(n));
  const out = [];
  const has = (type) => real.some((n) => n.type === type);
  const add = (id, level, title, detail) => out.push({ id, level, title, detail });

  const dataish = real.some((n) => n.type.startsWith("tier_") || n.type === "es");
  if (!dataish) return out;                 // not a cluster diagram; stay quiet

  // --- master quorum ---
  const masters = instances(real, "node_master")
    + real.filter((n) => n.type === "es").reduce((s, n) => s + num(prop(n, "masters")), 0);
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
  const dataNodes = ["tier_hot", "tier_warm", "tier_cold", "tier_frozen"]
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
  const orphans = real.filter((n) => !linked.has(n.id));
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
  const totals = { count: 0, cpu: 0, mem: 0, storageTB: 0, tiers: [] };

  for (const n of real) {
    const mult = num(prop(n, "nodes")) || 0;
    if (mult) totals.count += mult;
    const each = mult || 1;
    totals.cpu += num(prop(n, "cpu")) * each;
    totals.mem += num(prop(n, "mem")) * each;
  }

  for (const { type, label } of TIERS) {
    const tierNodes = real.filter((n) => n.type === type);
    if (!tierNodes.length) continue;
    let count = 0, storageTB = 0;
    for (const n of tierNodes) {
      const nodeCount = num(prop(n, "nodes")) || 1;
      count += nodeCount;
      storageTB += parseCapacityTB(prop(n, "capacity")) * nodeCount;
    }
    totals.tiers.push({ type, label, count, storageTB });
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
