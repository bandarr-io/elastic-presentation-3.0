/* ============================================================
   whiteboardAI
   LLM plumbing for the Elastic Whiteboard "build with AI" feature.

   The model never decides positions. It chooses SECTIONS (instances of the
   deterministic reference-architecture templates) and the cross-section flows
   between them; whiteboardTemplates.js owns all layout. This module only turns
   the type registry into a catalog, builds the tool schema + system prompt,
   describes the current board, and calls the provider (Anthropic or an
   OpenAI-compatible proxy).
   ============================================================ */

import { TEMPLATES } from "../data/whiteboardTemplates";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

/* Compact, model-friendly listing of every component type, grouped by category,
   with each type's configurable field keys. Used to populate template fills. */
export function buildCatalog(TYPES) {
  const byCat = {};
  for (const [key, t] of Object.entries(TYPES)) {
    const fields = t.fields && t.fields.length ? ` — fields: ${t.fields.map((f) => f.key).join(", ")}` : "";
    (byCat[t.cat] = byCat[t.cat] || []).push(`  ${key} = ${t.label}${fields}`);
  }
  return Object.entries(byCat)
    .map(([cat, items]) => `## ${cat}\n${items.join("\n")}`)
    .join("\n\n");
}

/* Summarise the sections currently tracked on the board (id, template, fill) so
   the model can reference them by id to modify or remove, and add new ones. */
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
  const rows = ids.map((id) => {
    const s = sections[id];
    const label = s.fill?.label ? ` "${s.fill.label}"` : "";
    return `  ${id}: ${s.template}${label} { ${fillStr(s.fill)} }`;
  });
  return `\n\nCURRENT SECTIONS (reference these ids to modify; list ids in "remove" to delete; unmentioned sections are kept as-is):\n${rows.join("\n")}`;
}

/* A short text snapshot of the current board (zones + their member types and
   the flows between them) so the model can edit incrementally. */
export function describeDoc({ nodes = [], edges = [], zones = [] }, TYPES) {
  if (!nodes.length && !zones.length) return "(the board is currently empty)";
  const zoneOf = {};
  for (const n of nodes) {
    const w = n.w || TYPES[n.type]?.w || 180, h = n.h || TYPES[n.type]?.h || 72;
    const cx = n.x + w / 2, cy = n.y + h / 2;
    for (const z of zones) if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) { zoneOf[n.id] = z.id; break; }
  }
  const label = (z) => `"${z.label}"`;
  const zl = zones.map((z) => {
    const members = nodes.filter((n) => zoneOf[n.id] === z.id).map((n) => TYPES[n.type]?.label || n.type);
    return `  ${label(z)}: ${members.join(", ") || "(empty)"}`;
  }).join("\n") || "  (none)";
  const loose = nodes.filter((n) => !zoneOf[n.id]).map((n) => TYPES[n.type]?.label || n.type);
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
                    "- dataZone: a zone of data sources (left column) feeding collectors/shippers (right column). fill: { label?, sources: [type or \"Custom Name\"], collectors: [type] }.",
                    "- sharedIngestion: a zone with a vertical stack of shared ingest tools. fill: { label?, tools: [type] } (e.g. agent, logstash, kafka).",
                    "- cluster: an Elastic cluster zone with data tiers + roles. fill: { label?, tiers: [\"hot\",\"warm\",\"cold\",\"frozen\"], ingest?, coord?, master?, ml?, objectStorage? }.",
                    "- userSpace: a serving zone. fill: { label?, consumers: [\"kibana\",\"lb\",\"users\"], idp? }.",
                    "- single: one ungrouped node. fill: { type, title? }.",
                  ].join("\n"),
                },
                label: { type: "string", description: "Optional zone label override." },
                row: { type: "boolean", description: "Set true on tenant sections so they sit side-by-side on one horizontal line (multi-tenant designs)." },
                fill: { type: "object", description: "Template-specific contents (see the template descriptions). Component values must be catalog type keys." },
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
- Storage is a cluster section. Use tiers only when relevant: Security typically Hot+Cold+Frozen, Observability typically Hot+Frozen. Include ingest/coord/master by default; add ml only when ML is used; add objectStorage when snapshots/frozen are discussed.
- Serving (Kibana, load balancer, users, third-party) goes in a userSpace section; add idp when SSO/identity is mentioned.
- Multi-tenant designs: create one dataZone per tenant/region/environment and set row:true on each so they line up side-by-side; wire each tenant to the single shared ingestion (or cluster) section with one flow.
- Use 'single' only for a genuinely standalone component between zones (e.g. a lone firewall or buffer).

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

