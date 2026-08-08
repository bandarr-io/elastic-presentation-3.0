/* ============================================================
   whiteboardElastic
   Elastic, called straight from the browser: an Agent Builder agent for
   retrieval, and Elasticsearch for putting the corpus somewhere the agent can
   reach it.

   No proxy and no backend. The user brings their own endpoint and API key,
   stored in this browser exactly as the Bedrock credentials already are. That
   is a deliberate trade — hive-mind's integration pattern says keep keys on a
   backend, and there is no backend here to keep them on. The mitigations are a
   read-only key for retrieval and an origin-scoped CORS policy rather than a
   wildcard; the app holds nothing else worth taking.

   The cost of skipping the proxy is CORS, which has to be enabled once on the
   deployment. A blocked preflight reaches JavaScript as a bare TypeError with
   nothing in it, so corsHelp() below turns that dead end into the exact
   settings to paste. See the READMEs.
   ============================================================ */

export const ELASTIC_DEFAULT_AGENT = "elastic-ai-agent";
export const ELASTIC_DEFAULT_INDEX = "whiteboard-knowledge";

/* Kibana rejects any POST without this, whatever the auth, and answers with a
   400 that doesn't say so. hive-mind calls it the most common first-time
   gotcha; it costs one header to never hit it. */
const XSRF = { "kbn-xsrf": "true" };

const trimSlash = (url) => String(url || "").trim().replace(/\/+$/, "");

/* Kibana spaces prefix the whole API path. Left out when the deployment uses
   the default space, which is the common case. */
export const kibanaPath = (space, path) => {
  const prefix = String(space || "").trim();
  return prefix && prefix !== "default" ? `/s/${encodeURIComponent(prefix)}${path}` : path;
};

const authHeaders = (apiKey) => ({
  Authorization: `ApiKey ${String(apiKey || "").trim()}`,
  "Content-Type": "application/json",
});

/* ---------------- errors ---------------- */

/* Serverless projects live on *.elastic.cloud; hosted deployments are
   *.elastic-cloud.com or *.found.io. The distinction matters because the two
   have opposite answers to a blocked preflight. */
export const isServerlessHost = (url) => {
  let host;
  try { host = new URL(String(url)).hostname; } catch { return false; }
  return host.endsWith(".elastic.cloud");
};

/* The settings that make a browser-direct call possible, with the caller's own
   origin already in them. Printed on the failure that means they're missing,
   so the fix is a copy-paste rather than a search.

   Serverless has no equivalent: there are no user settings to put these in,
   and the endpoints send no CORS headers of their own, so a browser cannot
   reach them at all. Saying so beats printing a fix that cannot be applied. */
export function corsHelp(target, origin, url) {
  const here = origin || "your deployment";
  if (isServerlessHost(url)) return [
    "This is a Serverless project, which cannot be called from a browser:",
    "it exposes no CORS settings and sends no CORS headers, so the request is",
    "blocked before it leaves the page. Nothing can be configured to fix it.",
    "",
    "Either point this at a hosted Elastic Cloud deployment, where CORS can be",
    "enabled in user settings, or leave Elastic disconnected — the knowledge",
    "tools fall back to the corpus in the app and say so in the citation.",
  ].join("\n");
  return target === "kibana"
    ? [
      "Kibana user settings (Elastic Cloud: deployment → Edit → Kibana user settings):",
      "",
      "server.cors.enabled: true",
      `server.cors.allowOrigin: ["${here}"]`,
    ].join("\n")
    : [
      "Elasticsearch user settings (Elastic Cloud: deployment → Edit → Manage user settings):",
      "",
      "http.cors.enabled: true",
      `http.cors.allow-origin: "${here}"`,
      "http.cors.allow-methods: OPTIONS, HEAD, GET, POST, PUT",
      "http.cors.allow-headers: Authorization, Content-Type, Accept, X-Requested-With",
    ].join("\n");
}

/* An error carrying which of the four failure modes it was, so the pre-flight
   check and the chat can say something more useful than "it didn't work". */
export class ElasticError extends Error {
  constructor(message, { kind, status, target, help } = {}) {
    super(message);
    this.name = "ElasticError";
    this.kind = kind;              // "cors" | "auth" | "request" | "network" | "server"
    this.status = status;
    this.target = target;          // "kibana" | "elasticsearch"
    this.help = help;
  }
}

/* fetch rejects identically for a blocked preflight and an unreachable host —
   a TypeError with no status and no body, by design, since letting a page
   distinguish them would leak information about the network it sits in. On a
   hosted deployment the missing CORS setting is far likelier than a dead
   endpoint; on serverless it is the only possibility, and no setting fixes
   it, so the two cases lead with different sentences. */
