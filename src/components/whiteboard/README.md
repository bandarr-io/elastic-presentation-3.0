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
  useful for quick sizing conversations. Data Source nodes go further: pick
  the actual integration from the Elastic Agent catalog (scraped from the
  package registry) and record its raw ingest in GB/day, and the sizing
  calculator can sum those volumes instead of taking one hand-entered total.
  Boxes size themselves to their content — fixed width per type, height that
  fits whatever the node is showing.
- **Reusable presets and per-customer boards.** Ship built-in reference
  architectures, keep a named board per account, and round-trip boards as JSON.
- **Start from their reality.** Paste `_cat/nodes` or `_nodes` output from the
  customer's cluster and the board draws their actual topology, node counts and
  hardware included — then compare it against the target design to get the
  migration delta.
- **Answer the sizing question.** Give it ingest per day, retention per tier,
  agent and user counts, and it derives the whole deployment — tiers, dedicated
  masters, optional ML nodes, Logstash, Kibana, object storage — from Elastic's sizing rules,
  draws it, and hands the result to the Pricing / ROM builder as quote lines.
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
- A block owns its internal routing. In the Elastic Cluster the master's
  connections to the data tiers run up one lane in the gutter between the two
  columns rather than cutting across the diagram; those waypoints are worked
  out after the boxes have grown to fit their content, so they stay on the
  nodes however tall a fully specified node ends up.
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
- Dragging a zone moves its contents with it (manual edge bends move too); **Alt-drag** moves the frame alone.
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
  components (anything inside a zone that has a flow counts as connected).
  The button shows a count of hard warnings.
- **Copy quote lines** emits one 64 GB resource-unit line item per tier, plus
  one for the master/ML/coordinating nodes, tab-delimited in the column order
  the Pricing / ROM builder's paste importer reads (SKU, description, quantity,
  unit price, discount, and a 6th **bold label** column so a pasted row matches
  the builder's own rows). Unit price is left blank for you to fill in — the
  builder shows those rows as neutral "awaiting price" to-dos, not errors. Set
  **Memory** on the nodes — resource units are priced per 64 GB of RAM.
- **Send to Pricing** skips the clipboard entirely: it pushes the same line
  items straight into the Pricing / ROM builder as a new, clearly-labelled
  scenario (so nothing already in the builder is overwritten), carrying the
  per-tier RAM, node count, and storage the flat text paste would drop. It
  reuses the deck's existing config sync, so the change reaches the live slide
  and any presenter tab.
- **Copy summary** is the same numbers as one line of prose, for notes.
- **✦ Write it up** drafts the follow-up note (below).

### Draw a cluster
- **Size…** in the toolbar opens the *Draw a Cluster* dialog — the question
  that comes before drawing: given this much ingest, how big does the cluster
  need to be?
- Pick a **provider** — Elastic Cloud on AWS, GCP, or Azure, or self-managed
  EC2 — then enter raw ingest in GB/day, replica count, index overhead (index
  size against raw — roughly 1:1 for logs with default mappings, less with
  synthetic `_source`), and the days held in each tier.
- Ingest can come from the board instead of the keyboard: give the **Data
  Source** nodes on the board an integration (picked from the Elastic Agent
  integrations catalog) and a **raw ingest GB/day** each, and the dialog's
  **Sum board sources** toggle totals them for you. Drawing from summed
  sources skips the generic data-sources zone and wires those very nodes into
  the new ingestion zone, so the sized architecture stays connected to the
  per-source volumes that justified it.
- The dialog's **Data sources → + Add…** button builds that list without
  leaving the modal: add a row per source (integration picker + optional
  GB/day + optional retention in days), and **Add to board** stacks one Data
  Source node per row down the left edge of the diagram and switches the
  ingest input to summing them.
- A per-source **retention** caps how far that source's data ages through the
  tiers: with 1 day hot and 10 cold, a 5-day source spends its hot day, four
  cold days, and never reaches frozen — so short-lived sources stop inflating
  the frozen tier and the object store. Sources without a retention age
  through the full tier policy.
