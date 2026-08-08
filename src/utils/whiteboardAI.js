/* ============================================================
   whiteboardAI
   LLM plumbing for the Elastic Whiteboard "build with AI" feature.

   The model never decides positions. It chooses SECTIONS (instances of the
   deterministic reference-architecture templates) and the cross-section flows
   between them; whiteboardTemplates.js owns all layout. This module only turns
   the type registry into a catalog, builds the tool schema + system prompt,
   describes the current board, and calls Amazon Bedrock's Converse API with
   SigV4-signed requests straight from the browser.
   ============================================================ */

import { TEMPLATES } from "../data/whiteboardTemplates";
import { SIZING_DEFAULTS, SIZING_PROVIDERS, SIZING_TIERS,
         LICENSE_ERU, LICENSE_ECU } from "./whiteboardSizing";
import { signRequest } from "./awsSigV4";

export const BEDROCK_DEFAULT_MODEL = "global.anthropic.claude-sonnet-4-6";
export const BEDROCK_DEFAULT_REGION = "us-east-1";

/* One field rendered for the catalog. Field keys alone don't tell the model
   what a value means, so each carries its shape: a number's unit (ingest is
   GB/day, retention is days), a boolean toggle, or the exact enum a select
   accepts. `search` fields point at the integration catalog by name rather
   than inlining its ~384 entries — the model supplies a plausible title. */
function describeField(f) {
  if (f.kind === "select" && f.options?.length) return `${f.key}(${f.options.join("|")})`;
  /* a set: any subset of the options, as an array */
  if (f.kind === "chips" && f.options?.length) return `${f.key}[](${f.options.join("|")})`;
  if (f.kind === "search") return `${f.key}(Elastic integration name)`;
  if (f.kind === "toggle") return `${f.key}:bool`;
  if (f.kind === "number") return `${f.key}:num${f.unit ? " " + f.unit : ""}`;
  return `${f.key}:${f.kind}`;
}

/* Compact, model-friendly listing of every component type, grouped by category,
   with each type's configurable fields (key + kind/unit/options) so the model
   can populate node props with values the inspector and rollups understand. */
export function buildCatalog(TYPES) {
  const byCat = {};
  for (const [key, t] of Object.entries(TYPES)) {
    if (t.annotation) continue;            // sticky notes aren't architecture
    const fields = t.fields && t.fields.length ? ` — ${t.fields.map(describeField).join(", ")}` : "";
    (byCat[t.cat] = byCat[t.cat] || []).push(`  ${key} = ${t.label}${fields}`);
  }
  return Object.entries(byCat)
    .map(([cat, items]) => `## ${cat}\n${items.join("\n")}`)
    .join("\n\n");
}

/* Summarise the sections currently tracked on the board (id, template, fill,
   and any per-slot props) so the model can reference them by id to modify or
   remove, and add new ones. Props are included so a section the model "keeps"
   by re-sending it doesn't silently drop the numbers already on its nodes. */
export function describeSections(sections) {
  const ids = Object.keys(sections || {});
  if (!ids.length) return "";
  const fillStr = (fill) => {
    const parts = [];
    for (const [k, v] of Object.entries(fill || {})) {
      if (k === "label") continue;
      parts.push(`${k}=${Array.isArray(v) ? `[${v.join(",")}]` : v}`);
    }
    return parts.join(" ");
  };
  const propsStr = (props) => Object.entries(props || {})
    .map(([slot, vals]) => {
      const kv = Object.entries(vals || {}).map(([k, v]) => `${k}=${v}`).join(" ");
      return kv ? `${slot}: ${kv}` : "";
    })
    .filter(Boolean)
    .join("; ");
  const rows = ids.map((id) => {
    const s = sections[id];
    const label = s.fill?.label ? ` "${s.fill.label}"` : "";
    const props = propsStr(s.props);
    const step = s.step ? ` step=${s.step}` : "";
    return `  ${id}: ${s.template}${label} { ${fillStr(s.fill)} }${props ? ` props{ ${props} }` : ""}${step}`;
  });
  return `\n\nCURRENT SECTIONS (reference these ids to modify; list ids in "remove" to delete; unmentioned sections are kept as-is):\n${rows.join("\n")}`;
}

/* A node's set props rendered compactly for the snapshot: only fields the node
   actually carries (never defaults), formatted with the field's prefix/unit so
   the model reads node counts, hardware, and per-source ingest the way the
   inspector shows them. Empty nodes contribute nothing, keeping the snapshot
   lean on a board that hasn't been sized. */
function propChips(n, TYPES) {
  const out = [];
  for (const f of TYPES[n.type]?.fields || []) {
    const v = n.props?.[f.key];
    if (v === undefined || v === "" || v === false) continue;
    if (Array.isArray(v)) { if (v.length) out.push(`${f.key}=${v.join("+")}`); continue; }
    out.push(f.kind === "toggle" ? f.label : `${f.pre || ""}${v}${f.unit ? " " + f.unit : ""}`);
  }
  return out;
}

/* A short text snapshot of the current board (zones + their member types, the
   props set on each node, and the flows between them) so the model can edit
   incrementally without overwriting node counts, hardware, or ingest volumes
   already on the board. */
