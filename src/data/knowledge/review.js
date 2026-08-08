/* The reasoning behind each check in validateBoard(). The review reports what
   is wrong; these passages are why it is wrong, so a finding can be explained
   to a customer rather than merely relayed.

   Passage ids match the finding ids in whiteboardAnalysis.js, so a finding can
   be looked up directly. */

export const REVIEW_PASSAGES = [
  {
    id: "review-masters",
    title: "Why master-eligible node count is checked",
    source: "Elastic well-architected: quorum and split brain",
    tags: ["elastic", "review", "masters", "resilience"],
    text: `A cluster elects one master from the master-eligible nodes, and the election needs a majority. That is what makes the count matter rather than the presence.

One or two master-eligible nodes cannot survive losing one and still form a majority, so the cluster stops accepting writes. Three can. An even number is worse than the odd number below it: four tolerates one failure, exactly as three does, but costs an extra node and makes an even split unresolvable.

The design review counts master-eligible nodes however the diagram expresses them — a dedicated master box, a master count on a generic Elasticsearch box, or a data node whose roles include master. A small cluster where the data nodes carry the master role is a correct design, not a missing one.

Findings: masters-missing, masters-few, masters-even.`,
  },
  {
    id: "review-frozen-no-store",
    title: "Why a frozen tier without object storage is flagged",
    source: "Elastic guidance: searchable snapshots",
    tags: ["elastic", "review", "frozen", "storage"],
    text: `The frozen tier does not store the data it serves. It mounts searchable snapshots from an object store and caches locally, so without S3, Azure Blob, GCS, or MinIO behind it there is nothing for it to read.

On a diagram this is usually an omission rather than a design error — the object store exists and nobody drew it. It is still worth fixing, because the object store is where most of the retained data physically lives and it belongs in both the architecture and the cost conversation.

Finding: frozen-no-store.`,
  },
  {
    id: "review-tier-order",
    title: "Why tier ordering is checked",
    source: "Elastic guidance: index lifecycle management",
    tags: ["elastic", "review", "tiers", "ilm"],
    text: `Indexing lands on the hot tier and ILM ages it down from there. A warm, cold, or frozen tier with no hot tier in front of it has no path for data to arrive by.

Warm without hot is flagged as a warning, because it is almost always a mistake. Cold or frozen without hot is flagged more softly, because there is one legitimate version of it: a cluster that only mounts snapshots taken by another cluster, for search or investigation. If that is the intent, it is worth saying so on the diagram.

Findings: warm-no-hot, cold-no-hot.`,
  },
  {
    id: "review-single-data-node",
    title: "Why a single data node is flagged",
    source: "Elastic well-architected: fault tolerance",
    tags: ["elastic", "review", "resilience"],
    text: `A replica shard is never allocated to the same node as its primary, so a single data node means no replicas can be allocated at all. The cluster runs yellow by design and any node failure is data loss.

That is fine for a demo or a development cluster and unacceptable for production. The finding often means node counts simply have not been set on the tiers yet, so the fix is usually to state the real topology rather than to change the design.

Finding: single-data-node.`,
  },
  {
    id: "review-entry-point",
    title: "Why the review asks for an entry point",
    source: "Elastic well-architected: access and availability",
    tags: ["elastic", "review", "kibana", "serving"],
    text: `A design should show how people and systems reach the cluster. Usually that is Kibana, or a solution UI, or an application querying the API — but something has to consume the data or the architecture is incomplete as a story, whatever its technical merit.

Multiple Kibana instances need a load balancer in front of them, otherwise the diagram shows several entry points and no single address for users, SSO callbacks, or certificates to point at.

Findings: no-kibana, kibana-no-lb.`,
  },
  {
    id: "review-monitoring",
    title: "Why a missing monitoring cluster is raised",
    source: "Elastic well-architected: monitoring",
    tags: ["elastic", "review", "monitoring", "resilience"],
    text: `Monitoring data stored on the cluster it monitors disappears during that cluster's outage, which is when it was going to be needed.

The finding is informational rather than a warning, because plenty of designs legitimately leave monitoring off the diagram — it is Elastic Cloud's checkbox, or it is already running and out of scope. It is raised so the omission is deliberate.

Finding: no-monitoring.`,
  },
  {
    id: "review-orphans",
    title: "Why unconnected components are raised",
    source: "Elastic reference architectures: reading a diagram",
    tags: ["elastic", "review", "architecture"],
    text: `A component with nothing flowing in or out of it has no stated role in the architecture. Sometimes it is genuinely standalone; more often the flow was never drawn, and a reader is left to guess how the piece participates.

Components inside a zone that is itself connected are not counted as orphans — the zone's flow covers everything in it, which is why a diagram does not need one edge per source.

Finding: orphans.`,
  },
  {
    id: "review-ccr",
    title: "Why a cross-cluster flow needs a remote cluster",
    source: "Elastic guidance: cross-cluster replication",
    tags: ["elastic", "review", "ccr", "architecture"],
    text: `Cross-cluster replication and cross-cluster search both involve a second cluster by definition. A connection labelled as replication or cross-cluster on a board with no remote cluster drawn is describing half of an architecture.

The remote side is where the interesting questions live: where it runs, who operates it, whether it is a follower for disaster recovery or a peer for search, and what the network between them looks like.

Finding: ccr-no-remote.`,
  },
];
