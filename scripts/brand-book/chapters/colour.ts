import { renderOrbTonesDiagram } from "../diagrams/orbTones";
import {
  renderChapterOpener,
  renderColorField,
  renderProvenanceComment,
  renderScreenPair,
} from "../renderHelpers";
import type { BrandTokens } from "../tokens";
import {
  renderUiButtonsSpecimen,
  renderUiDomainTilesSpecimen,
  renderUiExampleTagSpecimen,
  renderUiStatusBadgesSpecimen,
} from "../uiSpecimens";

export function renderColourChapter(tokens: BrandTokens): string {
  const openerVisual = `<div class="opener-visual-plate">
    <div class="color-field-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <div style="height:64px;border-radius:var(--radius-control);background:var(--color-surface-canvas);border:1px solid var(--color-border)"></div>
      <div style="height:64px;border-radius:var(--radius-control);background:var(--color-surface-hero);border:1px solid var(--color-border-hero)"></div>
      <div style="height:64px;border-radius:var(--radius-control);background:var(--color-primary-solid)"></div>
      <div style="height:64px;border-radius:var(--radius-control);background:var(--color-chart-debt)"></div>
    </div>
    <p class="swatch-note">Canvas, headline panel, primary action and apricot debt tone, adapting together across Mint and Midnight.</p>
  </div>`;

  const coreFields = [
    renderColorField(tokens, {
      key: "surface.canvas",
      name: "Canvas",
      role: "About 60% of light mode in pale mint; deep cool charcoal in dark mode.",
    }),
    renderColorField(tokens, {
      key: "surface.card",
      name: "Card surface",
      role: "About 30% of every view: clean off-white in light, stepped charcoal in dark.",
    }),
    renderColorField(tokens, {
      key: "surface.hero",
      name: "Headline panel",
      role: "Solid mint fill for the one main figure in light; subtly edged card in dark.",
    }),
    renderColorField(tokens, {
      key: "text.primary",
      name: "Primary ink",
      role: "Deep forest-charcoal in light mode and crisp warm off-white in dark mode.",
    }),
    renderColorField(tokens, {
      key: "primary",
      name: "Interactive primary",
      role: "Deep teal in light and bright mint in dark for links, focus rings and outlines.",
    }),
    renderColorField(tokens, {
      key: "primary.solid",
      name: "Primary button fill",
      role: "Charcoal button with white text in light; bright mint button with dark ink in dark.",
    }),
    renderColorField(tokens, {
      key: "chart.debt",
      name: "Debt apricot",
      role: "Borrowing, credit cards and loans always appear in warm apricot, never red.",
    }),
    renderColorField(tokens, {
      key: "chart.wealth",
      name: "Savings sage",
      role: "Cash savings and growth pots across cards, icon tiles and charts.",
    }),
  ].join("");

  const orbFields = [
    renderColorField(tokens, {
      key: "orb.skyTeal.core",
      name: "Sky orb",
      role: "Primary lit glass orb tone and pension area marker.",
    }),
    renderColorField(tokens, {
      key: "orb.skyTeal.shade",
      name: "Teal orb",
      role: "Alternating orb tone, net worth and mortgage highlights.",
    }),
    renderColorField(tokens, {
      key: "orb.violetRose.core",
      name: "Violet orb",
      role: "Contained strictly to orbs, the logo, small markers and tax charts.",
    }),
    renderColorField(tokens, {
      key: "orb.violetRose.shade",
      name: "Rose orb",
      role: "Warm orb rim light and budget area highlights, never a card tint.",
    }),
  ].join("");

  return `<section class="chapter" id="colour">
    ${renderChapterOpener({
      num: "03",
      title: "Colour",
      lead: "Colour separates surfaces cleanly and identifies each area of household money without ever grading an outcome as good or bad.",
      visualHtml: openerVisual,
      surface: "subtle",
      hook: "chapter-03",
    })}

    <div class="spread">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Core system palette</h3>
          <p class="prose">
            Every token resolves to a paired light and dark value so Mint and Midnight keep their proportions without custom per-page overrides.
          </p>
        </div>
        <div class="color-field-grid">
          ${coreFields}
        </div>
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">The four orb tones</h3>
          <p class="prose">
            Violet and rose give the marketing site and logo depth while staying off page bands and card backgrounds.
          </p>
        </div>
        <div class="color-field-grid">
          ${orbFields}
        </div>
        ${renderOrbTonesDiagram(tokens)}
      </div>
    </div>

    <div class="spread">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Real controls in Mint and Midnight</h3>
          <p class="prose">
            Rendered directly from Flump's UI components: primary buttons invert cleanly between themes, bright mint stays a fill rather than light-mode text, and every status badge pairs colour with a shape or icon.
          </p>
        </div>
        <div class="grid-2">
          <div class="theme-frame theme-light">
            <h4 class="card-title">Mint (light theme)</h4>
            <div class="hero-panel">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                <span class="swatch-note" style="color:var(--color-text-on-hero)">Cash and savings</span>
                ${renderUiExampleTagSpecimen("paper")}
              </div>
              <p class="hero-figure">£21,000</p>
            </div>
            ${renderUiButtonsSpecimen()}
            ${renderUiStatusBadgesSpecimen()}
          </div>

          <div class="theme-frame theme-dark" data-theme="dark">
            <h4 class="card-title">Midnight (dark theme)</h4>
            <div class="hero-panel">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                <span class="swatch-note" style="color:var(--color-text-on-hero)">Cash and savings</span>
                ${renderUiExampleTagSpecimen("paper")}
              </div>
              <p class="hero-figure">£21,000</p>
            </div>
            ${renderUiButtonsSpecimen()}
            ${renderUiStatusBadgesSpecimen()}
          </div>
        </div>
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Product area colours</h3>
          <p class="prose">
            Each area of household money keeps one assigned colour across icon tiles, section headers and charts. Rendered below from the real icon tile component.
          </p>
        </div>
        ${renderUiDomainTilesSpecimen()}
      </div>
    </div>

    <div class="spread">
      <div class="spread-inner">
        ${renderScreenPair({
          baseName: "web-dashboard",
          title: "Colour in the web app",
          copy: "One solid headline figure sits above quiet white or charcoal summary cards. Card accents use only a thin top bar and a 40 pixel domain tile.",
          desktopAlt: "Flump web dashboard showing net worth, summary cards and area sections",
          phoneAlt: "Flump web dashboard at phone width",
          caption:
            "Web dashboard at 1280px and 375px. Notice how debt appears in neutral ink and apricot accents rather than red.",
        })}
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Contrast minimums</h3>
          <p class="prose">
            Legibility is enforced automatically across both themes. Never rely on colour alone to carry meaning.
          </p>
        </div>
        <div class="contrast-strip">
          <div class="contrast-stat">
            <span class="contrast-ratio">4.5:1</span>
            <strong>Body text on its surface</strong>
            <span class="swatch-note num">3:1 at 24px or 18.66px bold</span>
          </div>
          <div class="contrast-stat">
            <span class="contrast-ratio">3:1</span>
            <strong>Controls, focus rings and marks</strong>
            <span class="swatch-note">Input borders, icons and chart lines</span>
          </div>
          <div class="contrast-stat">
            <span class="contrast-ratio">1.3:1</span>
            <strong>Card edge against canvas</strong>
            <span class="swatch-note">Hairline separation without visual clutter</span>
          </div>
          <div class="contrast-stat">
            <span class="contrast-ratio">2.0 deltaE</span>
            <strong>Stepped background surfaces</strong>
            <span class="swatch-note">Distinct depth from canvas to card</span>
          </div>
        </div>
      </div>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 2.1 to 2.7, 14; UX-GUIDELINES 10, 11, 12.2; packages/tokens/src/index.ts; PRs 901, 963, 981")}
  </section>`;
}
