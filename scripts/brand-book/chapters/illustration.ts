import { renderDocumentPictureSvg, renderProvenanceComment } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderIllustrationChapter(tokens: BrandTokens): string {
  const defs = tokens.illustration.definitions;
  const accountsPic = defs["empty-accounts"];
  const aiPic = defs["feature-ai-connection"];

  return `<section class="chapter" id="illustration">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 07</span>
      <h2 class="chapter-title">Illustration</h2>
    </div>

    <p class="prose">
      Instead of generic spot graphics, Flump draws tilted paper documents, bank cards, payslips and calendar slips directly from shared shape coordinates. Rendering from one data source keeps the web app, marketing site and mobile app identical and allows every picture to adapt to light and dark themes.
    </p>

    <div class="grid-2">
      <article class="card">
        <h3 class="card-title">Document cards in the apps</h3>
        <p class="prose">
          Empty states and monthly check-in screens use neutral paper and mint tones, tilted at most 6 degrees and sized so small text stays at 12 pixels or larger. Any sample figures carry a real-text "${tokens.illustration.exampleTag.text}" tag.
        </p>
        ${renderDocumentPictureSvg(tokens, accountsPic, "illus-empty-accounts", "app")}
        <p class="swatch-note">Empty accounts state rendered live in the quiet app palette.</p>
      </article>

      <article class="card">
        <h3 class="card-title">Opt-in orb palette on marketing</h3>
        <p class="prose">
          On the marketing home page and the AI connection page, selected graphic shapes inside document pictures opt into the sky, teal, violet and rose orb accents while keeping text contrast sharp.
        </p>
        ${renderDocumentPictureSvg(tokens, aiPic, "illus-ai-connection", "orb")}
        <p class="swatch-note">AI connection document picture rendered live with the marketing orb accents.</p>
      </article>
    </div>

    <article class="card-subtle">
      <h3 class="card-title">Placement and exclusions</h3>
      <ul class="plain-list">
        <li>Illustrations are decorative and always sit beside clear text that carries the full meaning.</li>
        <li>Never place an illustration beside a price on the pricing page, beside a live personal figure on narrow viewports, inside a notice banner, or inside an error about money. Error pages keep their illustration still.</li>
        <li>Never draw people, faces, piles of coins, upward-arrow growth clichés, red fills, chequered finish flags or glass objects inside pictures.</li>
      </ul>
    </article>

    ${renderProvenanceComment("STYLE-GUIDE 8, 8.1 to 8.3; UX-GUIDELINES 12.1, 12.2, 14; Illustration.documents.ts")}
  </section>`;
}
