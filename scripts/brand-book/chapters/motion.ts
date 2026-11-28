import { renderProvenanceComment } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderMotionChapter(_tokens: BrandTokens): string {
  return `<section class="chapter" id="motion" data-motion-chapter="">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 08</span>
      <h2 class="chapter-title">Motion</h2>
    </div>

    <p class="prose">
      Flump uses two distinct motion settings. Inside the web and mobile apps, people read their own balances and estimates, so transitions stay brief, explain state changes and never animate real money. On the marketing site, slower scroll-triggered and ambient scenes illustrate how Flump works using tagged sample figures only.
    </p>

    <div class="grid-2">
      <article class="card">
        <h3 class="card-title">In the apps: quiet and immediate</h3>
        <p class="prose">
          App timings range from 120 to 320 milliseconds with soft landings and no bounce or overshoot. Loading indicators wait 200 milliseconds before appearing so quick responses feel instant without flicker.
        </p>
      </article>

      <article class="card">
        <h3 class="card-title">On the marketing site: calm scale</h3>
        <p class="prose">
          Marketing scenes run at a slower, unhurried pace with smooth curves that settle cleanly without overshoot. All motion code is kept strictly inside the marketing site so the apps stay lightweight.
        </p>
      </article>
    </div>

    <h3 class="sub-title">App motion tiers</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">Tier</th><th scope="col">Rule</th><th scope="col">Examples</th></tr></thead>
        <tbody>
          <tr><td><strong>Always fine</strong></td><td>Changes no layout, timing or reading order</td><td>Glass card surfaces on non-data cards, still document pictures, focus rings and hover lights</td></tr>
          <tr><td><strong>Named moments only</strong></td><td>Plays once per visit after content is readable</td><td>Chart line drawing once, saved figure highlight, check-in step advance, setup ring and save tick</td></tr>
          <tr><td><strong>Never in the app</strong></td><td>Delays reading or moves what holds a figure</td><td>Scroll-pinned scenes, 3D graphics, parallax, bubble fields behind numbers, card tilt on data, count-up on real money</td></tr>
        </tbody>
      </table>
    </div>

    <div class="grid-2">
      <article class="card-subtle">
        <h3 class="card-title">Where figures may move</h3>
        <p class="prose">
          Real balances never count up, roll or glide inside the apps. On the marketing site only, a fixed sample figure tagged "Example" may count up once on first view, and the interactive pay rise calculator result glides smoothly between inputs.
        </p>
      </article>

      <article class="card-subtle">
        <h3 class="card-title">Reduced motion and pause controls</h3>
        <p class="prose">
          When reduced motion is enabled, transitions become instant or short fades and ambient motion stops. The marketing site renders its finished still state in HTML first, never loads heavy animation scripts under reduced motion, and includes a visible "Pause animation" and "Play animation" control on scenes lasting over 5 seconds.
        </p>
      </article>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 11, 11.1, 11.2; UX-GUIDELINES 12, 12.1, 12.2; packages/tokens/src/motion.ts")}
  </section>`;
}
