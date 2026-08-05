/* ============================================================
   awsCredentials
   Parse the AWS shared credentials/config INI format (~/.aws/credentials,
   ~/.aws/config) into named profiles the whiteboard's Bedrock settings can
   load. Pure string -> object, no filesystem access — the file contents
   arrive via the dev-server endpoint or a file picker.
   ============================================================ */

/* Maps the INI keys onto the shape the Bedrock client uses. `region` only
   appears in ~/.aws/config, but the same parser reads both files. */
const KEY_MAP = {
  aws_access_key_id: "accessKeyId",
  aws_secret_access_key: "secretAccessKey",
  aws_session_token: "sessionToken",
  region: "region",
};

/* Parse INI text into { profileName: { accessKeyId, secretAccessKey,
   sessionToken?, region? } }. Config files title sections "[profile name]";
   credentials files just "[name]" — both collapse to the bare name. */
export function parseAwsCredentials(text) {
  const profiles = {};
  let current = null;
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;

    const section = line.match(/^\[\s*(?:profile\s+)?(.+?)\s*\]$/);
    if (section) {
      current = section[1];
      profiles[current] = profiles[current] || {};
      continue;
    }
    if (!current) continue;

    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = KEY_MAP[line.slice(0, eq).trim().toLowerCase()];
    const value = line.slice(eq + 1).trim();
    if (key && value) profiles[current][key] = value;
  }
  return profiles;
}

/* Only profiles that actually hold a usable key pair, "default" first. */
export function usableProfiles(profiles) {
  return Object.entries(profiles || {})
    .filter(([, p]) => p.accessKeyId && p.secretAccessKey)
    .sort(([a], [b]) => (a === "default" ? -1 : b === "default" ? 1 : a.localeCompare(b)))
    .map(([name, creds]) => ({ name, ...creds }));
}
