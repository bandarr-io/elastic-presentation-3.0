import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { useTheme } from "../context/ThemeContext";
import { buildCatalog, describeDoc, describeSections, buildTool, chatSystem, runLLM,
         SUMMARY_PROMPTS, SUMMARY_DEFAULT, summarySystem, summaryPrompt,
         FOLLOWUP_SYSTEM, followupPrompt,
         BEDROCK_DEFAULT_MODEL, BEDROCK_DEFAULT_REGION } from "../utils/whiteboardAI";
import { buildFollowupHtml, followupMarkdown } from "../utils/whiteboardFollowup";
import { parseAwsCredentials, usableProfiles } from "../utils/awsCredentials";
import { buildFromSections, instantiateTemplate, sectionEndpoint, TEMPLATE_MENU, TEMPLATE_CONFIG, defaultFill } from "../data/whiteboardTemplates";
import { STAGE_PALETTES, SURFACES, CATS, CAT_COLORS, TYPES, tagOf, SEEDS,
         NODE_W, NODE_H } from "../data/whiteboardTypes";
import { encodeBoard, decodeBoard, boardParamFromHash, shareUrl } from "../utils/whiteboardShare";
import { tidyLayout, alignLayout, validateBoard, capacityTotals, formatTB } from "../utils/whiteboardAnalysis";
import { parseClusterInput, summarizeCluster, clusterToBoard } from "../utils/whiteboardImport";
import { sizeCluster, romRows, romTSV, romScenario, RU_GB, RU_LIST_PRICE, SIZING_TIERS,
         SIZING_DEFAULTS, SIZING_PROVIDERS, recommendHardware,
         LICENSE_ERU, LICENSE_ECU, licenseModelFor } from "../utils/whiteboardSizing";
import { sendScenarioToPricing } from "../utils/pricingHandoff";
import { projectCell, formatCurrency } from "../utils/pricing";
import { echProfiles, ECH_REGIONS } from "../data/echInstanceConfigs";
import { diffBoards, diffMarks } from "../utils/whiteboardDiff";
import { INK_COLORS, INK_WIDTH, INK_MIN_STEP, inkPath, stepCountOf,
         visibleAtStep, wrapText } from "../utils/whiteboardPresenting";
import { useSceneMotion } from "../hooks/useSceneMotion";
import { useSceneMotionFollow } from "../context/SceneMotionFollowContext";
import { anchor, nodePorts, elbowPath, roundedPath, plMid, snap, translateEdgePts } from "../utils/whiteboardGeometry";
import { nodeAutoHeight, nodeChips } from "../utils/nodeMetrics";
import { INTEGRATIONS, INTEGRATION_TITLES } from "../data/elasticIntegrations";
import { buildIndex, searchPassages, renderPassages, citedSources,
         chunkDocument } from "../utils/whiteboardKnowledge";
import { parseDocument } from "../utils/whiteboardParse";
import { parseEdmRows, mergeCustomer, describeCustomer, hasCustomer,
         EMPTY_CUSTOMER } from "../utils/whiteboardCustomer";
import { ELASTIC_CORPUS, elasticIndex, SCOPE_CUSTOMER, KNOWLEDGE_VERSION } from "../data/knowledge";
import { askAgent, elasticConfigured, ensureIndex, bulkPassages, checkAgent, checkIndex,
         ELASTIC_DEFAULT_AGENT, ELASTIC_DEFAULT_INDEX } from "../utils/whiteboardElastic";
import { useHistory } from "./whiteboard/useHistory";
import { useDragController } from "./whiteboard/useDragController";
import ChatMarkdown from "./whiteboard/ChatMarkdown";
import Minimap from "./whiteboard/Minimap";

/* ============================================================
   ElasticWhiteboard
   Drag-and-drop Elastic architecture canvas. No dependencies
   beyond React.

   Canvas:      drag empty space pans · wheel zooms · Fit button
   Palette:     drag a component onto the canvas (search box filters)
   Nodes:       drag moves (multi-select drags together) · corner
                grip resizes · double-click renames · shift-click
                multi-selects · shift-drag marquee-selects ·
                ⌘/Ctrl+D duplicates · arrows nudge · Del removes
   Connections: hover a node, drag one of its twelve ports onto
                another node — the line keeps both attachment
                points · click a line to select (label / style /
                width / reverse / delete)
   Zones:       + Zone adds a labeled container · drag its pill to
                move it with its contents (alt-drag moves the frame
                alone) · grip resizes
   Boards:      several named boards, each autosaved separately ·
                ⌘/Ctrl+C/X/V moves selections between them
   Analysis:    Tidy lays out by data-flow stage · Σ panel totals
                capacity and flags architecture smells · import a
                real cluster from _cat/nodes or a diagnostic bundle
   Presenting:  build steps reveal the diagram piece by piece and
                publish to the presenter view · Present hides the
                chrome and spotlights one subsystem · pen and arrow
                tools annotate over the top
   History:     ⌘/Ctrl+Z undo · ⌘/Ctrl+Shift+Z redo
   Export:      JSON (round-trips) · SVG · PNG · share link
   ============================================================ */

/* Node TYPES, palettes, categories and seed templates are defined in
   ../data/whiteboardTypes and imported above. Derived here for the AI chat: */
const WB_CATALOG = buildCatalog(TYPES);
const WB_TOOL = buildTool();
const TEMPLATES_OK = new Set([...TEMPLATE_MENU.map((t) => t.id), "single"]);

/* Connector line styles — shared by canvas rendering, the inspector and the
   SVG export so all three stay in sync. `dash` is an SVG stroke-dasharray
   (null = solid); dots rely on the round line caps. */
const EDGE_STYLES = {
  solid:    { label: "Solid",     dash: null },
  dashed:   { label: "Dashed",    dash: "5 6" },
  dotted:   { label: "Dotted",    dash: "0.1 8" },
  longdash: { label: "Long dash", dash: "12 7" },
  dashdot:  { label: "Dash-dot",  dash: "9 6 0.1 6" },
};
const EDGE_DEFAULT_WIDTH = 1.8;
const EDGE_WIDTHS = [
  { label: "Thin",   value: 1.2 },
  { label: "Normal", value: EDGE_DEFAULT_WIDTH },
  { label: "Thick",  value: 3 },
];

/* Arrow-key nudge: one grid step, or 1px with Shift held. */
const GRID = 8;
const NUDGE_KEYS = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};
/* Marker identifying our own clipboard payloads (vs. arbitrary copied text). */
const CLIP_MARK = "__elasticWhiteboard";


/* ---------------- pure geometry ---------------- */

/* Width comes from the type (or a manual resize); height fits the content
   being shown unless the user resized the node explicitly. */
const rectOf = (n) => ({
  x: n.x, y: n.y,
  w: n.w != null ? n.w : TYPES[n.type].w,
  h: n.h != null ? n.h : nodeAutoHeight(n),
});
const nodeTag = (n, stages) => n.color || tagOf(TYPES[n.type], stages);
const nodeSub = (n) => (n.sub !== undefined ? n.sub : TYPES[n.type].sub);
const noteText = (n) => (n.title !== undefined ? n.title : "");
const fieldChips = (n) => nodeChips(n.type, n.props);

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

/* ---- persistence (named boards + user-saved seed presets) ---- */
const BOARD_KEY = "ew-board";                       // pre-multi-board autosave
const BOARDS_KEY = "ew-boards";                     // { boards: [{id,name}], activeId }
const boardKey = (id) => `ew-board-${id}`;
const seedKey = (k) => `ew-seed-${k}`;
const readJSON = (key) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const writeJSON = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota / disabled */ } };
const dropKey = (key) => { try { localStorage.removeItem(key); } catch { /* disabled */ } };

/* Attached documents ride the board's autosave, and localStorage gives an
   origin a few megabytes for everything: every board, every seed preset, the
   lot. These caps keep one pasted RFP from spending the budget — and a
   document past them is one nobody meant to attach whole. */
const DOC_MAX_CHARS = 120_000;
const DOC_TOTAL_MAX_CHARS = 400_000;

const DEFAULT_VIEW = { x: 30, y: 20, k: 0.85 };
const uniqueId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
/* Seed edges are stored as compact tuples or objects; materialize either. */
const hydrateEdge = (ed, i) => (Array.isArray(ed)
  ? { id: `e${i}`, s: ed[0], e: ed[1], lbl: ed[2] }
  : { id: `e${i}`, s: ed.s, e: ed.e, lbl: ed.lbl, ...(ed.pts ? { pts: ed.pts } : {}),
      ...(ed.sa ? { sa: ed.sa } : {}), ...(ed.ea ? { ea: ed.ea } : {}),
      ...(ed.bi ? { bi: true } : {}), ...(ed.color ? { color: ed.color } : {}) });
const DEFAULT_QUOTE = { model: LICENSE_ERU, price: String(RU_LIST_PRICE), discount: "", ecu: "" };
const emptyBoard = () => ({ nodes: [], edges: [], zones: [], view: { ...DEFAULT_VIEW }, sections: {} });
const referenceBoard = () => ({
  nodes: JSON.parse(JSON.stringify(SEEDS.reference.nodes)),
  edges: SEEDS.reference.edges.map(hydrateEdge),
  zones: JSON.parse(JSON.stringify(SEEDS.reference.zones || [])),
  view: { ...DEFAULT_VIEW }, sections: {},
});

/* Resolve the board index, migrating a single legacy autosave into the first
   named board. Always yields an index with at least one board plus its data. */
