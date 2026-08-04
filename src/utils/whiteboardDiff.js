/* Compare two boards — a target design against what the customer runs today,
   or against the cluster imported from their diagnostics. Components are
   matched across boards by what they are and what they're called, since ids
   are only meaningful within one board.

   Annotations are commentary rather than architecture, so they sit the
   comparison out. */

import { TYPES } from "../data/whiteboardTypes";
import { capacityTotals, formatTB } from "./whiteboardAnalysis";

const architectural = (n) => !!TYPES[n.type] && !TYPES[n.type].annotation;
export const labelOf = (n) => (n.title || "").trim() || (TYPES[n.type] ? TYPES[n.type].label : n.type);
const keyOf = (n) => `${n.type}::${labelOf(n).toLowerCase()}`;

/* The properties worth calling out when the same component appears on both
   boards with different numbers on it. */
const COMPARED = [
  { key: "nodes",    label: "Nodes" },
  { key: "capacity", label: "Capacity" },
  { key: "cpu",      label: "vCPU" },
  { key: "mem",      label: "RAM" },
  { key: "instance", label: "Instance" },
  { key: "version",  label: "Version" },
];

const valueOf = (node, key) => {
  const v = node.props ? node.props[key] : undefined;
  return v === undefined || v === null || v === "" ? null : String(v);
};

const changesBetween = (from, to) =>
  COMPARED
    .map(({ key, label }) => ({ label, from: valueOf(from, key), to: valueOf(to, key) }))
    .filter((c) => c.from !== c.to && (c.from !== null || c.to !== null));

/* Group by key so repeated components (three "Hot Tier" boxes, say) pair up
   one for one and only the surplus counts as added or removed. */
const bucket = (nodes) => {
  const map = new Map();
  for (const n of nodes.filter(architectural)) {
    const key = keyOf(n);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  }
  return map;
};

/* Diff `board` against `baseline`: what the target adds, drops, and resizes.
   Returns entries carrying the node itself so the canvas can tint it. */
export function diffBoards(board = {}, baseline = {}) {
  const mine = bucket(board.nodes || []);
  const theirs = bucket(baseline.nodes || []);

  const added = [], removed = [], changed = [];
  let unchanged = 0;

  for (const [key, group] of mine) {
    const match = theirs.get(key) || [];
    group.forEach((node, i) => {
      const was = match[i];
      if (!was) return added.push({ key, label: labelOf(node), node });
      const fields = changesBetween(was, node);
      if (fields.length) changed.push({ key, label: labelOf(node), node, fields });
      else unchanged++;
    });
  }

  for (const [key, group] of theirs) {
    const match = mine.get(key) || [];
    group.slice(match.length).forEach((node) => removed.push({ key, label: labelOf(node), node }));
  }

  return {
    added, removed, changed, unchanged,
    capacity: capacityDelta(board.nodes || [], baseline.nodes || []),
  };
}

/* How the rollups move between the two boards. */
function capacityDelta(nodes, baselineNodes) {
  const now = capacityTotals(nodes);
  const was = capacityTotals(baselineNodes);
  const line = (label, from, to, format) => ({
    label, from, to, delta: to - from,
    text: `${format(from)} → ${format(to)}`,
  });
  const plain = (v) => String(v || 0);
  return [
    line("Nodes", was.count, now.count, plain),
    line("vCPU", was.cpu, now.cpu, plain),
    line("RAM", was.mem, now.mem, (v) => `${v || 0} GB`),
    line("Storage", was.storageTB, now.storageTB, (v) => formatTB(v)),
  ].filter((l) => l.from || l.to);
}

/* Nodes on the current board that the comparison has something to say about,
   as { [nodeId]: 'added' | 'changed' }, for tinting the canvas. */
export function diffMarks(diff) {
  const marks = {};
  for (const entry of diff.added) marks[entry.node.id] = "added";
  for (const entry of diff.changed) marks[entry.node.id] = "changed";
  return marks;
}
