import { renderChapterOpener, renderProvenanceComment, renderScreenPair } from "../renderHelpers";
import { type BrandTokens, toCssIdent } from "../tokens";
import { renderUiExampleTagSpecimen, renderUiStatusBadgesSpecimen } from "../uiSpecimens";

function parseMs(raw: string): number {
  return Number.parseFloat(raw.replace(/ms$/i, ""));
}

export function renderMotionChapter(tokens: BrandTokens): string {
  const { primitiveDurations, marketingDurations } = tokens.authored;
  const h = tokens.sampleHousehold;
  const numFmt = new Intl.NumberFormat("en-GB");

  const appMinMs = numFmt.format(parseMs(primitiveDurations.fast.value));
  const appMaxMs = numFmt.format(parseMs(primitiveDurations.scene.value));
  const mktMinMs = numFmt.format(parseMs(marketingDurations.stagger.value));
  const mktMaxMs = numFmt.format(parseMs(marketingDurations.hero.value));
  const pendingDelayMs = numFmt.format(parseMs(primitiveDurations.pendingDelay.value));
  const countMs = parseMs(marketingDurations.count.value);
  const maxBarMs = parseMs(marketingDurations.hero.value);

  const openerVisual = `<div class="opener-visual-plate">
    <div class="grid-2">
      <div class="motion-stage" data-motion-hook="motion-demo-app">
        <span class="chapter-kicker">App scale</span>
        <strong class="num" style="font-size:var(--text-heading-md-size)">${appMinMs} to ${appMaxMs} ms</strong>
        <p class="swatch-note">Brief transitions that confirm saves and step changes without shifting real balances.</p>
      </div>
      <div class="motion-stage" data-motion-hook="motion-demo-marketing">
        <span class="chapter-kicker">Marketing calm scale</span>
        <strong class="num" style="font-size:var(--text-heading-md-size)">${mktMinMs} to ${mktMaxMs} ms</strong>
        <p class="swatch-note">Unhurried scroll scenes and assembling document cards over sample figures only.</p>
      </div>
    </div>
  </div>`;

  const timingGroups: ReadonlyArray<{
    title: string;
    items: ReadonlyArray<{
      label: string;
      durationRaw: string;
      durationCss: string;
      easingCss: string;
    }>;
  }> = [
    {
      title: "App timing scale",
      items: [
        {
          label: "Hover and press",
          durationRaw: primitiveDurations.fast.value,
          durationCss: "var(--duration-fast)",
          easingCss: "var(--easing-standard)",
        },
        {
          label: "Tabs and disclosures",
          durationRaw: primitiveDurations.base.value,
          durationCss: "var(--duration-base)",
          easingCss: "var(--easing-standard)",
        },
        {
          label: "Sheets and dialogs",
          durationRaw: primitiveDurations.slow.value,
          durationCss: "var(--duration-slow)",
          easingCss: "var(--easing-enter)",
        },
        {
          label: "Chart line draw",
          durationRaw: primitiveDurations.draw.value,
          durationCss: "var(--duration-draw)",
          easingCss: "var(--easing-standard)",
        },
        {
          label: "Scene settle",
          durationRaw: primitiveDurations.scene.value,
          durationCss: "var(--duration-scene)",
          easingCss: "var(--easing-settle)",
        },
      ],
    },
    {
      title: "Marketing calm scale",
      items: [
        {
          label: "Stagger gap",
          durationRaw: marketingDurations.stagger.value,
          durationCss: "var(--duration-marketing-stagger)",
          easingCss: "var(--easing-marketing-calm)",
        },
        {
          label: "Hover light and glide",
          durationRaw: marketingDurations.hover.value,
          durationCss: "var(--duration-marketing-hover)",
          easingCss: "var(--easing-marketing-calm)",
        },
        {
          label: "Disclosure open",
          durationRaw: marketingDurations.disclosure.value,
          durationCss: "var(--duration-marketing-disclosure)",
          easingCss: "var(--easing-marketing-calm-in-out)",
        },
        {
          label: "Card entrance",
          durationRaw: marketingDurations.entry.value,
          durationCss: "var(--duration-marketing-entry)",
          easingCss: "var(--easing-marketing-calm)",
        },
        {
          label: "Sample count-up",
          durationRaw: marketingDurations.count.value,
          durationCss: "var(--duration-marketing-count)",
          easingCss: "var(--easing-marketing-calm)",
        },
        {
          label: "Self-drawing chart",
          durationRaw: marketingDurations.chart.value,
          durationCss: "var(--duration-marketing-chart)",
          easingCss: "var(--easing-marketing-calm)",
        },
        {
          label: "Timed hero sequence",
          durationRaw: marketingDurations.hero.value,
          durationCss: "var(--duration-marketing-hero)",
          easingCss: "var(--easing-marketing-calm)",
        },
      ],
    },
  ];

  const timingColumnsHtml = timingGroups
    .map((group) => {
      const rows = group.items
        .map((item) => {
          const ms = parseMs(item.durationRaw);
          const pct = Math.max(4, Math.min(100, Math.round((ms / maxBarMs) * 100)));
          const idCls = toCssIdent(item.label);
          return `<div class="motion-timing-row" data-timing-row="${idCls}">
            <div class="motion-timing-head">
              <span>${item.label}</span>
              <span class="num swatch-note">${numFmt.format(ms)} ms</span>
            </div>
            <div class="motion-timing-track" aria-hidden="true">
              <div class="motion-timing-fill" style="width:${pct}%;--bar-dur:${item.durationCss};--bar-ease:${item.easingCss}"></div>
            </div>
          </div>`;
        })
        .join("");

      return `<div class="motion-timing-group">
        <strong class="card-title">${group.title}</strong>
        <div class="motion-timing-list">${rows}</div>
      </div>`;
    })
    .join("");

  const entranceCards = [
    { title: "Accounts", note: "Balances typed by you", val: h.savings },
    { title: "Budget", note: "Comes in and goes out", val: h.leftOver },
    { title: "Pension", note: "Workplace and personal", val: h.pension },
  ]
    .map(
      (item, idx) => `<div class="motion-entrance-item" style="--stagger-index:${idx}">
        <div class="ui-card-head">
          <strong>${item.title}</strong>
          ${renderUiExampleTagSpecimen("paper")}
        </div>
        <strong class="ui-card-figure num">${item.val}</strong>
        <span class="swatch-note">${item.note}</span>
      </div>`,
    )
    .join("");

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
        <div class="editorial-copy">
          <h3 class="sub-title">Live motion specimens</h3>
          <p class="prose">
            Each specimen below runs at its real timing from the design system. Select Play again to replay any piece, or switch on Reduce motion at the top to see the still state.
          </p>
        </div>

        <div class="grid-2">
          <figure class="motion-demo-card" data-motion-demo="entrance" data-motion-playable="entrance">
            <div class="motion-demo-top">
              <strong class="card-title">Entrance cascade</strong>
              <button type="button" class="motion-replay-btn" data-motion-replay="entrance">Play again</button>
            </div>
            <div class="motion-entrance-grid">
              ${entranceCards}
            </div>
            <figcaption class="diagram-caption">
              Cards arriving once in order by distance and opacity when a marketing section scrolls into view.
            </figcaption>
          </figure>

          <figure class="motion-demo-card" data-motion-demo="count-up" data-motion-playable="count-up">
            <div class="motion-demo-top">
              <strong class="card-title">Sample count-up</strong>
              <button type="button" class="motion-replay-btn" data-motion-replay="count-up">Play again</button>
            </div>
            <div class="motion-count-stage">
              <div class="motion-count-card">
                <div class="ui-card-head">
                  <span class="swatch-note">Cash and savings</span>
                  ${renderUiExampleTagSpecimen("paper")}
                </div>
                <p class="hero-figure num" style="color:var(--color-text-primary)">
                  <span class="sr-only">${h.savings}</span>
                  <span aria-hidden="true" data-count-up="${h.savingsNumeric}" data-count-duration="${countMs}">${h.savings}</span>
                </p>
                <span class="swatch-note num">${h.savingsRate}, sample household</span>
              </div>
            </div>
            <figcaption class="diagram-caption">
              A fixed sample figure tagged Example counting once to its value on the website; personal balances in the apps never count up.
            </figcaption>
          </figure>
        </div>

        <figure class="motion-demo-card" data-motion-demo="timing-scale" data-motion-playable="timing-scale">
          <div class="motion-demo-top">
            <div>
              <strong class="card-title">App pace versus calm marketing pace</strong>
              <p class="swatch-note">Bars travel to scale for their exact duration and easing.</p>
            </div>
            <button type="button" class="motion-replay-btn" data-motion-replay="timing-scale">Play again</button>
          </div>
          <div class="grid-2">
            ${timingColumnsHtml}
          </div>
          <figcaption class="diagram-caption">
            Each bar moves for its real duration and easing so you can compare the brief app pace with the unhurried website pace.
          </figcaption>
        </figure>
      </div>
    </div>

    <div class="spread spread-subtle">
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

    <div class="spread">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Three motion tiers inside the apps</h3>
          <p class="prose">
            Loading indicators wait ${pendingDelayMs} milliseconds before appearing so quick responses never flicker. Once a person's figures are on screen, nothing moves them unexpectedly.
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

    <div class="spread spread-subtle">
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
