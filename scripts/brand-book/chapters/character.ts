import { renderChapterOpener, renderProvenanceComment, renderScreenPair } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderCharacterChapter(_tokens: BrandTokens): string {
  const openerVisual = `<div class="opener-visual-plate">
    <p class="chapter-kicker">Brand promise</p>
    <p class="brand-wordmark" style="font-size:clamp(1.75rem,3vw,2.5rem)">Flump: finance without the fog</p>
    <p class="prose">
      Three questions govern every screen: can someone worried about money read it without feeling judged, is there one clear thing to look at first, and does it feel like the same product everywhere?
    </p>
  </div>`;

  return `<section class="chapter" id="character-and-voice">
    ${renderChapterOpener({
      num: "01",
      title: "Character and voice",
      lead: "A calm, numerate friend who shows the working, treats every household equally and never judges anyone's money.",
      visualHtml: openerVisual,
      surface: "subtle",
      hook: "chapter-01",
    })}

    <div class="spread">
      <div class="spread-inner">
        ${renderScreenPair({
          baseName: "marketing-home",
          title: "One voice from first visit to daily check-in",
          copy: "The home page opens with a plain statement of what Flump holds, paired with an illustrative monthly picture so an outsider understands the product in seconds.",
          desktopAlt: "Flump marketing home page showing the headline and monthly overview card",
          phoneAlt: "Flump marketing home page at phone width",
          caption:
            "Desktop (1280px) and phone (375px) views of the home page. Switch Light or Dark at the top to compare Mint and Midnight.",
        })}
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="editorial-split editorial-split-text-first">
          <div class="editorial-copy">
            <h3 class="sub-title">Two moods, one standard</h3>
            <p class="prose">
              In light mode, Mint pairs a pale mint canvas with deep-green ink and charcoal primary buttons. In dark mode, Midnight steps cool charcoal surfaces lighter toward the viewer, with mint headline figures and warm apricot for borrowing.
            </p>
            <p class="prose">
              The marketing site adds lit glass orbs, paper documents and unhurried scenes. Inside the web and phone apps, surfaces stay quiet so people can read their own numbers without distraction.
            </p>
          </div>
          <div class="grid-2">
            <article class="card">
              <h4 class="card-title">Plain</h4>
              <p class="prose">Everyday words, short sentences under 25 words and the figure up front.</p>
              <blockquote class="quote-box">
                <span class="chapter-kicker">Approved copy</span>
                <span>"Add your first account to see what you own and what you owe."</span>
              </blockquote>
            </article>
            <article class="card">
              <h4 class="card-title">Factual</h4>
              <p class="prose">States what a number is and what it assumes, never telling a reader what to do.</p>
              <blockquote class="quote-box">
                <span class="chapter-kicker">Approved copy</span>
                <span>"Estimate: paid off in Mar 2030, if payments stay at £320 a month."</span>
              </blockquote>
            </article>
            <article class="card">
              <h4 class="card-title">Even-handed</h4>
              <p class="prose">Renting, paying a mortgage, carrying debt or saving all appear in the same calm voice.</p>
              <blockquote class="quote-box">
                <span class="chapter-kicker">Approved copy</span>
                <span>"You owe £8,420 across 3 debts."</span>
              </blockquote>
            </article>
            <article class="card">
              <h4 class="card-title">Honest</h4>
              <p class="prose">Labels estimates and sample figures openly and owns mistakes without blaming the person.</p>
              <blockquote class="quote-box">
                <span class="chapter-kicker">Approved copy</span>
                <span>"We could not save that change. Your figures are unchanged. Try again."</span>
              </blockquote>
            </article>
          </div>
        </div>
      </div>
    </div>

    <div class="spread">
      <div class="spread-inner">
        <article class="card-subtle">
          <h3 class="card-title">Guidance, not advice, and five no-shaming tests</h3>
          <p class="prose">
            Flump provides calculations and estimates, never financial recommendations. Any encouragement feature must pass all five tests: no points, scores or financial ranks; no comparison with other people; no guilt-driven streaks or "missed" months; acknowledge the check-in action rather than the amount; and equal warmth for every starting point.
          </p>
        </article>
      </div>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 1; UX-GUIDELINES 1, 9, 11; COPY-GUIDE 1, 2.1, 2.3, 2.5")}
  </section>`;
}
