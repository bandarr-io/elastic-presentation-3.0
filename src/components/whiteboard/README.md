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
  fits whatever the node is showing. Every node type in the cluster carries a
  **Roles** field holding any subset of Elasticsearch's node roles, because a
  node performs one or more of them and a smaller cluster commonly runs one box
  as master + data + ingest at once. The roles are read by the review panel, so
  a data node that is master-eligible counts toward quorum.
- **Reusable presets and per-customer boards.** Ship built-in reference
  architectures, keep a named board per account, and round-trip boards as JSON.
- **Start from their reality.** Paste `_cat/nodes` or `_nodes` output from the
  customer's cluster and the board draws their actual topology — instance
  names, node roles, counts and hardware included — then compare it against the
  target design to get the migration delta.
- **Answer the sizing question.** Give it ingest per day, retention per tier,
  agent and user counts, and it derives the whole deployment — tiers, dedicated
  masters, optional ML nodes, Logstash, Kibana, object storage — from Elastic's sizing rules,
  draws it, and hands the result to the Pricing / ROM builder as quote lines.
- **Think out loud with it.** The AI panel is a conversation about the
  architecture, not a one-shot generator: it answers questions from the board,
  runs the sizing engine when the numbers come up, reads its own review findings,
  and stages every change for you to approve before it lands.
- **Every fact comes from somewhere you can check.** The model decides and
  narrates; deterministic code and retrieved passages supply the facts. Sizing
  comes from the sizing engine, pricing from the quote maths, integration names
  from the catalog, findings from the review checks, and guidance from a curated
  Elastic corpus or the customer's own document — each reply carrying the
  sources it used and a trail of what ran to produce it.
- **Design to what they actually asked for.** Attach the RFP or the meeting
  notes to the board and it will build to them, then check the board back
  against them and say what's missing.
- **Present it, don't just draw it.** Tag components with build steps and reveal
  the architecture piece by piece, driven from the presenter view; spotlight the
  part under discussion; annotate over the top with a pen while you talk.
- **Takeaways.** Export the finished diagram as SVG or PNG (with a title block
  and legend), copy it to the clipboard, send a share link, or have the board
  written up as the follow-up note.

---

## Feature tour

### Canvas
- Drag empty space to pan, scroll wheel to zoom, **Fit** to frame everything.
- Shift-drag draws a marquee: it selects nodes it touches and any zones it fully
  encloses (mixed selections can be deleted in one go).
- **Alignment guides.** While dragging a node, dashed centre lines appear when
  it comes within a few pixels of another node's row or column, and the drag
  snaps onto them — the same centre-based rule as *Straighten*, applied live,
  so what you drop is what Straighten would keep. A guide beats the grid on
  its axis; the rest of a multi-selection shifts rigidly with the lead node.
- **Minimap.** A corner overview of the whole board (zones tinted, nodes in
  their accent colours, the camera as an outlined rectangle); click or drag it
  to move the camera. **Views ▾ → Show the minimap** toggles it, the preference
  sticks, and it hides itself while presenting.
- **Saved views.** **Views ▾** keeps named camera positions per board — frame
  the ingest path, save it, and number keys **1–9** fly the camera there with
  a short ease (a straight cut under reduced motion). Views ride the board
  document: autosave, export/import JSON, everything.
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
- Hover a node and drag one of its twelve ports — three per side, at the
  quarter points and the midpoint — onto another node (or a zone) to connect.
- The line remembers both ends: it leaves from the port you grabbed and lands
  on the target's port nearest where you dropped. Ports are stored as a side
  plus a fraction along it, so they stay put when a node is moved or resized.
  A second line between the same two nodes is fine as long as it uses
  different ports. *Reset shape* returns both ends to automatic routing.
- Select a line and drag either of its end dots to reattach that end — onto a
  different port of the same node, or onto another node entirely. Rewiring to
  a different node clears the line's hand-placed bends (they were shaped
  around the old endpoint); re-anchoring on the same node keeps them.
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
- **Tidy ▾** is a two-option menu, because "make this neat" means two different
  things depending on whether the arrangement is already yours.
- **Straighten rows & columns** keeps your arrangement and trues it up: nodes
  whose centres are within a tolerance were meant to share a row (or column),
  so each such cluster snaps onto one shared centre line. Nothing changes
  order or lanes, and nothing moves further than the tolerance — a block you
  placed underneath everything stays underneath everything. If a nudge would
  push a member past its zone frame, the frame grows just enough to keep it.
- **Rebuild into flow lanes** lays every component out in left-to-right
  data-flow lanes (collect → process → store → serve → ops), stacking each
  lane and centring them against the tallest. Existing top-to-bottom order
  within a lane is kept. Use it when a board is chaos and the layout isn't
  precious.
