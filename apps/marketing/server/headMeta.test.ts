// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildHeadMeta } from "./headMeta";

const base = {
  helmet: { title: "<title>T</title>", meta: '<meta name="d" />', link: "" },
  appUrlScript: "<script>x</script>",
  siteUrl: "https://flump.example",
  url: "/pricing?x=1",
  status: 200,
};

describe("buildHeadMeta", () => {
  it("includes helmet output, canonical and the app url script in order", () => {
    const out = buildHeadMeta(base);
    const order = [
      "<title>T</title>",
      '<meta name="d" />',
      'rel="canonical"',
      "<script>x</script>",
    ];
    const idx = order.map((o) => out.indexOf(o));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(out).toContain('href="https://flump.example/pricing"');
  });

  it("omits the canonical without SITE_URL", () => {
    expect(buildHeadMeta({ ...base, siteUrl: undefined })).not.toContain("canonical");
  });

  it("omits the canonical on 404 responses", () => {
    expect(buildHeadMeta({ ...base, status: 404, url: "/nope" })).not.toContain("canonical");
    expect(buildHeadMeta({ ...base, status: 404 })).not.toContain("canonical");
  });

  it("tolerates a missing helmet", () => {
    expect(buildHeadMeta({ ...base, helmet: undefined })).toContain("<script>x</script>");
  });
});
