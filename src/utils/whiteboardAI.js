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
    return `  ${id}: ${s.template}${label} { ${fillStr(s.fill)} }${props ? ` props{ ${props} }` : ""}`;
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

/* Anthropic tool definition. The model returns the COMPLETE set of sections it
   wants on the board plus the cross-section flows; layout is deterministic. */
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
  ];
}

/* System prompt: instructions + component catalog + current board snapshot.
   No positional/geometry rules — the model only picks sections and flows. */
export function systemPrompt(catalog, docDescription) {
  return `You design Elastic architecture diagrams by calling the edit_whiteboard tool. You choose deterministic reference-architecture SECTIONS and the flows between them. Layout is fully automatic — never reason about coordinates, sizes, or arrangement.

How to model a design:
- Sources belong in one or more dataZone sections (a tenant/region/environment each gets its own dataZone). Put that tenant's own sources + local collectors there.
- Shared ingest infrastructure (Agent/Fleet, Logstash, Kafka) that many sources funnel through goes in a single sharedIngestion section — not duplicated per tenant.
- Storage is a cluster section. Default tiers are Hot+Cold+Frozen with objectStorage on (Frozen snapshots into it); use only the tiers the workload needs — Security typically Hot+Cold+Frozen, Observability typically Hot+Frozen. Leave ingest and coord OFF unless the user explicitly asks for dedicated ingest/coordinating nodes; the data nodes handle those roles. Turn master ON only once the data tiers total six or more nodes — below that the data nodes carry the master role, so dedicated masters would be wrong. Add ml only when ML is used.
- Serving (Kibana, load balancer, users, third-party) goes in a userSpace section; add idp when SSO/identity is mentioned.
- Monitoring/management (a monitoring cluster, Fleet, ECK/ECE) goes in a management section. When it watches the deployment from the side, set below:<clusterOrUserSpaceId> so it hangs under that section, and pin the flow to the cluster zone with sourceZone:true.
- Multi-tenant designs: create one dataZone per tenant/region/environment and set row:true on each so they line up side-by-side; wire each tenant to the single shared ingestion (or cluster) section with one flow.
- Use 'single' only for a genuinely standalone component between zones (e.g. a lone firewall or buffer).

Sizing:
- When you know real numbers, set them via each section's "props" (keyed by the slot names listed with each template) so the capacity rollup and hardware are correct — e.g. cluster props { "hot": { "nodes": 6, "mem": 64, "capacity": "12 TB" } }, a source's { "integration": "…", "ingest": 200, "retention": 30 } (ingest in GB/day, retention in days), or userSpace { "users": { "users": 500 } }. Don't invent numbers the user didn't give; leave props off when unsized.

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
${catalog}

CURRENT BOARD:
${docDescription}`;
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

/* POST a SigV4-signed Converse request and hand back the parsed body,
   turning transport, credential, and API failures into one readable error. */
async function converseRequest(cfg, body) {
  const { region, accessKeyId, secretAccessKey, sessionToken, model } = cfg;
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

  let res;
  try {
    res = await fetch(url, { method: "POST", headers, body: payload });
  } catch (e) {
    throw new Error(`Network error reaching Bedrock in ${region} (${e.message}). Check your connection and the region.`);
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const j = await res.json(); detail = j?.message || j?.Message || detail; } catch { /* non-JSON */ }
    if (res.status === 403) detail += " — check the access key, secret, and session token (Settings ⚙).";
    if (res.status === 400 && /model/i.test(detail)) detail += ` — check that "${model}" is available in ${region}.`;
    throw new Error(detail);
  }
  return res.json();
}

/* Call Bedrock Converse with a forced edit_whiteboard tool and return the
   tool input. Throws a readable error on failure. */
export async function callBedrock({ system, messages, tools, ...cfg }) {
  const data = await converseRequest(cfg, {
    system: [{ text: system }],
    messages: toConverseMessages(messages),
    inferenceConfig: { maxTokens: 4096 },
    toolConfig: { tools: toConverseTools(tools), toolChoice: { tool: { name: "edit_whiteboard" } } },
  });
  const blocks = data?.output?.message?.content || [];
  const tu = blocks.find((b) => b.toolUse)?.toolUse;
  if (!tu || !tu.input) throw new Error("The model did not return a whiteboard edit.");
  return tu.input;
}

/* Ask for prose rather than a board edit — used for the written summary. */
export async function callBedrockText({ system, messages, ...cfg }) {
  const data = await converseRequest(cfg, {
    system: [{ text: system }],
    messages: toConverseMessages(messages),
    inferenceConfig: { maxTokens: 4096 },
  });
  const blocks = data?.output?.message?.content || [];
  const text = blocks.map((b) => b.text || "").join("").trim();
  if (!text) throw new Error("The model returned an empty response.");
  return text;
}

/* Dispatcher: validates the Bedrock credentials, then asks for either the
   forced tool call or (`text: true`) plain prose. */
export async function runLLM(cfg, payload, { text = false } = {}) {
  if (!cfg.accessKeyId || !cfg.secretAccessKey)
    throw new Error("Add your AWS access key and secret in settings (⚙).");
  const call = text ? callBedrockText : callBedrock;
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

/* Turn the board and its rollups into the follow-up note an SA would send
   after the whiteboard session. The model gets facts only — it writes them up,
   it doesn't invent architecture. */
export const SUMMARY_SYSTEM = `You are an Elastic solutions architect writing the follow-up note after a whiteboard session with a customer.

Write in plain, specific prose for a technical audience. Use the facts you are given and nothing else — never invent components, numbers, or requirements that aren't in the board description. If something important is missing from the design, say so plainly rather than filling the gap.

Structure the note as:
- One short paragraph describing what the architecture does, following the data from ingest through to the people using it.
- A paragraph on sizing, if node counts or capacity are given.
- A short list of open questions or risks, drawn from the review findings and anything the diagram leaves undecided.

No preamble, no sign-off, no markdown headings. Around 200 words.`;

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

  if (warnings.length) {
    facts.push("", "REVIEW FINDINGS:",
      ...warnings.map((w) => `  [${w.level}] ${w.title}: ${w.detail}`));
  }

  return facts.join("\n");
}
