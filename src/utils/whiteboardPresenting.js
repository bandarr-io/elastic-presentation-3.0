/* Helpers for the whiteboard's presenting layer: the annotation ink drawn over
   a diagram, the build steps that reveal it piece by piece, and the text
   wrapping the SVG export needs (SVG has no automatic text flow). */

/* Pen colours, on brand and readable on both themes. */
export const INK_COLORS = [
  { label: "Yellow", value: "#FEC514" },
  { label: "Pink",   value: "#F04E98" },
  { label: "Teal",   value: "#00BFB3" },
  { label: "Blue",   value: "#4C8DFF" },
];
export const INK_WIDTH = 3;

/* Freehand strokes are simplified as they're drawn: skip points closer than
   this (in world units) so the path stays light without looking angular. */
export const INK_MIN_STEP = 4;

/* An SVG path for one stroke. Arrows are a straight line from first to last
   point; the arrowhead is a marker applied at render time. */
export const inkPath = (stroke) => {
  const pts = (stroke && stroke.pts) || [];
  if (pts.length < 2) return "";
  if (stroke.kind === "arrow") {
    const a = pts[0], b = pts[pts.length - 1];
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }
  return pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
};

/* Build steps: elements carry an optional 1-based `step`; anything without one
   is base content, visible from the start. */
export const stepCountOf = (...lists) =>
  lists.flat().reduce((max, el) => Math.max(max, el && el.step ? el.step : 0), 0);
export const visibleAtStep = (el, step) => !el.step || el.step <= step;

/* Greedy word wrap for annotation text in the SVG export. Honours explicit
   newlines; `max` is an approximate character budget per line. */
export const wrapText = (text, max) => {
  const out = [];
  for (const para of String(text || "").split("\n")) {
    if (!para) { out.push(""); continue; }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length <= max) { line = next; continue; }
      if (line) out.push(line);
      line = word;
    }
    out.push(line);
  }
  return out;
};
