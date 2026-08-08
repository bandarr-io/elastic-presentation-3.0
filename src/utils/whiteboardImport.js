/* Turn real Elasticsearch output into a whiteboard board, so a discovery call
   can start from the customer's actual topology instead of a blank canvas.

   Everything an SA can realistically paste from Kibana Dev Tools or a terminal
   is understood; the paste is de-noised (see stripRequestPreamble) before it is
   dispatched by shape:
     - `GET _cat/nodes?v&h=name,node.role,ram.max,disk.total` — tabular text.
       A header row is required so columns can be named. The default `?v`
       column set (no ram.max/disk.total) still imports; those nodes just carry
       no hardware, since the paste genuinely doesn't contain it.
     - `GET _cat/nodes?format=json` — a JSON *array* of per-node objects.
     - `GET _nodes` / `_nodes/stats` — JSON keyed by node id (highest fidelity:
       carries CPU core counts and the Elasticsearch version).
     - `GET _cluster/stats` — JSON with aggregate counts only (approximate: the
       role/tier buckets overlap, so the node breakdown is reconstructed against
       `count.total` rather than summed — see parseClusterStats).
   Each of the above is accepted whether pasted bare, with the Dev Tools request
   line kept on top, wrapped in a `curl` command, or with Windows CRLF endings.  */

import { nodeAutoHeight } from "./nodeMetrics";
import { NODE_ROLES } from "../data/whiteboardTypes";

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

const emptyNode = (name) => ({ name, roles: [], cpu: 0, ramBytes: 0, diskBytes: 0, version: "" });

/* ---------------- _cat/nodes ---------------- */

/* Header names (and their documented aliases) we can act on, mapped to the
   node field they fill. `cpu` is deliberately absent: _cat/nodes' cpu column
   is instantaneous *utilisation percent*, not a core count, so it must never
   populate a node's vCPU field the way _nodes' os.available_processors does —
   core counts only come from the _nodes JSON paste. */
const CAT_COLUMNS = {
  name: "name", n: "name",
  "node.role": "roles", "node.roles": "roles", role: "roles", noderole: "roles", r: "roles",
  "ram.max": "ram", rm: "ram", rammax: "ram",
  "disk.total": "disk", dt: "disk", disktotal: "disk",
  version: "version",
};

function nodeFromCells(fields, cells) {
  const node = emptyNode("");
  fields.forEach((field, i) => {
    const cell = cells[i];
    if (!field || cell === undefined) return;
    if (field === "name") node.name = cell;
    else if (field === "roles") node.roles = [...cell].map((ch) => ROLE_LETTERS[ch]).filter(Boolean);
    else if (field === "ram") node.ramBytes = parseSize(cell);
    else if (field === "disk") node.diskBytes = parseSize(cell);
    else if (field === "version") node.version = cell;
  });
  return node;
}

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
    const node = nodeFromCells(fields, cells);
    if (node.name || node.roles.length) nodes.push(node);
  }
  return nodes.length ? { source: "_cat/nodes", nodes } : null;
}

/* `GET _cat/nodes?format=json` returns an array of objects whose keys are the
   same column names (or aliases) the tabular form uses. */
function parseCatJson(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  if (!arr.every((row) => row && typeof row === "object" && !Array.isArray(row))) return null;
  const nodes = [];
  for (const row of arr) {
    const node = emptyNode("");
    for (const [key, value] of Object.entries(row)) {
      const field = CAT_COLUMNS[String(key).toLowerCase()];
      if (!field || value == null) continue;
      const cell = String(value);
      if (field === "name") node.name = cell;
      else if (field === "roles") node.roles = [...cell].map((ch) => ROLE_LETTERS[ch]).filter(Boolean);
      else if (field === "ram") node.ramBytes = parseSize(cell);
      else if (field === "disk") node.diskBytes = parseSize(cell);
      else if (field === "version") node.version = cell;
    }
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
    node.version = n.version || "";
    return node;
  });
  return { source: "_nodes", clusterName: doc.cluster_name, nodes };
}

/* ---------------- _cluster/stats ---------------- */

/* _cluster/stats reports only aggregate node counts, and its buckets overlap:
   a single hot node that is also master-eligible is tallied in `data_hot`,
   `data`, *and* `master`. Summing them would draw a cluster several times
   larger than reality, so instead we reconstruct exactly `count.total` nodes
   against a defensible assumption we cannot verify from aggregates alone:

     - the data-tier buckets (data_hot/warm/cold/frozen/content) name the data
       nodes and are treated as disjoint (a node's tier is its placement);
     - `count.data` (or the tier sum) is how many distinct data nodes there are;
     - the remaining nodes are dedicated master/ingest/ml, assigned in that
       priority — matching the common topology where a cluster big enough to be
       read this way runs dedicated masters/ingest/ml separate from data nodes,
       and any leftover becomes coordinating-only.
   The synthesized list therefore always reconciles with count.total, and a
   data node is never also drawn as a separate master. */
