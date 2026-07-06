import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { buildCatalog, describeDoc, describeSections, buildTool, systemPrompt, runLLM } from "../utils/whiteboardAI";
import { buildFromSections, instantiateTemplate, sectionEndpoint, TEMPLATE_MENU, TEMPLATE_CONFIG, defaultFill } from "../data/whiteboardTemplates";
import { STAGE_PALETTES, SURFACES, CATS, TYPES, tagOf, SEEDS } from "../data/whiteboardTypes";
import { anchor, elbowPath, roundedPath, plMid, snap } from "../utils/whiteboardGeometry";
import { useHistory } from "./whiteboard/useHistory";
import { useDragController } from "./whiteboard/useDragController";

/* ============================================================
   ElasticWhiteboard
   Drag-and-drop Elastic architecture canvas. No dependencies
   beyond React.

   Canvas:      drag empty space pans · wheel zooms · Fit button
   Palette:     drag a component onto the canvas (search box filters)
   Nodes:       drag moves (multi-select drags together) · corner
                grip resizes · double-click renames · shift-click
                multi-selects · shift-drag marquee-selects ·
                ⌘/Ctrl+D duplicates · Del removes
   Connections: hover a node, drag a ring onto another node ·
                click a line to select (label / reverse / delete)
   Zones:       + Zone adds a labeled container · drag its pill to
                move it with its contents · grip resizes
   History:     ⌘/Ctrl+Z undo · ⌘/Ctrl+Shift+Z redo
   Export:      JSON (round-trips) · SVG · PNG
   ============================================================ */

/* Node TYPES, palettes, categories and seed templates are defined in
   ../data/whiteboardTypes and imported above. Derived here for the AI chat: */
const WB_CATALOG = buildCatalog(TYPES);
const WB_TOOL = buildTool();
const TEMPLATES_OK = new Set([...TEMPLATE_MENU.map((t) => t.id), "single"]);

/* ---------------- pure geometry ---------------- */

const rectOf = (n) => ({
  x: n.x, y: n.y,
  w: n.w != null ? n.w : TYPES[n.type].w,
  h: n.h != null ? n.h : TYPES[n.type].h,
});
const nodeTag = (n, stages) => n.color || tagOf(TYPES[n.type], stages);
const nodeSub = (n) => (n.sub !== undefined ? n.sub : TYPES[n.type].sub);
const fieldChips = (n) => {
  const out = [];
  for (const f of TYPES[n.type].fields || []) {
    const v = n.props && n.props[f.key] !== undefined ? n.props[f.key] : f.def;
    if (v === undefined || v === "" || v === false) continue;
    out.push(f.kind === "toggle" ? f.label : (f.pre || "") + v + (f.unit ? " " + f.unit : ""));
  }
  return out;
};

const clone = (x) => JSON.parse(JSON.stringify(x));

let UID = 1000;
const uid = (p) => `${p}${UID++}`;

/* Pure alignment maths shared by nodes and zones. `rects` are {id,x,y,w,h}. */
const computeAlign = (rects, mode) => {
  const minX = Math.min(...rects.map((r) => r.x)), maxR = Math.max(...rects.map((r) => r.x + r.w));
  const minY = Math.min(...rects.map((r) => r.y)), maxB = Math.max(...rects.map((r) => r.y + r.h));
  const cx = (minX + maxR) / 2, cy = (minY + maxB) / 2;
  const out = {};
  for (const r of rects) {
    const p = {};
    if (mode === "left") p.x = minX;
    else if (mode === "right") p.x = maxR - r.w;
    else if (mode === "centerH") p.x = cx - r.w / 2;
    else if (mode === "top") p.y = minY;
    else if (mode === "bottom") p.y = maxB - r.h;
    else if (mode === "middle") p.y = cy - r.h / 2;
    if (p.x != null) p.x = snap(p.x);
    if (p.y != null) p.y = snap(p.y);
    out[r.id] = p;
  }
  return out;
};
/* Equal-gap distribution keeping the two extreme rects fixed. axis: "h"|"v". */
const computeDistribute = (rects, axis) => {
  const key = axis === "h" ? "x" : "y", size = axis === "h" ? "w" : "h";
  const rs = [...rects].sort((a, b) => a[key] - b[key]);
  const start = rs[0][key], end = rs[rs.length - 1][key] + rs[rs.length - 1][size];
  const gap = (end - start - rs.reduce((s, r) => s + r[size], 0)) / (rs.length - 1);
  const out = {};
  let cur = start;
  for (const r of rs) { out[r.id] = { [key]: snap(cur) }; cur += r[size] + gap; }
  return out;
};

/* Tiny glyph illustrating an alignment mode: a guide line + two bars snapped
   to it. Inherits `currentColor` so it follows the button's text color. */
const AlignIcon = ({ m }) => {
  const horiz = m === "left" || m === "centerH" || m === "right";
  const line = { stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" };
  if (horiz) {
    const gx = m === "left" ? 3.5 : m === "right" ? 12.5 : 8;
    const bars = [{ y: 4, w: 9 }, { y: 9.6, w: 6 }];
    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <line x1={gx} y1={2} x2={gx} y2={14} {...line} />
        {bars.map((b, i) => {
          const x = m === "left" ? gx : m === "right" ? gx - b.w : gx - b.w / 2;
          return <rect key={i} x={x} y={b.y} width={b.w} height="2.4" rx="1" fill="currentColor" />;
        })}
      </svg>
    );
  }
  const gy = m === "top" ? 3.5 : m === "bottom" ? 12.5 : 8;
  const bars = [{ x: 4, h: 9 }, { x: 9.6, h: 6 }];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <line x1={2} y1={gy} x2={14} y2={gy} {...line} />
      {bars.map((b, i) => {
        const y = m === "top" ? gy : m === "bottom" ? gy - b.h : gy - b.h / 2;
        return <rect key={i} x={b.x} y={y} width="2.4" height={b.h} rx="1" fill="currentColor" />;
      })}
    </svg>
  );
};

const ALIGN_MODES = [
  { m: "left", title: "Align left" }, { m: "centerH", title: "Align horizontal centers" },
  { m: "right", title: "Align right" }, { div: true },
  { m: "top", title: "Align top" }, { m: "middle", title: "Align vertical centers" },
  { m: "bottom", title: "Align bottom" },
];
/* Shared Align/Distribute panel used by both multi-node and multi-zone selections. */
const AlignControls = ({ onAlign, onDistribute, canDistribute }) => (
  <>
    <h5>Align</h5>
    <div className="ew-align">
      {ALIGN_MODES.map((a, i) => (a.div
        ? <span key={i} className="ew-adiv" />
        : <button key={a.m} className="ew-abtn" title={a.title} onClick={() => onAlign(a.m)}><AlignIcon m={a.m} /></button>))}
    </div>
    <h5>Distribute</h5>
    <div className="ew-btnrow">
      <button className="ew-btn" disabled={!canDistribute} onClick={() => onDistribute("h")}>Horizontally</button>
      <button className="ew-btn" disabled={!canDistribute} onClick={() => onDistribute("v")}>Vertically</button>
    </div>
    {!canDistribute && <p className="ew-ihint">Select 3+ to distribute evenly.</p>}
  </>
);

/* ---- persistence (autosave board + user-saved seed presets) ---- */
const BOARD_KEY = "ew-board";
const seedKey = (k) => `ew-seed-${k}`;
const readJSON = (key) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const writeJSON = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota / disabled */ } };

/* Serialize the current board into a SEEDS-shaped JS literal, ready to paste as
   a `SEEDS.<key>` entry in whiteboardTypes.js (version-controlled defaults).
   Edges use compact [s, e] / [s, e, label] tuples, or an object when they carry
   manual waypoints; the seed loader accepts both forms. */
const nz = (v) => Math.round(v || 0);
const seedNodeStr = (n) => {
  const p = [`id: ${JSON.stringify(n.id)}`, `type: ${JSON.stringify(n.type)}`, `x: ${nz(n.x)}`, `y: ${nz(n.y)}`];
  if (n.title) p.push(`title: ${JSON.stringify(n.title)}`);
  if (n.sub) p.push(`sub: ${JSON.stringify(n.sub)}`);
  if (n.color) p.push(`color: ${JSON.stringify(n.color)}`);
  if (n.w) p.push(`w: ${nz(n.w)}`);
  if (n.h) p.push(`h: ${nz(n.h)}`);
  if (n.props && Object.keys(n.props).length) p.push(`props: ${JSON.stringify(n.props)}`);
  return `      { ${p.join(", ")} },`;
};
const seedEdgeStr = (e) => {
  const hasPts = e.pts && e.pts.length;
  if (hasPts || e.bi || e.color) return `      { s: ${JSON.stringify(e.s)}, e: ${JSON.stringify(e.e)}${e.lbl ? `, lbl: ${JSON.stringify(e.lbl)}` : ""}${e.bi ? ", bi: true" : ""}${e.color ? `, color: ${JSON.stringify(e.color)}` : ""}${hasPts ? `, pts: ${JSON.stringify(e.pts)}` : ""} },`;
  return e.lbl
    ? `      [${JSON.stringify(e.s)}, ${JSON.stringify(e.e)}, ${JSON.stringify(e.lbl)}],`
    : `      [${JSON.stringify(e.s)}, ${JSON.stringify(e.e)}],`;
};
const seedZoneStr = (z) =>
  `      { id: ${JSON.stringify(z.id)}, x: ${nz(z.x)}, y: ${nz(z.y)}, w: ${nz(z.w)}, h: ${nz(z.h)}, label: ${JSON.stringify(z.label)}, color: ${JSON.stringify(z.color)} },`;
const toSeedCode = (nodes, edges, zones) => [
  "{",
  "    zones: [", ...zones.map(seedZoneStr), "    ],",
  "    nodes: [", ...nodes.map(seedNodeStr), "    ],",
  "    edges: [", ...edges.map(seedEdgeStr), "    ],",
  "  }",
].join("\n");

/* ---------------- component ---------------- */

