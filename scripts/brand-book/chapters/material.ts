import { renderCardMaterialLayersDiagram } from "../diagrams/cardMaterialLayers";
import { renderGlassOrbLightingDiagram } from "../diagrams/glassOrbLighting";
import {
  renderColorSwatch,
  renderExampleTag,
  renderShadowSpecimen,
  renderSourceCite,
} from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderMaterialChapter(tokens: BrandTokens): string {
  const materialTokens: Array<{
    key:
      | "material.glass.fill"
      | "material.glass.border"
      | "material.glass.light"
      | "material.glass.sheen"
      | "material.paper.fill"
      | "material.paper.edge"
      | "material.paper.rule";
    note: string;
  }> = [
    { key: "material.glass.fill", note: "Glass card base fill" },
    { key: "material.glass.border", note: "Glass card edge" },
    { key: "material.glass.light", note: "Inner top highlight" },
    { key: "material.glass.sheen", note: "Faint 155 degree diagonal sheen" },
    { key: "material.paper.fill", note: "Paper document base fill" },
    { key: "material.paper.edge", note: "Paper document 1px edge" },
    { key: "material.paper.rule", note: "Faint 4px horizontal ruling (2.5% text ink)" },
  ];

  const swatches = materialTokens
    .map((item) => renderColorSwatch(tokens, item.key, item.note))
    .join("");

  return `<section class="chapter" id="material">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 05</span>
      <h2 class="chapter-title">Material</h2>
    </div>

    <p class="prose">
      Introduced on 27 November 2026 (design rollout slice F3, PR 968), Flump pairs neutral card materials with lit glass orbs. Card materials stay completely neutral (no violet or rose) and never obscure contrast: text on glass and paper clears 4.5:1 in both themes.
    </p>

    ${renderGlassOrbLightingDiagram(tokens)}

    ${renderCardMaterialLayersDiagram(tokens)}

    <h3 class="sub-title">Live material specimens</h3>
    <div class="grid-2">
      <article class="card-glass">
        <div class="badge-row">
          <h4 class="card-title">Soft glass card</h4>
          <span class="pill">Non-data cards in apps (tier A)</span>
        </div>
        <p class="prose">
          Uses <code>material.glass.fill</code>, <code>material.glass.border</code>, a 155 degree diagonal <code>material.glass.sheen</code> and <code>shadows.glass</code>. Interactive glass cards add a still radial hover light across the top, never a top-only border or a tilt in the apps.
        </p>
      </article>

      <article class="card-paper">
        <div class="badge-row" style="justify-content:space-between">
          <h4 class="card-title">Cash and savings</h4>
          ${renderExampleTag()}
        </div>
        <p class="prose num"><strong>£21,000</strong> at <strong>3.5% AER</strong></p>
        <p class="swatch-note">
          Uses <code>material.paper.fill</code>, faint 4px <code>material.paper.rule</code> lines, <code>material.paper.edge</code> and <code>shadows.paper</code>. Every document card showing sample figures carries a real-text "Example" tag.
        </p>
      </article>
    </div>

    <h3 class="sub-title">Material colour and shadow tokens</h3>
    <div class="swatch-grid">
      ${swatches}
    </div>
    <div class="grid-2">
      ${renderShadowSpecimen(tokens, "glass", "Inner top light over card elevation")}
      ${renderShadowSpecimen(tokens, "paper", "1px inset edge and soft drop below the sheet")}
    </div>

    ${renderSourceCite("STYLE-GUIDE 2.7, 8.3, 14; UX-GUIDELINES 12.1; Card.styles.ts; GlassOrb.styles.ts; Illustration.documents.ts")}
  </section>`;
}