- The drawn cluster's zone label names where it runs and what it holds:
  provider, region and hot profile (on Elastic Cloud), ingest rate, and total
  retention. The Users node also carries the concurrent-user count.
- On an Elastic Cloud provider a **hot profile** picker mirrors ECH's
  deployment templates — Storage Optimized (the default), Storage Optimized
  (Dense), General Purpose, CPU Optimized, Vector Search Optimized, as each
  cloud offers them — and swaps the hot tier's hardware and ratios
  accordingly. Profiles are a hot-tier choice; warm, cold, frozen, masters,
  and Kibana have single current configs per provider (per region, on AWS).
- A **region** picker (all 22 AWS, 20 GCP, and 16 Azure ECH regions, or "Any
  region") narrows hardware to what that region actually offers. This mostly
  gates the newest hot-tier hardware — AWS `i8g`/`c8gd`/`m6gd`/`r6gd` and
  GCP's ARM `c4a` exist only in a subset of regions (the dense `i3en` and N2
  configs are everywhere), and Azure lacks `Lsv3` in two regions — plus the
  master/Kibana c-family generation on AWS, which walks c8gd → c6gd → c5d
  (c7gd in GovCloud) until one exists in the region. Profiles a region
  doesn't offer disappear from the picker, and the RAM ladders themselves
  are identical across regions.
- **On an Elastic Cloud provider** the maths follows the instance
  configurations ECH actually offers (`src/data/echInstanceConfigs.js`,
  extracted from the Elastic docs): each tier uses its config's documented
  disk:RAM ratio (AWS hot `i8g` at 27:1, warm/cold `i3en` at 74:1, GCP warm
  190:1, Azure warm 200:1, and so on), node RAM snaps up the config's
  published size ladder (1–60/64 GB), and past the top rung the tier scales
  out with more nodes. Frozen still counts against the object storage it
  addresses (1:1000); its ECH ratio only sizes the local cache disk.
- **Self-managed** keeps Elastic's tier-guidance ratios — 1:30 hot, 1:160 warm
  and cold, 1:1000 frozen — with a free-form RAM-per-node input, so a 64 GB
  hot node carries about 1.9 TB and a frozen node addresses about 62 TB.
- Either way, cold and frozen mount searchable snapshots, so replicas don't
  multiply their storage, and a replicated tier always gets at least two
  nodes.
- It sizes the stack around the cluster too: **Agents** (how many hosts ship
  data) and **Kibana users** (concurrent) are inputs; **Logstash** is derived
  from ingest at ~1 TB/day per node with an HA pair minimum, Kibana gets one
  instance per ~100 users (two minimum), and **Dedicated masters** adds the
  three-node quorum at 8 GB each — automatically, once the data tiers reach
  six nodes; smaller clusters let the data nodes carry the master role.
  **Machine learning** is off by default; switched on it adds dedicated ML
  nodes for inference and anomaly detection, floored at 16 GB per node (Elastic's
  NLP minimum) with an HA pair minimum and grown from ingest at ~1 TB/day per
  16 GB node. ML nodes hold no shards, so they never count toward the six-node
  master threshold or the data/storage rollups. Zero a field or untick a toggle
  to leave that piece off the drawing.
