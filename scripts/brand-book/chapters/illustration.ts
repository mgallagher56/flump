import {
  renderChapterOpener,
  renderDocumentPictureSvg,
  renderProvenanceComment,
  renderScreenPair,
} from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderIllustrationChapter(tokens: BrandTokens): string {
  const defs = tokens.illustration.definitions;
  const openerVisual = `<div class="opener-visual-plate">
    ${renderDocumentPictureSvg(tokens, defs["feature-accounts"], "illus-opener-accounts", "orb")}
    <p class="swatch-note">Drawn live from shared shape coordinates used across the website, web app and mobile app.</p>
  </div>`;

  const appGallery = [
    {
      pic: defs["empty-accounts"],
      id: "illus-empty-accounts",
      title: "Empty accounts state",
      note: "Neutral paper and mint tones for an uncrowded starting screen.",
    },
    {
      pic: defs["check-in-done"],
      id: "illus-check-in-done",
      title: "Completed check-in",
      note: "A quiet calendar slip confirming the month is recorded.",
    },
    {
      pic: defs["empty-pension"],
      id: "illus-empty-pension",
      title: "Empty pension state",
      note: "Sample figure tagged with the real-text Example label.",
    },
  ]
    .map(
      (item) => `<article class="card">
        ${renderDocumentPictureSvg(tokens, item.pic, item.id, "app")}
        <h4 class="card-title">${item.title}</h4>
        <p class="swatch-note">${item.note}</p>
      </article>`,
    )
    .join("");

  const orbGallery = [
    {
      pic: defs["feature-ai-connection"],
      id: "illus-ai-connection",
      title: "AI connection",
      note: "Opt-in sky, teal, violet and rose accents on marketing.",
    },
    {
      pic: defs["feature-pay"],
      id: "illus-feature-pay",
      title: "Take-home pay slip",
      note: "Tilted payslip with tabular figures and crisp contrast.",
    },
    {
      pic: defs["feature-debt"],
      id: "illus-feature-debt",
      title: "Repayment schedule card",
      note: "Card statement illustration without alarm or red fills.",
    },
  ]
    .map(
      (item) => `<article class="card">
        ${renderDocumentPictureSvg(tokens, item.pic, item.id, "orb")}
        <h4 class="card-title">${item.title}</h4>
        <p class="swatch-note">${item.note}</p>
      </article>`,
    )
    .join("");

  return `<section class="chapter" id="illustration">
    ${renderChapterOpener({
      num: "07",
      title: "Illustration",
      lead: "Tilted paper documents, bank cards, payslips and calendar slips drawn directly from shared shape coordinates.",
      visualHtml: openerVisual,
      surface: "subtle",
      hook: "chapter-07",
    })}

    <div class="spread">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Quiet paper documents in the apps</h3>
          <p class="prose">
            Empty states and monthly check-ins stay neutral in paper and mint tones, tilted at most 6 degrees and sized so small text never drops below 12 pixels. Every sample figure carries a real-text "${tokens.illustration.exampleTag.text}" tag.
          </p>
        </div>
        <div class="grid-3">
          ${appGallery}
        </div>
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Opt-in orb accents on marketing</h3>
          <p class="prose">
            On the marketing site, selected graphic details opt into sky, teal, violet and rose tones while keeping every text line crisp.
          </p>
        </div>
        <div class="grid-3">
          ${orbGallery}
        </div>
      </div>
    </div>

    <div class="spread">
      <div class="spread-inner">
        ${renderScreenPair({
          baseName: "marketing-ai-connection",
          title: "Document pictures and orbs on a real marketing page",
          copy: "Glass orbs anchor the opening hero while tilted paper document cards demonstrate how the AI connection works underneath.",
          desktopAlt:
            "Marketing AI connection page at 1280px showing glass orbs and tilted document preview",
          phoneAlt: "Marketing AI connection page at 375px phone width",
          caption: "AI connection page at 1280px and 375px.",
        })}
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="grid-2">
          <article class="card">
            <h3 class="card-title">Where illustrations belong</h3>
            <ul class="plain-list">
              <li>Illustrations are decorative and always sit beside plain text carrying the full meaning.</li>
              <li>Empty states pair one paper picture with one sentence and one clear action.</li>
              <li>Every document showing sample pounds or percentages carries the real-text "Example" tag.</li>
            </ul>
          </article>
          <article class="card">
            <h3 class="card-title">What we leave out</h3>
            <ul class="plain-list">
              <li>Never place illustrations beside prices, beside personal figures on narrow screens, inside notices or inside money errors. Error pages stay still.</li>
              <li>Never draw people, faces, piles of coins, upward-arrow growth graphics, red fills, chequered flags or glass objects inside pictures.</li>
            </ul>
          </article>
        </div>
      </div>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 8, 8.1 to 8.3; UX-GUIDELINES 12.1, 12.2, 14; Illustration.documents.ts")}
  </section>`;
}
