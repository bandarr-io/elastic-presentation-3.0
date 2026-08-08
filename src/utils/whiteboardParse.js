/* ============================================================
   whiteboardParse
   A file from the Context panel becomes text, whatever it arrived as.

   Three routes, tried in an order that matches what the app promises:
   - Plain text reads directly in this browser, as it always has.
   - PDF, DOCX and XLSX go to the configured Elastic deployment's attachment
     processor first — parsed by the product on the whiteboard, stored
     nowhere — and fall back to parsers lazy-loaded into this browser when
     Elastic isn't configured or can't be reached.
   - Images go to Jina's vision model, because Tika doesn't read pixels.

   The parsing libraries are dynamic imports so the app pays for them only on
   the first upload that needs one.
   ============================================================ */

import { looksBinaryText } from "./whiteboardKnowledge";
import { extractAttachment } from "./whiteboardElastic";

/* Big enough for any document worth attaching; small enough that base64-ing
   it for Elastic or walking its pages in the browser stays quick. */
export const PARSE_MAX_BYTES = 20 * 1024 * 1024;

export const JINA_VLM_URL = "https://api-beta-vlm.jina.ai/v1/chat/completions";

/* What the vision model is asked for: the text first (it's what retrieval
   runs on), then the structure, since the images people attach here are
   architecture screenshots and whiteboard photos. */
const IMAGE_PROMPT =
  "Transcribe every piece of text in this image exactly as written. "
  + "If it shows a diagram or an architecture, also describe it plainly: "
  + "the components, and what connects to what. Plain text only, no preamble.";

/* A parse failure the UI can show as-is. */
export class ParseError extends Error {}

const fileExtension = (name) => (String(name || "").match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];

/* Which route a file takes, from its name and MIME type. Anything
   unrecognised is read as text and judged afterwards — looksBinaryText turns
   a mystery binary away with instructions rather than attaching noise. */
export function docKind(file) {
  const ext = fileExtension(file?.name);
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/") || IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (ext === "pdf" || type === "application/pdf") return "pdf";
  if (ext === "docx" || type.includes("wordprocessingml")) return "docx";
  if (ext === "xlsx" || type.includes("spreadsheetml")) return "xlsx";
  return "text";
}

/* File → base64, in slices — spreading a whole arrayBuffer into
   String.fromCharCode overflows the argument limit on files this size. */
export async function fileBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const SLICE = 0x8000;
  for (let i = 0; i < bytes.length; i += SLICE)
    binary += String.fromCharCode(...bytes.subarray(i, i + SLICE));
  return btoa(binary);
}

/* ---------------- browser parsers, loaded on first use ---------------- */

async function parsePdfInBrowser(file) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => item.str).join(" ").trim());
  }
  return pages.filter(Boolean).join("\n\n");
}

async function parseDocxInBrowser(file) {
  const mod = await import("mammoth/mammoth.browser");
  const mammoth = mod.default || mod;
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

/* Each sheet under its own heading, so the chunker makes it a passage and a
   citation can point at the tab that mattered. */
async function parseXlsxInBrowser(file) {
  const mod = await import("xlsx");
  const XLSX = mod.default || mod;
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return workbook.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]).trim();
    return csv ? `## ${name}\n\n${csv}` : "";
  }).filter(Boolean).join("\n\n");
}

export const BROWSER_PARSERS = {
  pdf: parsePdfInBrowser,
  docx: parseDocxInBrowser,
  xlsx: parseXlsxInBrowser,
};

/* ---------------- Jina, for images ---------------- */

/* The beta API is OpenAI-compatible, but "compatible" has dialects: content
   arrives as a plain string or as an array of typed blocks. Read either. */
export const readVlmContent = (data) => {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content))
    return content
      .map((block) => (typeof block === "string" ? block : block?.text || ""))
      .join("")
      .trim();
  return "";
};

export async function describeImage({ apiKey, file, signal }) {
  const dataUrl = `data:${file.type || "image/png"};base64,${await fileBase64(file)}`;
  let res;
  try {
    res = await fetch(JINA_VLM_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${String(apiKey).trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "jina-vlm",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: IMAGE_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
      }),
      signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    throw new ParseError("Couldn't reach Jina — check the connection and try again.");
  }
  if (res.status === 503)
    throw new ParseError("Jina's vision model is starting up — try again in a minute.");
  if (res.status === 401 || res.status === 403)
    throw new ParseError("Jina rejected the API key — check it in settings (⚙).");
  if (!res.ok) throw new ParseError(`Jina couldn't read that image (HTTP ${res.status}).`);
  const data = await res.json();
  const text = readVlmContent(data);
  /* An empty answer is either a genuinely blank image or a response shape
     this code doesn't know — show what came back so the difference is
     diagnosable instead of a shrug. */
  if (!text)
    throw new ParseError("Jina answered without any text to attach. "
      + `Response started: ${JSON.stringify(data).slice(0, 160)}`);
  return text;
}

/* ---------------- the route ---------------- */

const pasteAdvice = (name) =>
  new ParseError(`Couldn't get text out of ${name}. Open it, copy the part that matters, and paste it instead.`);

/* One call from the Context panel: file in, `{ text, via }` out, with `via`
   naming which machinery did the reading so the panel can say so.

   `parsers` is injectable for tests; callers never pass it. */
export async function parseDocument(file, { elastic, jinaKey, origin, parsers = BROWSER_PARSERS } = {}) {
  if (file.size > PARSE_MAX_BYTES)
    throw new ParseError(`${file.name} is ${Math.round(file.size / 1024 / 1024)} MB — too big to parse here. Attach the section that matters instead.`);

  const kind = docKind(file);

  if (kind === "text") {
    const text = await file.text();
    if (looksBinaryText(text)) throw pasteAdvice(file.name);
    return { text, via: "read as text" };
  }

  if (kind === "image") {
    if (!String(jinaKey || "").trim())
      throw new ParseError("Reading an image needs a Jina API key — add one in the AI settings (⚙), or paste the text it shows.");
    return { text: await describeImage({ apiKey: jinaKey, file }), via: "read by Jina's vision model" };
  }

  /* PDF / DOCX / XLSX: the deployment's attachment processor first — the
     Elastic-native answer — then this browser when it isn't there. */
  if (elastic?.esUrl && String(elastic?.apiKey || "").trim()) {
    try {
      const { text } = await extractAttachment({
        esUrl: elastic.esUrl, apiKey: elastic.apiKey,
        base64: await fileBase64(file), origin,
      });
      if (text) return { text, via: "parsed by your Elastic deployment" };
    } catch {
      /* unreachable, serverless, or the processor balked — the browser
         parser below answers instead */
    }
  }

  let text;
  try {
    text = await parsers[kind](file);
  } catch {
    throw pasteAdvice(file.name);
  }
  if (!String(text || "").trim()) throw pasteAdvice(file.name);
  return { text, via: "parsed in this browser" };
}