- Zones travel as units through the rebuild: a zone's members (the nodes whose
  centres sit inside it — the same rule a zone drag uses) are tidied into
  lanes *within* the frame, the frame is refitted around them, and the whole
  zone takes one slot in the lane most of its members flow through. Grouping
  survives the cleanup instead of being laned out of its box. An empty frame
  is left alone.
- Annotations stay where you put them, in both modes.

### Capacity & review (the `Σ` button)
- Opens as a full-height flyout docked to the left edge of the canvas — the
  mirror of the AI chat on the right — so the numbers can stay up while you
  work, and the whole panel scrolls however long the findings get.
- **Capacity rollup** — total nodes, vCPU, RAM, and storage, plus a per-tier
  breakdown. Capacity is read per node (`2 TB`, `40tb`, `1.5PB`, or a bare
  number meaning TB) and multiplied by the tier's node count.
- **Architecture review** — advisory best-practice checks, never blocking:
  master quorum below three or an even count, a frozen tier with no object
  storage, warm/cold tiers with no hot tier, a replication flow with no remote
  cluster, a single data node, no monitoring cluster, and unconnected
  components (anything inside a zone that has a flow counts as connected).
  The button shows a count of hard warnings. **✦ Fix the findings** hands the
  warnings to the AI, which sees the same list and proposes the change.
- On an imported board the panel also offers **✦ Review this cluster** and
  **✦ Propose a target state** (below).