/* Call Anthropic's Messages API from the browser (BYO key) and return the
   forced edit_whiteboard tool input. Throws a readable error on failure. */
export async function callClaude({ apiKey, model, system, messages, tools }) {
  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages,
        tools,
        tool_choice: { type: "tool", name: "edit_whiteboard" },
      }),
    });
  } catch (e) {
    throw new Error(`Network error reaching Anthropic (${e.message}). Check your connection.`);
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const j = await res.json(); detail = j?.error?.message || detail; } catch { /* non-JSON */ }
    throw new Error(detail);
  }
  const data = await res.json();
  const tu = (data.content || []).find((b) => b.type === "tool_use");
  if (!tu || !tu.input) throw new Error("Claude did not return a whiteboard edit.");
  return tu.input;
}

/* Convert the Anthropic tool definition to OpenAI function-tool shape. */
export function toOpenAITools(tools) {
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

/* Accept a base URL or a full completions URL and normalize to the
   OpenAI-compatible chat completions endpoint. */
function normalizeProxyUrl(url) {
  const u = String(url || "").trim().replace(/\/+$/, "");
  if (!u) return u;
  if (u.endsWith("/chat/completions")) return u;
  if (/\/v\d+$/.test(u)) return `${u}/chat/completions`;
  return `${u}/v1/chat/completions`;
}

/* Call an OpenAI-compatible proxy (e.g. LiteLLM) with a Bearer token, using
   function-calling to force the structured edit_whiteboard output. */
export async function callProxy({ url, token, model, system, messages, tools }) {
  const endpoint = normalizeProxyUrl(url);
  const oaMessages = [{ role: "system", content: system }, ...messages];
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: oaMessages,
        tools: toOpenAITools(tools),
        tool_choice: { type: "function", function: { name: "edit_whiteboard" } },
      }),
    });
  } catch (e) {
    throw new Error(`Network error reaching proxy (${e.message}). Check the endpoint URL / CORS.`);
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const j = await res.json(); detail = j?.error?.message || j?.message || detail; } catch { /* non-JSON */ }
    if (res.status === 404 || res.status === 400 || /model/i.test(detail)) {
      detail += ` — check that the model "${model}" is available on this proxy (Settings ⚙).`;
    }
    throw new Error(detail);
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  const call = msg?.tool_calls && msg.tool_calls[0];
  let raw = call?.function?.arguments;
  if (raw == null && typeof msg?.content === "string") raw = msg.content; // fallback: JSON in content
  if (raw == null) throw new Error("Proxy did not return a whiteboard edit (no tool call).");
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new Error("Could not parse the model's tool arguments as JSON.");
  }
}

/* Provider dispatcher: routes to Anthropic direct or an OpenAI-compatible proxy. */
export async function runLLM(cfg, payload) {
  if (cfg.provider === "proxy") {
    if (!cfg.proxyUrl || !cfg.proxyToken) throw new Error("Set the proxy endpoint URL and token in settings (⚙).");
    return callProxy({ url: cfg.proxyUrl, token: cfg.proxyToken, model: cfg.model, ...payload });
  }
  if (!cfg.apiKey) throw new Error("Add your Anthropic API key in settings (⚙).");
  return callClaude({ apiKey: cfg.apiKey, model: cfg.model, ...payload });
}