- A **hardware table** recommends an instance per component. On an Elastic
  Cloud provider it names the documented ECH instance configuration
  (`aws.es.datahot.i8g`, `gcp.es.datawarm.n2.68x10x190`, `azure.es.master.fsv2`,
  …) with vCPU and disk derived from that config's published ratios; Logstash
  isn't an ECH product, so it gets a plain compute box from the matching cloud
  (`c6i`, `n2-standard`, `Fsv2`). ML has a single optimized ECH config per
  provider (no profile picker) — `aws.es.ml.c5d` commercial and `aws.es.ml.m5dn`
  in GovCloud, `gcp.es.ml.n2.68x32x45`, `azure.es.ml.fsv2`. Self-managed picks
  best-practice raw EC2: local-NVMe `i3en` for hot indexing and the frozen
  cache, dense-disk `d3en` for warm and cold, `m6g` masters, CPU-bound `c6i`
  Logstash, `m6i` Kibana, and general-purpose `m6i` ML.
  Every cell (instance, vCPU, RAM, disk) is editable: RAM edits re-derive that
  component's node count (snapping to the ECH ladder where one applies), the
  other cells are plain overrides, and one click resets back to the
  recommendation. Switching provider resets the table.
- **Draw it** adds the whole architecture to the current board, built from the
  same deterministic templates as the Patterns menu: data sources feeding an
  Ingestion zone that holds Elastic Agent (and Logstash when enabled) and
  flows straight into the hot tier, the tiered cluster with its masters and
  the object store the frozen tier snapshots into, Kibana with its users on
  the serving side, and a separate monitoring cluster (on by default, with
  its own toggle) that hangs off the cluster zone itself — stack monitoring
  watches the whole deployment, not one tier — and sits tucked directly below
  the User Space, left-aligned with it. The cluster is the Patterns
  **Elastic Cluster** block with only what sizing decides overridden — the
  tier set, dedicated masters, ML nodes, object storage — so a sized cluster and an
  inserted one are laid out identically apart from the extra height their
  content needs. Every fillable node field arrives configured — counts,
  capacity, instance type, vCPU, RAM, disk — so the capacity rollup and the
  quote lines pick them up immediately and the inspector shows a fully
  specified node. Nodes size themselves to that content: width stays fixed
  per type, height grows to fit the title and chips being shown, and the
  template stacks and zone boxes re-open around the taller nodes.

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
- **File → Import a real cluster…** accepts, in rough order of fidelity:
  - `GET _nodes` / `_nodes/stats` — the richest paste: it carries CPU core
    counts and the Elasticsearch version.
  - `GET _cat/nodes?v&h=name,node.role,ram.max,disk.total` — the quick one. The
    explicit `&h=` column list matters: the bare `?v` default set has no
    `ram.max`/`disk.total`, so those nodes still import but with no hardware
    (nothing is fabricated). The `cpu` column is instantaneous *utilisation
    percent*, not a core count, so it is deliberately not read as vCPU.
    `?format=json` (a JSON array) works too.
  - `GET _cluster/stats` — aggregate only, and therefore **approximate**: its
    role/tier buckets overlap (a hot node that is master-eligible is counted in
    `data_hot`, `data`, and `master`), so the node breakdown is reconstructed
    to reconcile with `count.total` rather than summed.
- The paste is de-noised first, so it's fine to leave the Dev Tools request line
  on top, wrap it in a `curl` command, or paste with Windows CRLF endings.
- Every parsed node is represented exactly once: one box per data tier and per
  dedicated role, carrying node counts, averaged hardware, and (on the generic
  Elasticsearch box) the version, wired with an ILM flow and wrapped in a zone
  named after the cluster. A node that is both hot and master-eligible counts
  once, as a data node; content nodes count as data; nodes with only auxiliary
  roles (transform / voting-only / remote-cluster-client) fall into the
  coordinating box rather than vanishing, so the board's counts always
  reconcile with the total.
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
- **The tool contract.** The model never places nodes; it calls a single
  `edit_whiteboard` tool that returns the deterministic template **sections** it
  wants and the cross-section **flows** between them (`src/utils/whiteboardAI.js`
  owns the schema and prompt; `whiteboardTemplates.js` owns layout). Each section
  carries its `template`, a `fill` (which tiers/tools/consumers), an optional
  `props` map keyed by the template's slot names (`hot`/`cold`/…, `src0`/`col0`,
  `tool0`, `mgmt0`, `kibana`/`users`) so the model can set node counts, RAM,
  capacity, and per-source ingest, and an optional `below: <sectionId>` to hang a
  block (e.g. monitoring) under another instead of taking a lane. Flows can pin
  either end to a section's whole zone box with `sourceZone` / `targetZone` — how
  stack monitoring watches the entire cluster. Cluster guidance mirrors the
  Patterns default: Hot+Cold+Frozen with object storage, no dedicated
  ingest/coordinating nodes, and dedicated masters only once the data tiers reach
  six nodes.
