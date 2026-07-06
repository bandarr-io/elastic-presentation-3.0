import { describe, it, expect } from "vitest";
import { instantiateTemplate, buildFromSections, sectionEndpoint } from "../data/whiteboardTemplates";
import { TYPES } from "../data/whiteboardTypes";

const dim = (n) => ({ w: TYPES[n.type].w, h: TYPES[n.type].h });
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rects = (nodes) => nodes.map((n) => ({ x: n.x, y: n.y, ...dim(n) }));
const noOverlap = (nodes) => {
  const rs = rects(nodes);
  for (let i = 0; i < rs.length; i++)
    for (let j = i + 1; j < rs.length; j++)
      if (overlap(rs[i], rs[j])) return false;
  return true;
};
const byKey = (inst, key) => inst.nodes.find((n) => n.id === inst.keys[key]);

describe("cluster template", () => {
  it("stacks tiers Hot->Warm->Cold->Frozen with Ingest left and Coord/Master right", () => {
    const inst = instantiateTemplate("cluster", { tiers: ["hot", "warm", "cold", "frozen"], ingest: true, coord: true, master: true }, { x: 0, y: 0 }, "c1");
    const hot = byKey(inst, "hot"), warm = byKey(inst, "warm"), cold = byKey(inst, "cold"), frozen = byKey(inst, "frozen");
    expect(hot.y).toBeLessThan(warm.y);
    expect(warm.y).toBeLessThan(cold.y);
    expect(cold.y).toBeLessThan(frozen.y);
    expect(byKey(inst, "ingest").x).toBeLessThan(hot.x);      // ingest left of hot
    expect(byKey(inst, "coord").x).toBeGreaterThan(hot.x);    // coord right column
    expect(byKey(inst, "master").x).toBeGreaterThan(hot.x);
    expect(noOverlap(inst.nodes)).toBe(true);
    // nodes are the 248x96 default; full three-column cluster zone is 968x696
    expect(TYPES.tier_hot.w).toBe(248);
    expect(TYPES.tier_hot.h).toBe(96);
    expect(inst.zone.w).toBe(968);
    expect(inst.zone.h).toBe(696);
  });

  it("sizes the cluster zone by column count", () => {
    const tiers = ["hot", "warm", "cold", "frozen"];
    const tiersOnly = instantiateTemplate("cluster", { tiers, ingest: false, coord: false, master: false, ml: false }, { x: 0, y: 0 }, "c3");
    expect(tiersOnly.zone.w).toBe(344);   // one column
    const twoCol = instantiateTemplate("cluster", { tiers, ingest: false, coord: false, master: true, ml: false }, { x: 0, y: 0 }, "c4");
    expect(twoCol.zone.w).toBe(656);      // tiers + right column
    const threeCol = instantiateTemplate("cluster", { tiers, ingest: true, coord: true, master: true }, { x: 0, y: 0 }, "c5");
    expect(threeCol.zone.w).toBe(968);    // left + tiers + right
    expect(tiersOnly.zone.h).toBe(696);
  });

  it("puts Coordinating -> ML -> Master in the right column (Ingest alone on the left)", () => {
    const inst = instantiateTemplate("cluster", { tiers: ["hot", "warm", "cold", "frozen"], ingest: true, coord: true, master: true, ml: true }, { x: 0, y: 0 }, "cm");
    const hot = byKey(inst, "hot");
    const coord = byKey(inst, "coord"), ml = byKey(inst, "ml"), master = byKey(inst, "master");
    const ingest = byKey(inst, "ingest");
    expect(ingest.x).toBeLessThan(hot.x);          // ingest left column
    expect(coord.x).toBeGreaterThan(hot.x);        // right column
    expect(ml.x).toBe(coord.x);                    // ML shares the right column
    expect(master.x).toBe(coord.x);
    expect(coord.y).toBeLessThan(ml.y);            // stacked Coord -> ML -> Master
    expect(ml.y).toBeLessThan(master.y);
    expect(noOverlap(inst.nodes)).toBe(true);
    expect(inst.zone.w).toBe(968);

    // tiers flow INTO the ML node (not out of it)
    const edge = (s, e) => inst.edges.find((x) => x.s === s && x.e === e);
    expect(edge(hot.id, ml.id)).toBeTruthy();
    expect(edge(ml.id, hot.id)).toBeFalsy();
    // the master coordinates bidirectionally with every other node type
    const warm = byKey(inst, "warm"), cold = byKey(inst, "cold"), frozen = byKey(inst, "frozen");
    for (const other of [hot, warm, cold, frozen, ingest, coord, ml]) {
      const me = edge(master.id, other.id);
      expect(me).toBeTruthy();
      expect(me.bi).toBe(true);
    }
    // master->Hot is steered up the gutter (has waypoints); the rest auto-route
    expect(Array.isArray(edge(master.id, hot.id).pts)).toBe(true);
    expect(edge(master.id, cold.id).pts).toBeUndefined();
  });

  it("honours a reduced tier set (Hot+Frozen only)", () => {
    const inst = instantiateTemplate("cluster", { tiers: ["hot", "frozen"] }, { x: 0, y: 0 }, "c2");
    expect(inst.nodes.some((n) => n.type === "tier_warm")).toBe(false);
    expect(inst.nodes.some((n) => n.type === "tier_hot")).toBe(true);
    expect(inst.nodes.some((n) => n.type === "tier_frozen")).toBe(true);
  });
});

