/* ============================================================
   awsSigV4
   Minimal AWS Signature Version 4 request signing on Web Crypto, so the
   whiteboard can call Amazon Bedrock straight from the browser without
   pulling in the AWS SDK.

   Implements the canonical-request -> string-to-sign -> derived-key chain
   from the SigV4 spec. Verified against AWS's published signing test vector
   (see awsSigV4.test.js). Non-S3 services double-encode path segments in the
   canonical URI — that matters for Bedrock model ids, which contain ':'.
   ============================================================ */

const encoder = new TextEncoder();

const hex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (text) =>
  hex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));

async function hmac(key, text) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key instanceof Uint8Array ? key : encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(text)));
}

/* RFC 3986 escaping: like encodeURIComponent, but !'()* are encoded too. */
const rfc3986 = (text) =>
  encodeURIComponent(text).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/* Canonical URI for every service except S3: each segment of the path as
   sent on the wire is percent-encoded once more. */
export const canonicalURI = (pathname) =>
  pathname.split("/").map(rfc3986).join("/") || "/";

export const canonicalQuery = (searchParams) =>
  [...searchParams.entries()]
    .map(([k, v]) => [rfc3986(k), rfc3986(v)])
    .sort(([ak, av], [bk, bv]) => (ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

export const amzDate = (date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");

/* Sign a request. Returns the full header set to send, including
   Authorization, x-amz-date, and (when a session token is given)
   x-amz-security-token — all of which are part of the signature. */
export async function signRequest({
  method = "POST", url, region, service,
  accessKeyId, secretAccessKey, sessionToken,
  headers = {}, body = "", date = new Date(),
}) {
  const u = url instanceof URL ? url : new URL(url);
  const timestamp = amzDate(date);
  const dayStamp = timestamp.slice(0, 8);

  const allHeaders = { ...headers, host: u.host, "x-amz-date": timestamp };
  if (sessionToken) allHeaders["x-amz-security-token"] = sessionToken;

  const sorted = Object.entries(allHeaders)
    .map(([k, v]) => [k.toLowerCase(), String(v).trim()])
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const canonicalHeaders = sorted.map(([k, v]) => `${k}:${v}\n`).join("");
  const signedHeaders = sorted.map(([k]) => k).join(";");

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalURI(u.pathname),
    canonicalQuery(u.searchParams),
    canonicalHeaders,
    signedHeaders,
    await sha256Hex(body),
  ].join("\n");

  const scope = `${dayStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256", timestamp, scope, await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(`AWS4${secretAccessKey}`, dayStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = hex(await hmac(kSigning, stringToSign));

  return {
    ...allHeaders,
    authorization:
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
