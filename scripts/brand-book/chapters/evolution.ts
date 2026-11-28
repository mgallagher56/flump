import { renderLogoHistoryDiagram } from "../diagrams/logoHistory";
import { renderPaletteEvolutionDiagram } from "../diagrams/paletteEvolution";
import { renderSourceCite } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

interface PrototypeThumb {
  id: string;
  file: string;
  title: string;
  round: string;
  date: string;
  chosen?: boolean;
}

const PROTOTYPE_THUMBS: ReadonlyArray<PrototypeThumb> = [
  {
    id: "p1",
    file: "proto-p1.jpg",
    title: "1. Micro-interactions",
    round: "Round 1 (35544df46)",
    date: "26 Nov 2026",
  },
  {
    id: "p2",
    file: "proto-p2.jpg",
    title: "2. Scroll story",
    round: "Round 1 (35544df46)",
    date: "26 Nov 2026",
  },
  {
    id: "p3",
    file: "proto-p3.jpg",
    title: "3. 3D hero",
    round: "Round 1 (35544df46)",
    date: "26 Nov 2026",
  },
  {
    id: "p1b",
    file: "proto-p1b.jpg",
    title: "1b. Micro-interactions, extended",
    round: "Round 2 (e82a4bf0f)",
    date: "26 Nov 2026",
  },
  {
    id: "p4",
    file: "proto-p4.jpg",
    title: "4. The picture assembles",
    round: "Round 2 (e82a4bf0f)",
    date: "26 Nov 2026",
  },
  {
    id: "p5",
    file: "proto-p5.jpg",
    title: "5. Five scenes",
    round: "Round 2 (e82a4bf0f)",
    date: "26 Nov 2026",
  },
  {
    id: "p6",
    file: "proto-p6.jpg",
    title: "6. The orb as a guide",
    round: "Round 2 (e82a4bf0f)",
    date: "26 Nov 2026",
  },
  {
    id: "p7",
    file: "proto-p7.jpg",
    title: "7. Fly-through",
    round: "Round 2 (e82a4bf0f)",
    date: "26 Nov 2026",
  },
  {
    id: "p8",
    file: "proto-p8.jpg",
    title: "8. Assembled",
    round: "Round 3 (6f3f0922d / e82a4bf0f)",
    date: "26 Nov 2026",
  },
  {
    id: "p9",
    file: "proto-p9.jpg",
    title: "9. The journey",
    round: "Round 3 (e82a4bf0f)",
    date: "26 Nov 2026",
  },
  {
    id: "p10",
    file: "proto-p10.jpg",
    title: "10. Both",
    round: "Round 3 (e82a4bf0f)",
    date: "26 Nov 2026",
  },
  {
    id: "p11b",
    file: "proto-p11b.jpg",
    title: "11b. Both, reworked, no three.js",
    round: "Round 4 (6f3f0922d)",
    date: "26 Nov 2026",
  },
  {
    id: "p11",
    file: "proto-p11.jpg",
    title: "11. Both, reworked (chosen)",
    round: "Rounds 4 to 5 (6f3f0922d, 015481a1d)",
    date: "26 to 27 Nov 2026",
    chosen: true,
  },
];

function renderHistoryImg(
  file: string,
  alt: string,
  width: number,
  height: number,
  caption?: string,
): string {
  const cap = caption ? `<figcaption class="swatch-note">${caption}</figcaption>` : "";
  return `<figure class="history-figure">
    <img class="history-img" src="assets/history/${file}" alt="${alt}" width="${width}" height="${height}" loading="lazy"/>
    ${cap}
  </figure>`;
}

