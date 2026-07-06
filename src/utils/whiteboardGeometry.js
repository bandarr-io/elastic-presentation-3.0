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

/* Simple two/three-segment elbow between two rects (fallback routing). */
export function edgePolyline(ra, rb) {
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

/* Orthogonal polyline between two rects. With manual waypoints (`pts`) the line
   is anchored toward the first/last waypoint and squared off through each one;
   without them it falls back to a simple auto elbow. */
export function elbowPath(ra, rb, pts) {
  if (!ra || !rb) return [];
  if (!Array.isArray(pts) || !pts.length) return edgePolyline(ra, rb);
  const ac = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 };
  const bc = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 };
  const sideTo = (c, p) => {
    const dx = p.x - c.x, dy = p.y - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "r" : "l";
    return dy >= 0 ? "b" : "t";
  };
  const A = anchor(ra, sideTo(ac, pts[0]));
  const B = anchor(rb, sideTo(bc, pts[pts.length - 1]));
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