export default function ElasticWhiteboard({ height = "100%" }) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const stages = isDark ? STAGE_PALETTES.dark : STAGE_PALETTES.light;
  const surface = isDark ? SURFACES.dark : SURFACES.light;

  // hydrate once from the last autosaved board, falling back to the reference seed
  const bootRef = useRef();
  if (bootRef.current === undefined) bootRef.current = readJSON(BOARD_KEY) || null;
  const boot = bootRef.current;

  const [nodes, setNodes] = useState(() => boot?.nodes || clone(SEEDS.reference.nodes));
  const [edges, setEdges] = useState(() => boot?.edges || SEEDS.reference.edges.map(([s, e], i) => ({ id: `e${i}`, s, e })));
  const [zones, setZones] = useState(() => boot?.zones || []);
  const [view, setView]   = useState(() => boot?.view || { x: 30, y: 20, k: 0.85 });
  const [sel, setSel]     = useState(null);      // {kind:'nodes',ids} | {kind:'edge'|'zone',id}
  const [hover, setHover] = useState(null);
  const [connect, setConnect] = useState(null);  // {from,cx,cy} world coords
  const [ghost, setGhost] = useState(null);      // palette drag {type,cx,cy} client coords
  const [editing, setEditing] = useState(null);  // node id being renamed
  const [marquee, setMarquee] = useState(null);  // {x0,y0,x1,y1} world coords
  const [q, setQ] = useState("");
  const [styleClip, setStyleClip] = useState(null); // copied node style {color,w,h}
  const [openCats, setOpenCats] = useState(() => new Set(CATS.filter((c) => c !== "General")));
  const [patternCfg, setPatternCfg] = useState(null); // { id, fill } while configuring a Patterns block
  const [seedMenu, setSeedMenu] = useState(false);    // preset save/reset dropdown open
  const [fileMenu, setFileMenu] = useState(false);    // export/import dropdown open
  const [seedNote, setSeedNote] = useState("");       // transient "saved" confirmation
  const [routeTick, setRouteTick] = useState(0);     // forces a full re-route after a drag ends

  /* ---------- AI chat ---------- */
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([]);   // {role:'user'|'ai'|'error', text}
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [provider, setProvider] = useState(() => localStorage.getItem("ew-llm-provider") || "anthropic");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("ew-anthropic-key") || "");
  const [model, setModel] = useState(() => localStorage.getItem("ew-anthropic-model") || "claude-sonnet-5");
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem("ew-proxy-url") || "");
  const [proxyToken, setProxyToken] = useState(() => localStorage.getItem("ew-proxy-token") || "");
  const chatLogRef = useRef(null);
  const viewportRef = useRef(null);
  const fileRef = useRef(null);
  const dragRef = useRef(null);
  const lastClickRef = useRef({ id: null, t: 0 });

  const nodeById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const zoneById = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);
  // Connectors may terminate on a node or a zone; resolve either to a rect.
  const endpointRect = (id) => {
    const n = nodeById[id];
    if (n) return rectOf(n);
    const z = zoneById[id];
    return z ? { x: z.x, y: z.y, w: z.w, h: z.h } : null;
  };
  const endpointName = (id) => {
    const n = nodeById[id];
    if (n) return n.title || TYPES[n.type].label;
    const z = zoneById[id];
    return z ? z.label : "?";
  };
  const docRef = useRef(null);
  docRef.current = { nodes, edges, zones };
  const sectionsRef = useRef(boot?.sections || {}); // sectionId -> { template, fill, keys, zoneId } for incremental AI edits

  /* ---------- history ---------- */
  const restore = (doc) => { setNodes(doc.nodes); setEdges(doc.edges); setZones(doc.zones); setSel(null); };
  const { snapshot, snapGuard, undo, redo, canUndo, canRedo } = useHistory(docRef, restore);

  /* ---------- autosave (survives page refresh) ---------- */
  useEffect(() => {
    const t = setTimeout(() => writeJSON(BOARD_KEY, { nodes, edges, zones, view, sections: sectionsRef.current }), 300);
    return () => clearTimeout(t);
  }, [nodes, edges, zones, view]);

  /* ---------- coords ---------- */
  const toWorld = (clientX, clientY) => {
    const r = viewportRef.current.getBoundingClientRect();
    return { x: (clientX - r.left - view.x) / view.k, y: (clientY - r.top - view.y) / view.k };
  };

  /* ---------- wheel zoom ---------- */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      setView((v) => {
        const k = Math.min(2, Math.max(0.3, v.k * Math.exp(-e.deltaY * 0.0012)));
        const r = el.getBoundingClientRect();
        const cx = e.clientX - r.left, cy = e.clientY - r.top;
        return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (e.key === "Escape") {
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") document.activeElement.blur();
        setSel(null); setConnect(null); setEditing(null); setMarquee(null); dragRef.current = null;
        return;
      }
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSel(); return; }
      if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (sel && sel.kind === "nodes" && sel.ids.length) copyStyle(nodeById[sel.ids[0]]);
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (sel && sel.kind === "nodes") applyStyle(sel.ids);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        deleteSel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // re-bound every render so handlers see fresh state

  const deleteSel = () => {
    if (!sel) return;
    snapshot();
    if (sel.kind === "nodes") {
      setNodes((ns) => ns.filter((n) => !sel.ids.includes(n.id)));
      setEdges((es) => es.filter((ed) => !sel.ids.includes(ed.s) && !sel.ids.includes(ed.e)));
    } else if (sel.kind === "edge") {
      setEdges((es) => es.filter((ed) => ed.id !== sel.id));
    } else if (sel.kind === "zone") {
      setZones((zs) => zs.filter((z) => z.id !== sel.id));
    } else if (sel.kind === "zones") {
      setZones((zs) => zs.filter((z) => !sel.ids.includes(z.id)));
    }
    setSel(null);
  };

  /* copy a node's visual style (accent + effective size); apply it to any
     node selection. A null color means "inherit the type's stage color". */
  const copyStyle = (n) => {
    if (!n) return;
    const r = rectOf(n);
    setStyleClip({ color: n.color ?? null, w: r.w, h: r.h });
  };
  const applyStyle = (ids) => {
    if (!styleClip || !ids || !ids.length) return;
    snapshot();
    setNodes((ns) => ns.map((m) => (ids.includes(m.id)
      ? { ...m, color: styleClip.color ?? undefined, w: styleClip.w, h: styleClip.h }
      : m)));
  };

  const duplicateSel = () => {
    if (!sel || sel.kind !== "nodes") return;
    snapshot();
    const clones = [];
    setNodes((ns) => {
      const out = [...ns];
      for (const id of sel.ids) {
        const n = ns.find((x) => x.id === id);
        if (!n) continue;
        const c = clone(n);
        c.id = uid("n"); c.x += 24; c.y += 24;
        clones.push(c.id); out.push(c);
      }
      return out;
    });
    if (clones.length) setSel({ kind: "nodes", ids: clones });
  };

  const nodeRects = () => sel.ids.map((id) => ({ id, ...rectOf(nodeById[id]) }));

  /* Align 2+ selected nodes to a shared edge/center of their bounding box. */
  const alignNodes = (mode) => {
    if (!sel || sel.kind !== "nodes" || sel.ids.length < 2) return;
    const pos = computeAlign(nodeRects(), mode);
    snapshot();
    setNodes((ns) => ns.map((n) => (pos[n.id] ? { ...n, ...pos[n.id] } : n)));
  };

  /* Distribute 3+ selected nodes with equal gaps between them. axis: "h"|"v". */
  const distributeNodes = (axis) => {
    if (!sel || sel.kind !== "nodes" || sel.ids.length < 3) return;
    const pos = computeDistribute(nodeRects(), axis);
    snapshot();
    setNodes((ns) => ns.map((n) => (pos[n.id] ? { ...n, ...pos[n.id] } : n)));
  };

  /* Nodes whose center sits inside a zone (mirrors zone-drag capture). */
  const nodesInZone = (z) => nodes.filter((n) => {
    const r = rectOf(n), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    return cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h;
  });

  /* Apply a zone-position map, shifting each zone's contents by the same delta
     so aligned/distributed zones keep the nodes they contain. */
  const moveZones = (pos) => {
    const shift = {};
    for (const z of zones) {
      const p = pos[z.id];
      if (!p) continue;
      const dx = (p.x != null ? p.x : z.x) - z.x, dy = (p.y != null ? p.y : z.y) - z.y;
      if (dx || dy) for (const n of nodesInZone(z)) shift[n.id] = { dx, dy };
    }
    snapshot();
    setZones((zs) => zs.map((z) => (pos[z.id] ? { ...z, ...pos[z.id] } : z)));
    setNodes((ns) => ns.map((n) => (shift[n.id]
      ? { ...n, x: snap(n.x + shift[n.id].dx), y: snap(n.y + shift[n.id].dy) } : n)));
  };
  const zoneRects = () => sel.ids.map((id) => zoneById[id]).filter(Boolean)
    .map((z) => ({ id: z.id, x: z.x, y: z.y, w: z.w, h: z.h }));
  const alignZones = (mode) => {
    if (!sel || sel.kind !== "zones" || sel.ids.length < 2) return;
    moveZones(computeAlign(zoneRects(), mode));
  };
  const distributeZones = (axis) => {
    if (!sel || sel.kind !== "zones" || sel.ids.length < 3) return;
    moveZones(computeDistribute(zoneRects(), axis));
  };

  /* ---------- AI: apply a model-generated document/edit ---------- */
  useEffect(() => { localStorage.setItem("ew-llm-provider", provider); }, [provider]);
  useEffect(() => { localStorage.setItem("ew-anthropic-key", apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem("ew-anthropic-model", model); }, [model]);
  useEffect(() => { localStorage.setItem("ew-proxy-url", proxyUrl); }, [proxyUrl]);
  useEffect(() => { localStorage.setItem("ew-proxy-token", proxyToken); }, [proxyToken]);

  useEffect(() => {
    const el = chatLogRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMsgs, chatBusy]);

  /* Push a fully-built board + its section metadata into state (one undoable
     step). Used by both the first (from-scratch) AI build and manual inserts. */
  const commitBoard = (board, meta) => {
    docRef.current = board;
    sectionsRef.current = meta;
    setNodes(board.nodes);
    setEdges(board.edges);
    setZones(board.zones);
    setSel(null);
    setTimeout(() => fit(), 40);
  };

  const ownsId = (id, sid) => id === `${sid}__zone` || id.startsWith(`${sid}__`);
  const boxOf = (ns, zs) => {
    const boxes = [...zs, ...ns.map((n) => rectOf(n))];
    if (!boxes.length) return null;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const b of boxes) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
    return { x0, y0, x1, y1 };
  };
  // Shift a fresh instance so its bounding box top-left sits at (x, y).
  const shiftInst = (inst, x, y) => {
    const dx = snap(x) - inst.bbox.x, dy = snap(y) - inst.bbox.y;
    return {
      nodes: inst.nodes.map((n) => ({ ...n, x: snap(n.x + dx), y: snap(n.y + dy) })),
      zone: inst.zone ? { ...inst.zone, x: snap(inst.zone.x + dx), y: snap(inst.zone.y + dy) } : null,
      // waypoints are absolute, so they must move with the section too
      edges: inst.edges.map((e) => (e.pts ? { ...e, pts: e.pts.map((p) => ({ x: snap(p.x + dx), y: snap(p.y + dy) })) } : e)),
      keys: inst.keys, bbox: { x: snap(x), y: snap(y), w: inst.bbox.w, h: inst.bbox.h },
    };
  };

  /* Interpret the edit_whiteboard tool payload. On an empty board this lays out
     the whole design deterministically. On an existing board it edits
     incrementally: unchanged sections stay exactly where the user put them
     (drags + waypoints preserved), changed sections re-render in place, new
     sections are placed alongside, and cross-section flows are rebuilt. */
  const applyAI = (res) => {
    if (!res || typeof res !== "object") return null;
    const incoming = (Array.isArray(res.sections) ? res.sections : [])
      .filter((s) => s && s.template && TEMPLATES_OK.has(s.template))
      .map((s, i) => ({ id: s.id || `${s.template}${i}`, template: s.template, ...(s.row ? { row: true } : {}),
                        fill: { ...(s.fill || {}), ...(s.label ? { label: s.label } : {}) } }));
    const removeIds = new Set(res.remove || []);
    if (!incoming.length && !removeIds.size) return null;

    // prune tracked sections that no longer exist on the board (undo / manual delete)
    const present = new Set([...docRef.current.nodes.map((n) => n.id), ...docRef.current.zones.map((z) => z.id)]);
    const secs = {};
    for (const [sid, m] of Object.entries(sectionsRef.current)) {
      if (Object.values(m.keys).some((id) => present.has(id)) || (m.zoneId && present.has(m.zoneId))) secs[sid] = m;
    }

    snapshot();

    // First build (nothing tracked yet): full deterministic lane layout.
    if (!Object.keys(secs).length) {
      const board = buildFromSections(incoming, res.edges || []);
      commitBoard({ nodes: board.nodes, edges: board.edges, zones: board.zones }, board.meta);
      return board;
    }

    // ---- incremental edit ----
    const incomingById = new Map(incoming.map((s) => [s.id, s]));
    const sameFill = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const rebuild = new Set(), keep = new Set();
    for (const sid of Object.keys(secs)) {
      if (removeIds.has(sid)) continue;
      const inc = incomingById.get(sid);
      if (!inc) { keep.add(sid); continue; }
      if (inc.template === secs[sid].template && sameFill(inc.fill, secs[sid].fill)) keep.add(sid);
      else rebuild.add(sid);
    }
    const news = incoming.filter((s) => !secs[s.id] && !removeIds.has(s.id));
    const gone = new Set([...removeIds, ...rebuild]);
    const goneOwns = (id) => [...gone].some((sid) => ownsId(id, sid));

    const cur = docRef.current;
    let nodes = cur.nodes.filter((n) => !goneOwns(n.id));
    let zones = cur.zones.filter((z) => !goneOwns(z.id));
    const oldCrossPts = {}; // preserve user-shaped bends on rebuilt AI flows
    let edges = cur.edges.filter((ed) => {
      if (String(ed.id).startsWith("x")) { if (ed.pts) oldCrossPts[`${ed.s}|${ed.e}`] = ed.pts; return false; }
      return !goneOwns(ed.s) && !goneOwns(ed.e);
    });

    const meta = {};
    for (const sid of keep) meta[sid] = secs[sid];

    // rebuild changed sections anchored to their current top-left node
    for (const sid of rebuild) {
      const inc = incomingById.get(sid);
      const fresh = instantiateTemplate(inc.template, inc.fill, { x: 0, y: 0 }, sid);
      if (!fresh || !fresh.nodes.length) continue;
      const lmx = Math.min(...fresh.nodes.map((n) => n.x)), lmy = Math.min(...fresh.nodes.map((n) => n.y));
      const old = cur.nodes.filter((n) => n.id.startsWith(`${sid}__`));
      const cmx = Math.min(...old.map((n) => n.x)), cmy = Math.min(...old.map((n) => n.y));
      const inst = instantiateTemplate(inc.template, inc.fill, { x: cmx - lmx, y: cmy - lmy }, sid);
      nodes.push(...inst.nodes); edges.push(...inst.edges); if (inst.zone) zones.push(inst.zone);
      meta[sid] = { template: inc.template, fill: inc.fill, keys: inst.keys, zoneId: inst.zone ? inst.zone.id : null };
    }

    // place new sections in a fresh column to the right of existing content
    let box = boxOf(nodes, zones);
    let curY = box ? box.y0 : 80;
    const rightX = box ? box.x1 + 160 : 80;
    for (const s of news) {
      const inst0 = instantiateTemplate(s.template, s.fill, { x: 0, y: 0 }, s.id);
      if (!inst0 || !inst0.nodes.length) continue;
      const p = shiftInst(inst0, rightX, curY);
      nodes.push(...p.nodes); edges.push(...p.edges); if (p.zone) zones.push(p.zone);
      meta[s.id] = { template: s.template, fill: s.fill, keys: p.keys, zoneId: p.zone ? p.zone.id : null };
      curY = p.bbox.y + p.bbox.h + 90;
    }

    // rebuild cross-section flows for the resulting section set
    (res.edges || []).forEach((e, i) => {
      const s = sectionEndpoint(e.source, "out", meta), t = sectionEndpoint(e.target, "in", meta);
      if (!s || !t || s === t) return;
      const pts = oldCrossPts[`${s}|${t}`];
      edges.push({ id: uid("x"), s, e: t, ...(e.label ? { lbl: e.label } : {}), ...(pts ? { pts } : {}) });
    });

    const board = { nodes, edges, zones };
    commitBoard(board, meta);
    return board;
  };

  /* Insert a deterministic template block at a free spot on the canvas and track
     it as a section so the AI can later reference/modify it. */
  const insertTemplate = (templateId, fill) => {
    const sid = uid("sec");
    const inst = instantiateTemplate(templateId, fill || {}, { x: 0, y: 0 }, sid);
    if (!inst || !inst.nodes.length) return;
    snapshot();
    const b = bbox();
    const p = shiftInst(inst, b ? b.x1 + 140 : 80, b ? b.y0 : 80);
    setNodes((ns) => [...ns, ...p.nodes]);
    setEdges((es) => [...es, ...p.edges]);
    if (p.zone) setZones((zs) => [...zs, p.zone]);
    sectionsRef.current = { ...sectionsRef.current,
      [sid]: { template: templateId, fill: fill || {}, keys: p.keys, zoneId: p.zone ? p.zone.id : null } };
    setSel(null);
    setTimeout(() => fit(), 40);
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    const missingCreds = provider === "proxy" ? (!proxyUrl || !proxyToken) : !apiKey;
    if (missingCreds) { setShowChatSettings(true); return; }
    setChatInput("");
    const history = [...chatMsgs, { role: "user", text }];
    setChatMsgs(history);
    setChatBusy(true);
    try {
      const cfg = { provider, apiKey, model, proxyUrl, proxyToken };
      const convo = history
        .filter((m) => m.role === "user" || m.role === "ai")
        .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));

      const sys = systemPrompt(WB_CATALOG, describeDoc(docRef.current, TYPES) + describeSections(sectionsRef.current));
      const out = await runLLM(cfg, { system: sys, messages: convo, tools: WB_TOOL });
      const board = applyAI(out);
      if (!board) throw new Error("The model didn't return any sections to build.");
      setChatMsgs((m) => [...m, { role: "ai", text: out.message || "Done." }]);
    } catch (err) {
      setChatMsgs((m) => [...m, { role: "error", text: err.message || String(err) }]);
    } finally {
      setChatBusy(false);
    }
  };

  /* ---------- gestures ---------- */

  const { startPan, startMove, startResize, startConnect, startZoneMove, startZoneResize,
          startPalette, startEdgePoint, onMove, onUp } = useDragController({
    dragRef, viewportRef, lastClickRef,
    view, sel, nodes, edges, zones, nodeById,
    setView, setMarquee, setSel, setNodes, setZones, setEdges, setConnect, setGhost, setEditing, setRouteTick,
    toWorld, snapshot, uid, rectOf,
  });

  /* ---------- toolbar ---------- */

  /* Load a preset: a user-saved custom version if present, else the built-in. */
  const loadSeed = (key) => {
    snapshot();
    const custom = readJSON(seedKey(key));
    if (custom && Array.isArray(custom.nodes)) {
      setNodes(clone(custom.nodes));
      setEdges(clone(custom.edges || []));
      setZones(clone(custom.zones || []));
      sectionsRef.current = custom.sections ? clone(custom.sections) : {};
    } else {
      const s = SEEDS[key];
      setNodes(clone(s.nodes));
      setEdges(s.edges.map((ed, i) => Array.isArray(ed)
        ? { id: `e${i}`, s: ed[0], e: ed[1], lbl: ed[2] }
        : { id: `e${i}`, s: ed.s, e: ed.e, lbl: ed.lbl, ...(ed.pts ? { pts: ed.pts } : {}), ...(ed.bi ? { bi: true } : {}), ...(ed.color ? { color: ed.color } : {}) }));
      setZones(clone(s.zones));
      sectionsRef.current = {};
    }
    setSel(null);
    setTimeout(() => fit(), 40);
  };

  /* Copy the current board as pasteable SEEDS code (falls back to a download if
     the clipboard is unavailable). Drop it into SEEDS in whiteboardTypes.js. */
  const copySeedCode = () => {
    const code = toSeedCode(nodes, edges, zones);
    setSeedMenu(false);
    const ok = () => flashSeedNote("Seed code copied — paste into whiteboardTypes.js");
    const fallback = () => {
      const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url; a.download = "whiteboard-seed.txt"; a.click();
      URL.revokeObjectURL(url);
      flashSeedNote("Seed code downloaded");
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(ok, fallback);
    else fallback();
  };

  const flashSeedNote = (msg) => { setSeedNote(msg); setTimeout(() => setSeedNote(""), 1800); };

  /* Save the current board as the custom Reference / Air-gapped preset. */
  const saveSeed = (key, label) => {
    writeJSON(seedKey(key), { nodes: clone(nodes), edges: clone(edges), zones: clone(zones), sections: clone(sectionsRef.current) });
    setSeedMenu(false);
    flashSeedNote(`Saved current board as ${label}`);
  };

  /* Forget a custom preset so the button loads the built-in default again. */
  const resetSeed = (key, label) => {
    try { localStorage.removeItem(seedKey(key)); } catch { /* disabled */ }
    setSeedMenu(false);
    flashSeedNote(`${label} reset to default`);
  };

  const hasCustom = (key) => !!readJSON(seedKey(key));
  const clearAll = () => { snapshot(); setNodes([]); setEdges([]); setZones([]); sectionsRef.current = {}; setSel(null); };

  const addZone = () => {
    snapshot();
    const el = viewportRef.current;
    const cx = (el.clientWidth / 2 - view.x) / view.k;
    const cy = (el.clientHeight / 2 - view.y) / view.k;
    const id = uid("z");
    setZones((zs) => [...zs, { id, x: snap(cx - 220), y: snap(cy - 150), w: 440, h: 300, label: "Zone", color: "#FEC514" }]);
    setSel({ kind: "zone", id });
  };

  const dl = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportJSON = () => {
    // Edges with a label, a hand-shaped path, or a zone endpoint are serialized
    // as objects; plain node-to-node edges stay compact [s, e] tuples.
    const serEdge = ({ s, e, lbl, pts }) =>
      (pts || zoneIdSet.has(s) || zoneIdSet.has(e))
        ? { s, e, ...(lbl ? { lbl } : {}), ...(pts ? { pts } : {}) }
        : (lbl ? [s, e, lbl] : [s, e]);
    dl(new Blob([JSON.stringify({ nodes, edges: edges.map(serEdge), zones }, null, 2)],
       { type: "application/json" }), "elastic-whiteboard.json");
  };
  const importJSON = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error("bad shape");
        snapshot();
        setNodes(data.nodes.filter((n) => TYPES[n.type]));
        setEdges(data.edges.map((ed, i) => Array.isArray(ed)
          ? { id: `e${i}`, s: ed[0], e: ed[1], lbl: ed[2] }
          : { id: `e${i}`, s: ed.s, e: ed.e, lbl: ed.lbl, ...(ed.pts ? { pts: ed.pts } : {}), ...(ed.bi ? { bi: true } : {}), ...(ed.color ? { color: ed.color } : {}) }));
        setZones(Array.isArray(data.zones) ? data.zones : []);
        sectionsRef.current = {};
        setSel(null);
      } catch { /* ignore malformed files */ }
    };
    rd.readAsText(f);
    e.target.value = "";
  };

  const zoomBy = (f) =>
    setView((v) => {
      const el = viewportRef.current;
      const k = Math.min(2, Math.max(0.3, v.k * f));
      const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });

  const bbox = () => {
    const boxes = [...zones, ...nodes.map((n) => rectOf(n))];
    if (!boxes.length) return null;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const b of boxes) {
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
    }
    return { x0, y0, x1, y1 };
  };
  const fit = () => {
    const bb = bbox();
    if (!bb) return;
    const el = viewportRef.current;
    const pad = 60, bw = bb.x1 - bb.x0 + pad * 2, bh = bb.y1 - bb.y0 + pad * 2;
    const k = Math.min(1.25, el.clientWidth / bw, el.clientHeight / bh);
    setView({ k, x: (el.clientWidth - (bb.x1 - bb.x0) * k) / 2 - bb.x0 * k,
                 y: (el.clientHeight - (bb.y1 - bb.y0) * k) / 2 - bb.y0 * k });
  };

  /* ---------- image export ---------- */

  const buildSVG = () => {
    const bb = bbox();
    if (!bb) return null;
    const pad = 48;
    const x0 = bb.x0 - pad, y0 = bb.y0 - pad, W = bb.x1 - bb.x0 + pad * 2, H = bb.y1 - bb.y0 + pad * 2;
    const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${W} ${H}" width="${W}" height="${H}" font-family="'Inter',system-ui,sans-serif">`;
    out += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${surface.bg}"/>`;
    out += `<defs><marker id="xarr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>`;
    for (const z of zones) {
      out += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="14" fill="${z.color}" fill-opacity="0.045" stroke="${z.color}" stroke-opacity=".6" stroke-dasharray="7 5"/>`;
      out += `<text x="${z.x + 16}" y="${z.y - 8}" font-family="'Space Mono',monospace" font-size="11" letter-spacing="2" fill="${z.color}">${esc(z.label.toUpperCase())}</text>`;
    }
    for (const ed of edgeGeo) {
      out += `<path d="${ed.d}" fill="none" stroke="${ed.color}" stroke-width="1.8" stroke-linecap="round" ${ed.dashed ? 'stroke-dasharray="5 6"' : ""} marker-end="url(#xarr)"${ed.bi ? ` marker-start="url(#xarr)"` : ""}/>`;
      if (ed.lbl) out += `<text x="${ed.mid.x}" y="${ed.mid.y - 7}" text-anchor="middle" font-family="'Space Mono',monospace" font-size="11" fill="${surface.muted}" stroke="${surface.bg}" stroke-width="4" paint-order="stroke">${esc(ed.lbl)}</text>`;
    }
    for (const n of nodes) {
      const t = TYPES[n.type], r = rectOf(n), tag = nodeTag(n, stages);
      out += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="10" fill="${surface.panel}" stroke="${surface.line}"/>`;
      out += `<rect x="${r.x - 1}" y="${r.y + 10}" width="3" height="${Math.max(6, r.h - 20)}" rx="2" fill="${tag}"/>`;
      let tx = r.x + 14;
      if (n.logo) { out += `<image x="${tx}" y="${r.y + 11}" width="24" height="24" href="${esc(n.logo)}"/>`; tx += 33; }
      const availW = r.x + r.w - tx - 8;
      out += `<text x="${tx}" y="${r.y + 25}" font-family="'Mier B','Inter',sans-serif" font-size="14" fill="${surface.ink}">${esc((n.title || t.label).slice(0, Math.floor(availW / 7.6)))}</text>`;
      const sub = nodeSub(n);
      if (sub) out += `<text x="${tx}" y="${r.y + 40}" font-size="11" fill="${surface.muted}">${esc(sub.slice(0, Math.floor(availW / 5.7)))}</text>`;
      let cx = tx, cy = r.y + (sub ? 48 : 42);
      for (const c of fieldChips(n)) {
        const w = Math.round(c.length * 5.9) + 14;
        if (cx + w > r.x + r.w - 8 || cy + 15 > r.y + r.h - 4) break;
        out += `<rect x="${cx}" y="${cy}" width="${w}" height="14" rx="7" fill="${surface.panel2}" stroke="${surface.line}"/>`;
        out += `<text x="${cx + 7}" y="${cy + 10.5}" font-family="'Space Mono',monospace" font-size="9.5" fill="${surface.muted}">${esc(c)}</text>`;
        cx += w + 4;
      }
    }
    out += "</svg>";
    return out;
  };
  const exportSVG = () => {
    const svg = buildSVG();
    if (svg) dl(new Blob([svg], { type: "image/svg+xml" }), "elastic-whiteboard.svg");
  };
  const exportPNG = () => {
    const svg = buildSVG();
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        const scale = 2;
        c.width = img.width * scale; c.height = img.height * scale;
        const g = c.getContext("2d");
        g.scale(scale, scale);
        g.drawImage(img, 0, 0);
        c.toBlob((b) => {
          if (b) dl(b, "elastic-whiteboard.png");
          else dl(blob, "elastic-whiteboard.svg");   /* tainted canvas fallback */
          URL.revokeObjectURL(url);
        }, "image/png");
      } catch { dl(blob, "elastic-whiteboard.svg"); URL.revokeObjectURL(url); }
    };
    img.onerror = () => { dl(blob, "elastic-whiteboard.svg"); URL.revokeObjectURL(url); };
    img.src = url;
  };

  /* ---------- derived ---------- */

  const connected = useMemo(() => {
    if (!hover || dragRef.current) return null;
    const keep = new Set([hover]);
    for (const ed of edges) if (ed.s === hover || ed.e === hover) { keep.add(ed.s); keep.add(ed.e); }
    return keep;
  }, [hover, edges]);

  const zoneIdSet = useMemo(() => new Set(zones.map((z) => z.id)), [zones]);

  // Edge geometry: a simple orthogonal elbow between endpoints (nodes or zones),
  // honouring any manual waypoints the user has dragged. No obstacle routing.
  const edgeGeo = useMemo(() => edges
    .filter((ed) => endpointRect(ed.s) && endpointRect(ed.e))
    .map((ed) => {
      const a = nodeById[ed.s], b = nodeById[ed.e];
      const pl = elbowPath(endpointRect(ed.s), endpointRect(ed.e), ed.pts);
      const mid = plMid(pl);
      const src = a || b;                          // colour from whichever end is a node
      const dashed = (a && TYPES[a.type].ops) || (b && TYPES[b.type].ops) || false;
      // Per-edge override wins; otherwise inherit the source node's category accent.
      const color = ed.color || (src ? nodeTag(src, stages) : stages.ops);
      return { ...ed, d: roundedPath(pl), mid, len: mid.total, color, dashed };
    }), [edges, nodeById, zoneById, stages]);

  // wire canvas sized to content (+margin) so nothing clips on wide diagrams
  const wireBox = useMemo(() => {
    const boxes = [...zones, ...nodes.map((n) => rectOf(n))];
    if (!boxes.length) return { x: 0, y: 0, w: 4200, h: 2800 };
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const b of boxes) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
    const pad = 240;
    return { x: x0 - pad, y: y0 - pad, w: (x1 - x0) + pad * 2, h: (y1 - y0) + pad * 2 };
  }, [nodes, zones]);

  const totals = useMemo(() => {
    const t = { count: 0, cpu: 0, mem: 0 };
    for (const n of nodes) {
      const p = n.props || {};
      const mult = p.nodes || 1;
      if (p.nodes) t.count += p.nodes;
      if (p.cpu) t.cpu += p.cpu * mult;
      if (p.mem) t.mem += p.mem * mult;
    }
    return t;
  }, [nodes]);

  const tempLine = connect && endpointRect(connect.from) ? (() => {
    const A = anchor(endpointRect(connect.from), "r");
    return `M ${A.x} ${A.y} L ${connect.cx} ${connect.cy}`;
  })() : null;

  /* Remove one hand-placed waypoint from an edge (double-click a handle). */
  const removeWaypoint = (edgeId, index) => {
    snapshot();
    setEdges((es) => es.map((x) => {
      if (x.id !== edgeId) return x;
      const pts = (x.pts || []).filter((_, i) => i !== index);
      if (pts.length) return { ...x, pts };
      const { pts: _drop, ...rest } = x;
      return rest;
    }));
    setRouteTick((t) => t + 1);
  };

  /* Clear all manual waypoints on an edge (Reset shape). */
  const resetEdgeShape = (edgeId) => {
    snapshot();
    setEdges((es) => es.map((x) => { if (x.id !== edgeId) return x; const { pts: _drop, ...rest } = x; return rest; }));
    setRouteTick((t) => t + 1);
  };

  const selNodeIds = sel && sel.kind === "nodes" ? sel.ids : [];

  /* ---------- render ---------- */
  return (
    <div className={"ew-root" + (isDark ? "" : " ew-light")} style={{ height }}>
      <style>{CSS}</style>

      <div className="ew-toolbar">
        <span className="ew-title">Elastic Whiteboard</span>
        <span className="ew-menuwrap">
          <button onClick={() => setFileMenu((v) => !v)} title="Import or export the board">File ▾</button>
          {fileMenu && (
            <>
              <div className="ew-menu-backdrop" onClick={() => setFileMenu(false)} />
              <div className="ew-menu">
                <div className="ew-menu-h">Export</div>
                <button onClick={() => { exportJSON(); setFileMenu(false); }}>JSON</button>
                <button onClick={() => { exportSVG(); setFileMenu(false); }}>SVG</button>
                <button onClick={() => { exportPNG(); setFileMenu(false); }}>PNG</button>
                <div className="ew-menu-sep" />
                <div className="ew-menu-h">Import</div>
                <button onClick={() => { fileRef.current.click(); setFileMenu(false); }}>Import JSON…</button>
              </div>
            </>
          )}
        </span>
        <span className="ew-menuwrap">
          <button onClick={() => setSeedMenu((v) => !v)} title="Load, save, or reset architecture presets">Architectures ▾</button>
          {seedMenu && (
            <>
              <div className="ew-menu-backdrop" onClick={() => setSeedMenu(false)} />
              <div className="ew-menu">
                <div className="ew-menu-h">Load architecture</div>
                <button onClick={() => { loadSeed("reference"); setSeedMenu(false); }}>Reference{hasCustom("reference") ? " •" : ""}</button>
                <button onClick={() => { loadSeed("airgap"); setSeedMenu(false); }}>Air-gapped{hasCustom("airgap") ? " •" : ""}</button>
                <button onClick={() => { loadSeed("multitenant"); setSeedMenu(false); }}>Multi-tenant{hasCustom("multitenant") ? " •" : ""}</button>
                <div className="ew-menu-sep" />
                <div className="ew-menu-h">Save current board as</div>
                <button onClick={() => saveSeed("reference", "Reference")}>Reference</button>
                <button onClick={() => saveSeed("airgap", "Air-gapped")}>Air-gapped</button>
                <button onClick={() => saveSeed("multitenant", "Multi-tenant")}>Multi-tenant</button>
                <div className="ew-menu-sep" />
                <div className="ew-menu-h">Reset to built-in default</div>
                <button onClick={() => resetSeed("reference", "Reference")} disabled={!hasCustom("reference")}>Reference</button>
                <button onClick={() => resetSeed("airgap", "Air-gapped")} disabled={!hasCustom("airgap")}>Air-gapped</button>
                <button onClick={() => resetSeed("multitenant", "Multi-tenant")} disabled={!hasCustom("multitenant")}>Multi-tenant</button>
                <div className="ew-menu-sep" />
                <div className="ew-menu-h">Ship as source default</div>
                <button onClick={copySeedCode}>Copy board as SEEDS code</button>
                <div className="ew-menu-note">• marks presets with a saved custom version</div>
              </div>
            </>
          )}
        </span>
        <button onClick={clearAll}>Clear</button>
        {seedNote && <span className="ew-seednote">✓ {seedNote}</span>}
        <span className="ew-gap" />
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↺</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">↻</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importJSON} />
        <span className="ew-gap" />
        <button onClick={() => zoomBy(1 / 1.2)}>−</button>
        <span className="ew-zoom">{Math.round(view.k * 100)}%</span>
        <button onClick={() => zoomBy(1.2)}>+</button>
        <button onClick={fit}>Fit</button>
        <span className="ew-gap" />
        <button className={"ew-ai-toggle" + (chatOpen ? " on" : "")}
                onClick={() => setChatOpen((o) => !o)} title="Build with AI">✦ AI</button>
        {(totals.cpu > 0 || totals.mem > 0 || totals.count > 0) && (
          <span className="ew-totals" title="Sums per-node CPU/RAM × node counts">
            Σ{totals.count > 0 && ` ${totals.count} nodes`}{totals.cpu > 0 && ` · ${totals.cpu} vCPU`}{totals.mem > 0 && ` · ${totals.mem} GB RAM`}
          </span>
        )}
        <span className="ew-hint">shift-click multi · shift-drag select · ⌘D duplicate · ⌘Z undo · drag ring to connect</span>
      </div>

      <div className="ew-body">
        {/* palette */}
        <div className="ew-palette">
          <div className="ew-patterns">
            <div className="ew-patterns-h">Patterns</div>
            {patternCfg ? (
              <PatternConfig cfg={patternCfg} setCfg={setPatternCfg}
                onInsert={() => { insertTemplate(patternCfg.id, patternCfg.fill); setPatternCfg(null); }} />
            ) : (
              <>
                {TEMPLATE_MENU.map((t) => (
                  <button key={t.id} className="ew-pattern"
                          onClick={() => setPatternCfg({ id: t.id, fill: defaultFill(t.id) })}
                          title={`Configure and insert the ${t.label} block`}>+ {t.label}</button>
                ))}
                <button className="ew-pattern" onClick={addZone}
                        title="Add an empty zone to group components">+ Zone</button>
              </>
            )}
          </div>
          <input className="ew-search" placeholder="Search components…"
                 value={q} onChange={(e) => setQ(e.target.value)} />
          {!q.trim() && (
            <button className="ew-collapseall"
                    onClick={() => setOpenCats(openCats.size ? new Set() : new Set(CATS))}>
              {openCats.size ? "▾ Collapse all" : "▸ Expand all"}
            </button>
          )}
          {q.trim() ? (
            Object.entries(TYPES)
              .filter(([, t]) => (t.label + " " + t.sub + " " + t.cat).toLowerCase().includes(q.trim().toLowerCase()))
              .map(([key, t]) => <PaletteItem key={key} k={key} t={t} start={startPalette} stages={stages} />)
          ) : (
            CATS.map((cat) => {
              const items = Object.entries(TYPES).filter(([, t]) => t.cat === cat);
              if (!items.length) return null;
              return (
                <details key={cat} open={openCats.has(cat)} className="ew-cat">
                  <summary onClick={(e) => {
                    e.preventDefault();
                    setOpenCats((prev) => {
                      const next = new Set(prev);
                      next.has(cat) ? next.delete(cat) : next.add(cat);
                      return next;
                    });
                  }}>{cat}</summary>
                  {items.map(([key, t]) => <PaletteItem key={key} k={key} t={t} start={startPalette} stages={stages} />)}
                </details>
              );
            })
          )}
        </div>

        {/* canvas */}
        <div className="ew-viewport" ref={viewportRef}
             onPointerDown={startPan} onPointerMove={onMove} onPointerUp={onUp}>
          <div className="ew-world"
               style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.k})` }}>

            {/* zones (behind everything) */}
            {zones.map((z) => {
              const isSingle = sel && sel.kind === "zone" && sel.id === z.id;
              const isMulti = sel && sel.kind === "zones" && sel.ids.includes(z.id);
              return (
                <div key={z.id} className={"ew-zone" + (isSingle || isMulti ? " sel" : "")}
                     style={{ left: z.x, top: z.y, width: z.w, height: z.h, "--zc": z.color }}>
                  <span className="ew-zlabel" onPointerDown={(e) => startZoneMove(e, z.id)}>{z.label}</span>
                  {isSingle && <span className="ew-zport" title="Drag to connect from this zone"
                                  onPointerDown={(e) => startConnect(e, z.id)} />}
                  {isSingle && <span className="ew-zgrip" onPointerDown={(e) => startZoneResize(e, z.id)} />}
                </div>
              );
            })}

            <svg className="ew-wires" style={{ left: wireBox.x, top: wireBox.y }}
                 width={wireBox.w} height={wireBox.h}
                 viewBox={`${wireBox.x} ${wireBox.y} ${wireBox.w} ${wireBox.h}`}>
              <defs>
                {/* One arrowhead; `context-stroke` makes it match each line's own colour. */}
                <marker id="ew-arr" viewBox="0 0 10 10" refX="8" refY="5"
                        markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
                </marker>
              </defs>
              {edgeGeo.map((ed) => {
                const on = connected && (ed.s === hover || ed.e === hover);
                const dim = connected && !on;
                const isSel = sel && sel.kind === "edge" && sel.id === ed.id;
                return (
                  <g key={ed.id}>
                    <path d={ed.d} className="ew-hit"
                          onPointerDown={(e) => { e.stopPropagation(); setSel({ kind: "edge", id: ed.id }); }} />
                    <path id={`ew-${ed.id}`} d={ed.d}
                          className={"ew-edge" + (ed.dashed ? " ew-dash" : "") + (dim ? " dim" : "") + (on || isSel ? " on" : "")}
                          stroke={ed.color}
                          markerEnd="url(#ew-arr)"
                          markerStart={ed.bi ? "url(#ew-arr)" : undefined} />
                    {ed.lbl && (
                      <text x={ed.mid.x} y={ed.mid.y - 7} textAnchor="middle"
                            className={"ew-elbl" + (dim ? " dim" : "") + (on || isSel ? " on" : "")}>
                        {ed.lbl}
                      </text>
                    )}
                    <circle r="3" fill={ed.color} className={"ew-particle" + (dim ? " dim" : "")}
                            style={{ filter: `drop-shadow(0 0 4px ${ed.color})` }}>
                      <animateMotion dur={`${Math.max(3, ed.len / 95).toFixed(2)}s`} repeatCount="indefinite">
                        <mpath href={`#ew-${ed.id}`} />
                      </animateMotion>
                    </circle>
                  </g>
                );
              })}
              {sel && sel.kind === "edge" && (() => {
                const ed = edges.find((x) => x.id === sel.id);
                if (!ed) return null;
                const ra = endpointRect(ed.s), rb = endpointRect(ed.e);
                if (!ra || !rb) return null;
                const pts = ed.pts || [];
                const sc = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 };
                const tc = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 };
                const spine = [sc, ...pts, tc];
                const mids = [];
                for (let i = 0; i < spine.length - 1; i++)
                  mids.push({ x: (spine[i].x + spine[i + 1].x) / 2, y: (spine[i].y + spine[i + 1].y) / 2, at: i });
                return (
                  <g className="ew-edit">
                    {mids.map((m, i) => (
                      <circle key={"m" + i} cx={m.x} cy={m.y} r="5" className="ew-wp-add"
                              style={{ pointerEvents: "all" }}
                              onPointerDown={(e) => startEdgePoint(e, ed.id, m.at, { x: m.x, y: m.y })} />
                    ))}
                    {pts.map((p, i) => (
                      <circle key={"p" + i} cx={p.x} cy={p.y} r="6" className="ew-wp"
                              style={{ pointerEvents: "all" }}
                              onPointerDown={(e) => startEdgePoint(e, ed.id, i)}
                              onDoubleClick={(e) => { e.stopPropagation(); removeWaypoint(ed.id, i); }} />
                    ))}
                  </g>
                );
              })()}
              {tempLine && <path d={tempLine} className="ew-temp" />}
            </svg>

            {/* nodes */}
            {nodes.map((n) => {
              const t = TYPES[n.type];
              const r = rectOf(n);
              const isSel = selNodeIds.includes(n.id);
              const dim = connected && !connected.has(n.id);
              return (
                <div key={n.id}
                     className={"ew-node" + (isSel ? " sel" : "") + (dim ? " dim" : "")}
                     style={{ left: n.x, top: n.y, width: r.w, height: r.h, "--tag": nodeTag(n, stages) }}
                     onPointerDown={(e) => startMove(e, n.id)}
                     onPointerEnter={() => setHover(n.id)}
                     onPointerLeave={() => setHover(null)}>
                  {editing === n.id ? (
                    <input autoFocus defaultValue={n.title || t.label}
                           onPointerDown={(e) => e.stopPropagation()}
                           onBlur={(e) => {
                             const v = e.target.value.trim();
                             snapGuard("rename:" + n.id);
                             setNodes((ns) => ns.map((m) => (m.id === n.id ? { ...m, title: v || t.label } : m)));
                             setEditing(null);
                           }}
                           onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
                  ) : (
                    <div className="ew-nbody">
                      {n.logo && <img src={n.logo} alt="" draggable={false}
                                      onError={(e) => { e.target.style.display = "none"; }} />}
                      <div>
                        <b>{n.title || t.label}</b>
                        {nodeSub(n) && <span>{nodeSub(n)}</span>}
                        {fieldChips(n).length > 0 && (
                          <div className="ew-fchips">
                            {fieldChips(n).map((c, i) => <em key={i}>{c}</em>)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {(hover === n.id || isSel) && !editing && ["l", "r", "t", "b"].map((side) => {
                    const a = anchor({ x: 0, y: 0, w: r.w, h: r.h }, side);
                    return (
                      <span key={side} className="ew-port" style={{ left: a.x, top: a.y }}
                            onPointerDown={(e) => startConnect(e, n.id)} />
                    );
                  })}
                  {isSel && selNodeIds.length === 1 && !editing && (
                    <span className="ew-grip" onPointerDown={(e) => startResize(e, n.id)} />
                  )}
                </div>
              );
            })}

            {marquee && (
              <div className="ew-marquee" style={{
                left: Math.min(marquee.x0, marquee.x1), top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0) }} />
            )}
          </div>
        </div>

        {/* docked inspector */}
        {sel && (() => {
          /* --- edge --- */
          if (sel.kind === "edge") {
            const ed = edges.find((x) => x.id === sel.id);
            if (!ed) return null;
            const a = nodeById[ed.s], b = nodeById[ed.e];
            const hasShape = Array.isArray(ed.pts) && ed.pts.length > 0;
            const autoColor = a ? nodeTag(a, stages) : (b ? nodeTag(b, stages) : stages.ops);
            const setEd = (patch, guardKey) => {
              if (guardKey) snapGuard(guardKey); else snapshot();
              setEdges((es) => es.map((x) => (x.id === ed.id ? { ...x, ...patch } : x)));
            };
            return (
              <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
                <div className="ew-ihead">
                  <span className="ew-idot" style={{ background: ed.color || autoColor }} />
                  <div className="ew-ititle"><b>Connection</b><small>{endpointName(ed.s)} {ed.bi ? "⇄" : "→"} {endpointName(ed.e)}</small></div>
                  <button className="ew-x" onClick={() => setSel(null)}>×</button>
                </div>
                <div className="ew-iscroll">
                  <section>
                    <div className="ew-frow"><span className="ew-flabel">Label</span>
                      <input value={ed.lbl || ""} placeholder="e.g. logs & metrics"
                             onChange={(e) => setEd({ lbl: e.target.value || undefined }, "elbl:" + ed.id)} /></div>
                    <div className="ew-frow"><span className="ew-flabel">Direction</span>
                      <label className="ew-check">
                        <input type="checkbox" checked={!!ed.bi}
                               onChange={(e) => setEd({ bi: e.target.checked || undefined })} />
                        Bidirectional (arrows on both ends)
                      </label></div>
                    <div className="ew-frow"><span className="ew-flabel">Color</span>
                      <div className="ew-btnrow">
                        <input type="color" value={ed.color || autoColor}
                               onChange={(e) => setEd({ color: e.target.value }, "ecol:" + ed.id)} />
                        {ed.color && <button className="ew-btn" onClick={() => setEd({ color: undefined })}>Auto</button>}
                      </div></div>
                    <p className="ew-ihint">Drag the hollow dots on the line to bend it; drag a solid dot to move a bend, double-click it to remove.</p>
                    <div className="ew-btnrow">
                      {hasShape && <button className="ew-btn" onClick={() => resetEdgeShape(ed.id)}>Reset shape</button>}
                      <button className="ew-btn" onClick={() => setEd({ s: ed.e, e: ed.s })}>⇄ Reverse direction</button>
                      <button className="ew-btn danger" onClick={() => {
                        snapshot();
                        setEdges((es) => es.filter((x) => x.id !== ed.id));
                        setSel(null);
                      }}>Delete connection</button>
                    </div>
                  </section>
                </div>
              </div>
            );
          }
          /* --- zone --- */
          if (sel.kind === "zone") {
            const z = zones.find((x) => x.id === sel.id);
            if (!z) return null;
            const setZ = (patch) => {
              snapGuard("z:" + z.id);
              setZones((zs) => zs.map((m) => (m.id === z.id ? { ...m, ...patch } : m)));
            };
            return (
              <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
                <div className="ew-ihead">
                  <span className="ew-idot" style={{ background: z.color }} />
                  <div className="ew-ititle"><b>{z.label}</b><small>Zone</small></div>
                  <button className="ew-x" onClick={() => setSel(null)}>×</button>
                </div>
                <div className="ew-iscroll">
                  <section>
                    <div className="ew-frow"><span className="ew-flabel">Label</span>
                      <input value={z.label} onChange={(e) => setZ({ label: e.target.value })} /></div>
                    <div className="ew-frow"><span className="ew-flabel">Color</span>
                      <input type="color" value={z.color} onChange={(e) => setZ({ color: e.target.value })} /></div>
                    <div className="ew-frow"><span className="ew-flabel">Size</span>
                      <div className="ew-size">
                        <input type="number" min="160" max="2400" step="8" value={z.w}
                               onChange={(e) => setZ({ w: Math.max(160, Math.min(2400, +e.target.value || z.w)) })} />
                        <i>×</i>
                        <input type="number" min="120" max="1600" step="8" value={z.h}
                               onChange={(e) => setZ({ h: Math.max(120, Math.min(1600, +e.target.value || z.h)) })} />
                      </div></div>
                  </section>
                  <section>
                    <button className="ew-btn danger" onClick={deleteSel}>Delete zone</button>
                  </section>
                </div>
              </div>
            );
          }
          /* --- multiple zones --- */
          if (sel.kind === "zones") {
            return (
              <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
                <div className="ew-ihead">
                  <span className="ew-idot" style={{ background: "#8A9BB4" }} />
                  <div className="ew-ititle"><b>{sel.ids.length} zones selected</b><small>align & distribute</small></div>
                  <button className="ew-x" onClick={() => setSel(null)}>×</button>
                </div>
                <div className="ew-iscroll">
                  <section>
                    <AlignControls onAlign={alignZones} onDistribute={distributeZones}
                                   canDistribute={sel.ids.length >= 3} />
                    <p className="ew-ihint">Zones move their contents with them.</p>
                  </section>
                  <section>
                    <button className="ew-btn danger" onClick={deleteSel}>Delete all zones</button>
                  </section>
                </div>
              </div>
            );
          }
          /* --- multiple nodes --- */
          if (sel.ids.length > 1) {
            return (
              <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
                <div className="ew-ihead">
                  <span className="ew-idot" style={{ background: "#8A9BB4" }} />
                  <div className="ew-ititle"><b>{sel.ids.length} nodes selected</b><small>drag any to move all</small></div>
                  <button className="ew-x" onClick={() => setSel(null)}>×</button>
                </div>
                <div className="ew-iscroll">
                  <section>
                    <AlignControls onAlign={alignNodes} onDistribute={distributeNodes}
                                   canDistribute={sel.ids.length >= 3} />
                  </section>
                  <section>
                    <div className="ew-btnrow">
                      <button className="ew-btn" disabled={!styleClip} onClick={() => applyStyle(sel.ids)}
                              title="Apply the copied style to all selected (⌘⇧V)">
                        Paste style to {sel.ids.length}
                        {styleClip && <span className="ew-swatch" style={{ background: styleClip.color || "var(--muted)" }} />}
                      </button>
                    </div>
                    <div className="ew-btnrow">
                      <button className="ew-btn" onClick={duplicateSel}>Duplicate (⌘D)</button>
                      <button className="ew-btn danger" onClick={deleteSel}>Delete all</button>
                    </div>
                  </section>
                </div>
              </div>
            );
          }
          /* --- single node --- */
          const n = nodeById[sel.ids[0]];
          if (!n) return null;
          const t = TYPES[n.type];
          const r = rectOf(n);
          const set = (patch) => {
            snapGuard("n:" + n.id);
            setNodes((ns) => ns.map((m) => (m.id === n.id ? { ...m, ...patch } : m)));
          };
          const overridden = n.w != null || n.h != null || n.color || n.sub !== undefined;
          return (
            <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
              <div className="ew-ihead">
                <span className="ew-idot" style={{ background: nodeTag(n, stages) }} />
                <div className="ew-ititle"><b>{n.title || t.label}</b><small>{t.label} · {t.cat}</small></div>
                <button className="ew-x" onClick={() => setSel(null)}>×</button>
              </div>
              <div className="ew-iscroll">
                <section>
                  <h5>Identity</h5>
                  <div className="ew-frow"><span className="ew-flabel">Name</span>
                    <input value={n.title || ""} placeholder={t.label}
                           onChange={(e) => set({ title: e.target.value })} /></div>
                  <div className="ew-frow"><span className="ew-flabel">Subtitle</span>
                    <input value={n.sub !== undefined ? n.sub : t.sub} placeholder={t.sub}
                           onChange={(e) => set({ sub: e.target.value })} /></div>
                  <div className="ew-frow"><span className="ew-flabel">Logo</span>
                    <input value={n.logo && !String(n.logo).startsWith("data:") ? n.logo : ""}
                           placeholder={n.logo ? "(uploaded image)" : "https://…"}
                           onChange={(e) => set({ logo: e.target.value || undefined })} /></div>
                  <div className="ew-frow"><span className="ew-flabel" />
                    <div className="ew-btnrow">
                      <label className="ew-btn">Upload…
                        <input type="file" accept="image/*" onChange={(e) => {
                          const f = e.target.files && e.target.files[0];
                          if (!f) return;
                          const rd = new FileReader();
                          rd.onload = () => set({ logo: rd.result });
                          rd.readAsDataURL(f);
                          e.target.value = "";
                        }} />
                      </label>
                      {n.logo && <button className="ew-btn danger" onClick={() => set({ logo: undefined })}>Remove</button>}
                    </div></div>
                </section>
                <section>
                  <h5>Layout</h5>
                  <div className="ew-frow"><span className="ew-flabel">Size</span>
                    <div className="ew-size">
                      <input type="number" min="96" max="640" step="8" value={r.w}
                             onChange={(e) => set({ w: Math.max(96, Math.min(640, +e.target.value || r.w)) })} />
                      <i>×</i>
                      <input type="number" min="48" max="420" step="8" value={r.h}
                             onChange={(e) => set({ h: Math.max(48, Math.min(420, +e.target.value || r.h)) })} />
                    </div></div>
                  <div className="ew-frow"><span className="ew-flabel">Accent</span>
                    <div className="ew-btnrow">
                      <input type="color" value={nodeTag(n, stages)} onChange={(e) => set({ color: e.target.value })} />
                      {overridden && <button className="ew-btn"
                        onClick={() => set({ w: undefined, h: undefined, color: undefined, sub: undefined })}>Reset style</button>}
                    </div></div>
                  <div className="ew-frow"><span className="ew-flabel">Style</span>
                    <div className="ew-btnrow">
                      <button className="ew-btn" onClick={() => copyStyle(n)} title="Copy accent & size (⌘⇧C)">Copy style</button>
                      <button className="ew-btn" disabled={!styleClip} onClick={() => applyStyle([n.id])}
                              title="Apply the copied style (⌘⇧V)">
                        Paste style
                        {styleClip && <span className="ew-swatch" style={{ background: styleClip.color || "var(--muted)" }} />}
                      </button>
                    </div></div>
                </section>
                {t.fields && t.fields.length > 0 && (
                  <section>
                    <h5>Settings</h5>
                    {t.fields.map((f) => {
                      const v = n.props && n.props[f.key] !== undefined ? n.props[f.key]
                              : (f.def !== undefined ? f.def : "");
                      const setP = (val) => set({ props: { ...(n.props || {}), [f.key]: val } });
                      let ctrl;
                      if (f.kind === "select") ctrl = (
                        <select value={v} onChange={(e) => setP(e.target.value)}>
                          {v === "" && <option value="">—</option>}
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>);
                      else if (f.kind === "toggle") ctrl = (
                        <input type="checkbox" checked={!!v} onChange={(e) => setP(e.target.checked)} />);
                      else if (f.kind === "number") ctrl = (
                        <input type="number" min={f.min} max={f.max} value={v}
                               onChange={(e) => setP(e.target.value === "" ? "" : +e.target.value)} />);
                      else ctrl = (
                        <input value={v} placeholder={f.placeholder || ""}
                               onChange={(e) => setP(e.target.value)} />);
                      return (
                        <div className="ew-frow" key={f.key}>
                          <span className="ew-flabel">{f.label}</span>{ctrl}
                        </div>
                      );
                    })}
                  </section>
                )}
                <section>
                  <div className="ew-btnrow">
                    <button className="ew-btn" onClick={duplicateSel}>Duplicate (⌘D)</button>
                    <button className="ew-btn danger" onClick={deleteSel}>Delete node</button>
                  </div>
                </section>
              </div>
            </div>
          );
        })()}
      </div>

      {/* AI chat */}
      {chatOpen && (
        <div className="ew-chat" onPointerDown={(e) => e.stopPropagation()}>
          <div className="ew-chat-head">
            <b>✦ Build with AI</b>
            <button className="ew-chat-gear" title="Settings" onClick={() => setShowChatSettings((s) => !s)}>⚙</button>
            <button className="ew-x" onClick={() => setChatOpen(false)}>×</button>
          </div>

          {showChatSettings && (
            <div className="ew-chat-settings">
              <label className="ew-flabel">Provider</label>
              <select className="ew-chat-select" value={provider}
                      onChange={(e) => setProvider(e.target.value)}>
                <option value="anthropic">Anthropic (direct)</option>
                <option value="proxy">OpenAI-compatible proxy</option>
              </select>

              {provider === "proxy" ? (
                <>
                  <label className="ew-flabel">Endpoint URL</label>
                  <input value={proxyUrl} placeholder="https://…/v1/chat/completions"
                         onChange={(e) => setProxyUrl(e.target.value.trim())} />
                  <label className="ew-flabel">Bearer token</label>
                  <input type="password" value={proxyToken} placeholder="sk-…"
                         onChange={(e) => setProxyToken(e.target.value.trim())} />
                  <label className="ew-flabel">Model</label>
                  <input value={model} placeholder="claude-opus-4-7"
                         onChange={(e) => setModel(e.target.value.trim())} />
                  <p className="ew-chat-note">
                    Requests go to your proxy with an <code>Authorization: Bearer</code> header. The URL and token are stored in this browser (localStorage). Don’t use this on a shared computer.
                  </p>
                </>
              ) : (
                <>
                  <label className="ew-flabel">Anthropic API key</label>
                  <input type="password" value={apiKey} placeholder="sk-ant-…"
                         onChange={(e) => setApiKey(e.target.value.trim())} />
                  <label className="ew-flabel">Model</label>
                  <input value={model} placeholder="claude-sonnet-5"
                         onChange={(e) => setModel(e.target.value.trim())} />
                  <p className="ew-chat-note">
                    Your key is stored in this browser (localStorage) and sent directly to Anthropic from your machine. Don’t use this on a shared computer.
                  </p>
                </>
              )}
            </div>
          )}

          <div className="ew-chat-log" ref={chatLogRef}>
            {chatMsgs.length === 0 && !chatBusy && (
              <div className="ew-chat-empty">
                Describe an architecture and I’ll build it.
                <div className="ew-chat-chips">
                  {["Design a SIEM log ingest pipeline",
                    "Build an air-gapped Elastic deployment",
                    "Add a Kafka buffer before Elasticsearch"].map((s) => (
                    <button key={s} onClick={() => setChatInput(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {chatMsgs.map((m, i) => (
              <div key={i} className={"ew-msg " + m.role}>{m.text}</div>
            ))}
            {chatBusy && <div className="ew-msg ai ew-thinking">Thinking…</div>}
          </div>

          <div className="ew-chat-form">
            <textarea className="ew-chat-input" rows={2} value={chatInput}
                      placeholder={(provider === "proxy" ? (proxyUrl && proxyToken) : apiKey) ? "Describe or edit the diagram…" : "Add credentials (⚙) to begin…"}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }} />
            <button className="ew-chat-send" onClick={sendChat} disabled={chatBusy || !chatInput.trim()}
                    title="Send (Enter)">{chatBusy ? "…" : "Send"}</button>
          </div>
        </div>
      )}

      {/* palette drag ghost */}
      {ghost && (
        <div className="ew-ghost" style={{ left: ghost.cx, top: ghost.cy, "--tag": tagOf(TYPES[ghost.type], stages) }}>
          {TYPES[ghost.type].label}
        </div>
      )}
    </div>
  );
}

function PaletteItem({ k, t, start, stages }) {
  /* label only in the dock — the subtitle appears once on the canvas */
  return (
    <div className="ew-pitem" style={{ "--tag": tagOf(t, stages) }} title={t.sub}
         onPointerDown={(e) => start(e, k)}>
      <b>{t.label}</b>
    </div>
  );
}

/* Inline config form for a Patterns block: renders checkbox sets / toggles from
   the template's control schema, then inserts a fully deterministic block. */
function PatternConfig({ cfg, setCfg, onInsert }) {
  const conf = TEMPLATE_CONFIG[cfg.id];
  if (!conf) return null;
  const set = (key, val) => setCfg((c) => ({ ...c, fill: { ...c.fill, [key]: val } }));
  const toggleIn = (key, opt, order) => {
    const cur = cfg.fill[key] || [];
    const next = cur.includes(opt) ? cur.filter((k) => k !== opt) : [...cur, opt];
    set(key, order.filter((k) => next.includes(k))); // keep option order for determinism
  };
  const disabled = conf.controls.some((c) => c.kind === "checkset" && !c.optional && !(cfg.fill[c.key] || []).length);
  return (
    <div className="ew-pconf">
      <div className="ew-pconf-top">
        <button className="ew-pconf-back" onClick={() => setCfg(null)} title="Back to patterns">←</button>
        <span className="ew-pconf-title">{conf.label}</span>
      </div>
      {conf.controls.map((ctrl) => (
        <div key={ctrl.key} className="ew-pconf-group">
          <div className="ew-pconf-label">{ctrl.label}</div>
          {ctrl.kind === "toggle" ? (
            <label className="ew-pconf-toggle">
              <input type="checkbox" checked={!!cfg.fill[ctrl.key]} onChange={(e) => set(ctrl.key, e.target.checked)} />
              <span>{cfg.fill[ctrl.key] ? "Enabled" : "Disabled"}</span>
            </label>
          ) : (
            <div className="ew-pconf-checks">
              {ctrl.options.map(([val, lbl]) => {
                const order = ctrl.options.map((o) => o[0]);
                const on = (cfg.fill[ctrl.key] || []).includes(val);
                return (
                  <label key={val} className={"ew-pconf-chip" + (on ? " on" : "")}>
                    <input type="checkbox" checked={on} onChange={() => toggleIn(ctrl.key, val, order)} />
                    <span>{lbl}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <button className="ew-pconf-insert" onClick={onInsert} disabled={disabled}>Insert block</button>
    </div>
  );
}

const CSS = `
.ew-root{
  --bg:#0C1530; --panel:#16213F; --panel2:#0F1A38; --line:#2A3556;
  --ink:#E8EDF4; --muted:#94A3C4; --faint:#5E6C90; --accent:#48EFCF;
  --display:"Mier B","Inter",system-ui,sans-serif;
  --body:"Inter",system-ui,sans-serif;
  --mono:"Space Mono",ui-monospace,monospace;
  position:relative;
  display:flex; flex-direction:column; min-height:560px; max-height:100vh;
  background:var(--bg); color:var(--ink); font-family:var(--body);
  overflow:hidden;
}
.ew-toolbar{ display:flex; align-items:center; gap:8px; padding:10px 14px;
  border-bottom:1px solid var(--line); background:var(--panel2); flex:none; flex-wrap:wrap; }
.ew-title{ font-family:var(--display); font-weight:700; font-size:20px; margin-right:8px; }
.ew-toolbar button{ background:var(--panel); color:var(--ink); border:1px solid var(--line);
  border-radius:7px; padding:5px 12px; font-family:var(--mono); font-size:12px; cursor:pointer; }
.ew-toolbar button:hover:not(:disabled){ border-color:var(--accent); }
.ew-toolbar button:disabled{ opacity:.35; cursor:default; }
.ew-gap{ width:10px; }
.ew-zoom{ font-family:var(--mono); font-size:12px; color:var(--muted); min-width:44px; text-align:center; }
.ew-totals{ font-family:var(--mono); font-size:11.5px; color:var(--accent); margin-left:6px; }
.ew-hint{ font-family:var(--mono); font-size:10.5px; color:var(--faint); }
.ew-menuwrap{ position:relative; display:inline-flex; }
.ew-menu-backdrop{ position:fixed; inset:0; z-index:40; }
.ew-menu{ position:absolute; top:calc(100% + 6px); left:0; z-index:41; min-width:190px;
  max-height:calc(100vh - 120px); overflow:auto;
  background:var(--panel); border:1px solid var(--line); border-radius:9px; padding:6px;
  display:grid; gap:2px; box-shadow:0 12px 30px rgba(0,0,0,.35); }
.ew-menu-note{ font-size:10px; color:var(--faint); padding:4px 8px 2px; line-height:1.4; }
.ew-menu-h{ font-family:var(--mono); font-size:9.5px; letter-spacing:.08em; text-transform:uppercase;
  color:var(--faint); padding:5px 8px 3px; }
.ew-menu button{ text-align:left; width:100%; background:transparent; border:1px solid transparent;
  border-radius:6px; padding:6px 8px; color:var(--ink); font-family:var(--mono); font-size:12px; cursor:pointer; }
.ew-menu button:hover:not(:disabled){ background:var(--panel2); border-color:var(--accent); }
.ew-menu button:disabled{ opacity:.35; cursor:default; }
.ew-menu-sep{ height:1px; background:var(--line); margin:4px 2px; }
.ew-seednote{ font-family:var(--mono); font-size:11px; color:var(--accent); }
.ew-body{ display:flex; flex:1; min-height:0; }
/* Themed scrollbars for the dock panels (palette + inspector). */
.ew-palette, .ew-iscroll{ scrollbar-width:thin; scrollbar-color:var(--line) transparent; }
.ew-palette::-webkit-scrollbar, .ew-iscroll::-webkit-scrollbar{ width:10px; height:10px; }
.ew-palette::-webkit-scrollbar-track, .ew-iscroll::-webkit-scrollbar-track{ background:transparent; }
.ew-palette::-webkit-scrollbar-thumb, .ew-iscroll::-webkit-scrollbar-thumb{
  background:var(--line); border-radius:99px; border:2px solid transparent; background-clip:padding-box; }
.ew-palette::-webkit-scrollbar-thumb:hover, .ew-iscroll::-webkit-scrollbar-thumb:hover{
  background:var(--accent); background-clip:padding-box; }
.ew-palette{ width:264px; flex:none; overflow-y:auto; padding:10px;
  border-right:1px solid var(--line); background:var(--panel2); display:grid; gap:8px; align-content:start; }
.ew-patterns{ display:grid; gap:6px; padding-bottom:8px; margin-bottom:2px; border-bottom:1px solid var(--line); }
.ew-patterns-h{ font-family:var(--mono); font-size:10.5px; letter-spacing:.1em; text-transform:uppercase;
  color:var(--faint); padding:2px 2px 2px; }
.ew-pattern{ text-align:left; background:var(--panel); color:var(--ink); border:1px solid var(--line);
  border-left:3px solid var(--accent); border-radius:8px; padding:7px 10px; cursor:pointer;
  font-family:var(--display); font-weight:500; font-size:13px; }
.ew-pattern:hover{ border-color:var(--accent); }
.ew-pconf{ display:grid; gap:9px; background:var(--panel); border:1px solid var(--line);
  border-radius:8px; padding:9px; }
.ew-pconf-top{ display:flex; align-items:center; gap:7px; }
.ew-pconf-back{ background:var(--panel2); color:var(--muted); border:1px solid var(--line);
  border-radius:6px; width:24px; height:24px; cursor:pointer; font-size:13px; line-height:1; padding:0; }
.ew-pconf-back:hover{ color:var(--ink); border-color:var(--accent); }
.ew-pconf-title{ font-family:var(--display); font-weight:600; font-size:13px; color:var(--ink); }
.ew-pconf-group{ display:grid; gap:5px; }
.ew-pconf-label{ font-family:var(--mono); font-size:9.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--faint); }
.ew-pconf-checks{ display:flex; flex-wrap:wrap; gap:5px; }
.ew-pconf-chip{ display:inline-flex; align-items:center; gap:5px; padding:4px 8px; border-radius:99px;
  border:1px solid var(--line); background:var(--panel2); color:var(--muted); cursor:pointer; font-size:11.5px; user-select:none; }
.ew-pconf-chip input{ display:none; }
.ew-pconf-chip.on{ color:var(--bg); background:var(--accent); border-color:var(--accent); font-weight:600; }
.ew-pconf-toggle{ display:inline-flex; align-items:center; gap:7px; font-size:12px; color:var(--muted); cursor:pointer; }
.ew-pconf-toggle input{ accent-color:var(--accent); }
.ew-pconf-insert{ margin-top:2px; background:var(--accent); color:var(--bg); border:none; border-radius:7px;
  padding:7px 10px; cursor:pointer; font-family:var(--display); font-weight:600; font-size:12.5px; }
.ew-pconf-insert:disabled{ opacity:.4; cursor:not-allowed; }
.ew-search{ width:100%; box-sizing:border-box; background:var(--panel); color:var(--ink);
  border:1px solid var(--line); border-radius:7px; padding:6px 9px; font-family:var(--mono);
  font-size:12px; margin-bottom:2px; }
.ew-search:focus{ outline:none; border-color:var(--accent); }
.ew-collapseall{ background:none; border:none; color:var(--faint); font-family:var(--mono);
  font-size:10px; letter-spacing:.08em; text-transform:uppercase; cursor:pointer;
  text-align:left; padding:0 2px; }
.ew-collapseall:hover{ color:var(--muted); }
.ew-cat{ border:none; }
.ew-cat summary{ cursor:pointer; font-family:var(--mono); font-size:10.5px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--faint); padding:6px 2px 4px; user-select:none; }
.ew-cat summary:hover{ color:var(--muted); }
.ew-cat[open] summary{ color:var(--muted); }
.ew-cat > .ew-pitem{ margin:0 0 6px; }
.ew-pitem{ border:1px solid var(--line); border-left:3px solid var(--tag); border-radius:8px;
  background:var(--panel); padding:7px 10px; cursor:grab; user-select:none; }
.ew-pitem b{ display:block; font-family:var(--display); font-weight:500; font-size:13px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ew-pitem:hover{ border-color:var(--tag); }
.ew-viewport{ position:relative; flex:1; overflow:hidden; cursor:grab; touch-action:none;
  background-image:radial-gradient(circle, #1b2330 1px, transparent 1px);
  background-size:24px 24px; }
.ew-viewport:active{ cursor:grabbing; }
.ew-world{ position:absolute; left:0; top:0; transform-origin:0 0; }
.ew-wires{ position:absolute; left:0; top:0; overflow:visible; pointer-events:none; }
.ew-edge{ fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;
  opacity:.9; transition:opacity .2s, stroke-width .2s; pointer-events:none; }
.ew-dash{ stroke-dasharray:5 6; }
.ew-edge.dim{ opacity:.15; } .ew-edge.on{ opacity:1; stroke-width:2.6; }
.ew-hit{ fill:none; stroke:transparent; stroke-width:14; pointer-events:stroke; cursor:pointer; }
.ew-particle{ pointer-events:none; transition:opacity .2s; }
.ew-particle.dim{ opacity:.1; }
.ew-elbl{ font-family:var(--mono); font-size:11px; fill:var(--muted); pointer-events:none;
  paint-order:stroke; stroke:var(--bg); stroke-width:4px; stroke-linejoin:round; transition:opacity .2s; }
.ew-elbl.dim{ opacity:.1; } .ew-elbl.on{ fill:var(--ink); }
.ew-temp{ fill:none; stroke:var(--ink); stroke-width:1.6; stroke-dasharray:4 5; pointer-events:none; }
/* Edge bend handles use the theme accent (--tag isn't defined in the wires svg),
   plus a bg halo + drop shadow so they stay legible over any line or node. */
.ew-wp{ fill:var(--accent); stroke:var(--bg); stroke-width:2.5; cursor:grab;
  filter:drop-shadow(0 1px 2.5px rgba(0,0,0,.5)); }
.ew-wp:hover{ stroke:var(--ink); stroke-width:3; }
.ew-wp-add{ fill:var(--bg); stroke:var(--accent); stroke-width:2.5; opacity:.85; cursor:copy;
  filter:drop-shadow(0 1px 2px rgba(0,0,0,.4)); }
.ew-wp-add:hover{ opacity:1; fill:var(--accent); }
.ew-zone{ position:absolute; border:1.5px dashed var(--zc); border-radius:14px;
  background:color-mix(in srgb, var(--zc) 4%, transparent); pointer-events:none; }
.ew-zone.sel{ border-style:solid; }
.ew-zlabel{ position:absolute; top:-12px; left:14px; pointer-events:auto; cursor:grab; z-index:4;
  background:var(--bg); border:1px solid var(--zc); color:var(--zc); border-radius:99px;
  padding:2px 12px; font-family:var(--mono); font-size:10.5px; letter-spacing:.12em;
  text-transform:uppercase; user-select:none; white-space:nowrap; }
.ew-zgrip{ position:absolute; right:-7px; bottom:-7px; width:14px; height:14px; border-radius:3px;
  background:var(--panel2); border:2px solid var(--zc); cursor:nwse-resize; pointer-events:auto; z-index:4; }
.ew-zport{ position:absolute; right:-6px; top:50%; margin-top:-6px; width:12px; height:12px; border-radius:99px;
  background:var(--bg); border:2px solid var(--zc); cursor:crosshair; pointer-events:auto; z-index:4; }
.ew-zport:hover{ background:var(--zc); }
.ew-marquee{ position:absolute; border:1px dashed #4C8DFF; background:rgba(76,141,255,.08);
  pointer-events:none; }
.ew-node{ position:absolute; border:1px solid var(--line); border-radius:10px;
  background:var(--panel); padding:10px 12px; cursor:grab; user-select:none;
  box-shadow:0 2px 10px rgba(0,0,0,.35); transition:opacity .2s, border-color .15s; }
.ew-node::before{ content:""; position:absolute; left:-1px; top:9px; bottom:9px; width:3px;
  border-radius:3px; background:var(--tag); }
.ew-node b{ display:block; font-family:var(--display); font-weight:500; font-size:14.5px; }
.ew-node span{ font-size:11px; color:var(--muted); }
.ew-node.sel{ border-color:var(--tag); box-shadow:0 0 0 2px color-mix(in srgb, var(--tag) 35%, transparent), 0 2px 10px rgba(0,0,0,.35); }
.ew-node.dim{ opacity:.2; }
.ew-node input{ width:100%; background:var(--panel2); color:var(--ink); border:1px solid var(--tag);
  border-radius:6px; padding:4px 6px; font-family:var(--display); font-size:13.5px; }
.ew-nbody{ display:flex; align-items:center; gap:9px; min-width:0; }
.ew-nbody img{ width:24px; height:24px; object-fit:contain; border-radius:5px; flex:none; }
.ew-nbody > div{ min-width:0; }
.ew-fchips{ display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
.ew-fchips em{ font-style:normal; font-family:var(--mono); font-size:9.5px; color:var(--muted);
  border:1px solid var(--line); background:var(--panel2); border-radius:99px; padding:1px 7px;
  white-space:nowrap; }
.ew-port{ position:absolute; width:11px; height:11px; margin:-5.5px; border-radius:99px;
  background:var(--bg); border:2px solid var(--tag); cursor:crosshair; z-index:3; }
.ew-port:hover{ background:var(--tag); }
.ew-grip{ position:absolute; right:-6px; bottom:-6px; width:13px; height:13px; z-index:3;
  border-radius:3px; background:var(--panel2); border:2px solid var(--tag); cursor:nwse-resize; }
.ew-grip:hover{ background:var(--tag); }
.ew-inspector{ width:340px; flex:none; border-left:1px solid var(--line);
  background:var(--panel2); display:flex; flex-direction:column; min-height:0; }
.ew-ihead{ display:flex; align-items:center; gap:10px; padding:12px 14px;
  border-bottom:1px solid var(--line); flex:none; }
.ew-idot{ width:10px; height:10px; border-radius:99px; flex:none; }
.ew-ititle{ min-width:0; }
.ew-ititle b{ display:block; font-family:var(--display); font-weight:500; font-size:14px;
  line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ew-ititle small{ font-family:var(--mono); font-size:10px; color:var(--faint); }
.ew-x{ margin-left:auto; background:none; border:none; color:var(--muted); font-size:18px;
  line-height:1; cursor:pointer; padding:2px 6px; }
.ew-x:hover{ color:var(--ink); }
.ew-iscroll{ overflow-y:auto; padding:2px 14px 14px; }
.ew-iscroll section{ padding:12px 0; border-bottom:1px solid var(--line); display:grid; gap:9px; }
.ew-iscroll section:last-child{ border-bottom:none; }
.ew-iscroll h5{ margin:0; font-family:var(--mono); font-size:10px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--faint); font-weight:400; }
.ew-frow{ display:grid; grid-template-columns:72px 1fr; align-items:center; gap:8px; }
.ew-flabel{ font-size:11.5px; color:var(--muted); }
.ew-frow input:not([type=checkbox]):not([type=color]):not([type=file]), .ew-frow select{
  background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:6px;
  padding:5px 8px; font-size:12.5px; font-family:var(--body); width:100%; box-sizing:border-box; min-width:0; }
.ew-frow input:focus, .ew-frow select:focus{ outline:none; border-color:var(--accent); }
.ew-frow input[type=number]{ font-family:var(--mono); font-size:12px; }
.ew-frow input[type=checkbox]{ accent-color:var(--accent); width:15px; height:15px; justify-self:start; }
.ew-frow input[type=color]{ width:42px; height:26px; padding:1px; background:var(--panel);
  border:1px solid var(--line); border-radius:6px; cursor:pointer; }
.ew-size{ display:flex; align-items:center; gap:6px; }
.ew-size input{ width:64px !important; }
.ew-size i{ color:var(--faint); font-style:normal; }
.ew-btnrow{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.ew-ihint{ margin:8px 0 4px; font-size:11px; line-height:1.45; color:var(--muted); }
.ew-btn{ background:var(--panel); color:var(--muted); border:1px solid var(--line); border-radius:6px;
  padding:5px 10px; font-family:var(--mono); font-size:11px; cursor:pointer; display:inline-block; }
.ew-btn:hover:not(:disabled){ border-color:var(--accent); color:var(--ink); }
.ew-btn.danger:hover:not(:disabled){ border-color:#F04E98; color:#F04E98; }
.ew-btn:disabled{ opacity:.4; cursor:default; }
.ew-btn input[type=file]{ display:none; }
.ew-swatch{ display:inline-block; width:9px; height:9px; border-radius:2px; margin-left:6px;
  vertical-align:middle; border:1px solid color-mix(in srgb, var(--ink) 25%, transparent); }
.ew-check{ display:flex; align-items:center; gap:7px; font-size:11.5px; color:var(--muted); cursor:pointer; }
.ew-check input[type=checkbox]{ accent-color:var(--accent); width:15px; height:15px; flex:none; }
.ew-align{ display:flex; align-items:center; gap:4px; margin:2px 0 4px; }
.ew-adiv{ width:1px; height:18px; background:var(--line); margin:0 4px; }
.ew-abtn{ display:inline-flex; align-items:center; justify-content:center; width:28px; height:26px;
  background:var(--panel); color:var(--muted); border:1px solid var(--line); border-radius:6px; cursor:pointer; }
.ew-abtn:hover{ border-color:var(--accent); color:var(--ink); }
.ew-ghost{ position:fixed; z-index:99; pointer-events:none; transform:translate(-50%,-50%);
  background:var(--panel); border:1px solid var(--tag); border-left:3px solid var(--tag);
  border-radius:8px; padding:8px 14px; font-family:"Mier B","Inter",sans-serif; font-size:13px;
  color:var(--ink); box-shadow:0 8px 24px rgba(0,0,0,.5); opacity:.92; }
/* ---- AI chat ---- */
.ew-ai-toggle{ font-weight:600; }
.ew-ai-toggle.on{ border-color:var(--accent) !important; color:var(--accent) !important; }
.ew-chat{ position:absolute; right:16px; bottom:16px; z-index:20; width:380px;
  max-height:min(74%, 660px); display:flex; flex-direction:column; overflow:hidden;
  background:var(--panel2); border:1px solid var(--line); border-radius:14px;
  box-shadow:0 16px 48px rgba(0,0,0,.5); }
.ew-chat-head{ display:flex; align-items:center; gap:8px; padding:11px 13px;
  border-bottom:1px solid var(--line); flex:none; }
.ew-chat-head b{ font-family:var(--display); font-size:14px; }
.ew-chat-head .ew-x{ margin-left:0; }
.ew-chat-gear{ margin-left:auto; background:none; border:none; color:var(--muted);
  font-size:15px; cursor:pointer; padding:2px 4px; }
.ew-chat-gear:hover{ color:var(--ink); }
.ew-chat-settings{ display:grid; gap:6px; padding:11px 13px; border-bottom:1px solid var(--line);
  background:var(--panel); flex:none; max-height:52%; overflow-y:auto; }
.ew-chat-settings input{ background:var(--panel2); color:var(--ink); border:1px solid var(--line);
  border-radius:6px; padding:6px 9px; font-family:var(--mono); font-size:12px; }
.ew-chat-settings input:focus{ outline:none; border-color:var(--accent); }
.ew-chat-select{ background:var(--panel2); color:var(--ink); border:1px solid var(--line);
  border-radius:7px; padding:6px 8px; font-family:var(--body); font-size:12px; }
.ew-chat-select:focus{ outline:none; border-color:var(--accent); }
.ew-chat-note code{ font-family:var(--mono); font-size:10px; color:var(--muted); }
.ew-chat-note{ font-size:10.5px; line-height:1.45; color:var(--faint); margin:0; }
.ew-chat-log{ flex:1; min-height:0; overflow-y:auto; padding:13px; display:flex;
  flex-direction:column; gap:9px; scrollbar-width:thin; scrollbar-color:var(--line) transparent; }
.ew-chat-log::-webkit-scrollbar{ width:10px; }
.ew-chat-log::-webkit-scrollbar-thumb{ background:var(--line); border-radius:99px;
  border:2px solid transparent; background-clip:padding-box; }
.ew-msg{ padding:8px 11px; border-radius:11px; font-size:12.5px; line-height:1.5;
  max-width:88%; white-space:pre-wrap; word-break:break-word; }
.ew-msg.user{ align-self:flex-end; background:var(--accent); color:#06121f; }
.ew-msg.ai{ align-self:flex-start; background:var(--panel); border:1px solid var(--line); color:var(--ink); }
.ew-msg.error{ align-self:flex-start; color:var(--ink);
  background:color-mix(in srgb, #F04E98 15%, transparent); border:1px solid #F04E98; }
.ew-msg.status{ align-self:center; max-width:100%; text-align:center; background:none;
  color:var(--faint); font-size:11px; padding:2px 4px; font-family:var(--mono); }
.ew-thinking{ opacity:.7; animation:ew-pulse 1.1s ease-in-out infinite; }
@keyframes ew-pulse{ 50%{ opacity:.35; } }
.ew-chat-empty{ margin:auto; text-align:center; color:var(--faint); font-size:12px;
  display:flex; flex-direction:column; gap:12px; padding:14px; }
.ew-chat-chips{ display:flex; flex-direction:column; gap:6px; }
.ew-chat-chips button{ background:var(--panel); color:var(--muted); border:1px solid var(--line);
  border-radius:8px; padding:7px 10px; font-family:var(--body); font-size:12px; cursor:pointer; text-align:left; }
.ew-chat-chips button:hover{ border-color:var(--accent); color:var(--ink); }
.ew-chat-form{ display:flex; gap:7px; padding:10px; border-top:1px solid var(--line); flex:none; }
.ew-chat-input{ flex:1; resize:none; background:var(--panel); color:var(--ink);
  border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-family:var(--body);
  font-size:12.5px; line-height:1.4; }
.ew-chat-input:focus{ outline:none; border-color:var(--accent); }
.ew-chat-send{ align-self:stretch; padding:0 14px; background:var(--accent); color:#06121f;
  border:none; border-radius:8px; font-family:var(--mono); font-size:12px; font-weight:700; cursor:pointer; }
.ew-chat-send:disabled{ opacity:.4; cursor:default; }

@media (prefers-reduced-motion: reduce){ .ew-particle{ display:none; } .ew-thinking{ animation:none; } }

/* ---- light theme overrides (follows the app's light/dark toggle) ---- */
.ew-light{
  --bg:#F5F7FA; --panel:#FFFFFF; --panel2:#EEF2F7; --line:#D6DEEA;
  --ink:#1C1E23; --muted:#5B6472; --faint:#98A4B8; --accent:#0B64DD;
}
.ew-light .ew-viewport{ background-image:radial-gradient(circle, #d3dcea 1px, transparent 1px); }
.ew-light .ew-node{ box-shadow:0 1px 3px rgba(16,28,63,.10), 0 1px 2px rgba(16,28,63,.06); }
.ew-light .ew-ghost{ box-shadow:0 10px 26px rgba(16,28,63,.18); }
.ew-light .ew-chat{ box-shadow:0 16px 48px rgba(16,28,63,.22); }
.ew-light .ew-msg.user{ color:#fff; }
.ew-light .ew-chat-send{ color:#fff; }
`;
