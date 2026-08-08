/* ============================================================
   whiteboardCustomer
   Deal context for a board, pasted in from the `edm` CLI — the read-only
   BigQuery window onto Salesforce. The app never runs the CLI; the user runs
   `edm opps --json` (or stakeholders / installbase / meddpicc / health) in a
   terminal and pastes the output here.

   The importer recognizes which command produced the rows by their
   distinctive columns, not by the paste's overall shape — `--json` wraps rows
   in an envelope ({ sa, scope, opps: [...] }), `--csv` doesn't, and the
   Salesforce mirror behind them has 859 columns that drift. Successive
   pastes accumulate: the opp first, then stakeholders, then the install
   base, each patching its own part of the picture.
   ============================================================ */

export class CustomerParseError extends Error {}

export const EMPTY_CUSTOMER = {
  account: "", opportunity: "", stage: "", value: null, closeDate: "", ae: "",
  stakeholders: [], meddpicc: null, installBase: [], health: [], notes: "",
};

export const hasCustomer = (c) =>
  !!c && !!(c.account || c.opportunity || c.stakeholders?.length
            || c.installBase?.length || c.health?.length || c.meddpicc || c.notes);

/* ---- getting rows out of a paste ---- */

/* A minimal CSV reader for `edm … --csv`: header line then rows, quotes
   honoured. Not a general CSV parser — it reads what the CLI writes. */
