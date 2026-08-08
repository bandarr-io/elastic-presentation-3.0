/* ============================================================
   whiteboardFollowup
   The one-click follow-up package: the board as an image, the AI's recap,
   and the deterministic numbers, composed into a single self-contained HTML
   file — no external assets, safe to attach to an email — plus a markdown
   twin for pasting wherever markdown goes.

   `bodyHtml` is trusted: it comes from the app's own markdown renderer,
   never from user input. Everything else is escaped here.
   ============================================================ */

const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* The capacity numbers worth repeating outside the app, skipping empties. */
const capacityCells = (c) => [
  ["Nodes", c.count],
  ["vCPU", c.cpu],
  ["RAM", c.mem ? `${c.mem} GB` : 0],
  ["Storage", c.storageTB ? `${c.storageTB.toFixed(1)} TB` : 0],
].filter(([, v]) => v);

export function buildFollowupHtml({ title, dateStr, account, opportunity,
                                    pngDataUrl, bodyHtml, capacity, warnings = [] }) {
  const meta = [account, opportunity, dateStr].filter(Boolean).map(esc).join(" · ");
  const cells = capacity ? capacityCells(capacity) : [];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  body{ margin:0; background:#f6f7fb; color:#1a2340;
    font:15px/1.6 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
  main{ max-width:760px; margin:0 auto; padding:40px 28px 64px; }
  header{ border-bottom:2px solid #1a2340; padding-bottom:14px; margin-bottom:22px; }
  h1{ font-size:26px; margin:0 0 6px; }
  .meta{ color:#5a6486; font-size:13px; }
  img.board{ width:100%; border:1px solid #d8dcea; border-radius:10px; margin:16px 0 24px; }
  h2{ font-size:17px; margin:26px 0 8px; }
  table{ border-collapse:collapse; margin:8px 0 4px; }
  th,td{ border:1px solid #d8dcea; padding:6px 12px; text-align:left; font-size:14px; }
  th{ background:#eef0f7; font-weight:600; }
  ul{ padding-left:20px; }
  footer{ margin-top:36px; color:#8891ad; font-size:12px; }
</style>
</head>
<body>
<main>
<header>
  <h1>${esc(title)}</h1>
  ${meta ? `<div class="meta">${meta}</div>` : ""}
</header>
${pngDataUrl ? `<img class="board" src="${pngDataUrl}" alt="Architecture board">` : ""}
${bodyHtml || ""}
${cells.length ? `<h2>Capacity at a glance</h2>
<table><thead><tr>${cells.map(([k]) => `<th>${esc(k)}</th>`).join("")}</tr></thead>
<tbody><tr>${cells.map(([, v]) => `<td>${esc(v)}</td>`).join("")}</tr></tbody></table>` : ""}
${warnings.length ? `<h2>Review findings</h2>
<ul>${warnings.map((w) => `<li><b>${esc(w.title)}</b>${w.detail ? ` — ${esc(w.detail)}` : ""}</li>`).join("\n")}</ul>` : ""}
<footer>Prepared with the Elastic Whiteboard.</footer>
</main>
</body>
</html>`;
}

/* The same package as markdown — for pasting into a doc or an email body.
   The image can't ride along as text, so the diagram travels separately
   (Export PNG) and the markdown stands on its own. */
export function followupMarkdown({ title, dateStr, account, opportunity,
                                   bodyMd, capacity, warnings = [] }) {
  const out = [`# ${title}`];
  const meta = [account, opportunity, dateStr].filter(Boolean).join(" · ");
  if (meta) out.push("", `_${meta}_`);
  if (bodyMd) out.push("", bodyMd.trim());
  const cells = capacity ? capacityCells(capacity) : [];
  if (cells.length) out.push("", "## Capacity at a glance", "",
    `| ${cells.map(([k]) => k).join(" | ")} |`,
    `| ${cells.map(() => "---").join(" | ")} |`,
    `| ${cells.map(([, v]) => v).join(" | ")} |`);
  if (warnings.length) out.push("", "## Review findings", "",
    ...warnings.map((w) => `- **${w.title}**${w.detail ? ` — ${w.detail}` : ""}`));
  return out.join("\n") + "\n";
}