function parseClusterStats(doc) {
  const count = doc?.nodes?.count;
  if (!count || typeof count.total !== "number") return null;
  const total = count.total;
  const cpuTotal = doc.nodes?.os?.available_processors || 0;
  const ramTotal = doc.nodes?.os?.mem?.total_in_bytes || 0;
  const diskTotal = doc.nodes?.fs?.total_in_bytes || 0;
  const version = Array.isArray(doc.nodes?.versions) ? doc.nodes.versions[0] || "" : "";

  const nodes = [];
  const push = (role) => { const n = emptyNode(`${role || "coordinating"}-${nodes.length + 1}`); if (role) n.roles = [role]; nodes.push(n); };

  const tiers = [["data_hot", "hot"], ["data_warm", "warm"], ["data_cold", "cold"], ["data_frozen", "frozen"], ["data_content", "content"]];
  let tierSum = 0;
  for (const [key, role] of tiers) {
    let n = Math.min(count[key] || 0, total - nodes.length);
    tierSum += n;
    while (n-- > 0) push(role);
  }
  // distinct data nodes: the reported `data` bucket, else the tiers we placed
  const dataCount = Math.min(typeof count.data === "number" ? count.data : tierSum, total);
  for (let i = tierSum; i < dataCount; i++) push("data");   // generic (untiered) data nodes

  let remaining = total - nodes.length;
  for (const role of ["master", "ingest", "ml"]) {
    const n = Math.min(count[role] || 0, remaining);
    remaining -= n;
    for (let i = 0; i < n; i++) push(role);
  }
  while (remaining-- > 0) push("");   // coordinating-only remainder

  const dataNodes = nodes.filter((n) => n.roles.length && n.roles[0] !== "master" && n.roles[0] !== "ingest" && n.roles[0] !== "ml").length || total;
  for (const node of nodes) {
    node.cpu = Math.round(cpuTotal / total) || 0;
    node.ramBytes = total ? ramTotal / total : 0;
    node.version = version;
    const isData = node.roles.length && !["master", "ingest", "ml"].includes(node.roles[0]);
    if (isData) node.diskBytes = dataNodes ? diskTotal / dataNodes : 0;
  }
  return nodes.length ? { source: "_cluster/stats", clusterName: doc.cluster_name, nodes } : null;
}

/* ---------------- entry point ---------------- */

/* Drop the lines an SA pastes above the actual output: the Dev Tools request
   line (`GET _cat/nodes?v`), a `curl` invocation (Dev Tools' "Copy as cURL",
   including its `\`-continued lines and a leading shell prompt), and `#`
   comments. Genuine output (a table, a `{`, or a `[`) ends the preamble. */
function stripRequestPreamble(text) {
  const lines = text.split("\n");
  let i = 0, continued = false;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (continued) { continued = t.endsWith("\\"); i++; continue; }
    if (!t) { i++; continue; }
    if (/^\$?\s*curl\b/i.test(t) || /^(GET|POST|PUT|DELETE|HEAD)\b/i.test(t) || t.startsWith("#")) {
      continued = t.endsWith("\\"); i++; continue;
    }
    break;
  }
  return lines.slice(i).join("\n");
}

