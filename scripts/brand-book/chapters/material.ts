import { renderCardMaterialLayersDiagram } from "../diagrams/cardMaterialLayers";
import { renderGlassOrbLightingDiagram } from "../diagrams/glassOrbLighting";
import { renderExampleTag, renderProvenanceComment } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderMaterialChapter(tokens: BrandTokens): string {
  return `<section class="chapter" id="material">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 05</span>
      <h2 class="chapter-title">Material</h2>
    </div>

    <p class="prose">
      Flump pairs crisp, neutral card surfaces with soft lit glass orbs. Card materials never carry decorative violet or rose tints, so text on both glass and ruled paper cards meets strict contrast standards in both light and dark themes.
    </p>

    <h3 class="sub-title">Live material specimens</h3>
    <div class="grid-2">
      <article class="card-glass">
        <div class="badge-row">
          <h4 class="card-title">Soft glass card</h4>
          <span class="pill">Feature tiles and marketing cards</span>
        </div>
        <p class="prose">
          A neutral translucent fill with a crisp hairline edge, a soft top inner highlight and a subtle diagonal sheen. Interactive glass cards catch a gentle hover light without tilting or shifting figures in the apps.
        </p>
      </article>

      <article class="card-paper">
        <div class="badge-row" style="justify-content:space-between">
          <h4 class="card-title">Paper document card</h4>
          ${renderExampleTag()}
        </div>
        <p class="prose num"><strong>£21,000</strong> at <strong>3.5% AER</strong></p>
        <p class="swatch-note">
          Faint horizontal ruling, a 1 pixel paper edge and a soft drop shadow. Every document card that displays illustrative amounts carries a real-text "Example" tag.
        </p>
      </article>
    </div>

    ${renderGlassOrbLightingDiagram(tokens)}

    ${renderCardMaterialLayersDiagram(tokens)}

    <article class="card-subtle">
      <h3 class="card-title">Material rules</h3>
      <ul class="plain-list">
        <li>Glass cards are used for navigation features and non-data marketing blocks; data tables and saved figures sit on solid flat cards.</li>
        <li>Paper styling is used only for illustrative document pictures such as payslips, statements and monthly check-in slips.</li>
        <li>Both materials stay neutral in light and dark mode so text always remains sharp.</li>
      </ul>
    </article>

    ${renderProvenanceComment("STYLE-GUIDE 2.7, 8.3, 14; UX-GUIDELINES 12.1; PRs 963, 968; Card.styles.ts; GlassOrb.styles.ts")}
  </section>`;
}
