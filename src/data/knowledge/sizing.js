/* Sizing guidance: the reasoning behind sizeCluster().

   Numbers are interpolated from the engine's own constants rather than typed
   out again, so a passage cannot quietly disagree with the arithmetic the
   tool actually runs. Change a ratio in whiteboardSizing.js and the guidance
   the model retrieves changes with it. */

import {
  SIZING_TIERS, LOGSTASH_GB_PER_NODE, USERS_PER_KIBANA, MASTER_NODES,
  MASTER_RAM_GB, MASTER_DATA_NODE_THRESHOLD, ML_RAM_GB, ML_NODES_MIN,
  ML_INGEST_GB_PER_RAM_GB, LOGSTASH_RAM_GB, KIBANA_RAM_GB, SIZING_DEFAULTS,
} from "../../utils/whiteboardSizing";

const ratio = (key) => SIZING_TIERS.find((t) => t.key === key).ratio;

export const SIZING_PASSAGES = [
  {
    id: "sizing-ratios",
    title: "Disk-to-RAM ratios by data tier",
    source: "Elastic sizing guidance: data tiers",
    tags: ["elastic", "sizing", "tiers"],
    text: `Each data tier holds a different amount of data per GB of RAM, because each is built for a different job.

Hot is ${ratio("hot")}:1. It is sized for indexing throughput, not density — the tier is doing the write work, so it gets fast local storage and comparatively little data per node.
Warm is ${ratio("warm")}:1 and cold is ${ratio("cold")}:1. Neither is indexing, so both hold far more data per GB of heap on cheaper, denser disk.
Frozen is ${ratio("frozen")}:1. It does not hold the data at all — it addresses an object store through a local cache, so the ratio describes how much object storage a node can front, not how much disk it has.

To size a tier: data volume in GB divided by the ratio gives the RAM needed, and RAM divided by the per-node RAM gives the node count, rounded up.`,
  },
  {
    id: "sizing-replicas",
    title: "Which tiers pay for replicas",
    source: "Elastic sizing guidance: replicas and searchable snapshots",
    tags: ["elastic", "sizing", "tiers", "resilience"],
    text: `Replica count multiplies stored data on the hot and warm tiers: one replica means two copies on disk, so the tier is sized for twice the data.

Cold and frozen do not multiply. Both hold fully-mounted searchable snapshots, so the authoritative copy lives once in object storage and the tier holds a cache or a single mounted copy. Adding replicas there does not double the storage bill.

A replicated tier also needs at least two nodes, because a replica shard cannot be allocated to the same node as its primary. A tier with replicas and one node is not a valid design.`,
  },
  {
    id: "sizing-masters",
    title: "When a cluster needs dedicated master nodes",
    source: "Elastic well-architected: cluster resilience",
    tags: ["elastic", "sizing", "masters", "resilience"],
    text: `Dedicated master nodes are ${MASTER_NODES} or none. ${MASTER_NODES} is the quorum size: it tolerates the loss of one node and still forms a majority. More than that costs money without buying resilience, and an even number is actively worse than the odd number below it, because a split cannot resolve.

They earn their keep only once the cluster is big enough. Below ${MASTER_DATA_NODE_THRESHOLD} data nodes, the data nodes carry the master role themselves and dedicated masters are wasted hardware. At or above ${MASTER_DATA_NODE_THRESHOLD} data nodes, the cluster state work is worth isolating from nodes that are busy indexing.

Masters run small — ${MASTER_RAM_GB} GB is the usual footprint. They hold no shards, so they never appear in the storage rollup, and machine-learning nodes do not count toward the ${MASTER_DATA_NODE_THRESHOLD}-node threshold because they hold no indices either.`,
  },
  {
    id: "sizing-stack",
    title: "Sizing Logstash, Kibana and machine learning",
    source: "Elastic sizing guidance: the stack around the cluster",
    tags: ["elastic", "sizing", "logstash", "kibana", "ml"],
    text: `Logstash: one node per ${LOGSTASH_GB_PER_NODE} GB/day of ingest, with a floor of two for availability. Logstash is CPU-bound, so it wants compute instances rather than storage; ${LOGSTASH_RAM_GB} GB per instance is the usual size.

Kibana: one instance per ${USERS_PER_KIBANA} concurrent users, floor of two, ${KIBANA_RAM_GB} GB each. Concurrent users, not named users — the two differ by an order of magnitude and sizing against the wrong one is a common error.

Machine learning: off unless inference or anomaly detection is actually in scope, since ML nodes oversize a design that has no use for them. When on, memory tracks ingest at roughly one ${ML_RAM_GB} GB node per ${ML_INGEST_GB_PER_RAM_GB * ML_RAM_GB / 1024} TB/day of enriched ingest, with ${ML_NODES_MIN} nodes minimum. This is a starting heuristic, not a guarantee: Elastic autoscales ML on live load rather than a fixed ratio, so it seeds a number the architect then edits.`,
  },
  {
    id: "sizing-overhead",
    title: "Index overhead and what raw ingest really costs",
    source: "Elastic sizing guidance: index size relative to ingest",
    tags: ["elastic", "sizing", "ingest"],
    text: `Ingest volume is raw data per day; what lands on disk is not the same number. The default assumption is roughly 1:1 for logs with default mappings — the inverted index and doc values roughly offset compression.

It moves in both directions. Synthetic _source, fewer indexed fields, or aggressive mapping trims it well below 1:1. Heavily enriched documents, many indexed fields, or keeping _source alongside a large index push it above.

The default in this tool is ${SIZING_DEFAULTS.overhead}:1 with ${SIZING_DEFAULTS.replicas} replica. Both are assumptions worth stating out loud in a customer conversation, because both change the node count directly and neither is usually specified in a requirements document.`,
  },
  {
    id: "sizing-retention-windows",
    title: "How per-source retention changes the tiers",
    source: "Elastic sizing guidance: retention windows",
    tags: ["elastic", "sizing", "retention", "ilm"],
    text: `Data ages through the tiers in order, so a source only contributes to a tier while its own retention overlaps that tier's window.

A source kept for 5 days against a policy of 1 day hot and 10 days cold contributes one day to hot and four days to cold, and never reaches frozen at all. Sizing every tier against total daily ingest, as though all of it were kept for the full policy, is the single most common way a deployment gets oversized.

This matters commercially as well as technically: the frozen tier is usually where most of the retention lives, and short-lived high-volume sources never get there.`,
  },
];
