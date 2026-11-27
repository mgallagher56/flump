// Draws the mobile app icon from the logo "K2" (owner, 27 Nov 2026) and saves it as PNG with the
// Chromium that Playwright already installs: no image library, nothing downloaded. Run with
// `bun run generate:app-icons` in apps/e2e after changing the logo's geometry or tokens.
//
// - apps/mobile/assets/icon.png: 1024 square, opaque, the dark (Midnight) drawing on the Midnight
//   canvas, for iOS and the store listing.
// - apps/mobile/assets/adaptive-icon.png: 1024 square, transparent, the same drawing kept inside
//   Android's safe zone (the middle 66 of 108 dp, a circle), over a Midnight background layer.
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { dark } from "../../../packages/tokens/src/native.generated";
import {
  floorLayout,
  LOGO_FLOOR,
  LOGO_OPACITY,
  LOGO_ORBS,
  orbLayout,
} from "../../../packages/ui/src/primitives/FlumpLogo/FlumpLogo.art";

const OUT = resolve(import.meta.dirname, "../../mobile/assets");
const SIDE = 1024;
const c = dark.colors;
const tone = {
  teal: c["logo.teal"],
  sky: c["logo.sky"],
  violet: c["logo.violet"],
  rose: c["logo.rose"],
};
// The dark theme's glass.
const O = LOGO_OPACITY.dark;

/** The drawing's extent in view box units, the dark floor shadow included. */
const floor = floorLayout(LOGO_FLOOR);
const box = {
  left: Math.min(floor.contact.cx - floor.contact.rx, ...LOGO_ORBS.map((o) => o.cx - o.r)),
  right: Math.max(floor.contact.cx + floor.contact.rx, ...LOGO_ORBS.map((o) => o.cx + o.r)),
  top: Math.min(...LOGO_ORBS.map((o) => o.cy - o.r)),
  bottom: floor.contact.cy + floor.contact.ry,
};

function logo(): string {
  const defs = [
    `<radialGradient id="contact"><stop offset="0" stop-color="${c["logo.shadow"]}" stop-opacity="0.75"/><stop offset="0.6" stop-color="${c["logo.shadow"]}" stop-opacity="0.4"/><stop offset="1" stop-color="${c["logo.shadow"]}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="pool"><stop offset="0" stop-color="${tone.teal}" stop-opacity="0.5"/><stop offset="0.45" stop-color="${tone.teal}" stop-opacity="0.2"/><stop offset="1" stop-color="${tone.teal}" stop-opacity="0"/></radialGradient>`,
  ];
  const shapes = [
    `<ellipse cx="${floor.contact.cx}" cy="${floor.contact.cy}" rx="${floor.contact.rx}" ry="${floor.contact.ry}" fill="url(#contact)"/>`,
    `<ellipse cx="${floor.pool.cx}" cy="${floor.pool.cy}" rx="${floor.pool.rx}" ry="${floor.pool.ry}" fill="url(#pool)"/>`,
  ];
  LOGO_ORBS.forEach((orb, i) => {
    const { body, rim, sheen, glint } = orbLayout(orb);
    const t = tone[orb.tone];
    const l = tone[orb.light];
    defs.push(
      `<radialGradient id="b${i}" gradientUnits="userSpaceOnUse" cx="${body.cx}" cy="${body.cy}" r="${body.r}"><stop offset="0" stop-color="${t}" stop-opacity="${O.core}"/><stop offset="0.62" stop-color="${t}" stop-opacity="${O.mid}"/><stop offset="1" stop-color="${t}"/></radialGradient>`,
      `<radialGradient id="r${i}" gradientUnits="userSpaceOnUse" cx="${rim.cx}" cy="${rim.cy}" r="${rim.r}"><stop offset="0" stop-color="${l}" stop-opacity="0.95"/><stop offset="0.55" stop-color="${l}" stop-opacity="0.35"/><stop offset="1" stop-color="${l}" stop-opacity="0"/></radialGradient>`,
      `<radialGradient id="s${i}" gradientUnits="userSpaceOnUse" cx="${sheen.cx}" cy="${sheen.cy}" r="${sheen.r}"><stop offset="0" stop-color="${c["logo.glint"]}" stop-opacity="${O.sheen}"/><stop offset="1" stop-color="${c["logo.glint"]}" stop-opacity="0"/></radialGradient>`,
    );
    const circle = `cx="${orb.cx}" cy="${orb.cy}" r="${orb.r}"`;
    shapes.push(
      `<circle ${circle} fill="${c["logo.backing"]}" opacity="${O.backing}"/>`,
      `<circle ${circle} fill="url(#b${i})"/>`,
      `<circle ${circle} fill="url(#r${i})"/>`,
      `<circle ${circle} fill="url(#s${i})"/>`,
    );
    if (orb.glint) {
      shapes.push(
        `<ellipse cx="${glint.cx}" cy="${glint.cy}" rx="${glint.rx}" ry="${glint.ry}" transform="${glint.transform}" fill="${c["logo.glint"]}" opacity="${O.glint}"/>`,
      );
    }
  });
  return `<defs>${defs.join("")}</defs>${shapes.join("")}`;
}

/** The drawing scaled by `scale` pixels per unit and centred on the square. */
function icon(scale: number, background: string | null): string {
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  const x = SIDE / 2 - (box.left + w / 2) * scale;
  const y = SIDE / 2 - (box.top + h / 2) * scale;
  const ground = background ? `<rect width="${SIDE}" height="${SIDE}" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIDE}" height="${SIDE}" viewBox="0 0 ${SIDE} ${SIDE}">${ground}<g transform="translate(${x} ${y}) scale(${scale})">${logo()}</g></svg>`;
}

const w = box.right - box.left;
const h = box.bottom - box.top;
// iOS: the drawing two thirds of the icon's height. Android: its corners inside the safe circle.
const iosScale = (SIDE * 0.66) / h;
const safeDiameter = (SIDE * 66) / 108;
const androidScale = safeDiameter / Math.hypot(w, h);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: SIDE, height: SIDE } });
for (const [file, svg, transparent] of [
  ["icon.png", icon(iosScale, c["surface.canvas"]), false],
  ["adaptive-icon.png", icon(androidScale, null), true],
] as const) {
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
  await page.screenshot({
    path: resolve(OUT, file),
    omitBackground: transparent,
    clip: { x: 0, y: 0, width: SIDE, height: SIDE },
  });
  console.log(`wrote apps/mobile/assets/${file}`);
}
await browser.close();
