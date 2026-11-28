import { renderSourceCite } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderDoAndDoNotChapter(_tokens: BrandTokens): string {
  const pairs: ReadonlyArray<{ topic: string; doRule: string; dontRule: string }> = [
    {
      topic: "Tokens and colours (C1, C2, C9)",
      doRule:
        "Use semantic tokens only, keep debt in apricot (chart.debt) and negative balances in text.primary, and use mint as a fill in light.",
      dontRule:
        "Hardcode hex or rgb values, use red or warning badges on ordinary debt, or use mint as text on a light background.",
    },
    {
      topic: "Orb palette discipline (MC1, MC2)",
      doRule:
        "Keep violet and rose tokens on orb-like elements, the allow-listed home page marks and the area map tiles.",
      dontRule:
        "Use violet or rose as a band background, tint or card material, or pair an orb colour with debt, gain or loss.",
    },
    {
      topic: "Voice and copy (COPY-GUIDE 2.3, 5.1, 5.4)",
      doRule:
        "Write plain en-GB in sentence case, keep sentences under 25 words, label estimates clearly and tag illustrative figures as Example.",
      dontRule:
        "Use em dashes, exclamation marks, ampersands in prose, hype words, judgements or target figures chosen for the reader.",
    },
    {
      topic: "Saved figures vs scenarios (S1 to S8)",
      doRule:
        "Keep headline figures and KpiStrips driven by saved data, and isolate what-if controls inside ScenarioZone labelled Illustration, not saved.",
      dontRule:
        "Mix scenario values into saved KPIs, put sliders outside ScenarioZone, or offer an Apply button that overwrites saved data.",
    },
    {
      topic: "Typography and numbers (T1 to T4)",
      doRule:
        "Use Plus Jakarta Sans for headings, Inter for body and tabular-nums with en-GB formatting on every figure.",
      dontRule:
        'Go below 12px, use weights above 700, use uppercase eyebrows, or use type="number" on money and percentage fields (F2).',
    },
    {
      topic: "Motion and platforms (AT1 to AT4, MK1, M4)",
      doRule:
        "Swap or cross-fade real figures in the apps, keep GSAP and three.js inside apps/marketing, and honour prefers-reduced-motion everywhere.",
      dontRule:
        "Count up or roll real balances, put WebGL or parallax in the apps, or hide content until JavaScript runs.",
    },
    {
      topic: "Logo and illustrations (STYLE-GUIDE 8.3, 9)",
      doRule:
        "Keep half-width clear space around the static K2 logo, store pictures as shape lists (IL4) and keep a real-text Example tag on sample cards.",
      dontRule:
        "Place the logo on surface.hero or photographs, animate the logo, or draw faces, coin piles or glass objects inside pictures.",
    },
  ];

  const cards = pairs
    .map(
      (item) => `<article class="card">
        <h3 class="card-title">${item.topic}</h3>
        <div class="do-dont-grid">
          <div class="card-subtle" style="border-left:3px solid var(--color-status-positive-text)">
            <span class="swatch-note" style="color:var(--color-status-positive-text);font-weight:600">Do</span>
            <p class="prose">${item.doRule}</p>
          </div>
          <div class="card-subtle" style="border-left:3px solid var(--color-status-danger-text)">
            <span class="swatch-note" style="color:var(--color-status-danger-text);font-weight:600">Do not</span>
            <p class="prose">${item.dontRule}</p>
          </div>
        </div>
      </article>`,
    )
    .join("");

  return `<section class="chapter" id="do-and-do-not">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 10</span>
      <h2 class="chapter-title">Do and do not</h2>
    </div>

    <p class="prose">
      A quick checklist drawn directly from the standing rules in earlier chapters.
    </p>

    ${cards}

    ${renderSourceCite("STYLE-GUIDE; UX-GUIDELINES; COPY-GUIDE")}
  </section>`;
}