export function describeDoc({ nodes = [], edges = [], zones = [] }, TYPES) {
  if (!nodes.length && !zones.length) return "(the board is currently empty)";
  const zoneOf = {};
  for (const n of nodes) {
    const w = n.w || TYPES[n.type]?.w || 180, h = n.h || TYPES[n.type]?.h || 72;
    const cx = n.x + w / 2, cy = n.y + h / 2;
    for (const z of zones) if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) { zoneOf[n.id] = z.id; break; }
  }
  const label = (z) => `"${z.label}"`;
  const member = (n) => {
    const lbl = TYPES[n.type]?.label || n.type;
    const title = n.title && n.title !== lbl ? ` "${n.title}"` : "";
    const chips = propChips(n, TYPES);
    return `${lbl}${title}${chips.length ? ` [${chips.join(", ")}]` : ""}`;
  };
  const zl = zones.map((z) => {
    const members = nodes.filter((n) => zoneOf[n.id] === z.id).map(member);
    return `  ${label(z)}: ${members.join(", ") || "(empty)"}`;
  }).join("\n") || "  (none)";
  const loose = nodes.filter((n) => !zoneOf[n.id]).map(member);
  const nameOf = (id) => {
    const z = zones.find((zz) => zz.id === id);
    if (z) return label(z);
    const n = nodes.find((nn) => nn.id === id);
    return n ? (n.title || TYPES[n.type]?.label || n.type) : id;
  };
  const el = edges.map((e) => `  ${nameOf(e.s)} -> ${nameOf(e.e)}${e.lbl ? ` (${e.lbl})` : ""}`).join("\n") || "  (none)";
  return `Zones:\n${zl}\n\nUngrouped nodes: ${loose.join(", ") || "(none)"}\n\nFlows:\n${el}`;
}

/* The tools the chat can call: edit the diagram, or size a deployment with the
   deterministic sizing engine. The edit tool returns the COMPLETE set of
   sections the model wants on the board plus the cross-section flows; layout
   stays deterministic either way. */
export function buildTool() {
  const templateIds = Object.keys(TEMPLATES);
  return [
    {
      name: "edit_whiteboard",
      description:
        "Design or edit an Elastic architecture diagram by choosing deterministic reference-architecture SECTIONS and the data flows between them. On an empty board, return every section you want. When editing an existing board, only include sections you are ADDING or CHANGING (reference an existing section id to change it, list ids in `remove` to delete); unmentioned sections stay put with the user's manual arrangement preserved. Never specify coordinates or sizes — layout is fully automatic.",
      input_schema: {
        type: "object",
        properties: {
          message: { type: "string", description: "One or two sentence summary of the diagram, shown to the user in the chat." },
          board: {
            type: "string",
            description: "Draw on a NEW separate board with this name instead of the board on screen. Side boards draw immediately (no Apply step); the user opens them from the boards menu, which also compares any two side by side. Use one edit_whiteboard call per design when the user asks for alternatives to compare, each with a name that says what the option is (e.g. 'Option A — hot only'). Omit this to edit the board on screen. To iterate on a side board later, the user has to open it first.",
          },
          sections: {
            type: "array",
            description: "The blocks on the board. Each is an instance of a template placed automatically in stage order (sources -> ingestion -> cluster -> serving).",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Stable id you assign (e.g. 'srcA', 'cluster1'), referenced by edges." },
                template: {
                  type: "string",
                  enum: templateIds,
                  description: [
                    "Which template to instantiate:",
                    "- dataZone: a zone of data sources (left column) feeding collectors/shippers (right column). fill: { label?, sources: [type or \"Custom Name\"], collectors: [type] }. Slots: src0,src1,… and col0,col1,….",
                    "- sharedIngestion: a zone with a vertical stack of shared ingest tools. fill: { label?, tools: [type] } (e.g. agent, logstash, kafka). Slots: tool0,tool1,….",
                    "- cluster: an Elastic cluster zone with data tiers + roles. fill: { label?, tiers: [\"hot\",\"warm\",\"cold\",\"frozen\"], ingest?, coord?, master?, ml?, objectStorage? }. Slots: hot,warm,cold,frozen,ingest,coord,ml,master.",
                    "- userSpace: a serving zone. fill: { label?, consumers: [\"kibana\",\"lb\",\"users\",\"thirdparty\"], idp? }. Slots: kibana,idp,thirdparty,lb,users.",
                    "- management: a zone of orchestration/management nodes (Fleet, ECK, ECE, monitoring cluster). fill: { label?, tools: [type] }. Slots: mgmt0,mgmt1,…. Typically hung under another section with `below`.",
                    "- single: one ungrouped node. fill: { type, title? }. Slot: n.",
                  ].join("\n"),
                },
                label: { type: "string", description: "Optional zone label override." },
                row: { type: "boolean", description: "Set true on tenant sections so they sit side-by-side on one horizontal line (multi-tenant designs)." },
                below: { type: "string", description: "Id of another section this one should hang directly beneath (left-aligned under its zone) instead of taking a lane of its own — e.g. a management/monitoring block under the userSpace." },
                fill: { type: "object", description: "Template-specific contents (see the template descriptions). Component values must be catalog type keys." },
                props: {
                  type: "object",
                  description: "Per-slot node settings, keyed by the template's slot names (listed per template above), each an object of the catalog fields for that node type — e.g. { \"hot\": { \"nodes\": 6, \"mem\": 64, \"capacity\": \"12 TB\" }, \"col0\": { \"count\": 500 } } or a source's { \"integration\": \"Apache HTTP Server\", \"ingest\": 300, \"retention\": 30 }. Set these whenever you know real numbers so the capacity rollup and hardware are accurate.",
                },
                step: {
                  type: "integer",
                  minimum: 1,
                  description: "Build step this section is revealed on while presenting (1-based). Omit for the base layer that is on screen from the start. Only set these when the user asks for a staged or step-by-step reveal.",
                },
              },
              required: ["id", "template"],
            },
          },
          edges: {
            type: "array",
            description: "Cross-section data flows for the CURRENT set of sections (rebuilt each call). Reference a section id (attaches semantically) or 'sectionId.slot' for a specific node.",
            items: {
              type: "object",
              properties: {
                source: { type: "string", description: "Source section id (or 'sectionId.slot')." },
                target: { type: "string", description: "Target section id (or 'sectionId.slot')." },
                label: { type: "string", description: "Optional flow label, e.g. 'logs & metrics'." },
                sourceZone: { type: "boolean", description: "Attach the source end to the section's whole zone box rather than a node inside it — use when the flow concerns the section as a whole (e.g. stack monitoring watching the entire cluster)." },
                targetZone: { type: "boolean", description: "Attach the target end to the section's whole zone box rather than a node inside it." },
              },
              required: ["source", "target"],
            },
          },
          remove: {
            type: "array",
            description: "Ids of existing sections to delete from the board.",
            items: { type: "string" },
          },
        },
        required: ["message"],
      },
    },
    buildSizingTool(),
    buildKnowledgeTool(),
    buildReviewTool(),
    buildIntegrationsTool(),
    buildQuoteTool(),
  ];
}

