/* Capacity arithmetic in both directions.

   Forward:  ingest volume + retention -> the cluster that holds it, which the
             whiteboard can draw as tier nodes.
   Backward: whatever is on the board -> quote lines the Pricing / ROM builder
             can parse, so a sketch becomes a priced estimate.

   Pure functions over plain data, no React or DOM. */

import { formatTB } from "./whiteboardAnalysis";
import { ECH_PROVIDERS, echConfig, snapToLadder } from "../data/echInstanceConfigs";

const ceil = (v) => Math.max(1, Math.ceil(v - 1e-9));
const GB_PER_TB = 1024;

/* Where the cluster runs. ECH providers size against the instance
   configurations Elastic Cloud actually offers (documented disk:RAM ratios
   and per-node RAM ladders); self-managed keeps the tier-guidance ratios and
   raw EC2 ladders. */
export const SIZING_PROVIDERS = [
  ...Object.entries(ECH_PROVIDERS).map(([key, p]) => [key, p.label]),
  ["selfmanaged", "Self-managed (EC2)"],
];

/* ---------------- forward: ingest -> cluster ---------------- */

/* Disk-to-RAM ratios are Elastic's published tier guidance: hot nodes are
   sized for indexing throughput, warm and cold hold far more data per GB of
   heap, and frozen addresses an object store through a local cache.

   Cold and frozen hold fully-mounted searchable snapshots, so their data sits
   once in object storage and replica count doesn't multiply it. */
export const SIZING_TIERS = [
  { key: "hot",    type: "tier_hot",    label: "Hot",    ratio: 30,   replicated: true,  days: 1 },
  { key: "warm",   type: "tier_warm",   label: "Warm",   ratio: 160,  replicated: true,  days: 0 },
  { key: "cold",   type: "tier_cold",   label: "Cold",   ratio: 160,  replicated: false, days: 10 },
  { key: "frozen", type: "tier_frozen", label: "Frozen", ratio: 1000, replicated: false, days: 358 },
];

/* The rest of the stack, sized from the same inputs:
   - one Logstash node per ~1 TB/day of ingest, two minimum for HA;
   - one Kibana instance per ~100 concurrent users, two minimum for HA;
   - three dedicated masters — the quorum size, never more, never fewer —
     added automatically once the data tiers reach six nodes; below that,
     the data nodes carry the master role themselves;
   - masters run small: 8 GB is Elastic's usual dedicated-master footprint. */
export const LOGSTASH_GB_PER_NODE = 1024;
export const USERS_PER_KIBANA = 100;
export const MASTER_NODES = 3;
export const MASTER_RAM_GB = 8;
export const MASTER_DATA_NODE_THRESHOLD = 6;

export const LOGSTASH_RAM_GB = 16;
export const KIBANA_RAM_GB = 8;

/* Dedicated machine-learning nodes for inference and anomaly detection.
   Elastic's published floor is 16 GB of dedicated ML memory for general
   NLP/inference deployments (ELSER alone needs only 4 GB), so a node starts
   at 16 GB; two nodes minimum for the same HA reason Logstash and Kibana use.
   Inference throughput scales with node size (more allocations/threads), and
   Elastic recommends bigger ML nodes for higher load, so ML memory grows with
   ingest: one 16 GB node per ~1 TB/day of enriched ingest — i.e. 64 GB of
   daily ingest per GB of ML RAM — the same order of magnitude as the Logstash
   throughput rule. It's a heuristic (Elastic sizes ML by autoscaling on live
   load, not a fixed ratio), so it only seeds a starting point the SA edits. */
export const ML_RAM_GB = 16;
export const ML_NODES_MIN = 2;
export const ML_INGEST_GB_PER_RAM_GB = 64;

