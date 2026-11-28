import { renderChapterOpener, renderProvenanceComment, renderScreenPair } from "../renderHelpers";
import type { BrandTokens } from "../tokens";
import { renderUiExampleTagSpecimen, renderUiStatusBadgesSpecimen } from "../uiSpecimens";

export function renderMotionChapter(_tokens: BrandTokens): string {
  const openerVisual = `<div class="opener-visual-plate">
    <div class="grid-2">
      <div class="motion-stage" data-motion-hook="motion-demo-app">
        <span class="chapter-kicker">App scale</span>
        <strong class="num" style="font-size:var(--text-heading-md-size)">120 to 320 ms</strong>
        <p class="swatch-note">Brief transitions that confirm saves and step changes without shifting real balances.</p>
      </div>
      <div class="motion-stage" data-motion-hook="motion-demo-marketing">
        <span class="chapter-kicker">Marketing calm scale</span>
        <strong class="num" style="font-size:var(--text-heading-md-size)">240 to 1,200 ms</strong>
        <p class="swatch-note">Unhurried scroll scenes and assembling document cards over sample figures only.</p>
      </div>
    </div>
  </div>`;

  return `<section class="chapter" id="motion" data-motion-chapter="">
    ${renderChapterOpener({
      num: "08",
      title: "Motion",
      lead: "Quiet, brief feedback inside the apps and calm scroll scenes on the marketing site, both pausing cleanly under reduced motion.",
      visualHtml: openerVisual,
      surface: "card",
      hook: "chapter-08",
    })}

    <div class="spread">
      <div class="spread-inner">
        ${renderScreenPair({
          baseName: "marketing-feature-budget",
          title: "Marketing scenes versus quiet app pages",
          copy: "Marketing area pages use glass orbs and calm scroll reveals on tagged sample cards, while all motion code stays strictly outside the web and mobile apps.",
          desktopAlt:
            "Budget and breathing room marketing page at 1280px showing glass orbs and sample monthly card",
          phoneAlt: "Budget and breathing room marketing page at 375px phone width",
          caption:
            "Budget area page at 1280px and 375px. Notice the real-text Example tag beside the illustrative monthly figure.",
        })}
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Three motion tiers inside the apps</h3>
          <p class="prose">
            Loading indicators wait 200 milliseconds before appearing so quick responses never flicker. Once a person's figures are on screen, nothing moves them unexpectedly.
          </p>
        </div>
        <div class="tier-strip-grid">
          <article class="tier-card">
            <span class="chapter-kicker">Tier 1</span>
            <h4 class="card-title">Always fine</h4>
            <p class="prose">Changes no layout, timing or reading order.</p>
            <ul class="plain-list">
              <li>Neutral glass card surfaces</li>
              <li>Still document pictures</li>
              <li>Crisp focus rings and quiet hover lights</li>
            </ul>
          </article>

          <article class="tier-card tier-card-muted">
            <span class="chapter-kicker">Tier 2</span>
            <h4 class="card-title">Named moments only</h4>
            <p class="prose">Plays once per visit after content is already readable.</p>
            <ul class="plain-list">
              <li>Chart line drawing itself once</li>
              <li>Saved figure confirmation highlight</li>
              <li>Monthly check-in advance and save tick</li>
            </ul>
            <div>${renderUiStatusBadgesSpecimen()}</div>
          </article>

          <article class="tier-card tier-card-stop">
            <span class="chapter-kicker">Tier 3</span>
            <h4 class="card-title">Never in the app</h4>
            <p class="prose">Delays reading or animates what holds real money.</p>
            <ul class="plain-list">
              <li>Scroll-pinned scenes, 3D graphics or parallax</li>
              <li>Floating bubble fields behind numbers</li>
              <li>Count-up or rolling numbers on real balances</li>
            </ul>
          </article>
        </div>
      </div>
    </div>

    <div class="spread">
      <div class="spread-inner">
        <div class="grid-2">
          <article class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <h3 class="card-title">Where figures may move</h3>
              ${renderUiExampleTagSpecimen("paper")}
            </div>
            <p class="prose">
              Real balances never count up, roll or glide inside the apps. On the marketing site only, a fixed sample figure tagged "Example" may count up once on first view, and the interactive pay rise calculator glides smoothly between inputs.
            </p>
          </article>

          <article class="card">
            <h3 class="card-title">Reduced motion and pause controls</h3>
            <p class="prose">
              When reduced motion is active, transitions become instant or short fades and ambient scenes stop. The marketing site renders its finished still state in HTML first and shows a visible "Pause animation" and "Play animation" control on scenes lasting over 5 seconds.
            </p>
          </article>
        </div>
      </div>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 11, 11.1, 11.2; UX-GUIDELINES 12, 12.1, 12.2; packages/tokens/src/motion.ts")}
  </section>`;
}