/* The design review, on demand. The findings already reach the model in the
   board snapshot, but only as of the start of the turn — so it can fix a
   quorum problem and have no way to confirm it worked until the user asks
   again. This closes that loop inside a single turn. */
function buildReviewTool() {
  return {
    name: "review_board",
    description:
      "Run the deterministic design review over the board as it stands and return its findings. Use it to check your own work after staging an edit, or when the user asks what is wrong with the design. Note that a staged change is not on the board until the user applies it, so a review immediately after staging still describes the board they are looking at.",
    input_schema: { type: "object", properties: {} },
  };
}

/* Integration names, from the catalog rather than from memory. The edit tool
   asks the model to set integration: "Apache HTTP Server" without ever
   showing it the 384 entries, so until now it has been guessing at names that
   have to match exactly. */
function buildIntegrationsTool() {
  return {
    name: "lookup_integrations",
    description:
      "Search Elastic's integration catalog for the exact titles to use in a data source's `integration` field. Search before you set one: the value has to match the catalog exactly, and a plausible-sounding name that does not exist is worse than none. Also useful for answering whether Elastic has an integration for a given product.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Product, vendor, or technology to look for — e.g. \"palo alto\", \"kafka\", \"okta\"." },
        category: { type: "string", description: "Optional category filter, e.g. \"security\", \"observability\", \"network\", \"aws\", \"web\", \"database\"." },
      },
      required: ["query"],
    },
  };
}

/* The quote maths that feeds the Pricing and ROM builder, so "what is this at
   list?" is answered by the engine rather than by the model's arithmetic —
   which would have to get the resource-unit rounding right, and wouldn't. */
function buildQuoteTool() {
  return {
    name: "quote_deployment",
    description:
      "Price the deployment currently on the board at list, using the same engine that feeds the Pricing and ROM builder. Handles both meters: Enterprise Resource Units for self-managed, ECE and ECK, and Elastic Consumption Units for Elastic Cloud. Returns the quantity, what it was derived from, and the assumptions behind it. Use it whenever the user asks what something costs — never do this arithmetic yourself.",
    input_schema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          enum: [LICENSE_ERU, LICENSE_ECU],
          description: `Which meter to quote on: "${LICENSE_ERU}" licenses memory as resource units (self-managed, ECE, ECK), "${LICENSE_ECU}" is metered Elastic Cloud consumption. Defaults to whatever the board's capacity panel is set to.`,
        },
        unitPrice: { type: "number", description: "List price per resource unit, if the user gave one. Defaults to the figure on the board." },
        discount: { type: "number", description: "Discount percentage, if the user gave one." },
        ecuTotal: { type: "number", description: `Annual ECU figure from the Elastic Cloud pricing calculator. Required to quote on "${LICENSE_ECU}", since consumption cannot be derived from a diagram.` },
      },
    },
  };
}

/* Retrieval as a tool. The model can talk about Elastic from training, but
   nothing it says that way can be checked; this is the route to a claim with
   a source attached. The scope split matters more than it looks — what the
   customer requires and what Elastic recommends are different kinds of fact,
   and a design conversation goes wrong when they get conflated. */
