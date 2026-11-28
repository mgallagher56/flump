import { renderOrbTonesDiagram } from "../diagrams/orbTones";
import { renderProvenanceComment } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

export function renderColourChapter(tokens: BrandTokens): string {
  const areaRows: ReadonlyArray<readonly [string, string, string]> = [
    ["Net worth and mortgage", "Teal", "Primary headline and home equity figures"],
    ["Savings", "Sage", "Cash savings and growth pots"],
    ["Debt and borrowing", "Apricot", "Credit cards, loans and overdrafts, never red"],
    ["Pension", "Sky", "Workplace and personal retirement pots"],
    ["Pay and Self Assessment", "Violet", "Tax and income records"],
    ["Budget", "Rose", "Monthly income, bills and breathing room"],
    ["Accounts", "Blue-teal (light) / soft pink (dark)", "Account lists and general highlights"],
  ];

  return `<section class="chapter" id="colour">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 03</span>
      <h2 class="chapter-title">Colour</h2>
    </div>

    <p class="prose">
      Colour in Flump separates surfaces cleanly and identifies each area of a household's money without judging good or bad outcomes. Light mode uses about 60% pale mint canvas, 30% off-white cards and 10% teal, charcoal and domain accents; dark mode steps cool charcoal surfaces lighter as they rise toward the viewer.
    </p>

    <div class="grid-2">
      <div class="theme-frame theme-light">
        <h3 class="card-title">Mint (light theme)</h3>
        <p class="prose">Pale mint canvas with off-white cards, a solid mint headline panel in deep-green ink, charcoal primary buttons and teal links.</p>
        <div class="hero-panel">
          <span class="swatch-note" style="color:var(--color-text-on-hero)">Cash and savings <span class="example-tag">Example</span></span>
          <p class="hero-figure">£21,000</p>
        </div>
        <div class="demo-actions">
          <span class="demo-btn">Request an invite</span>
          <span class="demo-btn-outline">Interactive preview</span>
          <span style="color:var(--color-chart-debt);font-weight:600" class="num">£1,800 card balance</span>
        </div>
      </div>

      <div class="theme-frame theme-dark">
        <h3 class="card-title">Midnight (dark theme)</h3>
        <p class="prose">Cool charcoal surfaces with crisp warm-white text, mint headline figures and primary buttons, and soft apricot for debt.</p>
        <div class="hero-panel">
          <span class="swatch-note" style="color:var(--color-text-on-hero)">Cash and savings <span class="example-tag">Example</span></span>
          <p class="hero-figure">£21,000</p>
        </div>
        <div class="demo-actions">
          <span class="demo-btn">Request an invite</span>
          <span class="demo-btn-outline">Interactive preview</span>
          <span style="color:var(--color-chart-debt);font-weight:600" class="num">£1,800 card balance</span>
        </div>
      </div>
    </div>

    ${renderOrbTonesDiagram(tokens)}

    <article class="card-subtle">
      <h3 class="card-title">Core colour rules</h3>
      <ul class="plain-list">
        <li><strong>Never judge finances with colour:</strong> negative balances use standard text ink with a minus sign, and debt is always warm apricot rather than red. Red and amber are reserved strictly for errors, destructive confirmations, deadlines and unverified estimates.</li>
        <li><strong>Mint is a fill in light mode, never text:</strong> bright mint fails contrast on pale backgrounds, so links, focus rings and outline buttons use deep teal in light mode and mint in dark mode.</li>
        <li><strong>Keep violet and rose contained:</strong> violet and rose stay on glass orbs, the three-bubble logo, small area markers and chart series, never as page backgrounds or card tints.</li>
        <li><strong>Never rely on colour alone:</strong> every status badge, chart line and alert pairs colour with an icon, pattern or clear label.</li>
      </ul>
    </article>

    <h3 class="sub-title">Area colours and contrast minimums</h3>
    <div class="grid-2">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Product area</th><th scope="col">Assigned colour</th><th scope="col">Scope</th></tr>
          </thead>
          <tbody>
            ${areaRows.map(([area, col, scope]) => `<tr><td><strong>${area}</strong></td><td>${col}</td><td>${scope}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Contrast pair</th><th scope="col">Minimum ratio</th></tr>
          </thead>
          <tbody>
            <tr><td>Body text on its surface</td><td class="num">4.5:1 (3:1 at 24px or 18.66px bold)</td></tr>
            <tr><td>Input borders, focus rings, icons and chart marks</td><td class="num">3:1 against adjacent surface</td></tr>
            <tr><td>Card hairline border against canvas</td><td class="num">1.3:1</td></tr>
            <tr><td>Stepped surfaces (canvas to card)</td><td class="num">2.0 deltaE</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 2.1 to 2.7, 14; UX-GUIDELINES 10, 11, 12.2; packages/tokens/src/index.ts; PRs 901, 963, 981")}
  </section>`;
}