- **Licensing** picks the meter the deal bills on, because Elastic prices the
  two deployment models differently. Drawing a cluster sets it from the
  provider, and it's saved with the board along with the rest of the terms.
  - **Self-managed (ERU).** An Enterprise subscription licenses capacity:
    total addressable RAM ÷ 64, remainder rounded up. The agreement decouples
    this from node count deliberately — the same units buy one 64 GB node or
    sixty-four 1 GB ones — so the quantity comes from memory, and rounding once
    against the total matters, since rounding each tier separately over-counts
    the deal by up to a unit per tier. Set **Memory** on the nodes; that's
    what's priced. Logstash memory is left out, as Elastic counts it for
    information only. Set the **List price** per resource unit here; it's
    seeded with Elastic's list figure.
  - **Cloud Hosted (ECU).** Cloud is metered consumption, not licensed
    capacity, so there's nothing to derive from the board. Take the annual
    figure from the [Cloud pricing calculator](https://cloud.elastic.co/pricing)
    and enter it as the **ECU total**; the unit price is the fixed 1 ECU =
    $1.00 exchange rate.
- **Discount %** applies to either model, and the panel shows the resulting
  total — quantity × unit price, less the discount — so you can sanity-check it
  before sending.
- **Copy quote lines** emits the whole deployment as a *single* line,
  tab-delimited in the column order the Pricing / ROM builder's paste importer
  reads (SKU, description, quantity, unit price, discount, and a 6th **bold
  label** column so a pasted row matches the builder's own rows).
- **Send to Pricing** skips the clipboard entirely: it pushes the same line
  straight into the Pricing / ROM builder as a new, clearly-labelled scenario
  (so nothing already in the builder is overwritten), carrying the memory, node
  count, and storage the flat text paste would drop. It reuses the deck's
  existing config sync, so the change reaches the live slide and any presenter
  tab.
- **Copy summary** is the same numbers as one line of prose, for notes.
- **✦ Write it up** asks which artifact you want, then drafts it (below).

### Draw a cluster
- **Build…** in the toolbar opens the *Draw a Cluster* dialog — the question
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
  data) and **Kibana users** (concurrent) are inputs; **Logstash** is off by
  default — agent-direct is the default story — and when switched on is derived
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
- **✦ Write it up** in the capacity panel writes the session up from the
  diagram, the capacity rollup, and the review findings.
- It asks what to write before it sends anything, because one session feeds
  several artifacts and they aren't interchangeable: an **internal note**, a
  **customer email**, the **questions** still open, the **risks** worth raising,
  or the skeleton of a **statement of work**. Each option says what you get, so
  the choice doesn't cost a call and a wait to discover.
- The selector at the top of the finished draft switches artifact and re-drafts
  in place — same board, different brief — so you don't re-explain the
  architecture to get the follow-up out of it.
- The model is told to describe what it's given and to flag gaps rather than
  fill them, so it won't invent components or numbers. The draft opens in an
  editable box — check it before you send it.
- Uses the same provider configuration as the AI chat.

### Presenting
- **Present ▾ → Start presenting** hides the palette, inspector, and editing
  chrome, leaving the diagram, the step controls, and the pen. `Esc` returns
  to editing.
- **Spotlight** — click a component while presenting to pin a highlight on it
  and its immediate connections, dimming everything else. Click empty space (or
  **Unfocus**) to clear it.
- **Build steps** — tag any node or zone with a step in its inspector. Step 0
  ("Base") is on screen from the start; higher steps appear as you advance.
  Connections appear once both of their endpoints have been revealed. While
  editing, not-yet-revealed elements are ghosted rather than hidden so they stay
  workable.
- The AI can set them too: ask it to build something up in stages and it tags
  each section with the step it belongs to, so the diagram arrives ready to
  present rather than needing the reveal ordered by hand afterwards.
- Steps are published through `useSceneMotion`, so the **presenter view** drives
  them like any other multi-step scene: the beat pills, Next step button, and
  per-beat speaker notes all work, and the live preview mirrors the reveal.
  Arrow keys and space step the board directly while presenting.
- **Saved views while presenting** — when the board has them, the present bar
  grows a `‹ ›` stepper showing the current view's name, and number keys 1–9
  fly straight to a view. Arrows stay with the build steps, so the two kinds
  of stepping never fight.
### Annotation layer
- **Pen** draws freehand; **Arrow** drags a straight arrow with a head. Pick one
  of four ink colours. While editing they live in the **Present ▾** menu (the
  button shows the active tool); while presenting they sit right on the bar.
  `Esc` puts the pointer back into select mode.
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
- Every parsed node is represented exactly once, and how it's drawn depends on
  the size of the cluster:
  - **Twelve nodes or fewer**, each instance gets its own box, titled with its
    real name from the paste and carrying the exact roles that node reports.
    That's the only way a "these three are each master + data + ingest"
    topology reads correctly, and it's the shape most discovery calls hit.
  - **Larger than that**, per-instance boxes stop being legible, so the board
    groups by tier and role as before — node counts and averaged hardware on
    the box, the instance names underneath it as a subtitle (first three, then
    `+N more`), and the union of the group's roles as chips.
- Either way the cluster is wired the way the **Elastic Cluster** pattern wires
  one: ILM down the tier chain, ingest and coordinating nodes feeding the entry
  tier, data feeding ML, and the master exchanging cluster state with
  everything else. Cross-group flows attach to one representative box per group
  so a twelve-node import doesn't become a hairball. Peers with nothing else to
  connect to — the all-in-one cluster where every node is identical — are
  meshed instead, so nothing lands unconnected.
- A node that is both hot and master-eligible is drawn once, as a data node,
  with `master` among its roles; content nodes count as data; nodes with only
  auxiliary roles (transform / voting-only / remote-cluster-client) fall into
  the coordinating box rather than vanishing. The board's counts always
  reconcile with the total.
- The result lands in a new board — your current sketch is never overwritten.
  Nothing is sent anywhere; parsing is entirely local.
- What the import is *for* comes next, from the `Σ` panel:
  - **✦ Review this cluster** reads the shape that was imported and says what
    stands out — tier ratios against the retention they imply, master quorum,
    per-node sizing against the data each node holds, what the roles and
    versions suggest — and what it would want to check next. It doesn't touch
    the board.
  - **✦ Propose a target state** designs the deployment they should be running
    on a *new* board, sizing it with the sizing engine rather than carrying the
    old node counts across, then opens **Compare** with the imported board
    automatically. The current state, the target, and the delta between them —
    the three things a migration conversation needs — without redrawing
    anything by hand.
  - The import is saved with the board, so both actions are still there when you
    come back to it tomorrow.

### Architectures menu
- Load the built-in presets: **Reference**, **Air-gapped**, **Multi-tenant**.
- Save the current board over any preset slot (stored in `localStorage`;
  a `•` marks slots with a custom version) and reset back to the built-in.
- *Copy board as SEEDS code* serializes the current board as source code, so a
  good board can be promoted to a built-in default in `whiteboardTypes.js`.

### AI assistant (`✦ AI ▾` → AI chat)
- A chat flyout, docked full-height on the right like the inspector, that talks
  about the architecture *and* draws it. It answers
  questions from what's on the board ("what would you change about this
  design?", "why three masters?") and edits it when you ask it to ("add a second
  site with CCR", "draw our reference architecture for logging"). Whether a turn
  draws anything is the model's call, not the panel's — the tools are offered,
  never forced — so a question comes back as an answer rather than a diagram.
- **Nothing lands without your say-so.** A turn that wants to change the board
  stages it instead: a card above the composer names the change, lists what it
  adds, rebuilds, or removes, and waits for **Apply** or **Discard**. Undo
  already covers a change that lands; this is about not redrawing a diagram out
  from under a room that's looking at it. Applying flashes the same
  "⌘Z undoes it" note as the other generated boards.
- **The tools.** The model never places nodes itself. It calls:
  - `edit_whiteboard` — the deterministic template **sections** it wants and the
    cross-section **flows** between them. Each section carries its `template`, a
    `fill` (which tiers/tools/consumers), an optional `props` map keyed by the
    template's slot names (`hot`/`cold`/…, `src0`/`col0`, `tool0`, `mgmt0`,
    `kibana`/`users`) so it can set node counts, RAM, capacity, and per-source
    ingest, an optional `below: <sectionId>` to hang a block (e.g. monitoring)
    under another instead of taking a lane, and an optional `step` to hold the
    block back to that point in a staged reveal. Flows can pin either end to a
    section's whole zone box with `sourceZone` / `targetZone` — how stack
    monitoring watches the entire cluster. An optional `board` name draws the
    design on a **new side board** instead of the one on screen — ask for two
    alternatives ("one hot-only, one fully tiered") and the model makes one
    call per option, each landing on its own board in a single turn. Side
    boards draw immediately rather than staging: they aren't the diagram the
    room is looking at, so there is nothing for the Apply gate to protect.
    Open them from the boards menu, which also compares any two side by side;
    to iterate on one, open it first and ask again.
  - `size_deployment` — the same **sizing engine** the *Draw a Cluster* dialog
    runs (`whiteboardSizing.js`), reached with the numbers from the
    conversation: daily ingest, retention, provider and region, agents, users,
    Logstash, ML. The model supplies inputs; the arithmetic, tier split,
    instance choice, and hardware all stay deterministic, so "size this for
    500 GB/day held for a year" produces the figures the dialog would, not
    invented ones. Naming a cluster already on the board resizes that section in
    place instead of drawing a second one, and the tool hands back the resulting
    node, vCPU, RAM, and storage totals so the reply can quote them.
  - `search_knowledge` — retrieval over Elastic's guidance and the customer's
    own attached documents (below). A `scope` narrows it to one or the other,
    so their requirement is never mistaken for Elastic's recommendation.
  - `review_board` — the same `validateBoard` checks the `Σ` panel runs, on
    demand. Without it the findings only reach the model in the *next* turn's
    snapshot, so it could never check its own work; with it, it can fix a
    quorum problem and confirm the fix in the same turn.
  - `lookup_integrations` — searches the integrations catalog. The prompt asks
    for real integration names, and this is where they come from; before it,
    the model was setting `integration:` from memory. When nothing matches it
    is told to say so rather than invent one.
  - `quote_deployment` — the ERU and ECU maths from `romRows`, so "what is
    this at list?" is answered by the engine behind the Pricing / ROM builder.
    It refuses a board with no memory figures, and refuses to invent a Cloud
    consumption figure, because neither can be derived from a diagram.
  - A turn can call them in sequence — retrieve, look up, size, draw, review —
    each result fed back so the model sees what actually happened and says so.
    The loop is capped at five model turns, since a model that keeps calling
    tools would otherwise never hand back.
