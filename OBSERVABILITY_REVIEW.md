# Observability Deck — Source Review & Scene Plan

Review of `~/Downloads/company-preso-06-16` (the "Elastic Observability" deck) and a
proposed plan to rebuild its concepts as React scenes in this presentation app.

Reviewed via the `presentation-doc-reviewer` subagent (`.cursor/agents/presentation-doc-reviewer.md`),
run in parallel across 5 thematic batches.

---

## The source story

**Through-line:** *"How Elastic is redefining observability for the AI era — from
datastore to autonomous SRE."* The authoritative slide order lives in
`fuckslides.config.js` (not the file number prefixes). ~30 slides, many of which are
duplicates or near-duplicate variants.

**Narrative arc:**
1. **Problem at AI scale** — AI multiplies every observability problem.
2. **Heritage / credibility** — ELK → Agentic Era.
3. **Structural advantage** — 3-layer stack: Elasticsearch → AI Index → Nightshift.
4. **Three FY27 pillars** — Streams, Signals, Nightshift.
5. **Get data in** — Streams pipeline + OpenTelemetry (EDOT).
6. **Datastore efficiency** — Logs (LogsDB) + Metrics (Prometheus parity) proof points.
7. **Agentic observability** — infer → discover → remediate → meet customers anywhere.
8. **Nightshift** (climax) — the autonomous AI SRE; "the end of on-call."
9. **Close.**

---

## Key concepts & data points (verbatim, for rebuild fidelity)

### Problem at AI scale (`01-world`)
- Development **×100**, Testing/Staging **×10**, Production **?×**.
- "10× services = 10× logs, metrics, traces and the bill."

### Track record (`02-track-record`)
- Eras: 2011–2014 Origin · 2015–2017 Platform · 2018–2020 Intelligence · 2021–2024 Optimization · **2025 → Agentic Era**.
- LogsDB **65% storage reduction**; Agentic Era → **Zero on-call pages**.

### Three-layer advantage (`03-platform`)
- **01 Elasticsearch** (LogsDB, Columnar Metrics, ES|QL) → **02 AI Index** (KIs, Live Topology, Significant Events) → **03 Nightshift** (Autonomous RCA, Auto-Remediation, Audit, Configurable Trust).
- Stats: **65%** log storage reduction · **~40%** faster query · **30×** vs Prometheus & Mimir.
- Chain: **Data → AI Index → Agent → Action.**

### Three pillars (`fy27-pillars`)
- **Streams** (telemetry pipeline) · **Signals** (unified experiences) · **Nightshift** (autonomous AI SRE).

### Streams (`streams-intro`, `06-streams`)
- 5 stages: **Source → Inputs → Pipeline → Routing → Destination**.
- Raw data → top-level streams (`/logs`,`/metrics`,`/traces`) → sub-streams → auto-detected entities/topology → **Significant Events** ("Agent-ready").

### OpenTelemetry (`13-otel-collection`)
- **#1 OTel contributor**; EDOT Cloud Forwarder / Collector + Gateway / Agentless / Direct OTLP → Managed Ingest. Logs, Metrics, Traces, Profiles.

### Signals + efficiency (`signals-intro`, `logs-pitch`, `metrics-pitch`, `promql`)
- 5 signals: **Logs, Metrics, Traces, Synthetics, Profiles**.
- Logs: **65%** smaller, **50%** TCO reduction, **168 B/record** (~5× vs 805 B), **~40%** faster queries (ES 9.4, since Jan 2026).
- Metrics: **30×** vs Prometheus/Mimir, **7×** vs ClickHouse, **6.6–8×** storage vs ES 8.x; **Migrate in 1 day** from Datadog/Grafana.
- PromQL: **80%** of top-100 Grafana dashboard queries run natively in Kibana; **up to 30× faster**.

### Kubernetes (`kubernetes`)
- **93%** of companies using/evaluating K8s. OOTB OTel dashboards + autonomous root-cause (e.g. `checkout-service OOMKilled`, evidence + next steps).

### Agentic strategy (`05-ai-driven`)
- 4 quadrants: **01 Infer Knowledge · 02 Discover Significant Events · 03 Remediate (human in loop) · 04 Meet customers where they are** (UI, Chat, Agent, API, Alerts, Mobile).

### Knowledge → Discovery → System Model (`07-ki-demo`, `08-discovery`, `system-model`)
- KIs: **Entity / Dependency / Schema**, auto-extracted with confidence scores.
- Discovery: raw events + KIs → correlation/RCA/blast-radius/grouping → **one Significant Event**.
- Live System Model: layered topology graph the agent traverses to find root cause.

### Meet where they are (`10-gen-obs`, `plain-english`, `mcp-demo`, `12-gen-dashboard`)
- One **Skills layer** projected across **5 surfaces** (Kibana, Chat, CLI, Agent harness, API).
- Native **MCP server** → plain-English investigation in Claude; surface-aware anomaly cards.
- Generative Kibana dashboards from natural language.

### Nightshift (climax)
- **Autonomous AI SRE**: Detect · Investigate · Remediate · Audit. **24/7 · 0 pages · ∞ parallel hypotheses**. Trust modes: **Suggest / Confirm / Auto**.
- Architecture: Data Layer → self-updating **Context Layer** → **SRE Agent** → external agents/systems → **Elastic Brain** (opt-in, anonymized failure signatures).
- AI economics funnel: **Petabytes (raw) → Megabytes (KIs) → Kilobytes (Significant Events)**.
- Reveal: "Wake up to this" — incident resolved overnight, **0 human pages**. "You are buying **the end of on-call**."
- Three Arcs: **Developer · Reliability · Infrastructure**.

---

## Proposed React scene set

Consolidates ~30 source slides (and their duplicates) into a focused, high-impact set.
Each is a self-contained scene matching the app's conventions (`useTheme`, `SceneHeader`,
Tailwind, FontAwesome, anime.js; accents `#48EFCF` dark / `#0B64DD` light), registered
in `App.jsx` `allScenes` and `defaultDisabled` so they don't disturb the current deck.

| # | Scene id | Title | Source slides |
|---|----------|-------|---------------|
| 1 | `obs-ai-scale` | The Challenge at AI Scale | 01-world |
| 2 | `obs-heritage` | Track Record → The Agentic Era | 02-track-record |
| 3 | `obs-three-layers` | Three Layers, One Advantage | 03-platform |
| 4 | `obs-pillars` | Three Pillars (Streams · Signals · Nightshift) | fy27-pillars |
| 5 | `obs-streams` | Streams: From Raw Data to Insight | streams-intro, 06-streams |
| 6 | `obs-otel` | Collect Everything (OpenTelemetry/EDOT) | 13-otel-collection |
| 7 | `obs-signals` | Every Signal, One Platform + Efficiency | signals-intro, logs/metrics-pitch, promql |
| 8 | `obs-kubernetes` | Kubernetes, Out of the Box | kubernetes |
| 9 | `obs-agentic` | Agentic Observability (4 quadrants) | 05-ai-driven |
| 10 | `obs-discovery` | Knowledge → Discovery → System Model | 07-ki, 08-discovery, system-model |
| 11 | `obs-surfaces` | Meet Users Where They Are (Skills + MCP) | 10-gen-obs, plain-english, mcp-demo |
| 12 | `nightshift-sre` | Nightshift: Meet Your AI SRE | nightshift intro/hero/reveal |
| 13 | `nightshift-arch` | Inside Nightshift (Architecture + Brain + Economics) | architecture, ai-index, brain, economics |

(Optional add-ons: a `nightshift-arcs` Three-Arcs scene and a dedicated migration scene.)
