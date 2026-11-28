import { renderLogoConstructionDiagram } from "../diagrams/logoConstruction";
import { renderColorSwatch, renderK2LogoSvg, renderSourceCite } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

function renderFaviconInline(idSuffix: string): string {
  // Exact geometry from apps/web/public/favicon.svg using theme CSS variables
  return `<svg class="favicon-img" viewBox="32 32 140 140" role="img" aria-labelledby="fav-title-${idSuffix}">
    <title id="fav-title-${idSuffix}">Flump favicon</title>
    <circle cx="108" cy="54" r="20" fill="var(--color-logo-violet)"/>
    <circle cx="140" cy="92" r="28" fill="var(--color-logo-sky)"/>
    <circle cx="84" cy="122" r="52" fill="var(--color-surface-canvas)"/>
    <circle cx="84" cy="122" r="48" fill="var(--color-logo-teal)"/>
    <ellipse cx="66" cy="98" rx="11" ry="6" transform="rotate(-32 66 98)" fill="var(--color-logo-glint)" opacity="0.9"/>
  </svg>`;
}

export function renderLogoChapter(tokens: BrandTokens): string {
  const logoTokenNotes: Array<{
    key:
      | "logo.teal"
      | "logo.sky"
      | "logo.violet"
      | "logo.rose"
      | "logo.glint"
      | "logo.backing"
      | "logo.shadow";
    note: string;
  }> = [
    { key: "logo.teal", note: "Main front bubble body and dark floor pool" },
    { key: "logo.sky", note: "Middle right bubble body" },
    { key: "logo.violet", note: "Upper back bubble body and rim light on sky and teal" },
    { key: "logo.rose", note: "Rim light on the violet bubble" },
    { key: "logo.glint", note: "Top sheen and crisp specular glint in both themes" },
    { key: "logo.backing", note: "Pale or dark glass backing behind each bubble tint" },
    { key: "logo.shadow", note: "Floor shadow beneath the three bubbles" },
  ];

  const swatches = logoTokenNotes
    .map((item) => renderColorSwatch(tokens, item.key, item.note))
    .join("");

  return `<section class="chapter" id="logo">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 02</span>
      <h2 class="chapter-title">The logo</h2>
    </div>

    <p class="prose">
      The Flump mark ("K2", 27 November 2026) is three glass bubbles climbing over one floor shadow, drawn inline from <code>packages/ui/src/primitives/FlumpLogo/FlumpLogo.art.ts</code> so it follows light and dark themes through the <code>logo.*</code> tokens. One component (<code>FlumpLogo</code>, wrapped by <code>HomeLogo</code> in the header) serves marketing and web, and mobile draws the same table.
    </p>

    <div class="grid-2">
      <div class="theme-frame theme-light">
        <h3 class="card-title">Mint (light theme)</h3>
        <div class="logo-stage">
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-light-lg", sizePx: 96, title: "Flump logo in light theme at 96 pixels" })}</div>
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-light-md", sizePx: 50 })}</div>
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-light-sm", sizePx: 32 })}</div>
        </div>
        <p class="swatch-note num">Component sizes: lg 96px, md 50px, sm 32px. Flat deep-ink floor shadow (opacity 0.16).</p>
      </div>

      <div class="theme-frame theme-dark">
        <h3 class="card-title">Midnight (dark theme)</h3>
        <div class="logo-stage">
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-dark-lg", sizePx: 96, title: "Flump logo in dark theme at 96 pixels" })}</div>
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-dark-md", sizePx: 50 })}</div>
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-dark-sm", sizePx: 32 })}</div>
        </div>
        <p class="swatch-note num">Component sizes: lg 96px, md 50px, sm 32px. Contact shadow with faint teal floor pool.</p>
      </div>
    </div>

    ${renderLogoConstructionDiagram(tokens)}

    <h3 class="sub-title">Logo tokens</h3>
    <div class="swatch-grid">
      ${swatches}
    </div>

    <h3 class="sub-title">Favicon and mobile app icons</h3>
    <div class="grid-2">
      <article class="card">
        <h4 class="card-title">Favicon</h4>
        <p class="prose">
          Both <code>apps/web/public/favicon.svg</code> and <code>apps/marketing/public/favicon.svg</code> serve the same compact K2 mark with a <code>prefers-color-scheme: dark</code> media rule and a cutout ring behind the front teal bubble.
        </p>
        <div class="logo-stage">
          <div class="theme-frame theme-light">
            ${renderFaviconInline("light")}
            <span class="swatch-note">Light</span>
          </div>
          <div class="theme-frame theme-dark">
            ${renderFaviconInline("dark")}
            <span class="swatch-note">Dark</span>
          </div>
        </div>
      </article>

      <article class="card">
        <h4 class="card-title">Mobile app icons</h4>
        <p class="prose">
          Generated from <code>FlumpLogo.art.ts</code> in Midnight colours by <code>apps/e2e/scripts/generate-app-icons.ts</code>: <code>apps/mobile/assets/icon.png</code> (1024px square on Midnight canvas) and <code>adaptive-icon.png</code> (transparent, inside the 66 of 108 dp Android safe zone).
        </p>
        <div class="logo-stage">
          <div>
            <img class="icon-img" src="assets/icon.png" alt="Flump mobile app icon on Midnight canvas" width="96" height="96"/>
            <p class="swatch-note"><code>icon.png</code></p>
          </div>
          <div class="theme-frame theme-dark" style="padding:12px">
            <img class="icon-img" src="assets/adaptive-icon.png" alt="Flump Android adaptive foreground icon" width="96" height="96"/>
            <p class="swatch-note"><code>adaptive-icon.png</code></p>
          </div>
        </div>
      </article>
    </div>

    <article class="card-subtle">
      <h3 class="card-title">Logo rules and what not to do</h3>
      <ul class="plain-list">
        <li>Clear space around the logo is at least half its width.</li>
        <li>Static only: no motion on the logo.</li>
        <li>Do not recolour it, rotate it, add a wordmark in another typeface, or place it on <code>surface.hero</code> or a photograph.</li>
        <li>In a header, it links to home and takes its accessible name from the link.</li>
      </ul>
    </article>

    ${renderSourceCite("STYLE-GUIDE 9, 14; FlumpLogo.art.ts; chrome-parity.laws.test.ts; generate-app-icons.ts")}
  </section>`;
}
