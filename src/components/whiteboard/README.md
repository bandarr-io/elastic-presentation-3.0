# Elastic Whiteboard

An interactive, drag-and-drop architecture canvas built into the presentation as the
**Architecture Whiteboard** scene (`/#/whiteboard`). It lets you sketch, present, and
export Elastic deployment architectures live in front of a customer — no Lucidchart
tab-switching, no static screenshots that are out of date by the next meeting.

Everything is plain React + SVG. No canvas libraries, no external dependencies.

---

## Why it exists

- **Whiteboard live, stay on brand.** Mid-conversation you can drag out a cluster,
  wire up data sources, and adjust tiers while the customer watches — all themed to
  the Elastic palette and consistent with the rest of the deck.
- **Typed components, not boxes.** Every node is a real Elastic concept (Hot Tier,
  Kibana, Elastic Agent, Logstash, …) with category colors, per-node specs
  (node count / vCPU / RAM), and a live **Σ totals** readout in the toolbar —
  useful for quick sizing conversations.
- **Reusable presets and per-customer boards.** Ship built-in reference
  architectures, keep a named board per account, and round-trip boards as JSON.
- **Start from their reality.** Paste `_cat/nodes` or `_nodes` output from the
  customer's cluster and the board draws their actual topology, node counts and
  hardware included — then compare it against the target design to get the
  migration delta.
- **Answer the sizing question.** Give it ingest per day and retention per tier
  and it derives node counts from Elastic's tier ratios, draws them, and hands
  the result to the Pricing / ROM builder as quote lines.
- **Present it, don't just draw it.** Tag components with build steps and reveal
  the architecture piece by piece, driven from the presenter view; trace the
  data path hop by hop; annotate over the top with a pen while you talk.
- **Takeaways.** Export the finished diagram as SVG or PNG (with a title block
  and legend), copy it to the clipboard, send a share link, or have the board
  written up as the follow-up note.

---

## Feature tour

### Canvas
- Drag empty space to pan, scroll wheel to zoom, **Fit** to frame everything.
- Shift-drag draws a marquee: it selects nodes it touches and any zones it fully
  encloses (mixed selections can be deleted in one go).
- Undo / redo with full history (`⌘Z` / `⌘⇧Z`).

### Palette & patterns
- The left palette lists every component type, filterable via the search box.
  Drag one onto the canvas to place it.
- **Patterns** are configurable building blocks (`+ Data Sources`,
  `+ Ingestion Tools`, `+ Elastic Cluster`, `+ User Space`,
  `+ Management Components`, `+ Zone`). Each opens a small config form first —
  e.g. the Elastic Cluster defaults to Hot/Cold/Frozen tiers with object storage
  and no auxiliary nodes; selecting the Frozen tier auto-selects object storage.
- Inserted blocks land at the bottom-left of the existing diagram and the view
  re-fits so they are always visible.

### Nodes
- Drag to move (multi-selections move together), corner grip to resize,
  double-click to rename, `⌘D` to duplicate, arrow keys to nudge by one grid
  step (hold Shift for 1px).
- `⌘C` / `⌘X` / `⌘V` copy, cut, and paste a whole selection — nodes, zones, and
  the connections between them — through the system clipboard, so a subsystem
  can be lifted into another board or another browser tab.
- Inspector: rename, subtitle, accent color, size, per-node specs.
- Copy / paste visual style across nodes (`⌘⇧C` / `⌘⇧V`).
- Align and distribute controls for multi-selections.

