import { renderCoverGlassOrbs, renderK2LogoSvg, renderProvenanceComment } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

const CHAPTER_TOC = [
  { num: "01", id: "character-and-voice", title: "Character and voice" },
  { num: "02", id: "logo", title: "The logo" },
  { num: "03", id: "colour", title: "Colour" },
  { num: "04", id: "typography", title: "Typography" },
  { num: "05", id: "material", title: "Material" },
  { num: "06", id: "layout-radius-elevation", title: "Layout, radius and elevation" },
  { num: "07", id: "illustration", title: "Illustration" },
  { num: "08", id: "motion", title: "Motion" },
  { num: "09", id: "charts", title: "Charts" },
  { num: "10", id: "do-and-do-not", title: "Do and do not" },
  { num: "11", id: "evolution", title: "How the brand has evolved" },
  { num: "Ref", id: "reference", title: "Reference" },
] as const;

export function renderTopBar(tokens: BrandTokens, controlsHtml: string): string {
  const items = CHAPTER_TOC.map(
    (ch) =>
      `<li><a href="#${ch.id}"><span class="toc-num">${ch.num}</span><span>${ch.title}</span></a></li>`,
  ).join("");

  return `<header class="book-bar">
    <div class="book-bar-inner">
      <div class="book-bar-left">
        <a class="book-brand" href="#cover">
          ${renderK2LogoSvg(tokens, { idPrefix: "bar-k2", sizePx: 28 })}
          <span>Flump</span>
        </a>
        <details class="toc-drawer">
          <summary class="toc-trigger">Contents</summary>
          <nav class="toc-panel" aria-label="Brand book contents">
            <ol class="toc-list">
              ${items}
            </ol>
          </nav>
        </details>
      </div>
      ${controlsHtml}
    </div>
  </header>`;
}

export function renderCover(tokens: BrandTokens): string {
  const tocLinks = CHAPTER_TOC.map(
    (ch) =>
      `<li><a href="#${ch.id}"><span class="toc-num">${ch.num}</span><span>${ch.title}</span></a></li>`,
  ).join("");

  return `<section class="cover-spread" id="cover" aria-label="Flump brand book cover">
    ${renderCoverGlassOrbs()}
    <div class="spread-inner cover-content">
      <div class="cover-mark-wrap">
        ${renderK2LogoSvg(tokens, { idPrefix: "cover-k2", sizePx: 200, title: "Flump three-bubble logo" })}
      </div>
      <div style="display:grid;gap:var(--space-3);justify-items:center">
        <p class="cover-kicker">Flump: finance without the fog</p>
        <h1 class="cover-title">Flump brand book</h1>
        <p class="cover-lead">
          Flump helps everyday UK households see their accounts, budget, pay, savings, pension and debts in one place without bank logins, clutter or financial advice.
        </p>
        <p class="cover-meta-line">
          Visual and verbal identity across the website, web app and mobile app.
        </p>
      </div>
      <nav class="cover-index" aria-label="Chapters in this book">
        <ol class="cover-index-grid">
          ${tocLinks}
        </ol>
      </nav>
    </div>
    ${renderProvenanceComment("apps/marketing/src/utils/featureAreas.ts, HomeSecurity.tsx, STYLE-GUIDE 1, COPY-GUIDE 1 and 2.1")}
  </section>`;
}
