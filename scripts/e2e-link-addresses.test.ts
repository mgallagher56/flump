import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LINK_SPEC_DIR, linkSpecAddress, linkSpecFiles } from "../apps/e2e/support/client-address";

// E41: each link spec file reports its own client address, so the serial links project does not
// share one per-address bucket and needs no waits (apps/e2e/support/client-address.ts). A file
// that left it out would quietly fall back to the project's shared address and bring the 429s back.

const files = linkSpecFiles();

test("there are link spec files to check", () => {
  expect(files.length).toBeGreaterThan(0);
});

test.each(files)("%s reports its own client address", (file) => {
  const source = readFileSync(join(LINK_SPEC_DIR, file), "utf8");
  expect(source).toContain(
    "test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });",
  );
});

test("no two link spec files share an address, and all are in the documentation range", () => {
  const addresses = files.map((file) => linkSpecAddress(file, files));
  expect(new Set(addresses).size).toBe(files.length);
  for (const address of addresses) {
    // 192.0.2.40 to .99: RFC 5737, below the chromium workers (.100 up) and apart from the
    // project addresses (.10, .20, .30).
    expect(address).toMatch(/^192\.0\.2\.(4\d|[5-9]\d)$/);
  }
});

test("the address follows the file's place in name order", () => {
  // Worked by hand: the first file in sorted order is .40, the third is .42.
  const sample = ["a.spec.ts", "b.spec.ts", "c.spec.ts"];
  expect(linkSpecAddress("/x/a.spec.ts", sample)).toBe("192.0.2.40");
  expect(linkSpecAddress("c.spec.ts", sample)).toBe("192.0.2.42");
  expect(() => linkSpecAddress("d.spec.ts", sample)).toThrow("not a link spec");
});
