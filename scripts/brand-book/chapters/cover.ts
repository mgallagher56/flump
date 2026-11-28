import { renderK2LogoSvg } from "../renderHelpers";
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
] as const;

export function renderSidebarToc(): string {
  const items = CHAPTER_TOC.map(
    (ch) =>
      `<li><a href="#${ch.id}"><span class="toc-num">${ch.num}</span><span>${ch.title}</span></a></li>`,
  ).join("");
  return `<aside class="toc-sidebar" aria-label="Brand book contents">
    <h2 class="toc-title">Contents</h2>
    <nav aria-label="Contents">
      <ol class="toc-list">
        ${items}
      </ol>
    </nav>
  </aside>`;
}

export function renderCover(tokens: BrandTokens): string {
  const tocLinks = CHAPTER_TOC.map(
    (ch) =>
      `<li><a href="#${ch.id}"><span class="toc-num">${ch.num}</span><span>${ch.title}</span></a></li>`,
  ).join("");

  return `<header class="cover-card">
    <div class="cover-header">
      ${renderK2LogoSvg(tokens, { idPrefix: "cover-k2", sizePx: 72, title: "Flump logo" })}
      <div>
        <p class="chapter-kicker">Flump: finance without the fog</p>
        <h1 class="cover-title">Flump brand book</h1>
      </div>
    </div>
    <p class="cover-lead">
      A single visual and verbal reference for Flump across the web app, marketing site and mobile app. Every colour, size, radius, shadow, type style and motion value on this page is read directly from the token source in <code>packages/tokens/src</code>.
    </p>
    <p class="prose">
      The standing specification documents in <code>docs/ux/</code> (<code>STYLE-GUIDE.md</code>, <code>UX-GUIDELINES.md</code> and <code>CROSS-PLATFORM.md</code>) and <code>docs/copy/COPY-GUIDE.md</code> remain the binding rules and take precedence over any summary here.
    </p>
    <nav aria-label="Cover contents">
      <h2 class="sub-title">In this book</h2>
      <ol class="toc-list">
        ${tocLinks}
      </ol>
    </nav>
  </header>`;
}
