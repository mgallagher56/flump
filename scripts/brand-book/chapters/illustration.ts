import {
  renderChapterOpener,
  renderDocumentPictureSvg,
  renderProvenanceComment,
  renderScreenPair,
} from "../renderHelpers";
import type { BrandTokens } from "../tokens";
import { renderUiExampleTagSpecimen } from "../uiSpecimens";

export function renderIllustrationChapter(tokens: BrandTokens): string {
  const defs = tokens.illustration.definitions;
  const h = tokens.sampleHousehold;
  const openerVisual = `<div class="opener-visual-plate">
    ${renderDocumentPictureSvg(tokens, defs["feature-accounts"], "illus-opener-accounts", "orb")}
    <p class="swatch-note">Drawn live from shared shape coordinates used across the website, web app and mobile app.</p>
  </div>`;

  const madeFromRows = [
    { name: "Cash and savings", detail: h.savingsRate, figure: h.savings, slot: "1" },
    { name: "Pension", detail: "Workplace and personal", figure: h.pension, slot: "2" },
    { name: "Salary", detail: `${h.netMonthly} a month after tax`, figure: h.salary, slot: "3" },
    {
      name: "Budget",
      detail: `${h.comesIn} in, ${h.goesOut} out`,
      figure: `${h.leftOver} left`,
      slot: "4",
    },
    {
      name: "Mortgage",
      detail: `${h.mortgageRate}, fixed until ${h.fixedUntil}`,
      figure: h.mortgage,
      slot: "5",
    },
    { name: "Credit card", detail: h.cardRate, figure: h.card, slot: "6" },
  ]
    .map(
      (row) => `<li class="gather-made-row" style="--row-index:${row.slot}">
        <span class="gather-row-bar" aria-hidden="true"></span>
        <span class="gather-row-text">
          <strong>${row.name}</strong>
          <span class="swatch-note">${row.detail}</span>
        </span>
        <span class="gather-row-fig num">${row.figure}</span>
      </li>`,
    )
    .join("");

  const gatherCards = [
    { title: "Cash and savings", figure: h.savings, tone: "charcoal", pos: "tl" },
    { title: "Payslip", figure: h.netMonthly, tone: "paper", pos: "tr" },
    { title: "This month", figure: h.leftOver, tone: "paper", pos: "ml" },
    { title: "Mortgage statement", figure: h.mortgage, tone: "paper", pos: "mr" },
    { title: "Pension statement", figure: h.pension, tone: "paper", pos: "bl" },
    { title: "Credit card", figure: h.card, tone: "mint", pos: "br" },
  ]
    .map(
      (card, index) =>
        `<div class="gather-piece gather-piece-${card.pos} gather-piece-${card.tone}" style="--piece-index:${index}">
          <span class="gather-piece-title">${card.title}</span>
          <span class="gather-piece-fig num">${card.figure}</span>
        </div>`,
    )
    .join("");

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
        <div class="editorial-split editorial-split-text-first">
          <div class="editorial-copy">
            <h3 class="sub-title">Documents gathering into one picture</h3>
            <p class="prose">
              On the home page, six sample household documents settle together into the Monthly picture card. Under reduced motion or print, only the finished picture is shown.
            </p>
            <div class="motion-demo-controls">
              <button type="button" class="motion-replay-btn" data-motion-replay="assembling-hero">Play again</button>
            </div>
          </div>

          <figure class="motion-demo-card" data-motion-demo="assembling-hero" data-motion-playable="assembling-hero">
            <div class="motion-gather-stage">
              <div class="motion-gather-card">
                <div class="ui-card-head">
                  <strong class="card-title">Monthly picture</strong>
                  ${renderUiExampleTagSpecimen("paper")}
                </div>
                <div class="gather-kpis">
                  <div class="hero-panel" style="padding:var(--space-4)">
                    <span class="swatch-note" style="color:var(--color-text-on-hero)">Net worth</span>
                    <strong class="ui-card-figure num" style="color:var(--color-text-hero-figure)">${h.netWorth}</strong>
                  </div>
                  <div class="card-subtle" style="padding:var(--space-4)">
                    <span class="swatch-note">Left over each month</span>
                    <strong class="ui-card-figure num">${h.leftOver}</strong>
                  </div>
                </div>
                <ul class="gather-made-list">
                  ${madeFromRows}
                </ul>
              </div>
              <div class="motion-gather-layer" aria-hidden="true">
                ${gatherCards}
              </div>
            </div>
            <figcaption class="diagram-caption">
              Six household documents gathering once into one Monthly picture card, showing the home page opening sequence.
            </figcaption>
          </figure>
        </div>
      </div>
    </div>

    <div class="spread spread-subtle">
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

    <div class="spread">
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
