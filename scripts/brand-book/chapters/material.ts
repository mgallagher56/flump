import { renderCardMaterialLayersDiagram } from "../diagrams/cardMaterialLayers";
import { renderGlassOrbLightingDiagram } from "../diagrams/glassOrbLighting";
import { renderChapterOpener, renderProvenanceComment, renderScreenPair } from "../renderHelpers";
import type { BrandTokens } from "../tokens";
import { renderUiCardsSpecimen } from "../uiSpecimens";

export function renderMaterialChapter(tokens: BrandTokens): string {
  const openerVisual = `<div class="opener-visual-plate" style="justify-items:center">
    <div style="display:flex;align-items:center;justify-content:center;gap:24px;padding:12px 0">
      <span class="glass-orb glass-orb-sky" style="--orb-size:6.5rem" aria-hidden="true"></span>
      <span class="glass-orb glass-orb-violet" style="--orb-size:4.5rem" aria-hidden="true"></span>
      <span class="glass-orb glass-orb-teal" style="--orb-size:3.5rem" aria-hidden="true"></span>
    </div>
    <p class="swatch-note">Neutral glass and paper surfaces paired with colour-tinted glass spheres.</p>
  </div>`;

  return `<section class="chapter" id="material">
    ${renderChapterOpener({
      num: "05",
      title: "Material",
      lead: "Crisp neutral card surfaces keep financial text legible while lit glass orbs carry depth on the marketing site.",
      visualHtml: openerVisual,
      surface: "subtle",
      hook: "chapter-05",
    })}

    <div class="spread">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Three card surfaces from the UI library</h3>
          <p class="prose">
            Rendered directly from Flump's card component: solid resting cards hold saved figures, soft glass cards wrap navigation and marketing tiles, and ruled paper cards carry sample statements with a real-text "Example" tag.
          </p>
        </div>
        ${renderUiCardsSpecimen()}
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        ${renderScreenPair({
          baseName: "marketing-features",
          title: "Glass orbs and feature cards together",
          copy: "Orbs provide calm colour and spatial depth at the top of a page while neutral feature cards keep links and descriptions crisp underneath.",
          desktopAlt:
            "Marketing features page showing glass orbs beside the headline and neutral feature cards",
          phoneAlt: "Marketing features page at phone width",
          caption:
            "Everything Flump does at 1280px and 375px. Card materials stay neutral so text meets strict contrast in both themes.",
        })}
      </div>
    </div>

    <div class="spread">
      <div class="spread-inner">
        <div class="grid-2">
          ${renderGlassOrbLightingDiagram(tokens)}
          ${renderCardMaterialLayersDiagram(tokens)}
        </div>
      </div>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 2.7, 8.3, 14; UX-GUIDELINES 12.1; PRs 963, 968; Card.styles.ts; GlassOrb.styles.ts")}
  </section>`;
}
