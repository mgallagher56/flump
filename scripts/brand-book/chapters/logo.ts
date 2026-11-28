import { renderLogoConstructionDiagram } from "../diagrams/logoConstruction";
import { renderChapterOpener, renderK2LogoSvg, renderProvenanceComment } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

function renderFaviconInline(idSuffix: string): string {
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
  const openerVisual = `<div class="opener-visual-plate" style="justify-items:center;text-align:center">
    ${renderK2LogoSvg(tokens, { idPrefix: "ch02-hero-logo", sizePx: 168, title: "Flump three-bubble mark" })}
    <div class="brand-wordmark" style="font-size:clamp(2rem,4vw,3rem)">Flump</div>
    <p class="swatch-note">Drawn in code from shared geometry so every platform renders the same silhouette.</p>
  </div>`;

  return `<section class="chapter" id="logo">
    ${renderChapterOpener({
      num: "02",
      title: "The logo",
      lead: "Three lit glass bubbles climbing over a single floor shadow, representing separate parts of household money coming together.",
      visualHtml: openerVisual,
      surface: "card",
      hook: "chapter-02",
    })}

    <div class="spread">
      <div class="spread-inner">
        <div class="grid-2">
          <div class="theme-frame theme-light">
            <h3 class="card-title">On Mint (light canvas)</h3>
            <div class="logo-stage">
              <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-light-lg", sizePx: 160, title: "Flump logo in light theme at 160 pixels" })}</div>
              <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-light-md", sizePx: 64 })}</div>
              <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-light-sm", sizePx: 32 })}</div>
            </div>
            <p class="swatch-note num">Shown at 160px, 64px and 32px over a soft deep-ink floor shadow.</p>
          </div>

          <div class="theme-frame theme-dark" data-theme="dark">
            <h3 class="card-title">On Midnight (dark canvas)</h3>
            <div class="logo-stage">
              <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-dark-lg", sizePx: 160, title: "Flump logo in dark theme at 160 pixels" })}</div>
              <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-dark-md", sizePx: 64 })}</div>
              <div class="logo-box">${renderK2LogoSvg(tokens, { idPrefix: "k2-dark-sm", sizePx: 32 })}</div>
            </div>
            <p class="swatch-note num">Shown at 160px, 64px and 32px with a contact shadow and faint teal floor glow.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="editorial-split">
          ${renderLogoConstructionDiagram(tokens)}
          <div class="editorial-copy">
            <h3 class="sub-title">Geometry and clear space</h3>
            <p class="prose">
              Three circles rise from violet at the top through sky to a deep teal foreground bubble inside a 200 by 200 frame.
            </p>
            <ul class="plain-list">
              <li>Keep clear space equal to at least half the mark's width on all four sides.</li>
              <li>Never recolour the bubbles, rotate the mark, pair it with another typeface or place it over photographs or bright mint headline panels.</li>
              <li>In page headers, the mark always stays still and links back to the home screen.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="spread">
      <div class="spread-inner">
        <div class="grid-2">
          <article class="card">
            <h3 class="card-title">Browser favicon</h3>
            <p class="prose">
              At 16 to 40 pixels in browser tabs, the three bubbles switch to clean flat fills with a canvas-coloured cutout ring behind the front teal bubble so the overlap holds up at tiny sizes.
            </p>
            <div class="logo-stage">
              <div class="theme-frame theme-light" style="padding:20px;justify-items:center">
                ${renderFaviconInline("light")}
                <span class="swatch-note">Light tab</span>
              </div>
              <div class="theme-frame theme-dark" data-theme="dark" style="padding:20px;justify-items:center">
                ${renderFaviconInline("dark")}
                <span class="swatch-note">Dark tab</span>
              </div>
            </div>
          </article>

          <article class="card">
            <h3 class="card-title">Mobile launcher icons</h3>
            <p class="prose">
              iOS and Android launcher icons centre the three-bubble mark on the Midnight canvas, with a transparent foreground layer sized inside Android's adaptive safe zone.
            </p>
            <div class="logo-stage">
              <div>
                <img class="icon-img" src="assets/icon.png" alt="Flump mobile app icon on dark canvas" width="96" height="96"/>
                <p class="swatch-note">App icon</p>
              </div>
              <div class="theme-frame theme-dark" data-theme="dark" style="padding:16px">
                <img class="icon-img" src="assets/adaptive-icon.png" alt="Flump Android adaptive foreground icon" width="96" height="96"/>
                <p class="swatch-note">Adaptive foreground</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 2.2, 9, 14; PR 981; FlumpLogo.art.ts; chrome-parity.laws.test.ts; generate-app-icons.ts")}
  </section>`;
}
