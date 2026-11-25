import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { APP_NAME, TAGLINE } from "./brand";

// The marketing site is the tagline's home (COPY-GUIDE section 2.1). The app cannot import from
// another app, so this test reads the marketing source and fails if the two drift apart.
const site = readFileSync(resolve(__dirname, "../../../marketing/src/utils/site.ts"), "utf8");

describe("brand words", () => {
  it("the tagline matches the marketing site's TAGLINE exactly", () => {
    expect(site).toContain(`export const TAGLINE = "${TAGLINE}";`);
  });

  it("the name and tagline together match SITE_TAGLINE", () => {
    expect(site).toContain(
      `export const SITE_TAGLINE = "${APP_NAME}: ${TAGLINE.charAt(0).toLowerCase()}${TAGLINE.slice(1)}";`,
    );
  });
});