describe("dataZone template", () => {
  it("puts sources in a left column and collectors in a right column", () => {
    const inst = instantiateTemplate("dataZone", { sources: ["syslog", "cloudsvc", "saas"], collectors: ["agent"] }, { x: 0, y: 0 }, "dz");
    const src0 = byKey(inst, "src0"), col0 = byKey(inst, "col0");
    expect(col0.x).toBeGreaterThan(src0.x);
    expect(noOverlap(inst.nodes)).toBe(true);
  });

  it("stacks sources vertically (each on its own row)", () => {
    const inst = instantiateTemplate("dataZone", { sources: ["syslog", "cloudsvc", "saas", "source"], collectors: [] }, { x: 0, y: 0 }, "dz2");
    const ys = inst.nodes.map((n) => n.y);
    expect(new Set(ys).size).toBe(inst.nodes.length);
  });
});

describe("userSpace template", () => {
  it("anchors on Kibana: IdP above, serving row (LB, Users) to the right", () => {
    const inst = instantiateTemplate("userSpace", { consumers: ["kibana", "lb", "users"], idp: true }, { x: 0, y: 0 }, "us");
    const kib = byKey(inst, "kibana"), lb = byKey(inst, "lb"), users = byKey(inst, "users"), idp = byKey(inst, "idp");
    expect(kib.x).toBeLessThan(lb.x);
    expect(lb.x).toBeLessThan(users.x);
    expect(idp.y).toBeLessThan(kib.y);          // IdP stacked above Kibana
    expect(idp.x).toBe(kib.x);                  // in Kibana's column
    expect(noOverlap(inst.nodes)).toBe(true);
  });

  it("stacks Third-Party below Kibana", () => {
    const inst = instantiateTemplate("userSpace", { consumers: ["kibana", "lb", "users", "thirdparty"], idp: true }, { x: 0, y: 0 }, "us2");
    const kib = byKey(inst, "kibana"), tp = byKey(inst, "thirdparty");
    expect(tp.y).toBeGreaterThan(kib.y);        // below Kibana
    expect(tp.x).toBe(kib.x);                   // in Kibana's column
    expect(noOverlap(inst.nodes)).toBe(true);
  });
});

describe("buildFromSections", () => {
  it("places sections in stage lanes and semantically attaches cross-section edges", () => {
    const board = buildFromSections(
      [
        { id: "src", template: "dataZone", fill: { sources: ["syslog"], collectors: ["agent"] } },
        { id: "cl", template: "cluster", fill: { tiers: ["hot", "frozen"] } },
        { id: "ui", template: "userSpace", fill: { consumers: ["kibana", "users"] } },
      ],
      [{ source: "src", target: "cl", label: "logs" }, { source: "cl", target: "ui" }],
    );
    expect(board.zones.length).toBe(3);
    // dataZone (lane 0) is left of cluster (lane 2) is left of userSpace (lane 3)
    const zx = Object.fromEntries(board.zones.map((z) => [z.label, z.x]));
    expect(zx["Data Sources"]).toBeLessThan(zx["Elastic Production Cluster"]);
    expect(zx["Elastic Production Cluster"]).toBeLessThan(zx["User Space"]);

    const has = (s, e) => board.edges.some((x) => x.s === s && x.e === e);
    const zoneId = board.zones.find((z) => z.label === "Data Sources").id;
    // flow into the cluster lands on its ingest node (from the source zone)
    expect(has(zoneId, "cl__ingest")).toBe(true);
    // flow out of the cluster leaves via coordinating, into Kibana
    expect(has("cl__coord", "ui__kibana")).toBe(true);
  });

  it("lays multi-tenant (row) sections side-by-side on one horizontal line", () => {
    const tenants = ["t0", "t1", "t2"].map((id) => ({
      id, template: "dataZone", row: true, fill: { label: id, sources: ["syslog"], collectors: ["agent"] },
    }));
    const board = buildFromSections(
      [...tenants, { id: "ing", template: "sharedIngestion", fill: { tools: ["agent"] } }],
      tenants.map((t) => ({ source: t.id, target: "ing" })),
    );
    const tzones = board.zones.filter((z) => ["t0", "t1", "t2"].includes(z.label))
      .sort((a, b) => a.x - b.x);
    expect(tzones.length).toBe(3);
    // same top (one line) and strictly increasing x (side by side)
    expect(new Set(tzones.map((z) => z.y)).size).toBe(1);
    expect(tzones[0].x).toBeLessThan(tzones[1].x);
    expect(tzones[1].x).toBeLessThan(tzones[2].x);
    // each tenant wired to shared ingestion
    expect(board.edges.filter((e) => String(e.id).startsWith("x")).length).toBe(3);
  });

  it("supports a zone-less single node section", () => {
    const board = buildFromSections([{ id: "fw", template: "single", fill: { type: "firewall", title: "Egress FW" } }], []);
    expect(board.zones.length).toBe(0);
    expect(board.nodes.length).toBe(1);
    expect(board.nodes[0].type).toBe("firewall");
  });

  it("returns section meta and resolves endpoints for incremental editing", () => {
    const board = buildFromSections([
      { id: "cl", template: "cluster", fill: { tiers: ["hot"] } },
      { id: "ui", template: "userSpace", fill: { consumers: ["kibana"] } },
    ], []);
    expect(board.meta.cl.template).toBe("cluster");
    expect(board.meta.cl.zoneId).toBe("cl__zone");
    // direction-aware resolution via ports
    expect(sectionEndpoint("cl", "in", board.meta)).toBe("cl__ingest");
    expect(sectionEndpoint("cl", "out", board.meta)).toBe("cl__coord");
    expect(sectionEndpoint("ui", "in", board.meta)).toBe("ui__kibana");
    // explicit slot override
    expect(sectionEndpoint("cl.hot", "in", board.meta)).toBe("cl__hot");
    // unknown section -> null
    expect(sectionEndpoint("nope", "in", board.meta)).toBe(null);
  });
});