### Connections
- Hover a node and drag one of its rings onto another node (or a zone) to connect.
- Click a line to open its inspector:
  - **Label** — text drawn at the midpoint.
  - **Direction** — one-way or bidirectional arrows; reverse with one click.
  - **Color** — explicit color or *Auto* (inherits the source node's category accent).
  - **Line** — Solid, Dashed, Dotted, Long dash, or Dash-dot. By default,
    connections touching ops-type components render dashed; picking a style
    overrides that per connection.
  - **Width** — Thin, Normal, or Thick.
  - **Shape** — drag the hollow dots on a selected line to add bends; drag solid
    dots to move them, double-click to remove, or *Reset shape*.
- An animated particle flows along each connection to suggest data movement.

### Annotations
- The **Annotation** palette category adds two non-architecture primitives:
  a **Sticky note** (colored paper, multi-line, for questions and decisions
  captured mid-conversation) and a **Text** label (plain heading text).
- Double-click to edit; `⌘Enter` or `Esc` commits, Enter adds a line.
- Both can be connected to components like any other element, and both render
  in SVG/PNG exports. They're excluded from the AI component catalog, the
  capacity totals, and architecture validation.

### Zones
- Labeled, colored containers for grouping (e.g. a data center, a VPC, a site).
- Dragging a zone moves its contents with it; **Alt-drag** moves the frame alone.
- Zones can be connection endpoints, resized, recolored, aligned, and distributed.

### Boards
- The toolbar button next to the title names the current board. Its menu
  switches between boards and offers **New blank board**, **Duplicate**,
  **Rename**, and **Delete**.
- Each board autosaves independently, so you can keep one per customer. Undo
  history is per board and resets on switch, so undo can never reach back into
  a different diagram.
- The board name drives the export filename and the title block on exports.

### Tidy
- **Tidy** lays every component out in left-to-right data-flow lanes
  (collect → process → store → serve → ops), stacking each lane and centring
  them against the tallest. Existing top-to-bottom order within a lane is kept,
  so tidying feels like straightening rather than reshuffling. Annotations stay
  where you put them; zones are left alone.

### Capacity & review (the `Σ` button)
- **Capacity rollup** — total nodes, vCPU, RAM, and storage, plus a per-tier
  breakdown. Capacity is read per node (`2 TB`, `40tb`, `1.5PB`, or a bare
  number meaning TB) and multiplied by the tier's node count.
- **Architecture review** — advisory best-practice checks, never blocking:
  master quorum below three or an even count, a frozen tier with no object
  storage, warm/cold tiers with no hot tier, a replication flow with no remote
  cluster, a single data node, no monitoring cluster, and unconnected
  components. The button shows a count of hard warnings.
- **Copy quote lines** emits one 64 GB resource-unit line item per tier, plus
  one for the master/ML/coordinating nodes, tab-delimited in the column order
  the Pricing / ROM builder's paste importer reads (SKU, description, quantity,
  unit price, discount). Unit price is left blank for you to fill in. Set
  **Memory** on the nodes — resource units are priced per 64 GB of RAM.
- **Copy summary** is the same numbers as one line of prose, for notes.
- **✦ Write it up** drafts the follow-up note (below).

### Size a cluster
- **Size…** in the toolbar asks the question that comes before drawing: given
  this much ingest, how big does the cluster need to be?
- Enter raw ingest in GB/day, replica count, index overhead (index size against
  raw — roughly 1:1 for logs with default mappings, less with synthetic
  `_source`), RAM per node, and the days held in each tier.
- Node counts come from Elastic's published disk-to-RAM tier ratios — 1:30 hot,
  1:160 warm and cold, 1:1000 frozen — so a 64 GB hot node carries about 1.9 TB
  and a frozen node addresses about 62 TB of object storage. Cold and frozen
  mount searchable snapshots, so replicas don't multiply their storage, and a
  replicated tier always gets at least two nodes.
- **Draw it** adds the tiers to the current board as a stack wired with ILM,
  inside a zone labelled with the inputs. The numbers land on the nodes, so the
  capacity rollup and the quote lines pick them up immediately.

### Compare boards
- The board menu's **Compare this board with** holds the current board against
  another one — the current-state sketch, or a cluster imported from the
  customer's diagnostics.
- Components are matched across boards by type and name, since ids only mean
  something within a single board. Repeated components pair up one for one, so
  only the surplus counts as added or dropped.
- The panel lists what the board **adds**, **drops**, and **resizes** (with the
  properties that moved), and how the node, vCPU, RAM, and storage rollups
  shift. Added and resized components are outlined on the canvas — dropped ones
  aren't on this board, so nothing is highlighted for them.

### Write it up
- **✦ Write it up** in the capacity panel drafts the note that follows the
  session, from the diagram, the capacity rollup, and the review findings.
- The model is told to describe what it's given and to flag gaps rather than
  fill them, so it won't invent components or numbers. The draft opens in an
  editable box — check it before you send it.
