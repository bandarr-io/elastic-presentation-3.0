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
- **Reusable presets.** Ship built-in reference architectures, save your own
  variants, and round-trip boards as JSON.
- **Takeaways.** Export the finished diagram as SVG or PNG and send it to the
  customer after the call.

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
- **Export** JSON (round-trips), SVG, or PNG. Exports match the canvas exactly,
  including per-connection colors, line styles, and widths.
- **Import** a previously exported JSON board.

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
| `src/utils/whiteboardAI.js` | AI chat: catalog, tool schema, prompt, LLM call |

## Persistence

| `localStorage` key | What it stores |
|---|---|
| `ew-board` | Autosave of the current board (debounced; survives page refresh) |
| `ew-seed-*` | Custom saves of the architecture presets |
| `ew-llm-provider`, `ew-anthropic-key`, `ew-anthropic-model` | AI chat provider config |
| `ew-proxy-url`, `ew-proxy-token` | AI chat proxy config |

The current board autosaves continuously, so a refresh picks up where you left
off. Use **File → Export JSON** or a preset slot to keep boards long-term or
share them.
