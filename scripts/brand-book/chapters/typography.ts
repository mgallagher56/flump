import { renderTypeLadderDiagram } from "../diagrams/typeLadder";
import { renderExampleTag, renderProvenanceComment } from "../renderHelpers";
import { type BrandTokens, colorVar } from "../tokens";

export function renderTypographyChapter(tokens: BrandTokens): string {
  const { native, authored } = tokens;

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
      const tag = item.tabular && !item.muted ? ` ${renderExampleTag()}` : "";
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
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 04</span>
      <h2 class="chapter-title">Typography</h2>
    </div>

    <p class="prose">
      Flump uses two self-hosted variable typefaces: <strong>Plus Jakarta Sans</strong> for headings and display lines, and <strong>Inter</strong> for body copy, controls and financial figures. Headings use slightly wider word spacing on the web so bold words remain easy to scan, and every number uses fixed-width columns so balances line up cleanly.
    </p>

    ${renderTypeLadderDiagram(tokens)}

    <h3 class="sub-title">Live type samples</h3>
    <div class="card" style="padding:0">
      ${rowsHtml}
    </div>

    <article class="card-subtle">
      <h3 class="card-title">Typography rules</h3>
      <ul class="plain-list">
        <li><strong>Two typefaces, four weights:</strong> only Plus Jakarta Sans and Inter at weights 400, 500, 600 and 700, never below 12 pixels.</li>
        <li><strong>Tabular UK figures everywhere:</strong> money amounts, percentages, dates, table cells and slider readouts use fixed-width numerals and UK formatting.</li>
        <li><strong>Calm hierarchy:</strong> sentence case everywhere with no uppercase eyebrows, one main heading per page, body lines capped at 75 characters, and text that scales cleanly up to 200% browser zoom.</li>
      </ul>
    </article>

    ${renderProvenanceComment("STYLE-GUIDE 3.1 to 3.3; packages/tokens/src/typography.ts; packages/ui/src/fonts/fonts.css")}
  </section>`;
}