- Uses the same provider configuration as the AI chat.

### Presenting
- **Present** hides the palette, inspector, and editing chrome, leaving the
  diagram, the step controls, and the pen. `Esc` returns to editing.
- **Spotlight** — click a component while presenting to pin a highlight on it
  and its immediate connections, dimming everything else. Click empty space (or
  **Unfocus**) to clear it.
- **Build steps** — tag any node or zone with a step in its inspector. Step 0
  ("Base") is on screen from the start; higher steps appear as you advance.
  Connections appear once both of their endpoints have been revealed. While
  editing, not-yet-revealed elements are ghosted rather than hidden so they stay
  workable.
- Steps are published through `useSceneMotion`, so the **presenter view** drives
  them like any other multi-step scene: the beat pills, Next step button, and
  per-beat speaker notes all work, and the live preview mirrors the reveal.
  Arrow keys and space step the board directly while presenting.
- **Flow** walks data through the architecture one leg at a time, grouping the
  connections into hops from the sources outward and lighting one hop while
  dimming the rest — for narrating the path rather than pointing at it. It
  advances on its own, or a hop per press if the viewer prefers reduced motion.
  Spotlighting a component stops the trace, and vice versa.

### Annotation layer
- **Pen** draws freehand; **Arrow** drags a straight arrow with a head. Pick one
  of four ink colours. `Esc` puts the pointer back into select mode.
- Strokes live in the document: they undo, autosave, export, and are tagged with
  the build step they were drawn on, so ink added on step 2 reappears from step
  2 onward. **Clear ink** removes them all.

### Import a real cluster
- **File → Import a real cluster…** accepts a paste of `GET _cat/nodes?v`
  (header row required), `GET _nodes` / `_nodes/stats`, or `GET _cluster/stats`.
- Nodes are grouped into one box per data tier and per dedicated role, carrying
  node counts and averaged hardware, wired with an ILM flow, and wrapped in a
  zone named after the cluster. A node that is both hot and master-eligible is
  counted once, as a data node.
- The result lands in a new board — your current sketch is never overwritten.
  Nothing is sent anywhere; parsing is entirely local.

### Architectures menu
- Load the built-in presets: **Reference**, **Air-gapped**, **Multi-tenant**.
- Save the current board over any preset slot (stored in `localStorage`;
  a `•` marks slots with a custom version) and reset back to the built-in.
- *Copy board as SEEDS code* serializes the current board as source code, so a
  good board can be promoted to a built-in default in `whiteboardTypes.js`.

### AI assistant (`✦ AI`)
- A chat panel that builds or edits the board from natural language
  ("add a second site with CCR", "draw our reference architecture for logging").
- Works against the Anthropic API directly (bring your own key) or through a
  proxy URL + token. Credentials are stored in this browser's `localStorage`
  only — don't use on a shared machine.

### File menu
- **Export** JSON (round-trips), SVG, PNG, or PNG at 4x. Exports match the
  canvas exactly, including per-connection colors, line styles, widths,
  annotations, and ink. The **Title & legend** toggle adds a header with the
  board name and date plus a colour legend of the categories in use.
- **Share** — *Copy image to clipboard* pastes the diagram straight into Slack
  or a deck; *Copy share link* packs the whole document into a compressed URL
  that opens as a new board on the other end (no server involved).
- **Import** a previously exported JSON board, or a real cluster (above).

---

## Interactions cheat sheet

| Action | How |
|---|---|
| Pan / zoom | drag empty space / scroll wheel, `−` `+` `Fit` |
| Add component | drag from palette |
| Add pattern block | palette **Patterns** button → configure → insert |
| Select | click · shift-click multi · shift-drag marquee |
| Move / resize | drag node · corner grip |
| Rename | double-click node |
| Connect | drag a hover ring onto another node or zone |
| Bend a connection | select it, drag the hollow midpoints |
| Move zone (with contents / alone) | drag pill / Alt-drag |
| Duplicate | `⌘/Ctrl+D` |
| Copy / cut / paste selection | `⌘/Ctrl+C` · `⌘/Ctrl+X` · `⌘/Ctrl+V` |
| Nudge selection | arrow keys (Shift for 1px) |
| Delete | `Del` / `Backspace` (works on mixed node + zone selections) |
| Undo / redo | `⌘/Ctrl+Z` / `⌘/Ctrl+Shift+Z` |
| Copy / paste node style | `⌘/Ctrl+Shift+C` / `⌘/Ctrl+Shift+V` |
| Edit a note | double-click · `⌘Enter` or `Esc` to commit |
| Present / exit | **Present** button / `Esc` |
| Step the reveal (presenting) | arrow keys or space |
| Spotlight (presenting) | click a component; click empty space to clear |
| Trace the data path (presenting) | **Flow** |
| Size a cluster from ingest | **Size…** |
| Compare with another board | board menu → **Compare this board with** |
| Deselect / cancel | `Esc` |

