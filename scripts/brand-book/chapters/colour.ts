import type { ColorKey } from "../../../packages/tokens/src/native.generated";
import { renderOrbTonesDiagram } from "../diagrams/orbTones";
import { renderColorSwatch, renderSourceCite } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

function renderSwatchSection(
  tokens: BrandTokens,
  heading: string,
  entries: ReadonlyArray<readonly [ColorKey, string]>,
): string {
  return `
    <h3 class="sub-title">${heading}</h3>
    <div class="swatch-grid">
      ${entries.map(([key, note]) => renderColorSwatch(tokens, key, note)).join("")}
    </div>
  `;
}

export function renderColourChapter(tokens: BrandTokens): string {
  const surfaceEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["surface.canvas", "Page background (Mint light, Midnight charcoal dark)"],
    ["surface.card", "Cards, tables, drawers, marketing bands (never pure white in light)"],
    ["surface.subtle", "Hover fills"],
    ["surface.sunken", "Wells, input tracks"],
    ["surface.overlay", "Dialogs, sheets, menus, popovers"],
    ["surface.contrast", "Charcoal: footer and small numbered markers; never a marketing band"],
    ["surface.hero", "The one headline block on a page: solid mint in light, edged card in dark"],
    ["surface.scrim", "Backdrop behind dialogs and sheets; never behind text"],
  ];

  const tintEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["surface.tint.teal", "Net worth and mortgage icon tiles"],
    ["surface.tint.sage", "Savings icon tiles"],
    ["surface.tint.apricot", "Debt icon tiles"],
    ["surface.tint.sky", "Pension icon tiles"],
    ["surface.tint.violet", "Self Assessment and tax icon tiles (MC1 allow-listed)"],
    ["surface.tint.rose", "Budget and pay icon tiles (MC1 allow-listed)"],
  ];

  const textEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["text.primary", "Body copy and primary headings"],
    ["text.secondary", "Supporting text and secondary labels"],
    ["text.muted", 'Quiet text, hints and "Not set" figures'],
    ["text.onContrast", "Text on surface.contrast only"],
    ["text.onHero", "Labels and lines on surface.hero"],
    ["text.heroFigure", "Headline figure on surface.hero"],
  ];

  const primaryAccentEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["primary", "Links, outline buttons, focus ring, selected state, icons"],
    ["primary.emphasis", "Link and outline button hover"],
    ["primary.solid", "Primary button fill behind primary.foreground"],
    ["primary.hover", "Primary solid button hover fill"],
    ["primary.foreground", "Text on primary.solid"],
    [
      "primary.mark",
      "Brand mark lit from above by primary.markLit (the home hero statement letterhead; not the logo)",
    ],
    ["primary.markLit", "Top highlight for primary.mark"],
    ["primary.subtle", "Selected nav item, quiet accent fills, mint document card"],
    ["primary.border", "Selected or hovered edge on primary.subtle"],
    ["accent", "Icons, shapes, lines and text on card, canvas and accent.subtle"],
    ["accent.subtle", "The one tinted card or section on a page"],
    ["accent.border", "Decorative edge of accent.subtle"],
    ["accent.onHero", "One sun shape on surface.hero; never text"],
  ];

  const borderEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["border", "Default card hairline (1.3:1 on card and canvas)"],
    ["border.subtle", "Quiet dividers"],
    ["border.strong", "Control boundaries and outline buttons (3:1)"],
    ["border.input", "Form inputs and ScenarioZone dashed edge (3:1)"],
    ["border.focusRing", "2px keyboard focus outline with 2px offset"],
    ["border.hero", "Edge of surface.hero"],
    ["border.section", "Dark rule under an app section title"],
  ];

  const statusEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["status.positive.text", "Positive badge text (leaf green, distinct from teal)"],
    ["status.positive.bg", "Positive badge fill"],
    ["status.positive.border", "Positive badge edge"],
    ["status.positive.solid", "Positive solid fill (primary.foreground passes in both themes)"],
    ["status.warning.text", "Warning badge text (amber, deadlines and unverified tax)"],
    ["status.warning.bg", "Warning badge fill"],
    ["status.warning.border", "Warning badge edge"],
    [
      "status.warning.solid",
      "Warning solid fill (primary.foreground in dark only; never in light)",
    ],
    ["status.danger.text", "Error and destructive text (never for debt)"],
    ["status.danger.bg", "Error and destructive fill"],
    ["status.danger.border", "Error and destructive edge"],
    [
      "status.danger.solid",
      "Destructive confirm button fill (text.onContrast in both themes; primary.foreground in light only)",
    ],
    ["status.info.text", "Actionable info text"],
    ["status.info.bg", "Info fill"],
    ["status.info.border", "Info edge"],
    ["status.info.solid", "Info solid fill (primary.foreground passes in both themes)"],
    ["status.neutral.text", "Neutral label text (Saved, Illustration)"],
    ["status.neutral.bg", "Neutral label fill"],
    ["status.neutral.border", "Neutral label edge"],
    ["status.neutral.solid", "Neutral solid fill (primary.foreground passes in both themes)"],
  ];

  const orbEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["orb.skyTeal.core", "Set A orb first tone (sky)"],
    ["orb.skyTeal.shade", "Set A orb second tone (teal); beads alternate core and shade"],
    ["orb.skyTeal.bubble", "Set A bubble lit fill"],
    ["orb.skyTeal.bubbleShade", "Set A bubble far fill"],
    ["orb.skyTeal.rim", "Set A bubble translucent edge"],
    ["orb.violetRose.core", "Set B orb first tone (violet)"],
    ["orb.violetRose.shade", "Set B orb second tone (rose)"],
    ["orb.violetRose.bubble", "Set B bubble lit fill"],
    ["orb.violetRose.bubbleShade", "Set B bubble far fill"],
    ["orb.violetRose.rim", "Set B bubble translucent edge"],
  ];

  return `<section class="chapter" id="colour">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 03</span>
      <h2 class="chapter-title">Colour</h2>
    </div>

    <p class="prose">
      Three layers structure every colour: raw primitives, semantic tokens with a light and dark value, and component recipes. Components use only semantic tokens (Rule C1: no hex, rgb or primitive scale name in component or page code).
    </p>

    <div class="grid-2">
      <div class="theme-frame theme-light">
        <h3 class="card-title">Light theme: Mint</h3>
        <p class="prose">About 60% mint canvas, 30% off-white cards and bands, 10% accent: solid mint hero, teal links and outline buttons, apricot for debt.</p>
        <div class="hero-panel">
          <span class="swatch-note" style="color:var(--color-text-on-hero)">Cash and savings <span class="example-tag">Example</span></span>
          <p class="hero-figure">£21,000</p>
        </div>
      </div>

      <div class="theme-frame theme-dark">
        <h3 class="card-title">Dark theme: Midnight</h3>
        <p class="prose">Cool charcoal surfaces step lighter as they rise (sunken, canvas, card, subtle, overlay). Mint is the headline figure and primary button fill; soft pink is the small accent.</p>
        <div class="hero-panel">
          <span class="swatch-note" style="color:var(--color-text-on-hero)">Cash and savings <span class="example-tag">Example</span></span>
          <p class="hero-figure">£21,000</p>
        </div>
      </div>
    </div>

    <blockquote class="quote-box">
      <p class="prose"><strong>STYLE-GUIDE Rule C2:</strong> "Colour never judges a person's finances. Negative amounts are text.primary with a minus sign. Debt is apricot (chart.debt), never red. status.danger is for errors and destructive actions only; status.warning is not used on ordinary financial situations."</p>
      <p class="prose"><strong>STYLE-GUIDE Rule C9:</strong> "Mint is a fill in light, never text."</p>
      <p class="prose"><strong>STYLE-GUIDE Rule MC2:</strong> "Debt is never rose, and no orb colour is paired with a gain, a loss, a debt or a target."</p>
    </blockquote>

    ${renderOrbTonesDiagram(tokens)}

    ${renderSwatchSection(tokens, "Marketing orb colour sets (MC1: orb-like elements only)", orbEntries)}
    ${renderSwatchSection(tokens, "Surfaces", surfaceEntries)}
    ${renderSwatchSection(tokens, "Domain surface tints", tintEntries)}
    ${renderSwatchSection(tokens, "Text", textEntries)}
    ${renderSwatchSection(tokens, "Primary and accent", primaryAccentEntries)}
    ${renderSwatchSection(tokens, "Borders", borderEntries)}
    ${renderSwatchSection(tokens, "Status (never colour alone: Rule C3)", statusEntries)}

    <h3 class="sub-title">App area colour map and contrast</h3>
    <div class="grid-2">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Area</th><th scope="col">Colour</th><th scope="col">Tokens</th></tr>
          </thead>
          <tbody>
            <tr><td>Net worth, mortgage</td><td>Teal</td><td><code>chart.series1</code>, <code>surface.tint.teal</code></td></tr>
            <tr><td>Savings</td><td>Sage</td><td><code>chart.series2</code>, <code>surface.tint.sage</code></td></tr>
            <tr><td>Debt</td><td>Apricot</td><td><code>chart.series3</code>, <code>surface.tint.apricot</code></td></tr>
            <tr><td>Pension</td><td>Sky</td><td><code>chart.series6</code>, <code>surface.tint.sky</code></td></tr>
            <tr><td>Self Assessment, tax</td><td>Violet</td><td><code>chart.series4</code>, <code>surface.tint.violet</code></td></tr>
            <tr><td>Budget and pay</td><td>Rose</td><td><code>chart.series5</code>, <code>surface.tint.rose</code></td></tr>
            <tr><td>Accounts</td><td>Accent</td><td><code>accent</code>, <code>accent.subtle</code></td></tr>
          </tbody>
        </table>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Pair</th><th scope="col">Minimum</th></tr>
          </thead>
          <tbody>
            <tr><td>Text on its surface</td><td class="num">4.5:1 (3:1 at 24px or larger, or 18.66px bold)</td></tr>
            <tr><td>Control borders, focus ring, chart marks, icons</td><td class="num">3:1 against adjacent surface</td></tr>
            <tr><td>Card edge against canvas</td><td class="num">1.3:1</td></tr>
            <tr><td>Any two page surfaces</td><td class="num">2.0 deltaE</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    ${renderSourceCite("STYLE-GUIDE 2.1 to 2.7, 14; UX-GUIDELINES 10, 11, 12.2; packages/tokens/src/index.ts")}
  </section>`;
}
