import { renderProvenanceComment } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderCharacterChapter(_tokens: BrandTokens): string {
  return `<section class="chapter" id="character-and-voice">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 01</span>
      <h2 class="chapter-title">Character and voice</h2>
    </div>

    <p class="prose">
      Many people open a personal finance tool with worry or dread, so Flump is built to feel like a calm, numerate friend who shows the working. Every screen and sentence avoids jargon, clutter and judgement, whether a household is renting, paying a mortgage, saving for a deposit or clearing a card.
    </p>

    <div class="grid-2">
      <article class="card">
        <h3 class="card-title">Visual character: Mint and Midnight</h3>
        <p class="prose">
          The light theme, Mint, uses a pale mint canvas with deep-green ink and charcoal primary buttons. The dark theme, Midnight, uses cool charcoal surfaces with mint headline figures, teal links and apricot for what you owe. The marketing site adds a lit orb, soft bubbles, glass and paper cards and calm motion; the apps stay quiet.
        </p>
        <p class="prose"><strong>Three tests for every screen:</strong></p>
        <ol class="plain-list">
          <li>Could a person who is worried about money read it without feeling judged or alarmed?</li>
          <li>Is there one clear thing to look at first?</li>
          <li>Would it feel like the same product across the marketing site, web app and phone app?</li>
        </ol>
      </article>

      <article class="card">
        <h3 class="card-title">Voice traits and tagline</h3>
        <p class="prose">
          Flump writes in plain UK English using four steady traits: <strong>plain</strong> (everyday words and short sentences), <strong>factual</strong> (stating what a figure assumes without recommending action), <strong>even-handed</strong> (treating renting, debt and saving with equal care) and <strong>honest</strong> (clearly labelling estimates and sample figures).
        </p>
        <p class="prose">
          <strong>Tagline:</strong> "Flump: finance without the fog" (sentence case, with a colon after the name and never a dash). It appears in page titles, social metadata, the footer line and app descriptions.
        </p>
      </article>
    </div>

    <article class="card-subtle">
      <h3 class="card-title">Guidance, not advice, and no shaming</h3>
      <p class="prose">
        Flump provides facts and estimates, never financial advice or recommendations. Every habit and progress feature follows five rules: no points, scores or financial ranks; no comparison with other people; no guilt-driven streaks or "missed" months; praise the action of checking in rather than the amount; and equal warmth for every starting point.
      </p>
    </article>

    ${renderProvenanceComment("STYLE-GUIDE 1; UX-GUIDELINES 1, 9, 11; COPY-GUIDE 1, 2.1, 2.3, 2.5")}
  </section>`;
}
