/* ============================================================
   nodeMetrics
   Content-driven node sizing shared by the whiteboard canvas and the
   template layout engine. Width is fixed per type; height grows to fit
   whatever the node actually shows (title, sub line, field chips), so
   sizing runs and imports never overflow their boxes.

   The character-width constants approximate the canvas fonts and match
   the numbers the SVG export already uses; heights are calibrated to the
   .ew-node / .ew-fchips CSS with a little headroom so estimates never
   come in under the rendered content.
   ============================================================ */

import { TYPES } from "../data/whiteboardTypes";

const TITLE_CHAR_W = 7.6;   // 14.5px display font
const SUB_CHAR_W = 5.7;     // 11px sub line
const CHIP_CHAR_W = 5.9;    // 9.5px mono chip text
const CHIP_PAD = 16;        // chip pill padding + border
const CHIP_GAP = 10;
const CHIP_H = 17;
const CHIPS_TOP = 5;        // .ew-fchips margin-top + breathing room
const TITLE_LINE_H = 21;
const SUB_LINE_H = 16;
const PAD_Y = 24;           // .ew-node vertical padding (10px each side) + headroom
const PAD_X = 24;           // .ew-node horizontal padding
const LOGO_W = 33;          // 24px logo + 9px gap

/* The chip strings a node displays: every configurable field with a value
   (explicit or default), formatted with its prefix/unit. */
export const nodeChips = (type, props) => {
  const out = [];
  for (const f of TYPES[type]?.fields || []) {
    const v = props && props[f.key] !== undefined ? props[f.key] : f.def;
    if (v === undefined || v === "" || v === false) continue;
    /* Set-valued fields (node roles) read as one chip each rather than a
       single run-on chip, so a multi-role node stays scannable. */
    if (Array.isArray(v)) { out.push(...v); continue; }
    out.push(f.kind === "toggle" ? f.label : (f.pre || "") + v + (f.unit ? " " + f.unit : ""));
  }
  return out;
};

/* Greedy word-wrap: how many lines `text` needs at `perLine` characters. */
const wrapLines = (text, perLine) => {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  let lines = 1, len = 0;
  for (const w of words) {
    const need = len ? len + 1 + w.length : w.length;
    if (need > perLine && len) { lines += 1; len = Math.min(w.length, perLine); }
    else len = Math.min(need, perLine);
  }
  return lines;
};

/* Greedy chip flow: how many rows the chips wrap into at `availW` px. */
const chipRows = (chips, availW) => {
  let rows = 1, x = 0;
  for (const c of chips) {
    const w = Math.round(c.length * CHIP_CHAR_W) + CHIP_PAD;
    if (x > 0 && x + CHIP_GAP + w > availW) { rows += 1; x = w; }
    else x = x ? x + CHIP_GAP + w : w;
  }
  return rows;
};

/* Height a node needs for its current content, never below the type's
   designed height (sparse nodes keep their familiar proportions). An
   explicit n.h (user resize) always wins — callers check that first. */
export function nodeAutoHeight(n) {
  const t = TYPES[n.type];
  if (!t) return n.h != null ? n.h : 72;
  if (t.annotation) return t.h;
  const w = n.w != null ? n.w : t.w;
  const availW = Math.max(40, w - PAD_X - (n.logo ? LOGO_W : 0));
  const title = n.title || t.label;
  const sub = n.sub !== undefined ? n.sub : t.sub;
  const chips = nodeChips(n.type, n.props);

  let h = PAD_Y + wrapLines(title, Math.max(4, Math.floor(availW / TITLE_CHAR_W))) * TITLE_LINE_H;
  if (sub) h += wrapLines(sub, Math.max(4, Math.floor(availW / SUB_CHAR_W))) * SUB_LINE_H;
  if (chips.length) {
    const rows = chipRows(chips, availW);
    h += CHIPS_TOP + rows * CHIP_H + (rows - 1) * CHIP_GAP;
  }
  return Math.max(t.h, Math.ceil(h));
}