function buildKnowledgeTool() {
  return {
    name: "search_knowledge",
    description:
      "Search the knowledge base for grounding before making a claim about Elastic, or to find what the customer asked for. Covers Elastic's curated guidance (sizing rules, tier and lifecycle guidance, reference architectures, the reasoning behind each design-review finding, and the licensing models) and any documents attached to this board (an RFP, a requirements sheet, meeting notes). Returns passages, each with the source to cite. Use it whenever the answer should be verifiable rather than remembered, and whenever the user refers to what the customer wants.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What you need to know, in natural language. Terms from the domain work better than a whole sentence." },
        scope: {
          type: "string",
          enum: ["all", "elastic", "customer"],
          description: "Which body to search: \"elastic\" for Elastic's own guidance, \"customer\" for the documents attached to this board, \"all\" for both. Default \"all\".",
        },
      },
      required: ["query"],
    },
  };
}

/* The sizing engine as a tool, so the model can reach the same arithmetic the
   Build dialog runs rather than inventing node counts. The schema mirrors that
   dialog's inputs; anything left out falls back to SIZING_DEFAULTS, and the
   effective input comes back in the result so the model can state what it
   assumed. */
function buildSizingTool() {
  const num = (description) => ({ type: "number", description });
  const flag = (key, description) =>
    [key, { type: "boolean", description: `${description} Default ${SIZING_DEFAULTS[key]}.` }];
  return {
    name: "size_deployment",
    description:
      "Size an Elastic deployment from an ingest volume and a retention policy, then draw it. Runs the deterministic sizing engine (tier ratios, replica maths, HA floors, the six-node dedicated-master rule, Elastic Cloud instance configurations) — use it whenever the user gives volumes and wants a cluster sized, instead of guessing node counts yourself. Returns the resulting topology and the effective inputs, including the defaults it filled in.",
    input_schema: {
      type: "object",
      properties: {
        dailyGB: num("Raw ingest in GB/day. Ignored when `sources` is given."),
        sources: {
          type: "array",
          description: "Per-source ingest, when the user broke the volume down. Each source can carry its own retention, so a short-lived source never reaches the colder tiers.",
          items: {
            type: "object",
            properties: {
              gb: num("Raw ingest for this source, GB/day."),
              days: num("Retention for this source in days. Omit to keep it for the whole policy."),
            },
            required: ["gb"],
          },
        },
        days: {
          type: "object",
          description: "Days held in each tier; data ages through them in order. Set a tier to 0 to leave it out of the design.",
          properties: Object.fromEntries(SIZING_TIERS.map((t) => [t.key,
            num(`Days in the ${t.label.toLowerCase()} tier. Default ${t.days}.`)])),
        },
        provider: {
          type: "string",
          enum: SIZING_PROVIDERS.map(([key]) => key),
          description: `Where the cluster runs. Elastic Cloud providers size against published instance configurations; "selfmanaged" uses tier ratios and EC2 ladders. Default "${SIZING_DEFAULTS.provider}".`,
        },
        region: { type: "string", description: "Elastic Cloud region id (e.g. \"aws-eu-west-3\"), which narrows hardware to what that region offers. Omit for any region." },
        agents: num(`How many hosts ship data with Elastic Agent. 0 leaves agents off the drawing. Default ${SIZING_DEFAULTS.agents}.`),
        users: num(`Concurrent Kibana users, which sizes Kibana. 0 leaves Kibana off the drawing. Default ${SIZING_DEFAULTS.users}.`),
        ...Object.fromEntries([
          flag("logstash", "Put Logstash in front of the cluster, sized from ingest."),
          flag("ml", "Add dedicated machine-learning nodes for inference or anomaly detection."),
          flag("masters", "Allow dedicated master nodes, which join once the data tiers reach six nodes."),
          flag("monitoring", "Draw a separate stack-monitoring deployment."),
        ]),
      },
    },
  };
}

/* The static half of the system prompt: instructions + the component catalog,
   neither of which changes between turns. Kept separate from the board snapshot
   so a cachePoint can sit between them (see chatSystem). No positional/geometry
   rules — the model only picks sections and flows. */
