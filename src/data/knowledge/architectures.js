/* Reference architectures: the shapes a design usually takes, and why the
   solutions differ from each other. */

export const ARCHITECTURE_PASSAGES = [
  {
    id: "arch-shape",
    title: "The four stages every Elastic architecture has",
    source: "Elastic reference architectures: the standard shape",
    tags: ["elastic", "architecture"],
    text: `Data moves left to right through four stages, and a design is easiest to read when it is drawn that way.

Sources: the systems producing data, and the collectors or shippers local to them.
Ingestion: the shared path everything funnels through — Elastic Agent with Fleet, Logstash, or a Kafka buffer in front of either.
Storage: the Elasticsearch cluster and its data tiers.
Serving: Kibana, load balancers, the people and the third-party systems consuming the data.

Anything that does not fit one of those four is usually management or monitoring, which sits beside the diagram rather than in the flow.`,
  },
  {
    id: "arch-security",
    title: "Reference architecture: Security",
    source: "Elastic reference architectures: Elastic Security",
    tags: ["elastic", "architecture", "security"],
    text: `Security workloads are shaped by detection and investigation.

Tiers are typically hot, cold, and frozen. Detection rules run continuously against recent data, so hot holds the operational window; investigation reaches back weeks or months, which cold serves; and compliance retention lives in frozen for a year or more.

Elastic Agent with the Defend integration is the usual collector, giving endpoint data alongside logs. Machine learning is more often genuinely in scope here than elsewhere, because anomaly detection jobs are part of the detection strategy rather than an add-on.

Ingest volumes are dominated by a handful of noisy sources — endpoint, network, and cloud audit logs — so per-source volumes are worth asking for individually rather than as one total.`,
  },
  {
    id: "arch-observability",
    title: "Reference architecture: Observability",
    source: "Elastic reference architectures: Elastic Observability",
    tags: ["elastic", "architecture", "observability"],
    text: `Observability workloads are shaped by an operational window that is short and busy.

Tiers are typically hot and frozen. Almost all querying happens against the last few days, and the long tail is kept for trend analysis and post-incident review rather than routine search — so the warm and cold middle often earns nothing.

Volumes are higher and burstier than Security, and the ingest path matters more: a Kafka buffer in front of the cluster is common, so an incident that spikes log volume does not push back on the systems producing it.

APM and OpenTelemetry data arrive through their own path but land in the same cluster. If tracing is in scope, the design needs the APM server or an OTel collector drawn explicitly, since it changes both the ingest topology and the volume.`,
  },
  {
    id: "arch-multi-tenant",
    title: "Multi-tenant and multi-region designs",
    source: "Elastic reference architectures: tenancy",
    tags: ["elastic", "architecture", "multi-tenant", "ccr"],
    text: `Separate tenants, regions, or environments each get their own source zone, feeding shared ingestion where the ingest path is genuinely shared.

The decision worth making explicitly is whether they also get separate clusters. One cluster with space- and role-based separation is cheaper and simpler; separate clusters are the answer when data residency, blast radius, or independent upgrade cycles demand it.

Cross-cluster search lets one Kibana query several clusters without moving data, which suits data residency. Cross-cluster replication copies indices to a remote cluster, which suits disaster recovery and read locality. A flow labelled as replication or cross-cluster on a diagram with no remote cluster drawn is incomplete — the remote is half the architecture.`,
  },
  {
    id: "arch-deployment-model",
    title: "Elastic Cloud, ECE, ECK, or self-managed",
    source: "Elastic guidance: deployment models",
    tags: ["elastic", "architecture", "deployment", "licensing"],
    text: `Elastic Cloud Hosted is the default recommendation: Elastic runs the orchestration, sizing follows published instance configurations, and it bills as metered consumption.

Elastic Cloud Enterprise runs that same orchestration in the customer's own data centre, which is the answer when the workload cannot leave their infrastructure but they still want managed deployments.

Elastic Cloud on Kubernetes suits an organisation already standardised on Kubernetes, with the operator managing the cluster lifecycle.

Self-managed is a deliberate choice, not a default, and it carries the operational work — upgrades, capacity, and monitoring become the customer's job. It changes the commercial model too: self-managed, ECE, and ECK license capacity in resource units, while Elastic Cloud meters consumption.`,
  },
  {
    id: "arch-monitoring",
    title: "Stack monitoring belongs somewhere else",
    source: "Elastic well-architected: monitoring",
    tags: ["elastic", "architecture", "monitoring", "resilience"],
    text: `Stack monitoring data should ship to a separate cluster from the one it is monitoring. A cluster that stores its own monitoring data loses that data at exactly the moment it becomes useful — during its own outage.

The monitoring cluster is small and does not need the production cluster's tiers or hardware, so it stays out of the capacity rollup. It is drawn beside the deployment rather than in the data flow, with its connection attached to the cluster as a whole.

On Elastic Cloud this is a checkbox and a second small deployment. Self-managed, it is a real piece of work and is worth calling out in a statement of work rather than assuming.`,
  },
];
