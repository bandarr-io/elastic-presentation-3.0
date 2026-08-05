# Elastic Presentation

A React-based interactive presentation platform for Elastic field teams. It walks
prospects and customers through Elastic's platform, capabilities, and value with
polished animated scenes — all running locally in the browser with no backend.

**Quick facts** (for humans and LLMs):

- Single-page React 18 + Vite app, hash-routed (`/#/<scene-id>`), no server or database.
- A presentation is an ordered, enabled subset of **52 registered scenes** (`src/data/sceneRegistry.jsx`).
- **Deck presets** (`src/data/deckPresets.js`) are out-of-the-box flows: New Prospect (default), Technical Deep-Dive, Observability, Security, All Scenes, No Scenes.
- Scenes can have internal animation steps ("**beats**" via the `useSceneMotion` hook, or lifted "**stages**" managed in `App.jsx`).
- A **presenter view** (`/#/presenter`) opens in a second tab and drives the audience tab over `BroadcastChannel`, with speaker notes and live previews.
- An **architecture whiteboard** scene (`/#/whiteboard`) provides a live drag-and-drop canvas for Elastic deployment diagrams.
- All user configuration persists to `localStorage`; content is customizable per scene through a Settings panel.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Tech Stack](#tech-stack)
- [Core Concepts](#core-concepts)
- [Out-of-the-Box Flows (Deck Presets)](#out-of-the-box-flows-deck-presets)
- [Scene Library](#scene-library)
- [Presenter View](#presenter-view)
- [Architecture Whiteboard](#architecture-whiteboard)
- [Customization (Settings Panel)](#customization-settings-panel)
- [Navigation](#navigation)
- [Scene Motion System](#scene-motion-system)
- [Theming](#theming)
- [Persistence](#persistence)
- [Project Structure](#project-structure)
- [Testing](#testing)

---

## Getting Started

```bash
npm install        # install dependencies
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # production build
npm run preview    # preview the production build
npm test           # run the Vitest unit tests
```

Routing is hash-based: `http://localhost:5173/#/<scene-id>` deep-links to any
scene, and `#/presenter` opens the presenter view.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 18 |
| Build | Vite 5 |
| Routing | react-router-dom 7 (HashRouter) |
| Styling | Tailwind CSS 3 |
| Animation | anime.js 4 |
| Icons | Font Awesome (free-solid), simple-icons |
| Testing | Vitest |
| Analytics | Vercel Analytics |
| Fonts | Mier B (headlines), Inter (body), Space Mono (code) |

---

## Core Concepts

| Term | Meaning |
|---|---|
| **Scene** | A full-screen slide, registered in `src/data/sceneRegistry.jsx` with an `id`, `title`, `description`, `duration`, and optional `defaultDisabled` flag. |
| **Deck preset** | A named flow that enables exactly one set of scenes in a fixed order (everything else is disabled). Selected in Scene Settings. Any manual change switches the deck to *Custom*. |
| **Beat** | An internal animation step inside a scene, driven by the `useSceneMotion` hook. Beats are advanced by the global Next control and the presenter view. |
| **Stage** | Like a beat, but for scenes whose step state is lifted into `App.jsx` (`liftedStageControls`). Behaves the same from the presenter's perspective. |
| **Presenter bridge** | The mechanism (`src/presenter/presenterBridge.js`) that exposes a scene's beat/stage controls to the cross-tab sync layer. |
| **Scene metadata** | Per-scene user edits (title, duration, group, speaker notes, per-beat notes, content fields) stored in `localStorage` and editable in the Settings panel. |
| **Group** | Scenes sharing a `group` name appear as a single entry on the auto-generated Agenda slide. |

---

## Out-of-the-Box Flows (Deck Presets)

Presets live in `src/data/deckPresets.js` and are applied from the **Scenes** tab
of the Settings panel. Applying a preset enables exactly its scenes, in order;
every other scene is moved after them and disabled. Per-scene durations and
content edits are preserved when switching presets. The default preset is
**New Prospect**.

| Preset | ID | Intent |
|---|---|---|
| **New Prospect** *(default)* | `new-prospect` | Net-new pitch — market context first, no existing-footprint assumptions. 16 scenes ending in pricing, services, and next steps. |
| **Technical Deep-Dive** | `technical` | Architecture and platform internals for architects and platform teams — planes, node types, tiering, schema, cross-cluster, ES\|QL, deployment models, through a full reference deployment. |
| **Observability** | `observability` | The Observability story — from efficient datastore to the autonomous AI SRE (Nightshift). Uses the 14 `obs-*` / `nightshift-*` scenes. |
| **Security** | `security` | Modern threat landscape → AI-driven SecOps → tool consolidation, governance, and commercials. |
| **All Scenes** | `all-scenes` | Everything enabled in registration order — the full library. Newly added scenes are always included. |
| **No Scenes** | `no-scenes` | Blank slate — only Hero. Build a custom flow from scratch. |

---

## Scene Library

All 52 scenes, grouped as they appear in `src/data/sceneRegistry.jsx`. "Default"
indicates whether the scene ships enabled before any preset/customization is
applied (the New Prospect preset governs the actual default flow).

### Opening & narrative core (enabled by default)

| Scene | ID | What it shows |
|---|---|---|
| Hero | `hero` | Opening screen with animated search bar and Elastic branding |
| Agenda | `agenda` | Auto-generated agenda from enabled scenes, adaptive grid layout |
| Team Introductions | `team` | The people in the room, pulled from Team Settings |
| About Elastic | `about` | Who we are and what we do — company stats |
| Desired Outcomes | `business-value` | Key areas where Elastic delivers value |
| Metrics Dashboard | `elastic-value` | Configurable layout — hero stat cards, stat grid, bottom-line banner |
| Card Grid | `value-by-team` | Configurable layout — icon cards with an impact banner |
| Visual Gallery | `security-use-cases` | Configurable layout — image cards with an expandable lightbox |
| Exploded Platform | `elastic-exploded` | 3D-style teardown of the Elastic logo into seven capability parts |
| Platform Overview | `unified-strategy` | All your data, real-time, at scale — the full platform diagram |
| AI Capability Map | `ai-assistant` | Reactive today, agentic now, autonomous next |
| Security: Why Now | `security-narrative-visual` | Count-up threat stats, attack-path kill-chain, bolt-on vs native SOC |
| Pyramid → Diamond | `security-soc-model` | The SOC operating model shift, animated morph |
| Senses · Brain · Hands | `security-capabilities` | The three native platform layers with competitive call-outs |
| Security | `security` | AI-driven security operations: attack discovery, investigation, automated response |
| Licensing | `licensing` | Subscription tiers and what comes with each |
| Pricing / ROM | `pricing-rom` | Customizable rough-order-of-magnitude quote with live-computed totals |
| Customer Architect | `customer-architect` | The dedicated partner who walks the journey with the customer |
| Services | `services` | Professional Services journey with Zero Downtime Migration demo |
| Next Steps | `next-steps` | Close the conversation and drive to action; team contact panel |

### Platform deep-dive (disabled by default)

| Scene | ID | What it shows |
|---|---|---|
| Panel | `panel` | Featured panel discussion layout with speaker cards |
| Problem Patterns | `problem-patterns` | Filterable common challenges across Observability, Security, Search |
| Data Explosion | `data-explosion` | Animated chart — structured vs. unstructured data growth |
| LogsDB | `logsdb` | More data, lower cost, better visibility |
| Data Mesh | `data-mesh` | Multi-stage story: data silos → unified Elastic mesh |
| Cross-Cluster | `cross-cluster` | Distributed search and replication across environments |
| Schema | `schema` | Schema on Read vs Schema on Write — why ECS matters |
| Access Control | `access-control` | RBAC/ABAC, field-level security, PII masking |
| Data Tiering | `data-tiering` | Hot, warm, cold, and frozen lifecycle management |
| Consolidation | `consolidation` | Before/after: tool sprawl → unified Elastic platform |
| ES\|QL | `esql` | One pipeline from raw data to answers |
| Deployment Models | `platform-operations` | Self-Managed, Cloud Hosted, Serverless — switchable via side nav |
| Platform Value | `platform-value` | Closing hero — the platform's value as a whole |

### Observability story (disabled by default; used by the Observability preset)

| Scene | ID | What it shows |
|---|---|---|
| The AI-Scale Challenge | `obs-ai-scale` | AI multiplies every observability problem — dev ×100, staging ×10, prod ?× |
| Track Record | `obs-heritage` | From the ELK Stack to the Agentic Era |
| Three Layers | `obs-three-layers` | Elasticsearch → AI Index → Nightshift |
| Three Pillars | `obs-pillars` | Streams, Signals, and Nightshift define the roadmap |
| Signals & Efficiency | `obs-signals` | Five signals on one platform, plus datastore efficiency benchmarks |
| Streams | `obs-streams` | Five-stage telemetry pipeline to agent-ready significant events |
| OpenTelemetry | `obs-otel` | EDOT — the #1 OTel contributor — collects everything, from everywhere |
| Kubernetes | `obs-kubernetes` | OOTB Kubernetes dashboards plus autonomous root-cause analysis |
| MCP App for Kubernetes | `obs-mcp-app` | Claude drives Elastic via MCP: health → anomalies → explainer → blast radius |
| Agentic Observability | `obs-agentic` | Four-quadrant strategy: infer, discover, remediate, meet teams anywhere |
| Knowledge & Discovery | `obs-discovery` | Knowledge Indicators → Significant Events → the agent's live system model |
| Meet Where They Are | `obs-surfaces` | One Skills layer across every surface; plain-English investigation via MCP |
| Nightshift: AI SRE | `nightshift-sre` | The autonomous AI SRE — detect, investigate, remediate, audit |
| Inside Nightshift | `nightshift-arch` | Architecture, the Elastic Brain, and the token-efficiency funnel |

### Reference architecture & tools (disabled by default; used by the Technical preset)

| Scene | ID | What it shows |
|---|---|---|
| Core Components | `core-components` | The Elastic stack, layer by layer |
| Node Types | `node-types` | Elasticsearch node roles — master, data, ingest, coordinating, ML |
| Elastic Overview | `elastic-overview` | The visualization, data, and ETL planes with optional management plane |
| Enterprise Deployment | `enterprise-deployment` | Full reference architecture — sources, ingest, tiered cluster, consumers, monitoring |
| Architecture Whiteboard | `whiteboard` | Live drag-and-drop canvas for whiteboarding, sizing, and presenting Elastic architectures ([full docs](src/components/whiteboard/README.md)) |

---

## Presenter View

A dedicated control surface for presenting from a second screen. Open it with the
presenter icon in the nav bar (or navigate to `/#/presenter`) — it launches in its
own tab and drives the audience tab via `BroadcastChannel`, so both stay in sync
with zero server involvement.

- **Live previews** — a large, interactive preview of the current scene (buttons
  inside it are clickable and forward real clicks to the audience tab via DOM-path
  resolution) plus a preview of what's coming next.
- **Step-aware navigation** — "Next" advances the current scene's internal beats
  or stages first, then moves to the next scene. Explicit *Prev scene* /
  *Next scene* buttons, beat pills for jumping to a specific step, and a Replay
  button for scenes that support it.
- **Triggers** — in-scene animations (e.g. demo phases) exposed as one-click
  buttons in the presenter.
- **Speaker notes** — per-scene and per-beat notes, editable in place and synced
  to the same scene metadata used by Scene Settings.
- **Scene jump menu** — a searchable scene selector mirroring the nav bar's.

Implementation lives in `src/presenter/`:

| File | Role |
|---|---|
| `PresenterView.jsx` | The presenter UI: previews, controls, notes, footer navigation |
| `usePresenterSync.js` | Audience-side command handling and state broadcasting |
| `presenterChannel.js` | `BroadcastChannel` wrapper shared by both tabs |
| `presenterBridge.js` | Registers scene beat/stage controls for remote driving |
| `ScenePreview.jsx` | Scaled live rendering of scene components in the presenter |
| `domClick.js` | Serializes/resolves DOM paths so preview clicks replay in the audience tab |

---

## Architecture Whiteboard

The deck ships with a full interactive whiteboard scene (`/#/whiteboard`) for
sketching Elastic deployment architectures live — and for presenting them.

**Drawing.** Typed Elastic components with per-node specs, configurable pattern
blocks (cluster tiers, ingestion, user space), zones, styled connections
(per-edge color; solid/dashed/dotted/long-dash/dash-dot; thin/normal/thick),
sticky notes and text labels, clipboard copy/paste of whole subsystems,
arrow-key nudging, and a **Tidy** button that lays everything out in
left-to-right data-flow lanes. Nodes keep a fixed width per type but grow in
height to fit whatever they're showing — titles, sub-lines, and spec chips —
and template stacks and zones re-open around the taller boxes. Data Source
nodes carry an integration picked from the Elastic Agent catalog (384 GA
integrations, scraped from the package registry) plus a raw-ingest GB/day
figure.

**Boards.** Named boards with independent autosave and undo history, so you can
keep one per customer. Built-in architecture presets remain available in the
Architectures menu.

**Sizing.** *Size…* turns ingest per day, retention per tier, and agent/user
counts into a whole deployment: data tiers, a three-node master quorum (added
automatically once the data tiers reach six nodes), Logstash sized from
throughput, Kibana sized from concurrent users, optional dedicated ML nodes for
inference and anomaly detection (off by default, 16 GB floor and HA pair,
grown from ingest, and excluded from the master threshold since they hold no
shards), Elastic Agent in the ingestion zone, a separate monitoring cluster
hung off the cluster zone below the User Space, and the object store the frozen
tier snapshots into. Ingest is either
one hand-entered total or the **sum of the board's Data Source volumes** — in
which case the drawn architecture wires those very source nodes into its new
ingestion zone. Pick a provider: on Elastic Cloud (AWS, GCP, or Azure) the maths uses
the instance configurations ECH actually offers — documented disk:RAM and
vCPU/RAM ratios, node RAM snapped to each config's published size ladder, and
scale-out past the top rung — a hot-profile picker mirrors the deployment
templates (Storage Optimized, CPU Optimized, Vector Search Optimized, …), a
region picker narrows hardware to what each of the 58 ECH regions actually
offers, and the hardware table names the real config ids
(`aws.es.datahot.i8g`, `gcp.es.datawarm.n2.68x10x190`, …). Self-managed keeps
Elastic's tier-guidance ratios with best-practice raw EC2 picks (NVMe `i3en`
hot/frozen, dense `d3en` warm/cold, and so on). Every cell — instance, vCPU,
RAM, disk — is editable before drawing. It draws all of it as one wired
architecture using the same deterministic templates as the Patterns menu, with
every node fully specified. Cold and frozen mount searchable snapshots, so
replicas don't multiply their storage.

**Analysis.** A `Σ` panel rolls up nodes, vCPU, RAM, and per-tier storage, and
runs advisory best-practice checks (master quorum, frozen tier without object
storage, single data node, orphans). It emits 64 GB resource-unit quote lines
in the tab-delimited shape the Pricing / ROM builder's paste importer already
parses (including a bold-label column so pasted rows look like the builder's
own), so a drawn architecture becomes a priced estimate without retyping it.
**Send to Pricing** does the same in one click without the clipboard, landing
the rows as a new scenario in the ROM builder — with the per-tier memory, node
counts, and storage that the text paste can't carry — and never overwriting a
quote already in progress. Imported rows arrive with a blank unit price shown
as a neutral "awaiting price" to-do rather than a broken $0.

**Real data.** Paste `GET _cat/nodes?v`, `_nodes`, or `_cluster/stats` output
and the board draws the customer's actual topology into a new board. Parsing is
entirely local. **Compare** any two boards to get the migration delta: what the
target adds, drops, and resizes, and how the rollups move.

**Presenting.** *Present* hides the editing chrome; click a component to
spotlight it and its connections. Tag components with **build steps** to reveal
the architecture piece by piece — those steps are published through
`useSceneMotion`, so the [presenter view](#presenter-view) drives them like any
other multi-step scene, complete with beat pills and per-beat speaker notes.
*Flow* walks the data through the diagram one hop at a time for narrating the
path. A pen and arrow tool annotate over the top, with strokes tied to the step
they were drawn on.

**Sharing.** Export JSON, SVG, or PNG (2x/4x) with an optional title block and
category legend, copy the image straight to the clipboard, or copy a share link
that packs the whole board into a compressed URL. *✦ Write it up* drafts the
follow-up note from the diagram, the rollups, and the review findings.

**AI.** The *✦ AI* chat builds or edits the board from natural language, and
*✦ Write it up* drafts prose — both run on **Amazon Bedrock** (Converse API)
with SigV4-signed requests sent straight from the browser. Bring an IAM key
pair with `bedrock:InvokeModel`; no proxy or backend involved.

See the [whiteboard README](src/components/whiteboard/README.md) for the full
feature tour, interaction cheat sheet, document schema, and code map.

---

## Customization (Settings Panel)

Open with the gear icon in the nav bar. Everything saves automatically to
`localStorage` and persists across sessions.

### Scenes tab

- **Deck presets** — one-click flows (see [above](#out-of-the-box-flows-deck-presets)).
  Any manual change flips the active preset to *Custom*.
- **Enable / disable** individual scenes; disabled scenes are hidden from the
  presentation and the agenda.
- **Reorder** scenes by dragging.
- **Set custom durations** shown on the Agenda slide.
- **Assign a group** to cluster scenes under a single agenda entry.

### Team tab

Configure the presenting team. Each member has name, role, email, phone,
photo, and an accent color. Members with the role **Account Executive**,
**Solutions Architect**, or **Customer Architect** are automatically surfaced in
the **Next Steps** contact panel.

### Customizations tab

Per-scene content editors (in `src/components/sceneEditors/`) expose the text,
stats, images, line items, and layout options of individual scenes — e.g. Hero
typing text, About stats, Pricing/ROM line items and discounts, Metrics
Dashboard cards, Visual Gallery images, Licensing tiers, Panel speakers, and
more. Select a scene from the dropdown to edit its fields; edits are stored as
scene metadata and survive preset switches.

---

## Navigation

- **Previous / Next** buttons move through the deck; Next advances a scene's
  internal beats/stages before moving to the next scene.
- **Dot indicators** along the bottom show position; hover for scene names.
- **Progress bar** at the very bottom fills as you advance.
- **Searchable scene selector** in the nav bar jumps to any enabled scene.
- Some scenes have **internal controls** (e.g. the Services Zero Downtime demo
  exposes a Reset button in the nav bar when active).
- Deep-link to any scene with `/#/<scene-id>`.

---

## Scene Motion System

Scenes with multi-step animations use one of two patterns, both of which the
global navigation and presenter view understand:

1. **`useSceneMotion` beats** (`src/hooks/useSceneMotion.js`) — a scene declares
   its number of beats and gets `beat`, `goTo`, `next`, `prev`, and `replay`.
   The hook registers with the presenter bridge automatically, so beats are
   remotely driveable and mirrored into presenter previews
   (`SceneMotionFollowContext`).
2. **Lifted stages** — a few scenes' step state lives in `App.jsx`
   (`liftedStageControls`) so the nav bar can render scene-specific controls.

Supporting hooks: `useAnimationTimeline` (anime.js timelines),
`useReducedMotion` (respects OS reduced-motion), `useSceneTransition`,
`useThemeStyles`.

---

## Theming

Dark mode (default) and light mode, toggled via the moon/sun icon in the nav bar.

- Dark mode uses the Elastic dark palette — deep blue backgrounds, teal/white accents.
- Light mode uses white surfaces with Elastic blue and ink tones.
- All scenes, the whiteboard, and the presenter view respond to the active theme.
- Persisted to `localStorage` as `presentation-theme`.

---

## Persistence

Everything is client-side in `localStorage`:

| Key | What it stores |
|---|---|
| `presentation-scene-config` | Active preset, enabled scenes, order, durations, per-scene metadata (content edits, speaker notes, per-beat notes) |
| `presentation-team-config` | Team title, subtitle, and all member records |
| `presentation-theme` | `'dark'` or `'light'` |
| `ew-*` | Whiteboard board index and named boards, custom architecture presets, AI config — see the [whiteboard README](src/components/whiteboard/README.md#persistence) |

A versioned migration (`ORDER_VERSION` in `SceneSettings.jsx`) re-applies the
canonical default flow when the shipped defaults change, while preserving your
durations and content edits. Use **Reset** in the Settings panel (or clear
`localStorage`) to return to defaults.

---

## Project Structure

```
elastic-presentation-3.0/
├── public/                        # Static assets (fonts, logos, images, screenshots)
├── src/
│   ├── main.jsx                   # App entry — HashRouter setup
│   ├── App.jsx                    # Scene orchestration, nav bar, lifted stages, presenter integration
│   ├── index.css                  # Tailwind base, fonts, custom keyframes
│   ├── data/
│   │   ├── sceneRegistry.jsx      # All 52 scene definitions (id, component, title, description)
│   │   ├── deckPresets.js         # Out-of-the-box flows (New Prospect, Technical, Obs, Security, …)
│   │   ├── agendaDefaults.js      # Agenda slide defaults
│   │   ├── iconOptions.js         # Icon picker catalog for scene editors
│   │   └── whiteboardTypes.js / whiteboardTemplates.js  # Whiteboard component catalog & patterns
│   ├── scenes/                    # All 52 scene components (+ _backup/ archive)
│   ├── presenter/                 # Presenter view: cross-tab sync, previews, notes, click forwarding
│   ├── components/
│   │   ├── SceneSettings.jsx      # Settings panel + useSceneConfiguration hook + preset logic
│   │   ├── sceneEditors/          # Per-scene content editors (Customizations tab)
│   │   ├── ElasticWhiteboard.jsx  # Interactive architecture canvas
│   │   ├── whiteboard/            # Whiteboard gestures, undo/redo history, docs
│   │   ├── PricingRomBuilder.jsx  # Pricing/ROM quote builder
│   │   ├── ProgressBar.jsx · SceneHeader.jsx · SceneStepper.jsx · CountUp.jsx
│   │   ├── FlowConnectors.jsx · ClusterMark.jsx · ErrorBoundary.jsx
│   ├── context/                   # Theme, Team, SceneMotion, SceneMotionFollow contexts
│   ├── hooks/                     # useSceneMotion, useAnimationTimeline, useReducedMotion, …
│   ├── animations/                # Reusable animation utilities
│   └── utils/                     # Whiteboard geometry/AI/analysis/import/share, pricing, layout helpers
├── tailwind.config.js
└── vite.config.js
```

---

## Testing

```bash
npm test
```

Vitest covers the parts where a regression would be silent:

| Suite | What it covers |
|---|---|
| `src/presenter/presenterSync.test.js` | Presenter command handling (next/prev, beats, scene actions) |
| `src/utils/whiteboardTemplates.test.js` | Pattern block instantiation and layout, props landing, zone-level cross edges |
| `src/utils/nodeMetrics.test.js` | Content-driven node heights and chip formatting |
| `src/utils/whiteboardAnalysis.test.js` | Tidy lane layout, flow hops, architecture validation rules, capacity math |
| `src/utils/whiteboardSizing.test.js` | Ingest → node counts, and the Pricing/ROM quote lines |
| `src/utils/pricing.test.js` | Paste delimiter detection, the bold-label column, priced-vs-unpriced rows, and the whiteboard → quote-line round trip |
| `src/utils/whiteboardDiff.test.js` | Matching components across boards and the reported delta |
| `src/utils/whiteboardImport.test.js` | Parsing `_cat/nodes` / `_nodes` / `_cluster/stats` into a board |
| `src/utils/whiteboardShare.test.js` | Share-link round-tripping and hash param handling |
| `src/utils/whiteboardAI.test.js` | The `edit_whiteboard` tool schema, component catalog, board snapshot, cluster guidance, and the summary prompt |
| `src/utils/whiteboardPresenting.test.js` | Text wrapping, ink paths, build-step visibility |
| `src/components/whiteboard/ElasticWhiteboard.smoke.test.jsx` | Mounts the whiteboard in jsdom: boards, presenting, ink, steps, sizing, comparison, the written summary, cluster import |