export function systemInstructions(catalog) {
  return `You are an Elastic solutions architect working alongside someone at a whiteboard. You answer their questions and, when they ask for a design, you draw it by calling a tool. Layout is fully automatic — never reason about coordinates, sizes, or arrangement.

Answering vs acting:
- The user describes, changes, or asks you to draw an architecture: call edit_whiteboard.
- The user asks for two or more designs to weigh against each other — alternatives, options, a before and after: one edit_whiteboard call per design, each with its own \`board\` name. They draw immediately on boards of their own; point the user at the boards menu to flip between them or compare two side by side.
- The user gives ingest volumes and retention and wants a cluster sized: call size_deployment, which runs the real sizing engine.
- The user asks a question about Elastic that has a right answer — sizing rules, tiers and lifecycle, reference architectures, why a review finding was raised, how licensing is counted: call search_knowledge first, then answer from what it returns.
- The user asks what is wrong with the design, or you want to check your own work after staging an edit: call review_board.
- The user asks what something costs: call quote_deployment. Never do licensing arithmetic yourself — the resource-unit rounding is easy to get wrong and the engine already gets it right.
- You are about to set an "integration" on a data source: call lookup_integrations first and use a title it returns verbatim.
- The user asks about the board itself, or about what you just did: answer in plain prose and call no tool. The board is theirs; don't redraw it to make a point.
- After a tool runs you are given its result. Say briefly what happened, in one or two sentences, including any assumption the result reports.
- You can call several tools in one turn — look something up, then draw it; stage a change, then review it. Prefer that over promising to do it next time.

Grounding:
- Prefer a retrieved passage over your own recollection. You know a lot about Elastic, but the user cannot check any of it unless it carries a source.
- Cite what you used, inline and in plain language: "Elastic sizes the hot tier at 30:1 (Elastic sizing guidance: data tiers)". Don't append a bibliography — the interface lists the sources under your reply already.
- When the search returns nothing useful, say so and answer from your own knowledge, flagged as such. An unsourced answer offered honestly is fine; an unsourced answer dressed up as a citation is not.
- Search the customer's documents whenever the user mentions what "they" asked for, and keep the two straight: their requirement and Elastic's recommendation are different kinds of fact. Where the design conflicts with something they asked for, say so plainly and cite the document.
- Never cite a source you weren't given, and never state a figure from a document you didn't retrieve.

How to model a design:
- Sources belong in one or more dataZone sections (a tenant/region/environment each gets its own dataZone). Put that tenant's own sources + local collectors there.
- Shared ingest infrastructure (Agent/Fleet, Logstash, Kafka) that many sources funnel through goes in a single sharedIngestion section — not duplicated per tenant.
- Storage is a cluster section. Default tiers are Hot+Cold+Frozen with objectStorage on (Frozen snapshots into it); use only the tiers the workload needs — Security typically Hot+Cold+Frozen, Observability typically Hot+Frozen. Leave ingest and coord OFF unless the user explicitly asks for dedicated ingest/coordinating nodes; the data nodes handle those roles. Turn master ON only once the data tiers total six or more nodes — below that the data nodes carry the master role, so dedicated masters would be wrong. Add ml only when ML is used.
- Serving (Kibana, load balancer, users, third-party) goes in a userSpace section; add idp when SSO/identity is mentioned.
- Monitoring/management (a monitoring cluster, Fleet, ECK/ECE) goes in a management section. When it watches the deployment from the side, set below:<clusterOrUserSpaceId> so it hangs under that section, and pin the flow to the cluster zone with sourceZone:true.
- Multi-tenant designs: create one dataZone per tenant/region/environment and set row:true on each so they line up side-by-side; wire each tenant to the single shared ingestion (or cluster) section with one flow.
- Use 'single' only for a genuinely standalone component between zones (e.g. a lone firewall or buffer).

Sizing:
- Volumes and retention in hand, a cluster to size: call size_deployment rather than doing the arithmetic yourself. It draws the sized architecture, or resizes the cluster already on the board, and reports the tiers, node counts, hardware, and every default it filled in.
- When you know real numbers but aren't sizing a cluster from ingest, set them via each section's "props" (keyed by the slot names listed with each template) so the capacity rollup and hardware are correct — e.g. cluster props { "hot": { "nodes": 6, "mem": 64, "capacity": "12 TB" } }, a source's { "integration": "…", "ingest": 200, "retention": 30 } (ingest in GB/day, retention in days), or userSpace { "users": { "users": 500 } }. Don't invent numbers the user didn't give; leave props off when unsized.

Staging a reveal:
- Asked to build the diagram up in steps for a walkthrough, put a "step" on each section: the data flow makes the natural order, so sources first, then ingestion, then the cluster, then serving and monitoring. Sections without a step are the base layer, on screen from the start.
- Keep it to as many steps as the story needs — usually one section per step, or one step per stage on a large board.

Flows (edges):
- Draw ONE representative flow between sections, referencing section ids: dataZone -> sharedIngestion -> cluster -> userSpace. Do not draw one edge per source; internal fan-in is already handled inside each section.
- Flows attach to the right node automatically: into a cluster lands on its ingest node, out of a cluster leaves via the coordinating node, and into user space lands on Kibana. Just reference the section ids.
- Only use 'sectionId.slot' when a flow must target a specific node (rare).
- Terminate the flow at a consumer (the userSpace section).

Editing:
- Empty board: return all the sections the design needs.
- Existing board: include ONLY the sections you are adding or changing. To change a section, reuse its id with the new fill. To delete one, put its id in "remove". Sections you don't mention are kept exactly where the user placed them, so don't resend unchanged sections.
- Always include the full "edges" list for the resulting set of sections, and a brief "message" describing what you did.

CATALOG (type key = label; component values in fills must be these keys):
${catalog}`;
}

/* The dynamic half: what is on the board right now, whatever the
   deterministic design review has to say about it, and — when the board
   carries them — the customer details imported from Salesforce. Separate
   from the instructions so it can sit after a cachePoint. */
export function boardContext(docDescription, warnings = [], customerText = "") {
  const customer = customerText
    ? `\n\nCUSTOMER (imported from Salesforce; deal context for your reasoning — never volunteer deal value or qualification detail in customer-facing text):\n${customerText}`
    : "";
  return `CURRENT BOARD:
${docDescription}${describeFindings(warnings)}${customer}`;
}

/* Instructions, catalog, and board snapshot as one string — the shape the
   prompt took before caching split it in two. */
export const systemPrompt = (catalog, docDescription, warnings) =>
  `${systemInstructions(catalog)}\n\n${boardContext(docDescription, warnings)}`;