const bootBoards = (persist = true) => {
  const idx = readJSON(BOARDS_KEY);
  if (idx && Array.isArray(idx.boards) && idx.boards.length) {
    const activeId = idx.boards.some((b) => b.id === idx.activeId) ? idx.activeId : idx.boards[0].id;
    return { index: { ...idx, activeId }, board: readJSON(boardKey(activeId)) || emptyBoard() };
  }
  const legacy = readJSON(BOARD_KEY);
  const board = legacy && Array.isArray(legacy.nodes) ? legacy : referenceBoard();
  const id = uniqueId("b");
  const index = { boards: [{ id, name: "My board" }], activeId: id };
  if (persist) {
    writeJSON(boardKey(id), board);
    writeJSON(BOARDS_KEY, index);
    dropKey(BOARD_KEY);
  }
  return { index, board };
};

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
  if (hasPts || e.bi || e.color || e.sa || e.ea) return `      { s: ${JSON.stringify(e.s)}, e: ${JSON.stringify(e.e)}${e.lbl ? `, lbl: ${JSON.stringify(e.lbl)}` : ""}${e.bi ? ", bi: true" : ""}${e.color ? `, color: ${JSON.stringify(e.color)}` : ""}${e.sa ? `, sa: ${JSON.stringify(e.sa)}` : ""}${e.ea ? `, ea: ${JSON.stringify(e.ea)}` : ""}${hasPts ? `, pts: ${JSON.stringify(e.pts)}` : ""} },`;
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
  /* A follower is a read-only mirror (the presenter view's live preview). It
     shares the same stored board, so it must never write back over the tab the
     presenter is actually driving. */
  const following = useSceneMotionFollow() != null;
  const isDark = theme !== "light";
  const stages = isDark ? STAGE_PALETTES.dark : STAGE_PALETTES.light;
  const surface = isDark ? SURFACES.dark : SURFACES.light;

  // hydrate the active named board (migrating any pre-multi-board autosave)
  const bootRef = useRef();
  if (bootRef.current === undefined) bootRef.current = bootBoards(!following);
  const boot = bootRef.current.board;

  const [boardIndex, setBoardIndex] = useState(bootRef.current.index);
  const [boardMenu, setBoardMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const [nodes, setNodes] = useState(() => boot.nodes || []);
  const [edges, setEdges] = useState(() => boot.edges || []);
  const [zones, setZones] = useState(() => boot.zones || []);
  const [ink, setInk]     = useState(() => boot.ink || []);
  const [view, setView]   = useState(() => boot.view || { ...DEFAULT_VIEW });

  /* presenting */
  const [present, setPresent] = useState(false);    // chrome hidden, steps drive visibility
  const [spotlight, setSpotlight] = useState(null); // pinned node id, dims everything else
  const [tool, setTool] = useState(null);           // null | "pen" | "arrow"
  const [inkColor, setInkColor] = useState(INK_COLORS[0].value);
  const [sel, setSel]     = useState(null);      // {kind:'nodes',ids} | {kind:'edge'|'zone',id}
  const [hover, setHover] = useState(null);
  const [connect, setConnect] = useState(null);  // {from,cx,cy} world coords
  const [ghost, setGhost] = useState(null);      // palette drag {type,cx,cy} client coords
  const [editing, setEditing] = useState(null);  // node id being renamed
  const [marquee, setMarquee] = useState(null);  // {x0,y0,x1,y1} world coords
  const [guides, setGuides] = useState(null);    // live drag snap lines [{axis:'v'|'h', at}]
  const [q, setQ] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [styleClip, setStyleClip] = useState(null); // copied node style {color,w,h}
  const [openCats, setOpenCats] = useState(() => new Set(CATS.filter((c) => c !== "General")));
  const [patternCfg, setPatternCfg] = useState(null); // { id, fill } while configuring a Patterns block
  const [seedMenu, setSeedMenu] = useState(false);    // preset save/reset dropdown open
  const [fileMenu, setFileMenu] = useState(false);    // export/import dropdown open
  const [tidyMenu, setTidyMenu] = useState(false);    // straighten / re-lay-out dropdown open
  const [presentMenu, setPresentMenu] = useState(false); // present / annotate dropdown open
  const [aiMenu, setAiMenu] = useState(false);        // AI chat / context dropdown open
  const [exportChrome, setExportChrome] = useState(true); // title block + legend on exports
  const [reviewOpen, setReviewOpen] = useState(false);    // capacity + validation panel
  /* Terms for the line the capacity panel hands to Pricing / ROM. They belong
     to the deal rather than the session, so they're saved with the board.
     Drawing a cluster sets the model from its provider; the ERU list price is
     seeded so a self-managed line carries a total straight away. */
  const [quote, setQuote] = useState({ ...DEFAULT_QUOTE });
  const setQuoteField = (patch) => setQuote((q) => ({ ...q, ...patch }));
  const [importOpen, setImportOpen] = useState(false);    // paste-a-real-cluster dialog
  /* Set on a board built by importing a real cluster ({ total, source, … }),
     which is what offers the review / target-state actions. */
  const [imported, setImported] = useState(() => boot.imported || null);
  /* What the customer actually asked for: their RFP, requirements sheet, or
     meeting notes, pasted or uploaded and attached to this board. Stored with
     the board and deliberately kept out of the share link — a prospect's
     requirements document is not something to hand around in a URL. */
  const [documents, setDocuments] = useState(() => boot.documents || []);
  const [contextOpen, setContextOpen] = useState(false);  // the attach-a-document panel
  /* Who the board is for: account / opportunity / stakeholders, imported from
     the edm CLI's output or typed in. Rides the board document like documents
     do, informs the AI, and stays off the canvas — deal value on screen during
     a customer call would be a liability. */
  const [customer, setCustomer] = useState(() => boot.customer || null);
  /* Saved camera positions — a guided tour of the board, saved with it.
     `viewIdx` is the last one recalled (transient, for the present-bar stepper). */
  const [views, setViews] = useState(() => boot.views || []);
  const [viewsMenu, setViewsMenu] = useState(false);
  const [renamingView, setRenamingView] = useState(null);
  const [viewIdx, setViewIdx] = useState(-1);
  const flyRef = useRef(null);                            // in-flight camera tween
  /* Minimap: a persisted preference, plus the viewport's measured size so the
     map can draw the camera rectangle without touching the DOM itself. */
  const [minimap, setMinimap] = useState(() => localStorage.getItem("ew-minimap") !== "0");
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 });
  const [sizeOpen, setSizeOpen] = useState(false);        // ingest -> node count calculator
  const [seedNote, setSeedNote] = useState("");       // transient "saved" confirmation
  /* ---------- AI chat ---------- */
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([]);   // {role:'user'|'ai'|'error', text}
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  /* The turn in progress, step by step — what the agent is doing right now,
     streamed from the tool loop so the wait is legible. Cleared when the
     reply lands: the trail under the reply is the permanent record. */
  const [chatSteps, setChatSteps] = useState([]);
  const [showChatSettings, setShowChatSettings] = useState(false);
  /* Which settings block is expanded — "bedrock", "elastic", or none. One at a
     time: together the two are taller than the panel, which put Check AI below
     a fold with nothing to scroll. */
  const [settingsPane, setSettingsPane] = useState(null);
  /* A board change the model has proposed, waiting on Apply — { label, lines,
     commit }. Undo already covers a change that lands; this is about not
     redrawing a diagram out from under a room that's looking at it. */
  const [pendingApply, setPendingApply] = useState(null);
  const [chatUsage, setChatUsage] = useState(null);   // token usage of the last turn
  const [askQueue, setAskQueue] = useState(null);     // a canned turn to send once the board settles
  /* Bedrock credentials: an IAM key pair (plus session token for temporary
     STS credentials) and the region + model to converse with. */
  const [awsRegion, setAwsRegion] = useState(() => localStorage.getItem("ew-aws-region") || BEDROCK_DEFAULT_REGION);
  const [awsKeyId, setAwsKeyId] = useState(() => localStorage.getItem("ew-aws-key-id") || "");
  const [awsSecret, setAwsSecret] = useState(() => localStorage.getItem("ew-aws-secret") || "");
  const [awsSession, setAwsSession] = useState(() => localStorage.getItem("ew-aws-session") || "");
  const [model, setModel] = useState(() => localStorage.getItem("ew-bedrock-model") || BEDROCK_DEFAULT_MODEL);
  const [awsProfiles, setAwsProfiles] = useState(null);   // multi-profile credential files offer a picker
  const [awsProfileName, setAwsProfileName] = useState("");
  const [credsNote, setCredsNote] = useState("");
  const credsFileRef = useRef(null);
  /* The Elastic connection, browser-direct and bring-your-own-key: Kibana for
     the Agent Builder agent, Elasticsearch for the index behind it. Stored the
     same way the Bedrock credentials are, which is to say in this browser
     only — see whiteboardElastic.js for why there is no proxy. */
  const [kibanaUrl, setKibanaUrl] = useState(() => localStorage.getItem("ew-elastic-url") || "");
  const [esUrl, setEsUrl] = useState(() => localStorage.getItem("ew-es-url") || "");
  const [elasticKey, setElasticKey] = useState(() => localStorage.getItem("ew-elastic-key") || "");
  const [elasticAgent, setElasticAgent] = useState(() => localStorage.getItem("ew-elastic-agent") || ELASTIC_DEFAULT_AGENT);
  const [elasticSpace, setElasticSpace] = useState(() => localStorage.getItem("ew-elastic-space") || "");
  const [elasticIndexName, setElasticIndexName] = useState(() => localStorage.getItem("ew-elastic-index") || ELASTIC_DEFAULT_INDEX);
  /* Jina, for reading images attached as context — Tika (and so Elastic's
     attachment processor) doesn't read pixels, a vision model does. */
  const [jinaKey, setJinaKey] = useState(() => localStorage.getItem("ew-jina-key") || "");
  const [preflight, setPreflight] = useState(null);   // { busy, bedrock, agent, index }
  const [pushState, setPushState] = useState(null);   // { busy, note, error, help }
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
  docRef.current = { nodes, edges, zones, ink };
  const sectionsRef = useRef(boot?.sections || {}); // sectionId -> { template, fill, keys, zoneId } for incremental AI edits

  /* ---------- history ---------- */
  const restore = (doc) => {
    setNodes(doc.nodes); setEdges(doc.edges); setZones(doc.zones); setInk(doc.ink || []); setSel(null);
  };
  const { snapshot, snapGuard, undo, redo, resetHistory, canUndo, canRedo } = useHistory(docRef, restore);

  /* ---------- boards ---------- */
  const activeBoardId = boardIndex.activeId;
  const activeBoard = boardIndex.boards.find((b) => b.id === activeBoardId) || boardIndex.boards[0];

  /* Autosave the active board (debounced; survives refresh). Keyed on the
     active id so a board switch can't flush stale content into the new slot. */
  useEffect(() => {
    if (following) return undefined;
    const t = setTimeout(
      () => writeJSON(boardKey(activeBoardId),
                      { nodes, edges, zones, ink, view, views, sections: sectionsRef.current, quote, imported, documents, customer }),
      300);
    return () => clearTimeout(t);
  }, [nodes, edges, zones, ink, view, views, quote, imported, documents, customer, activeBoardId, following]);

  const saveIndex = (next) => { setBoardIndex(next); if (!following) writeJSON(BOARDS_KEY, next); };
  /* Write the in-memory board straight to storage — used before switching away,
     where the debounced autosave would otherwise lose the last edits. */
  const flushActiveBoard = () => {
    if (following) return;
    writeJSON(boardKey(activeBoardId),
              { nodes, edges, zones, ink, view, views, sections: sectionsRef.current, quote, imported, documents, customer });
  };

  /* Swap the whole document in. Shared by open / create / delete. */
  const loadBoardData = (data) => {
    setNodes(data.nodes || []);
    setEdges(data.edges || []);
    setZones(data.zones || []);
    setInk(data.ink || []);
    setView(data.view || { ...DEFAULT_VIEW });
    setViews(data.views || []);
    setViewIdx(-1);
    setQuote({ ...DEFAULT_QUOTE, ...(data.quote || {}) });
    setImported(data.imported || null);
    setDocuments(data.documents || []);
    setCustomer(data.customer || null);
    sectionsRef.current = data.sections || {};
    setSel(null);
    setSpotlight(null);
    setPendingApply(null);
    resetHistory();
  };

  const openBoard = (id) => {
    setBoardMenu(false);
    if (id === activeBoardId) return;
    flushActiveBoard();
    loadBoardData(readJSON(boardKey(id)) || emptyBoard());
    saveIndex({ ...boardIndex, activeId: id });
  };

  const createBoard = (name, data) => {
    flushActiveBoard();
    const id = uniqueId("b");
    const board = data || emptyBoard();
    writeJSON(boardKey(id), board);
    loadBoardData(board);
    saveIndex({ boards: [...boardIndex.boards, { id, name }], activeId: id });
    setBoardMenu(false);
    flashSeedNote(`Created "${name}"`);
  };

  /* A board added beside the active one, without switching the view — how the
     AI draws alternatives. Goes through a ref mirror of the index because the
     model can draw several boards in one turn, and state updates wouldn't land
     between those synchronous calls. The name is uniquified, never reused: a
     collision with a board the user already has must not overwrite it. */
  const boardIndexRef = useRef(boardIndex);
  boardIndexRef.current = boardIndex;
  const addBoardAside = (name, data) => {
    const idx = boardIndexRef.current;
    const taken = new Set(idx.boards.map((b) => b.name));
    let finalName = name;
    for (let n = 2; taken.has(finalName); n++) finalName = `${name} ${n}`;
    const id = uniqueId("b");
    writeJSON(boardKey(id), data);
    const next = { ...idx, boards: [...idx.boards, { id, name: finalName }] };
    boardIndexRef.current = next;
    saveIndex(next);
    return finalName;
  };

  const nextBoardName = (base) => {
    const taken = new Set(boardIndex.boards.map((b) => b.name));
    if (!taken.has(base)) return base;
    let i = 2;
    while (taken.has(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  };

  const renameBoard = (name) => {
    const clean = name.trim();
    if (!clean) return;
    saveIndex({ ...boardIndex, boards: boardIndex.boards.map((b) => (b.id === activeBoardId ? { ...b, name: clean } : b)) });
  };

  const deleteBoard = (id) => {
    if (boardIndex.boards.length < 2) return;   // always keep one board
    const rest = boardIndex.boards.filter((b) => b.id !== id);
    dropKey(boardKey(id));
    if (id === activeBoardId) {
      loadBoardData(readJSON(boardKey(rest[0].id)) || emptyBoard());
      saveIndex({ boards: rest, activeId: rest[0].id });
    } else {
      saveIndex({ ...boardIndex, boards: rest });
    }
    setBoardMenu(false);
  };

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
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return document.activeElement.blur();
        if (tool) return setTool(null);
        if (present) return exitPresent();
        setSel(null); setConnect(null); setEditing(null); setMarquee(null); setGuides(null);
        dragRef.current = null;
        return;
      }
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      /* While presenting there's nothing to nudge, so the arrow keys (and
         space) walk the build steps instead. */
      /* Number keys fly to saved views in either mode; arrows stay with the
         build steps so the two kinds of stepping never fight. */
      if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && views[+e.key - 1]) {
        e.preventDefault(); goToView(+e.key - 1);
        return;
      }
      if (present) {
        if (!revealing) return;
        if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
          e.preventDefault(); goToStep(step + 1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault(); goToStep(step - 1);
        }
        return;
      }
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
        return;
      }
      if (sel && NUDGE_KEYS[e.key]) {
        e.preventDefault();
        const [dx, dy] = NUDGE_KEYS[e.key];
        const step = e.shiftKey ? 1 : GRID;         // shift = fine, 1px
        nudgeSel(dx * step, dy * step);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // re-bound every render so handlers see fresh state

  const deleteSel = () => {
    if (!sel) return;
    snapshot();
    // Connectors may terminate on zones too, so zone deletion also removes
    // edges attached to the deleted zones.
    const dropEdges = (gone) =>
      setEdges((es) => es.filter((ed) => !gone.includes(ed.s) && !gone.includes(ed.e)));
    if (sel.kind === "nodes") {
      setNodes((ns) => ns.filter((n) => !sel.ids.includes(n.id)));
      dropEdges(sel.ids);
    } else if (sel.kind === "edge") {
      setEdges((es) => es.filter((ed) => ed.id !== sel.id));
    } else if (sel.kind === "zone") {
      setZones((zs) => zs.filter((z) => z.id !== sel.id));
      dropEdges([sel.id]);
    } else if (sel.kind === "zones") {
      setZones((zs) => zs.filter((z) => !sel.ids.includes(z.id)));
      dropEdges(sel.ids);
    } else if (sel.kind === "mixed") {
      setNodes((ns) => ns.filter((n) => !sel.ids.includes(n.id)));
      setZones((zs) => zs.filter((z) => !sel.zoneIds.includes(z.id)));
      dropEdges([...sel.ids, ...sel.zoneIds]);
    }
    setSel(null);
  };

  /* Move the whole selection by a delta. Zones carry their contents, matching
     zone-drag behaviour; a mixed selection moves its own nodes exactly once. */
  const nudgeSel = (dx, dy) => {
    if (!sel || !dx && !dy) return;
    const nodeIds = new Set(sel.kind === "nodes" || sel.kind === "mixed" ? sel.ids : []);
    const zoneIds = sel.kind === "zone" ? [sel.id]
                  : sel.kind === "zones" ? sel.ids
                  : sel.kind === "mixed" ? sel.zoneIds : [];
    if (!nodeIds.size && !zoneIds.length) return;
    for (const id of zoneIds) {
      const z = zoneById[id];
      if (z) for (const n of nodesInZone(z)) nodeIds.add(n.id);
    }
    snapGuard("nudge");
    if (zoneIds.length) {
      const zs = new Set(zoneIds);
      setZones((all) => all.map((z) => (zs.has(z.id) ? { ...z, x: z.x + dx, y: z.y + dy } : z)));
    }
    if (nodeIds.size) setNodes((ns) => ns.map((n) => (nodeIds.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n)));
    setEdges((es) => translateEdgePts(es, [...nodeIds, ...zoneIds], dx, dy));
  };

  /* ---------- clipboard ----------
     Selections serialize to JSON on the system clipboard, so a subsystem can
     be pasted into another board (or another tab). Internal connections are
     carried along; edges to anything outside the selection are dropped. */
  const clipPayload = () => {
    if (!sel) return null;
    const nodeIds = sel.kind === "nodes" || sel.kind === "mixed" ? sel.ids
                  : sel.kind === "zone" || sel.kind === "zones" ? [] : [];
    const zoneIds = sel.kind === "zone" ? [sel.id]
                  : sel.kind === "zones" ? sel.ids
                  : sel.kind === "mixed" ? sel.zoneIds : [];
    const ids = new Set([...nodeIds, ...zoneIds]);
    if (!ids.size) return null;
    return {
      [CLIP_MARK]: 1,
      nodes: nodes.filter((n) => ids.has(n.id)).map(clone),
      zones: zones.filter((z) => ids.has(z.id)).map(clone),
      edges: edges.filter((ed) => ids.has(ed.s) && ids.has(ed.e)).map(clone),
    };
  };

  /* Re-id a pasted payload and drop it in. Content lands 32px off its original
     spot, or at the viewport center when that would be off-screen (which is
     what happens when pasting into a different board). */
  const pastePayload = (data) => {
    if (!data || !data[CLIP_MARK]) return false;
    const inNodes = (data.nodes || []).filter((n) => TYPES[n.type]);
    const inZones = data.zones || [];
    if (!inNodes.length && !inZones.length) return false;

    const box = boxOf(inNodes, inZones);
    const el = viewportRef.current;
    const visible = {
      x0: -view.x / view.k, y0: -view.y / view.k,
      x1: (el.clientWidth - view.x) / view.k, y1: (el.clientHeight - view.y) / view.k,
    };
    const offset = box.x0 + 32 < visible.x1 && box.x1 + 32 > visible.x0
                && box.y0 + 32 < visible.y1 && box.y1 + 32 > visible.y0;
    const dx = offset ? 32 : snap((visible.x0 + visible.x1) / 2 - (box.x0 + box.x1) / 2);
    const dy = offset ? 32 : snap((visible.y0 + visible.y1) / 2 - (box.y0 + box.y1) / 2);

    const remap = {};
    const newNodes = inNodes.map((n) => {
      const c = { ...n, id: uid("n"), x: snap(n.x + dx), y: snap(n.y + dy) };
      remap[n.id] = c.id;
      return c;
    });
    const newZones = inZones.map((z) => {
      const c = { ...z, id: uid("z"), x: snap(z.x + dx), y: snap(z.y + dy) };
      remap[z.id] = c.id;
      return c;
    });
    const newEdges = (data.edges || [])
      .filter((ed) => remap[ed.s] && remap[ed.e])
      .map((ed) => ({ ...ed, id: uid("e"), s: remap[ed.s], e: remap[ed.e],
                      ...(ed.pts ? { pts: ed.pts.map((p) => ({ x: p.x + dx, y: p.y + dy })) } : {}) }));

    snapshot();
    if (newNodes.length) setNodes((ns) => [...ns, ...newNodes]);
    if (newZones.length) setZones((zs) => [...zs, ...newZones]);
    if (newEdges.length) setEdges((es) => [...es, ...newEdges]);
    setSel(newNodes.length && newZones.length
      ? { kind: "mixed", ids: newNodes.map((n) => n.id), zoneIds: newZones.map((z) => z.id) }
      : newNodes.length ? { kind: "nodes", ids: newNodes.map((n) => n.id) }
      : newZones.length > 1 ? { kind: "zones", ids: newZones.map((z) => z.id) }
      : { kind: "zone", id: newZones[0].id });
    return true;
  };

  /* System copy/cut/paste. Bound on window so the canvas doesn't need focus,
     but ignored while a text field has it. */
  useEffect(() => {
    const inField = () => {
      const tag = document.activeElement && document.activeElement.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };
    const onCopy = (e, cut) => {
      if (inField()) return;
      const payload = clipPayload();
      if (!payload) return;
      e.preventDefault();
      e.clipboardData.setData("text/plain", JSON.stringify(payload));
      if (cut) deleteSel();
    };
    const onCut = (e) => onCopy(e, true);
    const onPaste = (e) => {
      if (inField()) return;
      let data = null;
      try { data = JSON.parse(e.clipboardData.getData("text/plain")); } catch { return; }
      if (pastePayload(data)) e.preventDefault();
    };
    window.addEventListener("copy", onCopy);
    window.addEventListener("cut", onCut);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("cut", onCut);
      window.removeEventListener("paste", onPaste);
    };
  });  // re-bound every render so handlers see fresh state

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
    const edgeShifts = [];
    for (const z of zones) {
      const p = pos[z.id];
      if (!p) continue;
      const dx = (p.x != null ? p.x : z.x) - z.x, dy = (p.y != null ? p.y : z.y) - z.y;
      if (dx || dy) {
        for (const n of nodesInZone(z)) shift[n.id] = { dx, dy };
        edgeShifts.push({ moved: new Set([z.id, ...nodesInZone(z).map((n) => n.id)]), dx, dy });
      }
    }
    snapshot();
    setZones((zs) => zs.map((z) => (pos[z.id] ? { ...z, ...pos[z.id] } : z)));
    setNodes((ns) => ns.map((n) => (shift[n.id]
      ? { ...n, x: snap(n.x + shift[n.id].dx), y: snap(n.y + shift[n.id].dy) } : n)));
    if (edgeShifts.length) {
      setEdges((es) => edgeShifts.reduce((acc, { moved, dx, dy }) =>
        translateEdgePts(acc, moved, dx, dy), es));
    }
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
  useEffect(() => { localStorage.setItem("ew-aws-region", awsRegion); }, [awsRegion]);
  useEffect(() => { localStorage.setItem("ew-aws-key-id", awsKeyId); }, [awsKeyId]);
  useEffect(() => { localStorage.setItem("ew-aws-secret", awsSecret); }, [awsSecret]);
  useEffect(() => { localStorage.setItem("ew-aws-session", awsSession); }, [awsSession]);
  useEffect(() => { localStorage.setItem("ew-bedrock-model", model); }, [model]);
  useEffect(() => { localStorage.setItem("ew-elastic-url", kibanaUrl); }, [kibanaUrl]);
  useEffect(() => { localStorage.setItem("ew-es-url", esUrl); }, [esUrl]);
  useEffect(() => { localStorage.setItem("ew-elastic-key", elasticKey); }, [elasticKey]);
  useEffect(() => { localStorage.setItem("ew-elastic-agent", elasticAgent); }, [elasticAgent]);
  useEffect(() => { localStorage.setItem("ew-elastic-space", elasticSpace); }, [elasticSpace]);
  useEffect(() => { localStorage.setItem("ew-elastic-index", elasticIndexName); }, [elasticIndexName]);
  useEffect(() => { localStorage.setItem("ew-jina-key", jinaKey); }, [jinaKey]);
  useEffect(() => { localStorage.setItem("ew-minimap", minimap ? "1" : "0"); }, [minimap]);

  /* Track the viewport's size for the minimap's camera rectangle. */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const measure = () => setVpSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [present]);

  useEffect(() => {
    const el = chatLogRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMsgs, chatBusy, chatSteps]);

  /* Push a fully-built board + its section metadata into state (one undoable
     step). Used by both the first (from-scratch) AI build and manual inserts. */
  const commitBoard = (board, meta) => {
    docRef.current = board;
    sectionsRef.current = meta;
    setNodes(board.nodes);
    setEdges(board.edges);
    setZones(board.zones);
    setSel(null);
    // Fit from the new board directly — state hasn't flushed, so fit()/bbox()
    // would frame the previous board.
    fitTo(boxOf(board.nodes, board.zones));
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

  /* The sections a tool payload asks for, normalised: unknown templates
     dropped, an id assigned if the model forgot one, and the label folded into
     the fill the templates read. */
  const aiSections = (res) => (Array.isArray(res?.sections) ? res.sections : [])
    .filter((s) => s && s.template && TEMPLATES_OK.has(s.template))
    .map((s, i) => ({ id: s.id || `${s.template}${i}`, template: s.template,
                      ...(s.row ? { row: true } : {}), ...(s.below ? { below: s.below } : {}),
                      ...(s.props ? { props: s.props } : {}),
                      ...(+s.step > 0 ? { step: Math.round(+s.step) } : {}),
                      fill: { ...(s.fill || {}), ...(s.label ? { label: s.label } : {}) } }));

  /* Tracked sections that are still on the board — an undo or a manual delete
     can take a section's nodes away without the metadata noticing. */
  const trackedSections = () => {
    const present = new Set([...docRef.current.nodes.map((n) => n.id), ...docRef.current.zones.map((z) => z.id)]);
    const secs = {};
    for (const [sid, m] of Object.entries(sectionsRef.current)) {
      if (Object.values(m.keys).some((id) => present.has(id)) || (m.zoneId && present.has(m.zoneId))) secs[sid] = m;
    }
    return secs;
  };

  const sectionLabel = (s) => s?.fill?.label || TEMPLATE_CONFIG[s?.template]?.label || s?.template;
  const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /* What an edit_whiteboard payload would do to the board, without doing it:
     the sections it adds, rebuilds, and removes, plus the commit that performs
     the whole thing. Nothing is read at commit time from here — applyAI works
     from the live board — so the plan can sit in front of the user while they
     keep moving things around. */
  const planAI = (res) => {
    const incoming = aiSections(res);
    const secs = trackedSections();
    const removeIds = (res?.remove || []).filter((id) => secs[id]);
    if (!incoming.length && !removeIds.length) return null;
    const changed = (s) => !(s.template === secs[s.id].template && sameJSON(s.fill, secs[s.id].fill)
      && sameJSON(s.props, secs[s.id].props) && (s.step || 0) === (secs[s.id].step || 0));
    return {
      added: incoming.filter((s) => !secs[s.id] && !removeIds.includes(s.id)).map(sectionLabel),
      rebuilt: incoming.filter((s) => secs[s.id] && changed(s)).map(sectionLabel),
      removed: removeIds.map((id) => sectionLabel(secs[id])),
      commit: () => applyAI(res),
    };
  };

  /* Interpret the edit_whiteboard tool payload. On an empty board this lays out
     the whole design deterministically. On an existing board it edits
     incrementally: unchanged sections stay exactly where the user put them
     (drags + waypoints preserved), changed sections re-render in place, new
     sections are placed alongside, and cross-section flows are rebuilt.
     Omitting `edges` keeps the flows already on the board, which is how a
     sizing update resizes a cluster without redrawing the diagram around it. */
  const applyAI = (res) => {
    if (!res || typeof res !== "object") return null;
    const incoming = aiSections(res);
    const removeIds = new Set(res.remove || []);
    if (!incoming.length && !removeIds.size) return null;

    const secs = trackedSections();

    snapshot();

    // First build (nothing tracked yet): full deterministic lane layout.
    if (!Object.keys(secs).length) {
      const board = buildFromSections(incoming, res.edges || []);
      commitBoard({ nodes: board.nodes, edges: board.edges, zones: board.zones }, board.meta);
      return board;
    }

    // ---- incremental edit ----
    const incomingById = new Map(incoming.map((s) => [s.id, s]));
    const rebuild = new Set(), keep = new Set();
    for (const sid of Object.keys(secs)) {
      if (removeIds.has(sid)) continue;
      const inc = incomingById.get(sid);
      if (!inc) { keep.add(sid); continue; }
      // props and step changes (node counts, hardware, reveal order) rebuild too
      if (inc.template === secs[sid].template && sameJSON(inc.fill, secs[sid].fill)
          && sameJSON(inc.props, secs[sid].props) && (inc.step || 0) === (secs[sid].step || 0)) keep.add(sid);
      else rebuild.add(sid);
    }
    const news = incoming.filter((s) => !secs[s.id] && !removeIds.has(s.id));
    const gone = new Set([...removeIds, ...rebuild]);
    const goneOwns = (id) => [...gone].some((sid) => ownsId(id, sid));

    const cur = docRef.current;
    let nodes = cur.nodes.filter((n) => !goneOwns(n.id));
    let zones = cur.zones.filter((z) => !goneOwns(z.id));
    /* Cross-section flows are rebuilt from the payload, so the ones on the
       board are dropped — but their user-shaped bends are kept and re-applied
       to the same pairing. A payload with no `edges` at all isn't rewiring
       anything, so those flows stay exactly as they are, which is how a sizing
       update resizes a cluster in place. Everything else survives: a rebuilt
       section's own internal edges come back with it, and slots keep their ids,
       so a hand-drawn connection into a resized cluster still lands. Anything
       left pointing at a slot the rebuild dropped is pruned at the end. */
    const recross = Array.isArray(res.edges);
    const oldCrossPts = {};
    let edges = cur.edges.filter((ed) => {
      if (recross && String(ed.id).startsWith("x")) {
        if (ed.pts) oldCrossPts[`${ed.s}|${ed.e}`] = ed.pts;
        return false;
      }
      return !goneOwns(ed.id);
    });

    const meta = {};
    for (const sid of keep) meta[sid] = secs[sid];

    const metaOf = (s, inst) => ({ template: s.template, fill: s.fill,
      ...(s.props ? { props: s.props } : {}), ...(s.step ? { step: s.step } : {}),
      keys: inst.keys, zoneId: inst.zone ? inst.zone.id : null });

    // rebuild changed sections anchored to their current top-left node
    for (const sid of rebuild) {
      const inc = incomingById.get(sid);
      const at = (origin) => instantiateTemplate(inc.template, inc.fill, origin, sid, inc.props, { step: inc.step });
      const fresh = at({ x: 0, y: 0 });
      if (!fresh || !fresh.nodes.length) continue;
      const lmx = Math.min(...fresh.nodes.map((n) => n.x)), lmy = Math.min(...fresh.nodes.map((n) => n.y));
      const old = cur.nodes.filter((n) => n.id.startsWith(`${sid}__`));
      const cmx = Math.min(...old.map((n) => n.x)), cmy = Math.min(...old.map((n) => n.y));
      const inst = at({ x: cmx - lmx, y: cmy - lmy });
      nodes.push(...inst.nodes); edges.push(...inst.edges); if (inst.zone) zones.push(inst.zone);
      meta[sid] = metaOf(inc, inst);
    }

    // place new sections in a fresh column to the right of existing content
    let box = boxOf(nodes, zones);
    let curY = box ? box.y0 : 80;
    const rightX = box ? box.x1 + 160 : 80;
    for (const s of news) {
      const inst0 = instantiateTemplate(s.template, s.fill, { x: 0, y: 0 }, s.id, s.props, { step: s.step });
      if (!inst0 || !inst0.nodes.length) continue;
      const p = shiftInst(inst0, rightX, curY);
      nodes.push(...p.nodes); edges.push(...p.edges); if (p.zone) zones.push(p.zone);
      meta[s.id] = metaOf(s, p);
      curY = p.bbox.y + p.bbox.h + 90;
    }

    // rebuild cross-section flows for the resulting section set; a *Zone flag
    // pins that end to the section's zone box rather than a port node
    (res.edges || []).forEach((e, i) => {
      const at = (ref, dir, zoneLevel) => {
        if (zoneLevel) { const m = meta[String(ref).split(".")[0]]; if (m && m.zoneId) return m.zoneId; }
        return sectionEndpoint(ref, dir, meta);
      };
      const s = at(e.source, "out", e.sourceZone), t = at(e.target, "in", e.targetZone);
      if (!s || !t || s === t) return;
      const pts = oldCrossPts[`${s}|${t}`];
      edges.push({ id: uid("x"), s, e: t, ...(e.label ? { lbl: e.label } : {}), ...(pts ? { pts } : {}) });
    });

    // a rebuild can drop a slot (a tier the design no longer has), so anything
    // still pointing at one goes with it
    const live = new Set([...nodes.map((n) => n.id), ...zones.map((z) => z.id)]);
    const board = { nodes, zones, edges: edges.filter((ed) => live.has(ed.s) && live.has(ed.e)) };
    commitBoard(board, meta);
    return board;
  };

  /* World coordinates at the middle of the visible canvas. */
  const centerOfViewport = () => {
    const el = viewportRef.current;
    if (!el) return { x: 0, y: 0 };
    return { x: (el.clientWidth / 2 - view.x) / view.k,
             y: (el.clientHeight / 2 - view.y) / view.k };
  };

  /* Insert a deterministic template block at the bottom-left of the existing
     diagram (or viewport center on an empty board) and track it as a section
     so the AI can later reference/modify it. */
  const insertTemplate = (templateId, fill) => {
    const sid = uid("sec");
    const inst = instantiateTemplate(templateId, fill || {}, { x: 0, y: 0 }, sid);
    if (!inst || !inst.nodes.length) return;
    snapshot();
    const b = bbox();
    let px, py;
    if (b) {
      px = b.x0;
      py = b.y1 + 140;
    } else {
      const c = centerOfViewport();
      px = c.x - inst.bbox.w / 2;
      py = c.y - inst.bbox.h / 2;
    }
    const p = shiftInst(inst, px, py);
    setNodes((ns) => [...ns, ...p.nodes]);
    setEdges((es) => [...es, ...p.edges]);
    if (p.zone) setZones((zs) => [...zs, p.zone]);
    sectionsRef.current = { ...sectionsRef.current,
      [sid]: { template: templateId, fill: fill || {}, keys: p.keys, zoneId: p.zone ? p.zone.id : null } };
    setSel(null);
    /* Re-frame the view around old content + the new block. Computed from the
       placed instance directly (state hasn't flushed yet, so fit() would frame
       the pre-insert board and leave the block off-screen). */
    fitTo({
      x0: Math.min(b ? b.x0 : Infinity, p.bbox.x),
      y0: Math.min(b ? b.y0 : Infinity, p.bbox.y),
      x1: Math.max(b ? b.x1 : -Infinity, p.bbox.x + p.bbox.w),
      y1: Math.max(b ? b.y1 : -Infinity, p.bbox.y + p.bbox.h),
    });
  };

  /* One credentials object for every model call; missing keys open settings. */
  const hasAwsCreds = !!(awsKeyId && awsSecret);
  /* Opening the panel expands whatever needs attention: the Bedrock block when
     there's no key yet, otherwise nothing, so Check AI is the first thing in
     reach for someone running through the pre-flight before presenting. */
  const toggleChatSettings = () => {
    if (!showChatSettings) setSettingsPane(hasAwsCreds ? null : "bedrock");
    setShowChatSettings((s) => !s);
  };
  const bedrockCfg = () => ({
    region: awsRegion, model,
    accessKeyId: awsKeyId, secretAccessKey: awsSecret, sessionToken: awsSession,
  });

  /* Load credentials from ~/.aws/credentials. Under `npm run dev` the Vite
     server reads the file itself; on a static host (Vercel etc.) there is no
     server-side home directory, so it falls back to a file picker and the
     user selects the file by hand. Either way the same parser fills the
     fields and nothing leaves the browser. */
  const applyAwsProfile = (profile) => {
    setAwsKeyId(profile.accessKeyId);
    setAwsSecret(profile.secretAccessKey);
    setAwsSession(profile.sessionToken || "");
    if (profile.region) setAwsRegion(profile.region);
    setAwsProfileName(profile.name);
    setCredsNote(`Loaded profile "${profile.name}"${profile.sessionToken ? " (with session token)" : ""}`);
  };
  const takeAwsCredsText = (text, from) => {
    const found = usableProfiles(parseAwsCredentials(text));
    if (!found.length) return setCredsNote(`No usable profiles in ${from}.`);
    setAwsProfiles(found.length > 1 ? found : null);
    applyAwsProfile(found[0]);   // "default" first; the picker switches profiles
  };
  const loadAwsCreds = async () => {
    try {
      const res = await fetch("/__aws/credentials", { headers: { accept: "text/plain" } });
      const text = res.ok ? await res.text() : "";
      // a static host's SPA fallback answers everything with index.html
      if (res.ok && !text.trimStart().startsWith("<"))
        return takeAwsCredsText(text, "~/.aws/credentials");
    } catch { /* no dev server — fall through to the picker */ }
    credsFileRef.current?.click();
  };
  const pickAwsCredsFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) file.text().then((text) => takeAwsCredsText(text, file.name));
  };

  /* ---------- the customer's own documents ---------- */

  /* Attach what they actually asked for, so the design can be built to it and
     checked against it. Text only and parsed here in the browser — nothing is
     uploaded anywhere by attaching it. */
  const attachDocument = ({ name, text }) => {
    const body = String(text || "").trim();
    if (!body) return "There's nothing in that.";
    if (body.length > DOC_MAX_CHARS)
      return `That's ${Math.round(body.length / 1000)}k characters — trim it to about ${DOC_MAX_CHARS / 1000}k, or attach the section that matters.`;
    const used = documents.reduce((sum, d) => sum + d.text.length, 0);
    if (used + body.length > DOC_TOTAL_MAX_CHARS)
      return "This board is holding about as much text as it can. Remove a document before adding another.";

    setDocuments((docs) => [...docs, {
      id: `doc${Date.now().toString(36)}`,
      name: String(name || "").trim() || `Pasted text ${docs.length + 1}`,
      text: body,
      addedAt: Date.now(),
    }]);
    return "";
  };

  const removeDocument = (id) => setDocuments((docs) => docs.filter((d) => d.id !== id));

  /* ---------- AI chat ----------
     A turn either answers a question or calls a tool. Tools don't touch the
     board directly: they stage the change and hand the model the plan, which it
     then describes, so the room sees what is about to happen before it does. */

  const toolFailed = (error) => ({ ok: false, error });

  /* Each tool in the words someone watching would use. The trail under a reply
     is the only place the architecture is visible while presenting: without it
     a grounded answer and a guessed one look identical. */
  const TOOL_TRAIL = {
    edit_whiteboard: "drew the diagram",
    size_deployment: "ran the sizing engine",
    search_knowledge: "searched the knowledge base",
    review_board: "ran the design review",
    lookup_integrations: "searched the integration catalog",
    quote_deployment: "priced it at list",
  };

  /* The same tools mid-flight, for the live feed while the turn runs. */
  const TOOL_DOING = {
    edit_whiteboard: "drawing the diagram",
    size_deployment: "running the sizing engine",
    search_knowledge: "searching the knowledge base",
    review_board: "running the design review",
    lookup_integrations: "searching the integration catalog",
    quote_deployment: "pricing it at list",
  };

  /* Fold the loop's step events into the live feed: tools append a line, and
     the result that follows settles that line rather than adding another. */
  const noteStep = (step) => setChatSteps((steps) => {
    if (step.kind !== "result") return [...steps, step];
    const open = steps.findLastIndex((s) => s.kind === "tool" && s.name === step.name && s.ok === undefined);
    return open < 0 ? steps : steps.map((s, i) => (i === open ? { ...s, ok: step.ok } : s));
  });

  /* What a staged edit says it will do, in the order the panel lists it. */
  const planLines = (plan) => [
    plan.added.length && `Adds ${plan.added.join(", ")}`,
    plan.rebuilt.length && `Rebuilds ${plan.rebuilt.join(", ")}`,
    plan.removed.length && `Removes ${plan.removed.join(", ")}`,
  ].filter(Boolean);

  /* An edit_whiteboard payload aimed at a named side board: built from scratch
     with the same deterministic layout and written straight into a new board.
     It isn't the diagram the room is looking at, so there is nothing for the
     Apply gate to protect — and alternatives land in one turn, ready to flip
     between or compare from the boards menu. */
  const drawSideBoard = (name, res) => {
    const incoming = aiSections(res);
    if (!incoming.length) return toolFailed("Drawing a board needs at least one section.");
    const built = buildFromSections(incoming, res.edges || []);
    const finalName = addBoardAside(name, {
      nodes: built.nodes, edges: built.edges, zones: built.zones,
      view: { ...DEFAULT_VIEW }, sections: built.meta,
    });
    flashSeedNote(`Drew "${finalName}"`);
    return { ok: true, board: finalName, created: true,
             note: "Drawn on its own board. The user opens it from the boards menu, which also compares any two boards side by side. To change it later they open it first." };
  };

  const runEditTool = (input) => {
    const boardName = String(input.board || "").trim();
    if (boardName && boardName !== activeBoard.name) return drawSideBoard(boardName, input);
    const plan = planAI(input);
    if (!plan) return toolFailed("Nothing to do: no known sections to add or change, and nothing on the board matching `remove`.");
    const lines = planLines(plan);
    setPendingApply({ label: input.message || "Edit the diagram", lines, commit: plan.commit });
    return { ok: true, staged: "waiting for the user to Apply it", added: plan.added,
             rebuilt: plan.rebuilt, removed: plan.removed };
  };

  /* Run the deterministic sizing engine for the model, then stage what it would
     draw: a resize of the cluster already on the board (which keeps the diagram
     around it intact), or a whole architecture on a board that has no cluster
     yet. */
  const runSizingTool = (input) => {
    const result = sizeCluster(input);
    if (!result.tiers.length)
      return toolFailed("Nothing to size — that needs an ingest volume and at least one tier's retention.");
    const hardware = recommendHardware(result);
    const cluster = sizedClusterSection(result, hardware);
    const secs = trackedSections();
    const sid = Object.keys(secs).find((id) => secs[id].template === "cluster");
    const facts = sizingFacts(result, cluster.hardwareByKey);

    if (sid) {
      const payload = { sections: [{ id: sid, template: "cluster", fill: cluster.fill, props: cluster.props }] };
      setPendingApply({
        label: `Resize ${sectionLabel(secs[sid])} to ${result.nodes} nodes`,
        lines: sizingLines(result), commit: () => applyAI(payload),
      });
      return { ok: true, staged: "waiting for the user to Apply it", resized: sid, ...facts };
    }
    setPendingApply({
      label: `Draw a ${result.nodes}-node deployment`,
      lines: sizingLines(result),
      commit: () => { drawSizing(result, hardware); return true; },
    });
    return { ok: true, staged: "waiting for the user to Apply it", drew: "a new architecture", ...facts };
  };

  /* Everything the model is allowed to cite: Elastic's curated guidance, which
     is the same every session, plus whatever is attached to this board. The
     corpus index is built once and reused; adding a document rebuilds over
     both, because a term's weight should be judged against the whole corpus
     rather than each half separately. */
  const docPassages = useMemo(
    () => documents.flatMap((d) => chunkDocument(d.text, {
      id: d.id, title: d.name, source: d.name, tags: [SCOPE_CUSTOMER],
    })),
    [documents]);

  const knowledgeIndex = useMemo(
    () => (docPassages.length ? buildIndex([...ELASTIC_CORPUS, ...docPassages]) : elasticIndex()),
    [docPassages]);

  const elasticCfg = () => ({
    kibanaUrl, esUrl, apiKey: elasticKey, agentId: elasticAgent,
    space: elasticSpace, index: elasticIndexName,
    origin: typeof window === "undefined" ? "" : window.location.origin,
  });
  const hasElastic = elasticConfigured({ kibanaUrl, apiKey: elasticKey });

  /* Local retrieval: the repo corpus and this board's documents, scored here
     in the browser. It needs no network and no deployment, which is what
     makes it the floor the Elastic path can fall back to. */
  const searchLocal = (query, scope) => {
    let hits = searchPassages(knowledgeIndex, query, { scope });
    let note;
    /* A query over the customer's documents that shares no words with them
       still has to answer — they're a handful of passages someone chose to
       attach, so handing them over beats "nothing matched". The common case
       is an image: "what do you see?" shares nothing with what the vision
       model wrote about it. */
    if (!hits.length && scope === SCOPE_CUSTOMER && docPassages.length) {
      hits = docPassages.slice(0, 6);
      note = "Nothing matched the query's words, so this is the attached documents' own content, from the top.";
    }
    return {
      ok: true,
      provider: "the repo corpus",
      found: hits.length,
      results: renderPassages(hits),
      sources: citedSources(hits),
      ...(note ? { note } : {}),
    };
  };

  /* Retrieval, through Elastic's own agent when one is configured and local
     otherwise. Returns the passages as text for the model and the sources
     separately, so the interface can show what the answer rests on without
     depending on the model to repeat them faithfully.

     Customer documents never go to the agent: they live on this board and
     nowhere else unless the user deliberately pushes them to the index. */
  const runKnowledgeTool = async (input) => {
    const query = String(input.query || "").trim();
    if (!query) return toolFailed("Searching needs a query.");
    const scope = input.scope && input.scope !== "all" ? input.scope : undefined;
    if (scope === SCOPE_CUSTOMER && !docPassages.length)
      return toolFailed("No documents are attached to this board, so there is nothing the customer has said to search. Answer from Elastic's guidance instead, or ask them to attach the document.");

    if (!hasElastic || scope === SCOPE_CUSTOMER) return searchLocal(query, scope);

    try {
      const { text, steps } = await askAgent({ ...elasticCfg(), input: query });
      if (!text) return searchLocal(query, scope);
      return {
        ok: true,
        provider: "an Elastic Agent Builder agent",
        results: text,
        sources: [`Elastic Agent Builder — ${elasticAgent}`],
        ...(steps.length ? { agentTools: steps } : {}),
      };
    } catch (err) {
      /* The whole reason the local corpus exists: Kibana being unreachable
         mid-demo degrades the answer rather than losing it. */
      const local = searchLocal(query, scope);
      return { ...local, note: `Agent Builder was unreachable (${err.message}), so this came from the repo corpus instead.` };
    }
  };

  /* The same review the Σ panel shows, run on demand. Deliberately over the
     board as it stands rather than over a staged change: the user is looking
     at the board, and a review of a diagram nobody has seen yet would be
     answering a different question. */
  const runReviewTool = () => {
    const findings = validateBoard(docRef.current.nodes, docRef.current.edges, docRef.current.zones);
    return {
      ok: true,
      findings: findings.map(({ id, level, title, detail }) => ({ id, level, title, detail })),
      clean: findings.length === 0,
      ...(pendingApply ? { note: "A change is staged but not applied, so this describes the board without it." } : {}),
    };
  };

  const runIntegrationsTool = (input) => {
    const query = String(input.query || "").trim().toLowerCase();
    if (!query) return toolFailed("Searching the catalog needs something to search for.");
    const category = String(input.category || "").trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = INTEGRATIONS
      .filter(([title, cat]) => (!category || cat === category)
        && terms.every((t) => title.toLowerCase().includes(t)))
      .slice(0, 25);
    return matches.length
      ? { ok: true, found: matches.length, integrations: matches.map(([title, cat]) => ({ title, category: cat })) }
      : { ok: true, found: 0, integrations: [],
          note: `No integration matches "${input.query}". Say so rather than inventing one — the data source can still be drawn with a plain title and no integration.` };
  };

  /* List pricing through the engine that feeds the ROM builder, so the chat
     and the capacity panel can never quote different numbers. */
  const runQuoteTool = (input) => {
    const model = input.model || quote.model;
    const cloud = model === LICENSE_ECU;
    const ecuTotal = input.ecuTotal ?? quote.ecu;
    if (cloud && !Number(ecuTotal))
      return toolFailed("Elastic Cloud is metered, so the ECU figure has to come from the Cloud pricing calculator — it can't be derived from the diagram. Ask for it, or quote on resource units instead.");

    const rows = romRows(totals, {
      model,
      unitPrice: input.unitPrice ?? quote.price,
      discount: input.discount ?? quote.discount,
      ecuTotal,
    });
    if (!rows.length)
      return toolFailed("Nothing to price: the board carries no memory figures yet. Set node counts and RAM on the tiers, or size it from ingest first.");

    const [row] = rows;
    const cell = projectCell(row, 0, {});
    return {
      ok: true,
      meter: cloud ? "Elastic Consumption Units" : `${RU_GB} GB Enterprise Resource Units`,
      quantity: row.quantity,
      derivedFrom: cloud ? "the ECU figure supplied" : `${row.ramGB} GB of licensed memory`,
      description: row.description,
      ...(row.descNote ? { note: row.descNote } : {}),
      unitPrice: cell.priced ? formatCurrency(cell.unitPrice) : "not set on the board",
      ...(cell.hasDiscount ? { discountPct: cell.discountPct } : {}),
      annualTotal: cell.priced
        ? formatCurrency(cell.lineTotal)
        : "unpriced — no unit price is set on the board, so say the quantity and leave the money out",
      caveat: "List price on an annual term. A rough order of magnitude, not a quote.",
    };
  };

  const dispatchTool = (use) => {
    const input = use.input || {};
    if (use.name === "edit_whiteboard") return runEditTool(input);
    if (use.name === "size_deployment") return runSizingTool(input);
    if (use.name === "search_knowledge") return runKnowledgeTool(input);
    if (use.name === "review_board") return runReviewTool();
    if (use.name === "lookup_integrations") return runIntegrationsTool(input);
    if (use.name === "quote_deployment") return runQuoteTool(input);
    return toolFailed(`There is no ${use.name} tool.`);
  };

  const applyPending = () => {
    if (!pendingApply) return;
    const done = pendingApply.commit();
    setPendingApply(null);
    if (done) flashSeedNote("Applied the AI's change — ⌘Z undoes it");
    else setChatMsgs((m) => [...m, { role: "error", text: "The board moved on — that change no longer fits, so nothing was applied." }]);
  };

  const sendChat = async (canned) => {
    const text = String(canned ?? chatInput).trim();
    if (!text || chatBusy) return;
    if (!hasAwsCreds) { setChatOpen(true); setShowChatSettings(true); setSettingsPane("bedrock"); return; }
    if (canned === undefined) setChatInput("");
    setPendingApply(null);
    const history = [...chatMsgs, { role: "user", text }];
    setChatMsgs(history);
    setChatBusy(true);
    setChatSteps([]);
    try {
      const convo = history
        .filter((m) => m.role === "user" || m.role === "ai")
        .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
      const board = describeDoc(docRef.current, TYPES) + describeSections(sectionsRef.current);
      const out = await runLLM(
        bedrockCfg(),
        { system: chatSystem(WB_CATALOG, board, warnings, describeCustomer(customer)), messages: convo,
          tools: WB_TOOL, onToolUse: dispatchTool, onStep: noteStep },
        { loop: true });
      setChatUsage(out.usage);
      const failed = out.calls.find((c) => c.result.ok === false);
      const staged = out.calls.some((c) => c.result.staged);
      const fallback = failed ? failed.result.error
        : staged ? "Staged that change — Apply it when you're ready." : "Done.";
      /* What the reply rests on, taken from the tool results rather than from
         the prose, so the line is right even when the model forgets to cite. */
      const sources = [...new Set(out.calls.flatMap((c) => c.result?.sources || []))];
      const trail = out.calls.map((c) => ({
        did: TOOL_TRAIL[c.name] || c.name,
        ok: c.result.ok !== false,
      }));
      setChatMsgs((m) => [...m, {
        role: failed && !out.text ? "error" : "ai",
        text: out.text || fallback,
        ...(sources.length ? { sources } : {}),
        ...(trail.length ? { trail } : {}),
      }]);
    } catch (err) {
      setChatMsgs((m) => [...m, { role: "error", text: err.message || String(err) }]);
    } finally {
      setChatBusy(false);
    }
  };

  /* Open the chat on a canned turn — the review panel's Fix the findings, and
     the post-import actions, all arrive this way. */
  const askAI = (text) => {
    setChatOpen(true);
    sendChat(text);
  };

  /* The findings are already in the system prompt, so this only has to ask. */
  const fixFindings = () => askAI(
    "Fix the review findings on this board. Change only what a finding calls for, "
    + "leave the rest of the design alone, and say which findings your change addresses "
    + "and which ones need a decision from us instead.");

  /* A turn that has to wait for a board switch to land: docRef is only current
     as of the last render, so the snapshot would otherwise describe the board
     the user just left. */
  useEffect(() => {
    if (!askQueue) return;
    setAskQueue(null);
    askAI(askQueue);
  }, [askQueue]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Elastic, browser-direct ---------- */

  /* Push the repo corpus into the semantic_text index the agent searches, and
     optionally this board's documents with it. Re-runnable on purpose: the
     repo stays the source of truth, so correcting a passage in git and
     pushing again is the workflow. Documents are opt-in every time — sending
     a prospect's RFP to a shared index should never be the default. */
  const pushToIndex = async (includeDocuments) => {
    if (!esUrl.trim()) return setPushState({ error: "Set the Elasticsearch endpoint first — it's a different host from Kibana on Elastic Cloud." });
    setPushState({ busy: true });
    const passages = [...ELASTIC_CORPUS, ...(includeDocuments ? docPassages : [])];
    try {
      const cfg = elasticCfg();
      const { created } = await ensureIndex(cfg);
      const { indexed, errors } = await bulkPassages({ ...cfg, passages, version: KNOWLEDGE_VERSION });
      setPushState({
        note: `${indexed} passage${indexed === 1 ? "" : "s"} into ${elasticIndexName}`
          + `${created ? ", which was created" : ""}`
          + `${includeDocuments && docPassages.length ? `, including ${docPassages.length} from this board's documents` : ""}.`,
        errors,
      });
    } catch (err) {
      setPushState({ error: err.message, help: err.help });
    }
  };

  /* Does the whole path work, right now, before anyone is watching? Each leg
     reports how it failed, not just that it did — a 403 on the key, a 400 on
     the agent id, and a blocked preflight need three different fixes. */
  const runPreflight = async () => {
    setPreflight({ busy: true });
    const result = {};

    if (!hasAwsCreds) {
      result.bedrock = { ok: false, error: "No AWS key and secret set." };
    } else {
      const started = Date.now();
      try {
        await runLLM(bedrockCfg(),
          { system: "Reply with the single word: ready.", messages: [{ role: "user", content: "ready?" }] },
          { text: true });
        result.bedrock = { ok: true, ms: Date.now() - started, detail: `${model} in ${awsRegion}` };
      } catch (err) {
        result.bedrock = { ok: false, ms: Date.now() - started, error: err.message };
      }
    }

    if (hasElastic) {
      result.agent = await checkAgent(elasticCfg());
      if (esUrl.trim()) result.index = await checkIndex(elasticCfg());
    }
    setPreflight(result);
  };

  /* ---------- presentation mode ---------- */

  const enterPresent = () => {
    setPresent(true);
    setSel(null);
    setTool(null);
    setPatternCfg(null);
    setChatOpen(false);
    setReviewOpen(false);
    if (stepCount > 0) goToStep(0);
  };
  const exitPresent = () => {
    setPresent(false);
    setSpotlight(null);
    setTool(null);
  };

  /* ---------- annotation layer (pen / arrow) ---------- */

  const [drawing, setDrawing] = useState(null);   // in-progress stroke
  const drawingRef = useRef(null);
  drawingRef.current = drawing;

  const startInk = (e) => {
    const p = toWorld(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrawing({ id: uid("ink"), kind: tool, color: inkColor, width: INK_WIDTH,
                 step: revealing ? step : 0, pts: [p] });
  };
  const moveInk = (e) => {
    const cur = drawingRef.current;
    if (!cur) return;
    const p = toWorld(e.clientX, e.clientY);
    if (cur.kind === "arrow") return setDrawing({ ...cur, pts: [cur.pts[0], p] });
    const last = cur.pts[cur.pts.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < INK_MIN_STEP) return;
    setDrawing({ ...cur, pts: [...cur.pts, p] });
  };
  const endInk = () => {
    const cur = drawingRef.current;
    setDrawing(null);
    if (!cur || cur.pts.length < 2) return;
    snapshot();
    setInk((all) => [...all, cur]);
  };
  const clearInk = () => {
    if (!ink.length) return;
    snapshot();
    setInk([]);
  };

  /* ---------- gestures ---------- */

  const { startPan, startMove, startResize, startConnect, startReconnect, startZoneMove, startZoneResize,
          startPalette, startEdgePoint, onMove, onUp } = useDragController({
    dragRef, viewportRef, lastClickRef,
    view, sel, nodes, edges, zones, nodeById,
    setView, setMarquee, setSel, setNodes, setZones, setEdges, setConnect, setGhost, setEditing,
    setGuides,
    toWorld, snapshot, uid, rectOf,
  });

  /* ---------- toolbar ---------- */

  /* Load a preset: a user-saved custom version if present, else the built-in. */
  const loadSeed = (key) => {
    snapshot();
    const custom = readJSON(seedKey(key));
    let nextNodes, nextZones;
    if (custom && Array.isArray(custom.nodes)) {
      nextNodes = clone(custom.nodes);
      nextZones = clone(custom.zones || []);
      setNodes(nextNodes);
      setEdges(clone(custom.edges || []));
      setZones(nextZones);
      sectionsRef.current = custom.sections ? clone(custom.sections) : {};
    } else {
      const s = SEEDS[key];
      nextNodes = clone(s.nodes);
      nextZones = clone(s.zones);
      setNodes(nextNodes);
      setEdges(s.edges.map((ed, i) => Array.isArray(ed)
        ? { id: `e${i}`, s: ed[0], e: ed[1], lbl: ed[2] }
        : { id: `e${i}`, s: ed.s, e: ed.e, lbl: ed.lbl, ...(ed.pts ? { pts: ed.pts } : {}), ...(ed.bi ? { bi: true } : {}), ...(ed.color ? { color: ed.color } : {}) }));
      setZones(nextZones);
      sectionsRef.current = {};
    }
    setSel(null);
    // Fit from the loaded data directly (fit() would see the pre-load board).
    fitTo(boxOf(nextNodes, nextZones));
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
    const { x: cx, y: cy } = centerOfViewport();
    const id = uid("z");
    setZones((zs) => [...zs, { id, x: snap(cx - 220), y: snap(cy - 150), w: 440, h: 300, label: "Zone", color: "#FEC514" }]);
    setSel({ kind: "zone", id });
  };

  /* Export filenames follow the board name. */
  const fileSlug = () =>
    (activeBoard.name || "elastic-whiteboard").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    || "elastic-whiteboard";

  const dl = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportJSON = () => {
    // Edges with a label, a hand-shaped path, pinned connection points, or a
    // zone endpoint are serialized as objects; plain node-to-node edges stay
    // compact [s, e] tuples.
    const serEdge = ({ s, e, lbl, pts, sa, ea }) =>
      (pts || sa || ea || zoneIdSet.has(s) || zoneIdSet.has(e))
        ? { s, e, ...(lbl ? { lbl } : {}), ...(pts ? { pts } : {}),
            ...(sa ? { sa } : {}), ...(ea ? { ea } : {}) }
        : (lbl ? [s, e, lbl] : [s, e]);
    dl(new Blob([JSON.stringify({ nodes, edges: edges.map(serEdge), zones,
                                  ...(views.length ? { views } : {}) }, null, 2)],
       { type: "application/json" }), `${fileSlug()}.json`);
  };

  /* Encode the document into a link that rebuilds it as a new board on open. */
  const copyShareLink = async () => {
    setFileMenu(false);
    if (!nodes.length && !zones.length) return flashSeedNote("Nothing to share yet");
    try {
      const payload = await encodeBoard({ name: activeBoard.name, nodes, edges, zones });
      const url = shareUrl(window.location.origin, window.location.pathname, window.location.hash, payload);
      if (url.length > 32000) return flashSeedNote("Board too large to share as a link — export JSON instead");
      await navigator.clipboard.writeText(url);
      flashSeedNote("Share link copied to clipboard");
    } catch {
      flashSeedNote("Couldn't copy the share link");
    }
  };

  /* A board arriving via ?board=… is imported once, as a new named board, and
     the payload is stripped from the URL so a refresh doesn't re-import it. */
  const sharedRef = useRef(false);
  useEffect(() => {
    if (sharedRef.current || following) return;
    sharedRef.current = true;
    const payload = boardParamFromHash(window.location.hash);
    if (!payload) return;
    let cancelled = false;
    decodeBoard(payload).then((doc) => {
      if (cancelled || !doc) return;
      const incoming = {
        nodes: doc.nodes.filter((n) => TYPES[n.type]),
        edges: doc.edges.map(hydrateEdge),
        zones: doc.zones,
        view: { ...DEFAULT_VIEW }, sections: {},
      };
      createBoard(nextBoardName(doc.name || "Shared board"), incoming);
      fitTo(boxOf(incoming.nodes, incoming.zones));
      const hash = window.location.hash;
      const q = hash.indexOf("?");
      if (q >= 0) window.history.replaceState(null, "", window.location.pathname + hash.slice(0, q));
    });
    return () => { cancelled = true; };
  }, []);
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
        setEdges(data.edges.map(hydrateEdge));
        setZones(Array.isArray(data.zones) ? data.zones : []);
        if (Array.isArray(data.views)) setViews(data.views);
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
  const fitTo = (bb) => {
    if (!bb) return;
    const el = viewportRef.current;
    const pad = 60, bw = bb.x1 - bb.x0 + pad * 2, bh = bb.y1 - bb.y0 + pad * 2;
    const k = Math.min(1.25, el.clientWidth / bw, el.clientHeight / bh);
    setView({ k, x: (el.clientWidth - (bb.x1 - bb.x0) * k) / 2 - bb.x0 * k,
                 y: (el.clientHeight - (bb.y1 - bb.y0) * k) / 2 - bb.y0 * k });
  };
  const fit = () => fitTo(bbox());

  /* ---------- saved views ---------- */

  /* Glide the camera to a target view — a cut is disorienting mid-presentation,
     a short pan reads as "we are moving over there". Reduced motion just cuts. */
  const flyTo = (target) => {
    if (flyRef.current) cancelAnimationFrame(flyRef.current);
    const to = { x: target.x, y: target.y, k: target.k };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return setView(to);
    const from = { ...view };
    const t0 = performance.now();
    const D = 450;
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    /* Clock our own elapsed time — the rAF timestamp's origin varies by
       environment and a mismatched one would send the camera flying. */
    const frame = () => {
      const f = ease(Math.min(1, Math.max(0, (performance.now() - t0) / D)));
      setView({ x: from.x + (to.x - from.x) * f,
                y: from.y + (to.y - from.y) * f,
                k: from.k + (to.k - from.k) * f });
      flyRef.current = f < 1 ? requestAnimationFrame(frame) : null;
    };
    flyRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => () => cancelAnimationFrame(flyRef.current), []);

  const goToView = (i) => {
    const v = views[i];
    if (!v) return;
    setViewIdx(i);
    flyTo(v);
  };
  const saveCurrentView = () => {
    setViews((vs) => [...vs, { id: uniqueId("v"), name: `View ${vs.length + 1}`, ...view }]);
  };
  const renameView = (id, name) =>
    setViews((vs) => vs.map((v) => (v.id === id && name.trim() ? { ...v, name: name.trim() } : v)));
  const deleteView = (id) => {
    setViews((vs) => vs.filter((v) => v.id !== id));
    setViewIdx(-1);
  };

  /* ---------- image export ---------- */

  const buildSVG = () => {
    const bb = bbox();
    if (!bb) return null;
    for (const s of ink) for (const p of s.pts) {
      bb.x0 = Math.min(bb.x0, p.x); bb.y0 = Math.min(bb.y0, p.y);
      bb.x1 = Math.max(bb.x1, p.x); bb.y1 = Math.max(bb.y1, p.y);
    }
    const pad = 48;
    const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    /* Optional chrome: a title block above the diagram and a colour legend
       below it, both sized here so the viewBox can make room. */
    const legendCats = exportChrome
      ? CATS.filter((c) => nodes.some((n) => !TYPES[n.type].annotation && TYPES[n.type].cat === c))
      : [];
    const titleH = exportChrome ? 62 : 0;
    const legendH = legendCats.length ? 40 : 0;
    const x0 = bb.x0 - pad, y0 = bb.y0 - pad - titleH;
    const W = bb.x1 - bb.x0 + pad * 2, H = bb.y1 - bb.y0 + pad * 2 + titleH + legendH;
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${W} ${H}" width="${W}" height="${H}" font-family="'Inter',system-ui,sans-serif">`;
    out += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${surface.bg}"/>`;
    if (exportChrome) {
      out += `<text x="${x0 + pad}" y="${y0 + 34}" font-family="'Mier B','Inter',sans-serif" font-size="22" fill="${surface.ink}">${esc(activeBoard.name)}</text>`;
      out += `<text x="${x0 + pad}" y="${y0 + 52}" font-family="'Space Mono',monospace" font-size="11" fill="${surface.muted}">Elastic architecture · ${new Date().toLocaleDateString()}</text>`;
      out += `<line x1="${x0 + pad}" y1="${y0 + titleH}" x2="${x0 + W - pad}" y2="${y0 + titleH}" stroke="${surface.line}"/>`;
    }
    if (legendCats.length) {
      let lx = x0 + pad;
      const ly = y0 + H - 18;
      for (const cat of legendCats) {
        out += `<rect x="${lx}" y="${ly - 8}" width="9" height="9" rx="2" fill="${CAT_COLORS[cat]}"/>`;
        out += `<text x="${lx + 15}" y="${ly}" font-size="11" fill="${surface.muted}">${esc(cat)}</text>`;
        lx += 15 + cat.length * 6.2 + 22;
      }
    }
    out += `<defs><marker id="xarr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>`;
    for (const z of zones) {
      out += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="14" fill="${z.color}" fill-opacity="0.045" stroke="${z.color}" stroke-opacity=".6" stroke-dasharray="7 5"/>`;
      out += `<text x="${z.x + 16}" y="${z.y - 8}" font-family="'Space Mono',monospace" font-size="11" letter-spacing="2" fill="${z.color}">${esc(z.label.toUpperCase())}</text>`;
    }
    for (const ed of edgeGeo) {
      const dashPattern = EDGE_STYLES[ed.style]?.dash;
      const dash = dashPattern ? `stroke-dasharray="${dashPattern}" ` : "";
      out += `<path d="${ed.d}" fill="none" stroke="${ed.color}" stroke-width="${ed.width || EDGE_DEFAULT_WIDTH}" stroke-linecap="round" ${dash}marker-end="url(#xarr)"${ed.bi ? ` marker-start="url(#xarr)"` : ""}/>`;
      if (ed.lbl) out += `<text x="${ed.mid.x}" y="${ed.mid.y - 7}" text-anchor="middle" font-family="'Space Mono',monospace" font-size="11" fill="${surface.muted}" stroke="${surface.bg}" stroke-width="4" paint-order="stroke">${esc(ed.lbl)}</text>`;
    }
    for (const n of nodes) {
      const t = TYPES[n.type], r = rectOf(n), tag = nodeTag(n, stages);
      if (t.annotation) {
        const isNote = t.annotation === "note";
        const size = isNote ? 13 : 19;
        const lines = wrapText(noteText(n), Math.max(1, Math.floor((r.w - 24) / (size * 0.54))));
        if (isNote) out += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3" fill="${tag}"/>`;
        const fill = isNote ? "#1C1E23" : (n.color || surface.ink);
        const font = isNote ? "'Inter',system-ui,sans-serif" : "'Mier B','Inter',sans-serif";
        const lh = size * 1.35;
        const top = isNote ? r.y + 13 + size : r.y + r.h / 2 + size * 0.35 - ((lines.length - 1) * lh) / 2;
        lines.forEach((ln, i) => {
          out += `<text x="${r.x + (isNote ? 13 : 4)}" y="${top + i * lh}" font-family="${font}" font-size="${size}" fill="${fill}">${esc(ln)}</text>`;
        });
        continue;
      }
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
    /* ink last so annotations sit on top of the diagram, matching the canvas */
    for (const s of ink) {
      const d = inkPath(s);
      if (!d) continue;
      const head = s.kind === "arrow" ? ` marker-end="url(#xink)"` : "";
      if (head && !out.includes('id="xink"')) {
        out = out.replace("</defs>",
          `<marker id="xink" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>`);
      }
      out += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"${head}/>`;
    }
    out += "</svg>";
    return out;
  };
  const exportSVG = () => {
    const svg = buildSVG();
    if (svg) dl(new Blob([svg], { type: "image/svg+xml" }), `${fileSlug()}.svg`);
  };

  /* Rasterize the export SVG at `scale`, handing the PNG blob to `done`.
     Falls back to the SVG itself if the canvas can't be read (tainted by a
     cross-origin logo, for instance). */
  const renderPNG = (scale, done) => {
    const svg = buildSVG();
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const bail = () => { dl(blob, `${fileSlug()}.svg`); URL.revokeObjectURL(url); };
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.width * scale; c.height = img.height * scale;
        const g = c.getContext("2d");
        g.scale(scale, scale);
        g.drawImage(img, 0, 0);
        c.toBlob((b) => { b ? done(b) : bail(); URL.revokeObjectURL(url); }, "image/png");
      } catch { bail(); }
    };
    img.onerror = bail;
    img.src = url;
  };
  const exportPNG = (scale = 2) => renderPNG(scale, (b) => dl(b, `${fileSlug()}.png`));
  const copyPNG = () => {
    setFileMenu(false);
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
      return flashSeedNote("This browser can't copy images — use Export PNG");
    renderPNG(2, async (b) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
        flashSeedNote("Diagram copied to clipboard");
      } catch { flashSeedNote("Couldn't copy the image"); }
    });
  };

  /* ---------- derived ---------- */

  /* Neighbourhood highlight: a pinned spotlight wins over transient hover, so
     a presenter can leave one subsystem lit while they talk about it. */
  const focus = spotlight || hover;
  const connected = useMemo(() => {
    if (!focus || (!spotlight && dragRef.current)) return null;
    const keep = new Set([focus]);
    for (const ed of edges) if (ed.s === focus || ed.e === focus) { keep.add(ed.s); keep.add(ed.e); }
    return keep;
  }, [focus, spotlight, edges]);

  const zoneIdSet = useMemo(() => new Set(zones.map((z) => z.id)), [zones]);

  // Edge geometry: a simple orthogonal elbow between endpoints (nodes or zones),
  // honouring any manual waypoints the user has dragged. No obstacle routing.
  const edgeGeo = useMemo(() => edges
    .filter((ed) => endpointRect(ed.s) && endpointRect(ed.e))
    .map((ed) => {
      const a = nodeById[ed.s], b = nodeById[ed.e];
      const pl = elbowPath(endpointRect(ed.s), endpointRect(ed.e), ed.pts, ed.sa, ed.ea);
      const mid = plMid(pl);
      const src = a || b;                          // colour from whichever end is a node
      const autoDashed = (a && TYPES[a.type].ops) || (b && TYPES[b.type].ops) || false;
      // Per-edge overrides win; otherwise colour inherits the source node's
      // category accent and ops-related links default to dashed.
      const color = ed.color || (src ? nodeTag(src, stages) : stages.ops);
      const style = ed.style || (autoDashed ? "dashed" : "solid");
      return { ...ed, d: roundedPath(pl), mid, len: mid.total, color, style };
    }), [edges, nodeById, zoneById, stages]);

  // wire canvas sized to content (+margin) so nothing clips on wide diagrams
  const wireBox = useMemo(() => {
    const boxes = [...zones, ...nodes.map((n) => rectOf(n))];
    if (!boxes.length) return { x: 0, y: 0, w: 4200, h: 2800 };
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const b of boxes) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
    // ink shares this canvas, so it has to fit inside the same viewBox
    for (const s of ink) for (const p of s.pts) {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    const pad = 240;
    return { x: x0 - pad, y: y0 - pad, w: (x1 - x0) + pad * 2, h: (y1 - y0) + pad * 2 };
  }, [nodes, zones, ink]);

  /* ---------- build steps ----------
     Elements tagged with a step appear as the presenter advances. Step 0 is
     the base layer (everything untagged), so a board with a max step of 3 has
     four beats. Beats are published through useSceneMotion, which is what puts
     the whiteboard on the presenter view's step controls. */
  const stepCount = useMemo(() => stepCountOf(nodes, zones), [nodes, zones]);
  const beats = useMemo(
    () => Array.from({ length: stepCount + 1 }, (_, i) => ({ step: i === 0 ? "Base" : String(i) })),
    [stepCount]);
  const { beat: step, goTo: goToStep } = useSceneMotion(beats);

  /* Which elements the current step reveals. In edit mode nothing disappears —
     not-yet-revealed elements are ghosted so they stay workable. */
  const revealing = stepCount > 0;
  const shown = (el) => !revealing || visibleAtStep(el, step);
  const ghosted = (el) => revealing && !visibleAtStep(el, step);
  const hiddenNow = (el) => present && ghosted(el);
  const visibleNodeIds = useMemo(() => {
    const ids = new Set();
    for (const n of nodes) if (!hiddenNow(n)) ids.add(n.id);
    for (const z of zones) if (!hiddenNow(z)) ids.add(z.id);
    return ids;
  }, [nodes, zones, present, step, revealing]);

  /* Tag (or clear) the build step on the current selection. */
  const setSelStep = (value) => {
    if (!sel) return;
    const nodeIds = new Set(sel.kind === "nodes" || sel.kind === "mixed" ? sel.ids : []);
    const zoneIds = new Set(sel.kind === "zone" ? [sel.id]
                          : sel.kind === "zones" ? sel.ids
                          : sel.kind === "mixed" ? sel.zoneIds : []);
    const apply = (el, ids) => (ids.has(el.id) ? { ...el, step: value || undefined } : el);
    snapshot();
    if (nodeIds.size) setNodes((ns) => ns.map((n) => apply(n, nodeIds)));
    if (zoneIds.size) setZones((zs) => zs.map((z) => apply(z, zoneIds)));
  };
  const selStep = (() => {
    if (!sel) return 0;
    const first = sel.kind === "nodes" || sel.kind === "mixed" ? nodeById[sel.ids[0]]
                : sel.kind === "zone" ? zoneById[sel.id]
                : sel.kind === "zones" ? zoneById[sel.ids[0]] : null;
    return (first && first.step) || 0;
  })();

  /* ---------- comparison ----------
     Hold this board against another one — the current-state sketch, or the
     cluster imported from a customer's diagnostics — and show the delta. */
  const [compareId, setCompareId] = useState(null);
  const comparison = useMemo(() => {
    const against = boardIndex.boards.find((b) => b.id === compareId);
    if (!against) return null;
    const baseline = readJSON(boardKey(compareId));
    if (!baseline) return null;
    return { name: against.name, diff: diffBoards({ nodes }, baseline) };
  }, [compareId, nodes, boardIndex]);
  const marks = useMemo(() => (comparison ? diffMarks(comparison.diff) : null), [comparison]);

  const startCompare = (id) => { flushActiveBoard(); setCompareId(id); setBoardMenu(false); };
  const stopCompare = () => { setCompareId(null); setBoardMenu(false); };
  /* Comparing against a board you've just switched to or deleted makes no
     sense, so the pairing drops when either side moves — unless the board being
     opened was created to be compared against the one being left, which is how
     a proposed target state lands already held against the import. */
  const queuedCompareRef = useRef(null);
  useEffect(() => {
    const queued = queuedCompareRef.current;
    queuedCompareRef.current = null;
    setCompareId(queued && queued !== activeBoardId ? queued : null);
  }, [activeBoardId]);

  const totals = useMemo(() => capacityTotals(nodes), [nodes]);
  /* Data Source nodes carrying a raw-ingest volume; the sizing dialog can sum
     these instead of taking one hand-entered total, honouring each source's
     own retention where one is set. */
  const boardSources = useMemo(() => {
    const rows = nodes
      .filter((n) => n.type === "source" && +(n.props?.ingest || 0) > 0)
      .map((n) => ({ gb: +n.props.ingest, days: +(n.props.retention || 0) || undefined }));
    return {
      rows,
      count: rows.length,
      total: rows.reduce((sum, r) => sum + r.gb, 0),
    };
  }, [nodes]);
  const warnings = useMemo(() => validateBoard(nodes, edges, zones), [nodes, edges, zones]);
  const warnCount = warnings.filter((w) => w.level === "warn").length;
  const hasTotals = totals.count > 0 || totals.cpu > 0 || totals.mem > 0 || warnings.length > 0;

  /* What the chat offers on an empty conversation. An empty board wants
     designing, an unsized one wants sizing, a flagged one wants fixing, and a
     freshly imported one wants reading — so the openings follow the board
     rather than being three fixed strings. */
  const chatChips = useMemo(() => {
    const chips = [];
    if (!nodes.length) {
      chips.push("Design a SIEM log ingest pipeline",
                 "Build an air-gapped Elastic deployment",
                 "Draw a multi-tenant observability platform");
    } else {
      if (imported) chips.push("Review this cluster and tell me what stands out");
      if (!totals.count) chips.push("Size this for 500 GB/day held for a year");
      if (warnings.length) chips.push("Fix the review findings");
      chips.push("What would you change about this design?",
                 "Add a Kafka buffer before Elasticsearch",
                 "Build this up in four steps for an exec walkthrough");
    }
    return chips.slice(0, 3);
  }, [nodes.length, imported, totals.count, warnings.length]);

  /* Turn a parsed cluster into a fresh named board. Importing never overwrites
     what's on screen — a discovery paste shouldn't cost you your sketch. The
     summary is saved with the board, so the post-import actions are still there
     after a refresh or a trip to another board. */
  const importCluster = (parsed) => {
    const built = clusterToBoard(parsed, { nodeW: NODE_W, nodeH: NODE_H });
    if (!built) return;
    setImportOpen(false);
    createBoard(nextBoardName(built.summary.clusterName || "Imported cluster"),
                { ...built.board, view: { ...DEFAULT_VIEW }, sections: {}, imported: built.summary });
    fitTo(boxOf(built.board.nodes, built.board.zones));
    flashSeedNote(`Imported ${built.summary.total} nodes from ${built.summary.source}`);
  };

  /* ---------- an imported cluster as the start of a migration story ----------
     Import gives the current state, the sizing engine gives a target, and the
     board comparison gives the delta between them. */

  /* Read the cluster as it stands. The board snapshot and the review findings
     are already in the system prompt, so this only has to say what kind of
     reading is wanted. */
  const reviewImported = () => askAI(
    "Review this imported cluster as it stands. Work only from what is on the board: "
    + "the tier ratios and whether the shape matches the retention it implies, the master quorum, "
    + "per-node sizing against the data each node holds, and anything the roles or versions suggest. "
    + "Say what you'd want to check next. Don't change the board.");

  /* Design the target state on a board of its own, held against the import.
     The comparison is queued because opening a board clears the pairing. */
  const proposeTarget = () => {
    const from = activeBoardId;
    const facts = describeDoc({ nodes, edges, zones }, TYPES);
    queuedCompareRef.current = from;
    createBoard(nextBoardName(`${activeBoard.name} — target`), emptyBoard());
    setAskQueue(
      "Propose a target state for a cluster we've just imported, and build it on this empty board. "
      + "Size it with the size_deployment tool rather than carrying the old node counts across, "
      + "and say what you changed and why. The current state is:\n\n"
      + facts
      + (warnings.length
        ? `\n\nThe design review of the current state says:\n${warnings.map((w) => `  [${w.level}] ${w.title}: ${w.detail}`).join("\n")}`
        : ""));
  };

  /* Draw the output of the sizing calculator as a whole architecture, built
     from the same deterministic templates the AI and the Patterns menu use:
     data sources feeding Logstash, the tiered cluster with its masters and
     object store, and Kibana on the serving side. The derived numbers land on
     the nodes themselves, so the capacity rollup and the quote lines pick
     them up straight away. Pieces sized to zero stay off the drawing. */
  /* Stack a Data Source node per dialog row down the left edge of the diagram
     (viewport centre on an empty board), carrying integration + volume. */
  const addSourceNodes = (rows) => {
    if (!rows.length) return;
    const GAP = 28;
    const drafts = rows.map((r) => {
      const integration = (r.integration || "").trim();
      return {
        id: uid("n"), type: "source",
        ...(integration ? { title: integration } : {}),
        props: {
          ...(integration ? { integration } : {}),
          ...(+r.gb > 0 ? { ingest: +r.gb } : {}),
          ...(+r.days > 0 ? { retention: +r.days } : {}),
        },
      };
    });
    const stackH = drafts.reduce((s, n) => s + nodeAutoHeight(n) + GAP, -GAP);
    const b = bbox(), c = centerOfViewport();
    const x = snap(b ? b.x0 - TYPES.source.w - 160 : c.x - TYPES.source.w / 2);
    let y = snap(b ? b.y0 : c.y - stackH / 2);
    for (const n of drafts) { n.x = x; n.y = y; y += nodeAutoHeight(n) + GAP; }
    snapshot();
    setNodes((ns) => [...ns, ...drafts]);
    setSel({ kind: "nodes", ids: drafts.map((n) => n.id) });
    flashSeedNote(`Added ${drafts.length} data source${drafts.length === 1 ? "" : "s"}`);
  };

  /* The cluster block a sizing result describes, shared by the Build dialog and
     the AI's size_deployment tool so both land the same thing: the block the
     Patterns sidebar inserts, with only what sizing actually decides overridden
     (which tiers exist, whether the quorum needs dedicated masters, whether
     dedicated ML nodes are on, whether there's an object store for the frozen
     tier to snapshot into), and the derived numbers on each slot. Ingest and
     coordinating nodes stay off, as they are in the sidebar default. */
  const sizedClusterSection = (result, hardware) => {
    const { stack, input } = result;
    /* Per-component hardware (instance / cpu / mem / disk): the dialog passes
       its possibly-edited rows; recommendations fill any gap. */
    const hw = { ...recommendHardware(result), ...(hardware || {}) };
    const hwProps = (key) => {
      const row = hw[key];
      return row ? { instance: row.instance, cpu: row.cpu, mem: row.mem, disk: row.disk } : {};
    };

    /* Derived numbers land on the template slots up front (keyed by each
       template's local slot names) so layout can size nodes around them. */
    const props = {};
    for (const t of result.tiers)
      props[t.key] = { nodes: t.nodes, capacity: formatTB(t.perNodeTB), ...hwProps(t.key) };
    if (stack.masters) props.master = { nodes: stack.masters, ...hwProps("master") };
    if (stack.ml) props.ml = { nodes: stack.ml, ...hwProps("ml") };
    if (result.objectStoreTB) props.objstore = { capacity: formatTB(result.objectStoreTB) };

    /* The cluster zone label names where it runs, then what it holds. */
    const isECH = input.provider !== "selfmanaged";
    const providerLabel = (SIZING_PROVIDERS.find(([key]) => key === input.provider) || [])[1]
      || input.provider;
    const regionLabel = isECH && input.region
      ? ((ECH_REGIONS[input.provider] || []).find(([id]) => id === input.region)?.[1] || input.region)
      : null;
    const profileLabel = isECH
      ? (input.profile || echProfiles(input.provider, input.region)[0])
      : null;
    const label = [
      providerLabel, regionLabel, profileLabel,
      `${input.dailyGB} GB/day`, `${result.retentionDays} day retention`,
    ].filter(Boolean).join(" · ");

    return {
      hardwareByKey: hw,
      hwProps,
      props,
      fill: { ...defaultFill("cluster"), label,
              tiers: result.tiers.map((t) => t.key),
              master: stack.masters > 0,
              ml: stack.ml > 0,
              objectStorage: result.objectStoreTB > 0 },
    };
  };

  /* A sizing result as the plain lines the apply panel shows. */
  const sizingLines = (result) => [
    ...result.tiers.map((t) => `${t.label}: ${t.nodes} × ${formatTB(t.perNodeTB)} over ${t.days} days`),
    ...(result.stack.masters ? [`${result.stack.masters} dedicated masters`] : []),
    ...(result.stack.ml ? [`${result.stack.ml} ML nodes`] : []),
    ...(result.stack.logstash ? [`${result.stack.logstash} Logstash instances`] : []),
    ...(result.stack.kibana ? [`${result.stack.kibana} Kibana instances`] : []),
    `${result.nodes} nodes · ${formatTB(result.dataTB)} on disk · ${result.ramGB} GB RAM`,
  ];

  /* The same result as facts for the model, including the inputs the engine
     filled in from its defaults — an assumption it can't see is one it can't
     state. */
  const sizingFacts = (result, hw) => {
    const { input, stack } = result;
    return {
      effectiveInput: {
        dailyGB: input.dailyGB, days: input.days, provider: input.provider,
        region: input.region || "any", replicas: input.replicas, overhead: input.overhead,
        agents: input.agents, users: input.users,
        logstash: !!input.logstash, ml: !!input.ml, masters: !!input.masters,
        monitoring: !!input.monitoring,
      },
      tiers: result.tiers.map((t) => ({ tier: t.key, days: t.days, nodes: t.nodes,
        ramPerNodeGB: t.ram, perNodeTB: +t.perNodeTB.toFixed(2), instance: hw[t.key]?.instance })),
      masters: stack.masters, mlNodes: stack.ml, logstash: stack.logstash,
      kibana: stack.kibana, agents: stack.agents, monitoring: stack.monitoring,
      totalNodes: result.nodes, totalRamGB: result.ramGB,
      dataTB: +result.dataTB.toFixed(1), objectStoreTB: +result.objectStoreTB.toFixed(1),
      retentionDays: result.retentionDays,
    };
  };

  const drawSizing = (result, hardware, opts = {}) => {
    if (!result.tiers.length) return;
    /* Sized from the board's own Data Source nodes: skip the generic sources
       zone and wire those very nodes into the new architecture instead. */
    const fromBoard = !!opts.fromBoardSources;
    const { stack, input } = result;
    /* The provider decides which meter the deal bills on, so the quote panel
       follows the drawing rather than making the SA remember to switch it. */
    setQuoteField({ model: licenseModelFor(input.provider) });
    const cluster = sizedClusterSection(result, hardware);
    const { hwProps } = cluster;
    const sid = { src: uid("sec"), ing: uid("sec"), cluster: uid("sec"), user: uid("sec"), mon: uid("sec") };

    /* Agents live in the Ingestion zone (they're collectors, not sources),
       whether or not Logstash sits behind them; data sources hold only the
       source hosts. Whatever the ingestion zone holds flows straight to the
       hot tier. */
    const hasIngestion = stack.agents > 0 || stack.logstash > 0;
    const ingTools = [
      ...(stack.agents > 0 ? ["agent"] : []),
      ...(stack.logstash > 0 ? ["logstash"] : []),
    ];

    const ingProps = {};
    if (stack.agents) ingProps.tool0 = { count: stack.agents };
    if (stack.logstash)
      ingProps[stack.agents > 0 ? "tool1" : "tool0"] = { instances: stack.logstash, ...hwProps("logstash") };

    const sections = [
      stack.agents > 0 && !fromBoard && { id: sid.src, template: "dataZone",
        fill: { label: "Data sources", sources: ["source"], collectors: [] } },
      hasIngestion && { id: sid.ing, template: "sharedIngestion",
        fill: { label: "Ingestion", tools: ingTools }, props: ingProps },
      { id: sid.cluster, template: "cluster", fill: cluster.fill, props: cluster.props },
      stack.kibana > 0 && { id: sid.user, template: "userSpace",
        fill: { consumers: ["kibana", "users"], idp: false },
        props: { kibana: { instances: stack.kibana, ...hwProps("kibana") },
                 users: { users: input.users } } },
      /* The monitoring deployment watches the cluster from the side rather
         than sitting in a lane of its own, so it hangs under the User Space
         (and falls back to its lane when there is no Kibana to sit under). */
      stack.monitoring > 0 && { id: sid.mon, template: "management", below: sid.user,
        fill: { label: "Management", tools: ["monitoring"] } },
    ].filter(Boolean);

    const cross = [
      stack.agents > 0 && !fromBoard && { source: sid.src, target: sid.ing, label: "logs & metrics" },
      hasIngestion && { source: sid.ing, target: sid.cluster, label: "ingest" },
      stack.kibana > 0 && { source: sid.cluster, target: sid.user, label: "queries" },
      stack.monitoring > 0 && { source: sid.cluster, target: sid.mon,
        label: "stack monitoring", sourceZone: true },
    ].filter(Boolean);

    const built = buildFromSections(sections, cross);
    const newNodes = built.nodes;

    /* Place below-left of the existing diagram (viewport centre when empty)
       and re-frame around everything, matching how pattern blocks land.
       Drawing from the board's own sources continues their data flow instead:
       the architecture lands to the right of those source nodes, top-aligned,
       so the wired-up sources read as the left edge of the diagram. */
    const bb = boxOf(newNodes, built.zones);
    const b = bbox();
    const c = centerOfViewport();
    const srcBox = fromBoard
      ? boxOf(nodes.filter((n) => n.type === "source" && +(n.props?.ingest || 0) > 0), [])
      : null;
    const dx = snap((srcBox ? srcBox.x1 + 180 : b ? b.x0 : c.x - (bb.x1 - bb.x0) / 2) - bb.x0);
    const dy = snap((srcBox ? srcBox.y0 : b ? b.y1 + 140 : c.y - (bb.y1 - bb.y0) / 2) - bb.y0);
    const shiftPt = (p) => ({ x: p.x + dx, y: p.y + dy });

    /* Connect the contributing Data Source nodes to the new intake. */
    const srcLinks = [];
    if (fromBoard) {
      const into = sectionEndpoint(sid.ing, "in", built.meta)
                || sectionEndpoint(sid.cluster, "in", built.meta);
      if (into) for (const n of nodes) {
        if (n.type === "source" && +(n.props?.ingest || 0) > 0)
          srcLinks.push({ id: uid("e"), s: n.id, e: into, lbl: "logs & metrics" });
      }
    }

    snapshot();
    setNodes((ns) => [...ns, ...newNodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }))]);
    setEdges((es) => [...es, ...built.edges.map((e) => (e.pts ? { ...e, pts: e.pts.map(shiftPt) } : e)), ...srcLinks]);
    setZones((zs) => [...zs, ...built.zones.map((z) => ({ ...z, x: z.x + dx, y: z.y + dy }))]);
    /* Register the sections so the AI chat can reference and edit them. */
    sectionsRef.current = { ...sectionsRef.current, ...built.meta };
    setSel(null);
    setSizeOpen(false);
    fitTo({
      x0: Math.min(b ? b.x0 : Infinity, bb.x0 + dx),
      y0: Math.min(b ? b.y0 : Infinity, bb.y0 + dy),
      x1: Math.max(b ? b.x1 : -Infinity, bb.x1 + dx),
      y1: Math.max(b ? b.y1 : -Infinity, bb.y1 + dy),
    });
    flashSeedNote(`Sized ${result.nodes} nodes for ${formatTB(result.dataTB)} of data`);
  };

  /* A one-line sizing summary of the board, shaped for the Pricing / ROM
     scene's description column. */
  const sizingSummary = () => {
    const parts = [];
    if (totals.storageTB) parts.push(`${formatTB(totals.storageTB)} total storage`);
    for (const t of totals.tiers) {
      parts.push(`${t.label}: ${t.count} node${t.count === 1 ? "" : "s"}${t.storageTB ? ` / ${formatTB(t.storageTB)}` : ""}`);
    }
    if (totals.count) parts.push(`${totals.count} nodes total`);
    if (totals.cpu) parts.push(`${totals.cpu} vCPU`);
    if (totals.mem) parts.push(`${totals.mem} GB RAM`);
    return parts.join(" · ");
  };
  const copyToClipboard = (text, ok, empty) => {
    if (!text) return flashSeedNote(empty);
    navigator.clipboard?.writeText(text).then(
      () => flashSeedNote(ok),
      () => flashSeedNote("Couldn't reach the clipboard"));
  };
  /* Write the board up. The model is given the diagram, the rollups, and the
     review findings, and asked to describe them rather than design anything;
     the genre decides what shape that takes, over the same facts. Which genre is
     asked first — a note and an SoW outline are different enough that guessing
     wrong costs a call and a wait. */
  const [summary, setSummary] = useState(null);   // { choosing } | { genre, busy | text | error }
  const writeSummary = async (genre = SUMMARY_DEFAULT) => {
    setSummary({ genre, busy: true });
    try {
      const text = await runLLM(
        bedrockCfg(),
        {
          system: summarySystem(genre),
          messages: [{ role: "user", content: summaryPrompt({
            boardName: activeBoard.name,
            board: describeDoc({ nodes, edges, zones }, TYPES),
            totals,
            warnings,
          }) }],
        },
        { text: true });
      setSummary({ genre, text });
    } catch (e) {
      setSummary({ genre, error: e.message });
    }
  };

  /* ---------- follow-up package ---------- */

  /* Like renderPNG but it answers with a data URL and never falls back to a
     download — a failed rasterization inside the follow-up flow should
     degrade the artifact, not surprise the user with an SVG file. */
  const capturePNG = () => new Promise((resolve) => {
    let settled = false;
    const settle = (v, url) => {
      if (settled) return;
      settled = true;
      if (url) URL.revokeObjectURL(url);
      resolve(v);
    };
    try {
      const svg = buildSVG();
      if (!svg) return settle("");
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = img.width * 2; c.height = img.height * 2;
          const g = c.getContext("2d");
          g.scale(2, 2); g.drawImage(img, 0, 0);
          settle(c.toDataURL("image/png"), url);
        } catch { settle("", url); }
      };
      img.onerror = () => settle("", url);
      setTimeout(() => settle("", url), 1500);
      img.src = url;
    } catch { settle(""); }
  });

  /* One click packages the session: the board as an image, the AI's recap of
     what was shown and decided, and the deterministic numbers, in a single
     self-contained HTML file (or markdown). Missing credentials degrade it
     rather than block it — the image and the numbers are exact either way. */
  const [followup, setFollowup] = useState(null);  // { busy } | { png, md, error, noCreds }
  const buildFollowup = async (existingPng) => {
    setFileMenu(false);
    setFollowup({ busy: true });
    const png = existingPng ?? await capturePNG();
    const haveCreds = !!(awsKeyId && awsSecret);
    let md = "", error = "";
    if (haveCreds) {
      try {
        md = await runLLM(bedrockCfg(), {
          system: FOLLOWUP_SYSTEM,
          messages: [{ role: "user", content: followupPrompt({
            boardName: activeBoard.name,
            board: describeDoc({ nodes, edges, zones }, TYPES) + describeSections(sectionsRef.current),
            totals, warnings,
            transcript: chatMsgs.filter((m) => m.role === "user" || m.role === "ai"),
            customer: customer
              ? { account: customer.account, opportunity: customer.opportunity }
              : undefined,
          }) }],
        }, { text: true });
      } catch (e) { error = e.message; }
    }
    setFollowup({ png, md, error, noCreds: !haveCreds });
  };

  /* Only the account and opportunity names travel — deal value, MEDDPICC, and
     support history inform the narrative upstream but never appear here. */
  const followupParts = () => ({
    title: activeBoard.name,
    dateStr: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    account: customer?.account || "",
    opportunity: customer?.opportunity || "",
    capacity: totals,
    warnings,
  });
  const downloadFollowup = (f, md) => {
    const bodyHtml = md
      ? renderToStaticMarkup(<ChatMarkdown text={md} />)
      : `<p><em>${f.noCreds
          ? "Packaged without AI credentials — the image and numbers are exact; the recap is yours to write."
          : "The recap failed to generate — the image and numbers are exact."}</em></p>`;
    const html = buildFollowupHtml({ ...followupParts(), pngDataUrl: f.png, bodyHtml });
    dl(new Blob([html], { type: "text/html" }), `${fileSlug()}-follow-up.html`);
  };
  const copyFollowup = (md) =>
    copyToClipboard(followupMarkdown({ ...followupParts(), bodyMd: md }),
                    "Follow-up markdown copied");

  const copySizing = () =>
    copyToClipboard(sizingSummary(), "Sizing summary copied",
                    "Set node counts and capacities first");
  /* The whole deployment as one line, priced from the panel's own terms so what
     leaves here is a finished quote row. */
  const cloudQuote = quote.model === LICENSE_ECU;
  const quoteTerms = { model: quote.model, unitPrice: quote.price,
                       discount: quote.discount, ecuTotal: quote.ecu };
  const quoteLine = romRows(totals, quoteTerms)[0];
  const quoteCell = quoteLine && projectCell(quoteLine, 0, {});
  const noQuote = cloudQuote
    ? "Enter the ECU total from the Elastic Cloud pricing calculator first"
    : "Set Memory on the nodes first — resource units are priced per 64 GB";

  const copyRom = () =>
    copyToClipboard(romTSV(romRows(totals, quoteTerms)),
                    "Quote line copied — paste into Pricing / ROM", noQuote);

  /* Push the same line straight into the Pricing / ROM builder — no paste step
     in front of the customer. Lands as a new, clearly-labelled scenario so
     nothing already in the builder is overwritten, and carries the RAM / node
     / storage detail the flat text paste would drop. */
  const sendRom = () => {
    if (!quoteLine) return flashSeedNote(noQuote);
    const ok = sendScenarioToPricing(
      romScenario(totals, { label: `Whiteboard — ${activeBoard.name}`, ...quoteTerms }));
    flashSeedNote(ok ? "Sent the quote line to Pricing / ROM"
                     : "Couldn't reach the Pricing / ROM builder");
  };

  /* Lay every component out in left-to-right data-flow lanes. A zone moves as
     a unit — its members are tidied inside it and the frame is refitted around
     them — so grouping survives the cleanup. */
  const tidyBoard = () => {
    setTidyMenu(false);
    const tidy = tidyLayout(nodes, zones, rectOf);
    if (!Object.keys(tidy.nodes).length) return;
    snapshot();
    const nextNodes = nodes.map((n) => (tidy.nodes[n.id] ? { ...n, ...tidy.nodes[n.id] } : n));
    const nextZones = zones.map((z) => (tidy.zones[z.id] ? { ...z, ...tidy.zones[z.id] } : z));
    setNodes(nextNodes);
    setZones(nextZones);
    setSel(null);
    fitTo(boxOf(nextNodes, nextZones));
  };

  /* Straighten in place: near-rows and near-columns snap to shared centre
     lines, and that's all. The arrangement stays the user's — no view jump,
     nothing moves far enough to need one. */
  const straightenBoard = () => {
    setTidyMenu(false);
    const fix = alignLayout(nodes, zones, rectOf);
    if (!Object.keys(fix.nodes).length && !Object.keys(fix.zones).length) return;
    snapshot();
    setNodes((ns) => ns.map((n) => (fix.nodes[n.id] ? { ...n, ...fix.nodes[n.id] } : n)));
    setZones((zs) => zs.map((z) => (fix.zones[z.id] ? { ...z, ...fix.zones[z.id] } : z)));
  };

  const tempLine = connect && endpointRect(connect.from) ? (() => {
    const r = endpointRect(connect.from);
    const A = connect.sa ? anchor(r, connect.sa.side, connect.sa.t) : anchor(r, "r");
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
  };

  /* Clear all manual routing on an edge (Reset shape): the hand-placed
     waypoints and the pinned connection points both go, so the auto router
     takes over again. */
  const resetEdgeShape = (edgeId) => {
    snapshot();
    setEdges((es) => es.map((x) => {
      if (x.id !== edgeId) return x;
      const { pts: _pts, sa: _sa, ea: _ea, ...rest } = x;
      return rest;
    }));
  };

  const selNodeIds = sel && (sel.kind === "nodes" || sel.kind === "mixed") ? sel.ids : [];

  /* ---------- render ---------- */
  return (
    <div className={"ew-root" + (isDark ? "" : " ew-light")} style={{ height }}>
      <style>{CSS}</style>

      {present ? (
        <div className="ew-toolbar ew-present-bar">
          <button onClick={exitPresent} title="Back to editing (Esc)">← Edit</button>
          <span className="ew-gap" />
          {revealing && (
            <span className="ew-steps">
              <button disabled={step <= 0} onClick={() => goToStep(step - 1)}>‹</button>
              <b>{step === 0 ? "Base" : `Step ${step}`} / {stepCount}</b>
              <button disabled={step >= stepCount} onClick={() => goToStep(step + 1)}>›</button>
            </span>
          )}
          {views.length > 0 && (
            <span className="ew-steps" title="Saved views — number keys jump straight to one">
              <button disabled={viewIdx <= 0} onClick={() => goToView(viewIdx - 1)}>‹</button>
              <b>{viewIdx >= 0 ? views[viewIdx].name : "Views"}</b>
              <button disabled={viewIdx >= views.length - 1} onClick={() => goToView(viewIdx + 1)}>›</button>
            </span>
          )}
          <span className="ew-gap" />
          <InkTools tool={tool} setTool={setTool} color={inkColor} setColor={setInkColor}
                    onClear={clearInk} hasInk={ink.length > 0} />
          <span className="ew-gap" />
          <button onClick={fit}>Fit</button>
          <button disabled={!spotlight} onClick={() => setSpotlight(null)}
                  title="Clear the pinned highlight">Unfocus</button>
          <span className="ew-hint">
            {revealing ? "arrows or space to step · " : ""}
            {views.length > 0 ? "1–9 for saved views · " : ""}
            click a component to spotlight it · Esc to exit
          </span>
        </div>
      ) : (
      <div className="ew-toolbar">
        <span className="ew-title">Elastic Whiteboard</span>
        <span className="ew-menuwrap">
          {renaming ? (
            <input className="ew-boardname" autoFocus defaultValue={activeBoard.name}
                   onBlur={(e) => { renameBoard(e.target.value); setRenaming(false); }}
                   onKeyDown={(e) => {
                     if (e.key === "Enter") e.target.blur();
                     if (e.key === "Escape") { e.target.value = activeBoard.name; e.target.blur(); }
                   }} />
          ) : (
            <button className="ew-boardbtn" onClick={() => setBoardMenu((v) => !v)}
                    title="Switch, rename, or create a board">{activeBoard.name} ▾</button>
          )}
          {boardMenu && (
            <>
              <div className="ew-menu-backdrop" onClick={() => setBoardMenu(false)} />
              <div className="ew-menu">
                <div className="ew-menu-h">Boards</div>
                {boardIndex.boards.map((b) => (
                  <button key={b.id} className={b.id === activeBoardId ? "act" : ""}
                          onClick={() => openBoard(b.id)}>
                    {b.id === activeBoardId ? "• " : "\u00A0\u00A0"}{b.name}
                  </button>
                ))}
                <div className="ew-menu-sep" />
                <button onClick={() => createBoard(nextBoardName("New board"))}>+ New blank board</button>
                <button onClick={() => createBoard(nextBoardName(`${activeBoard.name} copy`),
                                                  { nodes: clone(nodes), edges: clone(edges), zones: clone(zones),
                                                    view, sections: clone(sectionsRef.current) })}>
                  Duplicate this board
                </button>
                <button onClick={() => { setBoardMenu(false); setRenaming(true); }}>Rename this board…</button>
                <button onClick={() => { setBoardMenu(false); clearAll(); }}
                        title="Remove every node, edge, and zone — undo brings it back">Clear this board</button>
                <button disabled={boardIndex.boards.length < 2}
                        onClick={() => deleteBoard(activeBoardId)}>Delete this board</button>
                {boardIndex.boards.length > 1 && (
                  <>
                    <div className="ew-menu-sep" />
                    <div className="ew-menu-h">Compare this board with</div>
                    {boardIndex.boards.filter((b) => b.id !== activeBoardId).map((b) => (
                      <button key={b.id} className={"ew-cmp" + (b.id === compareId ? " act" : "")}
                              onClick={() => startCompare(b.id)}>
                        {b.name}
                      </button>
                    ))}
                    {compareId && <button onClick={stopCompare}>Stop comparing</button>}
                    <div className="ew-menu-note">Shows what this board adds, drops, and resizes</div>
                  </>
                )}
              </div>
            </>
          )}
        </span>
        <span className="ew-menuwrap">
          <button onClick={() => setFileMenu((v) => !v)} title="Import or export the board">File ▾</button>
          {fileMenu && (
            <>
              <div className="ew-menu-backdrop" onClick={() => setFileMenu(false)} />
              <div className="ew-menu">
                <div className="ew-menu-h">Export</div>
                <button onClick={() => { exportJSON(); setFileMenu(false); }}>JSON</button>
                <button onClick={() => { exportSVG(); setFileMenu(false); }}>SVG</button>
                <button onClick={() => { exportPNG(2); setFileMenu(false); }}>PNG</button>
                <button onClick={() => { exportPNG(4); setFileMenu(false); }}>PNG @ 4x</button>
                <label className="ew-menu-check">
                  <input type="checkbox" checked={exportChrome}
                         onChange={(e) => setExportChrome(e.target.checked)} />
                  Title &amp; legend
                </label>
                <div className="ew-menu-sep" />
                <div className="ew-menu-h">Share</div>
                <button onClick={copyPNG}>Copy image to clipboard</button>
                <button onClick={copyShareLink}>Copy share link</button>
                <button onClick={() => buildFollowup()}
                        title="One self-contained HTML file: the board image, an AI recap of the session, capacity, and review findings">
                  Follow-up package…</button>
                <div className="ew-menu-sep" />
                <div className="ew-menu-h">Import</div>
                <button onClick={() => { fileRef.current.click(); setFileMenu(false); }}>Import JSON…</button>
                <button onClick={() => { setImportOpen(true); setFileMenu(false); }}>Import a real cluster…</button>
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
        {seedNote && <span className="ew-seednote">✓ {seedNote}</span>}
        <span className="ew-sep" />
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↺</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">↻</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importJSON} />
        <span className="ew-sep" />
        <span className="ew-zoomgrp">
          <button onClick={() => zoomBy(1 / 1.2)} title="Zoom out">−</button>
          <button className="ew-zoom" onClick={() => zoomBy(1 / view.k)}
                  title="Reset zoom to 100%">{Math.round(view.k * 100)}%</button>
          <button onClick={() => zoomBy(1.2)} title="Zoom in">+</button>
          <button onClick={fit} title="Frame everything on the board">Fit</button>
        </span>
        <span className="ew-menuwrap">
          <button onClick={() => setViewsMenu((v) => !v)}
                  title="Saved camera positions — number keys 1–9 jump to them">Views ▾</button>
          {viewsMenu && (
            <>
              <div className="ew-menu-backdrop" onClick={() => { setViewsMenu(false); setRenamingView(null); }} />
              <div className="ew-menu">
                <div className="ew-menu-h">Saved views</div>
                {views.map((v, i) => renamingView === v.id ? (
                  <input key={v.id} className="ew-boardname" autoFocus defaultValue={v.name}
                         onBlur={(e) => { renameView(v.id, e.target.value); setRenamingView(null); }}
                         onKeyDown={(e) => {
                           if (e.key === "Enter") e.target.blur();
                           if (e.key === "Escape") { e.target.value = v.name; e.target.blur(); }
                         }} />
                ) : (
                  <div key={v.id} className="ew-menu-row">
                    <button onClick={() => { goToView(i); setViewsMenu(false); }}>
                      {i < 9 ? `${i + 1} · ` : "\u00A0\u00A0\u00A0"}{v.name}
                    </button>
                    <button className="ew-menu-x" title="Rename this view"
                            onClick={() => setRenamingView(v.id)}>✎</button>
                    <button className="ew-menu-x" title="Delete this view"
                            onClick={() => deleteView(v.id)}>✕</button>
                  </div>
                ))}
                {!views.length && (
                  <div className="ew-menu-note">Frame a spot worth returning to, then save it.
                    Number keys jump between saved views — even while presenting.</div>
                )}
                <div className="ew-menu-sep" />
                <button onClick={() => { saveCurrentView(); setViewsMenu(false); }}>+ Save current view</button>
                <div className="ew-menu-sep" />
                <label className="ew-menu-check">
                  <input type="checkbox" checked={minimap}
                         onChange={(e) => setMinimap(e.target.checked)} />
                  Show the minimap
                </label>
              </div>
            </>
          )}
        </span>
        <span className="ew-menuwrap">
          <button onClick={() => setTidyMenu((v) => !v)} title="Straighten or re-lay-out the board">Tidy ▾</button>
          {tidyMenu && (
            <>
              <div className="ew-menu-backdrop" onClick={() => setTidyMenu(false)} />
              <div className="ew-menu">
                <button onClick={straightenBoard}
                        title="Snap near-rows and near-columns into exact alignment — your arrangement stays put">
                  Straighten rows &amp; columns</button>
                <button onClick={tidyBoard}
                        title="Re-lay the whole board out left-to-right by data-flow stage">
                  Rebuild into flow lanes</button>
              </div>
            </>
          )}
        </span>
        <button onClick={() => setSizeOpen(true)}
                title="Draw a cluster sized from ingest volume and retention">Build…</button>
        <span className="ew-sep" />
        <span className="ew-menuwrap">
          <button className={tool ? "on" : ""} onClick={() => setPresentMenu((v) => !v)}
                  title="Present this board, or annotate it with pen and arrow">
            {tool === "pen" ? "✎ " : tool === "arrow" ? "↗ " : ""}Present ▾</button>
          {presentMenu && (
            <>
              <div className="ew-menu-backdrop" onClick={() => setPresentMenu(false)} />
              <div className="ew-menu">
                <button onClick={() => { setPresentMenu(false); enterPresent(); }}
                        title="Hide the editing chrome and present this board (Esc to exit)">Start presenting</button>
                <div className="ew-menu-sep" />
                <div className="ew-menu-h">Annotate</div>
                <button className={tool === "pen" ? "act" : ""} title="Draw freehand (Esc to stop)"
                        onClick={() => { setTool(tool === "pen" ? null : "pen"); setPresentMenu(false); }}>
                  ✎ Pen</button>
                <button className={tool === "arrow" ? "act" : ""} title="Drag a straight arrow"
                        onClick={() => { setTool(tool === "arrow" ? null : "arrow"); setPresentMenu(false); }}>
                  ↗ Arrow</button>
                <div className="ew-menu-inkrow" title="Ink colour">
                  {INK_COLORS.map((c) => (
                    <button key={c.value} className={"ew-inkswatch" + (inkColor === c.value ? " act" : "")}
                            style={{ "--sw": c.value }} title={c.label}
                            onClick={() => setInkColor(c.value)} />
                  ))}
                </div>
                {ink.length > 0 && (
                  <button onClick={() => { clearInk(); setPresentMenu(false); }}
                          title="Remove every stroke">Clear ink</button>
                )}
              </div>
            </>
          )}
        </span>
        <span className="ew-sep" />
        <span className="ew-menuwrap">
          <button className={"ew-ai-toggle" + (chatOpen || documents.length ? " on" : "")}
                  onClick={() => setAiMenu((v) => !v)}
                  title="Build with AI and attach the customer's context">✦ AI ▾</button>
          {aiMenu && (
            <>
              <div className="ew-menu-backdrop" onClick={() => setAiMenu(false)} />
              <div className="ew-menu">
                <button className={chatOpen ? "act" : ""}
                        onClick={() => { setChatOpen((o) => !o); setAiMenu(false); }}
                        title="Build with AI">AI chat</button>
                <button onClick={() => { setContextOpen(true); setAiMenu(false); }}
                        title="Attach what the customer asked for — an RFP, requirements, meeting notes — and design to it">
                  ◫ Context{documents.length > 0 && <b className="ew-warncount">{documents.length}</b>}
                </button>
              </div>
            </>
          )}
        </span>
        {hasTotals && (
          <button className={"ew-totals" + (reviewOpen ? " on" : "")}
                  onClick={() => setReviewOpen((v) => !v)}
                  title="Capacity rollup and architecture review">
            Σ{totals.count > 0 && ` ${totals.count} nodes`}
            {totals.storageTB > 0 && ` · ${formatTB(totals.storageTB)}`}
            {warnCount > 0 && <b className="ew-warncount">{warnCount}</b>}
          </button>
        )}
        <span className="ew-hint">shift-drag select · ⌘C/⌘V copy · ⌘D duplicate · arrows nudge · ⌘Z undo · drag a port to connect</span>
      </div>
      )}

      {contextOpen && (
        <BoardContext documents={documents} passages={docPassages} onClose={() => setContextOpen(false)}
                      onAttach={attachDocument} onRemove={removeDocument} onAsk={askAI}
                      customer={customer} onCustomer={setCustomer}
                      parseCfg={{ elastic: { esUrl, apiKey: elasticKey }, jinaKey,
                                  origin: window.location.origin }} />
      )}
      {importOpen && <ClusterImport onClose={() => setImportOpen(false)} onImport={importCluster} />}
      {sizeOpen && <SizingCalculator onClose={() => setSizeOpen(false)} onDraw={drawSizing}
                                     sources={boardSources} onAddSources={addSourceNodes} />}
      {followup && (
        <FollowupModal state={followup} onClose={() => setFollowup(null)}
                       onRetry={() => buildFollowup(followup.png)}
                       onDownload={(md) => downloadFollowup(followup, md)}
                       onCopy={copyFollowup} />
      )}
      {summary && (
        <BoardSummary state={summary} onClose={() => setSummary(null)} onWrite={writeSummary}
                      onCopy={(text) => copyToClipboard(text, "Draft copied", "Nothing to copy")} />
      )}

      <div className="ew-body">
        {/* palette */}
        {!present && paletteOpen && (
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
        )}
        {!present && (
          <button className="ew-paltoggle" onClick={() => setPaletteOpen((open) => !open)}
                  title={paletteOpen ? "Collapse the palette" : "Expand the palette"}>
            {paletteOpen ? "◂" : "▸"}
          </button>
        )}

        {/* capacity + review, docked to the left edge like the chat on the right */}
        {reviewOpen && !present && (
          <div className="ew-review" onPointerDown={(e) => e.stopPropagation()}>
            <div className="ew-review-h">
              <b>Capacity &amp; review</b>
              <button className="ew-x" onClick={() => setReviewOpen(false)}>×</button>
            </div>
            <div className="ew-review-body">
              <div className="ew-review-stats">
                <span><i>{totals.count || "—"}</i>nodes</span>
                <span><i>{totals.cpu || "—"}</i>vCPU</span>
                <span><i>{totals.mem || "—"}</i>GB RAM</span>
                <span><i>{totals.storageTB ? formatTB(totals.storageTB) : "—"}</i>storage</span>
              </div>
              {totals.tiers.length > 0 && (
                <table className="ew-review-tiers">
                  <tbody>
                    {totals.tiers.map((t) => (
                      <tr key={t.type}>
                        <td><span className="ew-swatch" style={{ background: TYPES[t.type].color }} />{t.label}</td>
                        <td>{t.count} node{t.count === 1 ? "" : "s"}</td>
                        <td>{t.storageTB ? formatTB(t.storageTB) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="ew-ihint">Capacity is per node — set Nodes and Capacity on each tier.</p>
              <div className="ew-frow"><span className="ew-flabel">Licensing</span>
                <select value={quote.model}
                        title="Self-managed licenses 64 GB resource units; Cloud meters consumption in ECUs"
                        onChange={(e) => setQuoteField({ model: e.target.value })}>
                  <option value={LICENSE_ERU}>Self-managed (ERU)</option>
                  <option value={LICENSE_ECU}>Cloud Hosted (ECU)</option>
                </select></div>
              {cloudQuote
                ? <div className="ew-frow"><span className="ew-flabel">ECU total</span>
                    <input inputMode="numeric" value={quote.ecu} placeholder="0"
                           title="Annual consumption from the Elastic Cloud pricing calculator"
                           onChange={(e) => setQuoteField({ ecu: e.target.value })} /></div>
                : <div className="ew-frow"><span className="ew-flabel">List price</span>
                    <input inputMode="numeric" value={quote.price} placeholder={String(RU_LIST_PRICE)}
                           title={`List price per ${RU_GB} GB resource unit`}
                           onChange={(e) => setQuoteField({ price: e.target.value })} /></div>}
              <div className="ew-frow"><span className="ew-flabel">Discount %</span>
                <input inputMode="numeric" value={quote.discount} placeholder="0"
                       onChange={(e) => setQuoteField({ discount: e.target.value })} /></div>
              <p className="ew-ihint">
                {quoteCell
                  ? <>One line: {quoteLine.quantity.toLocaleString("en-US")}{" "}
                      {cloudQuote ? "ECUs" : `× ${RU_GB} GB resource units`} at{" "}
                      {formatCurrency(quoteCell.unitPrice)}
                      {quoteCell.hasDiscount ? ` less ${quoteCell.discountPct}%` : ""}
                      {" "}= <b>{formatCurrency(quoteCell.lineTotal)}</b></>
                  : cloudQuote
                    ? "Cloud bills metered consumption — enter the ECU total from the pricing calculator."
                    : "Set Memory on the nodes to price this board."}
              </p>
              {!cloudQuote && totals.logstashMem > 0 && (
                <p className="ew-ihint">
                  Excludes {totals.logstashMem.toLocaleString("en-US")} GB on Logstash — Elastic counts it
                  for information only.
                </p>
              )}
              <div className="ew-btnrow">
                <button className="ew-btn" onClick={copyRom}
                        title={`Copy the ${RU_GB} GB resource-unit line to paste into the Pricing / ROM builder`}>
                  Copy quote lines
                </button>
                <button className="ew-btn" onClick={sendRom}
                        title="Send these line items straight into the Pricing / ROM builder as a new option — no paste step">
                  Send to Pricing
                </button>
                <button className="ew-btn" onClick={copySizing}
                        title="Copy a one-line sizing summary">
                  Copy summary
                </button>
                <button className="ew-btn" onClick={() => setSummary({ choosing: true })}
                        title="Write this board up — a follow-up note, a customer email, discovery questions, risks, or an SoW outline">
                  ✦ Write it up
                </button>
              </div>
              {imported && (
                <div className="ew-btnrow">
                  <button className="ew-btn" onClick={reviewImported}
                          title={`Ask for observations on the ${imported.total} nodes imported from ${imported.source}`}>
                    ✦ Review this cluster
                  </button>
                  <button className="ew-btn" onClick={proposeTarget}
                          title="Design and size a target state on a new board, held against this one">
                    ✦ Propose a target state
                  </button>
                </div>
              )}
              <div className="ew-review-checks">
                {warnings.length === 0
                  ? <p className="ew-review-ok">✓ No issues found</p>
                  : warnings.map((w) => (
                      <div key={w.id} className={"ew-check " + w.level}>
                        <b>{w.title}</b>
                        <span>{w.detail}</span>
                      </div>
                    ))}
              </div>
              {warnings.length > 0 && (
                <div className="ew-btnrow">
                  <button className="ew-btn" onClick={fixFindings}
                          title="Hand these findings to the AI and let it propose the fix">
                    ✦ Fix the findings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* canvas */}
        <div className={"ew-viewport" + (tool ? " inking" : "")} ref={viewportRef}
             onPointerDown={(e) => {
               if (tool) return startInk(e);
               if (present) setSpotlight(null);
               startPan(e);
             }}
             onPointerMove={(e) => (tool ? moveInk(e) : onMove(e))}
             onPointerUp={(e) => (tool ? endInk(e) : onUp(e))}>
          <div className="ew-world"
               style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.k})` }}>

            {/* zones (behind everything) */}
            {zones.map((z) => {
              if (hiddenNow(z)) return null;
              const isSingle = sel && sel.kind === "zone" && sel.id === z.id;
              const isMulti = sel && ((sel.kind === "zones" && sel.ids.includes(z.id))
                || (sel.kind === "mixed" && sel.zoneIds.includes(z.id)));
              return (
                <div key={z.id} className={"ew-zone" + (isSingle || isMulti ? " sel" : "") + (ghosted(z) ? " ghost" : "")}
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
                // a connection shows once both of its endpoints have been revealed
                if (!visibleNodeIds.has(ed.s) || !visibleNodeIds.has(ed.e)) return null;
                // the spotlight/hover neighbourhood decides the highlight
                const on = connected && (ed.s === focus || ed.e === focus);
                const dim = connected && !on;
                const isSel = sel && sel.kind === "edge" && sel.id === ed.id;
                return (
                  <g key={ed.id}>
                    <path d={ed.d} className="ew-hit"
                          onPointerDown={(e) => { e.stopPropagation(); setSel({ kind: "edge", id: ed.id }); }} />
                    <path id={`ew-${ed.id}`} d={ed.d}
                          className={"ew-edge" + (dim ? " dim" : "") + (on || isSel ? " on" : "")}
                          stroke={ed.color}
                          strokeDasharray={EDGE_STYLES[ed.style]?.dash || undefined}
                          /* inline style so a custom width wins over the CSS
                             default and still gets the hover/selection boost */
                          style={ed.width ? { strokeWidth: on || isSel ? ed.width + 0.8 : ed.width } : undefined}
                          markerEnd="url(#ew-arr)"
                          markerStart={ed.bi ? "url(#ew-arr)" : undefined} />
                    {ed.lbl && (
                      <text x={ed.mid.x} y={ed.mid.y - 7} textAnchor="middle"
                            className={"ew-elbl" + (dim ? " dim" : "") + (on || isSel ? " on" : "")}>
                        {ed.lbl}
                      </text>
                    )}
                    {/* an ambient dot drifts along every connection, so the
                        diagram reads as data paths rather than plumbing */}
                    <circle r={3} fill={ed.color} className={"ew-particle" + (dim ? " dim" : "")}
                            style={{ filter: `drop-shadow(0 0 4px ${ed.color})` }}>
                      <animateMotion dur={`${Math.max(3, ed.len / 95).toFixed(2)}s`}
                                     repeatCount="indefinite">
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
                // where the line actually attaches — the grab handles for rewiring
                const pl = elbowPath(ra, rb, ed.pts, ed.sa, ed.ea);
                const ends = [{ end: "s", ...pl[0] }, { end: "e", ...pl[pl.length - 1] }];
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
                    {ends.map((p) => (
                      <circle key={p.end} cx={p.x} cy={p.y} r="6.5" className="ew-wp-end"
                              style={{ pointerEvents: "all" }}
                              onPointerDown={(e) => startReconnect(e, ed.id, p.end)}>
                        <title>Drag to reattach this end</title>
                      </circle>
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
              if (hiddenNow(n)) return null;
              const isSel = selNodeIds.includes(n.id);
              const dim = connected && !connected.has(n.id);
              const ann = t.annotation;                 // "note" | "text" | undefined
              const commitText = (v) => {
                snapGuard("rename:" + n.id);
                setNodes((ns) => ns.map((m) => (m.id === n.id
                  ? { ...m, title: ann ? v : (v.trim() || t.label) } : m)));
                setEditing(null);
              };
              return (
                <div key={n.id}
                     className={(ann ? `ew-ann ew-ann-${ann}` : "ew-node")
                       + (isSel ? " sel" : "") + (dim ? " dim" : "") + (ghosted(n) ? " ghost" : "")
                       + (marks && marks[n.id] ? ` diff-${marks[n.id]}` : "")}
                     style={{ left: n.x, top: n.y, width: r.w, height: r.h,
                              "--tag": nodeTag(n, stages),
                              ...(ann === "text" ? { color: n.color || surface.ink } : null) }}
                     onPointerDown={(e) => (present
                       ? (e.stopPropagation(),
                          setSpotlight((s) => (s === n.id ? null : n.id)))
                       : startMove(e, n.id))}
                     onPointerEnter={() => setHover(n.id)}
                     onPointerLeave={() => setHover(null)}>
                  {editing === n.id ? (
                    ann ? (
                      <textarea autoFocus defaultValue={noteText(n)}
                                placeholder={ann === "note" ? "Type a note…" : "Text…"}
                                onPointerDown={(e) => e.stopPropagation()}
                                onBlur={(e) => commitText(e.target.value)}
                                /* Enter adds a line; Esc / Cmd+Enter commit */
                                onKeyDown={(e) => {
                                  if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) e.target.blur();
                                }} />
                    ) : (
                      <input autoFocus defaultValue={n.title || t.label}
                             onPointerDown={(e) => e.stopPropagation()}
                             onBlur={(e) => commitText(e.target.value)}
                             onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
                    )
                  ) : ann ? (
                    <p className={noteText(n) ? "" : "ew-ann-empty"}>
                      {noteText(n) || (ann === "note" ? "Double-click to write a note" : "Double-click to edit")}
                    </p>
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
                  {(hover === n.id || isSel) && !editing && !present &&
                    nodePorts({ x: 0, y: 0, w: r.w, h: r.h }).map((p) => (
                      <span key={`${p.side}${p.t}`} className="ew-port" style={{ left: p.x, top: p.y }}
                            onPointerDown={(e) => startConnect(e, n.id, { side: p.side, t: p.t })} />
                    ))}
                  {isSel && selNodeIds.length === 1 && !editing && (
                    <span className="ew-grip" onPointerDown={(e) => startResize(e, n.id)} />
                  )}
                </div>
              );
            })}

            {/* annotation ink, above the diagram */}
            {(ink.length > 0 || drawing) && (
              <svg className="ew-ink" width={wireBox.w} height={wireBox.h}
                   viewBox={`${wireBox.x} ${wireBox.y} ${wireBox.w} ${wireBox.h}`}
                   style={{ left: wireBox.x, top: wireBox.y }}>
                <defs>
                  {INK_COLORS.map((c) => (
                    <marker key={c.value} id={`ew-ink-${c.value.slice(1)}`} viewBox="0 0 10 10"
                            refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M0,0 L10,5 L0,10 z" fill={c.value} />
                    </marker>
                  ))}
                </defs>
                {[...ink, ...(drawing ? [drawing] : [])].map((s) => (
                  <path key={s.id} d={inkPath(s)} stroke={s.color} strokeWidth={s.width}
                        className={"ew-inkpath" + (hiddenNow(s) ? " gone" : ghosted(s) ? " ghost" : "")}
                        markerEnd={s.kind === "arrow" ? `url(#ew-ink-${s.color.slice(1)})` : undefined} />
                ))}
              </svg>
            )}

            {marquee && (
              <div className="ew-marquee" style={{
                left: Math.min(marquee.x0, marquee.x1), top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0) }} />
            )}

            {/* live alignment guides: centre lines the dragged node snapped to,
                spanning whatever part of the world is on screen */}
            {guides && (() => {
              const el = viewportRef.current;
              if (!el) return null;
              const vx = -view.x / view.k, vy = -view.y / view.k;
              const vw = el.clientWidth / view.k, vh = el.clientHeight / view.k;
              return guides.map((g, i) => g.axis === "v"
                ? <div key={i} className="ew-guide v" style={{ left: g.at, top: vy, height: vh }} />
                : <div key={i} className="ew-guide h" style={{ top: g.at, left: vx, width: vw }} />);
            })()}
          </div>

          {comparison && !present && (
            <div className="ew-review ew-diff" onPointerDown={(e) => e.stopPropagation()}>
              <div className="ew-review-h">
                <b>vs {comparison.name}</b>
                <button className="ew-x" onClick={stopCompare}>×</button>
              </div>
              <div className="ew-review-body">
                {comparison.diff.capacity.length > 0 && (
                  <table className="ew-review-tiers">
                    <tbody>
                      {comparison.diff.capacity.map((l) => (
                        <tr key={l.label}>
                          <td>{l.label}</td>
                          <td className={l.delta > 0 ? "up" : l.delta < 0 ? "down" : ""}>{l.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {[
                  { kind: "added", title: "Added", entries: comparison.diff.added },
                  { kind: "changed", title: "Resized", entries: comparison.diff.changed },
                  { kind: "removed", title: "Dropped", entries: comparison.diff.removed },
                ].filter((g) => g.entries.length).map((g) => (
                  <div className="ew-diff-group" key={g.kind}>
                    <div className={"ew-diff-h " + g.kind}>{g.title} · {g.entries.length}</div>
                    {g.entries.map((entry, i) => (
                      <div className="ew-diff-row" key={`${entry.key}-${i}`}>
                        <b>{entry.label}</b>
                        {entry.fields && (
                          <span>{entry.fields.map((f) =>
                            `${f.label} ${f.from ?? "—"} → ${f.to ?? "—"}`).join(" · ")}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                <p className="ew-ihint">
                  {comparison.diff.unchanged} component{comparison.diff.unchanged === 1 ? "" : "s"} unchanged.
                  Dropped ones aren't on this board, so nothing is highlighted for them.
                </p>
              </div>
            </div>
          )}

          {minimap && !present && (
            <Minimap nodes={nodes} zones={zones} rectOf={rectOf}
                     fillOf={(n) => nodeTag(n, stages)}
                     view={view} viewportSize={vpSize} setView={setView} />
          )}

        </div>

        {/* docked inspector */}
        {sel && !present && (() => {
          /* --- edge --- */
          if (sel.kind === "edge") {
            const ed = edges.find((x) => x.id === sel.id);
            if (!ed) return null;
            const a = nodeById[ed.s], b = nodeById[ed.e];
            const hasShape = (Array.isArray(ed.pts) && ed.pts.length > 0) || !!(ed.sa || ed.ea);
            const autoColor = a ? nodeTag(a, stages) : (b ? nodeTag(b, stages) : stages.ops);
            const autoStyle = ((a && TYPES[a.type].ops) || (b && TYPES[b.type].ops)) ? "dashed" : "solid";
            const lineStyle = ed.style || autoStyle;
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
                    <div className="ew-frow"><span className="ew-flabel">Line</span>
                      <div className="ew-btnrow">
                        {Object.entries(EDGE_STYLES).map(([key, s]) => (
                          <button key={key} className={"ew-btn" + (lineStyle === key ? " act" : "")}
                                  onClick={() => setEd({ style: key === autoStyle ? undefined : key })}>
                            {s.label}
                          </button>
                        ))}
                      </div></div>
                    <div className="ew-frow"><span className="ew-flabel">Width</span>
                      <div className="ew-btnrow">
                        {EDGE_WIDTHS.map((w) => (
                          <button key={w.label}
                                  className={"ew-btn" + ((ed.width || EDGE_DEFAULT_WIDTH) === w.value ? " act" : "")}
                                  onClick={() => setEd({ width: w.value === EDGE_DEFAULT_WIDTH ? undefined : w.value })}>
                            {w.label}
                          </button>
                        ))}
                      </div></div>
                    <p className="ew-ihint">Drag the hollow dots on the line to bend it; drag a solid dot to move a bend, double-click it to remove. Drag either end dot onto another connection point — or another node — to reattach it.</p>
                    <div className="ew-btnrow">
                      {hasShape && <button className="ew-btn" onClick={() => resetEdgeShape(ed.id)}>Reset shape</button>}
                      <button className="ew-btn" onClick={() => setEd({ s: ed.e, e: ed.s, sa: ed.ea, ea: ed.sa })}>⇄ Reverse direction</button>
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
                  <StepSection value={selStep} max={stepCount} onChange={setSelStep} />
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
                  <StepSection value={selStep} max={stepCount} onChange={setSelStep} />
                  <section>
                    <button className="ew-btn danger" onClick={deleteSel}>Delete all zones</button>
                  </section>
                </div>
              </div>
            );
          }
          /* --- mixed nodes + zones (marquee sweep) --- */
          if (sel.kind === "mixed") {
            return (
              <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
                <div className="ew-ihead">
                  <span className="ew-idot" style={{ background: "#8A9BB4" }} />
                  <div className="ew-ititle">
                    <b>{sel.ids.length + sel.zoneIds.length} items selected</b>
                    <small>{sel.ids.length} node{sel.ids.length > 1 ? "s" : ""} · {sel.zoneIds.length} zone{sel.zoneIds.length > 1 ? "s" : ""}</small>
                  </div>
                  <button className="ew-x" onClick={() => setSel(null)}>×</button>
                </div>
                <div className="ew-iscroll">
                  <StepSection value={selStep} max={stepCount} onChange={setSelStep} />
                  <section>
                    <button className="ew-btn danger" onClick={deleteSel}>Delete all</button>
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
                  <StepSection value={selStep} max={stepCount} onChange={setSelStep} />
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
          /* --- annotation (sticky note / text) --- */
          if (t.annotation) {
            const isNote = t.annotation === "note";
            return (
              <div className="ew-inspector" onPointerDown={(e) => e.stopPropagation()}>
                <div className="ew-ihead">
                  <span className="ew-idot" style={{ background: nodeTag(n, stages) }} />
                  <div className="ew-ititle"><b>{t.label}</b><small>Annotation</small></div>
                  <button className="ew-x" onClick={() => setSel(null)}>×</button>
                </div>
                <div className="ew-iscroll">
                  <section>
                    <h5>Text</h5>
                    <textarea className="ew-itext" rows={isNote ? 5 : 2} value={noteText(n)}
                              placeholder={isNote ? "Type a note…" : "Text…"}
                              onChange={(e) => set({ title: e.target.value })} />
                  </section>
                  <section>
                    <h5>Layout</h5>
                    <div className="ew-frow"><span className="ew-flabel">{isNote ? "Paper" : "Color"}</span>
                      <div className="ew-btnrow">
                        <input type="color" value={n.color || (isNote ? t.color : surface.ink)}
                               onChange={(e) => set({ color: e.target.value })} />
                        {n.color && <button className="ew-btn" onClick={() => set({ color: undefined })}>Auto</button>}
                      </div></div>
                    <div className="ew-frow"><span className="ew-flabel">Size</span>
                      <div className="ew-size">
                        <input type="number" min="96" max="640" step="8" value={r.w}
                               onChange={(e) => set({ w: Math.max(96, Math.min(640, +e.target.value || r.w)) })} />
                        <i>×</i>
                        <input type="number" min="32" max="420" step="8" value={r.h}
                               onChange={(e) => set({ h: Math.max(32, Math.min(420, +e.target.value || r.h)) })} />
                      </div></div>
                  </section>
                  <StepSection value={selStep} max={stepCount} onChange={setSelStep} />
                  <section>
                    <div className="ew-btnrow">
                      <button className="ew-btn" onClick={duplicateSel}>Duplicate (⌘D)</button>
                      <button className="ew-btn danger" onClick={deleteSel}>Delete</button>
                    </div>
                  </section>
                </div>
              </div>
            );
          }
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
                      else if (f.kind === "search") ctrl = (
                        <SearchSelect value={v} options={f.options}
                                      placeholder={f.placeholder || ""} onChange={setP} />);
                      /* A set of values needs the full width, so it breaks out
                         of the label/control row the other kinds share. */
                      else if (f.kind === "chips") return (
                        <div className="ew-fcol" key={f.key}>
                          <span className="ew-flabel">{f.label}</span>
                          <div className="ew-pconf-checks">
                            {f.options.map((o) => {
                              const on = Array.isArray(v) && v.includes(o);
                              return (
                                <label key={o} className={"ew-pconf-chip" + (on ? " on" : "")}>
                                  <input type="checkbox" checked={on}
                                         onChange={() => setP(f.options.filter(
                                           (x) => (x === o ? !on : Array.isArray(v) && v.includes(x))))} />
                                  <span>{o}</span>
                                </label>);
                            })}
                          </div>
                        </div>);
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
                <StepSection value={selStep} max={stepCount} onChange={setSelStep} />
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
      {/* AI chat — docked on the right edge of the body row, like the
          inspector, so the conversation gets the full height under the
          toolbar instead of a floating box over the canvas */}
      {chatOpen && (
        <div className="ew-chat" onPointerDown={(e) => e.stopPropagation()}>
          <div className="ew-chat-head">
            <b>✦ Build with AI</b>
            <button className="ew-chat-gear" title="Settings" onClick={toggleChatSettings}>⚙</button>
            <button className="ew-x" onClick={() => setChatOpen(false)}>×</button>
          </div>

          {showChatSettings && (
            <div className="ew-chat-settings">
              <SettingsSection label="Amazon Bedrock"
                               status={hasAwsCreds ? "Key set" : "Needs a key"} ok={hasAwsCreds}
                               open={settingsPane === "bedrock"}
                               onToggle={() => setSettingsPane((p) => (p === "bedrock" ? null : "bedrock"))}>
                <div className="ew-awsload">
                  <button className="ew-btn" onClick={loadAwsCreds}>Load from ~/.aws/credentials</button>
                  {awsProfiles && (
                    <select className="ew-chat-select" value={awsProfileName} title="AWS profile"
                            onChange={(e) => applyAwsProfile(awsProfiles.find((p) => p.name === e.target.value))}>
                      {awsProfiles.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  )}
                  <input ref={credsFileRef} type="file" style={{ display: "none" }} onChange={pickAwsCredsFile} />
                </div>
                {credsNote && <p className="ew-chat-note">{credsNote}</p>}

                <label className="ew-flabel">AWS region</label>
                <input value={awsRegion} placeholder="us-east-1"
                       onChange={(e) => setAwsRegion(e.target.value.trim())} />
                <label className="ew-flabel">Access key ID</label>
                <input value={awsKeyId} placeholder="AKIA…"
                       onChange={(e) => setAwsKeyId(e.target.value.trim())} />
                <label className="ew-flabel">Secret access key</label>
                <input type="password" value={awsSecret} placeholder="wJalr…"
                       onChange={(e) => setAwsSecret(e.target.value.trim())} />
                <label className="ew-flabel">Session token (optional)</label>
                <input type="password" value={awsSession} placeholder="for temporary STS credentials"
                       onChange={(e) => setAwsSession(e.target.value.trim())} />
                <label className="ew-flabel">Model / inference profile</label>
                <input value={model} placeholder={BEDROCK_DEFAULT_MODEL}
                       onChange={(e) => setModel(e.target.value.trim())} />
                <p className="ew-chat-note">
                  Requests are SigV4-signed and sent straight to Amazon Bedrock in your region — the
                  IAM identity needs <code>bedrock:InvokeModel</code>. Credentials are stored in this
                  browser (localStorage). Don’t use this on a shared computer.
                </p>
              </SettingsSection>

              <SettingsSection label="Elastic"
                               status={hasElastic ? "Endpoint set" : "Off — repo corpus"} ok={hasElastic}
                               open={settingsPane === "elastic"}
                               onToggle={() => setSettingsPane((p) => (p === "elastic" ? null : "elastic"))}>
                <p className="ew-chat-note">
                  Point this at your own deployment and retrieval goes through an Agent Builder
                  agent over a <code>semantic_text</code> index instead of the corpus in the repo —
                  the product on the whiteboard doing the work behind it. Without it everything
                  still works, locally.
                </p>
                <label className="ew-flabel">Kibana endpoint</label>
                <input value={kibanaUrl} placeholder="https://my-deployment.kb.us-east-1.aws.found.io"
                       onChange={(e) => setKibanaUrl(e.target.value.trim())} />
                <label className="ew-flabel">Elasticsearch endpoint</label>
                <input value={esUrl} placeholder="https://my-deployment.es.us-east-1.aws.found.io"
                       onChange={(e) => setEsUrl(e.target.value.trim())} />
                <label className="ew-flabel">API key</label>
                <input type="password" value={elasticKey} placeholder="base64 encoded key"
                       onChange={(e) => setElasticKey(e.target.value.trim())} />
                <label className="ew-flabel">Agent id</label>
                <input value={elasticAgent} placeholder={ELASTIC_DEFAULT_AGENT}
                       onChange={(e) => setElasticAgent(e.target.value.trim())} />
                <label className="ew-flabel">Kibana space (optional)</label>
                <input value={elasticSpace} placeholder="default"
                       onChange={(e) => setElasticSpace(e.target.value.trim())} />
                <label className="ew-flabel">Knowledge index</label>
                <input value={elasticIndexName} placeholder={ELASTIC_DEFAULT_INDEX}
                       onChange={(e) => setElasticIndexName(e.target.value.trim())} />
                <p className="ew-chat-note">
                  Stored in this browser, like the keys above. A read-only key with{" "}
                  <code>agentBuilder:read</code> is enough to ask questions; pushing the corpus
                  needs write on that index, which is worth a second key. Calls go straight from
                  this page, so the deployment needs CORS enabled for this origin once — Check AI
                  below prints the exact settings if it doesn’t.
                </p>
              </SettingsSection>

              <SettingsSection label="Jina — images"
                               status={jinaKey.trim() ? "Key set" : "Off — images skip"} ok={!!jinaKey.trim()}
                               open={settingsPane === "jina"}
                               onToggle={() => setSettingsPane((p) => (p === "jina" ? null : "jina"))}>
                <p className="ew-chat-note">
                  An architecture screenshot or a whiteboard photo attached as context is read by
                  Jina's vision model — transcribed and described, then chunked like any other
                  document. PDFs and Office files don't need this; Elastic or this browser parses
                  those. Free key at <b>jina.ai</b>.
                </p>
                <label className="ew-flabel">Jina API key</label>
                <input type="password" value={jinaKey} placeholder="jina_…"
                       onChange={(e) => setJinaKey(e.target.value.trim())} />
              </SettingsSection>

              <div className="ew-btnrow">
                <button className="ew-btn" disabled={preflight?.busy} onClick={runPreflight}>
                  {preflight?.busy ? "Checking…" : "Check AI"}
                </button>
                {hasElastic && (
                  <>
                    <button className="ew-btn" disabled={pushState?.busy}
                            title="Write the repo's Elastic guidance into the index the agent searches"
                            onClick={() => pushToIndex(false)}>
                      {pushState?.busy ? "Pushing…" : "Push corpus"}
                    </button>
                    {docPassages.length > 0 && (
                      <button className="ew-btn" disabled={pushState?.busy}
                              title="Also push this board's documents — they leave the browser only if you do this"
                              onClick={() => pushToIndex(true)}>
                        + this board’s documents
                      </button>
                    )}
                  </>
                )}
              </div>

              {pushState?.note && <p className="ew-chat-note">Indexed {pushState.note}</p>}
              {pushState?.errors?.length > 0 && (
                <p className="ew-modal-bad">{pushState.errors.length} passage(s) rejected: {pushState.errors[0]}</p>
              )}
              {pushState?.error && (
                <>
                  <p className="ew-modal-bad">{pushState.error}</p>
                  {pushState.help && <pre className="ew-cors">{pushState.help}</pre>}
                </>
              )}

              {preflight && !preflight.busy && (
                <div className="ew-preflight">
                  <PreflightRow label="Bedrock" check={preflight.bedrock} />
                  {preflight.agent
                    ? <PreflightRow label="Agent Builder" check={preflight.agent} />
                    : <p className="ew-ihint">Elastic isn’t configured — retrieval runs on the repo corpus.</p>}
                  {preflight.index && (
                    <PreflightRow label="Knowledge index" check={preflight.index}
                                  detail={`${preflight.index.count} passages`} />
                  )}
                </div>
              )}
            </div>
          )}

          <div className="ew-chat-log" ref={chatLogRef}>
            {chatMsgs.length === 0 && !chatBusy && (
              <div className="ew-chat-empty">
                {nodes.length ? "Ask about this board, or tell me what to change." : "Describe an architecture and I’ll build it."}
                <div className="ew-chat-chips">
                  {chatChips.map((s) => (
                    <button key={s} onClick={() => setChatInput(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {chatMsgs.map((m, i) => (
              <div key={i} className={"ew-msg " + m.role}>
                {m.trail?.length > 0 && (
                  <p className="ew-trail" title="What ran to produce this answer">
                    {m.trail.map((t, j) => (
                      <em key={j} className={t.ok ? "" : "bad"}>{t.did}</em>
                    ))}
                  </p>
                )}
                {/* the model answers in Markdown; what the user typed is left as typed */}
                {m.role === "ai" ? <ChatMarkdown text={m.text} /> : m.text}
                {m.sources?.length > 0 && (
                  <p className="ew-cite" title="Retrieved passages this answer was grounded in">
                    <span>Sources</span>
                    {m.sources.map((s) => <em key={s}>{s}</em>)}
                  </p>
                )}
              </div>
            ))}
            {/* the turn in progress, step by step — in-flight lines pulse,
                settled ones keep the trail's past-tense words */}
            {chatBusy && (
              <div className="ew-msg ai ew-live" title="What the agent is doing right now">
                {chatSteps.filter((s) => s.kind === "tool" || s.kind === "retry").map((s, i) => (
                  s.kind === "retry" ? (
                    <em key={i} className="ew-thinking">
                      Bedrock pushed back (HTTP {s.status}) — retrying{"\u2026"}
                    </em>
                  ) : (
                    <em key={i} className={(s.ok === false ? "bad" : "") + (s.ok === undefined ? " ew-thinking" : "")}>
                      {(s.ok === undefined ? TOOL_DOING[s.name] : TOOL_TRAIL[s.name]) || s.name}
                      {s.input?.query ? ` — \u201c${s.input.query}\u201d` : ""}
                      {s.ok === undefined ? "\u2026" : ""}
                    </em>
                  )
                ))}
                {(chatSteps.length === 0 || chatSteps[chatSteps.length - 1].kind === "model") && (
                  <em className="ew-thinking">Thinking…</em>
                )}
              </div>
            )}
          </div>

          {pendingApply && (
            <div className="ew-apply">
              <b>{pendingApply.label}</b>
              {pendingApply.lines.length > 0 && (
                <ul>{pendingApply.lines.map((l) => <li key={l}>{l}</li>)}</ul>
              )}
              <div className="ew-btnrow">
                <button className="ew-btn primary" onClick={applyPending}>Apply</button>
                <button className="ew-btn" onClick={() => setPendingApply(null)}>Discard</button>
              </div>
            </div>
          )}

          {chatUsage && (chatUsage.cacheReadInputTokens > 0 || chatUsage.cacheWriteInputTokens > 0) && (
            <p className="ew-chat-usage" title="Bedrock served the instructions and catalog from its prompt cache">
              cache read {chatUsage.cacheReadInputTokens.toLocaleString("en-US")} ·
              written {chatUsage.cacheWriteInputTokens.toLocaleString("en-US")} tokens
            </p>
          )}

          <div className="ew-chat-form">
            <textarea className="ew-chat-input" rows={2} value={chatInput}
                      placeholder={hasAwsCreds ? "Describe or edit the diagram…" : "Add AWS credentials (⚙) to begin…"}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }} />
            <button className="ew-chat-send" onClick={() => sendChat()} disabled={chatBusy || !chatInput.trim()}
                    title="Send (Enter)">{chatBusy ? "…" : "Send"}</button>
          </div>
        </div>
      )}
      </div>

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

/* Assigns the selection to a build step. Step 0 is the base layer that's on
   screen from the start; higher steps appear as the presenter advances. */
function StepSection({ value, max, onChange }) {
  const options = Array.from({ length: Math.max(max, value) + 1 }, (_, i) => i + 1);
  return (
    <section>
      <h5>Build step</h5>
      <div className="ew-btnrow ew-stepbtns">
        <button className={"ew-btn" + (value ? "" : " act")} onClick={() => onChange(0)}
                title="Always visible">Base</button>
        {options.map((i) => (
          <button key={i} className={"ew-btn" + (value === i ? " act" : "")}
                  onClick={() => onChange(i)}>{i}</button>
        ))}
      </div>
      <p className="ew-ihint">Reveals on step {value || 0} while presenting.</p>
    </section>
  );
}

/* Pen / arrow toggles plus the ink colour swatches. Shared by the editing
   toolbar and the presentation bar. */
function InkTools({ tool, setTool, color, setColor, onClear, hasInk }) {
  const pick = (next) => setTool(tool === next ? null : next);
  return (
    <>
      <button className={tool === "pen" ? "act" : ""} onClick={() => pick("pen")}
              title="Draw freehand (Esc to stop)">✎ Pen</button>
      <button className={tool === "arrow" ? "act" : ""} onClick={() => pick("arrow")}
              title="Drag a straight arrow">↗ Arrow</button>
      {tool && INK_COLORS.map((c) => (
        <button key={c.value} className={"ew-inkswatch" + (color === c.value ? " act" : "")}
                style={{ "--sw": c.value }} title={c.label} onClick={() => setColor(c.value)} />
      ))}
      {hasInk && <button onClick={onClear} title="Remove every stroke">Clear ink</button>}
    </>
  );
}

/* Paste real Elasticsearch output and preview what it would draw before
   committing it to a new board. */
/* One collapsible block of provider settings. The header carries whether that
   provider is configured, so the panel answers "am I set up?" while collapsed
   and only costs its height once you're actually editing it. */
function SettingsSection({ label, status, ok, open, onToggle, children }) {
  return (
    <div className={"ew-sect" + (open ? " open" : "")}>
      <button type="button" className="ew-sect-h" aria-expanded={open} onClick={onToggle}>
        <span className="ew-sect-caret">{open ? "▾" : "▸"}</span>
        <b>{label}</b>
        <em className={ok ? "ok" : ""}>{status}</em>
      </button>
      {open && <div className="ew-sect-body">{children}</div>}
    </div>
  );
}

/* One leg of the pre-flight check. A failure is only useful if it says which
   failure it was, so a CORS block prints the settings that fix it rather than
   the browser's own "Failed to fetch", which says nothing. */
function PreflightRow({ label, check, detail }) {
  return (
    <div className={"ew-pf" + (check.ok ? " ok" : " bad")}>
      <b>{label}</b>
      <span>
        {check.ok ? (detail || check.detail || "ready") : check.error}
        {check.ms != null && check.ok ? ` · ${check.ms} ms` : ""}
      </span>
      {check.help && <pre className="ew-cors">{check.help}</pre>}
    </div>
  );
}

/* The documents attached to this board: paste them or pick a file, see what
   they were chunked into, and hand the design a brief it can be held against.

   Everything here is local. Attaching a document parses it in the browser and
   stores it with the board — the only thing that ever leaves is a passage the
   model retrieves during a turn you asked for. */
/* The customer half of the Board Context modal: paste an `edm … --json` run,
   or type the account and opportunity by hand when there's no CLI around.
   Successive pastes accumulate — opp, then stakeholders, then install base. */
function CustomerSection({ customer, onCustomer }) {
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState(null);   // { ok, text } from the last import
  const jsonRef = useRef(null);

  const importText = (text) => {
    try {
      const { kind, patch } = parseEdmRows(text);
      onCustomer(mergeCustomer(customer, patch));
      setPaste("");
      setNote({ ok: true, text: `Imported ${kind}.` });
    } catch (err) {
      setNote({ ok: false, text: err.message });
    }
  };
  const pickJson = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) importText(await file.text());
  };
  const setField = (field) => (e) =>
    onCustomer({ ...EMPTY_CUSTOMER, ...(customer || {}), [field]: e.target.value });

  const m = customer?.meddpicc;
  return (
    <>
      <div className="ew-cust-h">
        <b>Customer</b>
        {hasCustomer(customer) && (
          <button className="ew-btn" title="Forget everything imported for this board"
                  onClick={() => { onCustomer(null); setNote(null); }}>Clear</button>
        )}
      </div>
      <p className="ew-modal-hint">
        Who this board is for. The AI designs and reviews with it in mind; only the account
        and opportunity names ever reach anything customer-facing. Paste the JSON from an{" "}
        <code>edm</code> run — <code>edm opps --json</code>, then <code>stakeholders</code>,{" "}
        <code>installbase</code>, <code>meddpicc</code>, or <code>health</code> — each paste
        adds its part.
      </p>

      <div className="ew-frow">
        <span className="ew-flabel">Account</span>
        <input value={customer?.account || ""} placeholder="Acme Corp"
               onChange={setField("account")} />
      </div>
      <div className="ew-frow">
        <span className="ew-flabel">Opportunity</span>
        <input value={customer?.opportunity || ""} placeholder="Acme Expansion FY27"
               onChange={setField("opportunity")} />
      </div>

      {hasCustomer(customer) && (
        <div className="ew-cust-panel">
          {customer.stage && (
            <div><i>Deal</i>{[customer.stage, customer.value != null && `$${Number(customer.value).toLocaleString()}`,
              customer.closeDate && `closes ${customer.closeDate}`, customer.ae && `AE ${customer.ae}`]
              .filter(Boolean).join(" · ")}</div>
          )}
          {customer.stakeholders?.length > 0 && (
            <div><i>People</i>{customer.stakeholders.slice(0, 6)
              .map((s) => `${s.name}${s.role ? ` (${s.role})` : ""}`).join(", ")}
              {customer.stakeholders.length > 6 ? ` +${customer.stakeholders.length - 6} more` : ""}</div>
          )}
          {customer.installBase?.length > 0 && (
            <div><i>Install base</i>{customer.installBase.slice(0, 4)
              .map((s) => [s.product, s.version, s.nodes != null && `${s.nodes} nodes`]
                .filter(Boolean).join(" ")).join("; ")}</div>
          )}
          {m && <div><i>Deal review</i>{[m.score != null && `Altify ${m.score}%`,
            m.champion && `champion ${m.champion}`, m.eb && `EB ${m.eb}`]
            .filter(Boolean).join(" · ") || "on file"}</div>}
          {customer.health?.length > 0 && (
            <div><i>Support</i>{customer.health.length} open case{customer.health.length === 1 ? "" : "s"}
              {customer.health.some((h) => h.escalated) ? ", some escalated" : ""}</div>
          )}
          {customer.notes && <div><i>Notes</i>on file for the AI</div>}
        </div>
      )}

      <textarea className="ew-itext" rows={4} value={paste} spellCheck={false}
                placeholder={"Paste an edm … --json result here."}
                onChange={(e) => setPaste(e.target.value)} />
      {note && <p className={note.ok ? "ew-ihint" : "ew-modal-bad"}>{note.text}</p>}
      <div className="ew-btnrow">
        <button className="ew-btn" disabled={!paste.trim()} onClick={() => importText(paste)}>
          Import customer details</button>
        <input ref={jsonRef} type="file" accept=".json,application/json" style={{ display: "none" }}
               onChange={pickJson} />
        <button className="ew-btn" onClick={() => jsonRef.current?.click()}>Upload .json…</button>
      </div>
    </>
  );
}

function BoardContext({ documents, passages, onClose, onAttach, onRemove, onAsk, parseCfg,
                        customer, onCustomer }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsedVia, setParsedVia] = useState("");  // which machinery read the last upload
  const fileRef = useRef(null);

  const attach = (doc) => {
    const failed = onAttach(doc);
    setError(failed);
    if (failed) setParsedVia("");
    else { setText(""); setName(""); }
    return !failed;
  };

  /* The picker takes any file — an accept filter greys out exactly the files
     people bring (their RFP is a PDF), which reads as the button being broken.
     parseDocument routes what was picked: text reads directly, PDF/DOCX/XLSX
     go to the Elastic deployment's attachment processor with browser parsers
     as the fallback, images go to Jina. Failures come back as a sentence
     saying what to do instead. */
  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";                       // re-picking the same file should still fire
    if (!file) return;
    setParsing(true);
    setError("");
    setParsedVia("");
    try {
      const { text: body, via } = await parseDocument(file, parseCfg);
      if (attach({ name: file.name, text: body })) setParsedVia(`${file.name} — ${via}.`);
    } catch (err) {
      setError(err.message || "Couldn't read that file.");
    } finally {
      setParsing(false);
    }
  };

  /* Straight from here into a turn, because the point of attaching a document
     is the two questions that follow it. */
  const ask = (prompt) => { onClose(); onAsk(prompt); };

  const passagesFor = (id) => passages.filter((p) => p.id.startsWith(`${id}#`)).length;

  return (
    <>
      <div className="ew-modal-backdrop" onClick={onClose} />
      <div className="ew-modal">
        <div className="ew-modal-h">
          <b>Board context</b>
          <button className="ew-x" onClick={onClose}>×</button>
        </div>
        <div className="ew-modal-body">
          <p className="ew-modal-hint">
            What the customer actually asked for — an RFP, a requirements sheet, last call's
            notes. The AI can design to it and check the board against it, citing the document
            rather than guessing. Parsed in this browser and stored with this board; it never
            travels in a share link.
          </p>

          {documents.length > 0 && (
            <ul className="ew-docs">
              {documents.map((d) => (
                <li key={d.id}>
                  <span>{d.name}</span>
                  <em>{passagesFor(d.id)} passage{passagesFor(d.id) === 1 ? "" : "s"}</em>
                  <button className="ew-x" title="Remove this document"
                          onClick={() => onRemove(d.id)}>×</button>
                </li>
              ))}
            </ul>
          )}

          <div className="ew-frow">
            <span className="ew-flabel">Name</span>
            <input value={name} placeholder="Acme RFP — section 4"
                   onChange={(e) => setName(e.target.value)} />
          </div>
          <textarea className="ew-itext" rows={8} value={text} spellCheck={false}
                    placeholder={"Paste the requirements, the RFP section, or your notes from the call.\n\nHeadings help — each becomes its own passage, so a citation points at the part that mattered."}
                    onChange={(e) => setText(e.target.value)} />
          {error && <p className="ew-modal-bad">{error}</p>}
          {parsedVia && !error && <p className="ew-ihint">{parsedVia}</p>}

          {documents.length > 0 && (
            <div className="ew-btnrow">
              <button className="ew-btn act" onClick={() => ask("Design to the requirements in the documents attached to this board. Search them first, build what they describe, and say which requirement drove each part of the design.")}>
                ✦ Design to this
              </button>
              <button className="ew-btn act" onClick={() => ask("Check this board against the requirements in the attached documents. Search them, then list where the design meets what they asked for and where it does not, citing the document for each. Say plainly if something they asked for is missing.")}>
                ✦ Check the design against it
              </button>
            </div>
          )}

          <div className="ew-cust-sep" />
          <CustomerSection customer={customer} onCustomer={onCustomer} />
        </div>
        <div className="ew-modal-foot">
          <span className="ew-ihint">Text, PDF, Word, Excel — and images, with a Jina key.</span>
          <input ref={fileRef} type="file" style={{ display: "none" }}
                 onChange={pickFile} />
          <button className="ew-btn" disabled={parsing}
                  onClick={() => fileRef.current?.click()}>{parsing ? "Parsing…" : "Upload a file…"}</button>
          <button className="ew-btn primary" disabled={!text.trim()}
                  onClick={() => attach({ name, text })}>Attach</button>
        </div>
      </div>
    </>
  );
}

function ClusterImport({ onClose, onImport }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseClusterInput(text), [text]);
  const summary = useMemo(() => (parsed ? summarizeCluster(parsed) : null), [parsed]);

  return (
    <>
      <div className="ew-modal-backdrop" onClick={onClose} />
      <div className="ew-modal">
        <div className="ew-modal-h">
          <b>Import a real cluster</b>
          <button className="ew-x" onClick={onClose}>×</button>
        </div>
        <div className="ew-modal-body">
          <p className="ew-modal-hint">
            Best fidelity: <code>GET _nodes</code> — it carries CPU core counts and the
            Elasticsearch version. Quicker: <code>GET _cat/nodes?v&h=name,node.role,ram.max,disk.total</code>{" "}
            (the explicit columns matter — the default <code>?v</code> set has no RAM or disk, so those
            nodes import with none). <code>GET _cluster/stats</code> also works but is approximate — its
            role counts overlap, so the node breakdown is reconstructed against the total. Paste from
            Kibana Dev Tools (request line, <code>curl</code>, or <code>?format=json</code> all fine).
            Nothing leaves the browser.
          </p>
          <textarea className="ew-itext ew-modal-input" autoFocus value={text} rows={11}
                    spellCheck={false}
                    placeholder={"name        node.role ram.max disk.total\nes-hot-1    himr      62.9gb  2tb\nes-master-1 mr        15.7gb  100gb"}
                    onChange={(e) => setText(e.target.value)} />
          {text.trim() && !summary && (
            <p className="ew-modal-bad">Couldn't read that. For <code>_cat/nodes</code>, include the header row (the <code>?v</code> flag).</p>
          )}
          {summary && (
            <div className="ew-modal-preview">
              <b>{summary.total} nodes</b> from <code>{summary.source}</code>
              {summary.clusterName && <> · {summary.clusterName}</>}
              <ul>
                {summary.groups.map((g) => (
                  <li key={g.type}>
                    <span>{TYPES[g.type].label}</span>
                    <em>{g.count} × {g.cpu ? `${g.cpu} vCPU, ` : ""}{g.ramGB ? `${g.ramGB} GB` : "—"}{g.diskTB ? `, ${g.diskTB} TB` : ""}</em>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="ew-modal-foot">
          <span className="ew-ihint">Imports into a new board — your current one is untouched.</span>
          <button className="ew-btn" onClick={onClose}>Cancel</button>
          <button className="ew-btn primary" disabled={!summary} onClick={() => onImport(parsed)}>
            Create board
          </button>
        </div>
      </div>
    </>
  );
}

/* The written artifact. One board's facts, several things to write from them, so
   the modal opens on the choice and nothing is sent until it's made — then the
   header's picker re-runs against the same facts. Editable before it's copied:
   the model drafts, the SA decides what actually goes to the customer. */
/* The follow-up package's preview: the captured board image, the recap draft
   (editable — it leaves the building, so it gets checked first), and the two
   ways out: a self-contained HTML file or markdown on the clipboard. */
function FollowupModal({ state, onClose, onRetry, onDownload, onCopy }) {
  const [draft, setDraft] = useState(state.md || "");
  useEffect(() => { if (state.md) setDraft(state.md); }, [state.md]);

  return (
    <>
      <div className="ew-modal-backdrop" onClick={onClose} />
      <div className="ew-modal">
        <div className="ew-modal-h">
          <b>Follow-up package</b>
          <button className="ew-x" onClick={onClose}>×</button>
        </div>
        <div className="ew-modal-body">
          {state.busy && <p className="ew-modal-hint">Packaging the session — rendering the board and writing the recap…</p>}
          {!state.busy && (
            <>
              {state.png
                ? <img className="ew-followup-thumb" src={state.png} alt="The board, as it will appear in the package" />
                : <p className="ew-ihint">The board image couldn't be rendered — the package will carry text only.</p>}
              {state.error && <p className="ew-modal-bad">{state.error}</p>}
              {state.noCreds && (
                <p className="ew-ihint">No Bedrock credentials, so there's no written recap —
                  the image, capacity, and findings are exact; add credentials for the narrative.</p>
              )}
              {state.md && (
                <textarea className="ew-itext" rows={10} value={draft}
                          onChange={(e) => setDraft(e.target.value)} />
              )}
              <p className="ew-ihint">
                One self-contained HTML file: the board image, the recap, capacity, and review
                findings. Only the account and opportunity names appear — deal details stay out.
                Check it before it leaves the building.
              </p>
            </>
          )}
        </div>
        <div className="ew-modal-foot">
          <span className="ew-ihint" />
          <button className="ew-btn" onClick={onClose}>Close</button>
          {state.error && <button className="ew-btn" onClick={onRetry}>Try again</button>}
          {!state.busy && <button className="ew-btn" onClick={() => onCopy(draft)}>Copy Markdown</button>}
          {!state.busy && <button className="ew-btn primary" onClick={() => onDownload(draft)}>Download HTML</button>}
        </div>
      </div>
    </>
  );
}

function BoardSummary({ state, onClose, onCopy, onWrite }) {
  const [draft, setDraft] = useState(state.text || "");
  useEffect(() => { if (state.text) setDraft(state.text); }, [state.text]);
  const genre = state.genre || SUMMARY_DEFAULT;
  const genres = Object.entries(SUMMARY_PROMPTS);

  return (
    <>
      <div className="ew-modal-backdrop" onClick={onClose} />
      <div className="ew-modal">
        <div className="ew-modal-h">
          <b>{state.choosing ? "Write it up" : SUMMARY_PROMPTS[genre].label}</b>
          {!state.choosing && (
            <select className="ew-chat-select" value={genre} disabled={state.busy}
                    title="Write something else from the same board"
                    onChange={(e) => onWrite(e.target.value)}>
              {genres.map(([key, g]) => <option key={key} value={key}>{g.label}</option>)}
            </select>
          )}
          <button className="ew-x" onClick={onClose}>×</button>
        </div>
        <div className="ew-modal-body">
          {state.choosing && (
            <>
              <p className="ew-modal-hint">
                Same facts — the diagram, the capacity rollup, and the review findings.
                Pick what to write from them.
              </p>
              <div className="ew-genres">
                {genres.map(([key, g]) => (
                  <button key={key} className="ew-genre" onClick={() => onWrite(key)}>
                    <b>{g.label}</b>
                    <span>{g.hint}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {state.busy && <p className="ew-modal-hint">Writing up the board…</p>}
          {state.error && <p className="ew-modal-bad">{state.error}</p>}
          {state.text && (
            <>
              <textarea className="ew-itext" rows={12} value={draft}
                        onChange={(e) => setDraft(e.target.value)} />
              <p className="ew-ihint">Drafted from the diagram, the capacity rollup, and the review findings. Check it before you send it.</p>
            </>
          )}
        </div>
        <div className="ew-modal-foot">
          <span className="ew-ihint" />
          <button className="ew-btn" onClick={onClose}>Close</button>
          {state.error && <button className="ew-btn" onClick={() => onWrite(genre)}>Try again</button>}
          {state.text && (
            <button className="ew-btn primary" onClick={() => onCopy(draft)}>Copy</button>
          )}
        </div>
      </div>
    </>
  );
}

/* Sizing calculator: the arithmetic an SA does on a napkin before drawing.
   Ingest rate and retention per tier in, node counts out, then draw it. */
/* Searchable dropdown for long option lists — the native datalist popup can't
   be scrolled reliably across browsers. Free text still works: typing commits
   as you go and filters the list; picking an entry commits it and closes. */
function SearchSelect({ value, options, placeholder, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(null);   // null: not filtering, show the value
  const inputRef = useRef(null);
  const hostRef = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const needle = (query || "").trim().toLowerCase();
  const matches = useMemo(() => {
    const list = needle ? options.filter((o) => o.toLowerCase().includes(needle)) : options;
    return list.slice(0, 200);
  }, [options, needle]);

  /* The list is measured against the viewport and rendered into the body,
     rather than positioned inside the input. Every dialog using this has an
     `overflow:auto` body that would clip a child to whatever room is left
     under the row — a line or two of a two-hundred-entry catalog. `fixed`
     alone does not escape it either, because `.ew-modal` is transformed and
     so becomes the containing block. The portal goes to `.ew-root` rather
     than the document body because the theme's custom properties are scoped
     there. Measuring also lets the list open upwards when the row sits near
     the bottom of the screen. */
  useEffect(() => {
    if (!open) return undefined;
    hostRef.current = inputRef.current?.closest(".ew-root") || document.body;
    const place = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const flip = below < 180 && above > below;
      setAnchor({
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(flip ? above : below, 120),
        ...(flip ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <div className="ew-combo">
      <input ref={inputRef} value={query !== null ? query : (value || "")} placeholder={placeholder}
             onFocus={() => setOpen(true)}
             onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
             onBlur={() => { setOpen(false); setQuery(null); }}
             onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter") e.target.blur(); }} />
      {open && anchor && hostRef.current && matches.length > 0 && createPortal(
        <div className="ew-combo-list" style={anchor}
             onPointerDown={(e) => e.preventDefault()} /* keep input focus while scrolling/picking */>
          {matches.map((o) => (
            <button key={o} type="button"
                    onClick={() => { onChange(o); setQuery(null); setOpen(false); }}>
              {o}
            </button>
          ))}
        </div>,
        hostRef.current,
      )}
    </div>
  );
}

/* Row-based intake for data sources: each row picks an integration from the
   Elastic Agent catalog (free text works too) with an optional raw ingest
   volume, and lands on the board as one Data Source node in a vertical stack. */
function DataSourcesDialog({ onClose, onAdd }) {
  const blankRow = () => ({ id: uid("srcrow"), integration: "", gb: "", days: "" });
  const [rows, setRows] = useState(() => [blankRow()]);
  const setRow = (id, patch) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const filled = rows.filter((r) => r.integration.trim() || +r.gb > 0);
  const total = filled.reduce((sum, r) => sum + (+r.gb || 0), 0);
  return (
    <>
      <div className="ew-modal-backdrop" onClick={onClose} />
      <div className="ew-modal ew-modal-wide">
        <div className="ew-modal-h">
          <b>Add data sources</b>
          <button className="ew-x" onClick={onClose}>×</button>
        </div>
        <div className="ew-modal-body">
          <p className="ew-ihint">
            Pick each source from the Elastic Agent integrations catalog (or type any
            name) with an optional raw ingest volume and retention. Each row becomes a
            Data Source node on the board, stacked in a column; the sizing dialog can
            sum the volumes, and a per-source retention caps how far that source's
            data ages through the tiers.
          </p>
          {rows.map((r) => (
            <div className="ew-srcrow" key={r.id}>
              <SearchSelect value={r.integration} options={INTEGRATION_TITLES}
                            placeholder="Search integrations…"
                            onChange={(v) => setRow(r.id, { integration: v })} />
              <input className="ew-itext" type="number" min="0" step="10" placeholder="GB/day"
                     value={r.gb} onChange={(e) => setRow(r.id, { gb: e.target.value })} />
              <input className="ew-itext" type="number" min="1" placeholder="days"
                     value={r.days} onChange={(e) => setRow(r.id, { days: e.target.value })} />
              <button className="ew-x" title="Remove row"
                      onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>×</button>
            </div>
          ))}
          <button className="ew-btn" onClick={() => setRows((rs) => [...rs, blankRow()])}>+ Add row</button>
        </div>
        <div className="ew-modal-foot">
          <span className="ew-ihint">
            {filled.length} source{filled.length === 1 ? "" : "s"} · {total} GB/day
          </span>
          <button className="ew-btn" onClick={onClose}>Cancel</button>
          <button className="ew-btn primary" disabled={!filled.length}
                  onClick={() => { onAdd(filled); onClose(); }}>
            Add to board
          </button>
        </div>
      </div>
    </>
  );
}

function SizingCalculator({ onClose, onDraw, sources = { total: 0, count: 0 }, onAddSources }) {
  const [input, setInput] = useState(SIZING_DEFAULTS);
  /* Ingest can be a hand-entered total, or the sum of the Data Source nodes
     on the board that carry a raw-ingest volume. */
  const [fromBoard, setFromBoard] = useState(false);
  const [srcOpen, setSrcOpen] = useState(false);
  const useBoard = fromBoard && sources.total > 0;
  const sizingInput = useMemo(
    () => (useBoard ? { ...input, dailyGB: sources.total, sources: sources.rows } : input),
    [input, useBoard, sources]);
  /* Instance / vCPU / disk cells edited away from the recommendation; RAM
     edits live in input.ram because RAM re-derives node counts too. */
  const [hwOver, setHwOver] = useState({});
  const result = useMemo(() => sizeCluster(sizingInput), [sizingInput]);
  const recommended = useMemo(() => recommendHardware(result), [result]);
  const hardware = useMemo(() => Object.fromEntries(
    Object.entries(recommended).map(([k, row]) => [k, { ...row, ...(hwOver[k] || {}) }])),
    [recommended, hwOver]);
  const hwTouched = Object.keys(hwOver).length > 0 || Object.keys(input.ram).length > 0;

  const set = (key, value) => setInput((prev) => ({ ...prev, [key]: value }));
  const setDays = (key, value) =>
    setInput((prev) => ({ ...prev, days: { ...prev.days, [key]: value } }));
  const setRam = (key, value) =>
    setInput((prev) => ({ ...prev, ram: { ...prev.ram, [key]: value } }));
  const overrideHw = (key, field, value) =>
    setHwOver((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  const resetHw = () => { setHwOver({}); setInput((prev) => ({ ...prev, ram: {} })); };
  /* Hardware edits are tied to a provider, region, and profile, so switching
     any of them drops the edits (and the narrower choices). */
  const setProvider = (value) => {
    setHwOver({});
    setInput((prev) => ({ ...prev, provider: value, region: "", profile: "", ram: {} }));
  };
  const setRegion = (value) => {
    setHwOver({});
    setInput((prev) => ({ ...prev, region: value, profile: "", ram: {} }));
  };
  const setProfile = (value) => {
    setHwOver({});
    setInput((prev) => ({ ...prev, profile: value, ram: {} }));
  };
  const isECH = input.provider !== "selfmanaged";
  const profiles = isECH ? echProfiles(input.provider, input.region) : [];

  const num = (label, key, props) => (
    <label className="ew-size-f">
      <span>{label}</span>
      <input className="ew-itext" type="number" min="0" value={input[key]}
             onChange={(e) => set(key, e.target.value)} {...props} />
    </label>
  );
  const toggle = (label, key) => (
    <label className="ew-size-f ew-size-t">
      <span>{label}</span>
      <input type="checkbox" checked={!!input[key]} onChange={(e) => set(key, e.target.checked)} />
    </label>
  );

  return (
    <>
      <div className="ew-modal-backdrop" onClick={onClose} />
      <div className="ew-modal ew-modal-wide">
        <div className="ew-modal-h">
          <b>Draw a Cluster</b>
          <button className="ew-x" onClick={onClose}>×</button>
        </div>
        <div className="ew-modal-body">
          <div className="ew-size-grid">
            <label className="ew-size-f">
              <span>Provider</span>
              <select className="ew-itext" value={input.provider}
                      onChange={(e) => setProvider(e.target.value)}>
                {SIZING_PROVIDERS.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            {isECH && (
              <label className="ew-size-f">
                <span>Region</span>
                <select className="ew-itext" value={input.region}
                        onChange={(e) => setRegion(e.target.value)}>
                  <option value="">Any region</option>
                  {ECH_REGIONS[input.provider].map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
            )}
            {isECH && (
              <label className="ew-size-f">
                <span>Hot profile</span>
                <select className="ew-itext" value={input.profile || profiles[0]}
                        onChange={(e) => setProfile(e.target.value)}>
                  {profiles.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            )}
            <label className="ew-size-f">
              <span>Ingest</span>
              <input className="ew-itext" type="number" min="0" step="10"
                     value={useBoard ? sources.total : input.dailyGB}
                     disabled={useBoard}
                     onChange={(e) => set("dailyGB", e.target.value)} />
            </label>
            <label className="ew-size-f ew-size-t">
              <span>Data sources</span>
              <button className="ew-btn" onClick={() => setSrcOpen(true)}>+ Add…</button>
            </label>
            {sources.total > 0 && (
              <label className="ew-size-f ew-size-t">
                <span>Sum board sources</span>
                <input type="checkbox" checked={fromBoard}
                       onChange={(e) => setFromBoard(e.target.checked)} />
              </label>
            )}
            {num("Replicas", "replicas", { max: 3, step: 1 })}
            {num("Index overhead", "overhead", { step: 0.1 })}
            {!isECH && num("RAM per node", "nodeRAM", { step: 8 })}
          </div>
          <p className="ew-ihint">
            Ingest in GB/day of raw data. Overhead is index size against raw — about 1:1 for
            logs with default mappings, less with synthetic <code>_source</code>.
            {sources.total > 0 && <>{" "}Sum board sources totals the {sources.count} Data
            Source node{sources.count === 1 ? "" : "s"} on the board that carry a raw-ingest
            volume ({sources.total} GB/day) instead of a hand-entered figure.</>}
            {isECH && <>{" "}On Elastic Cloud, node RAM follows each instance configuration's
            published size ladder, the hot profile picks the deployment template's hot-tier
            hardware, and the region narrows hardware to what's offered there.</>}
          </p>

          <div className="ew-size-grid">
            {SIZING_TIERS.map((t) => (
              <label className="ew-size-f" key={t.key}>
                <span><span className="ew-swatch" style={{ background: TYPES[t.type].color }} />{t.label}</span>
                <input className="ew-itext" type="number" min="0" step="5" value={input.days[t.key]}
                       onChange={(e) => setDays(t.key, e.target.value)} />
              </label>
            ))}
          </div>
          <p className="ew-ihint">Days held in each tier. Cold and frozen mount searchable snapshots, so replicas don't multiply their storage.</p>

          <div className="ew-size-grid">
            {num("Agents", "agents", { step: 10 })}
            {num("Kibana users", "users", { step: 10 })}
            {toggle("Logstash", "logstash")}
            {toggle("Machine learning", "ml")}
            {toggle("Dedicated masters", "masters")}
            {toggle("Monitoring cluster", "monitoring")}
          </div>
          <p className="ew-ihint">
            The stack around the cluster: agents are hosts shipping data, users are concurrent
            Kibana users. Logstash is sized from ingest (~1 TB/day per node, HA pair minimum),
            dedicated masters join automatically once the data tiers reach six nodes, and the
            monitoring cluster is a separate small deployment for stack monitoring. Machine
            learning adds dedicated ML nodes for inference and anomaly detection, sized from
            ingest (16 GB floor, HA pair minimum) and off unless you ask for them.
            Zero a field or untick a toggle to leave that piece off the drawing.
          </p>

          {result.tiers.length > 0 && (
            <>
              <div className="ew-hw">
                <div className="ew-hw-row ew-hw-head">
                  <span>Component</span><span>Instance</span><span>vCPU</span><span>RAM (GB)</span><span>Disk</span>
                </div>
                {Object.values(hardware).map((row) => (
                  <div className="ew-hw-row" key={row.key}>
                    <span className="ew-hw-name">{row.label} <em>×{row.count}</em></span>
                    <input className="ew-itext" value={row.instance}
                           onChange={(e) => overrideHw(row.key, "instance", e.target.value)} />
                    <input className="ew-itext" type="number" min="1" value={row.cpu}
                           onChange={(e) => overrideHw(row.key, "cpu", e.target.value)} />
                    <input className="ew-itext" type="number" min="1" value={input.ram[row.key] ?? row.mem}
                           onChange={(e) => setRam(row.key, e.target.value)} />
                    <input className="ew-itext" value={row.disk}
                           onChange={(e) => overrideHw(row.key, "disk", e.target.value)} />
                  </div>
                ))}
              </div>
              <p className="ew-ihint">
                {isECH ? (
                  <>Elastic Cloud instance configurations from the docs: disk and vCPU follow each
                  config's published ratios, RAM snaps up its size ladder, and a tier scales out
                  past the top rung. Every cell is editable — RAM changes re-derive node counts.</>
                ) : (
                  <>Best-practice AWS boxes, per node: NVMe (i3en) for hot indexing and the frozen
                  cache, dense disk (d3en) for warm and cold, small general-purpose masters. Every
                  cell is editable — RAM changes re-derive node counts and the instance pick.</>
                )}
                {hwTouched && <>{" "}<button className="ew-linkbtn" onClick={resetHw}>Reset to recommended</button></>}
              </p>
            </>
          )}

          {result.tiers.length > 0 ? (
            <div className="ew-modal-preview">
              <b>{result.nodes} nodes</b> · {formatTB(result.dataTB)} on disk · {result.ramGB} GB RAM
              {result.objectStoreTB > 0 && <> · {formatTB(result.objectStoreTB)} in object storage</>}
              <ul>
                {result.tiers.map((t) => (
                  <li key={t.key}>
                    <span>{t.label} · {t.days} days</span>
                    <em>{t.nodes} × {formatTB(t.perNodeTB)} = {formatTB(t.dataTB)}</em>
                  </li>
                ))}
                {result.stack.masters > 0 && <li><span>Dedicated masters</span><em>{result.stack.masters} × {hardware.master?.instance}</em></li>}
                {result.stack.ml > 0 && <li><span>Machine learning</span><em>{result.stack.ml} × {hardware.ml?.instance}</em></li>}
                {result.stack.logstash > 0 && <li><span>Logstash</span><em>{result.stack.logstash} × {hardware.logstash?.instance}</em></li>}
                {result.stack.kibana > 0 && <li><span>Kibana</span><em>{result.stack.kibana} × {hardware.kibana?.instance}</em></li>}
                {result.stack.agents > 0 && <li><span>Elastic Agent</span><em>{result.stack.agents} hosts</em></li>}
              </ul>
            </div>
          ) : (
            <p className="ew-modal-bad">Set an ingest rate and at least one tier's retention.</p>
          )}
        </div>
        <div className="ew-modal-foot">
          <span className="ew-ihint">Draws the architecture onto the current board.</span>
          <button className="ew-btn" onClick={onClose}>Cancel</button>
          <button className="ew-btn primary" disabled={!result.tiers.length}
                  onClick={() => onDraw(result, hardware, { fromBoardSources: useBoard })}>
            Draw it
          </button>
        </div>
      </div>
      {srcOpen && (
        <DataSourcesDialog onClose={() => setSrcOpen(false)}
                           onAdd={(rows) => { onAddSources(rows); setFromBoard(true); }} />
      )}
    </>
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
    const ordered = order.filter((k) => next.includes(k)); // keep option order for determinism
    setCfg((c) => {
      const fill = { ...c.fill, [key]: ordered };
      // The frozen tier is backed by searchable snapshots, so picking it
      // auto-enables object storage (still manually toggleable afterwards).
      if (cfg.id === "cluster" && key === "tiers" && !cur.includes("frozen") && ordered.includes("frozen")) {
        fill.objectStorage = true;
      }
      return { ...c, fill };
    });
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
  /* canvas drags (pan/marquee/move) must not start a native text selection
     that spills into the inspector flyout */
  user-select:none; -webkit-user-select:none;
}
.ew-root input, .ew-root textarea{ user-select:text; -webkit-user-select:text; }
.ew-toolbar{ display:flex; align-items:center; gap:8px; padding:10px 14px;
  border-bottom:1px solid var(--line); background:var(--panel2); flex:none; flex-wrap:wrap; }
.ew-title{ font-family:var(--display); font-weight:700; font-size:20px; margin-right:8px; }
.ew-toolbar button{ background:var(--panel); color:var(--ink); border:1px solid var(--line);
  border-radius:7px; padding:5px 12px; font-family:var(--mono); font-size:12px; cursor:pointer; }
.ew-toolbar button:hover:not(:disabled){ border-color:var(--accent); }
.ew-toolbar button:disabled{ opacity:.35; cursor:default; }
.ew-gap{ width:10px; }
.ew-sep{ width:1px; align-self:stretch; margin:4px 3px; background:var(--line); flex:none; }
.ew-zoomgrp{ display:inline-flex; align-items:stretch; }
.ew-zoomgrp button{ border-radius:0; }
.ew-zoomgrp button + button{ margin-left:-1px; }
.ew-zoomgrp button:first-child{ border-radius:7px 0 0 7px; }
.ew-zoomgrp button:last-child{ border-radius:0 7px 7px 0; }
.ew-zoomgrp button:hover:not(:disabled){ position:relative; z-index:1; }
.ew-zoom{ color:var(--muted) !important; min-width:44px; text-align:center; padding:5px 6px !important; }
.ew-totals{ font-family:var(--mono); font-size:11.5px; color:var(--accent) !important; margin-left:6px;
  display:inline-flex; align-items:center; gap:7px; }
.ew-totals.on{ border-color:var(--accent) !important; }
.ew-warncount{ background:#E7664C; color:#fff; border-radius:99px; min-width:16px; height:16px;
  display:inline-flex; align-items:center; justify-content:center; font-size:10px; padding:0 4px; }
/* annotation ink + build steps + presentation mode */
.ew-ink{ position:absolute; overflow:visible; pointer-events:none; }
.ew-inkpath{ fill:none; stroke-linecap:round; stroke-linejoin:round;
  transition:opacity .25s; }
.ew-inkpath.ghost{ opacity:.16; }
.ew-inkpath.gone{ display:none; }
.ew-viewport.inking{ cursor:crosshair; }
.ew-viewport.inking:active{ cursor:crosshair; }
.ew-node.ghost, .ew-ann.ghost, .ew-zone.ghost{ opacity:.16; }
.ew-inkswatch{ width:24px; height:24px; padding:0 !important; border-radius:6px;
  background:var(--sw) !important; border:1px solid var(--line) !important; }
.ew-inkswatch.act{ box-shadow:0 0 0 2px var(--panel), 0 0 0 3px var(--sw); }
.ew-menu-inkrow{ display:flex; gap:6px; padding:4px 8px; }
.ew-menu .ew-inkswatch{ width:24px; height:24px; flex:none; }
.ew-toolbar > .ew-menuwrap > button.on{ border-color:var(--accent); color:var(--accent); }
.ew-stepbtns{ flex-wrap:wrap; }
.ew-stepbtns .ew-btn{ min-width:34px; text-align:center; }
.ew-present-bar{ justify-content:flex-start; }
.ew-steps{ display:inline-flex; align-items:center; gap:8px; }
.ew-steps b{ font-family:var(--mono); font-size:12px; color:var(--accent); min-width:96px;
  text-align:center; font-weight:400; }
/* modal dialogs (cluster import) */
.ew-modal-backdrop{ position:fixed; inset:0; z-index:60; background:rgba(6,10,22,.62); }
.ew-modal{ position:fixed; z-index:61; top:50%; left:50%; transform:translate(-50%,-50%);
  width:min(620px, calc(100vw - 48px)); max-height:calc(100vh - 96px); display:flex; flex-direction:column;
  background:var(--panel); border:1px solid var(--line); border-radius:13px;
  box-shadow:0 30px 70px rgba(0,0,0,.55); }
.ew-modal-wide{ width:min(880px, calc(100vw - 48px)); }
.ew-modal-h{ display:flex; align-items:center; gap:8px; padding:13px 10px 13px 17px;
  border-bottom:1px solid var(--line); }
.ew-modal-h b{ flex:1; font-family:var(--display); font-weight:500; font-size:15px; }
.ew-modal-body{ padding:15px 17px; overflow:auto; display:grid; gap:11px; }
.ew-modal-hint{ margin:0; font-size:12px; color:var(--muted); line-height:1.5; }
.ew-modal-hint code, .ew-modal-bad code, .ew-modal-preview code{ font-family:var(--mono); font-size:11px;
  background:var(--panel2); border:1px solid var(--line); border-radius:4px; padding:1px 5px; }
.ew-modal-input{ font-family:var(--mono); font-size:11.5px; line-height:1.5; white-space:pre; }
.ew-modal-bad{ margin:0; font-size:12px; color:#E7664C; line-height:1.5; }
.ew-modal-preview{ font-size:12.5px; color:var(--muted); background:var(--panel2);
  border:1px solid var(--line); border-radius:8px; padding:11px 13px; }
.ew-modal-preview b{ color:var(--ink); font-family:var(--display); font-weight:500; }
.ew-modal-preview ul{ margin:8px 0 0; padding:0; list-style:none; display:grid; gap:4px; }
.ew-modal-preview li{ display:flex; justify-content:space-between; gap:12px; }
.ew-modal-preview li span{ color:var(--ink); }
.ew-modal-preview li em{ font-style:normal; font-family:var(--mono); font-size:11px; }
/* the customer's documents, attached to this board */
.ew-followup-thumb{ width:100%; border:1px solid var(--line); border-radius:8px; display:block; }
.ew-cust-sep{ height:1px; background:var(--line); margin:4px 0; }
.ew-cust-h{ display:flex; align-items:center; justify-content:space-between; }
.ew-cust-h b{ font-family:var(--display); font-weight:500; font-size:14px; }
.ew-cust-panel{ display:grid; gap:4px; padding:9px 12px; border:1px solid var(--line);
  border-radius:9px; background:var(--panel2); font-size:12px; color:var(--ink); }
.ew-cust-panel i{ font-style:normal; font-family:var(--mono); font-size:9.5px; letter-spacing:.07em;
  text-transform:uppercase; color:var(--faint); display:inline-block; width:86px; }
.ew-docs{ margin:0; padding:0; list-style:none; display:grid; gap:5px; }
.ew-docs li{ display:flex; align-items:center; gap:9px; padding:7px 9px 7px 12px;
  background:var(--panel2); border:1px solid var(--line); border-radius:8px; font-size:12.5px; }
.ew-docs li span{ flex:1; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ew-docs li em{ font-style:normal; font-family:var(--mono); font-size:10.5px; color:var(--faint); }
.ew-ctx-toggle.on{ border-color:var(--accent) !important; color:var(--accent) !important; }
/* what to write from the board, chosen before anything is sent */
.ew-genres{ display:grid; gap:7px; }
.ew-genre{ display:grid; gap:2px; text-align:left; cursor:pointer; padding:10px 13px;
  background:var(--panel2); color:var(--ink); border:1px solid var(--line); border-radius:9px; }
.ew-genre:hover{ border-color:var(--accent); }
.ew-genre b{ font-family:var(--display); font-weight:500; font-size:13px; }
.ew-genre span{ font-family:var(--body); font-size:11.5px; line-height:1.45; color:var(--muted); }
.ew-modal-foot{ display:flex; align-items:center; gap:9px; padding:12px 17px;
  border-top:1px solid var(--line); }
.ew-modal-foot .ew-ihint{ flex:1; margin:0; }
.ew-btn.primary{ background:var(--accent); border-color:var(--accent); color:#0C1530; }
.ew-btn.primary:disabled{ opacity:.35; }
/* capacity + architecture review, docked to the left edge as a full-height
   flyout — the mirror of the chat on the right */
.ew-review{ width:330px; flex:none; min-height:0; display:flex; flex-direction:column;
  overflow:hidden; background:var(--panel2); border-right:1px solid var(--line);
  animation:ew-flyin-left .16s ease; }
@keyframes ew-flyin-left{ from{ transform:translateX(-14px); opacity:0; } }
.ew-review-h{ display:flex; align-items:center; gap:8px; padding:10px 8px 10px 13px;
  border-bottom:1px solid var(--line); flex:none; }
.ew-review-h b{ flex:1; font-family:var(--display); font-weight:500; font-size:13.5px; }
/* flex:1 + min-height:0 is what lets the body shrink below its content, which
   is what makes overflow:auto actually scroll inside the column flex panel */
.ew-review-body{ flex:1; min-height:0; padding:11px 13px 13px; overflow:auto;
  display:grid; gap:11px; align-content:start; }
.ew-review-stats{ display:grid; grid-template-columns:repeat(4, 1fr); gap:7px; }
.ew-review-stats span{ display:grid; gap:1px; font-size:9.5px; font-family:var(--mono);
  letter-spacing:.06em; text-transform:uppercase; color:var(--faint); }
.ew-review-stats i{ font-style:normal; font-family:var(--display); font-size:15px; color:var(--ink);
  letter-spacing:0; text-transform:none; }
.ew-review-tiers{ width:100%; border-collapse:collapse; font-size:11.5px; }
.ew-review-tiers td{ padding:3px 0; color:var(--muted); }
.ew-review-tiers td:first-child{ color:var(--ink); }
.ew-review-tiers td:last-child{ text-align:right; font-family:var(--mono); font-size:11px; }
.ew-review-checks{ display:grid; gap:7px; }
.ew-review-ok{ margin:0; font-size:12px; color:var(--accent); }
.ew-check{ display:grid; gap:2px; padding:8px 10px; border-radius:7px; background:var(--panel2);
  border-left:3px solid var(--faint); }
.ew-check.warn{ border-left-color:#E7664C; }
.ew-check.info{ border-left-color:#4C8DFF; }
.ew-check b{ font-family:var(--display); font-weight:500; font-size:12.5px; }
.ew-check span{ font-size:11px; color:var(--muted); line-height:1.45; }
/* the board comparison still floats over the canvas, pinned bottom-right */
.ew-diff{ position:absolute; right:14px; bottom:14px; z-index:20; width:330px;
  max-height:min(84%, 800px); background:var(--panel); border:1px solid var(--line);
  border-radius:11px; box-shadow:0 18px 40px rgba(0,0,0,.45); animation:none; }
.ew-diff .ew-review-tiers td:last-child{ color:var(--muted); }
.ew-diff .ew-review-tiers td.up{ color:var(--accent); }
.ew-diff .ew-review-tiers td.down{ color:#E7664C; }
.ew-diff-group{ display:grid; gap:3px; }
.ew-diff-h{ font-family:var(--mono); font-size:9.5px; letter-spacing:.06em; text-transform:uppercase;
  color:var(--faint); padding-bottom:2px; }
.ew-diff-h.added{ color:var(--accent); }
.ew-diff-h.changed{ color:#FEC514; }
.ew-diff-h.removed{ color:#E7664C; }
.ew-diff-row{ display:grid; gap:1px; padding:5px 9px; border-radius:6px; background:var(--panel2); }
.ew-diff-row b{ font-family:var(--display); font-weight:500; font-size:12px; }
.ew-diff-row span{ font-family:var(--mono); font-size:10.5px; color:var(--muted); }
/* diff tint on the canvas — an outline, so it reads over the category colour */
.ew-node.diff-added, .ew-ann.diff-added{ box-shadow:0 0 0 2px var(--accent); }
.ew-node.diff-changed, .ew-ann.diff-changed{ box-shadow:0 0 0 2px #FEC514; }
.ew-size-grid{ display:grid; grid-template-columns:repeat(4, 1fr); gap:9px; }
.ew-size-f{ display:grid; gap:4px; }
.ew-size-f > span{ display:flex; align-items:center; gap:5px; font-size:9.5px; font-family:var(--mono);
  letter-spacing:.06em; text-transform:uppercase; color:var(--faint); }
.ew-size-f input{ width:100%; }
.ew-size-t input{ width:auto; justify-self:start; margin:6px 0 0; accent-color:var(--teal, #00BFB3); }
.ew-hw{ display:grid; gap:5px; margin-top:2px; }
.ew-hw-row{ display:grid; grid-template-columns:1.3fr 1.2fr .6fr .7fr 1fr; gap:8px; align-items:center; }
.ew-hw-head span{ font-size:9.5px; font-family:var(--mono); letter-spacing:.06em;
  text-transform:uppercase; color:var(--faint); }
.ew-hw-name{ font-size:11.5px; }
.ew-hw-name em{ font-style:normal; color:var(--faint); font-family:var(--mono); font-size:10px; }
.ew-hw-row .ew-itext{ width:100%; }
.ew-linkbtn{ background:none; border:none; padding:0; cursor:pointer; color:var(--accent);
  font:inherit; text-decoration:underline; }
.ew-hint{ font-family:var(--mono); font-size:10.5px; color:var(--faint); margin-left:auto;
  min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
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
.ew-menu button.act{ color:var(--accent); }
.ew-menu-sep{ height:1px; background:var(--line); margin:4px 2px; }
.ew-menu-row{ display:flex; gap:2px; }
.ew-menu-row > button:first-child{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ew-menu-row .ew-menu-x{ width:auto; flex:none; padding:6px 7px; color:var(--faint); }
.ew-menu-row .ew-menu-x:hover{ color:var(--ink); }
.ew-menu-check{ display:flex; align-items:center; gap:7px; padding:6px 8px; cursor:pointer;
  font-family:var(--mono); font-size:12px; color:var(--muted); }
.ew-menu-check input{ accent-color:var(--accent); width:14px; height:14px; }
.ew-boardbtn{ max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ew-boardname{ background:var(--panel); color:var(--ink); border:1px solid var(--accent);
  border-radius:7px; padding:5px 10px; font-family:var(--mono); font-size:12px; width:190px; }
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
.ew-paltoggle{ flex:none; width:15px; padding:0; border:none; border-right:1px solid var(--line);
  background:var(--panel2); color:var(--muted); cursor:pointer; font-size:10px; line-height:1; }
.ew-paltoggle:hover{ color:var(--ink); background:var(--panel); }
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
.ew-wp-end{ fill:var(--bg); stroke:var(--accent); stroke-width:3; cursor:crosshair;
  filter:drop-shadow(0 1px 2.5px rgba(0,0,0,.5)); }
.ew-wp-end:hover{ fill:var(--accent); stroke:var(--bg); }
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
.ew-minimap{ position:absolute; left:14px; bottom:14px; z-index:25; display:block;
  background:color-mix(in srgb, var(--panel) 90%, transparent);
  border:1px solid var(--line); border-radius:9px; box-shadow:0 8px 22px rgba(0,0,0,.3);
  cursor:pointer; touch-action:none; }
.ew-minimap-node{ stroke:none; }
.ew-minimap-vp{ fill:var(--accent); fill-opacity:.07; stroke:var(--accent); stroke-width:1.5; }
.ew-guide{ position:absolute; pointer-events:none; z-index:30; }
.ew-guide.v{ width:0; border-left:1.5px dashed var(--accent); }
.ew-guide.h{ height:0; border-top:1.5px dashed var(--accent); }
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
/* annotations: sticky notes and plain text labels */
.ew-ann{ position:absolute; cursor:grab; user-select:none; overflow:hidden;
  transition:opacity .2s, box-shadow .15s; }
.ew-ann.dim{ opacity:.2; }
.ew-ann p{ margin:0; white-space:pre-wrap; overflow-wrap:anywhere; }
.ew-ann .ew-ann-empty{ opacity:.45; font-style:italic; }
.ew-ann textarea{ width:100%; height:100%; resize:none; background:transparent; color:inherit;
  border:0; outline:0; padding:0; font:inherit; }
.ew-ann-note{ background:color-mix(in srgb, var(--tag) 88%, #fff); color:#1C1E23;
  border-radius:3px; padding:11px 13px; font-size:13px; line-height:1.42;
  box-shadow:0 6px 16px rgba(0,0,0,.38); }
.ew-ann-note.sel{ box-shadow:0 0 0 2px var(--ink), 0 6px 16px rgba(0,0,0,.38); }
.ew-ann-text{ background:transparent; padding:2px 4px;
  font-family:var(--display); font-size:19px; line-height:1.25; display:flex; align-items:center; }
.ew-ann-text.sel{ box-shadow:0 0 0 1.5px var(--tag); border-radius:4px; }
.ew-fchips{ display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
.ew-fchips em{ font-style:normal; font-family:var(--mono); font-size:9.5px; color:var(--muted);
  border:1px solid var(--line); background:var(--panel2); border-radius:99px; padding:1px 7px;
  white-space:nowrap; }
.ew-port{ position:absolute; width:9px; height:9px; margin:-4.5px; border-radius:99px;
  background:var(--bg); border:2px solid var(--tag); cursor:crosshair; z-index:3; }
.ew-port:hover{ background:var(--tag); transform:scale(1.35); }
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
/* full-width variant for controls that can't sit in the label column */
.ew-fcol{ display:grid; gap:6px; }
.ew-flabel{ font-size:11.5px; color:var(--muted); }
.ew-frow input:not([type=checkbox]):not([type=color]):not([type=file]), .ew-frow select{
  background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:6px;
  padding:5px 8px; font-size:12.5px; font-family:var(--body); width:100%; box-sizing:border-box; min-width:0; }
.ew-frow input:focus, .ew-frow select:focus{ outline:none; border-color:var(--accent); }
.ew-frow input[type=number]{ font-family:var(--mono); font-size:12px; }
.ew-combo{ position:relative; min-width:0; }
.ew-srcrow{ display:grid; grid-template-columns:1fr 100px 80px 26px; gap:8px; align-items:center;
  margin-bottom:8px; }
.ew-srcrow .ew-combo input{ background:var(--panel); color:var(--ink); border:1px solid var(--line);
  border-radius:6px; padding:7px 9px; font-size:12.5px; font-family:var(--body); width:100%;
  box-sizing:border-box; }
.ew-srcrow .ew-combo input:focus{ outline:none; border-color:var(--accent); }
/* Fixed, and placed by SearchSelect against the input's own rect, so a dialog
   body that scrolls cannot clip it. */
.ew-combo-list{ position:fixed; z-index:70;
  overflow-y:auto; overscroll-behavior:contain;
  background:var(--panel); border:1px solid var(--line); border-radius:8px;
  box-shadow:0 8px 24px rgba(0,0,0,.4); }
.ew-combo-list button{ display:block; width:100%; text-align:left; padding:6px 10px;
  background:none; border:0; color:var(--ink); font-size:12px; font-family:var(--body);
  cursor:pointer; }
.ew-combo-list button:hover{ background:var(--panel2); }
.ew-frow input[type=checkbox]{ accent-color:var(--accent); width:15px; height:15px; justify-self:start; }
.ew-frow input[type=color]{ width:42px; height:26px; padding:1px; background:var(--panel);
  border:1px solid var(--line); border-radius:6px; cursor:pointer; }
.ew-itext{ background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:6px;
  padding:7px 9px; font-size:12.5px; font-family:var(--body); line-height:1.45; width:100%;
  box-sizing:border-box; resize:vertical; }
.ew-itext:focus{ outline:none; border-color:var(--accent); }
.ew-size{ display:flex; align-items:center; gap:6px; }
.ew-size input{ width:64px !important; }
.ew-size i{ color:var(--faint); font-style:normal; }
.ew-btnrow{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.ew-ihint{ margin:8px 0 4px; font-size:11px; line-height:1.45; color:var(--muted); }
.ew-btn{ background:var(--panel); color:var(--muted); border:1px solid var(--line); border-radius:6px;
  padding:5px 10px; font-family:var(--mono); font-size:11px; cursor:pointer; display:inline-block; }
.ew-btn:hover:not(:disabled){ border-color:var(--accent); color:var(--ink); }
.ew-btn.act{ border-color:var(--accent); color:var(--ink); }
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
/* Docked flyout on the right of the body row, full height under the toolbar —
   same shape as the inspector, so the log has room to be read. */
.ew-chat{ width:380px; flex:none; min-height:0; display:flex; flex-direction:column;
  overflow:hidden; background:var(--panel2); border-left:1px solid var(--line);
  animation:ew-flyin .16s ease; }
@keyframes ew-flyin{ from{ transform:translateX(14px); opacity:0; } }
.ew-chat-head{ display:flex; align-items:center; gap:8px; padding:11px 13px;
  border-bottom:1px solid var(--line); flex:none; }
.ew-chat-head b{ font-family:var(--display); font-size:14px; }
.ew-chat-head .ew-x{ margin-left:0; }
.ew-chat-gear{ margin-left:auto; background:none; border:none; color:var(--muted);
  font-size:15px; cursor:pointer; padding:2px 4px; }
.ew-chat-gear:hover{ color:var(--ink); }
/* A percentage max-height here resolved against a parent that only has its own
   max-height, so it never applied and an expanded panel ran off the bottom of
   a clipped chat with nothing to scroll. Bounded in absolute units instead,
   and allowed to shrink, so it always scrolls its own overflow. */
.ew-chat-settings{ display:grid; gap:6px; padding:11px 13px; border-bottom:1px solid var(--line);
  background:var(--panel); flex:0 1 auto; min-height:0;
  max-height:min(58vh, 420px); overflow-y:auto; scrollbar-width:thin;
  scrollbar-color:var(--line) transparent; }
.ew-chat-settings::-webkit-scrollbar{ width:10px; }
.ew-chat-settings::-webkit-scrollbar-thumb{ background:var(--line); border-radius:99px;
  border:2px solid transparent; background-clip:padding-box; }
.ew-sect{ border:1px solid var(--line); border-radius:9px; background:var(--panel2); }
.ew-sect-h{ width:100%; display:flex; align-items:center; gap:7px; padding:8px 10px;
  background:none; border:none; color:var(--ink); font:inherit; text-align:left; cursor:pointer; }
.ew-sect-h:hover{ color:var(--accent); }
.ew-sect-caret{ width:9px; font-size:9px; color:var(--muted); }
.ew-sect-h b{ font-family:var(--display); font-size:12px; font-weight:500; }
.ew-sect-h em{ margin-left:auto; font-style:normal; font-size:10.5px; color:var(--faint); }
.ew-sect-h em.ok{ color:var(--accent); }
.ew-sect-body{ display:grid; gap:6px; padding:9px 10px 10px; border-top:1px solid var(--line); }
.ew-chat-settings input{ background:var(--panel2); color:var(--ink); border:1px solid var(--line);
  border-radius:6px; padding:6px 9px; font-family:var(--mono); font-size:12px; }
.ew-chat-settings input:focus{ outline:none; border-color:var(--accent); }
.ew-awsload{ display:flex; align-items:center; gap:6px; margin-bottom:2px; }
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
/* the Markdown an AI reply arrives in (see whiteboard/ChatMarkdown.jsx) */
.ew-md{ display:grid; gap:7px; }
.ew-md p{ margin:0; }
.ew-md-h{ font-family:var(--display); font-weight:500; }
.ew-md ul, .ew-md ol{ margin:0; padding-left:17px; display:grid; gap:3px; }
.ew-md li::marker{ color:var(--faint); }
.ew-md strong{ font-weight:600; }
.ew-md code{ font-family:var(--mono); font-size:11px; padding:1px 4px; border-radius:4px;
  background:color-mix(in srgb, var(--ink) 9%, transparent); }
.ew-md pre{ margin:0; padding:7px 9px; border-radius:8px; overflow-x:auto;
  background:color-mix(in srgb, var(--ink) 7%, transparent); }
.ew-md pre code{ padding:0; background:none; font-size:10.5px; }
.ew-md table{ border-collapse:collapse; font-size:12px; width:100%; }
.ew-md th, .ew-md td{ border:1px solid var(--line); padding:4px 8px; text-align:left; vertical-align:top; }
.ew-md th{ font-family:var(--display); font-weight:500; background:color-mix(in srgb, var(--ink) 5%, transparent); }
/* the AI connection check, and the settings a blocked preflight needs */
.ew-preflight{ display:grid; gap:5px; margin-top:9px; }
.ew-pf{ display:grid; grid-template-columns:auto 1fr; gap:3px 8px; padding:7px 9px;
  border-radius:8px; border:1px solid var(--line); background:var(--panel);
  font-size:11.5px; line-height:1.45; }
.ew-pf b{ font-family:var(--display); font-weight:500; }
.ew-pf b::before{ content:"● "; }
.ew-pf.ok b::before{ color:#00BFB3; }
.ew-pf.bad b::before{ color:#F04E98; }
.ew-pf span{ color:var(--muted); word-break:break-word; }
.ew-pf pre, .ew-cors{ grid-column:1 / -1; margin:5px 0 0; padding:8px 10px; border-radius:7px;
  overflow-x:auto; white-space:pre; font-family:var(--mono); font-size:10px; line-height:1.6;
  color:var(--ink); background:color-mix(in srgb, var(--ink) 8%, transparent); }
/* what ran to produce the answer, above the answer itself */
.ew-trail{ margin:0 0 7px; padding-bottom:6px; border-bottom:1px solid var(--line);
  display:flex; flex-wrap:wrap; gap:5px 7px; font-family:var(--mono); font-size:10px;
  text-transform:uppercase; letter-spacing:.05em; color:var(--faint); }
.ew-trail em{ font-style:normal; display:flex; align-items:center; gap:4px; }
.ew-trail em::before{ content:""; width:4px; height:4px; border-radius:50%; background:var(--accent); }
.ew-trail em.bad::before{ background:#F04E98; }
/* the turn in progress: the same dots as the trail, arriving one at a time */
.ew-live{ display:flex; flex-direction:column; gap:5px; font-family:var(--mono);
  font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--faint); }
.ew-live em{ font-style:normal; display:flex; align-items:center; gap:4px; }
.ew-live em::before{ content:""; width:4px; height:4px; border-radius:50%; background:var(--accent); flex:none; }
.ew-live em.bad::before{ background:#F04E98; }
/* what a grounded answer rests on, under the reply that used it */
.ew-cite{ margin:7px 0 0; padding-top:6px; border-top:1px solid var(--line);
  display:flex; flex-wrap:wrap; gap:5px; align-items:baseline;
  font-size:10.5px; color:var(--faint); }
.ew-cite span{ font-family:var(--mono); text-transform:uppercase; letter-spacing:.05em; }
.ew-cite em{ font-style:normal; padding:1px 6px; border-radius:99px;
  border:1px solid var(--line); background:color-mix(in srgb, var(--ink) 5%, transparent); }
.ew-thinking{ opacity:.7; animation:ew-pulse 1.1s ease-in-out infinite; }
@keyframes ew-pulse{ 50%{ opacity:.35; } }
.ew-chat-empty{ margin:auto; text-align:center; color:var(--faint); font-size:12px;
  display:flex; flex-direction:column; gap:12px; padding:14px; }
.ew-chat-chips{ display:flex; flex-direction:column; gap:6px; }
.ew-chat-chips button{ background:var(--panel); color:var(--muted); border:1px solid var(--line);
  border-radius:8px; padding:7px 10px; font-family:var(--body); font-size:12px; cursor:pointer; text-align:left; }
.ew-chat-chips button:hover{ border-color:var(--accent); color:var(--ink); }
/* a staged board change, waiting on Apply */
.ew-apply{ flex:none; display:grid; gap:7px; padding:10px 13px; border-top:1px solid var(--line);
  background:var(--panel); }
.ew-apply b{ font-family:var(--display); font-weight:500; font-size:12.5px; line-height:1.45; }
.ew-apply ul{ margin:0; padding:0; list-style:none; display:grid; gap:2px; }
.ew-apply li{ font-family:var(--mono); font-size:10.5px; color:var(--muted); }
.ew-chat-usage{ flex:none; margin:0; padding:6px 13px 0; font-family:var(--mono); font-size:10px;
  color:var(--faint); }
.ew-chat-form{ display:flex; gap:7px; padding:10px; border-top:1px solid var(--line); flex:none; }
.ew-chat-input{ flex:1; resize:none; background:var(--panel); color:var(--ink);
  border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-family:var(--body);
  font-size:12.5px; line-height:1.4; }
.ew-chat-input:focus{ outline:none; border-color:var(--accent); }
.ew-chat-send{ align-self:stretch; padding:0 14px; background:var(--accent); color:#06121f;
  border:none; border-radius:8px; font-family:var(--mono); font-size:12px; font-weight:700; cursor:pointer; }
.ew-chat-send:disabled{ opacity:.4; cursor:default; }

@media (prefers-reduced-motion: reduce){ .ew-particle{ display:none; } .ew-thinking, .ew-chat, .ew-review{ animation:none; } }

/* ---- light theme overrides (follows the app's light/dark toggle) ---- */
.ew-light{
  --bg:#F5F7FA; --panel:#FFFFFF; --panel2:#EEF2F7; --line:#D6DEEA;
  --ink:#1C1E23; --muted:#5B6472; --faint:#98A4B8; --accent:#0B64DD;
}
.ew-light .ew-viewport{ background-image:radial-gradient(circle, #d3dcea 1px, transparent 1px); }
.ew-light .ew-node{ box-shadow:0 1px 3px rgba(16,28,63,.10), 0 1px 2px rgba(16,28,63,.06); }
.ew-light .ew-ghost{ box-shadow:0 10px 26px rgba(16,28,63,.18); }
.ew-light .ew-msg.user{ color:#fff; }
.ew-light .ew-chat-send{ color:#fff; }
`;