function csvRows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;
  const split = (line) => {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ && ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  if (headers.length < 2) return null;
  return lines.slice(1).map((l) => {
    const cells = split(l);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

/* Rows live either at the top level or under the envelope's command key —
   whichever value is the first non-empty array of objects. */
function extractRows(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new CustomerParseError("Nothing to read — paste the CLI's output.");
  let data;
  try { data = JSON.parse(trimmed); } catch { data = null; }
  if (Array.isArray(data)) return data.filter((r) => r && typeof r === "object");
  if (data && typeof data === "object") {
    for (const v of Object.values(data))
      if (Array.isArray(v) && v.length && typeof v[0] === "object") return v;
    throw new CustomerParseError("That JSON has no rows in it — the query may have matched nothing.");
  }
  const rows = csvRows(trimmed);
  if (rows) return rows;
  throw new CustomerParseError("Couldn't read that as edm output — paste the result of an `edm … --json` run.");
}

/* ---- recognizing what the rows are ---- */

const has = (row, ...keys) => keys.every((k) => k in row);

function detectKind(row) {
  if (has(row, "stage_name")) return "opps";
  if (has(row, "contact", "role")) return "stakeholders";
  if (has(row, "product", "renews") || has(row, "product", "version")) return "installbase";
  if (has(row, "case_no") || has(row, "sev", "subject")) return "health";
  if (has(row, "champion", "eb") || has(row, "altify_pct")) return "meddpicc";
  if (has(row, "qual_notes") || has(row, "use_case_notes")) return "notes";
  if (has(row, "account", "pipeline")) return "accounts";
  return null;
}

const str = (v) => (v == null ? "" : String(v).trim());
const num = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const bool = (v) => v === true || v === "true" || v === "Y";

/* ---- one paste -> a patch on the customer object ---- */

const BUILDERS = {
  opps: (rows) => {
    const r = rows[0];                     // the CLI sorts by close date; first is the live one
    return { opportunity: str(r.name), stage: str(r.stage_name), value: num(r.amount),
             closeDate: str(r.close_date), ae: str(r.owner_name_c) };
  },
  accounts: (rows) => ({ account: str(rows[0].account) }),
  stakeholders: (rows) => ({
    stakeholders: rows.map((r) => ({
      name: str(r.contact), title: str(r.title), role: str(r.role),
      primary: bool(r.is_primary), opp: str(r.opp),
    })).filter((s) => s.name),
  }),
  installbase: (rows) => ({
    account: str(rows[0].account),
    installBase: rows.map((r) => ({
      product: str(r.product), nodes: num(r.nodes), version: str(r.version),
      useCase: str(r.use_case), renews: str(r.renews), status: str(r.status),
    })).filter((s) => s.product),
  }),
  health: (rows) => ({
    account: str(rows[0].account),
    health: rows.map((r) => ({
      caseNo: str(r.case_no), sev: str(r.sev), status: str(r.status),
      ageDays: num(r.age_d), escalated: bool(r.esc), product: str(r.product),
      subject: str(r.subject),
    })).filter((c) => c.subject || c.caseNo),
  }),
  meddpicc: (rows) => {
    const r = rows[0];
    return { opportunity: str(r.opp), meddpicc: {
      score: num(r.altify_pct), champion: str(r.champion), eb: str(r.eb),
      pain: str(r.pain), metrics: str(r.metrics), decisionCriteria: str(r.dec_crit),
      decisionProcess: str(r.dec_proc), paper: str(r.paper), competition: str(r.competition),
      hasClosePlan: bool(r.has_close_plan),
    } };
  },
  notes: (rows) => {
    const r = rows[0];
    const parts = [r.qual_notes, r.notes, r.use_case_notes, r.competitor_notes]
      .map(str).filter(Boolean);
    return { opportunity: str(r.opp), notes: parts.join("\n\n") };
  },
};

export function parseEdmRows(text) {
  const rows = extractRows(text);
  if (!rows.length) throw new CustomerParseError("The query matched nothing — no rows to import.");
  const kind = detectKind(rows[0]);
  if (!kind)
    throw new CustomerParseError(
      "Rows arrived, but they don't look like any edm command's output "
      + "(opps, accounts, stakeholders, installbase, meddpicc, health, notes).");
  return { kind, patch: BUILDERS[kind](rows) };
}

/* Fold a patch in without wiping what other pastes contributed: scalars only
   overwrite when the patch actually has a value, arrays and the scorecard
   replace their own slot wholesale (a re-paste is a refresh). */
export function mergeCustomer(current, patch) {
  const base = { ...EMPTY_CUSTOMER, ...(current || {}) };
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (Array.isArray(v)) { if (v.length) out[k] = v; }
    else if (v !== null && v !== "" && v !== undefined) out[k] = v;
  }
  return out;
}

/* ---- the plain-text block the AI prompts consume ---- */

const CAP = { installBase: 12, stakeholders: 12, health: 8 };

export function describeCustomer(c) {
  if (!hasCustomer(c)) return "";
  const lines = [];
  if (c.account) lines.push(`Account: ${c.account}`);
  if (c.opportunity) {
    const bits = [c.stage && `stage ${c.stage}`, c.value != null && `value ${c.value}`,
                  c.closeDate && `closes ${c.closeDate}`, c.ae && `AE ${c.ae}`].filter(Boolean);
    lines.push(`Opportunity: ${c.opportunity}${bits.length ? ` — ${bits.join(", ")}` : ""}`);
  }
  if (c.installBase?.length) {
    lines.push("Install base:", ...c.installBase.slice(0, CAP.installBase).map((s) => {
      const bits = [s.version, s.nodes != null && `${s.nodes} nodes`, s.useCase,
                    s.renews && `renews ${s.renews}`, s.status].filter(Boolean);
      return `  - ${s.product}${bits.length ? ` (${bits.join(", ")})` : ""}`;
    }));
  }
  if (c.stakeholders?.length) {
    lines.push("Stakeholders:", ...c.stakeholders.slice(0, CAP.stakeholders).map((s) => {
      const bits = [s.title, s.role, s.primary && "primary"].filter(Boolean);
      return `  - ${s.name}${bits.length ? ` (${bits.join(", ")})` : ""}`;
    }));
  }
  if (c.meddpicc) {
    const m = c.meddpicc;
    const bits = [m.score != null && `Altify ${m.score}%`, m.champion && `champion ${m.champion}`,
                  m.eb && `EB ${m.eb}`, m.pain && `pain: ${m.pain}`, m.metrics && `metrics: ${m.metrics}`,
                  m.competition && `competition: ${m.competition}`].filter(Boolean);
    if (bits.length) lines.push(`Deal review: ${bits.join("; ")}`);
  }
  if (c.health?.length) {
    lines.push(`Open support cases (${c.health.length}):`,
      ...c.health.slice(0, CAP.health).map((h) => {
        const bits = [h.sev && `sev ${h.sev}`, h.escalated && "escalated",
                      h.ageDays != null && `${h.ageDays}d old`, h.product].filter(Boolean);
        return `  - ${h.subject || h.caseNo}${bits.length ? ` (${bits.join(", ")})` : ""}`;
      }));
  }
  if (c.notes) lines.push("AE notes:", ...c.notes.split("\n").map((l) => `  ${l}`));
  return lines.join("\n");
}
