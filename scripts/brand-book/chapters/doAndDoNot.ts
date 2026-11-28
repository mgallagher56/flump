import { renderProvenanceComment } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderDoAndDoNotChapter(_tokens: BrandTokens): string {
  const pairs: ReadonlyArray<{ topic: string; doRule: string; dontRule: string }> = [
    {
      topic: "Colours and judgement",
      doRule:
        "Use semantic surface, ink and area colours, keep debt in warm apricot and negative balances in standard ink, and use bright mint only as a fill in light mode.",
      dontRule:
        "Hardcode raw colours, put red or warning badges on ordinary debt, or set body text or links in bright mint on a pale background.",
    },
    {
      topic: "Orb palette discipline",
      doRule:
        "Keep violet and rose on glass orbs, the three-bubble logo, small area markers and assigned chart series.",
      dontRule:
        "Use violet or rose as a full band background, card material or tint, or pair an orb colour with debt, gain or loss.",
    },
    {
      topic: "Voice and copy",
      doRule:
        "Write plain UK English in sentence case, keep sentences short, label estimates clearly and tag sample figures as Example.",
      dontRule:
        "Use em dashes, exclamation marks, ampersands in prose, hype words, judgements or target figures chosen for the reader.",
    },
    {
      topic: "Saved figures and scenarios",
      doRule:
        "Keep headline figures and summary strips driven by saved details, and isolate what-if sliders inside dashed zones labelled Illustration, not saved.",
      dontRule:
        "Mix hypothetical inputs into saved totals, place sliders outside a modelling zone, or offer an Apply button that silently overwrites saved data.",
    },
    {
      topic: "Typography and numbers",
      doRule:
        "Use Plus Jakarta Sans for headings, Inter for body text and fixed-width UK formatting on every financial figure.",
      dontRule:
        "Drop below 12 pixels, use weights above 700, style uppercase eyebrows, or use browser number spinners on money and percentage fields.",
    },
    {
      topic: "Motion across platforms",
      doRule:
        "Keep transitions brief inside the apps, reserve scroll scenes and glass orbs for the marketing site, and honour reduced-motion settings everywhere.",
      dontRule:
        "Count up or roll real balances, put 3D graphics or parallax in the apps, or hide page content until scripts load.",
    },
    {
      topic: "Logo and illustrations",
      doRule:
        "Keep half-width clear space around the three-bubble mark, draw pictures from shared shape lists and keep a real-text Example tag on sample cards.",
      dontRule:
        "Place the logo on bright mint hero panels or photographs, recolour or rotate it, or draw faces, coin piles or upward arrows inside pictures.",
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
      A quick reference checklist bringing together the core rules from earlier chapters.
    </p>

    ${cards}

    ${renderProvenanceComment("STYLE-GUIDE; UX-GUIDELINES; COPY-GUIDE")}
  </section>`;
}