/* System blocks for a chat turn. Everything before the cachePoint is identical
   between turns, so Bedrock can serve it from its prompt cache; the board
   snapshot changes with every edit and therefore sits after it. Bedrock
   evaluates cachePoints in tools -> system -> messages order and chains them,
   so this only pays off while the tool definitions above it stay static. */
export const chatSystem = (catalog, docDescription, warnings, customerText) => [
  { text: systemInstructions(catalog) },
  { cachePoint: { type: "default" } },
  { text: boardContext(docDescription, warnings, customerText) },
];

/* Review findings, formatted the same way for the chat snapshot and the
   written summary, so the model reads one shape of finding. */
const findingLines = (warnings = []) =>
  warnings.map((w) => `  [${w.level}] ${w.title}: ${w.detail}`);

export function describeFindings(warnings = []) {
  if (!warnings.length) return "";
  return `\n\nREVIEW FINDINGS (from the deterministic design review that runs over the board; the user may ask you to fix these):\n${findingLines(warnings).join("\n")}`;
}

/* ---------------- Bedrock Converse ---------------- */

/* Converse takes messages as content-block arrays and the system prompt as
   its own top-level field. Our chat history keeps plain-string content, so
   it converts here. */
export const toConverseMessages = (messages = []) =>
  messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? [{ text: m.content }] : m.content,
  }));

/* Our tool definitions are kept in the classic { name, description,
   input_schema } shape; Converse wants them wrapped as toolSpec entries. */
export const toConverseTools = (tools = []) =>
  tools.map((t) => ({
    toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.input_schema } },
  }));

/* The system field is a block array. Callers pass either one string or the
   blocks themselves (text + cachePoint), so both shapes normalise here. */
export const toConverseSystem = (system) =>
  (Array.isArray(system) ? system : [system])
    .map((block) => (typeof block === "string" ? { text: block } : block))
    .filter(Boolean);

/* Bedrock throttles in tokens per minute, and one chat turn is several large
   sequential Converse calls — so a 429 (or a server-side 5xx hiccup) mid-turn
   is transient, not wrong. Two pauses absorb a burst; a failure that outlives
   them surfaces as the real error. `cfg.onRetry` lets the UI narrate the wait. */
const RETRY_PAUSES_MS = [1200, 3000];
const retryable = (status) => status === 429 || status >= 500;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* POST a SigV4-signed Converse request and hand back the parsed body,
   turning transport, credential, and API failures into one readable error. */
