import { renderPaletteEvolutionDiagram } from "../diagrams/paletteEvolution";
import {
  renderDocumentPictureSvg,
  renderFlatSceneSvg,
  renderK2LogoSvg,
  renderProvenanceComment,
  renderThemedImage,
} from "../renderHelpers";
import type { BrandTokens } from "../tokens";

interface KeyFrame {
  file: string;
  title: string;
  date: string;
  caption: string;
  chosen?: boolean;
}

const MARKETING_KEY_FRAMES: ReadonlyArray<KeyFrame> = [
  {
    file: "proto-first-round.jpg",
    title: "First round: quiet micro-interactions",
    date: "26 November 2026",
    caption:
      "Early exploration kept the page mostly still and tested small interactive responses around the dashboard summary.",
  },
  {
    file: "proto-orb-guide.jpg",
    title: "The glass orb as a guide",
    date: "26 November 2026",
    caption:
      "Placed a lit glass orb beside the headline as a visual guide that could travel with the reader down the page.",
  },
  {
    file: "proto-scroll-journey.jpg",
    title: "The scroll journey",
    date: "26 November 2026",
    caption:
      "Tested a continuous dotted path carrying small floating spheres through each area of household money.",
  },
  {
    file: "proto-chosen-home.jpg",
    title: "The chosen home page design",
    date: "26 and 27 November 2026",
    caption:
      "Combined assembling document cards over the finished dashboard at the top with the calm scroll journey underneath.",
    chosen: true,
  },
];