- **Grounded, and it shows.** While the turn runs, a **live feed** streams the
  agent's steps as they happen — each tool mid-flight in the present tense
  ("searching the knowledge base — “retention”"), settling into past
  tense when it returns, with a pulsing *Thinking…* line whenever the model
  itself is working. Then two lines wrap the reply that used tools:
  - a **trail** above it, naming what ran in the words someone watching would
    use ("searched the knowledge base, ran the sizing engine, checked the
    board"), with a failed tool marked rather than hidden;
  - a **sources** line below it, listing the passages the answer was grounded
    in — by document name for a customer document, by source for Elastic
    guidance, and naming Agent Builder when the agent answered.

  The sources line is assembled from what retrieval actually returned, not from
  the prose, so it is right even when the model forgets to cite.
- Cluster guidance mirrors the Patterns default: Hot+Cold+Frozen with object
  storage, no dedicated ingest/coordinating nodes, and dedicated masters only
  once the data tiers reach six nodes.
- **What it can see.** A component **catalog** (every type with its field kinds,
  units, and enum options), a compact **snapshot** of the current board (zones,
  node props, flows, and each section's build step) plus the tracked sections, so
  an incremental edit preserves the numbers already on the board rather than
  redrawing empty boxes — and the **review findings**, verbatim from the same
  checks the `Σ` panel shows, so it can act on what's actually wrong rather than
  guessing. **✦ Fix the findings** in the review panel hands them over directly.
- The suggestion chips follow the board: an empty canvas offers architectures to
  draw, an imported cluster offers a review, an unsized one offers sizing, and a
  board with warnings offers to fix them.
- Replies are **Markdown**, and are rendered as such — bold labels, bullet and
  numbered lists, inline code, fenced snippets — by a small renderer written for
  that subset (`whiteboard/ChatMarkdown.jsx`), since the whiteboard carries no
  rendering dependencies. It builds React elements rather than HTML, so text
  arriving from a model can't inject markup, and anything it doesn't recognise
  stays literal. What you typed is shown as you typed it.
- **Prompt caching.** The static half of the prompt (instructions and catalog)
  is separated from the per-turn board snapshot by a `cachePoint`, so Bedrock
  serves the unchanging part from its cache across a conversation. When it does,
  a line under the composer reports the cached and written token counts.
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

### Board context (`✦ AI ▾` → ◫ Context)
- The customer's own words, attached to the board: an RFP, a requirements
  sheet, last call's notes. **Upload a file…** takes any file — an accept
  filter would grey out exactly the files people bring — and routes it by what
  it is:
  - **Text** (`.txt`, `.md`, `.json`, `.csv`, logs, configs) reads directly in
    the browser.
  - **PDF, Word and Excel** go to the configured Elastic deployment's
    **attachment processor** first — through `_ingest/pipeline/_simulate`, so
    the deployment parses the file (Tika, the machinery behind enterprise
    ingest) but indexes nothing. Without Elastic, or when it can't be reached,
    parsers lazy-load into the browser instead (pdf.js, mammoth, SheetJS);
    each Excel sheet becomes its own heading, so citations point at the tab
    that mattered.
  - **Images** — an architecture screenshot, a whiteboard photo — are read by
    **Jina's vision model** (`jina-vlm`): transcribed and described, then
    chunked like any other document. Needs a Jina API key in the AI settings
    (⚙); Tika doesn't read pixels, so Elastic can't answer this one.
  - Anything else is read as text and, if it turns out to be binary, turned
    away with instructions to paste the part that matters.

  A hint under the composer says which machinery did the reading — Elastic,
  this browser, or Jina — because during a demo that provenance is the point.
- The text is chunked into passages in the browser. Headings matter: each one
  starts a new passage, so a citation points at the section that mattered
  rather than at the whole document. The panel shows the passage count per
  document.
- Two buttons turn an attachment into the two questions worth asking of it:
  - **✦ Design to this** — retrieves the constraints and builds to them, saying
    which requirement drove which part of the design.
  - **✦ Check the design against it** — reports where the board meets what they
    asked for and where it doesn't, citing the document line by line, alongside
    the deterministic review findings.
- Documents are stored with the board and ride its autosave. They are
  **kept out of the share link**, which is already near its size ceiling and is
  the wrong place for a customer's RFP regardless. They are also never pushed
  to Elasticsearch unless you explicitly ask for it.
- Caps: about 120k characters per document and 400k across a board, because
  `localStorage` is a few megabytes per origin for *everything* — every board,
  every preset. A document past the cap is one nobody meant to attach whole.

#### Customer details
- The same modal's **Customer** section holds who the board is for: account,
  opportunity, stakeholders, install base, deal review, and open support
  cases. Type the account and opportunity by hand, or paste the JSON from an
  `edm` CLI run — `edm opps --json`, then `stakeholders`, `installbase`,
  `meddpicc`, or `health` — and each paste adds its part without wiping the
  others. The importer recognises which command produced the rows by their
  distinctive columns, so it tolerates the Salesforce mirror's column drift,
  and rejects junk with a plain explanation. A `.json` file upload works too.
- The AI reads it: the chat system prompt gains a `CUSTOMER` block, so
  designs, reviews, and sizing conversations are deal-aware — it knows the
  install base and the open support pain when proposing an architecture.
- **Boundaries.** Customer details never render on the canvas or in Present
  mode — deal value and MEDDPICC on screen during a customer call would be a
  liability. The follow-up package uses only the account and opportunity
  names; value, scorecard, and case history inform the AI's narrative
  upstream but never appear in anything customer-facing, and the prompt says
  so explicitly.
- Stored with the board like documents are, and kept out of the share link
  the same way.

### The knowledge layer
- `src/data/knowledge/` holds Elastic's guidance as versioned passages: the
  sizing ratios and why they break where they do, tier and ILM guidance,
  reference architectures per solution, the reasoning behind each `validateBoard`
  check, and the two metering models. Each passage carries a `source`, because
  a claim you cannot trace back is worth no more than one the model invented.
- It is in the repo on purpose. It is reviewable in a pull request, it works
  with no network and no deployment, and the passages interpolate constants
  straight out of `whiteboardSizing.js`, so the guidance cannot drift away from
  the engine it describes.
- Retrieval is `src/utils/whiteboardKnowledge.js`: term scoring with inverse
  document frequency and a phrase boost, no dependency, unit-tested like the
  rest of `src/utils`. Enough at this corpus size, and it answers instantly.
- Customer passages are tagged apart from curated ones, so a `scope` on
  `search_knowledge` retrieves one or the other and the citation says which.

### Connecting Elastic (optional)
Everything above works with no Elastic deployment at all. Pointing it at one
adds semantic retrieval through **Agent Builder**, and makes the demo argument
that the product on the whiteboard is the one doing the retrieval behind it.

- **⚙ in the AI panel** holds one collapsible block per provider — Bedrock,
  Elastic, and Jina (for reading images attached as context) — with each header
  saying whether that provider is configured, so the panel answers "am I set
  up?" while collapsed and **Check AI** stays in reach without scrolling past a
  screen of fields. One block is open at a time, and the panel opens on Bedrock
  when there's no key yet.
- A configured deployment also parses uploaded documents: PDF, Word and Excel
  attached through **◫ Context** go through its attachment processor (see
  *Board context* above) instead of browser-side parsers.
- The Elastic block takes a Kibana endpoint (Agent Builder), an Elasticsearch
  endpoint (they're different hosts on Cloud), an API key, an agent id (default
  `elastic-ai-agent`), an optional Kibana space, and an index name (default
  `whiteboard-knowledge`). All of it lives in this browser's `localStorage`,
  exactly as the Bedrock credentials already do.
- A **read-only key is enough for retrieval**. Pushing the corpus into the index
  needs write on that index — a deliberate step up in privilege, so it may be
  worth a second key.
- **Push corpus** creates the index with a `semantic_text` mapping and bulk-writes
  the repo corpus into it. Re-runnable: correct a passage in git, push again.
  The repo stays the source of truth; the index is a serving layer over it.
  **Push this board's documents** appears only when the board has some, and is
  the only way a customer document ever leaves the browser.
- **Provider switch.** With Elastic configured and reachable, `search_knowledge`
  goes to Agent Builder and the app writes no retrieval code against
  Elasticsearch at all — it calls `converse` and renders what comes back. If
  Kibana is unreachable, the same question is answered from the repo corpus and
  the reply says so. That fallback is what makes the Elastic path safe to demo.
  Customer-scoped searches always stay local.

#### CORS: the one-time setting
Browser-direct means no proxy, which means CORS has to be enabled once on the
deployment. This is a deployment setting, not code, and it is the single thing
most likely to eat an afternoon.

Kibana user settings (Elastic Cloud: deployment → Edit → Kibana user settings):

```yaml
server.cors.enabled: true
server.cors.allowOrigin: ["https://your-app.vercel.app", "http://localhost:5173"]
```

Kibana's allowed-headers list already includes `Authorization` and `kbn-xsrf`,
which is what lets the preflight pass. On stack-hosted Kibana these settings are
marked Preview.

Elasticsearch user settings (deployment → Edit → Manage user settings), needed
only for pushing the corpus:

```yaml
http.cors.enabled: true
http.cors.allow-origin: "https://your-app.vercel.app"
http.cors.allow-methods: OPTIONS, HEAD, GET, POST, PUT
http.cors.allow-headers: Authorization, Content-Type, Accept, X-Requested-With
```

**Serverless projects cannot be used here at all.** They expose no CORS
settings and send no CORS headers, so a browser-direct call is blocked before
it leaves the page and nothing can be configured to allow it. Verified against
a live project: the preflight answers `200` with no `Access-Control-Allow-Origin`
on it. Use a hosted deployment, or leave Elastic disconnected — the knowledge
tools fall back to the corpus in the app and the citation says which answered.
The settings panel says this outright when it recognises an `*.elastic.cloud`
endpoint, rather than printing a fix that cannot be applied.

Requests go out with `credentials: 'omit'`, so this is a credential-less
cross-origin request in the CORS sense — the API key travels as a header, not a
cookie, which is what keeps the allowed-origin policy this short. Every POST
carries `kbn-xsrf: true`, without which Kibana returns a 400 that doesn't say
why.

A blocked preflight reaches JavaScript as a bare `TypeError: Failed to fetch`
with no status and no body — deliberately indistinguishable from an unreachable
host, so a page can't probe the network it sits in. Rather than leave you with
that, the app prints the exact settings block above with **this deployment's own
origin already filled in**, so the fix is a copy-paste rather than a search.

#### Check AI
The **Check AI** button in ⚙ reports both providers before you present:

- **Bedrock** — region, model, and round-trip latency, or the mapped error (an
  expired STS token and a model that isn't enabled in that region read
  differently).
- **Agent Builder** — reachable, and the agent id answering.
- **The index** — present, and how many documents are in it.

Each failure is named rather than lumped together: `403` on the key, `400` for a
bad agent id or a missing `kbn-xsrf`, a blocked CORS preflight (which prints the
settings above), or a genuinely unreachable host. Bedrock green is the only hard
requirement — Elastic red degrades to the repo corpus.

### File menu
- **Export** JSON (round-trips), SVG, PNG, or PNG at 4x. Exports match the
  canvas exactly, including per-connection colors, line styles, widths,
  annotations, and ink. The **Title & legend** toggle adds a header with the
  board name and date plus a colour legend of the categories in use.
- **Share** — *Copy image to clipboard* pastes the diagram straight into Slack
  or a deck; *Copy share link* packs the whole document into a compressed URL
  that opens as a new board on the other end (no server involved).
- **Follow-up package…** — the one file that leaves the building after the
  session. One click renders the board to an image, has the model write a
  customer-ready recap from the board, the capacity rollup, the review
  findings, and the chat transcript (what we walked through, what was decided,
  what's still open, next steps), and previews it for editing — it gets
  checked before it's sent. **Download HTML** produces a single self-contained
  file (inline styles, embedded image, nothing fetched from anywhere);
  **Copy Markdown** is the same package for wherever markdown goes. Without
  Bedrock credentials it still builds from the deterministic parts — the
  image and the numbers are exact — with a note where the narrative would go.
  The header names the account and opportunity when the board has customer
  details; internal deal fields stay out by construction.
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
| Connect | drag one of the twelve hover ports onto another node or zone |
| Bend a connection | select it, drag the hollow midpoints |
| Reattach a connection | select it, drag an end dot to another port or node |
| Move zone (with contents / alone) | drag pill / Alt-drag |
| Save / recall a camera view | **Views ▾** → save · number keys 1–9 |
| Toggle the minimap | **Views ▾** → Show the minimap |
| Duplicate | `⌘/Ctrl+D` |
| Copy / cut / paste selection | `⌘/Ctrl+C` · `⌘/Ctrl+X` · `⌘/Ctrl+V` |
| Nudge selection | arrow keys (Shift for 1px) |
| Delete | `Del` / `Backspace` (works on mixed node + zone selections) |
| Undo / redo | `⌘/Ctrl+Z` / `⌘/Ctrl+Shift+Z` |
| Copy / paste node style | `⌘/Ctrl+Shift+C` / `⌘/Ctrl+Shift+V` |
| Edit a note | double-click · `⌘Enter` or `Esc` to commit |
| Present / exit | **Present ▾** → Start presenting / `Esc` |
| Step the reveal (presenting) | arrow keys or space |
| Spotlight (presenting) | click a component; click empty space to clear |
| Size a cluster from ingest | **Build…** |
| Attach the customer's requirements | **✦ AI ▾** → ◫ Context → upload or paste |
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
| `src/components/whiteboard/ChatMarkdown.jsx` | Renders the Markdown subset the AI replies in, without a Markdown dependency |
| `src/components/whiteboard/Minimap.jsx` | The corner overview map: board bbox scaled down, camera rectangle, click/drag to pan |
| `src/data/whiteboardTypes.js` | Node type catalog, categories, palettes, built-in SEED architectures |
| `src/data/knowledge/` | The curated Elastic corpus as versioned passages (sizing, tiers, architectures, review reasoning, licensing) |
| `src/data/whiteboardTemplates.js` | Pattern blocks and their config forms |
| `src/data/echInstanceConfigs.js` | Elastic Cloud Hosted instance configurations (ratios and RAM ladders) per provider, from the Elastic docs |
| `src/data/elasticIntegrations.js` | Elastic Agent integrations catalog (title + category), scraped from the package registry |
| `src/utils/nodeMetrics.js` | Content-driven node heights and chip formatting, shared by canvas and template layout |
| `src/utils/whiteboardGeometry.js` | Snapping, elbow routing, path helpers, live alignment guides |
| `src/utils/whiteboardAI.js` | AI chat and the written summary: catalog, tool schemas, prompts, the bounded tool loop, LLM calls |
| `src/utils/whiteboardKnowledge.js` | Chunking a document into passages, and ranking passages against a query |
| `src/utils/whiteboardParse.js` | An uploaded file becoming text: Elastic's attachment processor first, lazy-loaded browser parsers (pdf.js, mammoth, SheetJS) as the fallback, Jina's vision model for images |
| `src/utils/whiteboardElastic.js` | Agent Builder `converse` and Elasticsearch indexing, browser-direct, plus the CORS help a blocked preflight prints |
| `src/utils/whiteboardAnalysis.js` | Tidy layout, architecture validation, capacity rollup |
| `src/utils/whiteboardSizing.js` | Ingest → node counts, and board → Pricing/ROM quote lines |
| `src/utils/pricingHandoff.js` | Pushing sized quote lines into the Pricing/ROM builder's saved scenarios (the **Send to Pricing** handoff) |
| `src/utils/whiteboardFollowup.js` | The follow-up package: composing the image, recap, capacity, and findings into one self-contained HTML file, plus its markdown twin |
| `src/utils/whiteboardCustomer.js` | Customer details: recognising and importing `edm` CLI output, merging successive pastes, and the prompt text the AI reads |
| `src/utils/whiteboardDiff.js` | Comparing two boards |
| `src/utils/whiteboardImport.js` | Parsing `_cat/nodes` / `_nodes` / `_cluster/stats` into a board |
| `src/utils/whiteboardShare.js` | Packing a board into a share URL and back |
| `src/utils/whiteboardPresenting.js` | Ink paths, build-step visibility, export text wrapping |

Tests live beside their modules (`*.test.js`), plus
`src/components/whiteboard/ElasticWhiteboard.smoke.test.jsx`, which mounts the
whole component in jsdom and exercises boards, presenting, ink, build steps,
sizing, comparison, the written summary, cluster import, the board context
panel, customer details, the follow-up package, alignment guides, saved
views, the minimap, the Elastic connection (provider switch, fallback,
pre-flight, corpus push), and the AI chat — every tool, staged applies,
citations, and the tool trail — against mocked Bedrock and Kibana endpoints.

## The document

A board is `{ nodes, edges, zones, ink, view, views, sections, quote, imported, documents, customer }`:

| Field | Shape |
|---|---|
| `nodes` | `{ id, type, x, y, title?, sub?, color?, w?, h?, logo?, props?, step? }` |
| `edges` | `{ id, s, e, lbl?, bi?, color?, style?, width?, pts?, step? }` — `s`/`e` may be zone ids |
| `zones` | `{ id, x, y, w, h, label, color, step? }` |
| `ink` | `{ id, kind: "pen"\|"arrow", color, width, step, pts: [{x,y}] }` |
| `sections` | AI bookkeeping: `sectionId → { template, fill, props?, step?, keys, zoneId }` |
| `imported` | Summary of the cluster this board was imported from, if any — what offers the review and target-state actions |
| `documents` | `{ id, name, text }` per attached customer document; chunked into passages on load, and excluded from the share link |
| `views` | `{ id, name, x, y, k }` per saved camera position — number keys 1–9 jump to them |
| `customer` | Account, opportunity, stakeholders, install base, deal review, and support health, imported from the `edm` CLI; excluded from the share link |

`step` is the build step an element is revealed on; absent or `0` means base
content, visible from the start. A section's `step` rides along in `sections`, so
a block the model re-sends keeps its place in the reveal.

## Persistence

| `localStorage` key | What it stores |
|---|---|
| `ew-boards` | Board index: `{ boards: [{ id, name }], activeId }` |
| `ew-board-<id>` | One named board (debounced autosave; survives page refresh) |
| `ew-board` | Legacy single-board autosave, migrated into `ew-boards` on first load |
| `ew-seed-*` | Custom saves of the architecture presets |
| `ew-aws-region`, `ew-aws-key-id`, `ew-aws-secret`, `ew-aws-session` | Bedrock credentials for the AI chat |
| `ew-bedrock-model` | Bedrock model / inference profile id |
| `ew-elastic-url`, `ew-es-url` | Kibana and Elasticsearch endpoints (different hosts on Cloud) |
| `ew-elastic-key` | The Elastic API key — this browser only, same as the Bedrock keys |
| `ew-elastic-agent`, `ew-elastic-space`, `ew-elastic-index` | Agent id, optional Kibana space, and the knowledge index name |
| `ew-jina-key` | Jina API key, for reading images attached as context |
| `ew-minimap` | Whether the corner minimap is shown (on by default) |

Every board autosaves continuously, so a refresh picks up where you left off.
Use **File → Export JSON**, a share link, or a preset slot to keep boards
long-term or hand them to someone else.

When the whiteboard renders inside the presenter view's live preview it detects
follow mode and never writes to storage, so the mirror can't overwrite the tab
you're actually presenting from.