export function renderEvolutionChapter(tokens: BrandTokens): string {
  const prototypeSheet = PROTOTYPE_THUMBS.map((item) => {
    const cls = item.chosen ? "contact-tile contact-tile-chosen" : "contact-tile";
    const altTitle = item.title.replace(/\bpicture\b/gi, "dashboard");
    return `<figure class="${cls}">
      <img class="history-img" src="assets/history/${item.file}" alt="Marketing motion prototype ${altTitle} at 1280px dark first frame" width="560" height="350" loading="lazy"/>
      <figcaption class="contact-tile-meta">
        <span class="contact-tile-title">${item.title}</span>
        <span class="contact-tile-date">${item.date}</span>
        <span class="swatch-note">${item.round}</span>
      </figcaption>
    </figure>`;
  }).join("");

  return `<section class="chapter" id="evolution">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 11</span>
      <h2 class="chapter-title">How the brand has evolved</h2>
    </div>

    <p class="prose">
      Every visual turn in Flump is recorded in git history, visual regression baselines and owner decision logs from November 2026. The timeline below traces the path from three early design directions through Midnight and Mint, the marketing motion prototypes and the K2 mark.
    </p>

    <div class="timeline">
      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">12 November 2026</span>
          <h3 class="card-title">E15 visual directions and the round 5 choice</h3>
        </div>
        <div class="history-grid-3">
          ${renderHistoryImg("e15-direction-a.jpg", "E15 Direction A Calm Ledger mock-up rendered without its web font", 800, 562, "Direction A: Calm Ledger (rendered without its web font).")}
          ${renderHistoryImg("e15-direction-b.jpg", "E15 Direction B Instrument Panel mock-up rendered without its web font", 800, 562, "Direction B: Instrument Panel (rendered without its web font).")}
          ${renderHistoryImg("e15-direction-c.jpg", "E15 Direction C Warm Guide mock-up rendered without its web font", 800, 562, "Direction C: Warm Guide (rendered without its web font).")}
        </div>
        <p class="history-caption">
          Three standalone mock-ups explored Flump's character: Calm Ledger (A), Instrument Panel (B) and Warm Guide (C), all rendered here without their external web fonts. In decision round 5, the owner chose Direction C's warm teal-green palette and soft shapes on Direction A's calm-ledger structure, keeping Plus Jakarta Sans and Inter (no serif). Source: <code>DECISIONS.md</code> (round 5, 12 November 2026), commit <code>f9e258b65</code> and <code>docs/design/e15/directions/</code>.
        </p>
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">14 to 20 November 2026</span>
          <h3 class="card-title">Direction C as shipped, and E17 warmth and life</h3>
        </div>
        <div class="grid-2">
          ${renderHistoryImg("baseline-2026-11-14-home-light.jpg", "Marketing home page visual baseline on 14 November 2026 in Direction C light theme", 960, 675, "14 Nov 2026 marketing home baseline (fd845e44f): cream canvas and deep teal-green hero.")}
          ${renderHistoryImg("baseline-2026-11-14-dash-light.jpg", "Web dashboard visual baseline on 14 November 2026 in Direction C light theme", 960, 675, "14 Nov 2026 web dashboard baseline (fd845e44f): sand neutrals and warm card surfaces.")}
          ${renderHistoryImg("e17-options.jpg", "E17 options sheet showing accent, setup progress, illustrations and section headers rendered without its web font", 960, 675, "15 Nov 2026 E17 options sheet (rendered without its web font).")}
          ${renderHistoryImg("baseline-2026-11-20-home-light.jpg", "Marketing home page visual baseline on 20 November 2026 in light theme", 960, 675, "20 Nov 2026 marketing home light baseline (f80ed2fc6): alternating canvas and teal-tint bands.")}
        </div>
        ${renderHistoryImg("baseline-2026-11-20-home-dark.jpg", "Marketing home page visual baseline on 20 November 2026 in Direction C dark theme", 960, 675, "20 Nov 2026 marketing home dark baseline (f80ed2fc6), the last baseline before Midnight and Mint.")}
        <p class="history-caption">
          Real visual baselines show Direction C in production: cream canvas, deep teal-green hero and sand neutrals on 14 November (<code>fd845e44f</code>), then alternating teal-tint marketing bands on 20 November (<code>f80ed2fc6</code>). In between, E17 on 15 November added the Damson accent, the flat illustration style sheet, the setup progress ring, section headers and the name "Breathing room" (<code>c9bf34005</code>, <code>9e385a3dc</code>). Source: <code>docs/design/e17-options/README.md</code>, <code>STYLE-GUIDE.md</code> section 14 and visual baseline commits <code>fd845e44f</code> and <code>f80ed2fc6</code>.
        </p>
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">24 November 2026</span>
          <h3 class="card-title">Midnight and Mint replace Direction C</h3>
        </div>
        <div class="grid-2">
          ${renderHistoryImg("midnight-mint-light.jpg", "Light Mint design mock-up rendered without its web font", 960, 675, "Light Mint mock-up (rendered without its web font).")}
          ${renderHistoryImg("midnight-mint-dark.jpg", "Midnight dark design mock-up rendered without its web font", 960, 675, "Midnight dark mock-up (rendered without its web font).")}
          ${renderHistoryImg("baseline-2026-11-25-dash-light.jpg", "Web dashboard visual baseline after Midnight and Mint on 25 November 2026 in light theme", 960, 675, "Shipped Mint dashboard (79e77ba59, 25 Nov 2026): pale mint canvas and solid mint hero.")}
          ${renderHistoryImg("baseline-2026-11-25-dash-dark.jpg", "Web dashboard visual baseline after Midnight and Mint on 25 November 2026 in dark theme", 960, 675, "Shipped Midnight dashboard (79e77ba59, 25 Nov 2026): cool charcoal surfaces and mint figures.")}
        </div>
        ${renderPaletteEvolutionDiagram(tokens)}
        <p class="history-caption">
          The owner replaced Direction C because the cream and deep teal-green look closely resembled another company's site; no copying was found, and the owner wanted Flump to look distinct. Midnight (cool charcoal dark theme) and Mint (pale mint canvas, solid mint light hero and charcoal primary buttons) shipped in PR 901 (<code>8734d8a21</code>, <code>620b7b533</code>) and were checked across all routes in PR 913 (<code>05c41aef2</code>). Source: <code>STYLE-GUIDE.md</code> section 14, <code>DECISIONS.md</code> (24 November 2026) and <code>docs/design/midnight-mint/README.md</code>.
        </p>
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">25 November 2026</span>
          <h3 class="card-title">The light logo turns teal</h3>
        </div>
        <p class="history-caption">
          Midnight and Mint mock-ups drew the light logo as charcoal, and PR 901 painted <code>FlumpLogo</code> with the charcoal button fill tokens (<code>primary.solid</code> and <code>primary.hover</code>). After the owner reported the light logo as black, PR 937 (commits <code>515cbcb92</code> and <code>a713ff025</code>) introduced dedicated <code>primary.mark</code> and <code>primary.markLit</code> tokens so the light mark and favicon returned to teal while dark stayed mint. Source: <code>STYLE-GUIDE.md</code> section 14, <code>DECISIONS.md</code> (25 November 2026) and PR 937.
        </p>
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">26 and 27 November 2026</span>
          <h3 class="card-title">Marketing motion prototypes 1 to 11</h3>
        </div>
        <div class="contact-sheet">
          ${prototypeSheet}
        </div>
        <p class="history-caption">
          Thirteen throwaway prototypes on branch <code>origin/claude/marketing-motion-prototypes-66c08d</code> tested how Flump's calm marketing language should move: micro-interactions and fog in round 1 (26 November), five area scenes, a travelling orb and assembling cards in round 2, combined journeys in round 3 and the reworked prototype 11 in rounds 4 and 5 (26 and 27 November). On 27 November 2026 the owner chose prototype 11 and accepted all six recommendations in <code>ROLLOUT-PLAN.md</code> (D1 to D6) plus the pay rise glide (D7). Source: <code>origin/claude/marketing-motion-prototypes-66c08d</code>, <code>docs/design/motion/ROLLOUT-PLAN.md</code> and <code>DECISIONS.md</code>.
        </p>
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">27 November 2026</span>
          <h3 class="card-title">Design language rollout F1 to F4 and document pictures</h3>
        </div>
        ${renderHistoryImg("p11-images-r6-light.jpg", "Prototype 11 round 6 tilted paper document cards with Example tags in light mode", 960, 825, "Prototype 11 picture round 6: paper cards and documents tagged Example before slice F3 mapped them to semantic tokens.")}
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th scope="col">Slice</th><th scope="col">PR and commit</th><th scope="col">What landed</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>F1</strong></td><td>PR 959 (<code>907ceaf3f</code>)</td><td>Amended STYLE-GUIDE and UX-GUIDELINES for the marketing design language, tiers A to C and D1 to D6.</td></tr>
              <tr><td><strong>F2</strong></td><td>PR 963 (<code>cf15c90aa</code>)</td><td>Added calm scale tokens, <code>orb.*</code> sets, <code>material.glass.*</code> and <code>material.paper.*</code>, and <code>check-orb-colours</code>.</td></tr>
              <tr><td><strong>F3</strong></td><td>PR 968 (<code>cac6aab93</code>)</td><td>Built <code>Illustration variant="document"</code> shape lists (including mobile <code>@repo/ui/illustration-data</code>), real-text <code>ExampleTag</code>, glass and paper <code>Card</code>, and <code>CarouselDots</code>.</td></tr>
              <tr><td><strong>F4</strong></td><td>PR 966 (<code>04f639aad</code>)</td><td>Added motion hooks, the GSAP and three.js import ban (AT4) and the marketing page-weight ratchet (MK12).</td></tr>
            </tbody>
          </table>
        </div>
        <p class="history-caption">
          Four foundation slices moved prototype 11's building blocks into the design system on 27 November 2026. PR 968 introduced tilted paper cards and documents with a real-text "Example" tag for any sample figure, keeping default cards in neutral and mint tokens so violet and rose stay off general UI. Source: <code>ROLLOUT-PLAN.md</code>, <code>STYLE-GUIDE.md</code> sections 2.7 and 8.3, and PRs 959, 963, 966 and 968.
        </p>
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">25 November versus 27 and 28 November 2026</span>
          <h3 class="card-title">The home page before and after</h3>
        </div>
        <div class="grid-2">
          ${renderHistoryImg("baseline-2026-11-25-home-light.jpg", "Marketing home page before rebuild on 25 November 2026 in light theme", 960, 675, "Before (25 Nov 2026, 79e77ba59): solid mint hero band and flat illustration.")}
          ${renderHistoryImg("baseline-2026-11-28-home-light.jpg", "Marketing home page after prototype 11 rebuild on 28 November 2026 in light theme", 960, 675, "After (28 Nov 2026, 2949ac139): assembling document hero on canvas band with K2 logo.")}
          ${renderHistoryImg("baseline-2026-11-25-home-dark.jpg", "Marketing home page before rebuild on 25 November 2026 in dark theme", 960, 675, "Before (25 Nov 2026, 79e77ba59): dark theme before the marketing rollout.")}
          ${renderHistoryImg("baseline-2026-11-28-home-dark.jpg", "Marketing home page after prototype 11 rebuild on 28 November 2026 in dark theme", 960, 675, "After (28 Nov 2026, 2949ac139): dark theme with assembling cards, glass orb and K2 mark.")}
        </div>
        ${renderHistoryImg("baseline-2026-11-27-home-light.jpg", "Marketing home page M1 intermediate build on 27 November 2026 in light theme", 960, 675, "Intermediate M1 build (27 Nov 2026, 1a4eca1df, PR 975) before PR 980 rebuilt the home page directly to prototype 11.")}
        <p class="history-caption">
          Real 1280px visual baselines capture the home page transition: slice M1 (PR 975, <code>1a4eca1df</code>) first split page chunks and removed solid colour bands, then PR 980 (<code>93b0bae97</code>, 27 November 2026) rebuilt the home page directly to prototype 11 with the scroll-pinned hero and three.js journey. On 28 November 2026, PR 986 (<code>2949ac139</code>) shipped the matching features index, five area pages and AI connection page. Source: visual baselines <code>79e77ba59</code>, <code>1a4eca1df</code> and <code>2949ac139</code>, plus PRs 975, 980 and 986.
        </p>
      </article>

      <article class="timeline-entry">
        <div class="timeline-head">
          <span class="pill num">12 to 27 November 2026</span>
          <h3 class="card-title">The logo's history to K2</h3>
        </div>
        ${renderLogoHistoryDiagram(tokens)}
        <div class="history-grid-3">
          ${renderHistoryImg("logo-round-1.jpg", "Logo options round one sheet comparing today's blob with options A to F in light and dark", 880, 2283, "Logo options round 1: today's blob beside six glass drafts (A to F).")}
          ${renderHistoryImg("logo-round-2.jpg", "Logo options round two sheet exploring families B, C and D with options G, H, I, J, K, L and M", 880, 3062, "Logo options round 2: deeper exploration of sphere, rising bubble and bead-path families.")}
          ${renderHistoryImg("logo-round-3.jpg", "Logo options round three sheet showing C1 to C3 and K1 to K3 with K2 marked chosen", 880, 2417, "Logo options round 3: C and K refinements, with K2 marked chosen.")}
        </div>
        <p class="history-caption">
          The logo moved from the Direction C teal blob (12 and 14 November) through Midnight and Mint's charcoal blob (24 November) and the teal fix (25 November) to three rounds of glass bubble studies. In round 3 the owner chose K2 (three climbing bubbles sharing one floor shadow), shipped on 27 November 2026 in PR 981 (<code>5bf009a04</code>) alongside flat-fill favicon candidate C and the mobile app icons on Midnight canvas. Source: <code>FlumpLogo</code> and <code>favicon.svg</code> git history, <code>.brand-inputs/logo-options/</code>, <code>STYLE-GUIDE.md</code> sections 9 and 14, and PR 981.
        </p>
      </article>
    </div>

    ${renderSourceCite("STYLE-GUIDE 2.2, 2.7, 8.3, 9, 14; DECISIONS.md; ROLLOUT-PLAN.md; git history; visual baselines; PRs 901 to 986")}
  </section>`;
}
