import { describe, it, expect } from "vitest";
import { nodeAutoHeight, nodeChips } from "./nodeMetrics";
import { TYPES } from "../data/whiteboardTypes";

const HW_PROPS = { nodes: 3, capacity: "2.5 TB", instance: "i3en.2xlarge", cpu: 8, mem: 64, disk: "7.5 TB" };

describe("nodeChips", () => {
  it("formats set fields with prefixes and units, skipping empties", () => {
    expect(nodeChips("tier_hot", HW_PROPS)).toContain("3 nodes");
    expect(nodeChips("tier_hot", HW_PROPS)).toContain("64 GB RAM");
    expect(nodeChips("tier_hot", { nodes: "", capacity: "" })).toEqual([]);
  });

  it("includes field defaults even without explicit props", () => {
    // logstash ships a pipelines default, so it always shows that chip
    expect(nodeChips("logstash", undefined).join(" ")).toContain("pipelines");
  });
});

describe("nodeAutoHeight", () => {
  it("keeps the type's designed height for sparse nodes", () => {
    expect(nodeAutoHeight({ type: "tier_hot" })).toBe(TYPES.tier_hot.h);
    expect(nodeAutoHeight({ type: "source" })).toBe(TYPES.source.h);
  });

  it("grows to fit a full set of hardware chips", () => {
    const h = nodeAutoHeight({ type: "tier_hot", props: HW_PROPS });
    expect(h).toBeGreaterThan(TYPES.tier_hot.h);
  });

  it("gets taller when the node is narrower (chips wrap sooner)", () => {
    const wide = nodeAutoHeight({ type: "tier_hot", props: HW_PROPS });
    const narrow = nodeAutoHeight({ type: "tier_hot", props: HW_PROPS, w: 160 });
    expect(narrow).toBeGreaterThanOrEqual(wide);
  });

  it("wraps long titles instead of ignoring them", () => {
    const short = nodeAutoHeight({ type: "source", title: "Syslog", props: { ingest: 50 } });
    const long = nodeAutoHeight({
      type: "source", props: { ingest: 50 },
      title: "Very long data source title that wraps across several lines in the box",
    });
    expect(long).toBeGreaterThan(short);
  });

  it("leaves annotations at their own size", () => {
    expect(nodeAutoHeight({ type: "note" })).toBe(TYPES.note.h);
  });
});