- The prompt sends the model a component **catalog** (every type with its field
  kinds, units, and enum options) and a compact **snapshot** of the current board
  (zones, node props, and flows) plus the tracked sections, so an incremental
  edit preserves the numbers already on the board rather than redrawing empty
  boxes.
- Runs on **Amazon Bedrock** (Converse API): requests are SigV4-signed in the
  browser and sent straight to `bedrock-runtime` in your region — no proxy, no
  SDK. Settings (⚙) take the region, an IAM access key + secret (plus an
  optional STS session token), and the model or inference profile id
  (default `global.anthropic.claude-sonnet-4-6`). The IAM identity needs
  `bedrock:InvokeModel`. Credentials are stored in this browser's
  `localStorage` only — don't use on a shared machine.
- **Load from ~/.aws/credentials** fills the fields from your AWS profiles
  instead of retyping keys. Under `npm run dev` the Vite dev server reads
  `~/.aws/credentials` (and `~/.aws/config`, for the region) itself — the
  endpoint only answers localhost origins and never exists in a build. On a
  static host (Vercel etc.) the button opens a file picker instead: select
  the credentials file by hand (press `⌘⇧.` in the macOS dialog to show the
  hidden `~/.aws` folder). Files with several profiles get a profile picker,
  with `default` applied first. Either way, parsing happens in the browser
  and the keys never leave your machine.

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
| `src/data/echInstanceConfigs.js` | Elastic Cloud Hosted instance configurations (ratios and RAM ladders) per provider, from the Elastic docs |
| `src/data/elasticIntegrations.js` | Elastic Agent integrations catalog (title + category), scraped from the package registry |
| `src/utils/nodeMetrics.js` | Content-driven node heights and chip formatting, shared by canvas and template layout |
| `src/utils/whiteboardGeometry.js` | Snapping, elbow routing, path helpers |
| `src/utils/whiteboardAI.js` | AI chat and the written summary: catalog, tool schema, prompts, LLM calls |
| `src/utils/whiteboardAnalysis.js` | Tidy layout, flow hops, architecture validation, capacity rollup |
| `src/utils/whiteboardSizing.js` | Ingest → node counts, and board → Pricing/ROM quote lines |
| `src/utils/pricingHandoff.js` | Pushing sized quote lines into the Pricing/ROM builder's saved scenarios (the **Send to Pricing** handoff) |
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
| `sections` | AI bookkeeping: `sectionId → { template, fill, props?, keys, zoneId }` |

`step` is the build step an element is revealed on; absent or `0` means base
content, visible from the start.

## Persistence

| `localStorage` key | What it stores |
|---|---|
| `ew-boards` | Board index: `{ boards: [{ id, name }], activeId }` |
| `ew-board-<id>` | One named board (debounced autosave; survives page refresh) |
| `ew-board` | Legacy single-board autosave, migrated into `ew-boards` on first load |
| `ew-seed-*` | Custom saves of the architecture presets |
| `ew-aws-region`, `ew-aws-key-id`, `ew-aws-secret`, `ew-aws-session` | Bedrock credentials for the AI chat |
| `ew-bedrock-model` | Bedrock model / inference profile id |

Every board autosaves continuously, so a refresh picks up where you left off.
Use **File → Export JSON**, a share link, or a preset slot to keep boards
long-term or hand them to someone else.

When the whiteboard renders inside the presenter view's live preview it detects
follow mode and never writes to storage, so the mirror can't overwrite the tab
you're actually presenting from.
