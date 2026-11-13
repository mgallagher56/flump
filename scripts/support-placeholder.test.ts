import { expect, test } from "bun:test";
import { SUPPORT_EMAIL } from "../apps/web/app/utils/support";
import { scanText } from "./lib/launch-placeholders";

// If SUPPORT_EMAIL is renamed to something the scanner misses, the launch guard would let the
// placeholder mailbox ship. Keep this in step with E24-T8.
test("the T1 launch placeholder scanner flags SUPPORT_EMAIL", () => {
  const hits = scanText("build/client/app.js", `const m = "${SUPPORT_EMAIL}";`);
  expect(hits.length).toBeGreaterThan(0);
});
