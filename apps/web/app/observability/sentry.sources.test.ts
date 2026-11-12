import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(join(here, file), "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const FILES = [
  "sentry.client.ts",
  "sentry.server.ts",
  "env.ts",
  "withhold.ts",
  "../entry.client.tsx",
  "../entry.server.tsx",
];

describe("Sentry sources", () => {
  it("never reference replay, tracing or feedback integrations", () => {
    for (const file of FILES) {
      const code = stripComments(read(file));
      expect(code, file).not.toMatch(/replay|browserTracing|feedbackIntegration|profil/i);
    }
  });

  it("entry.client loads the SDK module only through a dynamic import", () => {
    const code = stripComments(read("../entry.client.tsx"));
    expect(code).not.toMatch(/^import .*sentry/m);
    expect(code).not.toMatch(/@sentry\//);
    expect(code).toMatch(/await import\("\.\/observability\/sentry\.client"\)/);
  });

  it("only the Sentry modules import @sentry packages", () => {
    for (const file of FILES) {
      const hasSdk = /@sentry\//.test(stripComments(read(file)));
      expect(hasSdk, file).toBe(file === "sentry.client.ts" || file === "sentry.server.ts");
    }
  });
});