export function renderEvolutionChapter(tokens: BrandTokens): string {
  const keyFramesHtml = MARKETING_KEY_FRAMES.map((frame) => {
    const cls = frame.chosen ? "contact-tile contact-tile-chosen" : "contact-tile";
    return `<figure class="${cls}">
      <img class="history-img" src="assets/history/${frame.file}" alt="${frame.title} in dark theme" width="960" height="600" loading="lazy"/>
      <figcaption class="contact-tile-meta">
        <span class="contact-tile-title">${frame.title}</span>
        <span class="contact-tile-date">${frame.date}</span>
        <span class="swatch-note">${frame.caption}</span>
      </figcaption>
    </figure>`;
  }).join("");

  return `<section class="chapter" id="evolution">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 11</span>
      <h2 class="chapter-title">How the brand has evolved</h2>
    </div>

    <p class="prose">
      Flump's visual identity took shape over two focused weeks in November 2026, moving from a warm cream ledger look to the distinct Mint and Midnight themes, paper document illustrations, an interactive home page and the three-bubble mark.
    </p>

    <div class="timeline">
      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">14 to 20 November 2026</span>
          <h3 class="card-title">The first look: warm cream, deep green and sand</h3>
        </div>
        <p class="prose">
          The initial release paired warm cream backgrounds and sand-tinted neutrals with deep teal-green headline panels, Plus Jakarta Sans headings and Inter body text. On 15 November, a round of updates added a soft plum accent, simple flat illustrations, the setup progress ring and the plain-language label "Breathing room".
        </p>
        <div class="grid-2">
          ${renderThemedImage({
            lightFile: "baseline-2026-11-20-home-light.jpg",
            darkFile: "baseline-2026-11-20-home-dark.jpg",
            alt: "Marketing home page on 20 November 2026 in the first warm cream and deep green palette",
            width: 960,
            height: 675,
            caption:
              'Home page on 20 November 2026: warm surfaces, "All your money. One clear picture." and a deep green headline card.',
          })}
          ${renderThemedImage({
            lightFile: "baseline-2026-11-20-dash-light.jpg",
            darkFile: "baseline-2026-11-20-dash-dark.jpg",
            alt: "Web dashboard on 20 November 2026 in the first warm cream and deep green palette",
            width: 960,
            height: 477,
            caption:
              "Web dashboard on 20 November 2026: deep green headline net worth block above summary cards and monthly check-in.",
          })}
        </div>
        ${renderProvenanceComment("DECISIONS.md (round 5, 12 Nov 2026), STYLE-GUIDE 14, commits f9e258b65, fd845e44f, c9bf34005, 9e385a3dc, f80ed2fc6")}
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">24 and 25 November 2026</span>
          <h3 class="card-title">Moving to Midnight and Mint</h3>
        </div>
        <p class="prose">
          The owner replaced the cream and deep green look on 24 November 2026 because it sat too close to another company's site, and wanted Flump to have its own distinct character. Mint introduced a pale mint canvas with a solid mint headline card and charcoal primary buttons; Midnight introduced cool charcoal surfaces with mint figures. On 25 November, the light logo mark returned from charcoal to deep teal.
        </p>
        <div class="grid-2">
          ${renderThemedImage({
            lightFile: "baseline-2026-11-20-dash-light.jpg",
            darkFile: "baseline-2026-11-20-dash-dark.jpg",
            alt: "Web dashboard before the switch on 20 November 2026",
            width: 960,
            height: 477,
            caption: "Before (20 November 2026): warm cream and warm dark surfaces.",
          })}
          ${renderThemedImage({
            lightFile: "baseline-2026-11-25-dash-light.jpg",
            darkFile: "baseline-2026-11-25-dash-dark.jpg",
            alt: "Web dashboard after the Midnight and Mint switch on 25 November 2026",
            width: 960,
            height: 477,
            caption:
              "After (25 November 2026): Mint in light mode and cool charcoal Midnight in dark mode.",
          })}
        </div>
        ${renderPaletteEvolutionDiagram(tokens)}
        ${renderProvenanceComment("STYLE-GUIDE 14 (24 and 25 Nov 2026), DECISIONS.md (24 Nov 2026), PRs 901, 913, 937, commits 8734d8a21, 79e77ba59, 515cbcb92")}
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">15 to 27 November 2026</span>
          <h3 class="card-title">Pictures: from flat scenes to paper documents</h3>
        </div>
        <p class="prose">
          Early illustrations used simple rounded geometric scenes with a sun and dotted arc. On 27 November 2026, Flump moved to tilted paper documents, bank cards and calendar slips drawn from shared shape data, keeping every sample figure clearly marked with a real-text "Example" tag.
        </p>
        <div class="grid-2">
          <figure class="card-subtle">
            ${renderFlatSceneSvg(tokens.illustration.scenes["check-in-done"], "Earlier flat illustration of a completed monthly check-in", "hist-flat-checkin")}
            <figcaption class="swatch-note">Before: flat geometric calendar scene with rounded forms and confirmation tick.</figcaption>
          </figure>
          <figure class="card-subtle">
            ${renderDocumentPictureSvg(tokens, tokens.illustration.definitions["check-in-done"], "hist-doc-checkin", "app")}
            <figcaption class="swatch-note">After: paper check-in slip drawn live from shared coordinates, carrying the "Example" tag.</figcaption>
          </figure>
        </div>
        ${renderProvenanceComment("STYLE-GUIDE 8.1, 8.3, 14; PR 968 (cac6aab93); Illustration.scenes.tsx and Illustration.documents.ts")}
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">26 and 27 November 2026</span>
          <h3 class="card-title">Designing the home page</h3>
        </div>
        <p class="prose">
          Over two days, thirteen interactive motion prototypes tested how the marketing site should move without overwhelming people. Four key stages trace the path from quiet micro-interactions to the chosen design.
        </p>
        <div class="grid-2">
          ${keyFramesHtml}
        </div>
        ${renderProvenanceComment("origin/claude/marketing-motion-prototypes-66c08d, ROLLOUT-PLAN.md, DECISIONS.md (27 Nov 2026, D1 to D7)")}
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">27 and 28 November 2026</span>
          <h3 class="card-title">The finished home page</h3>
        </div>
        <p class="prose">
          On 27 and 28 November 2026, the rebuilt home page and feature pages shipped with assembling document cards, glass orbs and the new three-bubble mark, while leaving full-width solid colour bands behind.
        </p>
        <div class="grid-2">
          ${renderThemedImage({
            lightFile: "baseline-2026-11-25-home-light.jpg",
            darkFile: "baseline-2026-11-25-home-dark.jpg",
            alt: "Marketing home page before the rebuild on 25 November 2026",
            width: 960,
            height: 675,
            caption: "Before (25 November 2026): single-column hero above a solid colour band.",
          })}
          ${renderThemedImage({
            lightFile: "baseline-2026-11-28-home-light.jpg",
            darkFile: "baseline-2026-11-28-home-dark.jpg",
            alt: "Marketing home page after the rebuild on 28 November 2026",
            width: 960,
            height: 675,
            caption:
              "After (28 November 2026): split hero with monthly picture card, soft bubbles and three-bubble mark.",
          })}
        </div>
        <div class="grid-2">
          <figure class="history-figure">
            <video class="history-video" muted loop playsinline controls preload="metadata" poster="assets/history/baseline-2026-11-28-home-light.jpg" width="960" height="675" data-brand-video="hero">
              <source src="assets/video/home-hero-light.webm" type="video/webm">
            </video>
            <figcaption class="swatch-note">The finished home page hero assembling from six household documents in light theme (8 seconds).</figcaption>
          </figure>
          <figure class="history-figure">
            <video class="history-video" muted loop playsinline controls preload="metadata" poster="assets/history/baseline-2026-11-28-home-dark.jpg" width="960" height="600" data-brand-video="journey">
              <source src="assets/video/home-journey-dark.webm" type="video/webm">
            </video>
            <figcaption class="swatch-note">The scroll journey stepping through Flump's money areas in dark theme.</figcaption>
          </figure>
        </div>
        ${renderProvenanceComment("Visual baselines 79e77ba59 (25 Nov 2026) and 2949ac139 (28 Nov 2026); PRs 975, 980, 986; .brand-inputs/v2/home-hero-light.webm and home-journey-dark.webm")}
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">12 to 27 November 2026</span>
          <h3 class="card-title">The logo: from a single blob to three glass bubbles</h3>
        </div>
        <p class="prose">
          Flump began with a single teal sphere mark. When the marketing site introduced lit glass bubbles, three design rounds tested clearer silhouettes that could still read at favicon size before landing on the three-bubble mark on 27 November 2026.
        </p>

        <div class="card-subtle">
          <h4 class="card-title">The earlier mark (before 27 November 2026)</h4>
          ${renderThemedImage({
            lightFile: "logo-old-light.png",
            darkFile: "logo-old-dark.png",
            alt: "Earlier single teal sphere Flump mark and wordmark",
            width: 976,
            height: 298,
            caption:
              "Single teal sphere mark used across the first release and the initial Midnight and Mint release.",
          })}
        </div>

        <h4 class="sub-title">Alternatives considered</h4>
        <div class="logo-alt-grid">
          ${renderThemedImage({
            lightFile: "logo-alt-orb-light.png",
            darkFile: "logo-alt-orb-dark.png",
            alt: "Alternative logo: single glass orb",
            width: 976,
            height: 298,
            caption: "Single glass orb: soft translucent sphere echoing the marketing orb.",
          })}
          ${renderThemedImage({
            lightFile: "logo-alt-rising-light.png",
            darkFile: "logo-alt-rising-dark.png",
            alt: "Alternative logo: rising bubbles",
            width: 976,
            height: 298,
            caption: "Rising bubbles: a large base bubble lifting two smaller spheres.",
          })}
          ${renderThemedImage({
            lightFile: "logo-alt-cluster-light.png",
            darkFile: "logo-alt-cluster-dark.png",
            alt: "Alternative logo: bubble cluster",
            width: 976,
            height: 298,
            caption: "Bubble cluster: four nested spheres grouped around the teal core.",
          })}
        </div>

        <h4 class="sub-title">The chosen three-bubble mark</h4>
        <div class="logo-showcase-hero">
          ${renderK2LogoSvg(tokens, { idPrefix: "hist-chosen-logo", sizePx: 136, title: "Chosen three-bubble Flump mark" })}
          <div>
            <div class="brand-wordmark">Flump</div>
            <p class="swatch-note">Shipped on 27 November 2026 across the website, web app, browser favicon and mobile app icons.</p>
          </div>
        </div>
        ${renderProvenanceComment("STYLE-GUIDE 9 and 14 (27 Nov 2026); PR 981 (5bf009a04); .brand-inputs/v2/r1-1, r1-3, r1-4, r2-6; FlumpLogo.art.ts")}
      </article>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 2.2, 2.7, 8.3, 9, 14; DECISIONS.md; ROLLOUT-PLAN.md; git history; visual baselines; PRs 901 to 986")}
  </section>`;
}