---

## Code map

| File | Role |
|---|---|
| `src/scenes/WhiteboardScene.jsx` | Full-bleed scene wrapper |
| `src/components/ElasticWhiteboard.jsx` | The whiteboard itself: toolbar, palette, canvas, inspectors, exports, AI chat |
| `src/components/whiteboard/useDragController.js` | All pointer gestures: pan, marquee, move, resize, connect, zone move/resize, palette drag |
| `src/components/whiteboard/useHistory.js` | Undo/redo snapshots |
| `src/data/whiteboardTypes.js` | Node type catalog, categories, palettes, built-in SEED architectures |
| `src/data/whiteboardTemplates.js` | Pattern blocks and their config forms |
| `src/utils/whiteboardGeometry.js` | Snapping, elbow routing, path helpers |
| `src/utils/whiteboardAI.js` | AI chat and the written summary: catalog, tool schema, prompts, LLM calls |
| `src/utils/whiteboardAnalysis.js` | Tidy layout, flow hops, architecture validation, capacity rollup |
| `src/utils/whiteboardSizing.js` | Ingest → node counts, and board → Pricing/ROM quote lines |
| `src/utils/whiteboardDiff.js` | Comparing two boards |
| `src/utils/whiteboardImport.js` | Parsing `_cat/nodes` / `_nodes` / `_cluster/stats` into a board |
| `src/utils/whiteboardShare.js` | Packing a board into a share URL and back |
| `src/utils/whiteboardPresenting.js` | Ink paths, build-step visibility, export text wrapping |

Tests live beside their modules (`*.test.js`), plus
`src/components/whiteboard/ElasticWhiteboard.smoke.test.jsx`, which mounts the
whole component in jsdom and exercises boards, presenting, ink, build steps,
sizing, comparison, the written summary, and cluster import.

## The document

A board is `{ nodes, edges, zones, ink, view, sections }`:

| Field | Shape |
|---|---|
| `nodes` | `{ id, type, x, y, title?, sub?, color?, w?, h?, logo?, props?, step? }` |
| `edges` | `{ id, s, e, lbl?, bi?, color?, style?, width?, pts?, step? }` — `s`/`e` may be zone ids |
| `zones` | `{ id, x, y, w, h, label, color, step? }` |
| `ink` | `{ id, kind: "pen"\|"arrow", color, width, step, pts: [{x,y}] }` |
| `sections` | AI bookkeeping: `sectionId → { template, fill, keys, zoneId }` |

`step` is the build step an element is revealed on; absent or `0` means base
content, visible from the start.

## Persistence

| `localStorage` key | What it stores |
|---|---|
| `ew-boards` | Board index: `{ boards: [{ id, name }], activeId }` |
| `ew-board-<id>` | One named board (debounced autosave; survives page refresh) |
| `ew-board` | Legacy single-board autosave, migrated into `ew-boards` on first load |
| `ew-seed-*` | Custom saves of the architecture presets |
| `ew-llm-provider`, `ew-anthropic-key`, `ew-anthropic-model` | AI chat provider config |
| `ew-proxy-url`, `ew-proxy-token` | AI chat proxy config |

Every board autosaves continuously, so a refresh picks up where you left off.
Use **File → Export JSON**, a share link, or a preset slot to keep boards
long-term or hand them to someone else.

When the whiteboard renders inside the presenter view's live preview it detects
follow mode and never writes to storage, so the mirror can't overwrite the tab
you're actually presenting from.
