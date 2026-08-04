/* Share links: pack a whiteboard document into a URL-safe string and back.
   Boards are deflated when the platform offers CompressionStream (all current
   browsers and Node 18+), otherwise they fall back to plain base64 so the
   feature still works — just with longer links. */

const RAW_PREFIX = "u";      // uncompressed payload
const DEFLATE_PREFIX = "z";  // deflate-raw payload

const toBase64Url = (bytes) => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (text) => {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const streamThrough = async (bytes, transform) => {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/* Only the document itself travels — view, history and AI section metadata are
   local concerns. */
export const shareableBoard = ({ nodes = [], edges = [], zones = [], name } = {}) =>
  ({ ...(name ? { name } : {}), nodes, edges, zones });

export async function encodeBoard(board) {
  const json = JSON.stringify(shareableBoard(board));
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === "function") {
    try {
      return DEFLATE_PREFIX + toBase64Url(await streamThrough(bytes, new CompressionStream("deflate-raw")));
    } catch { /* fall through to the uncompressed form */ }
  }
  return RAW_PREFIX + toBase64Url(bytes);
}

export async function decodeBoard(text) {
  if (!text || text.length < 2) return null;
  const kind = text[0], body = text.slice(1);
  try {
    let bytes = fromBase64Url(body);
    if (kind === DEFLATE_PREFIX) {
      if (typeof DecompressionStream !== "function") return null;
      bytes = await streamThrough(bytes, new DecompressionStream("deflate-raw"));
    } else if (kind !== RAW_PREFIX) {
      return null;
    }
    const doc = JSON.parse(new TextDecoder().decode(bytes));
    if (!doc || !Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) return null;
    return { name: doc.name, nodes: doc.nodes, edges: doc.edges, zones: Array.isArray(doc.zones) ? doc.zones : [] };
  } catch {
    return null;
  }
}

/* Board payloads live in the query string after the hash route
   (e.g. #/whiteboard?board=zAbC…), which HashRouter leaves intact. */
export const BOARD_PARAM = "board";

export function boardParamFromHash(hash = "") {
  const q = hash.indexOf("?");
  if (q < 0) return null;
  return new URLSearchParams(hash.slice(q + 1)).get(BOARD_PARAM);
}

export function shareUrl(origin, pathname, hash, payload) {
  const q = hash.indexOf("?");
  const route = q < 0 ? hash : hash.slice(0, q);
  const params = new URLSearchParams(q < 0 ? "" : hash.slice(q + 1));
  params.set(BOARD_PARAM, payload);
  return `${origin}${pathname}${route || "#/whiteboard"}?${params.toString()}`;
}
