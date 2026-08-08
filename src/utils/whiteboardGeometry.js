/* Pure orthogonal-geometry helpers shared by the whiteboard component and the
   edge router: anchor points, side selection, simple polylines, rounded SVG
   paths, polyline midpoints, and grid snapping. No dependency on node types. */

/* Anchor point on a rect's side, `t` in (0,1) along that side. */
export function anchor(r, side, t = 0.5) {
  switch (side) {
    case "l": return { x: r.x,           y: r.y + r.h * t };
    case "r": return { x: r.x + r.w,     y: r.y + r.h * t };
    case "t": return { x: r.x + r.w * t, y: r.y };
    case "b": return { x: r.x + r.w * t, y: r.y + r.h };
    default:  return { x: r.x, y: r.y };
  }
}

/* Which sides two rects should attach on, based on their relative centres. */
export function autoSides(ra, rb) {
  const dx = rb.x + rb.w / 2 - (ra.x + ra.w / 2);
  const dy = rb.y + rb.h / 2 - (ra.y + ra.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ["r", "l"] : ["l", "r"];
  return dy >= 0 ? ["b", "t"] : ["t", "b"];
}

/* Connection points around a rect: three per side, at the quarter points and
   the midpoint. An anchor is stored on an edge as {side, t}, so geometry stays
   correct when the node is later moved or resized. */
export const PORT_TS = [0.25, 0.5, 0.75];
export const nodePorts = (r) => {
  const ports = [];
  for (const side of ["l", "r", "t", "b"])
    for (const t of PORT_TS) ports.push({ side, t, ...anchor(r, side, t) });
  return ports;
};

/* The connection point nearest a world coordinate — how a drop decides where
   an edge attaches on its target. */
export function nearestPort(r, p) {
  let best = null, bestDist = Infinity;
  for (const port of nodePorts(r)) {
    const d = (port.x - p.x) ** 2 + (port.y - p.y) ** 2;
    if (d < bestDist) { bestDist = d; best = port; }
  }
  return best;
}

/* Simple two/three-segment elbow between two rects (fallback routing).
   `sa`/`ea` ({side, t}) pin either end to a chosen connection point; ends
   without one fall back to the facing side's midpoint. */
export function edgePolyline(ra, rb, sa, ea) {
  const [autoS, autoE] = autoSides(ra, rb);
  const sS = sa?.side || autoS, eS = ea?.side || autoE;
  const A = anchor(ra, sS, sa?.t), B = anchor(rb, eS, ea?.t);
  const hOut = sS === "l" || sS === "r";
  const hIn = eS === "l" || eS === "r";
  if (hOut && hIn) {
    if (Math.abs(A.y - B.y) < 14) return [A, B];
    const mx = (A.x + B.x) / 2;
    return [A, { x: mx, y: A.y }, { x: mx, y: B.y }, B];
  }
  if (!hOut && !hIn) {
    if (Math.abs(A.x - B.x) < 14) return [A, B];
    const my = (A.y + B.y) / 2;
    return [A, { x: A.x, y: my }, { x: B.x, y: my }, B];
  }
  // mixed axes: one corner leaves A along its side and arrives at B along its
  return hOut ? [A, { x: B.x, y: A.y }, B] : [A, { x: A.x, y: B.y }, B];
}

/* Orthogonal polyline between two rects. With manual waypoints (`pts`) the line
   is anchored toward the first/last waypoint and squared off through each one;
   without them it falls back to a simple auto elbow. `sa`/`ea` pin the ends to
   specific connection points either way. */
export function elbowPath(ra, rb, pts, sa, ea) {
  if (!ra || !rb) return [];
  if (!Array.isArray(pts) || !pts.length) return edgePolyline(ra, rb, sa, ea);
  const ac = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 };
  const bc = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 };
  const sideTo = (c, p) => {
    const dx = p.x - c.x, dy = p.y - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "r" : "l";
    return dy >= 0 ? "b" : "t";
  };
  const A = sa?.side ? anchor(ra, sa.side, sa.t) : anchor(ra, sideTo(ac, pts[0]));
  const B = ea?.side ? anchor(rb, ea.side, ea.t) : anchor(rb, sideTo(bc, pts[pts.length - 1]));
  const spine = [A, ...pts, B];
  const out = [spine[0]];
  for (let i = 0; i < spine.length - 1; i++) {
    const p = spine[i], q = spine[i + 1];
    if (p.x !== q.x && p.y !== q.y) {
      if (Math.abs(q.x - p.x) >= Math.abs(q.y - p.y)) out.push({ x: q.x, y: p.y });
      else out.push({ x: p.x, y: q.y });
    }
    out.push(q);
  }
  return out;
}

/* SVG path for a polyline with rounded corners. */
export function roundedPath(pl, R = 12) {
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

/* Midpoint (by arc length) of a polyline, plus its total length. */
export function plMid(pl) {
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

/* Snap a world coordinate to the 8px grid. */
export const snap = (v) => Math.round(v / 8) * 8;

/* Live alignment for a drag: when the moving rect's centre comes within `tol`
   of another rect's row or column centre line, snap onto it. Centre-based to
   match the Straighten tidy — a guide here is an alignment Straighten would
   keep. Returns the corrected top-left per axis (absent when nothing matched)
   and the centre lines to draw: { x?, y?, guides: [{ axis: "v"|"h", at }] }. */
export function alignmentGuides(moving, others, tol = 6) {
  const cx = moving.x + moving.w / 2, cy = moving.y + moving.h / 2;
  let v = null, h = null;
  for (const r of others) {
    const dv = Math.abs(r.x + r.w / 2 - cx);
    const dh = Math.abs(r.y + r.h / 2 - cy);
    if (dv <= tol && (!v || dv < v.d)) v = { at: r.x + r.w / 2, d: dv };
    if (dh <= tol && (!h || dh < h.d)) h = { at: r.y + r.h / 2, d: dh };
  }
  const out = { guides: [] };
  if (v) { out.x = v.at - moving.w / 2; out.guides.push({ axis: "v", at: v.at }); }
  if (h) { out.y = h.at - moving.h / 2; out.guides.push({ axis: "h", at: h.at }); }
  return out;
}

/* Translate manual edge waypoints when a gesture moves endpoints. By default
   both endpoints must be in movedIds (matches paste/shift semantics); zoneFrameOnly
   translates any edge touching the moved zone (Alt-drag frame without contents). */
export function translateEdgePts(edges, movedIds, dx, dy, opts = {}) {
  if (!dx && !dy) return edges;
  const moved = movedIds instanceof Set ? movedIds : new Set(movedIds);
  const zoneFrame = !!opts.zoneFrameOnly;
  let changed = false;
  const out = edges.map((e) => {
    if (!e.pts?.length) return e;
    const hit = zoneFrame
      ? moved.has(e.s) || moved.has(e.e)
      : moved.has(e.s) && moved.has(e.e);
    if (!hit) return e;
    changed = true;
    return { ...e, pts: e.pts.map((p) => ({ x: snap(p.x + dx), y: snap(p.y + dy) })) };
  });
  return changed ? out : edges;
}