const transportFailure = (target, url, origin) => new ElasticError(
  isServerlessHost(url)
    ? `${target === "kibana" ? "Kibana" : "Elasticsearch"} at ${url} is a Serverless project, `
      + "and Serverless cannot be called from a browser: it sends no CORS headers and offers no "
      + "setting to turn them on, so the request never leaves the page."
    : `Couldn't reach ${target === "kibana" ? "Kibana" : "Elasticsearch"} at ${url}. `
      + "The browser blocked it before it left, or the host is unreachable — those look the same from here. "
      + "The usual cause is CORS not being enabled for this origin.",
  { kind: "cors", target, help: corsHelp(target, origin, url) });

/* Kibana and Elasticsearch bury their real complaint in different places. */
const errorDetail = (body, status) =>
  body?.message || body?.error?.reason || body?.error?.type || body?.Message || `HTTP ${status}`;

async function readError(res, target) {
  let body = null;
  try { body = await res.json(); } catch { /* html error page, or nothing */ }
  const detail = errorDetail(body, res.status);

  if (res.status === 401 || res.status === 403)
    return new ElasticError(`${detail} — check the API key and what it is allowed to do.`,
      { kind: "auth", status: res.status, target });
  if (res.status === 404)
    return new ElasticError(`${detail} — check the URL, the agent id, and the Kibana space.`,
      { kind: "request", status: res.status, target });
  if (res.status === 400)
    return new ElasticError(`${detail} — check the agent id and the request body.`,
      { kind: "request", status: res.status, target });
  return new ElasticError(detail, { kind: "server", status: res.status, target });
}

/* One JSON call, with every failure turned into an ElasticError that knows
   which kind it was. `credentials: "omit"` keeps this a credential-less
   cross-origin request in the CORS sense: the API key rides in a header, not
   a cookie, so the allowed-origin policy stays simple. */
async function request({ url, method = "POST", apiKey, body, headers = {}, signal, target, origin }) {
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: "omit",
      headers: { ...authHeaders(apiKey), ...headers },
      ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
      signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    throw transportFailure(target, url, origin);
  }
  if (!res.ok) throw await readError(res, target);
  return res.status === 204 ? null : res.json();
}

/* ---------------- Agent Builder ---------------- */

/* The agent's answer, however this Kibana version shapes it. The field has
   moved between releases and the async stream reports it differently again,
   so every shape seen in the wild is accepted rather than pinning one. */
export function readAgentReply(data) {
  const response = data?.response;
  const text = typeof response === "string" ? response
    : response?.message ?? data?.message ?? data?.result ?? "";
  return {
    text: String(text || "").trim(),
    conversationId: data?.conversation_id || data?.conversationId || null,
    /* Which of the agent's own tools ran, when the version reports them. Worth
       surfacing: it is the difference between the agent answering from an
       index and answering from its model. */
    steps: (data?.steps || [])
      .filter((s) => s?.type === "tool_call" || s?.tool_id)
      .map((s) => s.tool_id || s.type),
  };
}

export const elasticConfigured = (cfg) =>
  !!(trimSlash(cfg?.kibanaUrl) && String(cfg?.apiKey || "").trim());

/* Ask the agent. The synchronous endpoint, deliberately: the reply is consumed
   by a tool loop that has nothing to do with a partial answer, so streaming
   would add the SSE parsing rules for no gain here. */
export async function askAgent({ kibanaUrl, apiKey, agentId, space, input,
                                 conversationId, signal, origin }) {
  const base = trimSlash(kibanaUrl);
  if (!base) throw new ElasticError("No Kibana URL is set.", { kind: "request", target: "kibana" });
  const data = await request({
    url: `${base}${kibanaPath(space, "/api/agent_builder/converse")}`,
    apiKey,
    headers: XSRF,
    body: {
      input,
      agent_id: agentId || ELASTIC_DEFAULT_AGENT,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    },
    signal,
    target: "kibana",
    origin,
  });
  return readAgentReply(data);
}

/* ---------------- Elasticsearch ---------------- */

/* A passage index. `semantic_text` does the embedding server-side against the
   default inference endpoint, so retrieval is semantic without this app
   running a model or choosing a dimension count. `content` is the semantic
   field; the rest is what a citation needs. */
export const indexMapping = () => ({
  mappings: {
    properties: {
      content: { type: "semantic_text" },
      title: { type: "text" },
      source: { type: "keyword" },
      tags: { type: "keyword" },
      passage_id: { type: "keyword" },
      version: { type: "integer" },
    },
  },
});

