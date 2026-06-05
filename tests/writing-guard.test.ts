import { describe, expect, it } from "vitest";
import { analyzeDraft } from "../lib/writing-guard";

describe("analyzeDraft", () => {
  it("flags stock prose patterns", () => {
    const flags = analyzeDraft("In today's fast-paced world, this cutting-edge platform can revolutionize wastewater operations.");

    expect(flags.map((flag) => flag.phrase)).toContain("in today's fast-paced world");
    expect(flags.map((flag) => flag.phrase)).toContain("cutting-edge");
    expect(flags.map((flag) => flag.phrase)).toContain("revolutionize");
  });
});
