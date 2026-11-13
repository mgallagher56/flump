// @vitest-environment node
import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { describe, expect, it } from "vitest";
import { PageMeta } from "./PageMeta";

describe("PageMeta", () => {
  it("emits title, description and each social tag exactly once", () => {
    const html = renderToString(
      <HelmetProvider>
        <PageMeta title="T" description="D" />
      </HelmetProvider>,
    );
    for (const key of [
      "<title>T</title>",
      'name="description"',
      'property="og:title"',
      'property="og:description"',
      'property="og:type" content="website"',
      'property="og:site_name" content="Flump"',
      'property="og:locale" content="en_GB"',
      'name="twitter:card" content="summary"',
      'name="twitter:title"',
      'name="twitter:description"',
    ]) {
      expect(html.split(key).length - 1, key).toBe(1);
    }
    expect(html).not.toContain("og:url");
  });
});