/* Create the index, treating "it already exists" as success — pushing a
   corrected corpus over an existing index is the normal workflow, not an
   error. */
export async function ensureIndex({ esUrl, apiKey, index, origin }) {
  const base = trimSlash(esUrl);
  try {
    await request({ url: `${base}/${encodeURIComponent(index)}`, method: "PUT", apiKey,
                    body: indexMapping(), target: "elasticsearch", origin });
    return { created: true };
  } catch (e) {
    if (e instanceof ElasticError && e.status === 400 && /resource_already_exists|already exists/i.test(e.message))
      return { created: false };
    throw e;
  }
}

/* Passages to bulk lines. Keyed on the passage id so re-pushing a corrected
   passage replaces it instead of duplicating it. */
export function bulkBody(index, passages, version) {
  return passages.map((p) => [
    JSON.stringify({ index: { _index: index, _id: p.id } }),
    JSON.stringify({
      content: p.text,
      title: p.title,
      source: p.source,
      tags: p.tags || [],
      passage_id: p.id,
      ...(version ? { version } : {}),
    }),
  ].join("\n")).join("\n") + "\n";      // the trailing newline is required
}

export async function bulkPassages({ esUrl, apiKey, index, passages, version, origin }) {
  if (!passages?.length) return { indexed: 0, errors: [] };
  const base = trimSlash(esUrl);
  const data = await request({
    url: `${base}/_bulk?refresh=wait_for`,
    apiKey,
    headers: { "Content-Type": "application/x-ndjson" },
    body: bulkBody(index, passages, version),
    target: "elasticsearch",
    origin,
  });
  const errors = (data?.items || [])
    .map((item) => item.index?.error?.reason)
    .filter(Boolean);
  return { indexed: passages.length - errors.length, errors };
}

/* ---------------- attachment extraction ---------------- */

/* Parse a binary document (PDF, DOCX, XLSX…) with the deployment's own
   attachment processor — Tika, the same machinery behind enterprise ingest.
   Through `_simulate`, deliberately: the pipeline runs and hands the text
   back, but nothing is indexed, so attaching a customer document still
   stores nothing outside this browser. `remove_binary` keeps the response
   from echoing the whole file back. */
export async function extractAttachment({ esUrl, apiKey, base64, origin, signal }) {
  const base = trimSlash(esUrl);
  if (!base) throw new ElasticError("No Elasticsearch URL is set.",
    { kind: "request", target: "elasticsearch" });
  const data = await request({
    url: `${base}/_ingest/pipeline/_simulate`,
    apiKey,
    body: {
      pipeline: { processors: [{ attachment: { field: "data", remove_binary: true } }] },
      docs: [{ _source: { data: base64 } }],
    },
    signal,
    target: "elasticsearch",
    origin,
  });
  const doc = data?.docs?.[0];
  if (doc?.error)
    throw new ElasticError(doc.error.reason || "The attachment processor couldn't parse that file.",
      { kind: "request", target: "elasticsearch" });
  const attachment = doc?.doc?._source?.attachment || {};
  return {
    text: String(attachment.content || "").trim(),
    contentType: attachment.content_type || "",
  };
}

/* ---------------- health ---------------- */

/* One probe per service for the pre-flight check, each reporting how it failed
   rather than only that it did. The agent probe is a real converse call: a
   reachable Kibana with a wrong agent id passes every cheaper check and then
   fails at the only moment that matters. */
export async function checkAgent(cfg) {
  const started = Date.now();
  try {
    const { text } = await askAgent({ ...cfg, input: "Reply with the single word: ready." });
    return { ok: true, ms: Date.now() - started, detail: text.slice(0, 80) || "answered" };
  } catch (e) {
    return { ok: false, ms: Date.now() - started, kind: e.kind, error: e.message, help: e.help };
  }
}

export async function checkIndex({ esUrl, apiKey, index, origin }) {
  const started = Date.now();
  const base = trimSlash(esUrl);
  if (!base) return { ok: false, kind: "request", error: "No Elasticsearch URL is set." };
  try {
    const data = await request({
      url: `${base}/${encodeURIComponent(index)}/_count`,
      method: "GET", apiKey, target: "elasticsearch", origin,
    });
    return { ok: true, ms: Date.now() - started, count: data?.count ?? 0 };
  } catch (e) {
    return { ok: false, ms: Date.now() - started, kind: e.kind, error: e.message, help: e.help };
  }
}
