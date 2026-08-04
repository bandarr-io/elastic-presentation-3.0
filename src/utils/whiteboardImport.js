/* Turn real Elasticsearch output into a whiteboard board, so a discovery call
   can start from the customer's actual topology instead of a blank canvas.

   Three inputs are understood, all of them things an SA can paste straight
   from Kibana Dev Tools:
     - `GET _cat/nodes?v` (or any ?v variant) — tabular text with a header row
     - `GET _nodes` / `_nodes/stats` — JSON keyed by node id
     - `GET _cluster/stats` — JSON with aggregate counts only              */

/* node.role letters as reported by _cat/nodes. */
export const ROLE_LETTERS = {
  c: "cold", d: "data", f: "frozen", h: "hot", i: "ingest", l: "ml", m: "master",
  r: "remote_cluster_client", s: "content", t: "transform", v: "voting_only", w: "warm",
};

const UNITS = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4, pb: 1024 ** 5 };

/* "62.9gb" / "1.7tb" / "512mb" -> bytes. */
export function parseSize(text) {
  const m = String(text ?? "").trim().match(/^([\d.]+)\s*(b|kb|mb|gb|tb|pb)$/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  return isFinite(v) ? v * UNITS[m[2].toLowerCase()] : 0;
}
const toGB = (bytes) => bytes / UNITS.gb;
const toTB = (bytes) => bytes / UNITS.tb;

const emptyNode = (name) => ({ name, roles: [], cpu: 0, ramBytes: 0, diskBytes: 0 });

/* ---------------- _cat/nodes ---------------- */

/* Header names we care about, mapped to the field they fill. */
const CAT_COLUMNS = {
  name: "name", n: "name",
  "node.role": "roles", "node.roles": "roles", role: "roles", r: "roles",
  "ram.max": "ram", rm: "ram",
  "disk.total": "disk", dt: "disk", "disk.avail": "diskAvail",
  cpu: "cpuPct",
};

function parseCatNodes(text) {
  const lines = text.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
  if (!lines.length) return null;
  const header = lines[0].trim().split(/\s+/);
  // a header row is required (the ?v flag); without it columns are ambiguous
  if (!header.some((h) => CAT_COLUMNS[h.toLowerCase()])) return null;
  const fields = header.map((h) => CAT_COLUMNS[h.toLowerCase()] || null);

  const nodes = [];
  for (const line of lines.slice(1)) {
    const cells = line.trim().split(/\s+/);
    if (cells.length < fields.length) continue;
    const node = emptyNode("");
    fields.forEach((field, i) => {
      const cell = cells[i];
      if (!field || cell === undefined) return;
      if (field === "name") node.name = cell;
      else if (field === "roles") node.roles = [...cell].map((ch) => ROLE_LETTERS[ch]).filter(Boolean);
      else if (field === "ram") node.ramBytes = parseSize(cell);
      else if (field === "disk") node.diskBytes = parseSize(cell);
    });
    if (node.name || node.roles.length) nodes.push(node);
  }
  return nodes.length ? { source: "_cat/nodes", nodes } : null;
}

/* ---------------- _nodes / _nodes/stats ---------------- */

function parseNodesJson(doc) {
  if (!doc || typeof doc.nodes !== "object" || Array.isArray(doc.nodes)) return null;
  const entries = Object.values(doc.nodes);
  if (!entries.length || !entries.every((n) => n && typeof n === "object")) return null;
  // _cluster/stats also has a `nodes` key, but its value is an aggregate
  if (!entries.some((n) => n.roles || n.name || n.attributes)) return null;

  const nodes = entries.map((n) => {
    const node = emptyNode(n.name || "node");
    node.roles = Array.isArray(n.roles) ? n.roles.slice() : [];
    // pre-7.x style tier attributes (node.attr.data: hot)
    const attr = n.attributes && (n.attributes.data || n.attributes.box_type);
    if (attr && !node.roles.includes(attr)) node.roles.push(attr);
    node.cpu = n.os?.available_processors || n.os?.allocated_processors || 0;
    node.ramBytes = n.os?.mem?.total_in_bytes || 0;
    node.diskBytes = n.fs?.total?.total_in_bytes || 0;
    return node;
  });
  return { source: "_nodes", clusterName: doc.cluster_name, nodes };
}

/* ---------------- _cluster/stats ---------------- */

function parseClusterStats(doc) {
  const count = doc?.nodes?.count;
  if (!count || typeof count.total !== "number") return null;
  /* Aggregate-only: synthesize one representative node per role bucket so the
     board still shows the shape of the cluster. */
  const roleKeys = ["data_hot", "data_warm", "data_cold", "data_frozen", "data", "master", "ingest", "ml"];
  const nodes = [];
  const cpuTotal = doc.nodes?.os?.available_processors || 0;
  const ramTotal = doc.nodes?.os?.mem?.total_in_bytes || 0;
  const diskTotal = doc.nodes?.fs?.total_in_bytes || 0;
  const dataish = roleKeys.filter((k) => k.startsWith("data")).reduce((s, k) => s + (count[k] || 0), 0) || count.total;

  for (const key of roleKeys) {
    const n = count[key];
    if (!n) continue;
    const role = key === "data" ? "data" : key.replace("data_", "");
    for (let i = 0; i < n; i++) {
      const node = emptyNode(`${role}-${i + 1}`);
      node.roles = [role];
      if (role !== "master" && role !== "ingest" && role !== "ml") {
        node.cpu = Math.round(cpuTotal / count.total) || 0;
        node.ramBytes = ramTotal / count.total;
        node.diskBytes = diskTotal / dataish;
      }
      nodes.push(node);
    }
  }
  return nodes.length ? { source: "_cluster/stats", clusterName: doc.cluster_name, nodes } : null;
}

/* ---------------- entry point ---------------- */

/* Parse any supported paste. Returns { source, clusterName, nodes[] } or null. */
export function parseClusterInput(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  if (raw.startsWith("{")) {
    let doc;
    try { doc = JSON.parse(raw); } catch { return null; }
    return parseNodesJson(doc) || parseClusterStats(doc);
  }
  return parseCatNodes(raw);
}

/* ---------------- board construction ---------------- */

const TIER_TYPES = [
  { role: "hot", type: "tier_hot" },
  { role: "warm", type: "tier_warm" },
  { role: "cold", type: "tier_cold" },
  { role: "frozen", type: "tier_frozen" },
];
const ROLE_TYPES = [
  { role: "master", type: "node_master" },
  { role: "ingest", type: "node_ingest" },
  { role: "ml", type: "node_ml" },
];

const has = (node, role) => node.roles.includes(role) || node.roles.includes(`data_${role}`);
const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

/* Group parsed nodes into the component boxes a diagram wants: one box per
   data tier and per dedicated role, each carrying node count and per-node
   hardware so the capacity rollup lights up. */
export function summarizeCluster(parsed) {
  const nodes = parsed?.nodes || [];
  const groups = [];
  const addGroup = (type, label, members) => {
    if (!members.length) return;
    groups.push({
      type, label, count: members.length,
      cpu: Math.round(avg(members.map((m) => m.cpu))) || 0,
      ramGB: Math.round(toGB(avg(members.map((m) => m.ramBytes)))) || 0,
      diskTB: +toTB(avg(members.map((m) => m.diskBytes))).toFixed(2) || 0,
    });
  };

  for (const { role, type } of TIER_TYPES) addGroup(type, role, nodes.filter((n) => has(n, role)));
  // generic data nodes (no tier roles at all) become one Elasticsearch box
  const tierless = nodes.filter((n) => has(n, "data") && !TIER_TYPES.some(({ role }) => has(n, role)));
  addGroup("es", "data", tierless);

  for (const { role, type } of ROLE_TYPES) {
    // only count nodes dedicated to the role, so a hot+master node isn't double-drawn
    const dedicated = nodes.filter((n) => has(n, role)
      && !TIER_TYPES.some(({ role: r }) => has(n, r)) && !has(n, "data"));
    addGroup(type, role, dedicated);
  }

  const coordinating = nodes.filter((n) => n.roles.length === 0);
  addGroup("node_coord", "coordinating", coordinating);

  return {
    source: parsed?.source,
    clusterName: parsed?.clusterName,
    total: nodes.length,
    groups,
  };
}

/* Build a board document from a parsed cluster: a column of data tiers beside
   a column of dedicated roles, wrapped in a zone named after the cluster. */
export function clusterToBoard(parsed, { nodeW = 248, nodeH = 96 } = {}) {
  const summary = summarizeCluster(parsed);
  if (!summary.groups.length) return null;

  const COL_GAP = 80, ROW_GAP = 28, PAD = 44;
  const tiers = summary.groups.filter((g) => g.type.startsWith("tier_") || g.type === "es");
  const roles = summary.groups.filter((g) => !g.type.startsWith("tier_") && g.type !== "es");

  const nodes = [];
  const place = (group, col, row) => {
    const props = { nodes: group.count };
    if (group.cpu) props.cpu = group.cpu;
    if (group.ramGB) props.mem = group.ramGB;
    if (group.diskTB) props.capacity = `${group.diskTB} TB`;
    if (group.type === "es") { props.data = group.count; delete props.nodes; }
    nodes.push({
      id: `imp_${group.type}`, type: group.type,
      x: PAD + col * (nodeW + COL_GAP), y: PAD + row * (nodeH + ROW_GAP),
      props,
    });
  };
  tiers.forEach((g, i) => place(g, 0, i));
  roles.forEach((g, i) => place(g, 1, i));

  const rows = Math.max(tiers.length, roles.length);
  const cols = roles.length ? 2 : 1;
  const zone = {
    id: "imp_zone", x: 0, y: 0,
    w: PAD * 2 + cols * nodeW + (cols - 1) * COL_GAP,
    h: PAD * 2 + rows * nodeH + (rows - 1) * ROW_GAP,
    label: summary.clusterName || "Imported cluster",
    color: "#00BFB3",
  };

  /* ILM flow down the tier column mirrors how data actually ages. */
  const edges = [];
  for (let i = 0; i < tiers.length - 1; i++) {
    edges.push({ id: `impe${i}`, s: `imp_${tiers[i].type}`, e: `imp_${tiers[i + 1].type}`, lbl: "ILM" });
  }

  return { board: { nodes, edges, zones: [zone] }, summary };
}
