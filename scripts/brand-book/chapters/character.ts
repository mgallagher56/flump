import { renderSourceCite } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderCharacterChapter(_tokens: BrandTokens): string {
  return `<section class="chapter" id="character-and-voice">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 01</span>
      <h2 class="chapter-title">Character and voice</h2>
    </div>

    <p class="prose">
      Flump is a calm guide for a typical UK household: someone renting, someone whose mortgage fix is ending, someone saving for a first home, or someone getting to grips with a pension. Many arrive worried about money, so screens and words avoid dread, clutter and judgement.
    </p>

    <div class="grid-2">
      <article class="card">
        <h3 class="card-title">Visual character: Midnight and Mint</h3>
        <p class="prose">
          The light theme ("Mint") uses a pale mint canvas with deep-green ink and charcoal primary buttons. The dark theme ("Midnight") uses cool charcoal surfaces with mint headline figures, teal links and apricot for what you owe. The marketing site adds a lit orb, soft bubbles, glass and paper cards and calm motion; the apps stay quiet.
        </p>
        <p class="prose"><strong>Three screen tests:</strong></p>
        <ol class="plain-list">
          <li>Could a person who is worried about money read it without feeling judged or alarmed?</li>
          <li>Is there one thing to look at first?</li>
          <li>Would it look like the same product if it were moved from the marketing site to the app, or from the web to a phone?</li>
        </ol>
      </article>

      <article class="card">
        <h3 class="card-title">Voice traits and tagline</h3>
        <p class="prose">
          Flump sounds like a calm, numerate friend who shows you the working: <strong>plain</strong> (everyday words, short sentences), <strong>factual</strong> (says what a number is and assumes, never recommends), <strong>even-handed</strong> (every situation has equal weight) and <strong>honest</strong> (says "estimate" when it is one).
        </p>
        <p class="prose">
          <strong>Tagline:</strong> "Flump: finance without the fog" (sentence case, colon after the name, never a dash). It goes only in page metadata, the footer brand line, the share image and the web manifest description.
        </p>
        <p class="prose">
          Full wording rules, glossary and advice boundary rules live in <a href="../copy/COPY-GUIDE.md">Flump copy guide</a>.
        </p>
      </article>
    </div>

    <article class="card-subtle">
      <h3 class="card-title">Guidance, not advice, and no shaming</h3>
      <p class="prose">
        Flump gives facts and estimates, never recommendations. Every encouragement feature must pass all five E35 no-shaming tests (N1 to N5): no points, scores, grades, leagues or ranks; no comparison with other people; no loss-framed streaks; praise only the action, never the amount; and equal warmth for every starting point including debt, renting and low savings.
      </p>
    </article>

    ${renderSourceCite("STYLE-GUIDE 1; UX-GUIDELINES 1, 9, 11; COPY-GUIDE 1, 2.1, 2.3, 2.5")}
  </section>`;
}
