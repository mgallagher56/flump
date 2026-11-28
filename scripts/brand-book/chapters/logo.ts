import { renderLogoConstructionDiagram } from "../diagrams/logoConstruction";
import { renderK2LogoSvg, renderProvenanceComment } from "../renderHelpers";
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
  return `<section class="chapter" id="logo">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 02</span>
      <h2 class="chapter-title">The logo</h2>
    </div>

    <p class="prose">
      The Flump mark is three lit glass bubbles climbing over a single floor shadow, symbolising separate parts of household money coming together into one clear picture. Drawn cleanly in code from shared geometry, the mark adapts cleanly between the Mint light theme and the Midnight dark theme across the website, web app and mobile app.
    </p>

    <div class="grid-2">
      <div class="theme-frame theme-light">
        <h3 class="card-title">Mint (light theme)</h3>
        <div class="logo-stage">
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-light-lg", sizePx: 144, title: "Flump logo in light theme at 144 pixels" })}</div>
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-light-md", sizePx: 56 })}</div>
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-light-sm", sizePx: 32 })}</div>
        </div>
        <p class="swatch-note num">Shown at 144px, 56px and 32px with a soft deep-ink floor shadow.</p>
      </div>

      <div class="theme-frame theme-dark">
        <h3 class="card-title">Midnight (dark theme)</h3>
        <div class="logo-stage">
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-dark-lg", sizePx: 144, title: "Flump logo in dark theme at 144 pixels" })}</div>
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-dark-md", sizePx: 56 })}</div>
          <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-dark-sm", sizePx: 32 })}</div>
        </div>
        <p class="swatch-note num">Shown at 144px, 56px and 32px with a contact shadow and faint teal floor glow.</p>
      </div>
    </div>

    ${renderLogoConstructionDiagram(tokens)}

    <h3 class="sub-title">Browser and mobile app icons</h3>
    <div class="grid-2">
      <article class="card">
        <h4 class="card-title">Browser favicon</h4>
        <p class="prose">
          Browser tabs use a simplified flat-fill version of the three bubbles with a clean cutout ring behind the front teal bubble so it stays legible at 16 to 40 pixels in light and dark browser chrome.
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
          The iOS and Android launcher icons place the three-bubble mark on the dark Midnight canvas, with a transparent foreground layer sized inside Android's adaptive safe zone.
        </p>
        <div class="logo-stage">
          <div>
            <img class="icon-img" src="assets/icon.png" alt="Flump mobile app icon on dark canvas" width="96" height="96"/>
            <p class="swatch-note">App icon</p>
          </div>
          <div class="theme-frame theme-dark" style="padding:12px">
            <img class="icon-img" src="assets/adaptive-icon.png" alt="Flump Android adaptive foreground icon" width="96" height="96"/>
            <p class="swatch-note">Adaptive foreground</p>
          </div>
        </div>
      </article>
    </div>

    <article class="card-subtle">
      <h3 class="card-title">Logo rules</h3>
      <ul class="plain-list">
        <li>Keep clear space around the mark equal to at least half its width on all four sides.</li>
        <li>Do not recolour the bubbles, rotate the mark, pair it with a different typeface, or place it on photographs or bright mint hero panels.</li>
        <li>In page headers, the mark links to the home screen and carries a descriptive label for screen readers.</li>
      </ul>
    </article>

    ${renderProvenanceComment("STYLE-GUIDE 2.2, 9, 14; PR 981; FlumpLogo.art.ts; chrome-parity.laws.test.ts; generate-app-icons.ts")}
  </section>`;
}
