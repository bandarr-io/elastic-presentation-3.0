/* Capacity arithmetic in both directions.

   Forward:  ingest volume + retention -> the cluster that holds it, which the
             whiteboard can draw as tier nodes.
   Backward: whatever is on the board -> quote lines the Pricing / ROM builder
             can parse, so a sketch becomes a priced estimate.

   Pure functions over plain data, no React or DOM. */

import { formatTB } from "./whiteboardAnalysis";

const ceil = (v) => Math.max(1, Math.ceil(v - 1e-9));
const GB_PER_TB = 1024;

/* ---------------- forward: ingest -> cluster ---------------- */

/* Disk-to-RAM ratios are Elastic's published tier guidance: hot nodes are
   sized for indexing throughput, warm and cold hold far more data per GB of
   heap, and frozen addresses an object store through a local cache.

   Cold and frozen hold fully-mounted searchable snapshots, so their data sits
   once in object storage and replica count doesn't multiply it. */
export const SIZING_TIERS = [
  { key: "hot",    type: "tier_hot",    label: "Hot",    ratio: 30,   replicated: true,  days: 30 },
  { key: "warm",   type: "tier_warm",   label: "Warm",   ratio: 160,  replicated: true,  days: 0 },
  { key: "cold",   type: "tier_cold",   label: "Cold",   ratio: 160,  replicated: false, days: 60 },
  { key: "frozen", type: "tier_frozen", label: "Frozen", ratio: 1000, replicated: false, days: 275 },
];

export const SIZING_DEFAULTS = {
  dailyGB: 500,
  replicas: 1,
  /* Index size relative to raw ingest. Roughly 1:1 for logs with default
     mappings; synthetic _source or fewer indexed fields brings it down. */
  overhead: 1,
  nodeRAM: 64,
  days: Object.fromEntries(SIZING_TIERS.map((t) => [t.key, t.days])),
};

const positive = (v, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isFinite(n) && n > 0 ? n : fallback;
};

/* Merge that treats a missing key and an explicit undefined the same way, so a
   partially-filled form falls back to defaults instead of zeroing them. */
const withDefaults = (defaults, input = {}) => ({
  ...defaults,
  ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
});

/* Size a tiered cluster from an ingest rate and a retention policy. Returns a
   row per tier that holds data, plus the rolled-up totals. */
export function sizeCluster(input = {}) {
  const cfg = withDefaults(SIZING_DEFAULTS, input);
  cfg.days = withDefaults(SIZING_DEFAULTS.days, input.days);
  const dailyGB = positive(cfg.dailyGB);
  const overhead = positive(cfg.overhead, 1);
  const nodeRAM = positive(cfg.nodeRAM, SIZING_DEFAULTS.nodeRAM);
  const replicas = Math.max(0, Math.round(positive(cfg.replicas, 0)));

  const tiers = [];
  for (const tier of SIZING_TIERS) {
    const days = positive(cfg.days[tier.key]);
    if (!days || !dailyGB) continue;

    const copies = tier.replicated ? 1 + replicas : 1;
    const dataTB = (dailyGB * days * copies * overhead) / GB_PER_TB;
    const perNodeTB = (nodeRAM * tier.ratio) / GB_PER_TB;
    /* A replicated tier needs a second node for the replica to land on. */
    const floor = tier.replicated && replicas > 0 ? 2 : 1;
    const nodes = Math.max(floor, ceil(dataTB / perNodeTB));

    tiers.push({ ...tier, days, copies, dataTB, perNodeTB, nodes, ramGB: nodes * nodeRAM });
  }

  const sum = (pick) => tiers.reduce((total, t) => total + pick(t), 0);
  /* Cold and frozen read searchable snapshots, so their data is what the
     object store has to hold. */
  const snapshotted = tiers.filter((t) => !t.replicated);

  return {
    tiers,
    input: { ...cfg, dailyGB, overhead, nodeRAM, replicas },
    dataTB: sum((t) => t.dataTB),
    nodes: sum((t) => t.nodes),
    ramGB: sum((t) => t.ramGB),
    objectStoreTB: snapshotted.reduce((total, t) => total + t.dataTB, 0),
    retentionDays: tiers.reduce((total, t) => total + t.days, 0),
  };
}

/* ---------------- backward: board -> quote lines ---------------- */

/* Elastic licenses self-managed and ECE capacity in 64 GB resource units. */
export const RU_GB = 64;
export const RU_SKU = "Enterprise Resource Unit - 64GB US Based Support";

/* Turn a capacity rollup into Pricing / ROM line items, one per tier so the
   quote shows where the memory goes. Everything that isn't a data tier
   (master, ML, ingest, coordinating) rolls into a single line.

   Unit price is deliberately left blank: list price varies by agreement and
   the SA fills it in. */
export function romRows(totals = {}, { ruGB = RU_GB } = {}) {
  const tiers = totals.tiers || [];
  const rows = [];
  const line = (description, mem) => {
    if (!mem) return;
    rows.push({ sku: RU_SKU, description, quantity: ceil(mem / ruGB), ramGB: mem });
  };

  for (const t of tiers) {
    const detail = [`${t.count} node${t.count === 1 ? "" : "s"}`];
    if (t.storageTB) detail.push(`${formatTB(t.storageTB)} storage`);
    line(`${t.label} tier — ${detail.join(", ")}`, t.mem || 0);
  }

  const tierMem = tiers.reduce((total, t) => total + (t.mem || 0), 0);
  line("Master, ML, and coordinating nodes", Math.max(0, (totals.mem || 0) - tierMem));

  return rows;
}

/* Tab-delimited so it pastes straight into the ROM builder's importer, which
   reads SKU | Description | Quantity | Unit Price | Discount%. */
export function romTSV(rows = []) {
  return rows.map((r) => [r.sku, r.description, r.quantity, "", ""].join("\t")).join("\n");
}
