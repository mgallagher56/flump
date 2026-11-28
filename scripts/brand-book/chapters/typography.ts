import { renderTypeLadderDiagram } from "../diagrams/typeLadder";
import { renderExampleTag, renderSourceCite } from "../renderHelpers";
import { type BrandTokens, colorVar } from "../tokens";

export function renderTypographyChapter(tokens: BrandTokens): string {
  const { native, authored } = tokens;

  const samples: Array<{
    name: string;
    family: "heading" | "body";
    fontSizeCss: string;
    sizeLabel: string;
    weight: string;
    lineHeight: string;
    tabular?: boolean;
    use: string;
    sampleText: string;
  }> = [
    {
      name: "display",
      family: "heading",
      fontSizeCss: authored.webTextStyles.display.value.fontSize,
      sizeLabel: `${native.textStyles.display.fontSize.min} to ${native.textStyles.display.fontSize.max}px`,
      weight: authored.webTextStyles.display.value.fontWeight,
      lineHeight: authored.webTextStyles.display.value.lineHeight,
      use: "Marketing hero headline only",
      sampleText: "All your money. One clear picture.",
    },
    {
      name: "numeric.hero",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.hero.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.hero"].fontSize.min} to ${native.textStyles["numeric.hero"].fontSize.max}px`,
      weight: authored.webTextStyles.numeric.hero.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.hero.value.lineHeight,
      tabular: true,
      use: "The one headline figure on a page",
      sampleText: "£96,000",
    },
    {
      name: "numeric.result",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.result.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.result"].fontSize}px`,
      weight: authored.webTextStyles.numeric.result.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.result.value.lineHeight,
      tabular: true,
      use: "Key figure inside a ResultBlock",
      sampleText: "£21,000",
    },
    {
      name: "heading.xl",
      family: "heading",
      fontSizeCss: authored.webTextStyles.heading.xl.value.fontSize,
      sizeLabel: `${native.textStyles["heading.xl"].fontSize.min} to ${native.textStyles["heading.xl"].fontSize.max}px`,
      weight: authored.webTextStyles.heading.xl.value.fontWeight,
      lineHeight: authored.webTextStyles.heading.xl.value.lineHeight,
      use: "Page title (h1)",
      sampleText: "Your mortgage",
    },
    {
      name: "numeric.kpi",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.kpi.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.kpi"].fontSize}px`,
      weight: authored.webTextStyles.numeric.kpi.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.kpi.value.lineHeight,
      tabular: true,
      use: "KPI card values",
      sampleText: "£1,800",
    },
    {
      name: "heading.lg",
      family: "heading",
      fontSizeCss: authored.webTextStyles.heading.lg.value.fontSize,
      sizeLabel: `${native.textStyles["heading.lg"].fontSize}px`,
      weight: authored.webTextStyles.heading.lg.value.fontWeight,
      lineHeight: authored.webTextStyles.heading.lg.value.lineHeight,
      use: "Section title",
      sampleText: "Cash and savings",
    },
    {
      name: "numeric.lg",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.lg.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.lg"].fontSize}px`,
      weight: authored.webTextStyles.numeric.lg.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.lg.value.lineHeight,
      tabular: true,
      use: "Larger figures inside cards",
      sampleText: "£8,420",
    },
    {
      name: "heading.md",
      family: "heading",
      fontSizeCss: authored.webTextStyles.heading.md.value.fontSize,
      sizeLabel: `${native.textStyles["heading.md"].fontSize}px`,
      weight: authored.webTextStyles.heading.md.value.fontWeight,
      lineHeight: authored.webTextStyles.heading.md.value.lineHeight,
      use: "Card title",
      sampleText: "Your details",
    },
    {
      name: "body.lg",
      family: "body",
      fontSizeCss: authored.webTextStyles.body.lg.value.fontSize,
      sizeLabel: `${native.textStyles["body.lg"].fontSize}px`,
      weight: authored.webTextStyles.body.lg.value.fontWeight,
      lineHeight: authored.webTextStyles.body.lg.value.lineHeight,
      use: "Marketing lead paragraph",
      sampleText: "Accounts, budget, pay, savings, pension and debts in one place.",
    },
    {
      name: "heading.sm",
      family: "heading",
      fontSizeCss: authored.webTextStyles.heading.sm.value.fontSize,
      sizeLabel: `${native.textStyles["heading.sm"].fontSize}px`,
      weight: authored.webTextStyles.heading.sm.value.fontWeight,
      lineHeight: authored.webTextStyles.heading.sm.value.lineHeight,
      use: "Group title inside a card",
      sampleText: "Credit card",
    },
    {
      name: "body.md",
      family: "body",
      fontSizeCss: authored.webTextStyles.body.md.value.fontSize,
      sizeLabel: `${native.textStyles["body.md"].fontSize}px`,
      weight: authored.webTextStyles.body.md.value.fontWeight,
      lineHeight: authored.webTextStyles.body.md.value.lineHeight,
      use: "Default text",
      sampleText: "You owe £8,420 across 3 debts.",
    },
    {
      name: "numeric.md",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.md.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.md"].fontSize}px`,
      weight: authored.webTextStyles.numeric.md.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.md.value.lineHeight,
      tabular: true,
      use: "Row and table figures",
      sampleText: "3.5% AER",
    },
    {
      name: "numeric.unset",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.unset.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.unset"].fontSize}px`,
      weight: authored.webTextStyles.numeric.unset.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.unset.value.lineHeight,
      tabular: true,
      use: '"Not set" state in text.muted',
      sampleText: "Not set",
    },
    {
      name: "body.sm",
      family: "body",
      fontSizeCss: authored.webTextStyles.body.sm.value.fontSize,
      sizeLabel: `${native.textStyles["body.sm"].fontSize}px`,
      weight: authored.webTextStyles.body.sm.value.fontWeight,
      lineHeight: authored.webTextStyles.body.sm.value.lineHeight,
      use: "Supporting text and notices",
      sampleText: "Assumes 5% growth a year and contributions of £200 a month.",
    },
    {
      name: "label.md",
      family: "body",
      fontSizeCss: authored.webTextStyles.label.md.value.fontSize,
      sizeLabel: `${native.textStyles["label.md"].fontSize}px`,
      weight: authored.webTextStyles.label.md.value.fontWeight,
      lineHeight: authored.webTextStyles.label.md.value.lineHeight,
      use: "Form labels and buttons",
      sampleText: "Yearly salary before tax",
    },
    {
      name: "numeric.sm",
      family: "body",
      fontSizeCss: authored.webTextStyles.numeric.sm.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.sm"].fontSize}px`,
      weight: authored.webTextStyles.numeric.sm.value.fontWeight,
      lineHeight: authored.webTextStyles.numeric.sm.value.lineHeight,
      tabular: true,
      use: "Axis ticks and tooltips",
      sampleText: "22.9% APR",
    },
    {
      name: "label.sm",
      family: "body",
      fontSizeCss: authored.webTextStyles.label.sm.value.fontSize,
      sizeLabel: `${native.textStyles["label.sm"].fontSize}px`,
      weight: authored.webTextStyles.label.sm.value.fontWeight,
      lineHeight: authored.webTextStyles.label.sm.value.lineHeight,
      use: "KPI labels, table headers (12px floor)",
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
      const col = item.name === "numeric.unset" ? colorVar("text.muted") : colorVar("text.primary");
      const tag = item.tabular ? ` ${renderExampleTag()}` : "";
      return `<div class="type-sample-row">
        <div class="type-meta">
          <code>${item.name}</code>
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
      Flump bundles two self-hosted variable typefaces through <code>@repo/ui/fonts.css</code>: <strong>Plus Jakarta Sans</strong> for headings and display, and <strong>Inter</strong> for body text, labels and tabular figures. No third typeface is used; system monospace is for code samples only. Headings widen word spacing by <code>0.12em</code> on web because Plus Jakarta Sans has a narrow space at weights 600 and 700.
    </p>

    ${renderTypeLadderDiagram(tokens)}

    <h3 class="sub-title">Live type scale</h3>
    <div class="card" style="padding:0">
      ${rowsHtml}
    </div>

    <article class="card-subtle">
      <h3 class="card-title">Typography rules</h3>
      <ul class="plain-list">
        <li><strong>T1 to T3:</strong> All sizes come from text styles; 12px is the minimum floor; weights are 400, 500, 600 and 700 only.</li>
        <li><strong>T4:</strong> Every money amount, percentage, date, duration, table cell and slider value uses <code>tabular-nums</code> and en-GB formatting.</li>
        <li><strong>T5 to T9:</strong> Sentence case everywhere (no uppercase eyebrows or caps tracking); one <code>h1</code> per page; body lines at most 75 characters wide; text survives 200% zoom without clipping.</li>
      </ul>
    </article>

    ${renderSourceCite("STYLE-GUIDE 3.1 to 3.3; packages/tokens/src/typography.ts; packages/ui/src/fonts/fonts.css")}
  </section>`;
}
