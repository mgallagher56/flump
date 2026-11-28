import { renderTypeLadderDiagram } from "../diagrams/typeLadder";
import { renderChapterOpener, renderProvenanceComment, renderScreenPair } from "../renderHelpers";
import { type BrandTokens, colorVar } from "../tokens";
import { renderUiExampleTagSpecimen } from "../uiSpecimens";

export function renderTypographyChapter(tokens: BrandTokens): string {
  const { native, authored } = tokens;

  const openerVisual = `<div class="opener-visual-plate">
    <div class="specimen-glyph" style="font-family:var(--font-heading)">Aa</div>
    <p class="hero-figure" style="color:var(--color-primary)">£96,000</p>
    <p class="swatch-note">Plus Jakarta Sans for headings paired with Inter in tabular numerals for every figure.</p>
  </div>`;

  const samples: Array<{
    role: string;
    family: "heading" | "body";
    fontSizeCss: string;
    sizeLabel: string;
    weight: string;
    lineHeight: string;
    tabular?: boolean;
    muted?: boolean;
    use: string;
    sampleText: string;
  }> = [
    {
      role: "Display headline",
      family: "heading",
      fontSizeCss: authored.webTextStyles.display.value.fontSize,
      sizeLabel: `${native.textStyles.display.fontSize.min} to ${native.textStyles.display.fontSize.max}px`,
      weight: authored.webTextStyles.display.value.fontWeight,
      lineHeight: authored.webTextStyles.display.value.lineHeight,
      use: "Marketing home headline",
      sampleText: "All your money. One clear picture.",
    },
    {
      role: "Headline figure",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.hero.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.hero"].fontSize.min} to ${native.textStyles["numeric.hero"].fontSize.max}px`,
      weight: authored.webTextStyles.numeric.hero.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.hero.value.lineHeight,
      tabular: true,
      use: "The single headline figure on a page",
      sampleText: "£96,000",
    },
    {
      role: "Result figure",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.result.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.result"].fontSize}px`,
      weight: authored.webTextStyles.numeric.result.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.result.value.lineHeight,
      tabular: true,
      use: "Key figure inside a result block",
      sampleText: "£21,000",
    },
    {
      role: "Page title",
      family: "heading",
      fontSizeCss: authored.webTextStyles.heading.xl.value.fontSize,
      sizeLabel: `${native.textStyles["heading.xl"].fontSize.min} to ${native.textStyles["heading.xl"].fontSize.max}px`,
      weight: authored.webTextStyles.heading.xl.value.fontWeight,
      lineHeight: authored.webTextStyles.heading.xl.value.lineHeight,
      use: "Main page heading",
      sampleText: "Your mortgage",
    },
    {
      role: "Summary card figure",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.kpi.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.kpi"].fontSize}px`,
      weight: authored.webTextStyles.numeric.kpi.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.kpi.value.lineHeight,
      tabular: true,
      use: "Summary strip values",
      sampleText: "£1,800",
    },
    {
      role: "Section title",
      family: "heading",
      fontSizeCss: authored.webTextStyles.heading.lg.value.fontSize,
      sizeLabel: `${native.textStyles["heading.lg"].fontSize}px`,
      weight: authored.webTextStyles.heading.lg.value.fontWeight,
      lineHeight: authored.webTextStyles.heading.lg.value.lineHeight,
      use: "Major section heading",
      sampleText: "Cash and savings",
    },
    {
      role: "Lead paragraph",
      family: "body",
      fontSizeCss: authored.webTextStyles.body.lg.value.fontSize,
      sizeLabel: `${native.textStyles["body.lg"].fontSize}px`,
      weight: authored.webTextStyles.body.lg.value.fontWeight,
      lineHeight: authored.webTextStyles.body.lg.value.lineHeight,
      use: "Opening summary line",
      sampleText: "Accounts, budget, pay, savings, pension and debts in one place.",
    },
    {
      role: "Body text",
      family: "body",
      fontSizeCss: authored.webTextStyles.body.md.value.fontSize,
      sizeLabel: `${native.textStyles["body.md"].fontSize}px`,
      weight: authored.webTextStyles.body.md.value.fontWeight,
      lineHeight: authored.webTextStyles.body.md.value.lineHeight,
      use: "Default reading copy",
      sampleText: "Add your first account to see your monthly picture.",
    },
    {
      role: "Unset figure state",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.unset.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.unset"].fontSize}px`,
      weight: authored.webTextStyles.numeric.unset.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.unset.value.lineHeight,
      tabular: true,
      muted: true,
      use: "Quiet placeholder when no figure is entered",
      sampleText: "Not set",
    },
    {
      role: "Small label",
      family: "body",
      fontSizeCss: authored.webTextStyles.label.sm.value.fontSize,
      sizeLabel: `${native.textStyles["label.sm"].fontSize}px`,
      weight: authored.webTextStyles.label.sm.value.fontWeight,
      lineHeight: authored.webTextStyles.label.sm.value.lineHeight,
      use: "Card labels and table headers (12px minimum)",
      sampleText: "Breathing room",
    },
  ];

  const rowsHtml = samples
    .map((item) => {
      const fontVar = item.family === "heading" ? "var(--font-heading)" : "var(--font-body)";
      const wordSpace =
        item.family === "heading"
          ? `word-spacing:${authored.webTextStyles.display.value.wordSpacing};`
          : "";
      const fvn = item.tabular ? "font-variant-numeric:tabular-nums;" : "";
      const col = item.muted ? colorVar("text.muted") : colorVar("text.primary");
      const tag = item.tabular && !item.muted ? ` ${renderUiExampleTagSpecimen("paper")}` : "";
      return `<div class="type-sample-row">
        <div class="type-meta">
          <strong>${item.role}</strong>
          <span class="num">${item.sizeLabel}</span>
          <span class="num">weight ${item.weight}</span>
          <span class="num">line height ${item.lineHeight}</span>
          <span>${item.use}</span>
        </div>
        <div style="font-family:${fontVar};font-size:${item.fontSizeCss};font-weight:${item.weight};line-height:${item.lineHeight};color:${col};${wordSpace}${fvn}">${item.sampleText}${tag}</div>
      </div>`;
    })
    .join("");

  return `<section class="chapter" id="typography">
    ${renderChapterOpener({
      num: "04",
      title: "Typography",
      lead: "Two self-hosted variable typefaces keep headings warm and approachable while figures align cleanly down every column.",
      visualHtml: openerVisual,
      surface: "card",
      hook: "chapter-04",
    })}

    <div class="spread">
      <div class="spread-inner">
        <div class="grid-2">
          <article class="specimen-sheet">
            <span class="chapter-kicker">Display and headings</span>
            <div class="specimen-glyph" style="font-family:var(--font-heading)">Plus Jakarta Sans</div>
            <p class="prose" style="font-family:var(--font-heading);font-size:1.25rem;line-height:1.45;word-spacing:0.06em">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 £ % . ,
            </p>
            <p class="swatch-note">
              Weights 600 and 700, sentence case everywhere, with slight extra word spacing on web headings so bold words stay open and scannable.
            </p>
          </article>

          <article class="specimen-sheet">
            <span class="chapter-kicker">Body copy and tabular figures</span>
            <div class="specimen-glyph" style="font-family:var(--font-body)">Inter</div>
            <div class="tabular-demo-ledger">
              <div class="tabular-demo-row"><span>Cash and savings</span><span class="tabular-demo-fig">£21,000</span></div>
              <div class="tabular-demo-row"><span>Workplace pension</span><span class="tabular-demo-fig">£96,000</span></div>
              <div class="tabular-demo-row"><span>Credit card (22.9% APR)</span><span class="tabular-demo-fig">£1,800</span></div>
              <div class="tabular-demo-row"><span>Left over each month</span><span class="tabular-demo-fig">£639</span></div>
            </div>
            <p class="swatch-note">
              Fixed-width tabular numerals and UK formatting keep every pound sign, comma and decimal aligned without jitter.
            </p>
          </article>
        </div>
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Type specimen sheet</h3>
          <p class="prose">Every text role set at its real scale, weight and line height, with a 12 pixel floor across all interfaces.</p>
        </div>
        <div class="card">
          ${rowsHtml}
        </div>
        ${renderTypeLadderDiagram(tokens)}
      </div>
    </div>

    <div class="spread">
      <div class="spread-inner">
        ${renderScreenPair({
          baseName: "web-pension",
          title: "Hierarchy in practice",
          copy: "One page title, one headline total in tabular figures, one supporting figure below and plain details underneath.",
          desktopAlt:
            "Your pension page at 1280px width showing total pot figure and monthly contributions",
          phoneAlt: "Your pension page at 375px phone width",
          caption:
            "Your pension at 1280px and 375px. Body lines stay under 75 characters and scale cleanly up to 200% zoom.",
        })}
      </div>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 3.1 to 3.3; packages/tokens/src/typography.ts; packages/ui/src/fonts/fonts.css")}
  </section>`;
}
