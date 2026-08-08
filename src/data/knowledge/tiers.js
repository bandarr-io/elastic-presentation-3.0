/* Tier and lifecycle guidance: which tiers a design should have, what each
   costs, and when a colder one earns its place. */

export const TIER_PASSAGES = [
  {
    id: "ilm-shape",
    title: "What index lifecycle management actually moves",
    source: "Elastic guidance: index lifecycle management",
    tags: ["elastic", "ilm", "tiers", "retention"],
    text: `ILM ages indices through the tiers on a schedule: rollover out of hot on size or age, then allocate to warm, cold, or frozen as the data gets older and colder, then delete.

Indexing always lands on hot. A design with a warm tier and no hot tier is wrong, not merely unusual — there is nowhere for the write to go. Cold or frozen without hot is the same problem unless data is being mounted from snapshots taken elsewhere, which is worth stating explicitly if that is the intent.

The useful question in a design conversation is not "which tiers do you want" but "how far back do people search, and how fast do they need the answer". Tiers fall out of that.`,
  },
  {
    id: "searchable-snapshots",
    title: "Searchable snapshots, cold and frozen",
    source: "Elastic guidance: searchable snapshots",
    tags: ["elastic", "tiers", "frozen", "cold", "storage"],
    text: `Cold and frozen both read searchable snapshots from object storage, but they differ in what they keep locally.

Cold holds a full local copy and mounts the snapshot as its backup, so search performance is close to warm while the redundant replica cost goes away.
Frozen holds no full copy. It fetches from object storage into a local cache on demand, which makes storage extremely cheap and the first query against cold data noticeably slower — seconds, not milliseconds.

Both depend on the object store being there. A frozen tier drawn without S3, Azure Blob, GCS, or MinIO behind it is missing the thing it reads from, which is why the design review flags it.`,
  },
  {
    id: "when-frozen",
    title: "When the frozen tier earns its place",
    source: "Elastic guidance: choosing data tiers",
    tags: ["elastic", "tiers", "frozen", "retention", "cost"],
    text: `Frozen is worth adding when retention is long and access to the old data is rare and tolerant of latency. Compliance and audit retention is the classic fit: thirteen months of data that must be searchable, queried a handful of times a year.

It is the wrong answer when the old data is queried routinely, or when a query against it sits in an interactive dashboard or an alerting rule that runs on a schedule. Both make the cache thrash and the latency visible.

The rough shape: Security workloads typically want hot, cold, and frozen — recent data hot for detection, a searchable middle for investigation, and a long compliance tail. Observability typically wants hot and frozen — a short operational window and a long cheap archive, with less need for the middle.`,
  },
  {
    id: "object-storage",
    title: "Object storage as part of the design",
    source: "Elastic guidance: snapshot repositories",
    tags: ["elastic", "storage", "frozen", "resilience"],
    text: `Object storage does two jobs in an Elastic design and it is worth being clear which one is being drawn.

As a snapshot repository it holds backups, which is a resilience concern.
As the backing store for searchable snapshots it holds live, queryable data that cold and frozen mount, which is a capacity concern and belongs in the sizing.

The second is the one people forget to size. The object store has to hold everything the cold and frozen tiers address, at one copy each — which is usually the largest single number in the design, and usually the cheapest per terabyte.`,
  },
];
