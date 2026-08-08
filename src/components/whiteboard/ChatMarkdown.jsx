/* The AI writes its chat replies in Markdown — bold labels, bullet lists, the
   odd snippet — so they have to be rendered rather than printed. This is a
   deliberately small renderer for that subset, not a spec-complete one: the
   whiteboard carries no rendering dependencies, and text arriving from a model
   is never turned into HTML (every node below is built as a React element, so
   there is nothing to inject). Anything it doesn't recognise stays literal. */

const HEADING = /^ {0,3}(#{1,6})\s+(.*)$/;
const BULLET = /^ {0,3}[-*•]\s+(.*)$/;
const ORDERED = /^ {0,3}(\d+)[.)]\s+(.*)$/;
const FENCE = /^ {0,3}```/;
/* a GFM table row: |cell|cell| — and the divider row under the header */
const TABLE_ROW = /^ {0,3}\|(.*)\|\s*$/;
const DIVIDER_CELL = /^:?-{3,}:?$/;
/* bold, inline code, and italic, as capture groups so String.split hands back
   the markers along with the text between them. Underscore italics are left
   out on purpose: Elastic role and API names (`data_hot`, `_cat/nodes`) would
   pair their underscores up and italicise half a sentence. */
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;

/* Markdown source -> a flat list of blocks: { kind: "p"|"h"|"code" , text } or
   { kind: "list", ordered, items }. Exported for its own tests. */
export function parseMarkdown(source) {
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let para = null, list = null, code = null, table = null;
  const endPara = () => { if (para) { blocks.push({ kind: "p", text: para.join("\n") }); para = null; } };
  const endList = () => { if (list) { blocks.push(list); list = null; } };
  const endTable = () => {
    if (!table) return;
    const rows = table;
    table = null;
    /* the second row being all dashes is what makes the first one a header */
    const headed = rows.length > 1 && rows[1].length > 0 && rows[1].every((c) => DIVIDER_CELL.test(c));
    blocks.push({ kind: "table", header: headed ? rows[0] : null, rows: headed ? rows.slice(2) : rows });
  };
  const endBlock = () => { endPara(); endList(); endTable(); };

  for (const line of lines) {
    if (code) {
      if (FENCE.test(line)) { blocks.push(code); code = null; }
      else code.text += (code.text ? "\n" : "") + line;
      continue;
    }
    if (FENCE.test(line)) { endBlock(); code = { kind: "code", text: "" }; continue; }
    if (!line.trim()) { endBlock(); continue; }

    const row = TABLE_ROW.exec(line);
    if (row) {
      endPara(); endList();
      (table ||= []).push(row[1].split("|").map((cell) => cell.trim()));
      continue;
    }
    endTable();

    const heading = HEADING.exec(line);
    if (heading) { endBlock(); blocks.push({ kind: "h", text: heading[2] }); continue; }

    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    if (bullet || ordered) {
      endPara();
      if (!list || list.ordered !== !!ordered) { endList(); list = { kind: "list", ordered: !!ordered, items: [] }; }
      list.items.push(bullet ? bullet[1] : ordered[2]);
      continue;
    }
    /* a wrapped line: it continues whichever block is open */
    if (list) { list.items[list.items.length - 1] += ` ${line.trim()}`; continue; }
    (para ||= []).push(line.trim());
  }
  if (code) blocks.push(code);   // an unterminated fence still shows its content
  endBlock();
  return blocks;
}

const renderInline = (text) => text.split(INLINE).filter(Boolean).map((part, i) => {
  if (/^\*\*.+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
  if (/^`.+`$/.test(part)) return <code key={i}>{part.slice(1, -1)}</code>;
  if (/^\*.+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
  return part;
});

const renderBlock = (block, key) => {
  if (block.kind === "h") return <div className="ew-md-h" key={key}>{renderInline(block.text)}</div>;
  if (block.kind === "code") return <pre key={key}><code>{block.text}</code></pre>;
  if (block.kind === "table") return (
    <table key={key}>
      {block.header && (
        <thead><tr>{block.header.map((cell, i) => <th key={i}>{renderInline(cell)}</th>)}</tr></thead>
      )}
      <tbody>
        {block.rows.map((row, i) => (
          <tr key={i}>{row.map((cell, j) => <td key={j}>{renderInline(cell)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
  if (block.kind === "list") {
    const items = block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>);
    return block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
  }
  return <p key={key}>{renderInline(block.text)}</p>;
};

export default function ChatMarkdown({ text }) {
  return <div className="ew-md">{parseMarkdown(text).map(renderBlock)}</div>;
}