export const SIZING_DEFAULTS = {
  provider: "aws",
  /* Hot-tier hardware profile on ECH ("Storage Optimized", "CPU Optimized",
     …); empty means the provider's default. Other tiers have exactly one
     current config each, so there's nothing to pick for them. */
  profile: "",
  /* ECH region id ("us-east-1", "gcp-us-central1", …); empty means any
     region. A region narrows the hardware to what's offered there — mostly
     a hot-tier concern, plus the master/Kibana generation on AWS. */
  region: "",
  dailyGB: 500,
  replicas: 1,
  /* Index size relative to raw ingest. Roughly 1:1 for logs with default
     mappings; synthetic _source or fewer indexed fields brings it down. */
  overhead: 1,
  nodeRAM: 64,
  days: Object.fromEntries(SIZING_TIERS.map((t) => [t.key, t.days])),
  /* Per-component RAM overrides ({ hot: 64, master: 8, logstash: 16, … });
     tiers fall back to nodeRAM, the rest to their role constant. RAM drives
     both the node count (through the tier ratio) and the instance pick. */
  ram: {},
  /* The stack around the cluster. Agents are how many hosts ship data, users
     are concurrent Kibana users; zero leaves that piece off the drawing. */
  agents: 100,
  users: 50,
  /* Off unless asked for: most modern designs ship agent-direct, so Logstash
     in a default drawing raises questions instead of answering them. */
  logstash: false,
  masters: true,
  /* Dedicated ML nodes are off unless asked for: not every cluster runs
     inference or anomaly detection, so they'd otherwise oversize the drawing. */
  ml: false,
  /* A separate stack-monitoring cluster — the design-review checklist asks
     for one, so the drawing includes it unless it's switched off. */
  monitoring: true,
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
   row per tier that holds data, plus the rolled-up totals.

   Ingest is either one `dailyGB` figure, or a `sources` list of
   `{ gb, days }` rows (GB/day each, with an optional per-source retention).
   Data ages through the tiers in order, so a source's volume only reaches a
   tier while its own retention overlaps that tier's window — a 5-day source
   contributes to the hot day and four cold days, and never lands in frozen. */
export function sizeCluster(input = {}) {
  const cfg = withDefaults(SIZING_DEFAULTS, input);
  cfg.days = withDefaults(SIZING_DEFAULTS.days, input.days);
  const sources = (Array.isArray(cfg.sources) ? cfg.sources : [])
    .map((s) => ({ gb: positive(s.gb), days: positive(s.days) }))
    .filter((s) => s.gb > 0);
  const dailyGB = sources.length
    ? sources.reduce((total, s) => total + s.gb, 0)
    : positive(cfg.dailyGB);
  const overhead = positive(cfg.overhead, 1);
  const nodeRAM = positive(cfg.nodeRAM, SIZING_DEFAULTS.nodeRAM);
  const replicas = Math.max(0, Math.round(positive(cfg.replicas, 0)));
  const ramOf = (key, fallback) => positive(cfg.ram?.[key], fallback);

  const tiers = [];
  let windowStart = 0;   // cumulative days before the current tier
  for (const tier of SIZING_TIERS) {
    const days = positive(cfg.days[tier.key]);
    if (!days || !dailyGB) continue;
    const start = windowStart;
    windowStart += days;

    /* GB·days this tier actually holds: every source at full residence, less
       whatever a per-source retention cuts off. */
    const gbDays = sources.length
      ? sources.reduce((total, s) =>
          total + s.gb * (s.days ? Math.min(Math.max(s.days - start, 0), days) : days), 0)
      : dailyGB * days;
    if (!gbDays) continue;   // every source expires before this tier's window

    const copies = tier.replicated ? 1 + replicas : 1;
    const dataTB = (gbDays * copies * overhead) / GB_PER_TB;
    /* A replicated tier needs a second node for the replica to land on. */
    const floor = tier.replicated && replicas > 0 ? 2 : 1;

    const prof = echConfig(cfg.provider, tier.key, cfg.profile, cfg.region);
    let ram, nodes, perNodeTB;
    if (prof) {
      /* ECH: scale a node up its published RAM ladder, then out past the top
         rung. Frozen counts against the object storage it addresses
         (tier.ratio); its ECH disk ratio only sizes the local cache. */
      const ratio = tier.key === "frozen" ? tier.ratio : prof.diskRatio;
      const totalRAM = (dataTB * GB_PER_TB) / ratio;
      const override = positive(cfg.ram?.[tier.key]);
      const top = prof.sizes[prof.sizes.length - 1];
      ram = snapToLadder(prof.sizes, override || Math.min(totalRAM, top));
      perNodeTB = (ram * ratio) / GB_PER_TB;
      nodes = Math.max(floor, ceil(totalRAM / ram));
    } else {
      ram = ramOf(tier.key, nodeRAM);
      perNodeTB = (ram * tier.ratio) / GB_PER_TB;
      nodes = Math.max(floor, ceil(dataTB / perNodeTB));
    }

    tiers.push({ ...tier, days, copies, dataTB, perNodeTB, nodes, ram,
                 ramGB: nodes * ram, config: prof?.id });
  }

  const sum = (pick) => tiers.reduce((total, t) => total + pick(t), 0);
  /* Cold and frozen read searchable snapshots, so their data is what the
     object store has to hold. */
  const snapshotted = tiers.filter((t) => !t.replicated);

  /* The stack around the cluster; a zero count means "not on the drawing". */
  const agents = Math.round(positive(cfg.agents));
  const users = Math.round(positive(cfg.users));
  const masterProf = echConfig(cfg.provider, "master", null, cfg.region);
  const masterRAM = masterProf
    ? snapToLadder(masterProf.sizes, ramOf("master", MASTER_RAM_GB))
    : ramOf("master", MASTER_RAM_GB);
  /* Dedicated masters only earn their keep on a cluster big enough that the
     data nodes shouldn't also carry the master role. ML nodes hold no indices,
     so they're deliberately absent from this count. */
  const dataNodes = tiers.reduce((total, t) => total + t.nodes, 0);

  /* ML memory tracks ingest, snapping up the ECH ML ladder and scaling out past
     the top rung the same way the data tiers do. It never joins dataNodes (it
     holds no shards) or the storage rollups. */
  const mlProf = echConfig(cfg.provider, "ml", null, cfg.region);
  let mlNodes = 0, mlRAM = 0;
  if (cfg.ml && dailyGB) {
    const totalRAM = Math.max(ML_RAM_GB * ML_NODES_MIN, dailyGB / ML_INGEST_GB_PER_RAM_GB);
    const override = positive(cfg.ram?.ml);
    if (mlProf) {
      const top = mlProf.sizes[mlProf.sizes.length - 1];
      mlRAM = snapToLadder(mlProf.sizes,
        override || Math.max(ML_RAM_GB, Math.min(totalRAM / ML_NODES_MIN, top)));
    } else {
      mlRAM = Math.max(ML_RAM_GB, override || ML_RAM_GB);
    }
    mlNodes = Math.max(ML_NODES_MIN, ceil(totalRAM / mlRAM));
  }

  const stack = {
    agents,
    logstash: cfg.logstash && dailyGB ? Math.max(2, ceil(dailyGB / LOGSTASH_GB_PER_NODE)) : 0,
    kibana: users ? Math.max(2, ceil(users / USERS_PER_KIBANA)) : 0,
    masters: cfg.masters && dataNodes >= MASTER_DATA_NODE_THRESHOLD ? MASTER_NODES : 0,
    ml: mlNodes,
    /* Per-node ML RAM the ingest sized, so the hardware table and drawing show
       the same figure the rollup was built from. */
    mlRAM,
    /* Indicative, not sized: it's a separate small cluster, so it stays out
       of the node and RAM rollups. */
    monitoring: cfg.monitoring ? 1 : 0,
  };

  return {
    tiers,
    stack,
    input: { ...cfg, dailyGB, overhead, nodeRAM, replicas, agents, users },
    dataTB: sum((t) => t.dataTB),
    nodes: sum((t) => t.nodes) + stack.masters + stack.ml,
    ramGB: sum((t) => t.ramGB) + stack.masters * masterRAM + stack.ml * mlRAM,
    objectStoreTB: snapshotted.reduce((total, t) => total + t.dataTB, 0),
    retentionDays: tiers.reduce((total, t) => total + t.days, 0),
  };
}

/* ---------------- instance recommendations ---------------- */

/* Best-practice AWS instance ladders per role, mirroring what Elastic Cloud
   runs on: hot and frozen want local NVMe for indexing / the snapshot cache
   (i3en), warm and cold want dense cheap disk (d3en), masters are small
   general-purpose boxes (m6g), Logstash is CPU-bound (c6i), Kibana is a plain
   web tier (m6i), and ML runs general-purpose compute for inference (m6i).
   Each rung is keyed by its RAM so the pick follows the memory the form asks
   for. */
const nvme = [
  { ram: 16,  instance: "i3en.large",   cpu: 2,  disk: "1.25 TB NVMe" },
  { ram: 32,  instance: "i3en.xlarge",  cpu: 4,  disk: "2.5 TB NVMe" },
  { ram: 64,  instance: "i3en.2xlarge", cpu: 8,  disk: "5 TB NVMe" },
  { ram: 96,  instance: "i3en.3xlarge", cpu: 12, disk: "7.5 TB NVMe" },
  { ram: 192, instance: "i3en.6xlarge", cpu: 24, disk: "15 TB NVMe" },
];
const dense = [
  { ram: 16,  instance: "d3en.xlarge",  cpu: 4,  disk: "28 TB HDD" },
  { ram: 32,  instance: "d3en.2xlarge", cpu: 8,  disk: "56 TB HDD" },
  { ram: 64,  instance: "d3en.4xlarge", cpu: 16, disk: "112 TB HDD" },
  { ram: 128, instance: "d3en.8xlarge", cpu: 32, disk: "224 TB HDD" },
];
export const INSTANCE_LADDERS = {
  hot: nvme,
  warm: dense,
  cold: dense,
  frozen: nvme,
  master: [
    { ram: 8,  instance: "m6g.large",   cpu: 2, disk: "EBS gp3" },
    { ram: 16, instance: "m6g.xlarge",  cpu: 4, disk: "EBS gp3" },
    { ram: 32, instance: "m6g.2xlarge", cpu: 8, disk: "EBS gp3" },
  ],
  logstash: [
    { ram: 8,  instance: "c6i.xlarge",  cpu: 4,  disk: "EBS gp3" },
    { ram: 16, instance: "c6i.2xlarge", cpu: 8,  disk: "EBS gp3" },
    { ram: 32, instance: "c6i.4xlarge", cpu: 16, disk: "EBS gp3" },
  ],
  kibana: [
    { ram: 8,  instance: "m6i.large",   cpu: 2, disk: "EBS gp3" },
    { ram: 16, instance: "m6i.xlarge",  cpu: 4, disk: "EBS gp3" },
    { ram: 32, instance: "m6i.2xlarge", cpu: 8, disk: "EBS gp3" },
  ],
  ml: [
    { ram: 16,  instance: "m6i.xlarge",  cpu: 4,  disk: "EBS gp3" },
    { ram: 32,  instance: "m6i.2xlarge", cpu: 8,  disk: "EBS gp3" },
    { ram: 64,  instance: "m6i.4xlarge", cpu: 16, disk: "EBS gp3" },
    { ram: 128, instance: "m6i.8xlarge", cpu: 32, disk: "EBS gp3" },
  ],
};

const pickRung = (ladder, ramGB) => {
  const need = positive(ramGB, 0);
  return ladder.find((rung) => rung.ram >= need) || ladder[ladder.length - 1];
};

/* The smallest rung with at least the asked-for RAM; past the top of the
   ladder, the biggest rung there is. */
export function recommendInstance(role, ramGB) {
  const ladder = INSTANCE_LADDERS[role];
  return ladder ? pickRung(ladder, ramGB) : null;
}

/* Full hardware rows for everything a sizing result draws: one per tier plus
   masters, ML, Logstash, and Kibana. Each row carries every fillable hardware
   field (instance, cpu, mem, disk) so the form can offer all of them.

   On an ECH provider the instance is the documented instance configuration
   id, RAM snaps to its ladder, vCPU follows the published vCPU/RAM ratio, and
   disk follows the published disk:RAM ratio (the local cache size, for
   frozen). Logstash isn't an ECH product, so it always gets a plain compute
   box from the matching cloud. */
export function recommendHardware(result) {
  const provider = result?.input?.provider;
  const ech = ECH_PROVIDERS[provider];
  const ram = result?.input?.ram || {};
  const rows = {};

  const row = (key, label, count, mem, countLabel = "nodes") => {
    const prof = key === "logstash" ? null
      : echConfig(provider, key, result?.input?.profile, result?.input?.region);
    if (prof) {
      const snapped = snapToLadder(prof.sizes, mem);
      rows[key] = {
        key, label, count, countLabel, mem: snapped,
        instance: prof.id,
        cpu: Math.max(1, Math.round(prof.cpuPerGB * snapped)),
        disk: prof.diskRatio
          ? `${formatTB((snapped * prof.diskRatio) / GB_PER_TB)} ${prof.storage}`
          : prof.storage,
      };
    } else {
      const ladder = key === "logstash" && ech ? ech.logstash : INSTANCE_LADDERS[key];
      const rung = pickRung(ladder, mem);
      rows[key] = { key, label, count, countLabel, mem,
                    instance: rung.instance, cpu: rung.cpu, disk: rung.disk };
    }
  };

  for (const t of result?.tiers || []) row(t.key, `${t.label} tier`, t.nodes, t.ram);
  const stack = result?.stack || {};
  if (stack.masters) row("master", "Masters", stack.masters, positive(ram.master, MASTER_RAM_GB));
  if (stack.ml) row("ml", "ML nodes", stack.ml, positive(ram.ml, stack.mlRAM || ML_RAM_GB));
  if (stack.logstash) row("logstash", "Logstash", stack.logstash, positive(ram.logstash, LOGSTASH_RAM_GB), "inst");
  if (stack.kibana) row("kibana", "Kibana", stack.kibana, positive(ram.kibana, KIBANA_RAM_GB), "inst");
  return rows;
}

/* ---------------- backward: board -> quote lines ---------------- */

/* Elastic prices the two deployment models on entirely different meters, so a
   quote line takes one shape or the other:

   - ERU (self-managed, ECE, ECK). An Enterprise subscription licenses capacity:
     total GB of RAM addressable by the software, divided by 64, remainder
     rounded up. The agreement decouples it from node count deliberately — the
     same units buy one 64 GB node or sixty-four 1 GB ones — so the quantity
     comes from memory, and the remainder is rounded once against the total
     rather than per tier.
   - ECU (Elastic Cloud Hosted). Cloud is metered consumption, not licensed
     capacity: usage across RAM-hours, data transfer, and snapshot storage is
     converted into Elastic Consumption Units at a fixed 1 ECU = $1.00. The
     figure comes from the Cloud pricing calculator, so the SA enters it and the
     unit price is the fixed exchange rate. */
export const LICENSE_ERU = "eru";
export const LICENSE_ECU = "ecu";

export const RU_GB = 64;
export const RU_SKU = "Enterprise Resource Unit - 64GB US Based Support";

export const ECU_SKU = "Elastic Cloud — Elastic Consumption Units";
export const ECU_LEAD = "Elastic Cloud:";
/* Fixed by Elastic: the nominal value of one ECU is $1.00. Discounts are
   negotiated against the credit purchase, not this rate. */
export const ECU_LIST_PRICE = 1;

/* Which meter a provider bills on. Everything that isn't self-managed is a
   Cloud deployment, so it consumes ECUs. */
export const licenseModelFor = (provider) =>
  (provider === "selfmanaged" ? LICENSE_ERU : LICENSE_ECU);

/* The bold label the ROM builder renders before each description. Matching the
   builder's own "Software Licensing:" templates makes a whiteboard-originated
   row indistinguishable from one the builder made itself. */
export const RU_LEAD = "Software Licensing:";

/* Licences are quoted on an annual term. */
export const RU_TERM = "12";

/* Current list price per resource unit. It only seeds the field in the capacity
   panel — real list price moves with the agreement, so the SA edits it before
   sending. */
export const RU_LIST_PRICE = 14100;

/* Turn a capacity rollup into the single line a ROM slide shows — one quantity
   for the whole deployment rather than a line per tier, on whichever meter the
   deployment bills against (see LICENSE_ERU / LICENSE_ECU above).

   The row keeps the detail behind the number — memory, nodes, storage — so a
   programmatic handoff can be richer than the flat text paste. */
export function romRows(totals = {}, { model = LICENSE_ERU, ruGB = RU_GB,
                                       unitPrice = "", discount = "", ecuTotal = "" } = {}) {
  const mem = positive(totals.mem);
  const logstashMem = positive(totals.logstashMem);
  const licensedMem = Math.max(0, mem - logstashMem);
  const cloud = model === LICENSE_ECU;
  const units = cloud ? positive(ecuTotal) : licensedMem;
  if (!units) return [];

  const tiers = totals.tiers || [];
  const sum = (key) => tiers.reduce((total, t) => total + (t[key] || 0), 0);
  const nodes = totals.count || sum("count");
  const storageTB = totals.storageTB || sum("storageTB");

  /* Say what the deployment is, since the line no longer shows the tiers
     separately. On ERU the memory figure is also where the quantity came
     from. */
  const detail = [];
  if (licensedMem) detail.push(`${licensedMem.toLocaleString("en-US")} GB memory`);
  if (nodes) detail.push(`${nodes} node${nodes === 1 ? "" : "s"}`);
  if (storageTB) detail.push(`${formatTB(storageTB)} storage`);
  const named = tiers.filter((t) => t.mem).map((t) => t.label);
  const shape = `${detail.join(", ")}${named.length ? ` (${named.join(", ")})` : ""}`;

  const note = cloud
    ? "Metered consumption from the Elastic Cloud pricing calculator."
    : logstashMem
      ? `Excludes ${logstashMem.toLocaleString("en-US")} GB on Logstash, which Elastic counts for information only.`
      : "";

  return [{
    sku: cloud ? ECU_SKU : RU_SKU,
    descLead: cloud ? ECU_LEAD : RU_LEAD,
    description: shape || "Elastic Cloud deployment",
    descNote: note,
    term: RU_TERM,
    quantity: cloud ? Math.round(units) : ceil(units / ruGB),
    unitPrice: cloud ? String(ECU_LIST_PRICE)
                     : (unitPrice === "" || unitPrice == null ? "" : String(unitPrice)),
    discount: discount === "" || discount == null ? "" : String(discount),
    ramGB: licensedMem,
    nodes,
    storageTB,
  }];
}

/* Tab-delimited so it pastes straight into the ROM builder's importer, which
   reads SKU | Description | Quantity | Unit Price | Discount% | Bold label.
   The 6th column carries the bold lead so a pasted row keeps the label the
   builder's own rows show. Term isn't a paste column — the builder defaults it
   to the same annual term. The line total is the builder's own calculation
   (quantity x unit price, less the discount), so it isn't sent. */
export function romTSV(rows = []) {
  return rows
    .map((r) => [r.sku, r.description, r.quantity, r.unitPrice || "", r.discount || "", r.descLead || ""].join("\t"))
    .join("\n");
}

/* The same quote line as a ready-made ROM scenario, for the direct handoff
   that skips the clipboard. Rows are full builder rows and keep the RAM / node
   / storage detail alongside, so the handoff loses nothing the board knew. */
export function romScenario(totals = {}, { label = "Whiteboard sizing", ...terms } = {}) {
  const rows = romRows(totals, terms).map((r) => ({
    sku: r.sku,
    descLead: r.descLead || "",
    description: r.description,
    descNote: r.descNote || "",
    term: r.term,
    quantity: String(r.quantity),
    unitPrice: r.unitPrice,
    discount: r.discount,
    marker: "",
    overrides: {},
    ramGB: r.ramGB,
    nodes: r.nodes,
    storageTB: r.storageTB,
  }));
  return { label, yearLabels: ["Year 1"], escalatorPct: "", rampPct: "", yearDiscounts: [], rows };
}