async function converseRequest(cfg, body) {
  const { region, accessKeyId, secretAccessKey, sessionToken, model, onRetry } = cfg;
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/converse`;
  const payload = JSON.stringify(body);

  let headers;
  try {
    headers = await signRequest({
      method: "POST", url, region, service: "bedrock",
      accessKeyId, secretAccessKey, sessionToken,
      headers: { "content-type": "application/json" }, body: payload,
    });
  } catch (e) {
    throw new Error(`Could not sign the Bedrock request (${e.message}).`);
  }

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { method: "POST", headers, body: payload });
    } catch (e) {
      throw new Error(`Network error reaching Bedrock in ${region} (${e.message}). Check your connection and the region.`);
    }
    if (res.ok) return res.json();

    if (retryable(res.status) && attempt < RETRY_PAUSES_MS.length) {
      onRetry?.({ status: res.status, attempt: attempt + 1 });
      await pause(RETRY_PAUSES_MS[attempt]);
      continue;
    }

    let detail = `HTTP ${res.status}`;
    try { const j = await res.json(); detail = j?.message || j?.Message || detail; } catch { /* non-JSON */ }
    if (res.status === 403) detail += " — check the access key, secret, and session token (Settings ⚙).";
    if (res.status === 400 && /model/i.test(detail)) detail += ` — check that "${model}" is available in ${region}.`;
    if (res.status === 429) detail += " — Bedrock is rate-limiting this account and it outlasted the retries; wait a few seconds and send it again.";
    throw new Error(detail);
  }
}

/* One assistant turn, read out of a Converse response: the prose it wrote, the
   tools it wants to run, the raw content blocks (which have to go back verbatim
   when the conversation continues), and the token usage. Nothing is required —
   a turn with only text is a perfectly good answer. */
function readTurn(data) {
  const blocks = data?.output?.message?.content || [];
  const toolUses = blocks.filter((b) => b.toolUse).map((b) => b.toolUse);
  return {
    text: blocks.map((b) => b.text || "").join("").trim(),
    toolUse: toolUses[0] || null,
    toolUses,
    blocks,
    usage: data?.usage || null,
  };
}

/* Call Bedrock Converse with the tools available but not forced, so the model
   can answer a question instead of editing the board. */
export async function callBedrock({ system, messages, tools, ...cfg }) {
  const data = await converseRequest(cfg, {
    system: toConverseSystem(system),
    messages: toConverseMessages(messages),
    inferenceConfig: { maxTokens: 4096 },
    ...(tools && tools.length
      ? { toolConfig: { tools: toConverseTools(tools), toolChoice: { auto: {} } } }
      : {}),
  });
  return readTurn(data);
}

/* Ask for prose rather than a board edit — used for the written summary. */
export async function callBedrockText({ system, messages, ...cfg }) {
  const { text } = readTurn(await converseRequest(cfg, {
    system: toConverseSystem(system),
    messages: toConverseMessages(messages),
    inferenceConfig: { maxTokens: 4096 },
  }));
  if (!text) throw new Error("The model returned an empty response.");
  return text;
}

/* Cache hits and writes are the point of the cachePoint blocks, so the counts
   are summed across the loop and surfaced in the UI. A model that doesn't
   support caching simply reports neither field. */
const USAGE_KEYS = ["inputTokens", "outputTokens", "cacheReadInputTokens", "cacheWriteInputTokens"];
const addUsage = (into, from) => {
  for (const key of USAGE_KEYS) if (typeof from?.[key] === "number") into[key] += from[key];
  return into;
};

/* A tool's outcome goes back as JSON: readable to the model, and no second
   prose format to keep in step with the UI. */
const toolResultBlock = (toolUseId, result) => ({
  toolResult: {
    toolUseId,
    content: [{ text: JSON.stringify(result) }],
    ...(result.ok === false ? { status: "error" } : {}),
  },
});

/* Bounded act-then-narrate loop. Each tool the model calls is dispatched by
   `onToolUse`, its result appended to the conversation, and the model called
   again so it can see what actually happened and say so. Capped, because a
   model that keeps calling tools would otherwise never hand back.

   Five allows the longest chain the tools are meant to support — retrieve,
   look up an integration, draw, review the result, then narrate — while still
   ending the turn if the model gets into a loop. */
export const TOOL_LOOP_MAX_TURNS = 5;

export async function runToolLoop({ system, messages, tools, onToolUse, onStep,
                                   maxTurns = TOOL_LOOP_MAX_TURNS, ...cfg }) {
  const convo = toConverseMessages(messages);
  const calls = [];
  const usage = Object.fromEntries(USAGE_KEYS.map((k) => [k, 0]));
  let text = "";
  for (let turn = 0; turn < maxTurns; turn++) {
    /* Narrate the loop as it runs — `model` while a Converse call is in
       flight, `tool` when the model asks for one, `result` when it returns —
       so the UI can show the agent working instead of a blank spinner. */
    onStep?.({ kind: "model", turn });
    const out = await callBedrock({
      ...cfg, system, messages: convo, tools,
      onRetry: (r) => onStep?.({ kind: "retry", ...r }),
    });
    addUsage(usage, out.usage);
    if (out.text) text = out.text;
    if (!out.toolUses.length) break;
    /* A turn can ask for several tools at once. Every toolUse Id in the
       assistant message must come back with a matching toolResult, or Bedrock
       rejects the whole conversation — so all of them run, in order. */
    const resultBlocks = [];
    for (const use of out.toolUses) {
      onStep?.({ kind: "tool", name: use.name, input: use.input });
      const result = (await onToolUse?.(use)) || { ok: true };
      onStep?.({ kind: "result", name: use.name, ok: result.ok !== false });
      calls.push({ name: use.name, input: use.input, result });
      resultBlocks.push(toolResultBlock(use.toolUseId, result));
    }
    convo.push({ role: "assistant", content: out.blocks });
    convo.push({ role: "user", content: resultBlocks });
  }
  return { text, calls, usage };
}

/* Dispatcher: validates the Bedrock credentials, then runs the chat's tool
   loop, a single turn, or (`text: true`) a plain prose completion. */
export async function runLLM(cfg, payload, { text = false, loop = false } = {}) {
  if (!cfg.accessKeyId || !cfg.secretAccessKey)
    throw new Error("Add your AWS access key and secret in settings (⚙).");
  const call = loop ? runToolLoop : text ? callBedrockText : callBedrock;
  return call({
    region: cfg.region || BEDROCK_DEFAULT_REGION,
    model: cfg.model || BEDROCK_DEFAULT_MODEL,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    sessionToken: cfg.sessionToken || undefined,
    ...payload,
  });
}

/* ---------------- written summary ---------------- */

/* One whiteboard session is worth several written artifacts, and they all come
   from the same facts (see summaryPrompt) — only the brief changes. Every
   genre inherits the same discipline: facts in, no invention. */
const SUMMARY_RULES = `Write in plain, specific prose. Use the facts you are given and nothing else — never invent components, numbers, or requirements that aren't in the board description. If something important is missing from the design, say so plainly rather than filling the gap.

No preamble, no sign-off you weren't asked for, no markdown headings.`;

/* `hint` is for the picker: what you get, in one line, since the choice is made
   before anything is written and the labels alone don't settle it. */
const summaryGenre = (label, hint, brief) =>
  ({ label, hint, system: `${brief}\n\n${SUMMARY_RULES}` });

export const SUMMARY_PROMPTS = {
  note: summaryGenre("Follow-up note",
    "The internal write-up: what the architecture does, how it's sized, what's still open.",
    `You are an Elastic solutions architect writing the follow-up note after a whiteboard session with a customer.

Structure the note as:
- One short paragraph describing what the architecture does, following the data from ingest through to the people using it.
- A paragraph on sizing, if node counts or capacity are given.
- A short list of open questions or risks, drawn from the review findings and anything the diagram leaves undecided.

Around 200 words, for a technical audience.`),

  email: summaryGenre("Customer email",
    "The same session addressed to the room, with a subject line and one clear ask.",
    `You are an Elastic solutions architect writing the email that goes to the customer after a whiteboard session.

Address the reader directly and warmly, without being effusive. Open by recapping what you designed together in one or two sentences, then cover the shape of the deployment and its sizing in a short paragraph each, then say what you need from them next. Keep the technical detail to what a sponsor who wasn't in the room would follow.

Around 200 words, ending with one clear ask. Include a subject line as the first line.`),

  questions: summaryGenre("Discovery questions",
    "What still has to be asked before the design can be finished, and why each matters.",
    `You are an Elastic solutions architect deciding what still has to be asked after a whiteboard session.

List the questions the design cannot be finished without, most consequential first. Each is one sentence, followed by a short clause saying why it matters — which decision it unblocks or which risk it closes. Draw them from what the diagram leaves undecided and from the review findings; skip anything the board already answers.

Eight questions at most, as a plain list.`),

  risks: summaryGenre("Risks & assumptions",
    "What the sizing rests on, and what happens if any of it turns out to be wrong.",
    `You are an Elastic solutions architect recording the risks and assumptions behind a whiteboard design, for the account team.

Two plain lists. First the assumptions the design rests on — the numbers, retention, and behaviour that were taken as given and would change the sizing if wrong. Then the risks, each with the consequence if it lands and, where the board suggests one, the mitigation. Every review finding belongs in one list or the other.

Specific and short: no risk registers, no severity scores.`),

  sow: summaryGenre("SoW outline",
    "The work the design implies: scope, phases, who delivers what, and on what assumptions.",
    `You are an Elastic solutions architect outlining the statement of work implied by a whiteboard design.

Cover, in this order: the scope of what gets built, the phases of work in delivery order, what Elastic delivers in each, what the customer is responsible for, and the assumptions the estimate depends on. Phases follow the data flow — ingest and collection, cluster build, then serving and operations.

An outline, not a contract: short phrases under plain headings, no legal language, no dates or prices unless the facts give them.`),
};

export const SUMMARY_DEFAULT = "note";

/* The follow-up note's brief, still exported under its original name for
   callers that only ever wanted that one genre. */
export const SUMMARY_SYSTEM = SUMMARY_PROMPTS[SUMMARY_DEFAULT].system;

export const summarySystem = (genre) =>
  (SUMMARY_PROMPTS[genre] || SUMMARY_PROMPTS[SUMMARY_DEFAULT]).system;

export function summaryPrompt({ board, totals, warnings = [], boardName }) {
  const facts = [`BOARD: ${boardName || "Untitled"}`, "", board];

  if (totals && (totals.count || totals.storageTB || totals.mem)) {
    const tiers = (totals.tiers || [])
      .map((t) => `${t.label}: ${t.count} node${t.count === 1 ? "" : "s"}`)
      .join(", ");
    facts.push("", "SIZING:",
      `  ${totals.count || 0} nodes, ${totals.cpu || 0} vCPU, ${totals.mem || 0} GB RAM`,
      ...(tiers ? [`  tiers — ${tiers}`] : []),
      ...(totals.storageTB ? [`  storage — ${totals.storageTB.toFixed(1)} TB across the tiers`] : []));
  }

  if (warnings.length) facts.push("", "REVIEW FINDINGS:", ...findingLines(warnings));

  return facts.join("\n");
}

/* ---------------- follow-up artifact ---------------- */

/* The recap that leaves the building: it travels next to an image of the
   final board, addressed to the customer, so its rules are stricter than the
   internal genres — and unlike them it is allowed section headings, because
   the artifact renders them. */
export const FOLLOWUP_SYSTEM = `You are an Elastic solutions architect writing the recap that goes to the customer after a whiteboard session. It will sit under an image of the final board.

Write these sections, each under a markdown ## heading:
- "What we walked through" — one short paragraph following the data through the architecture, from collection to the people using it.
- "Decisions" — a short list of what the conversation actually settled. Only genuine decisions from the transcript; if nothing was decided, say so in one line.
- "Open questions" — a short list of what still needs an answer, drawn from the conversation and the review findings.
- "Next steps" — two or three concrete actions with an owner each.

Write in plain, specific prose for a customer audience. Use the facts and conversation you are given and nothing else — never invent components, numbers, decisions, or requirements. Internal deal details (deal value, qualification scores, support history) do not belong in this document even where the facts mention them.

No top-level title, no preamble, no sign-off.`;

const clipTurn = (text, max = 600) =>
  (text.length > max ? `${text.slice(0, max)} …` : text);

export function followupPrompt({ boardName, board, totals, warnings = [], transcript = [], customer }) {
  const facts = [summaryPrompt({ board, totals, warnings, boardName })];
  if (customer?.account || customer?.opportunity) {
    facts.push("", "CUSTOMER:",
      ...(customer.account ? [`  account — ${customer.account}`] : []),
      ...(customer.opportunity ? [`  opportunity — ${customer.opportunity}`] : []));
  }
  if (transcript.length)
    facts.push("", "CONVERSATION (architect and assistant, during the session):",
      ...transcript.map((m) =>
        `  ${m.role === "user" ? "architect" : "assistant"}: ${clipTurn(String(m.text || "").replace(/\s+/g, " ").trim())}`));
  return facts.join("\n");
}