/* Parse any supported paste. Returns { source, clusterName, nodes[] } or null. */
export function parseClusterInput(text) {
  const normalized = String(text || "").replace(/\r\n?/g, "\n");   // tolerate Windows CRLF
  if (!normalized.trim()) return null;
  const body = stripRequestPreamble(normalized).trim();
  if (!body) return null;
  if (body[0] === "{" || body[0] === "[") {
    let doc;
    try { doc = JSON.parse(body); } catch { return null; }
    return Array.isArray(doc) ? parseCatJson(doc) : (parseNodesJson(doc) || parseClusterStats(doc));
  }
  return parseCatNodes(body);
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

/* `_cat`'s role letters and pre-7.x tier attributes use short tier names; the
   `node.roles` setting names them `data_*`. Normalize to what Elasticsearch
   itself calls them, so an imported node's Roles field matches its
   elasticsearch.yml. */
const CANONICAL_ROLE = { hot: "data_hot", warm: "data_warm", cold: "data_cold",
                         frozen: "data_frozen", content: "data_content" };
export const canonicalRole = (role) => CANONICAL_ROLE[role] || role;

/* The union of roles across some nodes, in the documented order so the same
   set always reads the same way. */
export function roleSet(members = []) {
  const seen = new Set();
  for (const m of members) for (const r of m.roles || []) seen.add(canonicalRole(r));
  return NODE_ROLES.filter((r) => seen.has(r));
}

const has = (node, role) => node.roles.includes(role) || node.roles.includes(`data_${role}`);
/* content nodes are data nodes; treat any data_* role (and the bare tier
   letters from _cat) as data so no data node falls through the grouping. */
const isData = (node) => node.roles.some((r) => {
  const base = r.replace(/^data_/, "");
  return base === "data" || ["hot", "warm", "cold", "frozen", "content"].includes(base);
});
const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const firstVersion = (members) => members.map((m) => m.version).find(Boolean) || "";

/* The single box each node belongs to. Exactly one per node, so the board's
   counts always reconcile with the parsed total and a hot+master node isn't
   drawn twice. Order matters: a data role wins over an eligibility role
   (a hot node that is also master-eligible is a data node), and any node with
   only auxiliary roles (transform / voting_only / remote_cluster_client) or no
   roles at all is a coordinating node — the honest catch-all, since no
   dedicated box type exists for those and every node must land somewhere. */
function groupFor(node) {
  const tier = TIER_TYPES.find(({ role }) => has(node, role));
  if (tier) return { type: tier.type, label: tier.role };
  if (isData(node)) return { type: "node_data", label: "data" };
  const role = ROLE_TYPES.find(({ role }) => has(node, role));
  if (role) return { type: role.type, label: role.role };
  return { type: "node_coord", label: "coordinating" };
}

const GROUP_ORDER = [...TIER_TYPES.map((t) => t.type), "node_data", ...ROLE_TYPES.map((t) => t.type), "node_coord"];

/* Group parsed nodes into the component boxes a diagram wants: one box per
   data tier and per dedicated role, each carrying node count, per-node
   hardware, and (when known) the Elasticsearch version, so the capacity
   rollup lights up and the inspector reflects what the paste knew. */
export function summarizeCluster(parsed) {
  const nodes = parsed?.nodes || [];
  const buckets = new Map();
  for (const node of nodes) {
    const { type, label } = groupFor(node);
    if (!buckets.has(type)) buckets.set(type, { type, label, members: [] });
    buckets.get(type).members.push(node);
  }

  const groups = GROUP_ORDER.filter((type) => buckets.has(type)).map((type) => {
    const { label, members } = buckets.get(type);
    return {
      type, label, count: members.length, members,
      names: members.map((m) => m.name).filter(Boolean),
      roles: roleSet(members),
      cpu: Math.round(avg(members.map((m) => m.cpu))) || 0,
      ramGB: Math.round(toGB(avg(members.map((m) => m.ramBytes)))) || 0,
      diskTB: +toTB(avg(members.map((m) => m.diskBytes))).toFixed(2) || 0,
      version: firstVersion(members),
    };
  });

  return {
    source: parsed?.source,
    clusterName: parsed?.clusterName,
    total: nodes.length,
    groups,
  };
}

/* Up to this many nodes, every instance is drawn as its own box carrying its
   real name and role set — the fidelity an SA wants on a discovery call, and
   the only way a "these three nodes are each master + data + ingest" topology
   reads correctly. Past it, per-instance boxes stop being legible, so the
   board groups by tier and role instead. */
export const PER_NODE_MAX = 12;

const COL_GAP = 80, ROW_GAP = 28, PAD = 44;

/* Hardware a box carries, whether it stands for one node or a group of them.
   `capacity` is per-node storage that the rollup multiplies out; the separate
   `disk` HW field would just duplicate it, and no paste supplies the ECH
   `instance` type, so both are left unset rather than guessed. */
const hardwareProps = ({ cpu, ramGB, diskTB }) => ({
  ...(cpu ? { cpu } : {}), ...(ramGB ? { mem: ramGB } : {}),
  ...(diskTB ? { capacity: `${diskTB} TB` } : {}),
});

/* The wiring the Elastic Cluster pattern uses, applied to whatever stands for
   each group — its single box when grouped, its first instance when drawn per
   node. Keeping one representative per group is what stops a twelve-node
   import turning into a hairball. */
function clusterEdges(present, repOf) {
  const edges = [];
  const link = (from, to, extra = {}) => {
    const s = repOf(from), e = repOf(to);
    if (s && e && s !== e) edges.push({ id: `impe${edges.length}`, s, e, ...extra });
  };

  const tiers = TIER_TYPES.map((t) => t.type).filter((t) => present.has(t));
  const data = [...tiers, ...(present.has("node_data") ? ["node_data"] : [])];

  for (let i = 0; i < tiers.length - 1; i++) link(tiers[i], tiers[i + 1], { lbl: "ILM" });
  link("node_ingest", data[0]);                       // ingest pipelines feed the entry tier
  link("node_coord", data[0]);                        // coordinating routes requests in
  for (const t of data) link(t, "node_ml");           // data feeds inference
  // the elected master publishes cluster state to every other node type
  for (const t of [...data, "node_ingest", "node_coord", "node_ml"])
    link("node_master", t, { bi: true });
  return edges;
}

/* Peers inside a group have no hierarchy to draw, but a cluster of three
   all-in-one nodes is *only* peers — with no intra-group links it would import
   as unconnected boxes. Mesh them while the mesh stays readable. */
const PEER_MESH_MAX = 4;
function peerEdges(ids, offset) {
  const edges = [];
  if (ids.length < 2 || ids.length > PEER_MESH_MAX) return edges;
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      edges.push({ id: `impp${offset + edges.length}`, s: ids[i], e: ids[j], bi: true });
  return edges;
}

/* Instance names under a grouped box, so the box still says which machines it
   stands for without the title becoming a list. */
function namesSubtitle(names) {
  if (!names.length) return "";
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${shown} +${names.length - 3} more` : shown;
}

/* Build a board document from a parsed cluster, wrapped in a zone named after
   it. Small clusters draw one box per instance in a column per group; larger
   ones draw a column of data tiers beside a column of dedicated roles. */
export function clusterToBoard(parsed, { nodeW = 248, nodeH = 96, perNodeMax = PER_NODE_MAX } = {}) {
  const summary = summarizeCluster(parsed);
  if (!summary.groups.length) return null;
  const perNode = summary.total <= perNodeMax;

  /* Columns stack at each box's content-driven height (the stats and role
     chips make these taller than the designed box), so nothing overlaps and
     the zone wraps what's actually drawn. */
  const nodes = [];
  const colBottom = [];
  const place = (box, col) => {
    while (colBottom.length <= col) colBottom.push(PAD);
    const node = { ...box, x: PAD + col * (nodeW + COL_GAP), y: colBottom[col] };
    colBottom[col] += Math.max(nodeH, nodeAutoHeight(node)) + ROW_GAP;
    nodes.push(node);
    return node.id;
  };

  const firstOf = new Map();     // group type -> the box that represents it
  const edges = [];

  if (perNode) {
    summary.groups.forEach((group, col) => {
      const ids = group.members.map((member, i) => place({
        id: `imp_${group.type}_${i}`, type: group.type,
        title: member.name || undefined,
        props: {
          nodes: 1,
          ...hardwareProps({
            cpu: member.cpu,
            ramGB: Math.round(toGB(member.ramBytes)) || 0,
            diskTB: +toTB(member.diskBytes).toFixed(2) || 0,
          }),
          ...(roleSet([member]).length ? { roles: roleSet([member]) } : {}),
          ...(group.type === "node_data" && member.version ? { version: member.version } : {}),
        },
      }, col));
      firstOf.set(group.type, ids[0]);
      edges.push(...peerEdges(ids, edges.length));
    });
  } else {
    const tiers = summary.groups.filter((g) => g.type.startsWith("tier_") || g.type === "node_data");
    const roles = summary.groups.filter((g) => !g.type.startsWith("tier_") && g.type !== "node_data");
    const box = (group, col) => firstOf.set(group.type, place({
      id: `imp_${group.type}`, type: group.type,
      ...(namesSubtitle(group.names) ? { sub: namesSubtitle(group.names) } : {}),
      props: {
        nodes: group.count,
        ...hardwareProps(group),
        ...(group.roles.length ? { roles: group.roles } : {}),
        ...(group.type === "node_data" && group.version ? { version: group.version } : {}),
      },
    }, col));
    tiers.forEach((g) => box(g, 0));
    roles.forEach((g) => box(g, 1));
  }

  edges.push(...clusterEdges(new Set(summary.groups.map((g) => g.type)),
                             (type) => firstOf.get(type))
    .map((e, i) => ({ ...e, id: `impe${edges.length + i}` })));

  const cols = colBottom.length;
  const zone = {
    id: "imp_zone", x: 0, y: 0,
    w: PAD * 2 + cols * nodeW + (cols - 1) * COL_GAP,
    h: Math.max(...colBottom) - ROW_GAP + PAD,
    label: summary.clusterName || "Imported cluster",
    color: "#00BFB3",
  };

  return { board: { nodes, edges, zones: [zone] }, summary };
}
